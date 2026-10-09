'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser, createTeam, createActivity, unitIdByCode } = require('./helpers/fixtures');

async function unitName(pool, code) {
  const [[row]] = await pool.execute('SELECT name FROM org_units WHERE code=?', [code]);
  return row.name;
}

test('danh sách và chi tiết chỉ đạo có tên đơn vị và người; trình có source_title', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const btv = await createUser(pool, { name: 'Lê BTV', role: 'member', units: [['BTV', 'btv_lead']] });
    const tcktAdmin = await createUser(pool, { name: 'Trần Admin', role: 'admin' });
    const tcktId = await unitIdByCode(pool, 'TCKT');

    await client.login(btv.email, btv.password);
    const created = await client.request('POST', '/api/directives', { body: { to_unit_id: tcktId, title: 'Chỉ đạo A', deadline: '2026-12-01' } });
    assert.equal(created.status, 201);
    const directiveId = created.json.id;

    const list = await client.request('GET', '/api/directives');
    assert.equal(list.status, 200);
    assert.equal(list.json.data[0].from_unit_name, await unitName(pool, 'BTV'));
    assert.equal(list.json.data[0].to_unit_name, await unitName(pool, 'TCKT'));
    assert.equal(list.json.data[0].created_by_name, 'Lê BTV');
    assert.equal(list.json.data[0].owner_name, null);

    await client.login(tcktAdmin.email, tcktAdmin.password);
    assert.equal((await client.request('POST', `/api/directives/${directiveId}/acknowledge`, { body: { owner_user_id: tcktAdmin.id } })).status, 200);
    const teamId = await createTeam(pool);
    const activityId = await createActivity(pool, { team_id: teamId, creator_id: tcktAdmin.id, status: 'approved', title: 'Hoạt động gắn chỉ đạo' });
    assert.equal((await client.request('POST', `/api/directives/${directiveId}/link-activity`, { body: { activity_id: activityId } })).status, 200);
    const submitted = await client.request('POST', `/api/directives/${directiveId}/submit`, { body: { source_type: 'activity', source_id: activityId, note: 'Đã xong' } });
    assert.equal(submitted.status, 201);

    const detail = await client.request('GET', `/api/directives/${directiveId}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.json.owner_name, 'Trần Admin');
    assert.equal(detail.json.activities.length, 1);
    assert.equal(detail.json.submissions[0].source_title, 'Hoạt động gắn chỉ đạo');
    assert.equal(detail.json.submissions[0].submitted_by_name, 'Trần Admin');

    const sub = await client.request('GET', `/api/submissions/${submitted.json.id}`);
    assert.equal(sub.json.from_unit_name, await unitName(pool, 'TCKT'));
    assert.equal(sub.json.source_title, 'Hoạt động gắn chỉ đạo');
    const subs = await client.request('GET', '/api/submissions');
    assert.equal(subs.json.data[0].to_unit_name, await unitName(pool, 'BTV'));
  } finally { await close(); await teardown(); }
});

test('GET /api/directives/units chỉ trả đơn vị có dieu-hanh; VPD bị 403; DYC không bị 403', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const btv = await createUser(pool, { role: 'member', units: [['BTV', 'btv_lead']] });
    const vpd = await createUser(pool, { role: 'member', units: [['VPD', 'officer']] });
    const dyc = await createUser(pool, { role: 'admin', units: [['DYC', 'dyc_admin']] });

    await client.login(btv.email, btv.password);
    const res = await client.request('GET', '/api/directives/units');
    assert.equal(res.status, 200);
    const codes = res.json.data.map(u => u.code);
    assert.ok(codes.includes('TCKT') && codes.includes('BTV'));
    assert.ok(!codes.includes('VPD'));
    assert.deepEqual(Object.keys(res.json.data[0]).sort(), ['code', 'id', 'kind', 'name']);

    await client.login(vpd.email, vpd.password);
    assert.equal((await client.request('GET', '/api/directives/units')).status, 403);
    await client.login(dyc.email, dyc.password);
    assert.notEqual((await client.request('GET', '/api/directives/units')).status, 403);
  } finally { await close(); await teardown(); }
});
