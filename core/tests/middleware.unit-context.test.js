'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser, createTeam, addMembership, unitIdByCode } = require('./helpers/fixtures');
const { legacyRole } = require('../src/middleware/unit-context');

// --- Pure unit tests for legacyRole ---

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

// --- Integration tests via /test/unit-context ---

test('unauthenticated request gets null/empty defaults (not 500)', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const res = await client.request('GET', '/test/unit-context');
    assert.equal(res.status, 200);
    assert.equal(res.json.unit, null);
    assert.equal(res.json.unitRole, null);
    assert.deepEqual(res.json.memberships, []);
    assert.equal(res.json.actor, null);
  } finally { await close(); await teardown(); }
});

test('user with valid membership gets correct unit context and actor', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const u = await createUser(pool, { role: 'leader', team_id: teamId });
    await addMembership(pool, u.id, 'BTV', 'btv_member');
    await client.login(u.email, u.password);
    const res = await client.request('GET', '/test/unit-context');
    assert.equal(res.status, 200);
    // First membership = TCKT (from createUser default)
    assert.equal(res.json.unit.code, 'TCKT');
    assert.equal(res.json.unit.kind, 'department');
    assert.equal(res.json.unitRole, 'leader');
    assert.deepEqual(res.json.memberships.map(m => m.code), ['TCKT', 'BTV']);
    // legacyRole for GET with no DYC = TCKT role
    assert.equal(res.json.actor.role, 'leader');
  } finally { await close(); await teardown(); }
});

test('session with stale current_unit_id falls back to first membership', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const u = await createUser(pool, { role: 'member' });
    await addMembership(pool, u.id, 'BTV', 'btv_member');
    await client.login(u.email, u.password);
    // Manually set current_unit_id to a unit the user does NOT belong to
    const vpdId = await unitIdByCode(pool, 'VPD');
    // Set stale unit via a direct session manipulation is hard; instead verify that
    // after removing the current unit's membership, it falls back
    const tcktId = await unitIdByCode(pool, 'TCKT');
    await pool.execute('DELETE FROM unit_memberships WHERE user_id=? AND unit_id=?', [u.id, tcktId]);
    const res = await client.request('GET', '/test/unit-context');
    assert.equal(res.status, 200);
    // Should fallback to BTV (only remaining membership)
    assert.equal(res.json.unit.code, 'BTV');
    assert.equal(res.json.unitRole, 'btv_member');
  } finally { await close(); await teardown(); }
});

test('user without any membership gets empty memberships and null unit', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const u = await createUser(pool, { units: [] });
    await client.login(u.email, u.password);
    const res = await client.request('GET', '/test/unit-context');
    assert.equal(res.status, 200);
    assert.deepEqual(res.json.memberships, []);
    assert.equal(res.json.unit, null);
    assert.equal(res.json.unitRole, null);
    // actor exists but role is null
    assert.ok(res.json.actor);
    assert.equal(res.json.actor.role, null);
  } finally { await close(); await teardown(); }
});

test('inactive unit is excluded and middleware falls back', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const u = await createUser(pool, { units: [['TCKT', 'member'], ['BTV', 'btv_member']] });
    await client.login(u.email, u.password);
    // Deactivate TCKT
    await pool.query("UPDATE org_units SET is_active=0 WHERE code='TCKT'");
    const res = await client.request('GET', '/test/unit-context');
    assert.equal(res.status, 200);
    assert.equal(res.json.unit.code, 'BTV');
    assert.equal(res.json.unitRole, 'btv_member');
    assert.deepEqual(res.json.memberships.map(m => m.code), ['BTV']);
    // Restore for other tests
    await pool.query("UPDATE org_units SET is_active=1 WHERE code='TCKT'");
  } finally { await close(); await teardown(); }
});
