import { getDb } from '@/lib/db';
import { canDeleteReport, canReadReport, canUpdateReport, resolveUserRole, sanitizeReportForCitizen } from '@/lib/permissions';
import {
  attachRateLimitHeaders,
  checkRateLimit,
  createRateLimitResponse,
} from '@/lib/ratelimit';
import { isValidStatusTransition, Report, ReportStatus, StatusHistory } from '@/lib/types';
import { validateReportId } from '@/lib/validation';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  // Rate limit: 60 reads/min per IP to prevent scraping / integer ID enumeration
  const rateLimit = checkRateLimit(request, {
    keyPrefix: 'report_detail_get',
    limit: 60,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  const { id } = await params;
  const idValidation = validateReportId(id);
  if (!idValidation.isValid || !idValidation.value) {
    return NextResponse.json({ error: idValidation.error || 'Invalid report ID' }, { status: 400 });
  }
  const reportId = idValidation.value;

  const db = getDb();
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId) as Report | undefined;
  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  // Row-Level Security: Verify authorization to read this report record
  const role = resolveUserRole(
    request.headers.get('x-user-role'),
    request.cookies.get('nagarsetu_role')?.value,
    null
  );
  const trackingCodeProvided =
    request.nextUrl.searchParams.get('tracking_code') ||
    request.headers.get('x-tracking-code');

  if (!canReadReport(role, report, trackingCodeProvided)) {
    return NextResponse.json(
      {
        error:
          'Forbidden: You are not authorized to view this report record without an officer role or matching tracking code.',
      },
      { status: 403 }
    );
  }

  const history = db
    .prepare('SELECT * FROM status_history WHERE report_id = ? ORDER BY id ASC')
    .all(reportId) as StatusHistory[];

  // If accessed by citizen via tracking code, sanitize internal officer assignment details
  if (role !== 'officer') {
    const sanitized = sanitizeReportForCitizen(report, history);
    const res = NextResponse.json(sanitized);
    return attachRateLimitHeaders(res, rateLimit);
  }

  const res = NextResponse.json({ report, history });
  return attachRateLimitHeaders(res, rateLimit);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  // Rate limit: 30 status/assignee updates per min per IP
  const rateLimit = checkRateLimit(request, {
    keyPrefix: 'report_detail_patch',
    limit: 30,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  const { id } = await params;
  const idValidation = validateReportId(id);
  if (!idValidation.isValid || !idValidation.value) {
    return NextResponse.json({ error: idValidation.error || 'Invalid report ID' }, { status: 400 });
  }
  const reportId = idValidation.value;

  try {
    const body = await request.json();
    const db = getDb();

    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId) as Report | undefined;
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Row-Level Security: Only officers are permitted to update reports
    const role = resolveUserRole(
      request.headers.get('x-user-role'),
      request.cookies.get('nagarsetu_role')?.value,
      body.actor
    );

    if (!canUpdateReport(role)) {
      return NextResponse.json(
        {
          error:
            'Forbidden: Only authorized municipal officers can transition complaint status or assign field maintenance crews.',
        },
        { status: 403 }
      );
    }

    // 1. Status Transition Handling
    if (body.status && body.status !== report.status) {
      const newStatus = body.status as ReportStatus;

      // Enforce valid status transitions
      if (!isValidStatusTransition(report.status, newStatus)) {
        return NextResponse.json(
          {
            error: `Invalid transition: cannot change status from '${report.status}' to '${newStatus}'.`,
            currentStatus: report.status,
            attemptedStatus: newStatus,
          },
          { status: 400 }
        );
      }

      // Input sanitization on notes & actor
      const rawNote = typeof body.note === 'string' ? body.note.replace(/\0/g, '').trim().slice(0, 500) : '';
      const note = rawNote || `Status updated from ${report.status} to ${newStatus}`;
      const rawActor = typeof body.actor === 'string' ? body.actor.replace(/\0/g, '').trim().slice(0, 50) : '';
      const actor = rawActor || 'Officer';

      const updateStmt = db.prepare(`
        UPDATE reports
        SET status = ?, updated_at = datetime('now')
        WHERE id = ?
      `);

      const historyStmt = db.prepare(`
        INSERT INTO status_history (report_id, from_status, to_status, note, actor)
        VALUES (?, ?, ?, ?, ?)
      `);

      db.transaction(() => {
        updateStmt.run(newStatus, reportId);
        historyStmt.run(reportId, report.status, newStatus, note, actor);
      })();
    }

    // 2. Assignee Update Handling
    if (body.assignee !== undefined && body.assignee !== report.assignee) {
      const newAssignee = typeof body.assignee === 'string' && body.assignee.trim()
        ? body.assignee.replace(/\0/g, '').trim().slice(0, 100)
        : null;

      db.prepare(`
        UPDATE reports
        SET assignee = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(newAssignee, reportId);

      // Record in history if newly assigned or reassigned
      if (newAssignee) {
        db.prepare(`
          INSERT INTO status_history (report_id, from_status, to_status, note, actor)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          reportId,
          report.status,
          report.status,
          `Assigned to ${newAssignee}`,
          body.actor || 'Officer'
        );
      }
    }

    // 3. Duplicate Link Handling (Confirm Merge / Reject Link)
    if (body.duplicate_action) {
      if (body.duplicate_action !== 'confirm_merge' && body.duplicate_action !== 'reject_link') {
        return NextResponse.json(
          { error: "Invalid duplicate action. Allowed values: 'confirm_merge' or 'reject_link'." },
          { status: 400 }
        );
      }
      if (body.duplicate_action === 'confirm_merge') {
        // Confirm duplicate: move this report to Merged
        if (report.status === 'Submitted' || report.status === 'Under Review') {
          db.transaction(() => {
            db.prepare(`
              UPDATE reports
              SET status = 'Merged', updated_at = datetime('now')
              WHERE id = ?
            `).run(reportId);

            db.prepare(`
              INSERT INTO status_history (report_id, from_status, to_status, note, actor)
              VALUES (?, ?, ?, ?, ?)
            `).run(
              reportId,
              report.status,
              'Merged',
              body.note || `Officer confirmed duplicate; merged into parent issue #${report.duplicate_of}`,
              'Officer'
            );
          })();
        } else {
          return NextResponse.json(
            { error: `Reports in '${report.status}' status cannot be merged. Merging is allowed from early states only.` },
            { status: 400 }
          );
        }
      } else if (body.duplicate_action === 'reject_link') {
        // Reject duplicate link: set duplicate_of = NULL
        db.transaction(() => {
          db.prepare(`
            UPDATE reports
            SET duplicate_of = NULL, updated_at = datetime('now')
            WHERE id = ?
          `).run(reportId);

          db.prepare(`
            INSERT INTO status_history (report_id, from_status, to_status, note, actor)
            VALUES (?, ?, ?, ?, ?)
          `).run(
            reportId,
            report.status,
            report.status,
            body.note || 'Officer rejected duplicate link; marked as independent civic report',
            'Officer'
          );
        })();
      }
    }

    const updated = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId) as Report;
    const history = db.prepare('SELECT * FROM status_history WHERE report_id = ? ORDER BY id ASC').all(reportId);

    const res = NextResponse.json({ success: true, report: updated, history });
    return attachRateLimitHeaders(res, rateLimit);
  } catch (err) {
    console.error('Error updating report:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating the report.' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  // Row-Level Security: Civic complaints and municipal audit logs are immutable
  if (!canDeleteReport('officer')) {
    return NextResponse.json(
      {
        error:
          'Forbidden: Civic reports and municipal audit logs are permanent records and cannot be deleted. Completed issues must be moved to Resolved or Merged status.',
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
