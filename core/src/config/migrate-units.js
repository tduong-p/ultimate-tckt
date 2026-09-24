'use strict';
const { SEED_UNITS, SEED_UNIT_MODULES, TCKT_CODE, DYC_CODE } = require('../units/catalog');

const BACKFILL_MARKER = 'multi_unit_backfill_v1';
// Không set COLLATE riêng: db.sql không set COLLATE nên các bảng của nó dùng collation mặc định
// của database (utf8mb4_0900_ai_ci trên MySQL 8 cài mới). Nếu bảng ở đây COLLATE khác, so sánh
// VARCHAR/ENUM giữa hai bên (vd. unit_memberships.role = users.role) sẽ lỗi "Illegal mix of collations".
const T = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';

// Lưu ý: users.id/teams.id/activities.id là INT UNSIGNED trong db.sql, nên mọi cột
// tham chiếu users(id) ở đây phải là INT UNSIGNED — MySQL 8 từ chối FK khi lệch signed/unsigned.
const TABLES = [
  ['platform_migrations', `CREATE TABLE platform_migrations (
    name VARCHAR(80) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ${T}`],
  ['org_units', `CREATE TABLE org_units (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    kind ENUM('platform_owner','standing_committee','department','office','party_cell','grassroots') NOT NULL,
    parent_id INT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_org_units_parent FOREIGN KEY (parent_id) REFERENCES org_units(id) ON DELETE SET NULL) ${T}`],
  ['unit_memberships', `CREATE TABLE unit_memberships (
    id INT AUTO_INCREMENT UNIQUE,
    user_id INT UNSIGNED NOT NULL,
    unit_id INT NOT NULL,
    role VARCHAR(32) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, unit_id),
    INDEX unit_memberships_unit (unit_id, role),
    CONSTRAINT fk_um_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_um_unit FOREIGN KEY (unit_id) REFERENCES org_units(id) ON DELETE CASCADE) ${T}`],
  ['unit_modules', `CREATE TABLE unit_modules (
    unit_id INT NOT NULL,
    module_id VARCHAR(40) NOT NULL,
    PRIMARY KEY (unit_id, module_id),
    CONSTRAINT fk_umod_unit FOREIGN KEY (unit_id) REFERENCES org_units(id) ON DELETE CASCADE) ${T}`],
  ['unit_visibility_policies', `CREATE TABLE unit_visibility_policies (
    viewer_unit_id INT NOT NULL,
    owner_unit_id INT NOT NULL,
    level ENUM('summary','tasks_readonly','full_readonly') NOT NULL,
    updated_by INT UNSIGNED NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (viewer_unit_id, owner_unit_id),
    CONSTRAINT fk_uvp_viewer FOREIGN KEY (viewer_unit_id) REFERENCES org_units(id) ON DELETE CASCADE,
    CONSTRAINT fk_uvp_owner FOREIGN KEY (owner_unit_id) REFERENCES org_units(id) ON DELETE CASCADE,
    CONSTRAINT fk_uvp_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL) ${T}`],
  ['setting_locks', `CREATE TABLE setting_locks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(80) NOT NULL,
    unit_id INT NULL,
    locked_by INT UNSIGNED NULL,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX setting_locks_key (setting_key, unit_id),
    CONSTRAINT fk_sl_unit FOREIGN KEY (unit_id) REFERENCES org_units(id) ON DELETE CASCADE,
    CONSTRAINT fk_sl_user FOREIGN KEY (locked_by) REFERENCES users(id) ON DELETE SET NULL) ${T}`],
  // Không có FK: log phải sống sót khi user/đơn vị bị xoá.
  ['audit_logs', `CREATE TABLE audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_id INT UNSIGNED NULL,
    actor_unit_id INT NULL,
    action VARCHAR(60) NOT NULL,
    target_type VARCHAR(60) NOT NULL,
    target_id VARCHAR(191) NULL,
    owner_unit_id INT NULL,
    meta JSON NULL,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
    INDEX audit_logs_owner (owner_unit_id, created_at),
    INDEX audit_logs_actor (actor_id, created_at)) ${T}`],
  ['directives', `CREATE TABLE directives (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_unit_id INT NOT NULL,
    to_unit_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NULL,
    deadline DATE NULL,
    status ENUM('sent','acknowledged','in_progress','submitted','accepted','revision_requested') NOT NULL DEFAULT 'sent',
    created_by INT UNSIGNED NULL,
    owner_user_id INT UNSIGNED NULL,
    acknowledged_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX directives_to (to_unit_id, status),
    INDEX directives_from (from_unit_id, status),
    CONSTRAINT fk_dir_from FOREIGN KEY (from_unit_id) REFERENCES org_units(id),
    CONSTRAINT fk_dir_to FOREIGN KEY (to_unit_id) REFERENCES org_units(id),
    CONSTRAINT fk_dir_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_dir_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL) ${T}`],
  ['submissions', `CREATE TABLE submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_unit_id INT NOT NULL,
    to_unit_id INT NOT NULL,
    source_type ENUM('activity','ops_log','report') NOT NULL,
    source_id INT NOT NULL,
    directive_id INT NULL,
    note TEXT NULL,
    submitted_by INT UNSIGNED NULL,
    response ENUM('seen','revision_requested','accepted') NULL,
    response_note TEXT NULL,
    responded_by INT UNSIGNED NULL,
    responded_at DATETIME NULL,
    withdrawn_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX submissions_to (to_unit_id, withdrawn_at),
    INDEX submissions_source (source_type, source_id),
    CONSTRAINT fk_sub_from FOREIGN KEY (from_unit_id) REFERENCES org_units(id),
    CONSTRAINT fk_sub_to FOREIGN KEY (to_unit_id) REFERENCES org_units(id),
    CONSTRAINT fk_sub_dir FOREIGN KEY (directive_id) REFERENCES directives(id) ON DELETE SET NULL,
    CONSTRAINT fk_sub_by FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_sub_resp FOREIGN KEY (responded_by) REFERENCES users(id) ON DELETE SET NULL) ${T}`],
  ['ops_logs', `CREATE TABLE ops_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    unit_id INT NOT NULL,
    type ENUM('duty_shift','meeting','other') NOT NULL,
    title VARCHAR(200) NOT NULL,
    started_at DATETIME NOT NULL,
    ended_at DATETIME NULL,
    location VARCHAR(200) NULL,
    content TEXT NULL,
    recorded_by INT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX ops_logs_unit (unit_id, started_at),
    CONSTRAINT fk_ol_unit FOREIGN KEY (unit_id) REFERENCES org_units(id),
    CONSTRAINT fk_ol_by FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL) ${T}`],
  ['ops_log_attendance', `CREATE TABLE ops_log_attendance (
    ops_log_id INT NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    status ENUM('present','late','absent_excused','absent') NOT NULL,
    note VARCHAR(255) NULL,
    PRIMARY KEY (ops_log_id, user_id),
    CONSTRAINT fk_ola_log FOREIGN KEY (ops_log_id) REFERENCES ops_logs(id) ON DELETE CASCADE,
    CONSTRAINT fk_ola_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ${T}`]
];

async function addUnitColumn(db, table, tcktId, h) {
  if (!(await h.columnExists(db, table, 'unit_id'))) {
    h.log(`Adding ${table}.unit_id`);
    await db.query(`ALTER TABLE ${table} ADD COLUMN unit_id INT NULL`);
  }
  await db.query(`UPDATE ${table} SET unit_id=? WHERE unit_id IS NULL`, [tcktId]);
  // GĐ1: chỉ TCKT có module Điều hành, nên INSERT kiểu cũ (không truyền unit_id) rơi về TCKT.
  await db.query(`ALTER TABLE ${table} MODIFY unit_id INT NOT NULL DEFAULT ${Number(tcktId)}`);
  if (!(await h.indexExists(db, table, `${table}_unit`))) await db.query(`ALTER TABLE ${table} ADD INDEX ${table}_unit (unit_id)`);
  if (!(await h.foreignKeyExists(db, table, `fk_${table}_unit`))) {
    await db.query(`ALTER TABLE ${table} ADD CONSTRAINT fk_${table}_unit FOREIGN KEY (unit_id) REFERENCES org_units(id)`);
  }
}

async function migrateMultiUnit(db, h) {
  for (const [name, ddl] of TABLES) {
    if (!(await h.tableExists(db, name))) { h.log(`Creating table ${name}`); await db.query(ddl); }
  }
  for (const u of SEED_UNITS) {
    await db.execute('INSERT IGNORE INTO org_units(code,name,kind) VALUES (?,?,?)', [u.code, u.name, u.kind]);
  }
  const [unitRows] = await db.query('SELECT id, code FROM org_units');
  const unitId = Object.fromEntries(unitRows.map(r => [r.code, r.id]));

  await addUnitColumn(db, 'teams', unitId[TCKT_CODE], h);
  await addUnitColumn(db, 'activities', unitId[TCKT_CODE], h);
  if (!(await h.columnExists(db, 'activities', 'directive_id'))) {
    h.log('Adding activities.directive_id');
    await db.query('ALTER TABLE activities ADD COLUMN directive_id INT NULL, ADD CONSTRAINT fk_activities_directive FOREIGN KEY (directive_id) REFERENCES directives(id) ON DELETE SET NULL');
  }

  // Backfill chỉ chạy MỘT lần: sau đó membership/policy/module do người quản trị quyết định,
  // migrate lại không được thêm lại thứ họ đã gỡ.
  const [done] = await db.execute('SELECT 1 FROM platform_migrations WHERE name=?', [BACKFILL_MARKER]);
  if (done.length) return;
  h.log('Backfilling unit memberships, modules and visibility policies');
  const conn = typeof db.getConnection === 'function' ? await db.getConnection() : db;
  try {
    await conn.beginTransaction();
    await conn.execute('INSERT IGNORE INTO unit_memberships(user_id,unit_id,role) SELECT id, ?, role FROM users ORDER BY id', [unitId[TCKT_CODE]]);
    await conn.execute("INSERT IGNORE INTO unit_memberships(user_id,unit_id,role) SELECT id, ?, 'dyc_engineer' FROM users WHERE is_devops=1 ORDER BY id", [unitId[DYC_CODE]]);
    for (const [code, modules] of Object.entries(SEED_UNIT_MODULES)) {
      for (const moduleId of modules) await conn.execute('INSERT IGNORE INTO unit_modules(unit_id,module_id) VALUES (?,?)', [unitId[code], moduleId]);
    }
    await conn.execute("INSERT IGNORE INTO unit_visibility_policies(viewer_unit_id,owner_unit_id,level) VALUES (?,?,'summary')", [unitId.BTV, unitId[TCKT_CODE]]);
    await conn.execute('INSERT INTO platform_migrations(name) VALUES (?)', [BACKFILL_MARKER]);
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    if (conn !== db) conn.release();
  }
}

module.exports = { migrateMultiUnit, BACKFILL_MARKER };
