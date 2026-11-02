import test from 'node:test';
import assert from 'node:assert/strict';

import {
  findPlaceByQuery,
  isReportInPlace,
  synthesizeBoundaryFromReports,
} from '../../lib/geo-places.ts';

test('Geo Places - Curated place lookup by exact name and aliases', () => {
  const mangaluru = findPlaceByQuery('Mangaluru');
  assert.ok(mangaluru);
  assert.equal(mangaluru.name, 'Mangaluru');

  // Alias lookup
  const mangalore = findPlaceByQuery('mangalore');
  assert.ok(mangalore);
  assert.equal(mangalore.name, 'Mangaluru');

  const kudla = findPlaceByQuery('kudla');
  assert.ok(kudla);
  assert.equal(kudla.name, 'Mangaluru');

  const hampankatta = findPlaceByQuery('Hampankatta');
  assert.ok(hampankatta);
  assert.equal(hampankatta.name, 'Hampankatta');

  const ksRao = findPlaceByQuery('ks rao road');
  assert.ok(ksRao);
  assert.equal(ksRao.name, 'Hampankatta');

  const kadri = findPlaceByQuery('kadri');
  assert.ok(kadri);
  assert.equal(kadri.name, 'Kadri');

  // Non-matching query returns null
  assert.equal(findPlaceByQuery('NonExistentCityXYZ'), null);
});

test('Geo Places - isReportInPlace correctly evaluates boundary and address matching', () => {
  const hampankatta = findPlaceByQuery('Hampankatta');
  assert.ok(hampankatta);

  // Hampankatta report inside coordinates & address
  const reportInHampankatta = {
    lat: 12.8698,
    lng: 74.843,
    address: 'K.S. Rao Road, near Hampankatta Signal, Mangaluru',
  };
  assert.equal(isReportInPlace(reportInHampankatta, hampankatta), true);

  // Surathkal report outside Hampankatta boundary
  const reportInSurathkal = {
    lat: 13.008,
    lng: 74.794,
    address: 'Surathkal Main Highway near NITK, Mangaluru',
  };
  assert.equal(isReportInPlace(reportInSurathkal, hampankatta), false);

  const surathkal = findPlaceByQuery('Surathkal');
  assert.ok(surathkal);
  assert.equal(isReportInPlace(reportInSurathkal, surathkal), true);
});

test('Geo Places - synthesizeBoundaryFromReports computes buffered bounding box', () => {
  const coords = [
    { lat: 12.8698, lng: 74.843 },
    { lat: 12.8705, lng: 74.8438 },
  ];
  const synthesized = synthesizeBoundaryFromReports('K.S. Rao Road', coords);
  assert.ok(synthesized);
  assert.equal(synthesized.name, 'K.S. Rao Road');
  assert.ok(synthesized.bounds[0][0] < 12.8698); // buffered south
  assert.ok(synthesized.bounds[1][0] > 12.8705); // buffered north
});
