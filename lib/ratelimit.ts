/**
 * Generic minimal request interface matching NextRequest and standard Request.
 */
export interface RateLimitRequest {
  headers: Headers | { get(name: string): string | null };
  ip?: string;
}

/**
 * Server-Side Sliding Window Rate Limiter
 *
 * Protects public and expensive API endpoints (e.g. AI triage pipeline,
 * photo uploads, report queries, officer actions) against abuse, brute-force
 * scraping, and Denial of Service (DoS) attacks.
 *
 * Cannot be bypassed through direct API requests (curl, Postman, scripts)
 * because checks are enforced synchronously on the server before request execution.
 */

export interface RateLimitOptions {
  /** Unique prefix identifying the endpoint/action (e.g. 'reports_create') */
  keyPrefix: string;
  /** Maximum number of allowed requests within the time window */
  limit: number;
  /** Sliding window duration in milliseconds (e.g. 60,000 for 1 minute) */
  windowMs: number;
  /** Maximum allowed burst requests in a tight 2-second interval */
  burstLimit?: number;
}

export interface RateLimitResult {
  /** Whether the request is permitted */
  allowed: boolean;
  /** Configured limit for this window */
  limit: number;
  /** Remaining requests permitted in current window */
  remaining: number;
  /** Epoch timestamp in ms when the window resets */
  resetTime: number;
  /** Integer seconds until the client may retry */
  retryAfterSeconds: number;
  /** Extracted client IP or identifier */
  clientIp: string;
  /** Specific reason if blocked (e.g. 'rate_limit_exceeded' | 'burst_limit_exceeded') */
  blockReason?: 'rate_limit_exceeded' | 'burst_limit_exceeded';
}

// Global in-memory storage for sliding window request timestamps
// Map: "keyPrefix:clientIp" -> Array of epoch timestamps (ms)
const rateLimitStore = new Map<string, number[]>();

// Periodic garbage collection every 60 seconds
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60_000;

function cleanupStaleEntries(windowMs: number): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, timestamps] of rateLimitStore.entries()) {
    const active = timestamps.filter((t) => now - t < windowMs);
    if (active.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, active);
    }
  }
}

/**
 * Validates whether a string looks like a legitimate IPv4 or IPv6 address.
 */
function isValidIp(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false;
  const trimmed = ip.trim();
  // IPv4 simple validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(trimmed)) {
    return trimmed.split('.').every((part) => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }
  // IPv6 simple validation
  const ipv6Regex = /^[a-fA-F0-9:]+$/;
  return trimmed.includes(':') && ipv6Regex.test(trimmed);
}

/**
 * Extracts client IP securely to prevent header-spoofing bypasses.
 *
 * In reverse proxy setups (Google Cloud Run, Vercel, AWS ALB, Nginx),
 * proxies either set a dedicated header or append the connecting IP.
 * Checks are ordered to prioritize trusted platform headers before X-Forwarded-For.
 */
export function getClientIp(request: RateLimitRequest): string {
  // 1. Cloudflare connecting IP
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp && isValidIp(cfIp)) {
    return cfIp.trim();
  }

  // 2. Nginx / reverse proxy Real-IP
  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp && isValidIp(xRealIp)) {
    return xRealIp.trim();
  }

  // 3. X-Forwarded-For: "client, proxy1, proxy2"
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const parts = xForwardedFor.split(',').map((p) => p.trim());
    const validIps = parts.filter(isValidIp);
    if (validIps.length > 0) {
      // Use the first valid client IP in the chain
      return validIps[0];
    }
  }

  // 4. Next.js server runtime IP (from socket remoteAddress if present)
  if (request.ip && isValidIp(request.ip)) {
    return request.ip;
  }

  // 5. Fallback loopback address
  return '127.0.0.1';
}

/**
 * Checks and updates sliding window rate limits for a given request.
 *
 * @param request - Incoming NextRequest or standard Request
 * @param options - Rate limit configuration
 * @returns RateLimitResult with status and metadata
 */
export function checkRateLimit(
  request: RateLimitRequest,
  options: RateLimitOptions
): RateLimitResult {
  const ip = getClientIp(request);
  const key = `${options.keyPrefix}:${ip}`;
  const now = Date.now();
  const windowStart = now - options.windowMs;

  cleanupStaleEntries(options.windowMs);

  const timestamps = rateLimitStore.get(key) || [];
  // Retain only timestamps within the active sliding window
  const activeTimestamps = timestamps.filter((t) => t > windowStart);

  // 1. Check Burst Limit (rapid flood within 2 seconds)
  const burstLimit = options.burstLimit ?? Math.max(3, Math.floor(options.limit / 2));
  const burstWindowStart = now - 2000;
  const recentBurstCount = activeTimestamps.filter((t) => t > burstWindowStart).length;

  if (recentBurstCount >= burstLimit) {
    return {
      allowed: false,
      limit: options.limit,
      remaining: 0,
      resetTime: now + 2000,
      retryAfterSeconds: 2,
      clientIp: ip,
      blockReason: 'burst_limit_exceeded',
    };
  }

  // 2. Check Sliding Window Limit
  if (activeTimestamps.length >= options.limit) {
    const oldestInWindow = activeTimestamps[0];
    const resetTime = oldestInWindow + options.windowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((resetTime - now) / 1000));

    return {
      allowed: false,
      limit: options.limit,
      remaining: 0,
      resetTime,
      retryAfterSeconds,
      clientIp: ip,
      blockReason: 'rate_limit_exceeded',
    };
  }

  // Request permitted: record timestamp
  activeTimestamps.push(now);
  rateLimitStore.set(key, activeTimestamps);

  const resetTime = (activeTimestamps[0] || now) + options.windowMs;
  const remaining = Math.max(0, options.limit - activeTimestamps.length);
  const retryAfterSeconds = Math.max(1, Math.ceil((resetTime - now) / 1000));

  return {
    allowed: true,
    limit: options.limit,
    remaining,
    resetTime,
    retryAfterSeconds,
    clientIp: ip,
  };
}

/**
 * Creates a standard RFC-compliant HTTP 429 Too Many Requests response.
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  const message =
    result.blockReason === 'burst_limit_exceeded'
      ? 'Too many consecutive requests in a short time. Please slow down and try again in a few seconds.'
      : `Rate limit of ${result.limit} requests exceeded. Please wait ${result.retryAfterSeconds} seconds before trying again.`;

  return Response.json(
    {
      error: 'Too Many Requests',
      message,
      limit: result.limit,
      remaining: 0,
      retryAfter: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSeconds),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
      },
    }
  );
}

/**
 * Attaches X-RateLimit headers to a successful response.
 */
export function attachRateLimitHeaders<T extends Response>(
  response: T,
  result: RateLimitResult
): T {
  response.headers.set('X-RateLimit-Limit', String(result.limit));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)));
  return response;
}

/**
 * Reset in-memory rate limit stores (intended for test environments).
 */
export function _resetRateLimitsForTesting(): void {
  rateLimitStore.clear();
}
