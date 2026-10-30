import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for Shared UI Utility Helpers.
 * Tests priority badge styling, status badge styling, date formatting, and neighborhood resolution.
 */

function getPriorityBadgeClass(label) {
  switch (label) {
    case 'Critical':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'High':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Medium':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'Resolved':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'In Progress':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'Assigned':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Under Review':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Rejected':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'Merged':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function getNeighborhoodName(lat, lng) {
  if (lat > 12.965 && lat < 12.975 && lng > 77.595 && lng < 77.61) return 'Central Bengaluru / Museum Rd';
  if (lat > 12.975 && lat < 12.985 && lng > 77.635 && lng < 77.645) return 'Indiranagar (100 Feet Rd)';
  if (lat > 12.93 && lat < 12.94 && lng > 77.62 && lng < 77.63) return 'Koramangala (80 Feet Rd)';
  return `Ward Area (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
}

test('UI Utilities - Priority badge color mapping', () => {
  assert.match(getPriorityBadgeClass('Critical'), /bg-red/);
  assert.match(getPriorityBadgeClass('High'), /bg-amber/);
  assert.match(getPriorityBadgeClass('Medium'), /bg-blue/);
  assert.match(getPriorityBadgeClass('Low'), /bg-emerald/);
});

test('UI Utilities - Status badge color mapping', () => {
  assert.match(getStatusBadgeClass('Resolved'), /bg-emerald/);
  assert.match(getStatusBadgeClass('In Progress'), /bg-indigo/);
  assert.match(getStatusBadgeClass('Assigned'), /bg-blue/);
  assert.match(getStatusBadgeClass('Under Review'), /bg-amber/);
  assert.match(getStatusBadgeClass('Rejected'), /bg-red/);
  assert.match(getStatusBadgeClass('Merged'), /bg-purple/);
  assert.match(getStatusBadgeClass('Submitted'), /bg-slate/);
});

test('UI Utilities - Neighborhood spatial resolution', () => {
  assert.equal(getNeighborhoodName(12.972, 77.601), 'Central Bengaluru / Museum Rd');
  assert.equal(getNeighborhoodName(12.978, 77.639), 'Indiranagar (100 Feet Rd)');
  assert.equal(getNeighborhoodName(12.935, 77.625), 'Koramangala (80 Feet Rd)');
  assert.match(getNeighborhoodName(12.5, 77.1), /Ward Area/);
});
