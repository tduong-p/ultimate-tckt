'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser, createTeam, createActivity, addMembership } = require('./helpers/fixtures');

const audits = async (pool, action) => (await pool.query('SELECT * FROM audit_logs WHERE action=? ORDER BY id', [action]))[0];

test('outsiders (BTV only) get 403 on Điều hành routes', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const btv = await createUser(pool, { units: [['BTV', 'btv_lead']] });
    await client.login(btv.email, btv.password);
    for (const p of ['/api/bootstrap', '/api/activities', '/api/tasks/1', '/api/teams', '/api/people', '/api/reports/export']) {
      const r = await client.request('GET', p);
      assert.equal(r.status, 403, p);
    }
    assert.equal((await client.request('POST', '/api/activities', { body: { title: 'x' } })).status, 403);
  } finally { await close(); await teardown(); }
});

test('DYC reads private TCKT data with an audit row per request, and cannot write', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const owner = await createUser(pool, { role: 'leader', team_id: teamId });
    const activityId = await createActivity(pool, { team_id: teamId, creator_id: owner.id, event_lead_id: owner.id });
    await pool.query('UPDATE activities SET is_public=0 WHERE id=?', [activityId]);
    const dyc = await createUser(pool, { units: [['DYC', 'dyc_engineer']] });
    await client.login(dyc.email, dyc.password);
    const r = await client.request('GET', `/api/activities/${activityId}`);
    assert.equal(r.status, 200);
    const rows = await audits(pool, 'cross_unit_read');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].actor_id, dyc.id);
    assert.equal(rows[0].target_id, `GET /api/activities/${activityId}`);
    const [[tckt]] = await pool.query("SELECT id FROM org_units WHERE code='TCKT'");
    assert.equal(rows[0].owner_unit_id, tckt.id);
    assert.equal((await client.request('POST', '/api/activities', { body: { title: 'x' } })).status, 403);
    assert.equal((await client.request('PATCH', `/api/activities/${activityId}`, { body: { title: 'y' } })).status, 403);
  } finally { await close(); await teardown(); }
});

test('TCKT members are not audited and permission follows the membership, not users.role', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    // users.role nói admin nhưng membership TCKT chỉ là member → phải bị đối xử như member.
    const u = await createUser(pool, { role: 'admin', units: [['TCKT', 'member']] });
    await client.login(u.email, u.password);
    assert.equal((await client.request('GET', '/api/bootstrap')).status, 200);
    assert.equal((await client.request('POST', '/api/teams', { body: { name: 'Không được tạo' } })).status, 403);
    assert.equal((await audits(pool, 'cross_unit_read')).length, 0);
  } finally { await close(); await teardown(); }
});

test('a user in both TCKT and DYC writes with the TCKT role and reads without audit', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const u = await createUser(pool, { role: 'admin', team_id: teamId });
    await addMembership(pool, u.id, 'DYC', 'dyc_admin');
    await client.login(u.email, u.password);
    assert.equal((await client.request('GET', '/api/people')).status, 200);
    assert.equal((await audits(pool, 'cross_unit_read')).length, 0);
    const created = await client.request('POST', '/api/teams', { body: { name: 'Ban DYC tạo' } });
    assert.ok([200, 201].includes(created.status), JSON.stringify(created.json));
  } finally { await close(); await teardown(); }
});
