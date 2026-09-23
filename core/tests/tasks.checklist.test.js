const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createTeam, createUser, createActivity, createTask } = require('./helpers/fixtures');

test('assignee can add and toggle checklist items; outsider cannot', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const leader = await createUser(pool, { role: 'leader', team_id: teamId, is_lead: true });
    const member = await createUser(pool, { role: 'member', team_id: teamId });
    const outsider = await createUser(pool, { role: 'member' });
    const activityId = await createActivity(pool, { team_id: teamId, creator_id: leader.id, status: 'approved' });
    const taskId = await createTask(pool, { activity_id: activityId, team_id: teamId, primary_assignee_id: member.id, assigned_by: leader.id });

    await client.login(member.email, member.password);
    const added = await client.request('POST', `/api/tasks/${taskId}/checklist`, { body: { title: 'Chốt nội dung chữ' } });
    assert.equal(added.status, 201);
    const toggled = await client.request('PATCH', `/api/tasks/${taskId}/checklist/${added.json.id}`, { body: { is_done: true } });
    assert.equal(toggled.status, 200);

    await client.login(outsider.email, outsider.password);
    const forbidden = await client.request('POST', `/api/tasks/${taskId}/checklist`, { body: { title: 'Không được phép' } });
    assert.equal(forbidden.status, 403);
  } finally { await close(); await teardown(); }
});
