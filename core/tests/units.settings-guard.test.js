'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser, unitIdByCode } = require('./helpers/fixtures');
const { SETTINGS } = require('../src/settings/catalog');

test('catalog marks SMTP and cron as platform, templates/rules/weight presets as unit', () => {
  assert.equal(SETTINGS['email.smtp'].managed_by, 'platform');
  assert.equal(SETTINGS['cron.jobs'].managed_by, 'platform');
  for (const k of ['email.templates', 'email.rules', 'weight_presets']) assert.equal(SETTINGS[k].managed_by, 'unit', k);
});

test('TCKT admin edits unit settings until DYC locks them; lock reason is returned; DYC bypasses the lock', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const tcktAdmin = await createUser(pool, { role: 'vice_admin' });
    const dyc = await createUser(pool, { units: [['DYC', 'dyc_admin']] });
    const body = { name: 'Nhẹ', points: 1 };

    await client.login(tcktAdmin.email, tcktAdmin.password);
    assert.equal((await client.request('GET', '/api/admin/email/settings')).status, 403);
    assert.equal((await client.request('POST', '/api/admin/weight-presets', { body })).status, 201);
    assert.equal((await client.request('GET', '/api/admin/email/templates')).status, 200);
    assert.equal((await client.request('POST', '/api/platform/setting-locks', { body: { setting_key: 'weight_presets', unit_id: null, reason: 'x' } })).status, 403);

    await client.login(dyc.email, dyc.password);
    assert.equal((await client.request('POST', '/api/platform/setting-locks', { body: { setting_key: 'email.smtp', unit_id: null, reason: 'x' } })).status, 400);
    assert.equal((await client.request('POST', '/api/platform/setting-locks', { body: { setting_key: 'weight_presets', unit_id: null, reason: '' } })).status, 400);
    const lock = await client.request('POST', '/api/platform/setting-locks', { body: { setting_key: 'weight_presets', unit_id: null, reason: 'Chốt thang điểm học kỳ' } });
    assert.equal(lock.status, 201);
    assert.equal((await client.request('POST', '/api/admin/weight-presets', { body })).status, 201);

    await client.login(tcktAdmin.email, tcktAdmin.password);
    const blocked = await client.request('POST', '/api/admin/weight-presets', { body });
    assert.equal(blocked.status, 403);
    assert.equal(blocked.json.locked, true);
    assert.equal(blocked.json.reason, 'Chốt thang điểm học kỳ');
    assert.equal((await client.request('GET', '/api/admin/weight-presets')).status, 200);
    const locks = await client.request('GET', '/api/platform/setting-locks');
    assert.equal(locks.json.length, 1);

    await client.login(dyc.email, dyc.password);
    assert.equal((await client.request('DELETE', `/api/platform/setting-locks/${lock.json.id}`)).status, 200);
    await client.login(tcktAdmin.email, tcktAdmin.password);
    assert.equal((await client.request('POST', '/api/admin/weight-presets', { body })).status, 201);

    const [rows] = await pool.query("SELECT action FROM audit_logs WHERE action LIKE 'setting.%' ORDER BY id");
    assert.deepEqual(rows.map(r => r.action), ['setting.lock', 'setting.unlock']);
  } finally { await close(); await teardown(); }
});

test('GET /api/platform/setting-locks scopes rows to the caller\'s own units; DYC sees all', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const btvUnitId = await unitIdByCode(pool, 'BTV');
    const tcktUnitId = await unitIdByCode(pool, 'TCKT');
    await pool.execute(
      "INSERT INTO setting_locks(setting_key,unit_id,locked_by,reason) VALUES ('weight_presets',?,1,'Khoá BTV')",
      [btvUnitId]
    );
    await pool.execute(
      "INSERT INTO setting_locks(setting_key,unit_id,locked_by,reason) VALUES ('weight_presets',?,1,'Khoá TCKT')",
      [tcktUnitId]
    );

    const btv = await createUser(pool, { units: [['BTV', 'btv_lead']] });
    const dyc = await createUser(pool, { units: [['DYC', 'dyc_engineer']] });

    await client.login(btv.email, btv.password);
    const btvView = await client.request('GET', '/api/platform/setting-locks');
    assert.equal(btvView.status, 200);
    assert.deepEqual(btvView.json.map(r => r.reason).sort(), ['Khoá BTV']);

    await client.login(dyc.email, dyc.password);
    const dycView = await client.request('GET', '/api/platform/setting-locks');
    assert.equal(dycView.status, 200);
    assert.deepEqual(dycView.json.map(r => r.reason).sort(), ['Khoá BTV', 'Khoá TCKT']);
  } finally { await close(); await teardown(); }
});

test('TCKT leader (not unit admin) cannot touch unit settings', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const leader = await createUser(pool, { role: 'leader' });
    await client.login(leader.email, leader.password);
    assert.equal((await client.request('GET', '/api/admin/email/rules')).status, 403);
    assert.equal((await client.request('POST', '/api/admin/weight-presets', { body: { name: 'x', points: 1 } })).status, 403);
  } finally { await close(); await teardown(); }
});
