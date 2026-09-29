'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser, createTeam, createActivity, unitIdByCode } = require('./helpers/fixtures');

test('outsiders (BTV only) get 403 on Điều hành routes', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    // Arrange: Create a user with only BTV membership
    const btvUser = await createUser(pool, { 
      email: 'btv@example.com', 
      role: 'member',
      units: [['BTV', 'btv_member']]  // No TCKT membership
    });

    await client.login(btvUser.email, btvUser.password);

    // Act & Assert: Try to access various Điều hành routes
    const routes = [
      '/api/activities',
      '/api/tasks',
      '/api/teams',
      '/api/users',
      '/api/bootstrap',
      '/api/my-tasks-today',
      '/api/weight-presets'
    ];

    for (const route of routes) {
      const res = await client.request('GET', route);
      assert.strictEqual(res.status, 403, `Route ${route} should return 403`);
      assert.strictEqual(res.json.error, 'Chức năng Điều hành hiện chỉ dành cho Ban TCKT.');
    }
  } finally { await close(); await teardown(); }
});

test('DYC reads private TCKT data with an audit row per request, and cannot write', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    // Arrange: Create DYC user (no TCKT membership)
    const dycUser = await createUser(pool, {
      email: 'dyc@example.com',
      role: 'member',
      units: [['DYC', 'dyc_admin']]
    });

    // Create some TCKT data
    const tcktUser = await createUser(pool, { 
      email: 'tckt@example.com', 
      role: 'leader',
      units: [['TCKT', 'leader']]
    });
    const teamId = await createTeam(pool, { name: 'Ban Test' });
    await createActivity(pool, {
      title: 'Hoạt động TCKT',
      team_id: teamId,
      creator_id: tcktUser.id
    });

    // Clear any existing audit logs
    await pool.execute('DELETE FROM audit_logs');

    await client.login(dycUser.email, dycUser.password);

    // Act: DYC user reads TCKT data
    const getRes = await client.request('GET', '/api/activities');
    assert.strictEqual(getRes.status, 200, 'DYC should be able to read TCKT data');

    // Assert: Audit log should be created
    const [auditLogs] = await pool.execute(
      'SELECT * FROM audit_logs WHERE actor_id=? AND action=\'cross_unit_read\'',
      [dycUser.id]
    );
    assert.strictEqual(auditLogs.length, 1, 'Should have exactly 1 audit log entry');
    assert.strictEqual(auditLogs[0].action, 'cross_unit_read');
    assert.strictEqual(auditLogs[0].target_type, 'http');
    assert.ok(auditLogs[0].target_id.includes('GET /api/activities'));
    
    const tcktId = await unitIdByCode(pool, 'TCKT');
    assert.strictEqual(auditLogs[0].owner_unit_id, tcktId);

    // Act: DYC user tries to write (POST)
    const postRes = await client.request('POST', '/api/activities', {
      body: {
        title: 'Hoạt động mới',
        description: 'Test',
        type: 'event',
        deadline: '2026-12-31',
        team_id: teamId
      }
    });
    assert.strictEqual(postRes.status, 403, 'DYC cannot write to TCKT routes');
    assert.strictEqual(postRes.json.error, 'Chức năng Điều hành hiện chỉ dành cho Ban TCKT.');

    // Assert: No additional audit log for blocked write
    const [auditLogsAfter] = await pool.execute(
      'SELECT * FROM audit_logs WHERE actor_id=?',
      [dycUser.id]
    );
    assert.strictEqual(auditLogsAfter.length, 1, 'Blocked write should not create audit log');
  } finally { await close(); await teardown(); }
});

test('TCKT members are not audited and permission follows the membership, not users.role', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    // Arrange: Create TCKT member
    const tcktMember = await createUser(pool, {
      email: 'tckt.member@example.com',
      role: 'member',
      units: [['TCKT', 'member']]
    });

    await createTeam(pool, { name: 'Ban Test TCKT' });
    await pool.execute('DELETE FROM audit_logs');
    await client.login(tcktMember.email, tcktMember.password);

    // Act: TCKT member accesses routes
    const res = await client.request('GET', '/api/activities');
    assert.strictEqual(res.status, 200, 'TCKT member should access routes');

    // Assert: No audit log created for TCKT member
    const [auditLogs] = await pool.execute(
      'SELECT * FROM audit_logs WHERE actor_id=?',
      [tcktMember.id]
    );
    assert.strictEqual(auditLogs.length, 0, 'TCKT members should not be audited');

    // Act: Try bootstrap (which uses req.actor)
    const bootstrapRes = await client.request('GET', '/api/bootstrap');
    assert.strictEqual(bootstrapRes.status, 200);
    assert.ok(bootstrapRes.json.stats, 'Bootstrap should return stats');
    assert.ok(bootstrapRes.json.capabilities, 'Bootstrap should return capabilities');
  } finally { await close(); await teardown(); }
});

test('a user in both TCKT and DYC writes with the TCKT role and reads without audit', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool, { name: 'Ban Dual Test' });
    const dualUser = await createUser(pool, {
      email: 'dual@example.com',
      role: 'leader',
      team_id: teamId,
      units: [
        ['TCKT', 'leader'],
        ['DYC', 'dyc_admin']
      ]
    });
    await pool.execute('DELETE FROM audit_logs');
    await client.login(dualUser.email, dualUser.password);

    // Act: User reads data
    const getRes = await client.request('GET', '/api/teams');
    assert.strictEqual(getRes.status, 200);
    
    const [readAudit] = await pool.execute(
      'SELECT * FROM audit_logs WHERE actor_id=? AND action=\'cross_unit_read\'',
      [dualUser.id]
    );
    assert.strictEqual(readAudit.length, 0, 'Dual user should not be audited when reading (TCKT takes precedence)');

    // Act: User writes data (creates activity)
    const postRes = await client.request('POST', '/api/activities', {
      body: {
        title: 'Hoạt động từ dual user',
        description: 'Test write',
        type: 'event',
        deadline: '2026-12-31',
        team_id: teamId
      }
    });
    assert.strictEqual(postRes.status, 201, 'Dual user should be able to write with TCKT role');
    
    const [writeAudit] = await pool.execute(
      'SELECT * FROM audit_logs WHERE actor_id=?',
      [dualUser.id]
    );
    assert.strictEqual(writeAudit.length, 0, 'Write operations should not create audit logs');
  } finally { await close(); await teardown(); }
});

test('user without any membership hits auth 403 (unorphaned check preserved)', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    // Arrange: Create user and then remove all memberships
    const orphanUser = await createUser(pool, {
      email: 'orphan@example.com',
      role: 'member',
      units: []  // No memberships at all
    });

    // Explicitly remove all memberships to ensure orphaned state
    await pool.execute('DELETE FROM unit_memberships WHERE user_id=?', [orphanUser.id]);
    await client.login(orphanUser.email, orphanUser.password);

    // Act: Try to access protected route
    const res = await client.request('GET', '/api/bootstrap');

    // Assert: Should get 403 with "chưa thuộc đơn vị nào" message from auth middleware
    assert.strictEqual(res.status, 403, 'Orphaned user should be blocked by auth middleware');
    assert.ok(
      res.json.error.includes('chưa thuộc đơn vị') || res.json.error.includes('Tài khoản chưa thuộc đơn vị nào'),
      'Should show "not member of any unit" error from auth middleware'
    );
  } finally { await close(); await teardown(); }
});
