import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkRateLimit,
  getClientIp,
  _resetRateLimitsForTesting,
} from '../../lib/ratelimit.ts';
import {
  validateHoneypot,
  generateAntiBotToken,
  verifyAntiBotToken,
} from '../../lib/bot-protection.ts';

// Helper to mock NextRequest headers
function createMockRequest(headers = {}, ip = undefined) {
  const headerMap = new Map(Object.entries(headers));
  return {
    headers: {
      get: (k) => headerMap.get(k.toLowerCase()) ?? null,
    },
    ip,
  };
}

test('Rate Limiter - Allows requests within limit and decrements remaining', () => {
  _resetRateLimitsForTesting();

  const req = createMockRequest({ 'x-real-ip': '198.51.100.1' });
  const options = { keyPrefix: 'test_action', limit: 3, windowMs: 10_000, burstLimit: 10 };

  const res1 = checkRateLimit(req, options);
  assert.equal(res1.allowed, true);
  assert.equal(res1.remaining, 2);
  assert.equal(res1.clientIp, '198.51.100.1');

  const res2 = checkRateLimit(req, options);
  assert.equal(res2.allowed, true);
  assert.equal(res2.remaining, 1);

  const res3 = checkRateLimit(req, options);
  assert.equal(res3.allowed, true);
  assert.equal(res3.remaining, 0);

  // 4th request exceeds limit
  const res4 = checkRateLimit(req, options);
  assert.equal(res4.allowed, false);
  assert.equal(res4.remaining, 0);
  assert.ok(res4.retryAfterSeconds > 0);
  assert.equal(res4.blockReason, 'rate_limit_exceeded');
});

test('Rate Limiter - Blocks burst floods within 2-second window', () => {
  _resetRateLimitsForTesting();

  const req = createMockRequest({ 'x-real-ip': '198.51.100.2' });
  // limit is 20, but burstLimit is 3
  const options = { keyPrefix: 'test_burst', limit: 20, windowMs: 60_000, burstLimit: 3 };

  assert.equal(checkRateLimit(req, options).allowed, true);
  assert.equal(checkRateLimit(req, options).allowed, true);
  assert.equal(checkRateLimit(req, options).allowed, true);

  // 4th rapid request triggers burst limit
  const burstRes = checkRateLimit(req, options);
  assert.equal(burstRes.allowed, false);
  assert.equal(burstRes.blockReason, 'burst_limit_exceeded');
  assert.equal(burstRes.retryAfterSeconds, 2);
});

test('Rate Limiter - Client IP extraction prioritizes trusted headers and sanitizes invalid values', () => {
  // 1. CF-Connecting-IP priority
  const cfReq = createMockRequest({
    'cf-connecting-ip': '203.0.113.195',
    'x-forwarded-for': '10.0.0.1, 10.0.0.2',
  });
  assert.equal(getClientIp(cfReq), '203.0.113.195');

  // 2. X-Real-IP priority over X-Forwarded-For
  const realIpReq = createMockRequest({
    'x-real-ip': '203.0.113.50',
    'x-forwarded-for': '192.168.1.1',
  });
  assert.equal(getClientIp(realIpReq), '203.0.113.50');

  // 3. X-Forwarded-For first valid IP
  const fwdReq = createMockRequest({
    'x-forwarded-for': '203.0.113.88, 10.0.0.1',
  });
  assert.equal(getClientIp(fwdReq), '203.0.113.88');

  // 4. Rejects invalid/malformed IP strings
  const badReq = createMockRequest({
    'x-real-ip': 'malicious-injected-string<script>',
    'x-forwarded-for': 'not-an-ip',
  });
  assert.equal(getClientIp(badReq), '127.0.0.1');
});

test('Bot Protection - Honeypot traps populated by automated bots are rejected', () => {
  // Clean payload
  const cleanJson = { description: 'Huge pothole', category: 'Roads & Potholes' };
  assert.equal(validateHoneypot(cleanJson).isBot, false);

  // Bot-populated honeypot
  const botJson = {
    description: 'Spam submission',
    website: 'https://spam-bot.example.com',
  };
  const result = validateHoneypot(botJson);
  assert.equal(result.isBot, true);
  assert.ok(result.reason.includes('website'));

  // Alternate honeypot field
  const botHp2 = {
    description: 'Automated crawler',
    _gotcha: 'auto_filled_value',
  };
  assert.equal(validateHoneypot(botHp2).isBot, true);
});

test('Bot Protection - Cryptographic HMAC token issuance and timing verification', () => {
  const token = generateAntiBotToken();
  assert.ok(token);
  assert.equal(token.split(':').length, 3);

  // Immediately validating with minElapsedMs = 5000 should flag unnatural speed
  const fastResult = verifyAntiBotToken(token, 5000, 60_000);
  assert.equal(fastResult.valid, false);
  assert.ok(fastResult.reason.includes('faster than human capability'));

  // Validating with minElapsedMs = 0 should pass
  const validResult = verifyAntiBotToken(token, 0, 60_000);
  assert.equal(validResult.valid, true);

  // Tampered signature must be rejected
  const parts = token.split(':');
  const tamperedToken = `${parts[0]}:${parts[1]}:bad_signature_here`;
  const tamperedResult = verifyAntiBotToken(tamperedToken, 0, 60_000);
  assert.equal(tamperedResult.valid, false);
  assert.ok(tamperedResult.reason.includes('Tampered or invalid'));
});
