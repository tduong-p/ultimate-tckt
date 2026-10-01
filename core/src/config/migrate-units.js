'use strict';

const { SEED_UNITS, SEED_UNIT_MODULES, TCKT_CODE, BTV_CODE } = require('../units/catalog');

// Marker đánh dấu đã chạy backfill (chạy một lần duy nhất)
const BACKFILL_MARKER = 'multi_unit_backfill_v1';
// Marker riêng cho migration is_devops → DYC membership
const DEVOPS_MIGRATE_MARKER = 'devops_to_dyc_membership_v1';

const T = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

// Định nghĩa bảng theo design spec §5.1-5.3
const TABLES = [
  ['platform_migrations', `CREATE TABLE platform_migrations (
    name VARCHAR(80) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ${T}`],
    
  ['org_units', `CREATE TABLE org_units (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    kind ENUM('platform_owner','standing_committee','department','office','party_cell','grassroots') NOT NULL,
    parent_id INT UNSIGNED NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_org_units_parent FOREIGN KEY (parent_id) REFERENCES org_units(id) ON DELETE SET NULL) ${T}`],
    
  ['unit_memberships', `CREATE TABLE unit_memberships (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE,
    user_id INT UNSIGNED NOT NULL,
    unit_id INT UNSIGNED NOT NULL,
    role VARCHAR(32) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, unit_id),
    INDEX unit_memberships_unit (unit_id, role),
    CONSTRAINT fk_unit_memberships_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_unit_memberships_unit FOREIGN KEY (unit_id) REFERENCES org_units(id) ON DELETE CASCADE) ${T}`],
    
  ['unit_modules', `CREATE TABLE unit_modules (
    unit_id INT UNSIGNED NOT NULL,
    module_id VARCHAR(40) NOT NULL,
    PRIMARY KEY (unit_id, module_id),
    CONSTRAINT fk_unit_modules_unit FOREIGN KEY (unit_id) REFERENCES org_units(id) ON DELETE CASCADE) ${T}`],
    
  ['unit_visibility_policies', `CREATE TABLE unit_visibility_policies (
    viewer_unit_id INT UNSIGNED NOT NULL,
    owner_unit_id INT UNSIGNED NOT NULL,
    level ENUM('summary','tasks_readonly','full_readonly') NOT NULL,
    updated_by INT UNSIGNED NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (viewer_unit_id, owner_unit_id),
    CONSTRAINT fk_visibility_viewer FOREIGN KEY (viewer_unit_id) REFERENCES org_units(id) ON DELETE CASCADE,
    CONSTRAINT fk_visibility_owner FOREIGN KEY (owner_unit_id) REFERENCES org_units(id) ON DELETE CASCADE,
    CONSTRAINT fk_visibility_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL) ${T}`],
    
  ['setting_locks', `CREATE TABLE setting_locks (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(80) NOT NULL,
    unit_id INT UNSIGNED NULL,
    locked_by INT UNSIGNED NULL,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX setting_locks_key (setting_key, unit_id),
    CONSTRAINT fk_setting_locks_unit FOREIGN KEY (unit_id) REFERENCES org_units(id) ON DELETE CASCADE,
    CONSTRAINT fk_setting_locks_user FOREIGN KEY (locked_by) REFERENCES users(id) ON DELETE SET NULL) ${T}`],
    
  // audit_logs không có FK tới users/org_units: log phải sống sót khi user/đơn vị bị xóa
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
    INDEX audit_logs_owner (owner_unit_id, created_at),
    INDEX audit_logs_actor (actor_id, created_at)) ${T}`],
    
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
    INDEX directives_to (to_unit_id, status),
    INDEX directives_from (from_unit_id, status),
    CONSTRAINT fk_directives_from FOREIGN KEY (from_unit_id) REFERENCES org_units(id),
    CONSTRAINT fk_directives_to FOREIGN KEY (to_unit_id) REFERENCES org_units(id),
    CONSTRAINT fk_directives_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_directives_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL) ${T}`],
    
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
    INDEX submissions_to (to_unit_id, withdrawn_at),
    INDEX submissions_source (source_type, source_id),
    CONSTRAINT fk_submissions_from FOREIGN KEY (from_unit_id) REFERENCES org_units(id),
    CONSTRAINT fk_submissions_to FOREIGN KEY (to_unit_id) REFERENCES org_units(id),
    CONSTRAINT fk_submissions_directive FOREIGN KEY (directive_id) REFERENCES directives(id) ON DELETE SET NULL,
    CONSTRAINT fk_submissions_submitter FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_submissions_responder FOREIGN KEY (responded_by) REFERENCES users(id) ON DELETE SET NULL) ${T}`],
    
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
    CONSTRAINT fk_ops_logs_recorder FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL) ${T}`],
    
  ['ops_log_attendance', `CREATE TABLE ops_log_attendance (
    ops_log_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    status ENUM('present','late','absent_excused','absent') NOT NULL,
    note VARCHAR(255) NULL,
    PRIMARY KEY (ops_log_id, user_id),
    CONSTRAINT fk_ops_attendance_log FOREIGN KEY (ops_log_id) REFERENCES ops_logs(id) ON DELETE CASCADE,
    CONSTRAINT fk_ops_attendance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ${T}`]
];

/**
 * Helper: thêm cột unit_id vào bảng và backfill về TCKT
 * Tránh lặp code giữa teams và activities
 */
async function addUnitColumn(db, tableName, tcktId, h) {
  if (!(await h.columnExists(db, tableName, 'unit_id'))) {
    h.log(`Adding ${tableName}.unit_id`);
    await db.query(`ALTER TABLE ${tableName} ADD COLUMN unit_id INT UNSIGNED NULL`);
  }
  
  // Backfill dữ liệu cũ về TCKT
  await db.query(`UPDATE ${tableName} SET unit_id=? WHERE unit_id IS NULL`, [tcktId]);
  
  // Set NOT NULL với default
  await db.query(`ALTER TABLE ${tableName} MODIFY unit_id INT UNSIGNED NOT NULL DEFAULT ${tcktId}`);
  
  // Thêm index nếu chưa có
  if (!(await h.indexExists(db, tableName, `${tableName}_unit`))) {
    await db.query(`ALTER TABLE ${tableName} ADD INDEX ${tableName}_unit (unit_id)`);
  }
  
  // Thêm FK nếu chưa có
  const fkName = `fk_${tableName}_unit`;
  if (!(await h.foreignKeyExists(db, tableName, fkName))) {
    await db.query(`ALTER TABLE ${tableName} ADD CONSTRAINT ${fkName} FOREIGN KEY (unit_id) REFERENCES org_units(id)`);
  }
}

/**
 * Migration is_devops → DYC membership (chạy riêng, có marker riêng)
 * Lý do marker riêng: nếu GĐ2 xóa cột is_devops thì migration này skip an toàn
 */
async function migrateDevopsToMembership(db, dycId, h) {
  const [done] = await db.execute('SELECT 1 FROM platform_migrations WHERE name=?', [DEVOPS_MIGRATE_MARKER]);
  if (done.length) return;
  
  // Kiểm tra cột is_devops còn tồn tại không (có thể đã bị xóa ở môi trường mới)
  const hasIsDevops = await h.columnExists(db, 'users', 'is_devops');
  
  if (hasIsDevops) {
    h.log('Migrating users.is_devops=1 → DYC dyc_engineer membership');
    await db.execute(
      'INSERT IGNORE INTO unit_memberships(user_id, unit_id, role) ' +
      'SELECT id, ?, ? FROM users WHERE is_devops = 1',
      [dycId, 'dyc_engineer']
    );
  }
  
  await db.execute('INSERT INTO platform_migrations(name) VALUES (?)', [DEVOPS_MIGRATE_MARKER]);
  h.log('DevOps migration marker recorded');
}

/**
 * Migration chính: tạo bảng, seed, backfill
 */
async function migrateMultiUnit(db, helpers) {
  const { log, tableExists, columnExists, foreignKeyExists, indexExists } = helpers;
  const h = { log, columnExists, foreignKeyExists, indexExists };
  
  // 1. Tạo các bảng mới
  for (const [name, ddl] of TABLES) {
    if (!(await tableExists(db, name))) {
      log(`Creating table ${name}`);
      await db.query(ddl);
    }
  }
  
  // 2. Seed các đơn vị từ catalog
  for (const [code, name, kind] of SEED_UNITS) {
    await db.execute('INSERT IGNORE INTO org_units(code, name, kind) VALUES (?, ?, ?)', [code, name, kind]);
  }
  
  // 3. Lấy unit IDs
  const [unitRows] = await db.query('SELECT id, code FROM org_units');
  const unitMap = Object.fromEntries(unitRows.map(row => [row.code, Number(row.id)]));
  const tcktId = unitMap[TCKT_CODE];
  const dycId = unitMap['DYC'];
  const btvId = unitMap[BTV_CODE];
  
  if (!tcktId) throw new Error('TCKT unit seed missing');
  if (!dycId) throw new Error('DYC unit seed missing');
  if (!btvId) throw new Error('BTV unit seed missing');
  
  // 4. Thêm unit_id cho teams và activities
  await addUnitColumn(db, 'teams', tcktId, h);
  await addUnitColumn(db, 'activities', tcktId, h);
  
  // 5. Thêm activities.directive_id
  if (!(await columnExists(db, 'activities', 'directive_id'))) {
    log('Adding activities.directive_id');
    await db.query('ALTER TABLE activities ADD COLUMN directive_id INT UNSIGNED NULL');
  }
  if (!(await foreignKeyExists(db, 'activities', 'fk_activities_directive'))) {
    await db.query('ALTER TABLE activities ADD CONSTRAINT fk_activities_directive FOREIGN KEY (directive_id) REFERENCES directives(id) ON DELETE SET NULL');
  }
  if (!(await indexExists(db, 'activities', 'activities_directive'))) {
    await db.query('ALTER TABLE activities ADD INDEX activities_directive (directive_id)');
  }
  
  // 6. One-time backfill: memberships, modules, policy
  const [applied] = await db.execute('SELECT 1 FROM platform_migrations WHERE name=?', [BACKFILL_MARKER]);
  if (applied.length) {
    log('Backfill already applied, checking DevOps migration');
    await migrateDevopsToMembership(db, dycId, h);
    return;
  }
  
  log('Backfilling unit memberships, modules and visibility policies');
  const connection = typeof db.getConnection === 'function' ? await db.getConnection() : db;
  
  try {
    await connection.beginTransaction();
    
    // 6a. Tạo membership TCKT từ users.role (giữ nguyên role cũ)
    await connection.execute(
      'INSERT IGNORE INTO unit_memberships(user_id, unit_id, role) SELECT id, ?, role FROM users ORDER BY id',
      [tcktId]
    );
    
    // 6b. Seed module access theo catalog
    for (const [code, modules] of Object.entries(SEED_UNIT_MODULES)) {
      const unitId = unitMap[code];
      if (!unitId) {
        log(`Warning: Unit ${code} in SEED_UNIT_MODULES not found in org_units`);
        continue;
      }
      for (const moduleId of modules) {
        await connection.execute(
          'INSERT IGNORE INTO unit_modules(unit_id, module_id) VALUES (?, ?)',
          [unitId, moduleId]
        );
      }
    }
    
    // 6c. Seed BTV → TCKT visibility policy = summary
    await connection.execute(
      "INSERT IGNORE INTO unit_visibility_policies(viewer_unit_id, owner_unit_id, level) VALUES (?, ?, 'summary')",
      [btvId, tcktId]
    );
    
    // 6d. Đánh dấu hoàn thành backfill chính
    await connection.execute('INSERT INTO platform_migrations(name) VALUES (?)', [BACKFILL_MARKER]);
    
    await connection.commit();
    log('Backfill completed successfully');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    if (connection !== db) connection.release();
  }
  
  // 6e. Chạy DevOps migration sau khi backfill chính xong
  await migrateDevopsToMembership(db, dycId, h);
}

module.exports = {
  migrateMultiUnit,
  BACKFILL_MARKER,
  DEVOPS_MIGRATE_MARKER
};
