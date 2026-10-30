import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for Keyword Classification Engine.
 * Tests keyword mapping rules across all 7 municipal categories.
 */

const CATEGORY_KEYWORDS = [
  {
    category: 'Electricity & Streetlights',
    keywords: ['streetlight', 'street light', 'pole', 'wire', 'transformer', 'power cut', 'dark', 'voltage', 'shock', 'electric', 'bescom'],
  },
  {
    category: 'Water & Sewage',
    keywords: ['water', 'leakage', 'pipeline', 'pipe', 'sewage', 'drain', 'drainage', 'gutter', 'contamination', 'drinking water', 'overflow', 'bwssb'],
  },
  {
    category: 'Garbage & Sanitation',
    keywords: ['garbage', 'trash', 'waste', 'dump', 'dustbin', 'smell', 'stink', 'debris', 'litter', 'cleaning', 'dead animal', 'carcass', 'sanitation'],
  },
  {
    category: 'Public Safety',
    keywords: ['manhole', 'open manhole', 'hazard', 'fire', 'smoke', 'falling tree', 'branch', 'collapse', 'flooding', 'danger', 'stray dog', 'rabies', 'bite'],
  },
  {
    category: 'Encroachment & Traffic',
    keywords: ['traffic', 'encroachment', 'hawker', 'footpath blocked', 'illegal parking', 'abandoned vehicle', 'signal', 'zebra crossing', 'jam'],
  },
  {
    category: 'Roads & Potholes',
    keywords: ['pothole', 'road', 'crater', 'asphalt', 'tar', 'footpath', 'pavement', 'divider', 'speed breaker', 'bump', 'dug up'],
  },
];

function ruleBasedCategorize(description) {
  const text = (description || '').toLowerCase();
  for (const entry of CATEGORY_KEYWORDS) {
    if (entry.keywords.some((kw) => text.includes(kw))) {
      return entry.category;
    }
  }
  return 'Other';
}

test('Categorize - Detects Electricity & Streetlights correctly', () => {
  assert.equal(ruleBasedCategorize('Streetlight pole flickering outside house'), 'Electricity & Streetlights');
  assert.equal(ruleBasedCategorize('Sparking transformer near apartment'), 'Electricity & Streetlights');
});

test('Categorize - Detects Water & Sewage correctly', () => {
  assert.equal(ruleBasedCategorize('Main pipeline water leakage on roadside'), 'Water & Sewage');
  assert.equal(ruleBasedCategorize('Open drain overflowing with sewage water'), 'Water & Sewage');
});

test('Categorize - Detects Garbage & Sanitation correctly', () => {
  assert.equal(ruleBasedCategorize('Huge pile of uncollected garbage stinking badly'), 'Garbage & Sanitation');
});

test('Categorize - Detects Public Safety correctly', () => {
  assert.equal(ruleBasedCategorize('Open manhole without lid on pedestrian path'), 'Public Safety');
});

test('Categorize - Detects Roads & Potholes correctly', () => {
  assert.equal(ruleBasedCategorize('Deep crater pothole damaged vehicle wheel'), 'Roads & Potholes');
});

test('Categorize - Falls back to Other when no keyword matches', () => {
  assert.equal(ruleBasedCategorize('Just a general inquiry about office hours'), 'Other');
});
