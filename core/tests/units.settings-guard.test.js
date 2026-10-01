'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser, createTeam } = require('./helpers/fixtures');

test('DYC can modify both platform and unit settings', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const dycUser = await createUser(pool, { role: 'admin', email: 'dyc@example.com' });
    // Bootstrap DYC membership
    const [[dycUnit]] = await pool.query("SELECT id FROM org_units WHERE code='DYC'");
    await pool.execute('INSERT INTO unit_memberships(user_id, unit_id, role) VALUES (?, ?, ?)', [dycUser.id, dycUnit.id, 'dyc_admin']);
    
    await client.login(dycUser.email, dycUser.password);
    
    // Can create weight preset (unit-level setting)
    const createRes = await client.request('POST', '/api/admin/weight-presets', {
      body: { name: 'Test preset', points: 7 }
    });
    assert.equal(createRes.status, 201);
    
    const presetId = createRes.json.id;
    
    // Can update weight preset
    const updateRes = await client.request('PATCH', `/api/admin/weight-presets/${presetId}`, {
      body: { name: 'Updated preset', points: 8 }
    });
    assert.equal(updateRes.status, 200);
    
    // Can delete weight preset
    const deleteRes = await client.request('DELETE', `/api/admin/weight-presets/${presetId}`);
    assert.equal(deleteRes.status, 200);
  } finally {
    await close();
    await teardown();
  }
});

test('TCKT admin can modify unit-level settings', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const tcktAdmin = await createUser(pool, { role: 'admin', team_id: teamId });
    await client.login(tcktAdmin.email, tcktAdmin.password);
    
    // Can create weight preset
    const createRes = await client.request('POST', '/api/admin/weight-presets', {
      body: { name: 'TCKT preset', points: 6 }
    });
    assert.equal(createRes.status, 201);
    
    const presetId = createRes.json.id;
    
    // Can update
    const updateRes = await client.request('PATCH', `/api/admin/weight-presets/${presetId}`, {
      body: { points: 7 }
    });
    assert.equal(updateRes.status, 200);
    
    // Can delete
    const deleteRes = await client.request('DELETE', `/api/admin/weight-presets/${presetId}`);
    assert.equal(deleteRes.status, 200);
  } finally {
    await close();
    await teardown();
  }
});

test('TCKT vice_admin can modify unit-level settings', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const viceAdmin = await createUser(pool, { role: 'vice_admin', team_id: teamId });
    await client.login(viceAdmin.email, viceAdmin.password);
    
    const createRes = await client.request('POST', '/api/admin/weight-presets', {
      body: { name: 'Vice admin preset', points: 5 }
    });
    assert.equal(createRes.status, 201);
  } finally {
    await close();
    await teardown();
  }
});

test('TCKT leader cannot modify unit-level settings (not admin)', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const leader = await createUser(pool, { role: 'leader', team_id: teamId });
    await client.login(leader.email, leader.password);
    
    const createRes = await client.request('POST', '/api/admin/weight-presets', {
      body: { name: 'Should fail', points: 5 }
    });
    assert.equal(createRes.status, 403);
    assert.match(createRes.json.error, /không có quyền/i);
  } finally {
    await close();
    await teardown();
  }
});

test('TCKT member cannot modify unit-level settings', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const member = await createUser(pool, { role: 'member', team_id: teamId });
    await client.login(member.email, member.password);
    
    const createRes = await client.request('POST', '/api/admin/weight-presets', {
      body: { name: 'Should fail', points: 5 }
    });
    assert.equal(createRes.status, 403);
    assert.match(createRes.json.error, /không có quyền/i);
  } finally {
    await close();
    await teardown();
  }
});

test('Lock prevents TCKT admin from modifying, but not DYC', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const tcktAdmin = await createUser(pool, { role: 'admin', team_id: teamId });
    const dycUser = await createUser(pool, { role: 'admin', email: 'dyc2@example.com' });
    
    // Setup DYC membership
    const [[dycUnit]] = await pool.query("SELECT id FROM org_units WHERE code='DYC'");
    await pool.execute('INSERT INTO unit_memberships(user_id, unit_id, role) VALUES (?, ?, ?)', [dycUser.id, dycUnit.id, 'dyc_admin']);
    
    // DYC creates a lock
    await client.login(dycUser.email, dycUser.password);
    const lockRes = await client.request('POST', '/api/platform/setting-locks', {
      body: { 
        setting_key: 'weight_presets', 
        unit_id: null, 
        reason: 'Đang kiểm tra hệ thống' 
      }
    });
    assert.equal(lockRes.status, 201);
    const lockId = lockRes.json.id;
    
    // TCKT admin cannot modify when locked
    await client.login(tcktAdmin.email, tcktAdmin.password);
    const blockedRes = await client.request('POST', '/api/admin/weight-presets', {
      body: { name: 'Blocked', points: 5 }
    });
    assert.equal(blockedRes.status, 403);
    assert.equal(blockedRes.json.locked, true);
    assert.match(blockedRes.json.error, /DYC khoá/i);
    assert.ok(blockedRes.json.reason);
    assert.ok(blockedRes.json.locked_by_name);
    
    // DYC can still modify despite lock
    await client.login(dycUser.email, dycUser.password);
    const dycCreateRes = await client.request('POST', '/api/admin/weight-presets', {
      body: { name: 'DYC bypass lock', points: 9 }
    });
    assert.equal(dycCreateRes.status, 201);
    
    // DYC removes lock
    const unlockRes = await client.request('DELETE', `/api/platform/setting-locks/${lockId}`);
    assert.equal(unlockRes.status, 200);
    
    // TCKT admin can now modify
    await client.login(tcktAdmin.email, tcktAdmin.password);
    const nowOkRes = await client.request('POST', '/api/admin/weight-presets', {
      body: { name: 'Now OK', points: 4 }
    });
    assert.equal(nowOkRes.status, 201);
  } finally {
    await close();
    await teardown();
  }
});

test('GET /api/platform/setting-locks returns all locks (auth only)', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const dycUser = await createUser(pool, { role: 'admin', email: 'dyc3@example.com' });
    const [[dycUnit]] = await pool.query("SELECT id FROM org_units WHERE code='DYC'");
    await pool.execute('INSERT INTO unit_memberships(user_id, unit_id, role) VALUES (?, ?, ?)', [dycUser.id, dycUnit.id, 'dyc_admin']);
    
    await client.login(dycUser.email, dycUser.password);
    
    // Create a lock
    await client.request('POST', '/api/platform/setting-locks', {
      body: { setting_key: 'weight_presets', unit_id: null, reason: 'Test lock' }
    });
    
    // Get locks
    const listRes = await client.request('GET', '/api/platform/setting-locks');
    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(listRes.json));
    assert.ok(listRes.json.length >= 1);
    
    const lock = listRes.json.find(l => l.setting_key === 'weight_presets');
    assert.ok(lock);
    assert.equal(lock.reason, 'Test lock');
    assert.ok(lock.locked_by);
    assert.ok(lock.created_at);
  } finally {
    await close();
    await teardown();
  }
});

test('Cannot lock platform-level settings', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const dycUser = await createUser(pool, { role: 'admin', email: 'dyc4@example.com' });
    const [[dycUnit]] = await pool.query("SELECT id FROM org_units WHERE code='DYC'");
    await pool.execute('INSERT INTO unit_memberships(user_id, unit_id, role) VALUES (?, ?, ?)', [dycUser.id, dycUnit.id, 'dyc_admin']);
    
    await client.login(dycUser.email, dycUser.password);
    
    // Try to lock platform setting
    const lockRes = await client.request('POST', '/api/platform/setting-locks', {
      body: { setting_key: 'email.smtp', unit_id: null, reason: 'Should fail' }
    });
    assert.equal(lockRes.status, 400);
    assert.match(lockRes.json.error, /unit-level/i);
  } finally {
    await close();
    await teardown();
  }
});

test('Cannot lock with invalid setting_key', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const dycUser = await createUser(pool, { role: 'admin', email: 'dyc5@example.com' });
    const [[dycUnit]] = await pool.query("SELECT id FROM org_units WHERE code='DYC'");
    await pool.execute('INSERT INTO unit_memberships(user_id, unit_id, role) VALUES (?, ?, ?)', [dycUser.id, dycUnit.id, 'dyc_admin']);
    
    await client.login(dycUser.email, dycUser.password);
    
    const lockRes = await client.request('POST', '/api/platform/setting-locks', {
      body: { setting_key: 'invalid.key', unit_id: null, reason: 'Test' }
    });
    assert.equal(lockRes.status, 400);
    assert.match(lockRes.json.error, /không tồn tại/i);
  } finally {
    await close();
    await teardown();
  }
});

test('Cannot lock without reason', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const dycUser = await createUser(pool, { role: 'admin', email: 'dyc6@example.com' });
    const [[dycUnit]] = await pool.query("SELECT id FROM org_units WHERE code='DYC'");
    await pool.execute('INSERT INTO unit_memberships(user_id, unit_id, role) VALUES (?, ?, ?)', [dycUser.id, dycUnit.id, 'dyc_admin']);
    
    await client.login(dycUser.email, dycUser.password);
    
    const lockRes = await client.request('POST', '/api/platform/setting-locks', {
      body: { setting_key: 'weight_presets', unit_id: null, reason: '' }
    });
    assert.equal(lockRes.status, 400);
    assert.match(lockRes.json.error, /reason/i);
  } finally {
    await close();
    await teardown();
  }
});

test('DELETE non-existent lock returns 404', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const dycUser = await createUser(pool, { role: 'admin', email: 'dyc7@example.com' });
    const [[dycUnit]] = await pool.query("SELECT id FROM org_units WHERE code='DYC'");
    await pool.execute('INSERT INTO unit_memberships(user_id, unit_id, role) VALUES (?, ?, ?)', [dycUser.id, dycUnit.id, 'dyc_admin']);
    
    await client.login(dycUser.email, dycUser.password);
    
    const deleteRes = await client.request('DELETE', '/api/platform/setting-locks/99999');
    assert.equal(deleteRes.status, 404);
  } finally {
    await close();
    await teardown();
  }
});

test('Only platformAdmin can create/delete locks', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const tcktAdmin = await createUser(pool, { role: 'admin', team_id: teamId });
    await client.login(tcktAdmin.email, tcktAdmin.password);
    
    // TCKT admin cannot create lock
    const lockRes = await client.request('POST', '/api/platform/setting-locks', {
      body: { setting_key: 'weight_presets', unit_id: null, reason: 'Should fail' }
    });
    assert.equal(lockRes.status, 403);
    assert.match(lockRes.json.error, /DYC/i);
  } finally {
    await close();
    await teardown();
  }
});

test('Lock with specific unit_id only blocks that unit', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const tcktAdmin = await createUser(pool, { role: 'admin', team_id: teamId });
    const dycUser = await createUser(pool, { role: 'admin', email: 'dyc8@example.com' });
    
    const [[dycUnit]] = await pool.query("SELECT id FROM org_units WHERE code='DYC'");
    const [[tcktUnit]] = await pool.query("SELECT id FROM org_units WHERE code='TCKT'");
    await pool.execute('INSERT INTO unit_memberships(user_id, unit_id, role) VALUES (?, ?, ?)', [dycUser.id, dycUnit.id, 'dyc_admin']);
    
    // DYC locks only TCKT's weight_presets
    await client.login(dycUser.email, dycUser.password);
    await client.request('POST', '/api/platform/setting-locks', {
      body: { 
        setting_key: 'weight_presets', 
        unit_id: tcktUnit.id, 
        reason: 'Kiểm tra TCKT' 
      }
    });
    
    // TCKT admin is blocked
    await client.login(tcktAdmin.email, tcktAdmin.password);
    const blockedRes = await client.request('POST', '/api/admin/weight-presets', {
      body: { name: 'Blocked', points: 5 }
    });
    assert.equal(blockedRes.status, 403);
    assert.equal(blockedRes.json.locked, true);
  } finally {
    await close();
    await teardown();
  }
});
