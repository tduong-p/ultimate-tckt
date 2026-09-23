'use strict';

const mysql = require('mysql2/promise');
const config = require('./environment');
const { createDatabase } = require('./database');

async function columnExists(db, tableName, columnName) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return rows[0].count > 0;
}

async function getColumnType(db, tableName, columnName) {
  const [rows] = await db.query(
    `SELECT COLUMN_TYPE
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return rows.length > 0 ? rows[0].COLUMN_TYPE : null;
}

async function tableExists(db, tableName) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName]
  );
  return rows[0].count > 0;
}

async function foreignKeyExists(db, tableName, constraintName) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
    [tableName, constraintName]
  );
  return rows[0].count > 0;
}

async function migrateDatabase(db, options = {}) {
  const logger = options.logger || console;
  const log = (msg) => {
    if (logger.info) logger.info(`[migrate] ${msg}`);
    else console.log(`[migrate] ${msg}`);
  };

  log('Checking database schema version and running migrations if needed...');

  // 1. users: auth_provider, role enum
  if (await tableExists(db, 'users')) {
    const userRoleType = await getColumnType(db, 'users', 'role');
    if (userRoleType && !userRoleType.includes("'vice_admin'")) {
      log("Updating users.role enum to include 'vice_admin'");
      await db.query("ALTER TABLE users MODIFY COLUMN role ENUM('admin','vice_admin','leader','vice_leader','member') NOT NULL DEFAULT 'member'");
    }
    if (!(await columnExists(db, 'users', 'auth_provider'))) {
      log('Adding column auth_provider to users table');
      await db.query("ALTER TABLE users ADD COLUMN auth_provider ENUM('local','microsoft') NOT NULL DEFAULT 'local' AFTER role");
    }
  }

  // 2. activities: event_lead_id, status enum
  if (await tableExists(db, 'activities')) {
    if (!(await columnExists(db, 'activities', 'event_lead_id'))) {
      log('Adding column event_lead_id to activities table');
      await db.query('ALTER TABLE activities ADD COLUMN event_lead_id INT UNSIGNED AFTER creator_id');
      try {
        await db.query('ALTER TABLE activities ADD CONSTRAINT fk_activities_event_lead FOREIGN KEY (event_lead_id) REFERENCES users(id) ON DELETE SET NULL');
      } catch (err) {
        log(`Foreign key fk_activities_event_lead could not be added or already exists: ${err.message}`);
      }
    }

    const activityStatusType = await getColumnType(db, 'activities', 'status');
    if (activityStatusType && !activityStatusType.includes('changes_requested')) {
      log("Updating activities.status enum to include 'changes_requested'");
      await db.query("ALTER TABLE activities MODIFY COLUMN status ENUM('proposed','changes_requested','approved','active','completed','cancelled') NOT NULL DEFAULT 'proposed'");
    }
  }

  // 3. tasks: primary_assignee_id, review fields, status enum
  if (await tableExists(db, 'tasks')) {
    const hasAssigneeId = await columnExists(db, 'tasks', 'assignee_id');
    const hasPrimaryAssigneeId = await columnExists(db, 'tasks', 'primary_assignee_id');

    if (hasAssigneeId && !hasPrimaryAssigneeId) {
      log('Renaming tasks.assignee_id to primary_assignee_id');
      await db.query('ALTER TABLE tasks CHANGE COLUMN assignee_id primary_assignee_id INT UNSIGNED');
    } else if (!hasPrimaryAssigneeId) {
      log('Adding tasks.primary_assignee_id');
      await db.query('ALTER TABLE tasks ADD COLUMN primary_assignee_id INT UNSIGNED AFTER team_id');
      try {
        await db.query('ALTER TABLE tasks ADD CONSTRAINT fk_tasks_primary_assignee FOREIGN KEY (primary_assignee_id) REFERENCES users(id) ON DELETE SET NULL');
      } catch (err) {
        log(`Foreign key fk_tasks_primary_assignee could not be added or already exists: ${err.message}`);
      }
    }

    if (!(await columnExists(db, 'tasks', 'submitted_for_review_at'))) {
      log('Adding tasks.submitted_for_review_at');
      await db.query('ALTER TABLE tasks ADD COLUMN submitted_for_review_at DATETIME AFTER deliverable');
    }

    if (!(await columnExists(db, 'tasks', 'reviewed_by'))) {
      log('Adding tasks.reviewed_by');
      await db.query('ALTER TABLE tasks ADD COLUMN reviewed_by INT UNSIGNED AFTER submitted_for_review_at');
      try {
        await db.query('ALTER TABLE tasks ADD CONSTRAINT fk_tasks_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL');
      } catch (err) {
        log(`Foreign key fk_tasks_reviewed_by could not be added or already exists: ${err.message}`);
      }
    }

    if (!(await columnExists(db, 'tasks', 'reviewed_at'))) {
      log('Adding tasks.reviewed_at');
      await db.query('ALTER TABLE tasks ADD COLUMN reviewed_at DATETIME AFTER reviewed_by');
    }

    if (!(await columnExists(db, 'tasks', 'review_feedback'))) {
      log('Adding tasks.review_feedback');
      await db.query('ALTER TABLE tasks ADD COLUMN review_feedback TEXT AFTER reviewed_at');
    }

    if (!(await columnExists(db, 'tasks', 'is_self_logged'))) {
      log('Adding tasks.is_self_logged');
      await db.query('ALTER TABLE tasks ADD COLUMN is_self_logged BOOLEAN NOT NULL DEFAULT FALSE AFTER deliverable');
    }

    if (!(await columnExists(db, 'tasks', 'weight'))) {
      log('Adding tasks.weight');
      await db.query('ALTER TABLE tasks ADD COLUMN weight TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER is_self_logged');
    }

    const taskStatusType = await getColumnType(db, 'tasks', 'status');
    if (taskStatusType && taskStatusType.includes("'open'")) {
      log("Migrating tasks.status 'open' -> 'todo' and updating enum definition");
      await db.query("ALTER TABLE tasks MODIFY COLUMN status ENUM('open','todo','in_progress','review','done','cancelled') NOT NULL DEFAULT 'open'");
      await db.query("UPDATE tasks SET status='todo' WHERE status='open'");
      await db.query("ALTER TABLE tasks MODIFY COLUMN status ENUM('todo','in_progress','review','done','cancelled') NOT NULL DEFAULT 'todo'");
    }
  }

  // 4. task_assignees: is_primary, acknowledged_at
  if (await tableExists(db, 'task_assignees')) {
    if (!(await columnExists(db, 'task_assignees', 'is_primary'))) {
      log('Adding task_assignees.is_primary');
      await db.query('ALTER TABLE task_assignees ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT FALSE AFTER user_id');
      await db.query(`
        UPDATE task_assignees ta
        JOIN tasks t ON t.id = ta.task_id AND t.primary_assignee_id = ta.user_id
        SET ta.is_primary = TRUE
      `);
    }

    if (!(await columnExists(db, 'task_assignees', 'acknowledged_at'))) {
      log('Adding task_assignees.acknowledged_at');
      await db.query('ALTER TABLE task_assignees ADD COLUMN acknowledged_at DATETIME AFTER is_primary');
    }
  }

  // 5. task_checklists table
  if (!(await tableExists(db, 'task_checklists'))) {
    log('Creating table task_checklists');
    await db.query(`
      CREATE TABLE IF NOT EXISTS task_checklists (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        task_id INT UNSIGNED NOT NULL,
        title VARCHAR(255) NOT NULL,
        is_done BOOLEAN NOT NULL DEFAULT FALSE,
        sort_order INT NOT NULL DEFAULT 0,
        done_by INT UNSIGNED,
        done_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (done_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
  }

  // 6. activity_proposals table
  if (!(await tableExists(db, 'activity_proposals'))) {
    log('Creating table activity_proposals');
    await db.query(`
      CREATE TABLE IF NOT EXISTS activity_proposals (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        activity_id INT UNSIGNED NOT NULL,
        submitted_by INT UNSIGNED NOT NULL,
        action ENUM('submit','approve','reject','request_changes') NOT NULL,
        reviewer_id INT UNSIGNED,
        feedback_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
        FOREIGN KEY (submitted_by) REFERENCES users(id),
        FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
  }

  // 7. updates: kind enum
  if (await tableExists(db, 'updates')) {
    const updatesKindType = await getColumnType(db, 'updates', 'kind');
    if (updatesKindType && !updatesKindType.includes('review_note')) {
      log("Updating updates.kind enum to include 'review_note'");
      await db.query("ALTER TABLE updates MODIFY COLUMN kind ENUM('comment','progress','evidence','issue','review_note') NOT NULL DEFAULT 'comment'");
    }
  }

  // 8. weight_presets table
  if (!(await tableExists(db, 'weight_presets'))) {
    log('Creating table weight_presets');
    await db.query(`
      CREATE TABLE IF NOT EXISTS weight_presets (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        label VARCHAR(120) NOT NULL,
        points TINYINT UNSIGNED NOT NULL DEFAULT 1,
        description VARCHAR(255),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await db.query(`
      INSERT INTO weight_presets (id, label, points, description, is_active, sort_order) VALUES
      (1, '0 — Tham gia / Hỗ trợ nhẹ', 0, 'Không tính điểm khối lượng', 1, 1),
      (2, '1 — Tiêu chuẩn / Lặp lại', 1, 'Trực phòng làm việc, trực bàn sự kiện, chuẩn bị hậu cần', 1, 2),
      (3, '2 — Trung bình / Có sản phẩm', 2, 'Thiết kế ấn phẩm, viết bài truyền thông, phụ trách kỹ thuật', 1, 3),
      (4, '3 — Trọng trách / Đột xuất', 3, 'Xử lý sự cố gấp, quản lý khu vực sự kiện', 1, 4),
      (5, '5 — Trọng điểm / Quy mô lớn', 5, 'Điều phối chính, phụ trách toàn bộ 1 mảng lớn', 1, 5)
      ON DUPLICATE KEY UPDATE id=id
    `);
  }

  log('Database schema check and migration complete.');
}

// Standalone execution support: node src/config/migrate.js
if (require.main === module) {
  (async () => {
    const pool = createDatabase(config.db);
    try {
      await migrateDatabase(pool, { logger: console });
      console.log('Migration completed successfully.');
      await pool.end();
      process.exit(0);
    } catch (err) {
      console.error('Migration failed:', err);
      await pool.end().catch(() => {});
      process.exit(1);
    }
  })();
}

module.exports = {
  migrateDatabase,
  columnExists,
  getColumnType,
  tableExists,
  foreignKeyExists
};
