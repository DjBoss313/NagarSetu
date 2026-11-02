import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

/**
 * Unit Tests for Input Validation, File Integrity, Safe Queries,
 * and Cryptographic Payment/Webhook Verification.
 */

// 1. Description Validation
import {
  validateDescription,
  validateCoordinates,
  validateCategory,
  validateReportId,
  validateTrackingCode,
  verifyImageMagicBytes,
  verifyWebhookSignature,
} from '../../lib/validation.ts';

test('Input Validation: Description - Enforces min length and strips null bytes', () => {
  const shortResult = validateDescription('abc');
  assert.equal(shortResult.isValid, false);
  assert.match(shortResult.error, /at least 5 characters/);

  const cleanResult = validateDescription('Deep pothole damaging vehicles on road\0<script>');
  assert.equal(cleanResult.isValid, true);
  assert.equal(cleanResult.value.includes('\0'), false);
});

test('Input Validation: Coordinates - Rejects invalid, NaN, or out-of-bounds latitude/longitude', () => {
  // Valid coordinates
  const valid = validateCoordinates(12.9716, 77.5946);
  assert.equal(valid.isValid, true);
  assert.equal(valid.value.lat, 12.9716);

  // Illegal latitude > 90
  const illegalLat = validateCoordinates(999.0, 77.5946);
  assert.equal(illegalLat.isValid, false);
  assert.match(illegalLat.error, /Latitude out of range/);

  // Illegal longitude < -180
  const illegalLng = validateCoordinates(12.9716, -185.0);
  assert.equal(illegalLng.isValid, false);
  assert.match(illegalLng.error, /Longitude out of range/);

  // NaN or non-finite
  const nanCoord = validateCoordinates('not-a-coord', 77.5946);
  assert.equal(nanCoord.isValid, false);
});

test('Input Validation: Category - Matches allowed municipal categories or returns null for AI triage', () => {
  assert.equal(validateCategory('Roads & Potholes'), 'Roads & Potholes');
  assert.equal(validateCategory('Water & Sewage'), 'Water & Sewage');
  assert.equal(validateCategory('auto'), null);
  assert.equal(validateCategory('MaliciousCategoryInjection'), null);
});

test('Input Validation: Report ID & Tracking Code format checks', () => {
  assert.equal(validateReportId(42).isValid, true);
  assert.equal(validateReportId('42').isValid, true);
  assert.equal(validateReportId(-5).isValid, false);
  assert.equal(validateReportId('not-an-id').isValid, false);

  assert.equal(validateTrackingCode('NS-KO0201').isValid, true);
  assert.equal(validateTrackingCode('ns-ko0201').isValid, true);
  assert.equal(validateTrackingCode('INVALID').isValid, false);
});

// 2. File Upload Magic Bytes Inspection
test('File Uploads: Magic Bytes - Detects valid image headers and rejects spoofed files', () => {
  // Valid JPEG header: FF D8 FF
  const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const jpegResult = verifyImageMagicBytes(jpegBuffer);
  assert.equal(jpegResult.isValid, true);
  assert.equal(jpegResult.detectedMime, 'image/jpeg');
  assert.equal(jpegResult.safeExt, '.jpg');

  // Valid PNG header: 89 50 4E 47 0D 0A 1A 0A
  const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  const pngResult = verifyImageMagicBytes(pngBuffer);
  assert.equal(pngResult.isValid, true);
  assert.equal(pngResult.detectedMime, 'image/png');
  assert.equal(pngResult.safeExt, '.png');

  // Spoofed file (HTML/PHP named as image): <?php or <html
  const spoofedBuffer = Buffer.from('<html><script>alert("xss")</script></html>');
  const spoofedResult = verifyImageMagicBytes(spoofedBuffer);
  assert.equal(spoofedResult.isValid, false);
  assert.match(spoofedResult.error, /do not match permitted image formats/);
});

// 3. Webhook / Payment Verification
test('Webhook & Payment Verification: Constant-time HMAC-SHA256 signature verification', () => {
  const secret = 'whsec_municipal_gateway_secret_2026';
  const payload = JSON.stringify({
    event: 'payment.completed',
    report_id: 101,
    amount_inr: 500,
    timestamp: 1762060000,
  });

  // Generate authentic HMAC signature
  const validSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  // 1. Authentic signature passes
  assert.equal(verifyWebhookSignature(payload, validSignature, secret), true);
  assert.equal(verifyWebhookSignature(payload, `sha256=${validSignature}`, secret), true);

  // 2. Tampered payload is rejected
  const tamperedPayload = JSON.stringify({
    event: 'payment.completed',
    report_id: 101,
    amount_inr: 5000000, // Tampered amount
    timestamp: 1762060000,
  });
  assert.equal(verifyWebhookSignature(tamperedPayload, validSignature, secret), false);

  // 3. Forged signature is rejected
  assert.equal(verifyWebhookSignature(payload, 'deadbeef1234567890abcdef', secret), false);

  // 4. Wrong secret is rejected
  assert.equal(verifyWebhookSignature(payload, validSignature, 'wrong_secret'), false);
});
