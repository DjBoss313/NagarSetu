import { getDb } from '@/lib/db';
import { isValidStatusTransition, Report, ReportStatus } from '@/lib/types';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const reportId = parseInt(id, 10);
  if (isNaN(reportId)) {
    return NextResponse.json({ error: 'Invalid report ID' }, { status: 400 });
  }

  const db = getDb();
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId) as Report | undefined;
  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  const history = db
    .prepare('SELECT * FROM status_history WHERE report_id = ? ORDER BY id ASC')
    .all(reportId);

  return NextResponse.json({ report, history });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const reportId = parseInt(id, 10);
  if (isNaN(reportId)) {
    return NextResponse.json({ error: 'Invalid report ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const db = getDb();

    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId) as Report | undefined;
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
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

      const note = body.note?.trim() || `Status updated from ${report.status} to ${newStatus}`;
      const actor = body.actor?.trim() || 'Officer';

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
      const newAssignee = body.assignee ? body.assignee.trim() : null;
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

    return NextResponse.json({ success: true, report: updated, history });
  } catch (err) {
    console.error('Error updating report:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating the report.' },
      { status: 500 }
    );
  }
}
