import { generateAntiBotToken } from '@/lib/bot-protection';
import { attachRateLimitHeaders, checkRateLimit, createRateLimitResponse } from '@/lib/ratelimit';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/challenge
 * Issues a cryptographically signed anti-bot challenge token for form submissions.
 * Includes rate limiting to prevent challenge harvesting.
 */
export async function GET(request: NextRequest) {
  const rateLimit = checkRateLimit(request, {
    keyPrefix: 'challenge_get',
    limit: 60,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  const token = generateAntiBotToken();
  const res = NextResponse.json({
    success: true,
    token,
    issuedAt: Date.now(),
  });

  return attachRateLimitHeaders(res, rateLimit);
}
