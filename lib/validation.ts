import crypto from 'crypto';

export const CIVIC_CATEGORIES = [
  'Roads & Potholes',
  'Water & Sewage',
  'Garbage & Sanitation',
  'Electricity & Streetlights',
  'Public Safety',
  'Encroachment & Traffic',
  'Other',
] as const;

export type CivicCategory = (typeof CIVIC_CATEGORIES)[number];

/**
 * Enterprise-grade Server-Side Input Validation, File Integrity,
 * Safe Database Query Helpers, and Cryptographic Webhook Verification.
 */

export interface ValidationResult<T> {
  isValid: boolean;
  value?: T;
  error?: string;
}

/**
 * Sanitizes and validates citizen report description.
 * - Strips control characters and null bytes.
 * - Enforces minimum 5 characters, maximum 2000 characters.
 */
export function validateDescription(raw: unknown): ValidationResult<string> {
  if (typeof raw !== 'string') {
    return { isValid: false, error: 'Description must be a valid text string.' };
  }

  // Strip null bytes and control characters except standard newlines/tabs
  const sanitized = raw.replace(/\0/g, '').replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();

  if (sanitized.length < 5) {
    return { isValid: false, error: 'Description must be at least 5 characters long.' };
  }

  if (sanitized.length > 2000) {
    return { isValid: true, value: sanitized.slice(0, 2000) };
  }

  return { isValid: true, value: sanitized };
}

/**
 * Validates category against municipal category whitelist.
 * Returns valid category, or null if 'auto' or unrecognized (letting AI pipeline classify).
 */
export function validateCategory(raw: unknown): CivicCategory | null {
  if (typeof raw !== 'string' || !raw || raw === 'auto') {
    return null;
  }

  const trimmed = raw.trim();
  if (CIVIC_CATEGORIES.includes(trimmed as CivicCategory)) {
    return trimmed as CivicCategory;
  }

  return null;
}

/**
 * Validates geographic coordinate boundaries.
 * Latitude must be within [-90, 90], Longitude within [-180, 180].
 */
export function validateCoordinates(
  rawLat: unknown,
  rawLng: unknown
): ValidationResult<{ lat: number; lng: number }> {
  const lat = typeof rawLat === 'number' ? rawLat : parseFloat(String(rawLat));
  const lng = typeof rawLng === 'number' ? rawLng : parseFloat(String(rawLng));

  if (!Number.isFinite(lat) || isNaN(lat)) {
    return { isValid: false, error: 'Latitude must be a valid finite number.' };
  }

  if (!Number.isFinite(lng) || isNaN(lng)) {
    return { isValid: false, error: 'Longitude must be a valid finite number.' };
  }

  if (lat < -90 || lat > 90) {
    return { isValid: false, error: 'Latitude out of range. Must be between -90 and 90.' };
  }

  if (lng < -180 || lng > 180) {
    return { isValid: false, error: 'Longitude out of range. Must be between -180 and 180.' };
  }

  return {
    isValid: true,
    value: {
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
    },
  };
}

/**
 * Sanitizes street landmark/address. Capped at 255 characters.
 */
export function validateAddress(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/\0/g, '').replace(/[\x01-\x1F\x7F]/g, ' ').trim().slice(0, 255);
}

/**
 * Validates report ID as positive integer.
 */
export function validateReportId(raw: unknown): ValidationResult<number> {
  const parsed = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { isValid: false, error: 'Invalid report ID. Must be a positive integer.' };
  }
  return { isValid: true, value: parsed };
}

/**
 * Validates tracking code format (e.g. NS-KO0201).
 */
export function validateTrackingCode(raw: unknown): ValidationResult<string> {
  if (typeof raw !== 'string') {
    return { isValid: false, error: 'Tracking code must be a string.' };
  }
  const clean = raw.trim().toUpperCase();
  const formatRegex = /^NS-[A-Z0-9]{6}$/;
  if (!formatRegex.test(clean)) {
    return {
      isValid: false,
      error: 'Invalid tracking code format. Expected format: NS-XXXXXX (8 characters).',
    };
  }
  return { isValid: true, value: clean };
}

/**
 * Binary magic bytes inspection for uploaded files.
 * Verifies true image format regardless of file extension to eliminate polyglot exploits.
 */
export interface ImageValidationResult {
  isValid: boolean;
  detectedMime: string | null;
  safeExt: string | null;
  error?: string;
}

export function verifyImageMagicBytes(buffer: Buffer): ImageValidationResult {
  if (!buffer || buffer.length < 12) {
    return { isValid: false, detectedMime: null, safeExt: null, error: 'File is too small or empty.' };
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { isValid: true, detectedMime: 'image/jpeg', safeExt: '.jpg' };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { isValid: true, detectedMime: 'image/png', safeExt: '.png' };
  }

  // 3. WEBP: 'RIFF' .... 'WEBP'
  const isRiff = buffer.subarray(0, 4).toString('ascii') === 'RIFF';
  const isWebp = buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  if (isRiff && isWebp) {
    return { isValid: true, detectedMime: 'image/webp', safeExt: '.webp' };
  }

  // 4. GIF: 'GIF87a' or 'GIF89a'
  const gifHeader = buffer.subarray(0, 6).toString('ascii');
  if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') {
    return { isValid: true, detectedMime: 'image/gif', safeExt: '.gif' };
  }

  return {
    isValid: false,
    detectedMime: null,
    safeExt: null,
    error: 'Invalid file format: Header bytes do not match permitted image formats (JPEG, PNG, WebP, GIF).',
  };
}

/**
 * Constant-time HMAC-SHA256 signature verification for payment webhooks
 * and external municipal telemetry callbacks.
 * Protects against timing side-channel attacks.
 *
 * @param payload - Raw webhook payload (string or Buffer)
 * @param signature - Signature provided in request header
 * @param secret - Configured webhook secret
 * @returns boolean indicating signature validity
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): boolean {
  if (!payload || !signature || !secret) {
    return false;
  }

  try {
    const cleanSig = signature.startsWith('sha256=')
      ? signature.slice(7).trim()
      : signature.trim();

    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(typeof payload === 'string' ? payload : Buffer.from(payload))
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSig, 'hex');
    const providedBuffer = Buffer.from(cleanSig, 'hex');

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch {
    return false;
  }
}
