'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { createTestDatabase } = require('./helpers/db');
const { migrateDatabase, tableExists, columnExists } = require('../src/config/migrate');

const quiet = { logger: { info: () => {} } };
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

test('backfill: teams/activities -> TCKT, users.role -> TCKT membership, is_devops -> dyc_engineer, BTV->TCKT summary', async () => {
  // Dựng DB từ db.sql KHÔNG migrate, chèn dữ liệu "cũ", rồi migrate — mô phỏng production.
  const cfg = { host: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost', port: Number(process.env.TEST_DB_PORT || process.env.DB_PORT || 3306), user: process.env.TEST_DB_USER || process.env.DB_USER || 'root', password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || '', multipleStatements: true };
  const name = `tckt_mu_${process.pid}_${Date.now()}`;
  const admin = await mysql.createConnection(cfg);
  await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4`);
  await admin.changeUser({ database: name });
  await admin.query(fs.readFileSync(path.join(__dirname, '..', 'db.sql'), 'utf8'));
  await admin.query("INSERT INTO users(name,email,password_hash,role,auth_provider,is_devops) VALUES ('Dev','dev@example.com','x','vice_admin','local',1),('Mem','mem@example.com','x','member','local',0)");
  await admin.end();
  const pool = mysql.createPool({ ...cfg, database: name, multipleStatements: false, connectionLimit: 3 });
  try {
    await migrateDatabase(pool, quiet);
    const tckt = await count(pool, "SELECT id c FROM org_units WHERE code='TCKT'");
    const dyc = await count(pool, "SELECT id c FROM org_units WHERE code='DYC'");
    const btv = await count(pool, "SELECT id c FROM org_units WHERE code='BTV'");
    assert.equal(await count(pool, 'SELECT COUNT(*) c FROM teams WHERE unit_id<>?', [tckt]), 0);
    assert.equal(await count(pool, 'SELECT COUNT(*) c FROM activities WHERE unit_id<>?', [tckt]), 0);
    assert.equal(await count(pool, 'SELECT COUNT(*) c FROM users u LEFT JOIN unit_memberships m ON m.user_id=u.id AND m.unit_id=? AND m.role=u.role WHERE m.user_id IS NULL', [tckt]), 0);
    assert.equal(await count(pool, "SELECT COUNT(*) c FROM unit_memberships m JOIN users u ON u.id=m.user_id WHERE u.email='dev@example.com' AND m.unit_id=? AND m.role='dyc_engineer'", [dyc]), 1);
    assert.equal(await count(pool, "SELECT COUNT(*) c FROM unit_memberships m JOIN users u ON u.id=m.user_id WHERE u.email='mem@example.com' AND m.unit_id=?", [dyc]), 0);
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
