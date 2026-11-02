import { attachRateLimitHeaders, checkRateLimit, createRateLimitResponse } from '@/lib/ratelimit';
import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  // Rate limit static uploads to 100 req/min per IP to prevent scraping / DoS
  const rateLimit = checkRateLimit(request, {
    keyPrefix: 'uploads_get',
    limit: 100,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  const { filename } = await params;

  // Prevent path traversal with basename and canonical boundary check
  const safeFilename = path.basename(filename);
  const uploadsDir = path.resolve(process.cwd(), 'data', 'uploads');
  const filePath = path.resolve(uploadsDir, safeFilename);

  // Strict boundary containment check: ensure resolved path is inside uploadsDir
  if (!filePath.startsWith(uploadsDir)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  if (!fs.existsSync(filePath)) {
    return new NextResponse('File not found', { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(safeFilename).toLowerCase();

  let contentType = 'application/octet-stream';
  if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.webp') contentType = 'image/webp';
  else if (ext === '.gif') contentType = 'image/gif';

  const res = new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
      'X-Frame-Options': 'DENY',
    },
  });

  return attachRateLimitHeaders(res, rateLimit);
}
