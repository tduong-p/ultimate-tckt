'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser, unitIdByCode } = require('./helpers/fixtures');

test('BTV có module dieu-hanh: session trả modules và /api/directives qua cổng', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const btv = await createUser(pool, { role: 'member', units: [['BTV', 'btv_lead']] });
    await client.login(btv.email, btv.password);
    const session = await client.request('GET', '/api/session');
    assert.equal(session.json.units.current.code, 'BTV');
    assert.ok(session.json.units.current.modules.includes('dieu-hanh'));
    const list = await client.request('GET', '/api/directives');
    assert.equal(list.status, 200);
    assert.deepEqual(list.json.data, []);
    const subs = await client.request('GET', '/api/submissions');
    assert.equal(subs.status, 200);
  } finally { await close(); await teardown(); }
});

test('đơn vị không có dieu-hanh (VPD) vẫn 403, modules không chứa dieu-hanh', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const vpd = await createUser(pool, { role: 'member', units: [['VPD', 'officer']] });
    await client.login(vpd.email, vpd.password);
    const session = await client.request('GET', '/api/session');
    assert.ok(!session.json.units.current.modules.includes('dieu-hanh'));
    assert.equal((await client.request('GET', '/api/directives')).status, 403);
    assert.equal((await client.request('GET', '/api/submissions')).status, 403);
  } finally { await close(); await teardown(); }
});

test('đổi đơn vị sang TCKT thì POST /api/session/unit trả modules mới và qua cổng', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const user = await createUser(pool, { role: 'admin', units: [['VPD', 'officer'], ['TCKT', 'admin']] });
    await client.login(user.email, user.password);
    assert.equal((await client.request('GET', '/api/directives')).status, 403);
    const switched = await client.request('POST', '/api/session/unit', { body: { unit_id: await unitIdByCode(pool, 'TCKT') } });
    assert.equal(switched.status, 200);
    assert.ok(switched.json.units.current.modules.includes('dieu-hanh'));
    assert.equal((await client.request('GET', '/api/directives')).status, 200);
  } finally { await close(); await teardown(); }
});
