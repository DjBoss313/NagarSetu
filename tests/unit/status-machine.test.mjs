import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for NagarSetu Status Transition State Machine.
 * Validates enforced municipal lifecycle per PLAN.md.
 */

const ALLOWED_STATUS_TRANSITIONS = {
  Submitted: ['Under Review', 'Rejected', 'Merged'],
  'Under Review': ['Assigned', 'Rejected', 'Merged'],
  Assigned: ['In Progress', 'Under Review'],
  'In Progress': ['Resolved', 'Under Review'],
  Resolved: [],
  Rejected: [],
  Merged: [],
};

function isValidStatusTransition(from, to) {
  const allowed = ALLOWED_STATUS_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

test('Status State Machine - Allowed forward transitions', () => {
  assert.equal(isValidStatusTransition('Submitted', 'Under Review'), true);
  assert.equal(isValidStatusTransition('Submitted', 'Rejected'), true);
  assert.equal(isValidStatusTransition('Submitted', 'Merged'), true);
  assert.equal(isValidStatusTransition('Under Review', 'Assigned'), true);
  assert.equal(isValidStatusTransition('Assigned', 'In Progress'), true);
  assert.equal(isValidStatusTransition('In Progress', 'Resolved'), true);
});

test('Status State Machine - Allowed rework transitions', () => {
  assert.equal(isValidStatusTransition('Assigned', 'Under Review'), true);
  assert.equal(isValidStatusTransition('In Progress', 'Under Review'), true);
});

test('Status State Machine - Blocked illegal transitions', () => {
  // Cannot jump straight from Submitted to Resolved or In Progress
  assert.equal(isValidStatusTransition('Submitted', 'Resolved'), false);
  assert.equal(isValidStatusTransition('Submitted', 'In Progress'), false);
  assert.equal(isValidStatusTransition('Submitted', 'Assigned'), false);

  // Terminal states cannot transition to anything
  assert.equal(isValidStatusTransition('Resolved', 'In Progress'), false);
  assert.equal(isValidStatusTransition('Resolved', 'Under Review'), false);
  assert.equal(isValidStatusTransition('Rejected', 'Under Review'), false);
  assert.equal(isValidStatusTransition('Merged', 'Submitted'), false);
});

test('Status State Machine - Invalid unknown status handling', () => {
  assert.equal(isValidStatusTransition('UnknownStatus', 'Assigned'), false);
  assert.equal(isValidStatusTransition('Submitted', 'FakeStatus'), false);
});
