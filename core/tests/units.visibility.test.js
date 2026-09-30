'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser, createTeam, createActivity, unitIdByCode, addMembership } = require('./helpers/fixtures');

test('BTV sees TCKT activities as summary by default', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    // Arrange: Enable Dieu Hanh module for BTV so they can access the routes
    const btvId = await unitIdByCode(pool, 'BTV');
    await pool.execute(
      'INSERT IGNORE INTO unit_modules(unit_id, module_id) VALUES (?, ?)',
      [btvId, 'dieu-hanh']
    );

    // TCKT activity with internal details
    const tcktUser = await createUser(pool, { role: 'admin', units: [['TCKT', 'admin']] });
    const teamId = await createTeam(pool, { name: 'Test Team' });
    const activityId = await createActivity(pool, {
      title: 'TCKT Internal Activity',
      description: 'Secret internal details',
      team_id: teamId,
      creator_id: tcktUser.id,
      priority: 'high'
    });

    // BTV user with no TCKT membership
    const btvUser = await createUser(pool, {
      email: 'btv@example.com',
      role: 'member',
      units: [['BTV', 'btv_lead']]
    });

    await client.login(btvUser.email, btvUser.password);

    // Act: BTV reads activities
    const res = await client.request('GET', '/api/activities');

    // Assert: Should see activity but only summary fields
    assert.strictEqual(res.status, 200);
    const activity = res.json.find(a => a.id === activityId);
    assert.ok(activity, 'BTV should see the activity');
    
    // Should have summary fields
    assert.strictEqual(activity.id, activityId);
    assert.strictEqual(activity.title, 'TCKT Internal Activity');
    assert.strictEqual(activity.status, 'proposed');
    assert.ok(activity.hasOwnProperty('deadline'));
    assert.ok(activity.hasOwnProperty('progress_percent'));
    
    // Should NOT have internal fields
    assert.strictEqual(activity.description, undefined, 'description should be filtered out');
    assert.strictEqual(activity.team_name, undefined, 'team_name should be filtered out');
    assert.strictEqual(activity.task_count, undefined, 'task_count should be filtered out');
  } finally {
    await close();
    await teardown();
  }
});

test('Same unit sees full activity details', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const tcktUser = await createUser(pool, { role: 'admin', units: [['TCKT', 'admin']] });
    const teamId = await createTeam(pool, { name: 'Test Team' });
    const activityId = await createActivity(pool, {
      title: 'TCKT Activity',
      description: 'Internal details',
      team_id: teamId,
      creator_id: tcktUser.id
    });

    await client.login(tcktUser.email, tcktUser.password);

    // Act
    const res = await client.request('GET', '/api/activities');

    // Assert: Should see full details
    assert.strictEqual(res.status, 200);
    const activity = res.json.find(a => a.id === activityId);
    assert.ok(activity);
    assert.strictEqual(activity.title, 'TCKT Activity');
    assert.strictEqual(activity.description, 'Internal details', 'Same unit should see description');
    assert.ok(activity.team_name, 'Same unit should see team_name');
  } finally {
    await close();
    await teardown();
  }
});

test('DYC sees full details of all units', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const tcktUser = await createUser(pool, { role: 'admin', units: [['TCKT', 'admin']] });
    const teamId = await createTeam(pool, { name: 'Test Team' });
    const activityId = await createActivity(pool, {
      title: 'TCKT Activity',
      description: 'Internal details',
      team_id: teamId,
      creator_id: tcktUser.id
    });

    // DYC user
    const dycUser = await createUser(pool, {
      email: 'dyc@example.com',
      role: 'member',
      units: [['DYC', 'dyc_admin']]
    });

    await client.login(dycUser.email, dycUser.password);

    // Act
    const res = await client.request('GET', '/api/activities');

    // Assert: DYC should see full details even though different unit
    assert.strictEqual(res.status, 200);
    const activity = res.json.find(a => a.id === activityId);
    assert.ok(activity);
    assert.strictEqual(activity.description, 'Internal details', 'DYC should see full details');
    assert.ok(activity.team_name, 'DYC should see all fields');
  } finally {
    await close();
    await teardown();
  }
});

test('Visibility policy: tasks_readonly allows seeing tasks but not internal details', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    // Setup: Create BTV -> TCKT policy with tasks_readonly level
    const btvId = await unitIdByCode(pool, 'BTV');
    const tcktId = await unitIdByCode(pool, 'TCKT');
    
    // Enable Dieu Hanh for BTV
    await pool.execute(
      'INSERT IGNORE INTO unit_modules(unit_id, module_id) VALUES (?, ?)',
      [btvId, 'dieu-hanh']
    );
    
    // Delete existing policy first (from migration seed)
    await pool.execute(
      'DELETE FROM unit_visibility_policies WHERE viewer_unit_id = ? AND owner_unit_id = ?',
      [btvId, tcktId]
    );
    
    await pool.execute(
      `INSERT INTO unit_visibility_policies(viewer_unit_id, owner_unit_id, level)
       VALUES (?, ?, 'tasks_readonly')`,
      [btvId, tcktId]
    );

    const tcktUser = await createUser(pool, { role: 'admin', units: [['TCKT', 'admin']] });
    const teamId = await createTeam(pool, { name: 'Test Team' });
    const activityId = await createActivity(pool, {
      title: 'TCKT Activity',
      description: 'Internal details',
      team_id: teamId,
      creator_id: tcktUser.id
    });

    const btvUser = await createUser(pool, {
      email: 'btv@example.com',
      role: 'member',
      units: [['BTV', 'btv_lead']]
    });

    await client.login(btvUser.email, btvUser.password);

    // Act
    const res = await client.request('GET', '/api/activities');

    // Assert: With tasks_readonly, should still see summary only in list view
    // (tasks_readonly mainly affects individual activity detail views)
    assert.strictEqual(res.status, 200);
    const activity = res.json.find(a => a.id === activityId);
    assert.ok(activity);
    assert.strictEqual(activity.title, 'TCKT Activity');
    // List view still uses summary for cross-unit
    assert.strictEqual(activity.description, undefined);
  } finally {
    await close();
    await teardown();
  }
});

test('No visibility policy means no access to other unit resources', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    // Setup: Enable Dieu Hanh for VPD so they can access routes (but won't see TCKT data)
    const vpdId = await unitIdByCode(pool, 'VPD');
    await pool.execute(
      'INSERT IGNORE INTO unit_modules(unit_id, module_id) VALUES (?, ?)',
      [vpdId, 'dieu-hanh']
    );
    
    // VP Doan user (no policy to TCKT)
    const vpdUser = await createUser(pool, {
      email: 'vpd@example.com',
      role: 'member',
      units: [['VPD', 'officer']]
    });

    const tcktUser = await createUser(pool, { role: 'admin', units: [['TCKT', 'admin']] });
    const teamId = await createTeam(pool, { name: 'Test Team' });
    await createActivity(pool, {
      title: 'TCKT Activity',
      team_id: teamId,
      creator_id: tcktUser.id
    });

    await client.login(vpdUser.email, vpdUser.password);

    // Act
    const res = await client.request('GET', '/api/activities');

    // Assert: Should not see TCKT activities at all
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.length, 0, 'VP Doan should not see TCKT activities without policy');
  } finally {
    await close();
    await teardown();
  }
});

test('scopeFor returns correct SQL for cross-unit with policy', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    // Setup policy
    const btvId = await unitIdByCode(pool, 'BTV');
    const tcktId = await unitIdByCode(pool, 'TCKT');
    
    // Enable Dieu Hanh for BTV
    await pool.execute(
      'INSERT IGNORE INTO unit_modules(unit_id, module_id) VALUES (?, ?)',
      [btvId, 'dieu-hanh']
    );
    
    // Delete existing policy first (from migration seed)
    await pool.execute(
      'DELETE FROM unit_visibility_policies WHERE viewer_unit_id = ? AND owner_unit_id = ?',
      [btvId, tcktId]
    );
    
    await pool.execute(
      `INSERT INTO unit_visibility_policies(viewer_unit_id, owner_unit_id, level)
       VALUES (?, ?, 'full_readonly')`,
      [btvId, tcktId]
    );

    const btvUser = await createUser(pool, {
      email: 'btv@example.com',
      role: 'member',
      units: [['BTV', 'btv_lead']]
    });

    // Create activities in both units
    const tcktUser = await createUser(pool, { role: 'admin', units: [['TCKT', 'admin']] });
    const tcktTeamId = await createTeam(pool, { name: 'TCKT Team' });
    await createActivity(pool, {
      title: 'TCKT Activity',
      team_id: tcktTeamId,
      creator_id: tcktUser.id
    });

    // BTV also has Dieu Hanh module, so can create activities
    await pool.execute('INSERT IGNORE INTO unit_modules(unit_id, module_id) VALUES (?, ?)', [btvId, 'dieu-hanh']);
    const btvTeamId = await createTeam(pool, { name: 'BTV Team' });
    await pool.execute('UPDATE teams SET unit_id = ? WHERE id = ?', [btvId, btvTeamId]);
    await createActivity(pool, {
      title: 'BTV Activity',
      team_id: btvTeamId,
      creator_id: btvUser.id
    });

    await client.login(btvUser.email, btvUser.password);

    // Act: Get activities
    const res = await client.request('GET', '/api/activities');

    // Assert: Should see both BTV's own and TCKT's (due to policy)
    assert.strictEqual(res.status, 200);
    assert.ok(res.json.length >= 2, 'Should see activities from multiple units');
    
    const tcktActivity = res.json.find(a => a.title === 'TCKT Activity');
    const btvActivity = res.json.find(a => a.title === 'BTV Activity');
    
    assert.ok(tcktActivity, 'Should see TCKT activity due to policy');
    assert.ok(btvActivity, 'Should see own BTV activity');
  } finally {
    await close();
    await teardown();
  }
});

test('Archive route respects summary view for cross-unit', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    // Enable Dieu Hanh for BTV
    const btvId = await unitIdByCode(pool, 'BTV');
    await pool.execute(
      'INSERT IGNORE INTO unit_modules(unit_id, module_id) VALUES (?, ?)',
      [btvId, 'dieu-hanh']
    );
    
    const tcktUser = await createUser(pool, { role: 'admin', units: [['TCKT', 'admin']] });
    const teamId = await createTeam(pool, { name: 'Test Team' });
    const activityId = await createActivity(pool, {
      title: 'Completed Activity',
      description: 'Internal details',
      team_id: teamId,
      creator_id: tcktUser.id,
      status: 'completed'
    });

    const btvUser = await createUser(pool, {
      email: 'btv@example.com',
      role: 'member',
      units: [['BTV', 'btv_lead']]
    });

    await client.login(btvUser.email, btvUser.password);

    // Act: Get archive
    const res = await client.request('GET', '/api/archive');

    // Assert: Should see activity as summary only
    assert.strictEqual(res.status, 200);
    const activity = res.json.find(a => a.id === activityId);
    assert.ok(activity, 'Should see completed activity in archive');
    assert.strictEqual(activity.title, 'Completed Activity');
    assert.strictEqual(activity.description, undefined, 'Archive should filter description for cross-unit');
  } finally {
    await close();
    await teardown();
  }
});

test('Teams route respects unit scope', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    // Create teams for different units
    const tcktTeamId = await createTeam(pool, { name: 'TCKT Team' });
    
    const btvId = await unitIdByCode(pool, 'BTV');
    const tcktId = await unitIdByCode(pool, 'TCKT');
    
    // Remove the default BTV → TCKT policy seeded by migration
    await pool.execute(
      'DELETE FROM unit_visibility_policies WHERE viewer_unit_id = ? AND owner_unit_id = ?',
      [btvId, tcktId]
    );
    
    await pool.execute('INSERT IGNORE INTO unit_modules(unit_id, module_id) VALUES (?, ?)', [btvId, 'dieu-hanh']);
    const btvTeamId = await createTeam(pool, { name: 'BTV Team' });
    await pool.execute('UPDATE teams SET unit_id = ? WHERE id = ?', [btvId, btvTeamId]);

    // BTV user
    const btvUser = await createUser(pool, {
      email: 'btv@example.com',
      role: 'member',
      units: [['BTV', 'btv_lead']]
    });

    await client.login(btvUser.email, btvUser.password);

    // Act: Get teams
    const res = await client.request('GET', '/api/teams');

    // Assert: Should only see BTV teams, not TCKT
    assert.strictEqual(res.status, 200);
    const tcktTeam = res.json.find(t => t.id === tcktTeamId);
    const btvTeam = res.json.find(t => t.id === btvTeamId);
    
    assert.strictEqual(tcktTeam, undefined, 'Should not see TCKT teams without policy');
    assert.ok(btvTeam, 'Should see own BTV teams');
  } finally {
    await close();
    await teardown();
  }
});
