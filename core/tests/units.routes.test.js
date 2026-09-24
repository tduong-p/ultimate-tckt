'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser, unitIdByCode } = require('./helpers/fixtures');

test('unit list is scoped: DYC sees every unit, others only their own', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const dyc = await createUser(pool, { units: [['DYC', 'dyc_engineer']] });
    const btv = await createUser(pool, { units: [['BTV', 'btv_member']] });
    await client.login(dyc.email, dyc.password);
    const all = await client.request('GET', '/api/units');
    assert.ok(all.json.length >= 7);
    assert.ok(all.json.find(u => u.code === 'DEMO-DT-01').name.startsWith('[Dữ liệu giả]'));
    await client.login(btv.email, btv.password);
    assert.deepEqual((await client.request('GET', '/api/units')).json.map(u => u.code), ['BTV']);
    assert.equal((await client.request('GET', `/api/units/${await unitIdByCode(pool, 'TCKT')}/members`)).status, 403);
    assert.equal((await client.request('GET', `/api/units/${await unitIdByCode(pool, 'BTV')}/members`)).status, 200);
  } finally { await close(); await teardown(); }
});

test('BTV lead manages BTV members only; role must fit the unit kind; changes are audited', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const lead = await createUser(pool, { units: [['BTV', 'btv_lead']] });
    const target = await createUser(pool, { units: [] });
    const btv = await unitIdByCode(pool, 'BTV');
    const tckt = await unitIdByCode(pool, 'TCKT');
    await client.login(lead.email, lead.password);
    assert.equal((await client.request('PUT', `/api/units/${btv}/members/${target.id}`, { body: { role: 'admin' } })).status, 400);
    assert.equal((await client.request('PUT', `/api/units/${btv}/members/${target.id}`, { body: { role: 'btv_member' } })).status, 200);
    assert.equal((await client.request('PUT', `/api/units/${tckt}/members/${target.id}`, { body: { role: 'member' } })).status, 403);
    assert.equal((await client.request('PUT', `/api/units/${btv}/members/999999`, { body: { role: 'btv_member' } })).status, 404);
    assert.equal((await client.request('DELETE', `/api/units/${btv}/members/${target.id}`)).status, 200);
    const [rows] = await pool.query("SELECT action, meta FROM audit_logs WHERE action LIKE 'membership.%' ORDER BY id");
    assert.deepEqual(rows.map(r => r.action), ['membership.upsert', 'membership.remove']);
    const meta = typeof rows[0].meta === 'string' ? JSON.parse(rows[0].meta) : rows[0].meta;
    assert.equal(meta.role, 'btv_member');
  } finally { await close(); await teardown(); }
});

test('TCKT membership changes are mirrored to users.role; DYC unit is managed by dyc_admin only; last dyc_admin cannot be removed', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  const roleOf = async id => (await pool.query('SELECT role FROM users WHERE id=?', [id]))[0][0].role;
  try {
    const boss = await createUser(pool, { units: [['DYC', 'dyc_admin']] });
    const eng = await createUser(pool, { units: [['DYC', 'dyc_engineer']] });
    const m = await createUser(pool, { role: 'member' });
    const tckt = await unitIdByCode(pool, 'TCKT');
    const dyc = await unitIdByCode(pool, 'DYC');

    await client.login(eng.email, eng.password);
    assert.equal((await client.request('PUT', `/api/units/${tckt}/members/${m.id}`, { body: { role: 'vice_leader' } })).status, 200);
    assert.equal(await roleOf(m.id), 'vice_leader');
    assert.equal((await client.request('PUT', `/api/units/${dyc}/members/${m.id}`, { body: { role: 'dyc_engineer' } })).status, 403);

    await client.login(boss.email, boss.password);
    assert.equal((await client.request('DELETE', `/api/units/${tckt}/members/${m.id}`)).status, 200);
    assert.equal(await roleOf(m.id), 'member');
    const last = await client.request('DELETE', `/api/units/${dyc}/members/${boss.id}`);
    assert.equal(last.status, 409);
    assert.equal((await client.request('PUT', `/api/units/${dyc}/members/${eng.id}`, { body: { role: 'dyc_admin' } })).status, 200);
    assert.equal((await client.request('DELETE', `/api/units/${dyc}/members/${boss.id}`)).status, 200);
  } finally { await close(); await teardown(); }
});
