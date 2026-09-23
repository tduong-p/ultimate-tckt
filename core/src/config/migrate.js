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

  // 9. Email + Cron module
  if (await tableExists(db, 'users') && !(await columnExists(db, 'users', 'is_devops'))) {
    log('Adding users.is_devops');
    await db.query('ALTER TABLE users ADD COLUMN is_devops TINYINT(1) NOT NULL DEFAULT 0 AFTER role');
  }
  if (!(await tableExists(db, 'email_settings'))) {
    log('Creating table email_settings');
    await db.query(`
      CREATE TABLE IF NOT EXISTS email_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value TEXT,
        is_secret TINYINT(1) NOT NULL DEFAULT 0,
        updated_by INT UNSIGNED,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  }
  if (!(await tableExists(db, 'email_templates'))) {
    log('Creating table email_templates');
    await db.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        template_key VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(180) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        body_html MEDIUMTEXT NOT NULL,
        variables_hint JSON,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_by INT UNSIGNED,
        updated_by INT UNSIGNED,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  }
  if (!(await tableExists(db, 'email_rules'))) {
    log('Creating table email_rules');
    await db.query(`
      CREATE TABLE IF NOT EXISTS email_rules (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(180) NOT NULL,
        event_key VARCHAR(100) NOT NULL,
        template_id INT UNSIGNED NOT NULL,
        conditions JSON,
        recipients JSON NOT NULL,
        priority INT NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 0,
        created_by INT UNSIGNED,
        updated_by INT UNSIGNED,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (template_id) REFERENCES email_templates(id)
      )
    `);
  }
  if (!(await tableExists(db, 'email_deliveries'))) {
    log('Creating table email_deliveries');
    await db.query(`
      CREATE TABLE IF NOT EXISTS email_deliveries (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        rule_id INT UNSIGNED,
        event_key VARCHAR(100) NOT NULL,
        template_id INT UNSIGNED,
        recipient_email VARCHAR(255) NOT NULL,
        subject_rendered VARCHAR(255),
        status ENUM('pending','success','failed') NOT NULL DEFAULT 'pending',
        error_message TEXT,
        dedupe_key VARCHAR(190) NOT NULL,
        event_payload_snapshot JSON,
        sent_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY email_deliveries_dedupe (dedupe_key)
      )
    `);
  }
  if (!(await tableExists(db, 'cron_jobs'))) {
    log('Creating table cron_jobs');
    await db.query(`
      CREATE TABLE IF NOT EXISTS cron_jobs (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        job_key VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(180) NOT NULL,
        handler_key VARCHAR(100) NOT NULL,
        schedule VARCHAR(100) NOT NULL,
        timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
        is_active TINYINT(1) NOT NULL DEFAULT 0,
        last_run_at TIMESTAMP NULL,
        last_status ENUM('success','failed','running') NULL,
        last_error TEXT,
        created_by INT UNSIGNED,
        updated_by INT UNSIGNED,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  }
  if (!(await tableExists(db, 'cron_job_runs'))) {
    log('Creating table cron_job_runs');
    await db.query(`
      CREATE TABLE IF NOT EXISTS cron_job_runs (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        cron_job_id INT UNSIGNED NOT NULL,
        started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        finished_at TIMESTAMP NULL,
        status ENUM('success','failed','running') NOT NULL DEFAULT 'running',
        error_message TEXT,
        result_summary VARCHAR(500),
        FOREIGN KEY (cron_job_id) REFERENCES cron_jobs(id)
      )
    `);
  }

  // 10. Seed default templates + active rules for events migrated from the legacy mailer.js system.
  if (await tableExists(db, 'email_templates') && await tableExists(db, 'email_rules')) {
    const defaults = [
      {
        templateKey: 'activity_proposed',
        name: 'Hoạt động mới chờ duyệt',
        eventKey: 'activity.proposed',
        subject: '[TCKT Activity Hub] Hoạt động mới chờ duyệt: {{activity.title}}',
        bodyHtml: '<p>{{proposed_by}} vừa tạo đề xuất hoạt động “{{activity.title}}”.</p><p>Loại hoạt động: {{activity.type}}<br>Ngày bắt đầu: {{activity.start_date}}<br>Hạn hoạt động: {{activity.deadline}}<br>Mức ưu tiên: {{activity.priority}}</p><p><a href="{{url}}">Xem và duyệt hoạt động</a></p>',
        recipients: [{ type: 'role', value: 'admin' }, { type: 'role', value: 'vice_admin' }]
      },
      {
        templateKey: 'activity_rejected',
        name: 'Đề án bị từ chối',
        eventKey: 'activity.rejected',
        subject: '[TCKT Activity Hub] Đề án "{{activity.title}}" đã bị từ chối',
        bodyHtml: '<p>Xin chào {{creator.name}},</p><p>{{decided_by}} vừa cập nhật đề án "{{activity.title}}": đã bị từ chối.</p><p>{{feedback_note}}</p><p><a href="{{url}}">Xem đề án</a></p>',
        recipients: [{ type: 'payload_path', value: 'creator.email' }]
      },
      {
        templateKey: 'activity_changes_requested',
        name: 'Đề án cần chỉnh sửa',
        eventKey: 'activity.changes_requested',
        subject: '[TCKT Activity Hub] Đề án "{{activity.title}}" cần được chỉnh sửa',
        bodyHtml: '<p>Xin chào {{creator.name}},</p><p>{{decided_by}} vừa cập nhật đề án "{{activity.title}}": cần được chỉnh sửa.</p><p>{{feedback_note}}</p><p><a href="{{url}}">Xem đề án</a></p>',
        recipients: [{ type: 'payload_path', value: 'creator.email' }]
      },
      {
        templateKey: 'activity_participant_added',
        name: 'Thêm vào hoạt động',
        eventKey: 'activity.participant_added',
        subject: '[TCKT Activity Hub] Bạn được thêm vào hoạt động: {{activity.title}}',
        bodyHtml: '<p>Xin chào {{user.name}},</p><p>{{added_by}} vừa thêm bạn vào hoạt động “{{activity.title}}”.</p><p>Hạn hoạt động: {{activity.deadline}}<br>Vai trò/Nhiệm vụ: {{responsibility}}</p><p><a href="{{url}}">Xem hoạt động</a></p>',
        recipients: [{ type: 'payload_path', value: 'user.email' }]
      },
      {
        templateKey: 'task_assigned',
        name: 'Công việc mới',
        eventKey: 'task.assigned',
        subject: '[TCKT Activity Hub] Công việc mới: {{task.title}}',
        bodyHtml: '<p>Xin chào {{user.name}},</p><p>{{assigned_by}} vừa giao cho bạn một công việc trong hoạt động “{{task.activity_title}}”.</p><p>Công việc: {{task.title}}<br>Hạn hoàn thành: {{task.deadline}}<br>Mức ưu tiên: {{task.priority}}<br>Sản phẩm cần bàn giao: {{task.deliverable}}</p><p><a href="{{url}}">Mở hoạt động</a></p>',
        recipients: [{ type: 'payload_path', value: 'user.email' }]
      },
      {
        templateKey: 'task_response_posted',
        name: 'Phản hồi công việc mới',
        eventKey: 'task.response_posted',
        subject: '[TCKT Activity Hub] Phản hồi mới cho công việc: {{task.title}}',
        bodyHtml: '<p>Xin chào {{owner.name}},</p><p>{{responded_by}} vừa phản hồi công việc “{{task.title}}” trong hoạt động “{{task.activity_title}}”.</p><p>Loại phản hồi: {{response_kind_label}}<br>Nội dung: {{response_body}}</p><p><a href="{{url}}">Xem phản hồi</a></p>',
        recipients: [{ type: 'payload_path', value: 'owner.email' }]
      },
      {
        templateKey: 'task_submitted_for_review',
        name: 'Cần nghiệm thu',
        eventKey: 'task.submitted_for_review',
        subject: '[TCKT Activity Hub] Cần nghiệm thu: {{task.title}}',
        bodyHtml: '<p>Xin chào {{reviewer.name}},</p><p>{{submitted_by}} vừa nộp sản phẩm cho công việc "{{task.title}}" trong hoạt động "{{task.activity_title}}". Vui lòng kiểm tra và nghiệm thu.</p><p><a href="{{url}}">Xem và nghiệm thu</a></p>',
        recipients: [{ type: 'payload_path', value: 'reviewer.email' }]
      },
      {
        templateKey: 'task_reviewed',
        name: 'Kết quả nghiệm thu công việc',
        eventKey: 'task.reviewed',
        subject: '[TCKT Activity Hub] {{heading}}: {{task.title}}',
        bodyHtml: '<p>Xin chào {{user.name}},</p><p>{{reviewed_by}} đã {{action_text}} công việc "{{task.title}}".</p><p>{{feedback_note}}</p><p><a href="{{url}}">Xem công việc</a></p>',
        recipients: [{ type: 'payload_path', value: 'user.email' }]
      },
      {
        templateKey: 'task_deadline_soon',
        name: 'Công việc sắp đến hạn',
        eventKey: 'task.deadline_soon',
        subject: '[TCKT Activity Hub] Sắp đến hạn: {{task.title}}',
        bodyHtml: '<p>Xin chào {{user.name}},</p><p>Công việc "{{task.title}}" trong hoạt động "{{task.activity_title}}" sẽ đến hạn trong {{window_text}} tới.</p><p>Hạn hoàn thành: {{task.deadline}}</p><p><a href="{{url}}">Xem công việc</a></p>',
        recipients: [{ type: 'payload_path', value: 'user.email' }]
      },
      {
        templateKey: 'task_overdue',
        name: 'Công việc quá hạn',
        eventKey: 'task.overdue',
        subject: '[TCKT Activity Hub] Quá hạn: {{task.title}}',
        bodyHtml: '<p>Xin chào {{user.name}},</p><p>Công việc "{{task.title}}" trong hoạt động "{{task.activity_title}}" đã quá hạn vào ngày {{task.deadline}}. Vui lòng cập nhật tiến độ hoặc nộp sản phẩm.</p><p><a href="{{url}}">Xem công việc</a></p>',
        recipients: [{ type: 'payload_path', value: 'user.email' }]
      },
      {
        templateKey: 'task_unacknowledged',
        name: 'Thành viên chưa xác nhận nhận việc',
        eventKey: 'task.unacknowledged',
        subject: '[TCKT Activity Hub] Thành viên chưa xác nhận việc: {{task.title}}',
        bodyHtml: '<p>Xin chào {{lead.name}},</p><p>Thành viên {{member_name}} được giao công việc "{{task.title}}" nhưng chưa xác nhận nhận việc sau 24 giờ.</p><p><a href="{{url}}">Xem công việc</a></p>',
        recipients: [{ type: 'payload_path', value: 'lead.email' }]
      }
    ];
    for (const item of defaults) {
      const [existingTemplates] = await db.execute('SELECT id FROM email_templates WHERE template_key=?', [item.templateKey]);
      let templateId = existingTemplates[0]?.id;
      if (!templateId) {
        log(`Seeding email template '${item.templateKey}' for migrated event '${item.eventKey}'`);
        const [result] = await db.execute(
          'INSERT INTO email_templates(template_key,name,subject,body_html,is_active) VALUES(?,?,?,?,1)',
          [item.templateKey, item.name, item.subject, item.bodyHtml]
        );
        templateId = result.insertId;
      }
      const [existingRules] = await db.execute('SELECT id FROM email_rules WHERE event_key=? AND name=?', [item.eventKey, item.name]);
      if (!existingRules.length) {
        log(`Seeding active email rule for event '${item.eventKey}'`);
        await db.execute(
          "INSERT INTO email_rules(name,event_key,template_id,conditions,recipients,is_active) VALUES(?,?,?,NULL,?,1)",
          [item.name, item.eventKey, templateId, JSON.stringify(item.recipients)]
        );
      }
    }
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
