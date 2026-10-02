'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser, createTeam } = require('./helpers/fixtures');

test('GET /api/units - DYC sees all active units', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const dycUser = await createUser(pool, { role: 'admin', email: 'dyc@example.com' });
    const [[dycUnit]] = await pool.query("SELECT id FROM org_units WHERE code='DYC'");
    await pool.execute('INSERT INTO unit_memberships(user_id, unit_id, role) VALUES (?, ?, ?)', [dycUser.id, dycUnit.id, 'dyc_admin']);
    
    await client.login(dycUser.email, dycUser.password);
    const res = await client.request('GET', '/api/units');
    
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json));
    assert.ok(res.json.length >= 5); // At least DYC, BTV, TCKT, VPD, CHIBO
    
    const codes = res.json.map(u => u.code);
    assert.ok(codes.includes('DYC'));
    assert.ok(codes.includes('TCKT'));
    assert.ok(codes.includes('BTV'));
  } finally {
    await close();
    await teardown();
  }
});

test('GET /api/units - regular user only sees their units', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const tcktUser = await createUser(pool, { role: 'member', team_id: teamId });
    
    await client.login(tcktUser.email, tcktUser.password);
    const res = await client.request('GET', '/api/units');
    
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json));
    
    // User chỉ có TCKT membership
    assert.equal(res.json.length, 1);
    assert.equal(res.json[0].code, 'TCKT');
  } finally {
    await close();
    await teardown();
  }
});

test('GET /api/units/:id/members - returns members list', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const admin = await createUser(pool, { role: 'admin', team_id: teamId });
    const member = await createUser(pool, { role: 'member', team_id: teamId });
    
    const [[tcktUnit]] = await pool.query("SELECT id FROM org_units WHERE code='TCKT'");
    
    await client.login(admin.email, admin.password);
    const res = await client.request('GET', `/api/units/${tcktUnit.id}/members`);
    
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json));
    assert.ok(res.json.length >= 2);
    
    const userIds = res.json.map(m => m.user_id);
    assert.ok(userIds.includes(admin.id));
    assert.ok(userIds.includes(member.id));
    
    // Check structure
    const adminMember = res.json.find(m => m.user_id === admin.id);
    assert.ok(adminMember.name);
    assert.ok(adminMember.email);
    assert.equal(adminMember.role, 'admin');
  } finally {
    await close();
    await teardown();
  }
});

test('PUT /api/units/:id/members/:userId - dyc_admin can manage DYC members', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const dycAdmin = await createUser(pool, { role: 'admin', email: 'dyc1@example.com' });
    const targetUser = await createUser(pool, { role: 'member', email: 'target@example.com' });
    
    const [[dycUnit]] = await pool.query("SELECT id FROM org_units WHERE code='DYC'");
    await pool.execute('INSERT INTO unit_memberships(user_id, unit_id, role) VALUES (?, ?, ?)', [dycAdmin.id, dycUnit.id, 'dyc_admin']);
    
    await client.login(dycAdmin.email, dycAdmin.password);
    const res = await client.request('PUT', `/api/units/${dycUnit.id}/members/${targetUser.id}`, {
      body: { role: 'dyc_engineer' }
    });
    
    assert.equal(res.status, 200);
    assert.equal(res.json.ok, true);
    
    // Verify membership created
    const [[membership]] = await pool.query(
      'SELECT role FROM unit_memberships WHERE user_id = ? AND unit_id = ?',
      [targetUser.id, dycUnit.id]
    );
    assert.equal(membership.role, 'dyc_engineer');
    
    // Verify audit log
    const [[audit]] = await pool.query(
      "SELECT action, target_id FROM audit_logs WHERE action = 'membership.upsert' AND target_id = ? ORDER BY created_at DESC LIMIT 1",
      [String(targetUser.id)]
    );
    assert.ok(audit);
  } finally {
    await close();
    await teardown();
  }
});

test('PUT /api/units/:id/members/:userId - dyc_engineer CANNOT manage DYC members', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const dycEngineer = await createUser(pool, { role: 'admin', email: 'engineer@example.com' });
    const targetUser = await createUser(pool, { role: 'member', email: 'target2@example.com' });
    
    const [[dycUnit]] = await pool.query("SELECT id FROM org_units WHERE code='DYC'");
    await pool.execute('INSERT INTO unit_memberships(user_id, unit_id, role) VALUES (?, ?, ?)', [dycEngineer.id, dycUnit.id, 'dyc_engineer']);
    
    await client.login(dycEngineer.email, dycEngineer.password);
    const res = await client.request('PUT', `/api/units/${dycUnit.id}/members/${targetUser.id}`, {
      body: { role: 'dyc_admin' }
    });
    
    assert.equal(res.status, 403);
    assert.match(res.json.error, /không có quyền/i);
  } finally {
    await close();
    await teardown();
  }
});

test('PUT /api/units/:id/members/:userId - dyc_engineer CAN manage other units', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const dycEngineer = await createUser(pool, { role: 'admin', email: 'engineer2@example.com' });
    const targetUser = await createUser(pool, { role: 'member', email: 'target3@example.com' });
    
    const [[dycUnit]] = await pool.query("SELECT id FROM org_units WHERE code='DYC'");
    const [[tcktUnit]] = await pool.query("SELECT id FROM org_units WHERE code='TCKT'");
    await pool.execute('INSERT INTO unit_memberships(user_id, unit_id, role) VALUES (?, ?, ?)', [dycEngineer.id, dycUnit.id, 'dyc_engineer']);
    
    await client.login(dycEngineer.email, dycEngineer.password);
    const res = await client.request('PUT', `/api/units/${tcktUnit.id}/members/${targetUser.id}`, {
      body: { role: 'admin' }
    });
    
    assert.equal(res.status, 200);
  } finally {
    await close();
    await teardown();
  }
});

test('PUT /api/units/:id/members/:userId - TCKT admin can manage TCKT', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const tcktAdmin = await createUser(pool, { role: 'admin', team_id: teamId });
    const targetUser = await createUser(pool, { role: 'member', email: 'target4@example.com' });
    
    const [[tcktUnit]] = await pool.query("SELECT id FROM org_units WHERE code='TCKT'");
    
    await client.login(tcktAdmin.email, tcktAdmin.password);
    const res = await client.request('PUT', `/api/units/${tcktUnit.id}/members/${targetUser.id}`, {
      body: { role: 'leader' }
    });
    
    assert.equal(res.status, 200);
    
    // Verify users.role synced for TCKT
    const [[user]] = await pool.query('SELECT role FROM users WHERE id = ?', [targetUser.id]);
    assert.equal(user.role, 'leader');
  } finally {
    await close();
    await teardown();
  }
});

test('PUT /api/units/:id/members/:userId - TCKT admin CANNOT manage other units', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const tcktAdmin = await createUser(pool, { role: 'admin', team_id: teamId });
    const targetUser = await createUser(pool, { role: 'member', email: 'target5@example.com' });
    
    const [[btvUnit]] = await pool.query("SELECT id FROM org_units WHERE code='BTV'");
    
    await client.login(tcktAdmin.email, tcktAdmin.password);
    const res = await client.request('PUT', `/api/units/${btvUnit.id}/members/${targetUser.id}`, {
      body: { role: 'btv_lead' }
    });
    
    assert.equal(res.status, 403);
  } finally {
    await close();
    await teardown();
  }
});

test('PUT /api/units/:id/members/:userId - validates role for unit kind', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const tcktAdmin = await createUser(pool, { role: 'admin', team_id: teamId });
    const targetUser = await createUser(pool, { role: 'member', email: 'target6@example.com' });
    
    const [[tcktUnit]] = await pool.query("SELECT id FROM org_units WHERE code='TCKT'");
    
    await client.login(tcktAdmin.email, tcktAdmin.password);
    
    // Try to assign invalid role for department
    const res = await client.request('PUT', `/api/units/${tcktUnit.id}/members/${targetUser.id}`, {
      body: { role: 'btv_lead' } // Wrong kind!
    });
    
    assert.equal(res.status, 400);
    assert.match(res.json.error, /không hợp lệ/i);
  } finally {
    await close();
    await teardown();
  }
});

test('PUT /api/units/:id/members/:userId - validates user exists and is active', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const tcktAdmin = await createUser(pool, { role: 'admin', team_id: teamId });
    
    const [[tcktUnit]] = await pool.query("SELECT id FROM org_units WHERE code='TCKT'");
    
    await client.login(tcktAdmin.email, tcktAdmin.password);
    
    // Non-existent user
    const res1 = await client.request('PUT', `/api/units/${tcktUnit.id}/members/99999`, {
      body: { role: 'member' }
    });
    assert.equal(res1.status, 404);
    
    // Inactive user
    const inactiveUser = await createUser(pool, { role: 'member', email: 'inactive@example.com' });
    await pool.execute('UPDATE users SET is_active = 0 WHERE id = ?', [inactiveUser.id]);
    
    const res2 = await client.request('PUT', `/api/units/${tcktUnit.id}/members/${inactiveUser.id}`, {
      body: { role: 'member' }
    });
    assert.equal(res2.status, 400);
    assert.match(res2.json.error, /vô hiệu/i);
  } finally {
    await close();
    await teardown();
  }
});

test('DELETE /api/units/:id/members/:userId - removes membership', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const tcktAdmin = await createUser(pool, { role: 'admin', team_id: teamId });
    const targetUser = await createUser(pool, { role: 'member', team_id: teamId, email: 'target7@example.com' });
    
    const [[tcktUnit]] = await pool.query("SELECT id FROM org_units WHERE code='TCKT'");
    
    await client.login(tcktAdmin.email, tcktAdmin.password);
    const res = await client.request('DELETE', `/api/units/${tcktUnit.id}/members/${targetUser.id}`);
    
    assert.equal(res.status, 200);
    assert.equal(res.json.ok, true);
    
    // Verify membership removed
    const [[membership]] = await pool.query(
      'SELECT id FROM unit_memberships WHERE user_id = ? AND unit_id = ?',
      [targetUser.id, tcktUnit.id]
    );
    assert.equal(membership, undefined);
    
    // Verify users.role fallback to 'member' (legacy)
    const [[user]] = await pool.query('SELECT role FROM users WHERE id = ?', [targetUser.id]);
    assert.equal(user.role, 'member');
    
    // Verify audit log
    const [[audit]] = await pool.query(
      "SELECT action FROM audit_logs WHERE action = 'membership.remove' AND target_id = ? ORDER BY created_at DESC LIMIT 1",
      [String(targetUser.id)]
    );
    assert.ok(audit);
  } finally {
    await close();
    await teardown();
  }
});

test('DELETE /api/units/:id/members/:userId - prevents removing last dyc_admin', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const lastAdmin = await createUser(pool, { role: 'admin', email: 'lastadmin@example.com' });
    
    const [[dycUnit]] = await pool.query("SELECT id FROM org_units WHERE code='DYC'");
    await pool.execute('INSERT INTO unit_memberships(user_id, unit_id, role) VALUES (?, ?, ?)', [lastAdmin.id, dycUnit.id, 'dyc_admin']);
    
    await client.login(lastAdmin.email, lastAdmin.password);
    const res = await client.request('DELETE', `/api/units/${dycUnit.id}/members/${lastAdmin.id}`);
    
    assert.equal(res.status, 409);
    assert.match(res.json.error, /cuối cùng/i);
    
    // Verify membership still exists
    const [[membership]] = await pool.query(
      'SELECT id FROM unit_memberships WHERE user_id = ? AND unit_id = ?',
      [lastAdmin.id, dycUnit.id]
    );
    assert.ok(membership);
  } finally {
    await close();
    await teardown();
  }
});

test('DELETE /api/units/:id/members/:userId - allows removing non-last dyc_admin', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const admin1 = await createUser(pool, { role: 'admin', email: 'admin1@example.com' });
    const admin2 = await createUser(pool, { role: 'admin', email: 'admin2@example.com' });
    
    const [[dycUnit]] = await pool.query("SELECT id FROM org_units WHERE code='DYC'");
    await pool.execute('INSERT INTO unit_memberships(user_id, unit_id, role) VALUES (?, ?, ?)', [admin1.id, dycUnit.id, 'dyc_admin']);
    await pool.execute('INSERT INTO unit_memberships(user_id, unit_id, role) VALUES (?, ?, ?)', [admin2.id, dycUnit.id, 'dyc_admin']);
    
    await client.login(admin1.email, admin1.password);
    const res = await client.request('DELETE', `/api/units/${dycUnit.id}/members/${admin2.id}`);
    
    assert.equal(res.status, 200);
  } finally {
    await close();
    await teardown();
  }
});

test('Unit routes require authentication', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const res1 = await client.request('GET', '/api/units');
    assert.equal(res1.status, 401);
    
    const [[tcktUnit]] = await pool.query("SELECT id FROM org_units WHERE code='TCKT'");
    const res2 = await client.request('GET', `/api/units/${tcktUnit.id}/members`);
    assert.equal(res2.status, 401);
  } finally {
    await close();
    await teardown();
  }
});

test('GET /api/units/:id/members - permission check', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const tcktMember = await createUser(pool, { role: 'member', team_id: teamId });
    
    const [[btvUnit]] = await pool.query("SELECT id FROM org_units WHERE code='BTV'");
    
    // TCKT member cannot view BTV members
    await client.login(tcktMember.email, tcktMember.password);
    const res = await client.request('GET', `/api/units/${btvUnit.id}/members`);
    
    assert.equal(res.status, 403);
  } finally {
    await close();
    await teardown();
  }
});
