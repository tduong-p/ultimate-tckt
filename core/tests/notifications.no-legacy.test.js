const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createTeam, createUser, createActivity, createTask } = require('./helpers/fixtures');

test('a task response creates the in-app notification without marking any delivery status', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
    const member = await createUser(pool, { role: 'member', team_id: teamId });
    const activityId = await createActivity(pool, { team_id: teamId, creator_id: leader.id, status: 'approved' });
    const taskId = await createTask(pool, { activity_id: activityId, team_id: teamId, primary_assignee_id: member.id, assigned_by: leader.id });
    await client.login(member.email, member.password);

    const posted = await client.request('POST', `/api/activities/${activityId}/updates`, { body: { body: 'Đã xong bản nháp', kind: 'progress', task_id: taskId } });
    assert.equal(posted.status, 201);

    const [[row]] = await pool.query("SELECT email_status, push_status FROM notifications WHERE user_id=? AND kind='task_response'", [leader.id]);
    assert.equal(row.email_status, null);
    assert.equal(row.push_status, null);
  } finally { await close(); await teardown(); }
});

test('the legacy test-email and push-config endpoints are gone', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const admin = await createUser(pool, { role: 'admin' });
    await client.login(admin.email, admin.password);
    const email = await client.request('POST', '/api/email/test', { body: { to: 'a@example.com' } });
    const push = await client.request('GET', '/api/push/config');
    assert.equal(email.status, 404);
    assert.equal(push.status, 404);
  } finally { await close(); await teardown(); }
});
