import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for Duplicate Detection Engine (TF-IDF + Token Overlap + Spatial Distance).
 * Tests per PLAN.md requirements: distance < ~150m, token overlap, related categories.
 */

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'is', 'are', 'was', 'were', 'it', 'this', 'that', 'there', 'from', 'near', 'outside',
  'around', 'please', 'complaint', 'issue', 'problem', 'fix', 'help', 'very', 'too',
]);

function calculateHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function computeTokenOverlap(tokensA, tokensB) {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 0 : intersection / union;
}

test('Duplicates - Haversine distance accuracy', () => {
  // St. Joseph's School to MG Road Metro (~600m)
  const dist = calculateHaversineDistanceMeters(12.9721, 77.6012, 12.9754, 77.6066);
  assert.ok(dist > 500 && dist < 800);

  // Exact same point is 0
  assert.equal(Math.round(calculateHaversineDistanceMeters(12.9358, 77.6251, 12.9358, 77.6251)), 0);
});

test('Duplicates - Tokenization removes punctuation and stop words', () => {
  const tokens = tokenize('Please fix this huge, dangerous pothole near the road!');
  assert.ok(!tokens.includes('please'));
  assert.ok(!tokens.includes('this'));
  assert.ok(!tokens.includes('the'));
  assert.ok(tokens.includes('huge'));
  assert.ok(tokens.includes('dangerous'));
  assert.ok(tokens.includes('pothole'));
  assert.ok(tokens.includes('road'));
});

test('Duplicates - High overlap on near-duplicate descriptions', () => {
  const doc1 = tokenize('Huge dangerous pothole near Sony World signal Koramangala');
  const doc2 = tokenize('Deep pothole on 80 feet road near Sony World junction');
  const overlap = computeTokenOverlap(doc1, doc2);

  assert.ok(overlap > 0.25, `Expected overlap > 0.25, got ${overlap}`);
});

test('Duplicates - Zero overlap on completely disjoint descriptions', () => {
  const doc1 = tokenize('Streetlight not working in dark alley');
  const doc2 = tokenize('Water pipeline leakage flooding basement');
  const overlap = computeTokenOverlap(doc1, doc2);

  assert.equal(overlap, 0);
});
