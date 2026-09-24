'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser, createTeam, addMembership, unitIdByCode } = require('./helpers/fixtures');
const { legacyRole } = require('../src/middleware/unit-context');

test('legacyRole: DYC reads as admin, TCKT role otherwise, null for outsiders', () => {
  const dyc = { code: 'DYC', kind: 'platform_owner', role: 'dyc_engineer' };
  const tckt = { code: 'TCKT', kind: 'department', role: 'leader' };
  const btv = { code: 'BTV', kind: 'standing_committee', role: 'btv_lead' };
  assert.equal(legacyRole([dyc], 'GET'), 'admin');
  assert.equal(legacyRole([dyc], 'POST'), null);
  assert.equal(legacyRole([dyc, tckt], 'POST'), 'leader');
  assert.equal(legacyRole([tckt, dyc], 'GET'), 'admin');
  assert.equal(legacyRole([btv], 'GET'), null);
  assert.equal(legacyRole([], 'GET'), null);
});

test('session exposes units; a user without memberships is refused with 403', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const nobody = await createUser(pool, { units: [] });
    await client.login(nobody.email, nobody.password);
    const s = await client.request('GET', '/api/session');
    assert.deepEqual(s.json.units.memberships, []);
    assert.equal(s.json.units.current, null);
    const b = await client.request('GET', '/api/bootstrap');
    assert.equal(b.status, 403);
    assert.match(b.json.error, /chưa thuộc đơn vị/);

    const multi = await createUser(pool, { role: 'leader' });
    await addMembership(pool, multi.id, 'BTV', 'btv_member');
    await client.login(multi.email, multi.password);
    const s2 = await client.request('GET', '/api/session');
    assert.equal(s2.json.units.current.code, 'TCKT');
    assert.deepEqual(s2.json.units.memberships.map(m => m.code), ['TCKT', 'BTV']);
    assert.equal(s2.json.user.role, 'leader');
    assert.equal(s2.json.user.is_devops, 0);
  } finally { await close(); await teardown(); }
});

test('switching unit: members only; stale current unit falls back to the first membership', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const u = await createUser(pool, { role: 'member' });
    await addMembership(pool, u.id, 'BTV', 'btv_member');
    await client.login(u.email, u.password);
    const btv = await unitIdByCode(pool, 'BTV');
    const vpd = await unitIdByCode(pool, 'VPD');
    assert.equal((await client.request('POST', '/api/session/unit', { body: { unit_id: vpd } })).status, 403);
    const ok = await client.request('POST', '/api/session/unit', { body: { unit_id: btv } });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.units.current.code, 'BTV');
    // Gỡ membership BTV, rồi tắt luôn đơn vị: phiên cũ không được 500, phải rơi về TCKT.
    await pool.query('DELETE FROM unit_memberships WHERE user_id=? AND unit_id=?', [u.id, btv]);
    const s = await client.request('GET', '/api/session');
    assert.equal(s.status, 200);
    assert.equal(s.json.units.current.code, 'TCKT');
    await addMembership(pool, u.id, 'BTV', 'btv_member');
    await client.request('POST', '/api/session/unit', { body: { unit_id: btv } });
    await pool.query('UPDATE org_units SET is_active=0 WHERE id=?', [btv]);
    assert.equal((await client.request('GET', '/api/session')).json.units.current.code, 'TCKT');
  } finally { await close(); await teardown(); }
});

test('role changes through the old user API keep the TCKT membership in sync', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  const tcktRole = async email => {
    const [[row]] = await pool.query("SELECT m.role FROM unit_memberships m JOIN users u ON u.id=m.user_id JOIN org_units o ON o.id=m.unit_id AND o.code='TCKT' WHERE u.email=?", [email]);
    return row?.role;
  };
  try {
    const teamId = await createTeam(pool);
    const boss = await createUser(pool, { role: 'admin' });
    await client.login(boss.email, boss.password);
    const created = await client.request('POST', '/api/users', { body: { name: 'Mới', email: 'moi@example.com', password: 'MatKhauTest2026!', role: 'vice_leader', team_ids: [teamId] } });
    assert.equal(created.status, 201);
    assert.equal(await tcktRole('moi@example.com'), 'vice_leader');
    await client.request('POST', '/api/users/bulk-import', { body: { rows: [{ name: 'Nhập', email: 'nhap@hust.edu.vn', team_ids: [teamId] }] } });
    assert.equal(await tcktRole('nhap@hust.edu.vn'), 'member');
    const patched = await client.request('PATCH', `/api/users/${created.json.id}`, { body: { name: 'Mới', email: 'moi@example.com', role: 'leader', team_ids: [teamId] } });
    assert.equal(patched.status, 200);
    assert.equal(await tcktRole('moi@example.com'), 'leader');
  } finally { await close(); await teardown(); }
});

test('a first-time SSO account becomes a TCKT member', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    const bcrypt = require('bcryptjs');
    const crypto = require('crypto');
    const { findOrCreateHustAccount } = require('../src/auth/hust-account');
    const user = await findOrCreateHustAccount({ db: pool, bcrypt, crypto }, 'sv.moi@sis.hust.edu.vn', { name: 'SV Mới' });
    const { listMemberships } = require('../src/units/memberships');
    assert.deepEqual((await listMemberships(pool, user.id)).map(m => [m.code, m.role]), [['TCKT', 'member']]);
  } finally { await teardown(); }
});
