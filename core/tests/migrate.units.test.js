'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { createTestDatabase } = require('./helpers/db');
const { migrateDatabase, tableExists, columnExists } = require('../src/config/migrate');

const quiet = { logger: { info: () => { } } };
const count = async (pool, sql, params = []) => (await pool.query(sql, params))[0][0].c;

test('multi-unit tables exist after the test DB is created (helper runs migrate)', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    for (const t of ['org_units', 'unit_memberships', 'unit_modules', 'unit_visibility_policies', 'setting_locks', 'audit_logs', 'directives', 'submissions', 'ops_logs', 'ops_log_attendance', 'platform_migrations']) {
      assert.equal(await tableExists(pool, t), true, t);
    }
    assert.equal(await columnExists(pool, 'teams', 'unit_id'), true);
    assert.equal(await columnExists(pool, 'activities', 'unit_id'), true);
    assert.equal(await columnExists(pool, 'activities', 'directive_id'), true);
  } finally { await teardown(); }
});

test('backfill: teams/activities -> TCKT, users.role -> TCKT membership, BTV->TCKT summary', async () => {
  // Dựng DB từ db.sql KHÔNG migrate, chèn dữ liệu "cũ", rồi migrate — mô phỏng production.
  const cfg = { host: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost', port: Number(process.env.TEST_DB_PORT || process.env.DB_PORT || 3306), user: process.env.TEST_DB_USER || process.env.DB_USER || 'root', password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || '', multipleStatements: true };
  const name = `tckt_mu_${process.pid}_${Date.now()}`;
  const admin = await mysql.createConnection(cfg);
  await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4`);
  await admin.changeUser({ database: name });
  await admin.query(fs.readFileSync(path.join(__dirname, '..', 'db.sql'), 'utf8'));
  await admin.query("INSERT INTO users(name,email,password_hash,role,auth_provider) VALUES ('Dev','dev@example.com','x','vice_admin','local'),('Mem','mem@example.com','x','member','local')");
  await admin.end();
  const pool = mysql.createPool({ ...cfg, database: name, multipleStatements: false, connectionLimit: 3 });
  try {
    await migrateDatabase(pool, quiet);
    const tckt = await count(pool, "SELECT id c FROM org_units WHERE code='TCKT'");
    const btv = await count(pool, "SELECT id c FROM org_units WHERE code='BTV'");
    assert.equal(await count(pool, 'SELECT COUNT(*) c FROM teams WHERE unit_id<>?', [tckt]), 0);
    assert.equal(await count(pool, 'SELECT COUNT(*) c FROM activities WHERE unit_id<>?', [tckt]), 0);
    // Mọi user đều được tạo membership TCKT với role tương ứng
    assert.equal(await count(pool, 'SELECT COUNT(*) c FROM users u LEFT JOIN unit_memberships m ON m.user_id=u.id AND m.unit_id=? AND m.role COLLATE utf8mb4_unicode_ci = u.role COLLATE utf8mb4_unicode_ci WHERE m.user_id IS NULL', [tckt]), 0);
    // BTV → TCKT visibility policy ở mức summary
    assert.equal(await count(pool, "SELECT COUNT(*) c FROM unit_visibility_policies WHERE viewer_unit_id=? AND owner_unit_id=? AND level='summary'", [btv, tckt]), 1);
    assert.equal(await count(pool, "SELECT COUNT(*) c FROM unit_modules m JOIN org_units u ON u.id=m.unit_id WHERE u.code='VPD' AND m.module_id='ctd'"), 1);
    // Sau migrate, INSERT kiểu cũ (không có unit_id) vẫn chạy và rơi về TCKT.
    await pool.query("INSERT INTO teams(name) VALUES ('Ban mới')");
    assert.equal(await count(pool, "SELECT unit_id c FROM teams WHERE name='Ban mới'"), tckt);
  } finally {
    await pool.end();
    const a2 = await mysql.createConnection(cfg); await a2.query(`DROP DATABASE IF EXISTS \`${name}\``); await a2.end();
  }
});

test('re-running migrate is idempotent and does not re-add a removed membership', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    const before = await count(pool, 'SELECT COUNT(*) c FROM unit_memberships');
    const units = await count(pool, 'SELECT COUNT(*) c FROM org_units');
    await pool.query("DELETE m FROM unit_memberships m JOIN org_units u ON u.id=m.unit_id WHERE u.code='TCKT' AND m.user_id=1");
    await migrateDatabase(pool, quiet);
    await migrateDatabase(pool, quiet);
    assert.equal(await count(pool, 'SELECT COUNT(*) c FROM unit_memberships'), before - 1);
    assert.equal(await count(pool, 'SELECT COUNT(*) c FROM org_units'), units);
    assert.equal(await count(pool, 'SELECT COUNT(*) c FROM unit_visibility_policies'), 1);
  } finally { await teardown(); }
});

test('migrate adopts the signed INT type of an existing org_units.id instead of forcing UNSIGNED (staging DB)', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    // Dựng lại trạng thái staging: DB đã migrate bởi bản cũ, org_units.id và unit_id là INT có dấu, FK đã có.
    const [fks] = await pool.query("SELECT TABLE_NAME t, CONSTRAINT_NAME c, COLUMN_NAME col FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME='org_units'");
    for (const f of fks) await pool.query(`ALTER TABLE ${f.t} DROP FOREIGN KEY ${f.c}`);
    for (const f of fks) await pool.query(`ALTER TABLE ${f.t} MODIFY ${f.col} INT${f.col === 'parent_id' ? ' NULL' : ' NOT NULL'}`);
    await pool.query('ALTER TABLE org_units MODIFY id INT AUTO_INCREMENT');
    for (const f of fks) await pool.query(`ALTER TABLE ${f.t} ADD CONSTRAINT ${f.c} FOREIGN KEY (${f.col}) REFERENCES org_units(id)`);
    await migrateDatabase(pool, quiet);
    const [rows] = await pool.query("SELECT TABLE_NAME t, COLUMN_TYPE ty FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND COLUMN_NAME='unit_id' AND TABLE_NAME IN ('teams','activities')");
    assert.equal(rows.length, 2);
    for (const r of rows) assert.equal(r.ty, 'int', `${r.t}.unit_id must keep matching org_units.id`);
  } finally { await teardown(); }
});
