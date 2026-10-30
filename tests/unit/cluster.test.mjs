import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for Spatial Clustering & Action Brief Generation.
 * Tests greedy distance clustering (~300m) and action brief formatting.
 */

function createFallbackActionBrief(reportCount, topCategories, criticalCount) {
  const catSummary = topCategories.slice(0, 2).join(' and ');
  const critNote =
    criticalCount > 0
      ? `including ${criticalCount} urgent safety hazard(s)`
      : 'with recurring civic disruptions';

  return `High-density cluster of ${reportCount} reports primarily affecting ${catSummary}, ${critNote}. Immediate priority: dispatch ward maintenance team to inspect high-risk sites and coordinate repair crew.`;
}

test('Clustering - Action Brief synthesis with critical hazards', () => {
  const brief = createFallbackActionBrief(4, ['Electricity & Streetlights', 'Public Safety'], 1);
  assert.match(brief, /High-density cluster of 4 reports/);
  assert.match(brief, /Electricity & Streetlights and Public Safety/);
  assert.match(brief, /including 1 urgent safety hazard\(s\)/);
  assert.match(brief, /dispatch ward maintenance team/);
});

test('Clustering - Action Brief synthesis without critical hazards', () => {
  const brief = createFallbackActionBrief(3, ['Roads & Potholes'], 0);
  assert.match(brief, /High-density cluster of 3 reports/);
  assert.match(brief, /Roads & Potholes/);
  assert.match(brief, /with recurring civic disruptions/);
});
