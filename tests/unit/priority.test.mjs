import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for Explainable Priority Scoring Engine.
 * Tests deterministic scoring formula, factor breakdown, and clamping.
 */

// Haversine distance helper
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const CATEGORY_BASE_RISK = {
  'Public Safety': 25,
  'Electricity & Streetlights': 20,
  'Roads & Potholes': 15,
  'Water & Sewage': 15,
  'Garbage & Sanitation': 10,
  'Encroachment & Traffic': 10,
  Other: 5,
};

const SEVERITY_HAZARDS = [
  { keywords: ['exposed wire', 'live wire', 'sparking', 'electric shock'], points: 30, reason: 'Exposed electrical hazard or live wire with electrocution risk' },
  { keywords: ['manhole', 'open drain', 'open ditch', 'deep trench'], points: 25, reason: 'Uncovered manhole or drain posing severe fall and drowning hazard' },
  { keywords: ['huge pothole', 'massive pothole', 'crater', 'skidding'], points: 20, reason: 'Deep road hazard causing imminent two-wheeler accidents' },
  { keywords: ['hospital', 'ambulance', 'stretcher', 'emergency'], points: 25, reason: 'Critical blockage or disruption adjacent to emergency healthcare access' },
  { keywords: ['school', 'children', 'students', 'kindergarten'], points: 20, reason: 'High-risk civic hazard in immediate vicinity of school children' },
  { keywords: ['fire', 'smoke', 'burning garbage', 'toxic gas'], points: 25, reason: 'Active fire hazard or toxic environmental smoke' },
  { keywords: ['flooding', 'submerged', 'waterlogging', 'chest deep'], points: 20, reason: 'Severe urban flooding threatening life or property' },
];

function evaluatePriority({ description, category, lat, lng, daysAgo = 0, nearbyDuplicateCount = 0, sensitivePlaces = [] }) {
  let score = 0;
  const factors = [];
  const text = (description || '').toLowerCase();

  const basePoints = CATEGORY_BASE_RISK[category] || 10;
  score += basePoints;
  factors.push({ factor: 'Category Base Risk', points: basePoints, reason: `Baseline municipal severity for ${category}` });

  for (const hazard of SEVERITY_HAZARDS) {
    if (hazard.keywords.some((k) => text.includes(k))) {
      score += hazard.points;
      factors.push({ factor: 'Hazard Detection', points: hazard.points, reason: hazard.reason });
      break;
    }
  }

  for (const place of sensitivePlaces) {
    const dist = haversineDistanceMeters(lat, lng, place.lat, place.lng);
    if (dist <= 200) {
      score += 20;
      factors.push({ factor: 'Sensitive Location Proximity', points: 20, reason: `Within ${Math.round(dist)}m of ${place.name} (${place.type} [mocked])` });
      break;
    }
  }

  if (nearbyDuplicateCount >= 3) {
    score += 20;
    factors.push({ factor: 'Nearby Duplicate Density', points: 20, reason: `${nearbyDuplicateCount} citizen complaints reported for this exact issue` });
  } else if (nearbyDuplicateCount >= 1) {
    score += 10;
    factors.push({ factor: 'Nearby Duplicate Density', points: 10, reason: `${nearbyDuplicateCount} additional citizen complaint(s) corroborating this issue` });
  }

  if (daysAgo >= 7) {
    score += 20;
    factors.push({ factor: 'Aging Unresolved Report', points: 20, reason: `Complaint has remained unaddressed for ${daysAgo} days` });
  } else if (daysAgo >= 3) {
    score += 10;
    factors.push({ factor: 'Aging Unresolved Report', points: 10, reason: `Complaint has remained unaddressed for ${daysAgo} days` });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let label = 'Low';
  if (score >= 75) label = 'Critical';
  else if (score >= 50) label = 'High';
  else if (score >= 25) label = 'Medium';

  return { score, label, factors };
}

test('Priority Engine - Critical report with exposed wire near school', () => {
  const mockPlaces = [{ name: "St. Joseph's Boys' High School", type: 'School', lat: 12.9721, lng: 77.6014 }];
  const result = evaluatePriority({
    description: 'Exposed live wire sparking on road near bus stop',
    category: 'Electricity & Streetlights',
    lat: 12.9721,
    lng: 77.6015, // ~11 meters away
    daysAgo: 5,
    sensitivePlaces: mockPlaces,
  });

  assert.equal(result.label, 'Critical');
  assert.ok(result.score >= 75);
  assert.ok(result.factors.some((f) => f.factor === 'Hazard Detection'));
  assert.ok(result.factors.some((f) => f.factor === 'Sensitive Location Proximity'));
});

test('Priority Engine - Low report with standard unique pothole', () => {
  const result = evaluatePriority({
    description: 'Small surface pothole near residential gate.',
    category: 'Roads & Potholes',
    lat: 12.93,
    lng: 77.62,
    daysAgo: 0,
    sensitivePlaces: [],
  });

  assert.equal(result.label, 'Low');
  assert.equal(result.score, 15);
  assert.equal(result.factors.length, 1);
});

test('Priority Engine - Score clamping to 100 maximum', () => {
  const mockPlaces = [{ name: 'City Hospital', type: 'Hospital', lat: 12.9, lng: 77.6 }];
  const result = evaluatePriority({
    description: 'exposed wire sparking fire next to open manhole in hospital ambulance bay',
    category: 'Public Safety', // 25
    lat: 12.9,
    lng: 77.6, // sensitive place: +20
    daysAgo: 10, // +20
    nearbyDuplicateCount: 5, // +20
    sensitivePlaces: mockPlaces,
  });

  assert.ok(result.score <= 100);
  assert.equal(result.label, 'Critical');
});
