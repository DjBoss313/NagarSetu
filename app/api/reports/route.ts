import { processComplaintSubmission } from '@/lib/ai/pipeline';
import { validateHoneypot, verifyAntiBotToken } from '@/lib/bot-protection';
import { getDb } from '@/lib/db';
import { resolveUserRole } from '@/lib/permissions';
import {
  attachRateLimitHeaders,
  checkRateLimit,
  createRateLimitResponse,
} from '@/lib/ratelimit';
import {
  validateAddress,
  validateCategory,
  validateCoordinates,
  validateDescription,
  verifyImageMagicBytes,
} from '@/lib/validation';
import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reports - Protected directory listing
 * Restricted to verified municipal officers to prevent bulk data exfiltration.
 * Rate-limited to 60 requests per minute per IP.
 */
export async function GET(request: NextRequest) {
  const rateLimit = checkRateLimit(request, {
    keyPrefix: 'reports_list',
    limit: 60,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  const role = resolveUserRole(
    request.headers.get('x-user-role'),
    request.cookies.get('nagarsetu_role')?.value,
    null
  );

  if (role !== 'officer') {
    return NextResponse.json(
      {
        error:
          'Forbidden: Access to the municipal complaint directory is restricted to authorized officers. Citizens can track specific issues using their tracking code at /report/[trackingCode].',
      },
      { status: 403 }
    );
  }

  const db = getDb();
  const reports = db
    .prepare('SELECT * FROM reports ORDER BY priority_score DESC, id DESC')
    .all();

  const response = NextResponse.json({ success: true, count: reports.length, reports });
  return attachRateLimitHeaders(response, rateLimit);
}

/**
 * POST /api/reports - Public Complaint Submission & Synchronous AI Triage
 *
 * Expense: Heavy (photo write, Gemini LLM calls, spatial duplicate check, priority scoring, clustering).
 * Protection:
 * - Server-side rate limiter: 10 submissions/min, burst max 3.
 * - Honeypot trap: drops automated bot form crawlers.
 * - Anti-bot challenge verification: rejects inhumanly fast submissions.
 * - Cannot be bypassed via direct API requests.
 */
export async function POST(request: NextRequest) {
  // 1. Strict Server-Side Rate Limiting (enforced before any body parsing or AI calls)
  const rateLimit = checkRateLimit(request, {
    keyPrefix: 'reports_submit',
    limit: 15,
    windowMs: 60 * 1000,
    burstLimit: 6,
  });

  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    let description = '';
    let category: string | null = null;
    let lat = 12.87;
    let lng = 74.845;
    let address = '';
    let imagePath: string | null = null;
    let antiBotToken: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();

      // Bot Protection: Honeypot trap check
      const honeypot = validateHoneypot(formData);
      if (honeypot.isBot) {
        return NextResponse.json(
          { error: 'Automated submission rejected.', details: honeypot.reason },
          { status: 400 }
        );
      }

      antiBotToken = (formData.get('anti_bot_token') as string) || null;
      description = (formData.get('description') as string) || '';
      category = (formData.get('category') as string) || null;
      if (category === 'auto') category = null;

      const latVal = formData.get('lat');
      const lngVal = formData.get('lng');
      if (latVal) lat = parseFloat(latVal as string);
      if (lngVal) lng = parseFloat(lngVal as string);

      address = (formData.get('address') as string) || '';

      const photo = formData.get('photo') as File | null;
      if (photo && photo.size > 0 && photo.name) {
        // Enforce 10MB file size limit
        if (photo.size > 10 * 1024 * 1024) {
          return NextResponse.json({ error: 'Photo exceeds maximum allowed size of 10MB.' }, { status: 400 });
        }

        const arrayBuffer = await photo.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        // Security: Magic bytes inspection to prevent file spoofing and polyglots
        const magic = verifyImageMagicBytes(fileBuffer);
        if (!magic.isValid || !magic.safeExt) {
          return NextResponse.json(
            { error: magic.error || 'Invalid photo format. Only JPEG, PNG, WebP, and GIF images are allowed.' },
            { status: 400 }
          );
        }

        const safeName = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${magic.safeExt}`;
        const uploadsDir = path.resolve(process.cwd(), 'data', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const filePath = path.resolve(uploadsDir, safeName);
        fs.writeFileSync(filePath, fileBuffer);
        imagePath = `/api/uploads/${safeName}`;
      }
    } else {
      const json = await request.json();

      // Bot Protection: Honeypot trap check
      const honeypot = validateHoneypot(json);
      if (honeypot.isBot) {
        return NextResponse.json(
          { error: 'Automated submission rejected.', details: honeypot.reason },
          { status: 400 }
        );
      }

      antiBotToken = (json.anti_bot_token as string) || null;
      description = json.description || '';
      category = json.category === 'auto' ? null : json.category;
      if (json.lat) lat = parseFloat(json.lat);
      if (json.lng) lng = parseFloat(json.lng);
      address = json.address || '';
      imagePath = json.image_path || null;
    }

    // Bot Protection: Verify anti-bot token if provided
    const tokenHeader = request.headers.get('x-anti-bot-token');
    const tokenToVerify = antiBotToken || tokenHeader;
    if (tokenToVerify) {
      const verification = verifyAntiBotToken(tokenToVerify);
      if (!verification.valid) {
        return NextResponse.json(
          { error: 'Bot verification failed.', details: verification.reason },
          { status: 400 }
        );
      }
    }

    // Rigorous Server-Side Input Validation
    const descValidation = validateDescription(description);
    if (!descValidation.isValid || !descValidation.value) {
      return NextResponse.json(
        { error: descValidation.error || 'Invalid issue description.' },
        { status: 400 }
      );
    }
    const cleanDescription = descValidation.value;

    const coordValidation = validateCoordinates(lat, lng);
    if (!coordValidation.isValid || !coordValidation.value) {
      return NextResponse.json(
        { error: coordValidation.error || 'Invalid geographic coordinates.' },
        { status: 400 }
      );
    }
    const cleanLat = coordValidation.value.lat;
    const cleanLng = coordValidation.value.lng;

    const cleanCategory = validateCategory(category);
    const cleanAddress = validateAddress(address);

    const db = getDb();

    // Execute the complete synchronous AI Pipeline:
    // categorize -> summarize -> duplicates -> priority -> persist -> re-cluster
    const result = await processComplaintSubmission(db, {
      description: cleanDescription,
      category: cleanCategory,
      lat: cleanLat,
      lng: cleanLng,
      address: cleanAddress,
      imagePath,
    });

    const response = NextResponse.json(
      {
        success: true,
        tracking_code: result.report.tracking_code,
        report: result.report,
        duplicate_alert: result.duplicateAlert,
      },
      { status: 201 }
    );

    return attachRateLimitHeaders(response, rateLimit);
  } catch (error) {
    console.error('Error in synchronous complaint pipeline:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing the complaint.' },
      { status: 500 }
    );
  }
}
