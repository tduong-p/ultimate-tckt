'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { migrateDatabase } = require('../src/config/migrate');
const { DEVOPS_MIGRATE_MARKER } = require('../src/config/migrate-units');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Helper function
const count = async (pool, sql, params = []) => {
  const [rows] = await pool.query(sql, params);
  return rows[0].c;
};

test('migration handles database with complex TCKT data', async () => {
  const testDb = await createTestDatabase();
  try {
    const db = testDb.pool;
    
    // Tạo cấu trúc dữ liệu TCKT phức tạp
    const [admin] = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['TCKT Admin', 'admin@tckt.test', 'hash', 'admin']
    );
    const adminId = admin.insertId;
    
    const [viceAdmin] = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['TCKT Vice Admin', 'vice@tckt.test', 'hash', 'vice_admin']
    );
    const viceAdminId = viceAdmin.insertId;
    
    const [leader] = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['Team Leader', 'leader@tckt.test', 'hash', 'leader']
    );
    const leaderId = leader.insertId;
    
    // Tạo nhiều teams
    const [team1] = await db.query('INSERT INTO teams (name, color) VALUES (?, ?)', ['Ban 1', '#FF0000']);
    const [team2] = await db.query('INSERT INTO teams (name, color) VALUES (?, ?)', ['Ban 2', '#00FF00']);
    const [team3] = await db.query('INSERT INTO teams (name, color) VALUES (?, ?)', ['Ban 3', '#0000FF']);
    
    // Tạo nhiều activities
    await db.query(
      'INSERT INTO activities (title, description, type, team_id, creator_id, status, deadline) VALUES (?, ?, ?, ?, ?, ?, CURDATE())',
      ['Activity 1', 'Test', 'event', team1.insertId, adminId, 'approved']
    );
    await db.query(
      'INSERT INTO activities (title, description, type, team_id, creator_id, status, deadline) VALUES (?, ?, ?, ?, ?, ?, CURDATE())',
      ['Activity 2', 'Test', 'assigned', team2.insertId, leaderId, 'active']
    );
    await db.query(
      'INSERT INTO activities (title, description, type, team_id, creator_id, status, deadline) VALUES (?, ?, ?, ?, ?, ?, CURDATE())',
      ['Activity 3', 'Test', 'event', team3.insertId, viceAdminId, 'completed']
    );
    
    // Chạy migration
    await migrateDatabase(db);
    
    // Kiểm tra tất cả được backfill đúng
    const [tckt] = await db.query('SELECT id FROM org_units WHERE code = ?', ['TCKT']);
    const tcktId = tckt[0].id;
    
    // Kiểm tra teams
    const teamCount = await count(db, 'SELECT COUNT(*) c FROM teams WHERE unit_id = ?', [tcktId]);
    assert.equal(teamCount, 3, 'Tất cả 3 teams phải được gán về TCKT');
    
    // Kiểm tra activities
    const activityCount = await count(db, 'SELECT COUNT(*) c FROM activities WHERE unit_id = ?', [tcktId]);
    assert.equal(activityCount, 3, 'Tất cả 3 activities phải được gán về TCKT');
    
    // Kiểm tra memberships
    const membershipCount = await count(db, 'SELECT COUNT(*) c FROM unit_memberships WHERE unit_id = ?', [tcktId]);
    assert.equal(membershipCount, 3, 'Tất cả 3 users phải có membership TCKT');
    
    // Kiểm tra role được giữ nguyên
    const [adminRole] = await db.query(
      'SELECT role FROM unit_memberships WHERE user_id = ? AND unit_id = ?',
      [adminId, tcktId]
    );
    assert.equal(adminRole[0].role, 'admin');
    
    const [viceAdminRole] = await db.query(
      'SELECT role FROM unit_memberships WHERE user_id = ? AND unit_id = ?',
      [viceAdminId, tcktId]
    );
    assert.equal(viceAdminRole[0].role, 'vice_admin');
  } finally {
    await testDb.teardown();
  }
});

test('DevOps migration creates DYC membership for is_devops users', async () => {
  const testDb = await createTestDatabase();
  try {
    const db = testDb.pool;
    
    // Tạo users với is_devops
    await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['Normal User', 'normal@test.com', 'hash', 'member']
    );
    
    // Chạy migration (sẽ thêm cột is_devops nếu chưa có)
    await migrateDatabase(db);
    
    // Thêm is_devops user sau khi migration tạo cột
    await db.query(
      'INSERT INTO users (name, email, password_hash, role, is_devops) VALUES (?, ?, ?, ?, ?)',
      ['DevOps User', 'devops@test.com', 'hash', 'admin', 1]
    );
    
    // Reset marker để chạy lại DevOps migration
    await db.query('DELETE FROM platform_migrations WHERE name = ?', [DEVOPS_MIGRATE_MARKER]);
    
    // Chạy migration lại
    await migrateDatabase(db);
    
    // Kiểm tra DevOps user có membership DYC
    const [dyc] = await db.query('SELECT id FROM org_units WHERE code = ?', ['DYC']);
    const dycId = dyc[0].id;
    
    const [devopsMem] = await db.query(
      'SELECT role FROM unit_memberships WHERE unit_id = ? AND user_id = (SELECT id FROM users WHERE email = ?)',
      [dycId, 'devops@test.com']
    );
    assert.equal(devopsMem.length, 1, 'DevOps user phải có membership DYC');
    assert.equal(devopsMem[0].role, 'dyc_engineer', 'Role DYC phải là dyc_engineer');
    
    // Kiểm tra normal user không có membership DYC
    const [normalMem] = await db.query(
      'SELECT role FROM unit_memberships WHERE unit_id = ? AND user_id = (SELECT id FROM users WHERE email = ?)',
      [dycId, 'normal@test.com']
    );
    assert.equal(normalMem.length, 0, 'Normal user không được có membership DYC');
  } finally {
    await testDb.teardown();
  }
});

test('migration handles empty database (fresh install)', async () => {
  const testDb = await createTestDatabase();
  try {
    // Database trống, chỉ có schema
    await migrateDatabase(testDb.pool);
    
    // Kiểm tra các bảng được tạo
    const tables = ['org_units', 'unit_memberships', 'unit_modules', 'directives'];
    for (const table of tables) {
      const [rows] = await testDb.pool.query(
        `SELECT COUNT(*) AS c FROM information_schema.TABLES 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [table]
      );
      assert.ok(rows[0].c > 0, `Bảng ${table} phải tồn tại`);
    }
    
    // Kiểm tra 7 đơn vị đã được seed
    const unitCount = await count(testDb.pool, 'SELECT COUNT(*) c FROM org_units');
    assert.equal(unitCount, 7, 'Phải có 7 đơn vị');
    
    // Kiểm tra không có membership (vì không có user)
    const membershipCount = await count(testDb.pool, 'SELECT COUNT(*) c FROM unit_memberships');
    assert.equal(membershipCount, 0, 'Không có membership khi chưa có user');
    
    // Kiểm tra module access đã được seed
    const moduleCount = await count(testDb.pool, 'SELECT COUNT(*) c FROM unit_modules');
    assert.ok(moduleCount > 0, 'Module access phải được seed');
    
    // Kiểm tra BTV→TCKT policy
    const policyCount = await count(testDb.pool, 'SELECT COUNT(*) c FROM unit_visibility_policies');
    assert.equal(policyCount, 1, 'Phải có 1 visibility policy');
  } finally {
    await testDb.teardown();
  }
});

test('migration can be interrupted and resumed', async () => {
  const testDb = await createTestDatabase();
  try {
    const db = testDb.pool;
    
    // Tạo một số users trước
    await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['User 1', 'user1@test.com', 'hash', 'admin']
    );
    
    // Chạy migration lần đầu (hoàn chỉnh)
    await migrateDatabase(db);
    
    const units1 = await count(db, 'SELECT COUNT(*) c FROM org_units');
    const memberships1 = await count(db, 'SELECT COUNT(*) c FROM unit_memberships');
    
    // Thêm user mới sau migration
    await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['User 2', 'user2@test.com', 'hash', 'leader']
    );
    
    // Chạy migration lại (giả lập resume)
    await migrateDatabase(db);
    
    const units2 = await count(db, 'SELECT COUNT(*) c FROM org_units');
    const memberships2 = await count(db, 'SELECT COUNT(*) c FROM unit_memberships');
    
    // Số đơn vị không đổi (idempotent)
    assert.equal(units2, units1, 'Số đơn vị không thay đổi');
    
    // User mới vẫn chưa có membership (vì backfill chỉ chạy 1 lần)
    assert.equal(memberships2, memberships1, 'Backfill không chạy lại');
    
    // Điều này là đúng: backfill chỉ chạy 1 lần để migration hiện tại
    // User mới sẽ được tạo membership qua application code
  } finally {
    await testDb.teardown();
  }
});

test('foreign keys prevent orphaned records', async () => {
  const testDb = await createTestDatabase();
  try {
    const db = testDb.pool;
    
    await migrateDatabase(db);
    
    // Tạo unit và membership
    const [unit] = await db.query(
      "INSERT INTO org_units (code, name, kind) VALUES (?, ?, ?)",
      ['TEST', 'Test Unit', 'department']
    );
    const unitId = unit.insertId;
    
    const [user] = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['Test User', 'test@test.com', 'hash', 'admin']
    );
    const userId = user.insertId;
    
    await db.query(
      'INSERT INTO unit_memberships (user_id, unit_id, role) VALUES (?, ?, ?)',
      [userId, unitId, 'admin']
    );
    
    // Xóa user → membership tự động bị xóa (CASCADE)
    await db.query('DELETE FROM users WHERE id = ?', [userId]);
    
    const membershipCount = await count(db, 'SELECT COUNT(*) c FROM unit_memberships WHERE user_id = ?', [userId]);
    assert.equal(membershipCount, 0, 'Membership phải bị xóa khi user bị xóa');
    
    // Thử xóa unit → membership cũng bị xóa
    await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['Test User 2', 'test2@test.com', 'hash', 'admin']
    );
    const [user2] = await db.query('SELECT id FROM users WHERE email = ?', ['test2@test.com']);
    
    await db.query(
      'INSERT INTO unit_memberships (user_id, unit_id, role) VALUES (?, ?, ?)',
      [user2[0].id, unitId, 'admin']
    );
    
    await db.query('DELETE FROM org_units WHERE id = ?', [unitId]);
    
    const membershipCount2 = await count(db, 'SELECT COUNT(*) c FROM unit_memberships WHERE unit_id = ?', [unitId]);
    assert.equal(membershipCount2, 0, 'Membership phải bị xóa khi unit bị xóa');
  } finally {
    await testDb.teardown();
  }
});

test('migration creates proper indexes for performance', async () => {
  const testDb = await createTestDatabase();
  try {
    await migrateDatabase(testDb.pool);
    
    // Kiểm tra các index quan trọng
    const indexes = [
      ['teams', 'teams_unit'],
      ['activities', 'activities_unit'],
      ['activities', 'activities_directive'],
      ['unit_memberships', 'unit_memberships_unit'],
      ['directives', 'directives_to'],
      ['directives', 'directives_from'],
      ['submissions', 'submissions_to'],
      ['audit_logs', 'audit_logs_owner'],
      ['audit_logs', 'audit_logs_actor']
    ];
    
    for (const [table, indexName] of indexes) {
      const [rows] = await testDb.pool.query(
        `SELECT COUNT(*) AS c FROM information_schema.STATISTICS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
        [table, indexName]
      );
      assert.ok(rows[0].c > 0, `Index ${indexName} on ${table} phải tồn tại`);
    }
  } finally {
    await testDb.teardown();
  }
});
