import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for Tracking Code Generation and Validation.
 * Format: NS- + 6 alphanumeric characters.
 */

function generateTrackingCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let random = '';
  for (let i = 0; i < 6; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `NS-${random}`;
}

test('Tracking Code - Follows NS-XXXXXX format and length', () => {
  for (let i = 0; i < 20; i++) {
    const code = generateTrackingCode();
    assert.equal(code.startsWith('NS-'), true);
    assert.equal(code.length, 9);
    assert.match(code, /^NS-[A-HJ-NP-Z2-9]{6}$/);
  }
});

test('Tracking Code - Excludes ambiguous characters (0, O, 1, I)', () => {
  for (let i = 0; i < 50; i++) {
    const code = generateTrackingCode();
    assert.ok(!code.includes('0'), 'Contains 0');
    assert.ok(!code.includes('O'), 'Contains O');
    assert.ok(!code.includes('1'), 'Contains 1');
    assert.ok(!code.includes('I'), 'Contains I');
  }
});
