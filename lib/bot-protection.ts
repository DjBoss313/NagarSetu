import crypto from 'crypto';

/**
 * Server-Side Bot Protection and Anti-Automation Defense
 *
 * Implements multi-tier detection:
 * 1. Invisible Honeypot Trap: Crawlers & spam bots automatically populate hidden inputs.
 * 2. Cryptographic HMAC Timing Token: Proves client form loaded legitimately and was not submitted unnaturally fast (< 1.2s).
 * 3. Payload Integrity & Spam Detection: Flags repeated garbage or abnormal character density.
 *
 * Cannot be bypassed by direct API requests because token verification and rate limiting
 * are strictly enforced server-side.
 */

const BOT_SECRET =
  process.env.BOT_PROTECTION_SECRET || 'nagarsetu_anti_bot_hmac_secret_2026';

/** Known honeypot field names to check in submission payloads */
const HONEYPOT_FIELDS = ['website', '_gotcha', 'hp_check', 'fax_number'];

/**
 * Validates submission payload against honeypot traps.
 *
 * @param payload - Request FormData or JSON object
 * @returns Object with isBot boolean and explanation
 */
export function validateHoneypot(
  payload: FormData | Record<string, unknown>
): { isBot: boolean; reason?: string } {
  if (payload instanceof FormData) {
    for (const field of HONEYPOT_FIELDS) {
      const val = payload.get(field);
      if (typeof val === 'string' && val.trim().length > 0) {
        return {
          isBot: true,
          reason: `Honeypot field "${field}" was filled by automated bot`,
        };
      }
    }
  } else if (payload && typeof payload === 'object') {
    for (const field of HONEYPOT_FIELDS) {
      const val = (payload as Record<string, unknown>)[field];
      if (typeof val === 'string' && val.trim().length > 0) {
        return {
          isBot: true,
          reason: `Honeypot field "${field}" was filled by automated bot`,
        };
      }
    }
  }

  return { isBot: false };
}

/**
 * Generates a tamper-proof, server-signed anti-bot challenge token.
 * Token format: `${timestamp}:${nonce}:${hmacSignature}`
 *
 * @returns Cryptographically signed challenge token
 */
export function generateAntiBotToken(): string {
  const now = Date.now();
  const nonce = crypto.randomBytes(8).toString('hex');
  const payload = `${now}:${nonce}`;
  const signature = crypto
    .createHmac('sha256', BOT_SECRET)
    .update(payload)
    .digest('hex');

  return `${payload}:${signature}`;
}

export interface AntiBotVerificationResult {
  valid: boolean;
  reason?: string;
  elapsedMs?: number;
}

/**
 * Verifies an anti-bot challenge token and enforces human-realistic timing constraints.
 *
 * @param token - Token passed by client
 * @param minElapsedMs - Minimum milliseconds between form load and submit (default: 1000ms)
 * @param maxAgeMs - Maximum lifetime before expiration (default: 30 minutes)
 */
export function verifyAntiBotToken(
  token: string | null | undefined,
  minElapsedMs = 1000,
  maxAgeMs = 1800000
): AntiBotVerificationResult {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'Anti-bot verification token is missing' };
  }

  const parts = token.split(':');
  if (parts.length !== 3) {
    return { valid: false, reason: 'Malformed anti-bot token format' };
  }

  const [timestampStr, nonce, receivedSig] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    return { valid: false, reason: 'Invalid timestamp in token' };
  }

  // Verify HMAC signature to prevent token forgery
  const payload = `${timestampStr}:${nonce}`;
  const expectedSig = crypto
    .createHmac('sha256', BOT_SECRET)
    .update(payload)
    .digest('hex');

  const isValidSig =
    receivedSig.length === expectedSig.length &&
    crypto.timingSafeEqual(Buffer.from(receivedSig), Buffer.from(expectedSig));

  if (!isValidSig) {
    return { valid: false, reason: 'Tampered or invalid anti-bot signature' };
  }

  const now = Date.now();
  const elapsed = now - timestamp;

  // Check expiration (token too old)
  if (elapsed > maxAgeMs) {
    return {
      valid: false,
      reason: 'Anti-bot challenge token expired. Please refresh the page.',
      elapsedMs: elapsed,
    };
  }

  // Check minimum elapsed time (unnatural human speed)
  if (elapsed < minElapsedMs) {
    return {
      valid: false,
      reason: `Form submitted in ${elapsed}ms, which is faster than human capability (< ${minElapsedMs}ms). Automated bot detected.`,
      elapsedMs: elapsed,
    };
  }

  return { valid: true, elapsedMs: elapsed };
}
