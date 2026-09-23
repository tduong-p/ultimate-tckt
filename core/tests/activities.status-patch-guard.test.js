'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createTeam, createUser, createActivity } = require('./helpers/fixtures');

test('non-admin team leads cannot bypass the approval workflow via PATCH /api/activities/:id', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const admin = await createUser(pool, { role: 'admin' });
    const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
    const activityId = await createActivity(pool, { team_id: teamId, creator_id: leader.id, status: 'proposed' });

    await client.login(leader.email, leader.password);
    const leaderPatch = await client.request('PATCH', `/api/activities/${activityId}`, { body: { status: 'approved' } });
    assert.notEqual(leaderPatch.status, 200, 'a non-admin team lead should not be able to set status directly');

    const [[afterLeaderAttempt]] = await pool.query('SELECT status FROM activities WHERE id=?', [activityId]);
    assert.equal(afterLeaderAttempt.status, 'proposed', 'the activity status must be unchanged after the non-admin PATCH attempt');

    const [historyAfterLeaderAttempt] = await pool.query('SELECT * FROM activity_proposals WHERE activity_id=?', [activityId]);
    assert.equal(historyAfterLeaderAttempt.length, 0, 'no proposal-decision history row should be written by the generic PATCH route');

    await client.login(admin.email, admin.password);
    const adminPatch = await client.request('PATCH', `/api/activities/${activityId}`, { body: { status: 'approved' } });
    assert.equal(adminPatch.status, 200, 'an admin should still be able to set status via the generic PATCH route');

    const [[afterAdminPatch]] = await pool.query('SELECT status FROM activities WHERE id=?', [activityId]);
    assert.equal(afterAdminPatch.status, 'approved');
  } finally { await close(); await teardown(); }
});

test('non-admin team leads keep the ability to edit other allowed fields via PATCH /api/activities/:id', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
    const activityId = await createActivity(pool, { team_id: teamId, creator_id: leader.id, status: 'proposed' });

    await client.login(leader.email, leader.password);
    const patch = await client.request('PATCH', `/api/activities/${activityId}`, { body: { priority: 'urgent' } });
    assert.equal(patch.status, 200);

    const [[activity]] = await pool.query('SELECT priority, status FROM activities WHERE id=?', [activityId]);
    assert.equal(activity.priority, 'urgent');
    assert.equal(activity.status, 'proposed');
  } finally { await close(); await teardown(); }
});
