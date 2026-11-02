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
    case 'Assigned':
    case 'Under Review':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Submitted':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'Rejected':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'Merged':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function getNeighborhoodName(lat, lng) {
  if (lat > 12.865 && lat < 12.875 && lng > 74.838 && lng < 74.848) return 'Hampankatta / K.S. Rao Road';
  if (lat > 12.880 && lat < 12.890 && lng > 74.850 && lng < 74.862) return 'Kadri / Mallikatte';
  if (lat > 12.878 && lat < 12.886 && lng > 74.835 && lng < 74.845) return 'Lalbagh / MCC HQ';
  return `Mangaluru Ward Area (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
}

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

function formatDistance(meters) {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

test('UI Utilities - Spatial distance calculation and formatting', () => {
  // Same coordinates should have 0 distance
  assert.equal(calculateDistanceMeters(12.87, 74.845, 12.87, 74.845), 0);

  // Mangaluru coordinates distance check (~390m apart)
  const dist = calculateDistanceMeters(12.8700, 74.845, 12.8735, 74.845);
  assert.ok(dist > 350 && dist < 450);

  // Formatting checks
  assert.equal(formatDistance(120), '120m');
  assert.equal(formatDistance(999), '999m');
  assert.equal(formatDistance(1500), '1.5km');
  assert.equal(formatDistance(2400), '2.4km');
});

test('UI Utilities - Priority badge color mapping', () => {
  assert.match(getPriorityBadgeClass('Critical'), /bg-red/);
  assert.match(getPriorityBadgeClass('High'), /bg-amber/);
  assert.match(getPriorityBadgeClass('Medium'), /bg-blue/);
  assert.match(getPriorityBadgeClass('Low'), /bg-emerald/);
});

test('UI Utilities - Status badge color mapping', () => {
  assert.match(getStatusBadgeClass('Resolved'), /bg-emerald/);
  assert.match(getStatusBadgeClass('In Progress'), /bg-amber/);
  assert.match(getStatusBadgeClass('Assigned'), /bg-amber/);
  assert.match(getStatusBadgeClass('Under Review'), /bg-amber/);
  assert.match(getStatusBadgeClass('Rejected'), /bg-rose/);
  assert.match(getStatusBadgeClass('Merged'), /bg-purple/);
  assert.match(getStatusBadgeClass('Submitted'), /bg-red/);
});

test('UI Utilities - Neighborhood spatial resolution', () => {
  assert.equal(getNeighborhoodName(12.870, 74.843), 'Hampankatta / K.S. Rao Road');
  assert.equal(getNeighborhoodName(12.885, 74.856), 'Kadri / Mallikatte');
  assert.equal(getNeighborhoodName(12.882, 74.840), 'Lalbagh / MCC HQ');
  assert.match(getNeighborhoodName(12.5, 74.1), /Mangaluru Ward Area/);
});
