const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createTeam, createUser, createActivity } = require('./helpers/fixtures');

test('a designated event lead can manage an activity even without a team-lead role', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const admin = await createUser(pool, { role: 'admin' });
    const member = await createUser(pool, { role: 'member', team_id: teamId });
    const activityId = await createActivity(pool, { team_id: teamId, creator_id: admin.id, event_lead_id: member.id });
    await client.login(member.email, member.password);
    const result = await client.request('PATCH', `/api/activities/${activityId}`, { body: { location: 'Hội trường C2' } });
    assert.equal(result.status, 200);
  } finally { await close(); await teardown(); }
});

test('a leader who does not lead any team on the activity cannot manage it', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const otherTeamId = await createTeam(pool);
    const admin = await createUser(pool, { role: 'admin' });
    const outsideLeader = await createUser(pool, { role: 'leader', team_id: otherTeamId, is_lead: true });
    const activityId = await createActivity(pool, { team_id: teamId, creator_id: admin.id });
    await client.login(outsideLeader.email, outsideLeader.password);
    const result = await client.request('PATCH', `/api/activities/${activityId}`, { body: { location: 'Hội trường C2' } });
    assert.equal(result.status, 403);
  } finally { await close(); await teardown(); }
});

test('GET /api/activities and GET /api/activities/:id include event_lead_name', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const admin = await createUser(pool, { role: 'admin' });
    const member = await createUser(pool, { role: 'member', name: 'Nguyễn Trưởng BTC', team_id: teamId });
    const activityId = await createActivity(pool, { team_id: teamId, creator_id: admin.id, event_lead_id: member.id, status: 'approved' });

    await client.login(admin.email, admin.password);
    const detail = await client.request('GET', `/api/activities/${activityId}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.json.activity.event_lead_name, 'Nguyễn Trưởng BTC');

    const list = await client.request('GET', '/api/activities');
    assert.equal(list.status, 200);
    const item = list.json.find(a => a.id === activityId);
    assert.ok(item);
    assert.equal(item.event_lead_name, 'Nguyễn Trưởng BTC');
  } finally { await close(); await teardown(); }
});
