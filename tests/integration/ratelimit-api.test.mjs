import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Integration Test: Server-Side Rate Limiting and Bot Protection on Live Endpoints.
 * Verifies that direct API requests cannot bypass rate limits and bot honeypots.
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function isServerReachable() {
  try {
    const res = await fetch(`${BASE_URL}/api/challenge`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

test('API Rate Limiting & Bot Protection - Live Enforcement', async (t) => {
  const reachable = await isServerReachable();
  if (!reachable) {
    t.skip('Next.js dev/test server is not running on localhost:3000');
    return;
  }

  // 1. Challenge Token endpoint issues valid tokens with rate limit headers
  const challengeRes = await fetch(`${BASE_URL}/api/challenge`);
  assert.equal(challengeRes.status, 200);
  assert.ok(challengeRes.headers.get('x-ratelimit-limit'));
  assert.ok(challengeRes.headers.get('x-ratelimit-remaining'));
  const challengeData = await challengeRes.json();
  assert.equal(challengeData.success, true);
  assert.ok(challengeData.token);

  // 2. Direct API submission with honeypot field is rejected as bot
  const botRes = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-real-ip': '192.0.2.10', // Dedicated test IP to isolate rate-limit counter
    },
    body: JSON.stringify({
      description: 'Automated crawler trying direct API injection',
      category: 'Roads & Potholes',
      lat: 12.9358,
      lng: 77.6251,
      website: 'https://spam-bot.example.com', // Honeypot trigger
    }),
  });

  assert.equal(botRes.status, 400, 'Direct API requests with honeypot must be rejected');
  const botData = await botRes.json();
  assert.ok(botData.error.includes('Automated submission rejected'));

  // 3. Direct API submission with invalid/tampered anti-bot token is rejected
  const tamperedRes = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-real-ip': '192.0.2.11', // Dedicated test IP
    },
    body: JSON.stringify({
      description: 'Direct API request with forged token',
      category: 'Roads & Potholes',
      lat: 12.9358,
      lng: 77.6251,
      anti_bot_token: '12345:nonce:invalid_signature_hex',
    }),
  });

  assert.equal(tamperedRes.status, 400, 'Forged anti-bot token must be rejected');

  // 4. Direct API flood triggers 429 Too Many Requests
  const floodIp = '192.0.2.99';
  let got429 = false;
  for (let i = 0; i < 8; i++) {
    const floodRes = await fetch(`${BASE_URL}/api/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-real-ip': floodIp,
      },
      body: JSON.stringify({
        description: `Direct API rapid flood request ${i}`,
        category: 'Roads & Potholes',
        lat: 12.9358,
        lng: 77.6251,
      }),
    });
    if (floodRes.status === 429) {
      got429 = true;
      assert.ok(floodRes.headers.get('retry-after'));
      assert.equal(floodRes.headers.get('x-ratelimit-remaining'), '0');
      break;
    }
  }
  assert.equal(got429, true, 'Direct API flood must trigger HTTP 429 with Retry-After');
});
