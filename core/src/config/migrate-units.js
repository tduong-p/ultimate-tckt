'use strict';

const UNIT_SEEDS = [
  ['DYC', 'DYC — Chủ quản nền tảng', 'platform_owner'],
  ['BTV', 'Ban Thường vụ', 'standing_committee'],
  ['TCKT', 'Ban Tổ chức – Kiểm tra', 'department'],
  ['VPD', 'Văn phòng Đoàn', 'office'],
  ['CHIBO', 'Chi bộ', 'party_cell'],
  ['DEMO-DT-01', '[Dữ liệu giả] Đoàn trường mẫu 01', 'grassroots'],
  ['DEMO-LCD-01', '[Dữ liệu giả] Liên chi đoàn mẫu 01', 'grassroots']
];
const UNIT_MODULES = {
  TCKT: ['dieu-hanh', 'ctd'], BTV: ['dieu-hanh', 'ctd'], VPD: ['ctd'], CHIBO: ['ctd'],
  'DEMO-DT-01': ['ctd'], 'DEMO-LCD-01': ['ctd']
};
const MIGRATION_MARKER = 'multi_unit_backfill_v1';
const ENGINE = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

const TABLES = [
  ['platform_migrations', `CREATE TABLE platform_migrations (
    name VARCHAR(80) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ${ENGINE}`],
  ['org_units', `CREATE TABLE org_units (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    kind ENUM('platform_owner','standing_committee','department','office','party_cell','grassroots') NOT NULL,
    parent_id INT UNSIGNED NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_org_units_parent FOREIGN KEY (parent_id) REFERENCES org_units(id) ON DELETE SET NULL) ${ENGINE}`],
  ['unit_memberships', `CREATE TABLE unit_memberships (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE,
    user_id INT UNSIGNED NOT NULL,
    unit_id INT UNSIGNED NOT NULL,
    role VARCHAR(32) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, unit_id), INDEX unit_memberships_unit (unit_id, role),
    CONSTRAINT fk_unit_memberships_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_unit_memberships_unit FOREIGN KEY (unit_id) REFERENCES org_units(id) ON DELETE CASCADE) ${ENGINE}`],
  ['unit_modules', `CREATE TABLE unit_modules (
    unit_id INT UNSIGNED NOT NULL,
    module_id VARCHAR(40) NOT NULL,
    PRIMARY KEY (unit_id, module_id),
    CONSTRAINT fk_unit_modules_unit FOREIGN KEY (unit_id) REFERENCES org_units(id) ON DELETE CASCADE) ${ENGINE}`],
  ['unit_visibility_policies', `CREATE TABLE unit_visibility_policies (
    viewer_unit_id INT UNSIGNED NOT NULL,
    owner_unit_id INT UNSIGNED NOT NULL,
    level ENUM('summary','tasks_readonly','full_readonly') NOT NULL,
    updated_by INT UNSIGNED NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (viewer_unit_id, owner_unit_id),
    CONSTRAINT fk_visibility_viewer FOREIGN KEY (viewer_unit_id) REFERENCES org_units(id) ON DELETE CASCADE,
    CONSTRAINT fk_visibility_owner FOREIGN KEY (owner_unit_id) REFERENCES org_units(id) ON DELETE CASCADE,
    CONSTRAINT fk_visibility_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL) ${ENGINE}`],
  ['setting_locks', `CREATE TABLE setting_locks (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(80) NOT NULL,
    unit_id INT UNSIGNED NULL,
    locked_by INT UNSIGNED NULL,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX setting_locks_key (setting_key, unit_id),
    CONSTRAINT fk_setting_locks_unit FOREIGN KEY (unit_id) REFERENCES org_units(id) ON DELETE CASCADE,
    CONSTRAINT fk_setting_locks_user FOREIGN KEY (locked_by) REFERENCES users(id) ON DELETE SET NULL) ${ENGINE}`],
  ['audit_logs', `CREATE TABLE audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    actor_id INT UNSIGNED NULL,
    actor_unit_id INT UNSIGNED NULL,
    action VARCHAR(60) NOT NULL,
    target_type VARCHAR(60) NOT NULL,
    target_id VARCHAR(191) NULL,
    owner_unit_id INT UNSIGNED NULL,
    meta JSON NULL,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
    INDEX audit_logs_owner (owner_unit_id, created_at), INDEX audit_logs_actor (actor_id, created_at)) ${ENGINE}`],
  ['directives', `CREATE TABLE directives (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    from_unit_id INT UNSIGNED NOT NULL,
    to_unit_id INT UNSIGNED NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NULL,
    deadline DATE NULL,
    status ENUM('sent','acknowledged','in_progress','submitted','accepted','revision_requested') NOT NULL DEFAULT 'sent',
    created_by INT UNSIGNED NULL,
    owner_user_id INT UNSIGNED NULL,
    acknowledged_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX directives_to (to_unit_id, status), INDEX directives_from (from_unit_id, status),
    CONSTRAINT fk_directives_from FOREIGN KEY (from_unit_id) REFERENCES org_units(id),
    CONSTRAINT fk_directives_to FOREIGN KEY (to_unit_id) REFERENCES org_units(id),
    CONSTRAINT fk_directives_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_directives_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL) ${ENGINE}`],
  ['submissions', `CREATE TABLE submissions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    from_unit_id INT UNSIGNED NOT NULL,
    to_unit_id INT UNSIGNED NOT NULL,
    source_type ENUM('activity','ops_log','report') NOT NULL,
    source_id INT UNSIGNED NOT NULL,
    directive_id INT UNSIGNED NULL,
    note TEXT NULL,
    submitted_by INT UNSIGNED NULL,
    response ENUM('seen','revision_requested','accepted') NULL,
    response_note TEXT NULL,
    responded_by INT UNSIGNED NULL,
    responded_at DATETIME NULL,
    withdrawn_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX submissions_to (to_unit_id, withdrawn_at), INDEX submissions_source (source_type, source_id),
    CONSTRAINT fk_submissions_from FOREIGN KEY (from_unit_id) REFERENCES org_units(id),
    CONSTRAINT fk_submissions_to FOREIGN KEY (to_unit_id) REFERENCES org_units(id),
    CONSTRAINT fk_submissions_directive FOREIGN KEY (directive_id) REFERENCES directives(id) ON DELETE SET NULL,
    CONSTRAINT fk_submissions_submitter FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_submissions_responder FOREIGN KEY (responded_by) REFERENCES users(id) ON DELETE SET NULL) ${ENGINE}`],
  ['ops_logs', `CREATE TABLE ops_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    unit_id INT UNSIGNED NOT NULL,
    type ENUM('duty_shift','meeting','other') NOT NULL,
    title VARCHAR(200) NOT NULL,
    started_at DATETIME NOT NULL,
    ended_at DATETIME NULL,
    location VARCHAR(200) NULL,
    content TEXT NULL,
    recorded_by INT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX ops_logs_unit (unit_id, started_at),
    CONSTRAINT fk_ops_logs_unit FOREIGN KEY (unit_id) REFERENCES org_units(id),
    CONSTRAINT fk_ops_logs_recorder FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL) ${ENGINE}`],
  ['ops_log_attendance', `CREATE TABLE ops_log_attendance (
    ops_log_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    status ENUM('present','late','absent_excused','absent') NOT NULL,
    note VARCHAR(255) NULL,
    PRIMARY KEY (ops_log_id, user_id),
    CONSTRAINT fk_ops_attendance_log FOREIGN KEY (ops_log_id) REFERENCES ops_logs(id) ON DELETE CASCADE,
    CONSTRAINT fk_ops_attendance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ${ENGINE}`]
];

async function migrateMultiUnit(db, helpers) {
  const { log, tableExists, columnExists, foreignKeyExists, indexExists } = helpers;
  for (const [name, ddl] of TABLES) {
    if (!(await tableExists(db, name))) {
      log(`Creating table ${name}`);
      await db.query(ddl);
    }
  }

  for (const [code, name, kind] of UNIT_SEEDS) {
    await db.execute('INSERT IGNORE INTO org_units(code, name, kind) VALUES (?, ?, ?)', [code, name, kind]);
  }
  const [rows] = await db.query('SELECT id, code FROM org_units');
  const unitIds = Object.fromEntries(rows.map(row => [row.code, Number(row.id)]));
  const tcktId = unitIds.TCKT;
  if (!tcktId) throw new Error('TCKT unit seed is missing');

  for (const table of ['teams', 'activities']) {
    if (!(await columnExists(db, table, 'unit_id'))) {
      log(`Adding ${table}.unit_id`);
      await db.query(`ALTER TABLE ${table} ADD COLUMN unit_id INT UNSIGNED NULL`);
    }
    await db.query(`UPDATE ${table} SET unit_id=? WHERE unit_id IS NULL`, [tcktId]);
    await db.query(`ALTER TABLE ${table} MODIFY unit_id INT UNSIGNED NOT NULL DEFAULT ${tcktId}`);
    if (!(await indexExists(db, table, `${table}_unit`))) await db.query(`ALTER TABLE ${table} ADD INDEX ${table}_unit (unit_id)`);
    if (!(await foreignKeyExists(db, table, `fk_${table}_unit`)) && table === 'teams') {
      await db.query('ALTER TABLE teams ADD CONSTRAINT fk_teams_unit FOREIGN KEY (unit_id) REFERENCES org_units(id)');
    } else if (table === 'activities' && !(await foreignKeyExists(db, table, 'fk_activities_unit'))) {
      await db.query('ALTER TABLE activities ADD CONSTRAINT fk_activities_unit FOREIGN KEY (unit_id) REFERENCES org_units(id)');
    }
  }

  if (!(await columnExists(db, 'activities', 'directive_id'))) {
    await db.query('ALTER TABLE activities ADD COLUMN directive_id INT UNSIGNED NULL');
  }
  if (!(await foreignKeyExists(db, 'activities', 'fk_activities_directive'))) {
    await db.query('ALTER TABLE activities ADD CONSTRAINT fk_activities_directive FOREIGN KEY (directive_id) REFERENCES directives(id) ON DELETE SET NULL');
  }
  if (!(await indexExists(db, 'activities', 'activities_directive'))) {
    await db.query('ALTER TABLE activities ADD INDEX activities_directive (directive_id)');
  }

  const [applied] = await db.execute('SELECT 1 FROM platform_migrations WHERE name=?', [MIGRATION_MARKER]);
  if (applied.length) return;
  log('Backfilling TCKT memberships, module access and BTV visibility policy');
  const connection = typeof db.getConnection === 'function' ? await db.getConnection() : db;
  try {
    await connection.beginTransaction();
    await connection.execute('INSERT IGNORE INTO unit_memberships(user_id, unit_id, role) SELECT id, ?, role FROM users ORDER BY id', [tcktId]);
    for (const [code, modules] of Object.entries(UNIT_MODULES)) {
      for (const moduleId of modules) {
        await connection.execute('INSERT IGNORE INTO unit_modules(unit_id, module_id) VALUES (?, ?)', [unitIds[code], moduleId]);
      }
    }
    await connection.execute("INSERT IGNORE INTO unit_visibility_policies(viewer_unit_id, owner_unit_id, level) VALUES (?, ?, 'summary')", [unitIds.BTV, tcktId]);
    await connection.execute('INSERT INTO platform_migrations(name) VALUES (?)', [MIGRATION_MARKER]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    if (connection !== db) connection.release();
  }
}

module.exports = { migrateMultiUnit, MIGRATION_MARKER, UNIT_SEEDS, UNIT_MODULES };
