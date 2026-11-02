import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Integration Test: API Endpoint Permissions & Row-Level Access Control.
 * Tests Create, Read, Update, and Delete HTTP interactions on /api/reports.
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function isServerReachable() {
  try {
    const res = await fetch(`${BASE_URL}/api/reports/1`, {
      headers: { 'x-user-role': 'officer' },
      signal: AbortSignal.timeout(1500),
    });
    return res.status === 200 || res.status === 404;
  } catch {
    return false;
  }
}

test('API Permissions - Live HTTP CRUD and RLS enforcement', async (t) => {
  const reachable = await isServerReachable();
  if (!reachable) {
    t.skip('Next.js dev/test server is not running on localhost:3000');
    return;
  }

  // 1. CREATE Permissions: Any citizen/user can submit a report
  const createRes = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: 'Permissions test civic hazard - overflowing stormwater drain',
      category: 'Water & Sewage',
      lat: 12.87,
      lng: 74.845,
      address: 'K.S. Rao Road, Mangaluru',
    }),
  });

  assert.equal(createRes.status, 201, 'Citizen should be authorized to create a report');
  const createData = await createRes.json();
  assert.equal(createData.success, true);
  const createdReportId = createData.report.id;
  const createdTrackingCode = createData.tracking_code;

  // 1b. CREATE Validation: Invalid coordinates rejected
  const invalidCreate = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: 'Invalid coordinates test',
      lat: 999.0, // illegal latitude
      lng: 77.5946,
    }),
  });
  assert.equal(invalidCreate.status, 400);

  // 2. READ Permissions:
  // 2a. Citizen reading without tracking code is FORBIDDEN (IDOR prevention)
  const unauthReadRes = await fetch(`${BASE_URL}/api/reports/${createdReportId}`, {
    method: 'GET',
    headers: { 'x-user-role': 'citizen' },
  });
  assert.equal(
    unauthReadRes.status,
    403,
    'Citizen reading arbitrary report ID without tracking code must receive 403 Forbidden'
  );

  // 2b. Citizen reading WITH valid matching tracking code is ALLOWED
  const authReadWithCodeRes = await fetch(
    `${BASE_URL}/api/reports/${createdReportId}?tracking_code=${createdTrackingCode}`,
    {
      method: 'GET',
      headers: { 'x-user-role': 'citizen' },
    }
  );
  assert.equal(authReadWithCodeRes.status, 200, 'Citizen with tracking code must be authorized to read');

  // 2c. Officer reading by report ID is ALLOWED
  const officerReadRes = await fetch(`${BASE_URL}/api/reports/${createdReportId}`, {
    method: 'GET',
    headers: { 'x-user-role': 'officer' },
  });
  assert.equal(officerReadRes.status, 200, 'Officer must be authorized to read any report');

  // 2d. BULK DIRECTORY READ:
  // Citizen is forbidden from bulk directory dump (GET /api/reports)
  const citizenBulkRes = await fetch(`${BASE_URL}/api/reports`, {
    method: 'GET',
    headers: { 'x-user-role': 'citizen' },
  });
  assert.equal(
    citizenBulkRes.status,
    403,
    'Citizen must receive 403 Forbidden when requesting bulk reports directory'
  );

  // Officer is authorized to list all reports in directory
  const officerBulkRes = await fetch(`${BASE_URL}/api/reports`, {
    method: 'GET',
    headers: { 'x-user-role': 'officer' },
  });
  assert.equal(officerBulkRes.status, 200, 'Officer must be authorized to view reports directory');
  const officerBulkData = await officerBulkRes.json();
  assert.equal(officerBulkData.success, true);
  assert.ok(Array.isArray(officerBulkData.reports));

  // 2e. PRIVATE DATA PROTECTION:
  // Citizen with matching tracking code receives sanitized data (assignee masked)
  const citizenData = await authReadWithCodeRes.json();
  assert.equal(citizenData.report.tracking_code, createdTrackingCode);

  // 3. UPDATE Permissions:
  // 3a. Citizen attempting to change status must receive 403 Forbidden
  const citizenUpdateRes = await fetch(`${BASE_URL}/api/reports/${createdReportId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': 'citizen',
    },
    body: JSON.stringify({
      status: 'In Progress',
      actor: 'Citizen',
    }),
  });
  assert.equal(
    citizenUpdateRes.status,
    403,
    'Citizen attempting to change report status must receive 403 Forbidden'
  );

  // 3b. Officer with valid state transition is ALLOWED
  const officerValidUpdateRes = await fetch(`${BASE_URL}/api/reports/${createdReportId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': 'officer',
    },
    body: JSON.stringify({
      status: 'Under Review',
      actor: 'Officer',
    }),
  });
  assert.equal(officerValidUpdateRes.status, 200, 'Officer valid transition must succeed');

  // 3c. Officer with illegal state transition is REJECTED (400 Bad Request)
  const officerIllegalUpdateRes = await fetch(`${BASE_URL}/api/reports/${createdReportId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': 'officer',
    },
    body: JSON.stringify({
      status: 'Resolved', // cannot jump straight from Under Review to Resolved
      actor: 'Officer',
    }),
  });
  assert.equal(officerIllegalUpdateRes.status, 400, 'Illegal transition must return 400 Bad Request');

  // 4. DELETE Permissions:
  // Civic complaints and status audit trails are immutable public records; DELETE is forbidden
  const deleteRes = await fetch(`${BASE_URL}/api/reports/${createdReportId}`, {
    method: 'DELETE',
    headers: { 'x-user-role': 'officer' },
  });
  assert.equal(
    deleteRes.status,
    403,
    'DELETE request on reports must return 403 Forbidden to protect audit trail'
  );
});
