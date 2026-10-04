'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { findReviewRecipients } = require('../src/services/notification-recipients');

function fakeDb(...results) {
  const calls = [];
  return { calls, query: async (sql, params) => { calls.push({ sql, params }); return [results.shift() || []]; } };
}

test('merges team leads and event lead, deduplicated by id', async () => {
  const db = fakeDb([{ id: 1, name: 'L', email: 'l@x' }, { id: '1', name: 'L', email: 'l@x' }, { id: 2, name: 'E', email: 'e@x' }]);
  const out = await findReviewRecipients(db, { teamId: 5, activityId: 9, actorId: 7 });
  assert.deepEqual(out.map(u => u.id), [1, 2]);
  assert.equal(db.calls.length, 1);
  assert.deepEqual(db.calls[0].params, [5, 7, 9, 7]);
});

test('falls back to active admins excluding the actor when no reviewer remains', async () => {
  const db = fakeDb([], [{ id: 3, name: 'A', email: 'a@x' }]);
  const out = await findReviewRecipients(db, { teamId: 5, activityId: 9, actorId: 7 });
  assert.deepEqual(out.map(u => u.id), [3]);
  assert.match(db.calls[1].sql, /vice_admin/);
  assert.deepEqual(db.calls[1].params, [7]);
});
