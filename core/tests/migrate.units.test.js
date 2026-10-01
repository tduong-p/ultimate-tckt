'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { migrateDatabase } = require('../src/config/migrate');
const { BACKFILL_MARKER, DEVOPS_MIGRATE_MARKER } = require('../src/config/migrate-units');

test('migrateMultiUnit tạo tất cả bảng đa đơn vị', async () => {
  const testDb = await createTestDatabase();
  try {
    await migrateDatabase(testDb.pool);
    
    const tables = [
      'platform_migrations', 'org_units', 'unit_memberships', 'unit_modules',
      'unit_visibility_policies', 'setting_locks', 'audit_logs',
      'directives', 'submissions', 'ops_logs', 'ops_log_attendance'
    ];
    
    for (const table of tables) {
      const [rows] = await testDb.pool.query(
        `SELECT COUNT(*) AS c FROM information_schema.TABLES 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [table]
      );
      assert.ok(rows[0].c > 0, `Bảng ${table} phải tồn tại`);
    }
  } finally {
    await testDb.teardown();
  }
});

test('migrateMultiUnit seed tất cả đơn vị từ catalog', async () => {
  const testDb = await createTestDatabase();
  try {
    await migrateDatabase(testDb.pool);
    
    const [units] = await testDb.pool.query('SELECT code, name, kind FROM org_units ORDER BY id');
    
    // Kiểm tra có đủ 7 đơn vị
    assert.equal(units.length, 7, 'Phải có đúng 7 đơn vị');
    
    const codes = units.map(u => u.code);
    assert.ok(codes.includes('DYC'), 'Phải có DYC');
    assert.ok(codes.includes('BTV'), 'Phải có BTV');
    assert.ok(codes.includes('TCKT'), 'Phải có TCKT');
    assert.ok(codes.includes('VPD'), 'Phải có VPD');
    assert.ok(codes.includes('CHIBO'), 'Phải có CHIBO');
  } finally {
    await testDb.teardown();
  }
});

test('migrateMultiUnit thêm unit_id cho teams và activities', async () => {
  const testDb = await createTestDatabase();
  try {
    // Tạo test data trước migration
    const [userResult] = await testDb.pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['Test User', 'test@example.com', 'hash', 'admin']
    );
    const userId = userResult.insertId;
    
    const [teamResult] = await testDb.pool.query(
      'INSERT INTO teams (name, color) VALUES (?, ?)',
      ['Test Team', '#FF0000']
    );
    const teamId = teamResult.insertId;
    
    await testDb.pool.query(
      'INSERT INTO activities (title, description, type, team_id, creator_id, deadline) VALUES (?, ?, ?, ?, ?, CURDATE())',
      ['Test Activity', 'Test', 'event', teamId, userId]
    );
    
    // Chạy migration
    await migrateDatabase(testDb.pool);
    
    // Kiểm tra cột unit_id đã được thêm
    const [teamCols] = await testDb.pool.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'teams' AND COLUMN_NAME = 'unit_id'`
    );
    assert.equal(teamCols.length, 1, 'Cột teams.unit_id phải tồn tại');
    
    const [activityCols] = await testDb.pool.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activities' AND COLUMN_NAME = 'unit_id'`
    );
    assert.equal(activityCols.length, 1, 'Cột activities.unit_id phải tồn tại');
    
    // Kiểm tra dữ liệu cũ được gán về TCKT
    const [tckt] = await testDb.pool.query('SELECT id FROM org_units WHERE code = ?', ['TCKT']);
    const tcktId = tckt[0].id;
    
    const [teams] = await testDb.pool.query('SELECT unit_id FROM teams WHERE id = ?', [teamId]);
    assert.equal(teams[0].unit_id, tcktId, 'team.unit_id phải trỏ tới TCKT');
    
    const [activities] = await testDb.pool.query('SELECT unit_id FROM activities WHERE team_id = ?', [teamId]);
    assert.equal(activities[0].unit_id, tcktId, 'activity.unit_id phải trỏ tới TCKT');
  } finally {
    await testDb.teardown();
  }
});

test('migrateMultiUnit tạo membership TCKT từ users.role', async () => {
  const testDb = await createTestDatabase();
  try {
    // Tạo users với các role khác nhau
    await testDb.pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['Admin User', 'admin@test.com', 'hash', 'admin']
    );
    await testDb.pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['Leader User', 'leader@test.com', 'hash', 'leader']
    );
    await testDb.pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['Member User', 'member@test.com', 'hash', 'member']
    );
    
    // Chạy migration
    await migrateDatabase(testDb.pool);
    
    // Kiểm tra memberships đã được tạo
    const [tckt] = await testDb.pool.query('SELECT id FROM org_units WHERE code = ?', ['TCKT']);
    const tcktId = tckt[0].id;
    
    const [adminMem] = await testDb.pool.query(
      'SELECT role FROM unit_memberships WHERE unit_id = ? AND user_id = (SELECT id FROM users WHERE email = ?)',
      [tcktId, 'admin@test.com']
    );
    assert.equal(adminMem[0].role, 'admin', 'Role admin phải được giữ');
    
    const [leaderMem] = await testDb.pool.query(
      'SELECT role FROM unit_memberships WHERE unit_id = ? AND user_id = (SELECT id FROM users WHERE email = ?)',
      [tcktId, 'leader@test.com']
    );
    assert.equal(leaderMem[0].role, 'leader', 'Role leader phải được giữ');
    
    const [memberMem] = await testDb.pool.query(
      'SELECT role FROM unit_memberships WHERE unit_id = ? AND user_id = (SELECT id FROM users WHERE email = ?)',
      [tcktId, 'member@test.com']
    );
    assert.equal(memberMem[0].role, 'member', 'Role member phải được giữ');
  } finally {
    await testDb.teardown();
  }
});

test('migrateMultiUnit seed module access theo catalog', async () => {
  const testDb = await createTestDatabase();
  try {
    await migrateDatabase(testDb.pool);
    
    // Kiểm tra TCKT có 2 modules
    const [tckt] = await testDb.pool.query('SELECT id FROM org_units WHERE code = ?', ['TCKT']);
    const [tcktModules] = await testDb.pool.query(
      'SELECT module_id FROM unit_modules WHERE unit_id = ? ORDER BY module_id',
      [tckt[0].id]
    );
    assert.equal(tcktModules.length, 2, 'TCKT phải có 2 modules');
    assert.equal(tcktModules[0].module_id, 'ctd');
    assert.equal(tcktModules[1].module_id, 'dieu-hanh');
    
    // Kiểm tra VPD chỉ có ctd
    const [vpd] = await testDb.pool.query('SELECT id FROM org_units WHERE code = ?', ['VPD']);
    const [vpdModules] = await testDb.pool.query(
      'SELECT module_id FROM unit_modules WHERE unit_id = ?',
      [vpd[0].id]
    );
    assert.equal(vpdModules.length, 1, 'VPD chỉ có 1 module');
    assert.equal(vpdModules[0].module_id, 'ctd');
    
    // Kiểm tra DYC không có module
    const [dyc] = await testDb.pool.query('SELECT id FROM org_units WHERE code = ?', ['DYC']);
    const [dycModules] = await testDb.pool.query(
      'SELECT module_id FROM unit_modules WHERE unit_id = ?',
      [dyc[0].id]
    );
    assert.equal(dycModules.length, 0, 'DYC không có module nào');
  } finally {
    await testDb.teardown();
  }
});

test('migrateMultiUnit seed BTV → TCKT visibility policy', async () => {
  const testDb = await createTestDatabase();
  try {
    await migrateDatabase(testDb.pool);
    
    const [btv] = await testDb.pool.query('SELECT id FROM org_units WHERE code = ?', ['BTV']);
    const [tckt] = await testDb.pool.query('SELECT id FROM org_units WHERE code = ?', ['TCKT']);
    
    const [policy] = await testDb.pool.query(
      'SELECT level FROM unit_visibility_policies WHERE viewer_unit_id = ? AND owner_unit_id = ?',
      [btv[0].id, tckt[0].id]
    );
    
    assert.equal(policy.length, 1, 'Policy BTV → TCKT phải tồn tại');
    assert.equal(policy[0].level, 'summary', 'Level mặc định phải là summary');
  } finally {
    await testDb.teardown();
  }
});

test('migrateMultiUnit là idempotent — chạy lại không gây lỗi hoặc trùng lặp', async () => {
  const testDb = await createTestDatabase();
  try {
    // Chạy migration lần đầu
    await migrateDatabase(testDb.pool);
    
    const [units1] = await testDb.pool.query('SELECT COUNT(*) as c FROM org_units');
    const [memberships1] = await testDb.pool.query('SELECT COUNT(*) as c FROM unit_memberships');
    const [modules1] = await testDb.pool.query('SELECT COUNT(*) as c FROM unit_modules');
    const [policies1] = await testDb.pool.query('SELECT COUNT(*) as c FROM unit_visibility_policies');
    
    // Chạy migration lần thứ hai
    await migrateDatabase(testDb.pool);
    
    const [units2] = await testDb.pool.query('SELECT COUNT(*) as c FROM org_units');
    const [memberships2] = await testDb.pool.query('SELECT COUNT(*) as c FROM unit_memberships');
    const [modules2] = await testDb.pool.query('SELECT COUNT(*) as c FROM unit_modules');
    const [policies2] = await testDb.pool.query('SELECT COUNT(*) as c FROM unit_visibility_policies');
    
    // Số lượng phải không thay đổi
    assert.equal(units2[0].c, units1[0].c, 'Số đơn vị không được tăng khi chạy lại');
    assert.equal(memberships2[0].c, memberships1[0].c, 'Số membership không được tăng khi chạy lại');
    assert.equal(modules2[0].c, modules1[0].c, 'Số module access không được tăng khi chạy lại');
    assert.equal(policies2[0].c, policies1[0].c, 'Số visibility policy không được tăng khi chạy lại');
    
    // Kiểm tra marker
    const [marker] = await testDb.pool.query('SELECT name FROM platform_migrations WHERE name = ?', [BACKFILL_MARKER]);
    assert.equal(marker.length, 1, 'Migration marker phải tồn tại đúng 1 lần');
  } finally {
    await testDb.teardown();
  }
});

test('migrateMultiUnit thêm activities.directive_id và foreign key', async () => {
  const testDb = await createTestDatabase();
  try {
    await migrateDatabase(testDb.pool);
    
    // Kiểm tra cột directive_id
    const [cols] = await testDb.pool.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activities' AND COLUMN_NAME = 'directive_id'`
    );
    assert.equal(cols.length, 1, 'Cột activities.directive_id phải tồn tại');
    
    // Kiểm tra foreign key
    const [fks] = await testDb.pool.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activities' 
       AND CONSTRAINT_NAME = 'fk_activities_directive' AND CONSTRAINT_TYPE = 'FOREIGN KEY'`
    );
    assert.equal(fks.length, 1, 'Foreign key fk_activities_directive phải tồn tại');
    
    // Kiểm tra index
    const [indexes] = await testDb.pool.query(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activities' AND INDEX_NAME = 'activities_directive'`
    );
    assert.ok(indexes.length > 0, 'Index activities_directive phải tồn tại');
  } finally {
    await testDb.teardown();
  }
});
