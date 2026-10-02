'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRawTestDatabase } = require('./helpers/db');
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
  const testDb = await createRawTestDatabase();
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
    
    // Kiểm tra teams (1 mẫu + 3 test)
    const teamCount = await count(db, 'SELECT COUNT(*) c FROM teams WHERE unit_id = ?', [tcktId]);
    assert.equal(teamCount, 4, 'Tất cả teams (1 mẫu + 3 test) phải được gán về TCKT');
    
    // Kiểm tra activities (1 mẫu + 3 test)
    const activityCount = await count(db, 'SELECT COUNT(*) c FROM activities WHERE unit_id = ?', [tcktId]);
    assert.equal(activityCount, 4, 'Tất cả activities (1 mẫu + 3 test) phải được gán về TCKT');
    
    // Kiểm tra memberships (1 mẫu + 3 test)
    const membershipCount = await count(db, 'SELECT COUNT(*) c FROM unit_memberships WHERE unit_id = ?', [tcktId]);
    assert.equal(membershipCount, 4, 'Tất cả users (1 mẫu + 3 test) phải có membership TCKT');
    
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
  const testDb = await createRawTestDatabase();
  try {
    const db = testDb.pool;
    
    // Thêm cột is_devops (giả lập schema cũ có cột này theo spec §5.2)
    await db.query('ALTER TABLE users ADD COLUMN is_devops TINYINT(1) DEFAULT 0');
    
    // Tạo users
    await db.query(
      'INSERT INTO users (name, email, password_hash, role, is_devops) VALUES (?, ?, ?, ?, ?)',
      ['Normal User', 'normal@test.com', 'hash', 'member', 0]
    );
    
    await db.query(
      'INSERT INTO users (name, email, password_hash, role, is_devops) VALUES (?, ?, ?, ?, ?)',
      ['DevOps User', 'devops@test.com', 'hash', 'admin', 1]
    );
    
    // Chạy migration
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
  const testDb = await createRawTestDatabase();
  try {
    // Database với schema từ db.sql (có 1 user mẫu)
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
    
    // Kiểm tra có membership từ user mẫu trong db.sql
    const membershipCount = await count(testDb.pool, 'SELECT COUNT(*) c FROM unit_memberships');
    assert.equal(membershipCount, 1, 'Có 1 membership từ user mẫu trong db.sql');
    
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
  const testDb = await createRawTestDatabase();
  try {
    const db = testDb.pool;
    
    // Tạo một số users trước
    await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['User 1', 'user1@test.com', 'hash', 'admin']
    );
    
    // Chạy migration một phần (tạo bảng)
    await migrateDatabase(db);
    
    // Xóa marker để giả lập interrupt
    await db.query('DELETE FROM platform_migrations WHERE name = ?', ['multi_unit_backfill_v1']);
    
    // Tạo thêm user
    await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['User 2', 'user2@test.com', 'hash', 'member']
    );
    
    // Chạy lại migration (resume)
    await migrateDatabase(db);
    
    // Kiểm tra cả 2 users đều có membership (+ 1 mẫu)
    const [tckt] = await db.query('SELECT id FROM org_units WHERE code = ?', ['TCKT']);
    const tcktId = tckt[0].id;
    const membershipCount = await count(db, 'SELECT COUNT(*) c FROM unit_memberships WHERE unit_id = ?', [tcktId]);
    assert.equal(membershipCount, 3, 'Tất cả 3 users phải có membership sau resume');
  } finally {
    await testDb.teardown();
  }
});

test('activities.directive_id column and FK are added', async () => {
  const testDb = await createRawTestDatabase();
  try {
    await migrateDatabase(testDb.pool);
    
    // Kiểm tra cột directive_id tồn tại
    const [columns] = await testDb.pool.query(
      `SHOW COLUMNS FROM activities LIKE 'directive_id'`
    );
    assert.equal(columns.length, 1, 'activities.directive_id phải tồn tại');
    
    // Kiểm tra FK tồn tại
    const [fks] = await testDb.pool.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activities' 
       AND CONSTRAINT_NAME = 'fk_activities_directive'`
    );
    assert.equal(fks.length, 1, 'FK activities → directives phải tồn tại');
  } finally {
    await testDb.teardown();
  }
});

test('migration is idempotent', async () => {
  const testDb = await createRawTestDatabase();
  try {
    const db = testDb.pool;
    
    // Chạy migration lần 1
    await migrateDatabase(db);
    const count1 = await count(db, 'SELECT COUNT(*) c FROM org_units');
    
    // Chạy lại lần 2
    await migrateDatabase(db);
    const count2 = await count(db, 'SELECT COUNT(*) c FROM org_units');
    
    // Số lượng đơn vị không thay đổi
    assert.equal(count1, count2, 'Migration phải idempotent');
  } finally {
    await testDb.teardown();
  }
});

