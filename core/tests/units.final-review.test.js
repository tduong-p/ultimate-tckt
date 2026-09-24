'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser, createTeam, unitIdByCode } = require('./helpers/fixtures');

const tcktRole = async (pool, userId) => {
  const [[row]] = await pool.query(
    "SELECT m.role FROM unit_memberships m JOIN org_units o ON o.id=m.unit_id AND o.code='TCKT' WHERE m.user_id=?",
    [userId]
  );
  return row?.role;
};

test('removing a user from TCKT sticks: later team edits do not re-create the membership', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const boss = await createUser(pool, { role: 'admin', team_id: teamId });
    const target = await createUser(pool, { role: 'member', team_id: teamId });
    const dyc = await createUser(pool, { units: [['DYC', 'dyc_admin']] });
    const tckt = await unitIdByCode(pool, 'TCKT');

    await client.login(dyc.email, dyc.password);
    assert.equal((await client.request('DELETE', `/api/units/${tckt}/members/${target.id}`)).status, 200);
    assert.equal(await tcktRole(pool, target.id), undefined);

    await client.login(boss.email, boss.password);
    assert.equal((await client.request('DELETE', `/api/teams/${teamId}/members/${target.id}`)).status, 200);
    assert.equal(await tcktRole(pool, target.id), undefined);
  } finally {
    await close();
    await teardown();
  }
});

test('editing a user outside TCKT is refused for TCKT admins and never pulls them into TCKT', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const boss = await createUser(pool, { role: 'admin', team_id: teamId });
    const dycAdmin = await createUser(pool, { units: [['DYC', 'dyc_admin']] });
    const btvOnly = await createUser(pool, { units: [['BTV', 'btv_member']] });

    await client.login(boss.email, boss.password);
    for (const target of [dycAdmin, btvOnly]) {
      const patched = await client.request('PATCH', `/api/users/${target.id}`, {
        body: { password: 'ChiemQuyen2026!', team_ids: [teamId] }
      });
      assert.equal(patched.status, 403);
      assert.equal((await client.request('DELETE', `/api/users/${target.id}`)).status, 403);
      assert.equal(await tcktRole(pool, target.id), undefined);
    }
    // The DYC account's password is unchanged: it can still log in with its own.
    await client.login(dycAdmin.email, dycAdmin.password);
  } finally {
    await close();
    await teardown();
  }
});

test('DYC may still edit an account that belongs to another unit', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const dyc = await createUser(pool, { role: 'admin', team_id: teamId, units: [['TCKT', 'admin'], ['DYC', 'dyc_admin']] });
    const btv = await createUser(pool, { role: 'admin', team_id: teamId, units: [['TCKT', 'admin'], ['BTV', 'btv_member']] });
    await client.login(dyc.email, dyc.password);
    const patched = await client.request('PATCH', `/api/users/${btv.id}`, { body: { name: 'Tên mới', team_ids: [teamId] } });
    assert.equal(patched.status, 200);
  } finally {
    await close();
    await teardown();
  }
});

test('GET /api/health fails with 503 when the multi-unit backfill marker is missing', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    await pool.execute("DELETE FROM platform_migrations WHERE name='multi_unit_backfill_v1'");
    const result = await client.request('GET', '/api/health');
    assert.equal(result.status, 503);
    assert.equal(result.json.status, 'migration_incomplete');
  } finally {
    await close();
    await teardown();
  }
});
