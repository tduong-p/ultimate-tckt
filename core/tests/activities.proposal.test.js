const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createTeam, createUser, createActivity } = require('./helpers/fixtures');

test('full proposal workflow: request changes, resubmit, approve', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const admin = await createUser(pool, { role: 'admin' });
    const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
    const activityId = await createActivity(pool, { team_id: teamId, creator_id: leader.id, status: 'proposed' });

    await client.login(admin.email, admin.password);
    const rejectNoFeedback = await client.request('POST', `/api/activities/${activityId}/request-changes`, { body: {} });
    assert.equal(rejectNoFeedback.status, 400);

    const requestChanges = await client.request('POST', `/api/activities/${activityId}/request-changes`, { body: { feedback: 'Bổ sung dự toán kinh phí.' } });
    assert.equal(requestChanges.status, 200);

    await client.login(leader.email, leader.password);
    const resubmit = await client.request('POST', `/api/activities/${activityId}/submit`, { body: {} });
    assert.equal(resubmit.status, 200);

    await client.login(admin.email, admin.password);
    const approve = await client.request('POST', `/api/activities/${activityId}/approve`, { body: {} });
    assert.equal(approve.status, 200);

    const [[activity]] = await pool.query('SELECT status FROM activities WHERE id=?', [activityId]);
    assert.equal(activity.status, 'approved');
    const [history] = await pool.query('SELECT action FROM activity_proposals WHERE activity_id=? ORDER BY id', [activityId]);
    assert.deepEqual(history.map(row => row.action), ['request_changes', 'submit', 'approve']);
  } finally { await close(); await teardown(); }
});

test('a leader from an unrelated team cannot submit someone else\'s activity', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const ownerTeamId = await createTeam(pool);
    const otherTeamId = await createTeam(pool);
    const owner = await createUser(pool, { role: 'leader', team_id: ownerTeamId, is_lead: true });
    const outsider = await createUser(pool, { role: 'leader', team_id: otherTeamId, is_lead: true });
    const activityId = await createActivity(pool, { team_id: ownerTeamId, creator_id: owner.id, status: 'proposed' });

    await client.login(outsider.email, outsider.password);
    const submit = await client.request('POST', `/api/activities/${activityId}/submit`, { body: {} });
    assert.equal(submit.status, 403);
  } finally { await close(); await teardown(); }
});

test('approving an activity that is not in the pending-review status is rejected', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const admin = await createUser(pool, { role: 'admin' });
    const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
    const activityId = await createActivity(pool, { team_id: teamId, creator_id: leader.id, status: 'approved' });

    await client.login(admin.email, admin.password);
    const approve = await client.request('POST', `/api/activities/${activityId}/approve`, { body: {} });
    assert.equal(approve.status, 409);
  } finally { await close(); await teardown(); }
});
