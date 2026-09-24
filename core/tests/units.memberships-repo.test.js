'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { createTeam, createUser, addMembership } = require('./helpers/fixtures');
const m = require('../src/units/memberships');

test('fixture user gets a TCKT membership equal to its role; units override replaces it', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    const teamId = await createTeam(pool);
    const a = await createUser(pool, { role: 'leader', team_id: teamId });
    assert.deepEqual((await m.listMemberships(pool, a.id)).map(x => [x.code, x.role]), [['TCKT', 'leader']]);
    const b = await createUser(pool, { units: [['BTV', 'btv_lead']] });
    assert.deepEqual((await m.listMemberships(pool, b.id)).map(x => [x.code, x.role]), [['BTV', 'btv_lead']]);
    const c = await createUser(pool, { units: [] });
    assert.deepEqual(await m.listMemberships(pool, c.id), []);
  } finally { await teardown(); }
});

test('listMemberships keeps insertion order and hides inactive units', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    const u = await createUser(pool, { units: [['BTV', 'btv_member']] });
    await addMembership(pool, u.id, 'TCKT', 'member');
    await addMembership(pool, u.id, 'VPD', 'officer');
    assert.deepEqual((await m.listMemberships(pool, u.id)).map(x => x.code), ['BTV', 'TCKT', 'VPD']);
    await pool.query("UPDATE org_units SET is_active=0 WHERE code='BTV'");
    assert.deepEqual((await m.listMemberships(pool, u.id)).map(x => x.code), ['TCKT', 'VPD']);
  } finally { await teardown(); }
});

test('upsertMembership rejects a role that does not fit the unit kind with status 400', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    const u = await createUser(pool, { units: [] });
    const btv = await m.unitIdByCode(pool, 'BTV');
    await assert.rejects(m.upsertMembership(pool, u.id, btv, 'admin'), e => e.status === 400);
    await m.upsertMembership(pool, u.id, btv, 'btv_member');
    await m.upsertMembership(pool, u.id, btv, 'btv_lead');
    assert.deepEqual((await m.listMemberships(pool, u.id)).map(x => x.role), ['btv_lead']);
    assert.equal(await m.removeMembership(pool, u.id, btv), true);
    assert.equal(await m.removeMembership(pool, u.id, btv), false);
  } finally { await teardown(); }
});

test('TCKT role sync works both ways', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    const u = await createUser(pool, { role: 'member', units: [] });
    await pool.query("UPDATE users SET role='vice_admin' WHERE id=?", [u.id]);
    await m.syncTcktMembershipFromRole(pool, u.id);
    assert.deepEqual((await m.listMemberships(pool, u.id)).map(x => [x.code, x.role]), [['TCKT', 'vice_admin']]);
    await m.setTcktRoleColumn(pool, u.id, 'leader');
    const [[row]] = await pool.query('SELECT role FROM users WHERE id=?', [u.id]);
    assert.equal(row.role, 'leader');
  } finally { await teardown(); }
});

test('ensureDycAdmins grants (or upgrades to) dyc_admin for existing emails only, idempotently', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    const a = await createUser(pool, { email: 'boss@hust.edu.vn' });
    const b = await createUser(pool, { email: 'eng@hust.edu.vn' });
    await addMembership(pool, b.id, 'DYC', 'dyc_engineer');
    assert.equal(await m.ensureDycAdmins(pool, ['Boss@Hust.edu.vn', 'eng@hust.edu.vn', 'ghost@hust.edu.vn']), 2);
    assert.equal(await m.ensureDycAdmins(pool, ['boss@hust.edu.vn', 'eng@hust.edu.vn']), 2);
    for (const id of [a.id, b.id]) {
      const dyc = (await m.listMemberships(pool, id)).find(x => x.code === 'DYC');
      assert.equal(dyc.role, 'dyc_admin');
    }
    assert.equal(m.hasDycMembership(await m.listMemberships(pool, a.id)), true);
    assert.equal(m.hasDycMembership([{ kind: 'platform_owner' }]), false);
  } finally { await teardown(); }
});
