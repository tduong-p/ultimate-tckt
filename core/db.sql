-- Fresh empty database only. Full current schema and fictional sample data.
SET NAMES utf8mb4;
SET time_zone = '+07:00';

CREATE TABLE IF NOT EXISTS teams (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  color CHAR(7) NOT NULL DEFAULT '#1E3A8A',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','vice_admin','leader','vice_leader','member') NOT NULL DEFAULT 'member',
  auth_provider ENUM('local','microsoft') NOT NULL DEFAULT 'local',
  phone VARCHAR(30),
  class_number VARCHAR(100),
  faculty_notice_acknowledged_at DATETIME,
  avatar_color CHAR(7) NOT NULL DEFAULT '#1E3A8A',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_teams (
  user_id INT UNSIGNED NOT NULL,
  team_id INT UNSIGNED NOT NULL,
  is_lead BOOLEAN NOT NULL DEFAULT FALSE,
  is_vice_lead BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (user_id, team_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activities (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  public_image_url VARCHAR(1000),
  proposal_document_url VARCHAR(1000),
  type ENUM('event','assigned') NOT NULL,
  status ENUM('proposed','changes_requested','approved','active','completed','cancelled') NOT NULL DEFAULT 'proposed',
  priority ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  team_id INT UNSIGNED NOT NULL,
  creator_id INT UNSIGNED NOT NULL,
  event_lead_id INT UNSIGNED,
  requested_by VARCHAR(160),
  location VARCHAR(180),
  start_date DATE,
  deadline DATE NOT NULL,
  result_summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FULLTEXT KEY activity_search (title, description, result_summary),
  INDEX activities_public (is_public, created_at),
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (creator_id) REFERENCES users(id),
  FOREIGN KEY (event_lead_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS activity_teams (
  activity_id INT UNSIGNED NOT NULL,
  team_id INT UNSIGNED NOT NULL,
  role ENUM('primary','supporting') NOT NULL DEFAULT 'supporting',
  responsibility VARCHAR(255),
  contact_user_id INT UNSIGNED,
  PRIMARY KEY (activity_id, team_id),
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (contact_user_id) REFERENCES users(id) ON DELETE SET NULL
);

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
);

CREATE TABLE IF NOT EXISTS tasks (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  activity_id INT UNSIGNED NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT,
  stage ENUM('before','during','after','general') NOT NULL DEFAULT 'general',
  status ENUM('todo','in_progress','review','done','cancelled') NOT NULL DEFAULT 'todo',
  priority ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  team_id INT UNSIGNED NOT NULL,
  primary_assignee_id INT UNSIGNED,
  assigned_by INT UNSIGNED,
  start_date DATE,
  deadline DATE NOT NULL,
  deliverable VARCHAR(255),
  is_self_logged BOOLEAN NOT NULL DEFAULT FALSE,
  weight TINYINT UNSIGNED NOT NULL DEFAULT 1,
  submitted_for_review_at DATETIME,
  reviewed_by INT UNSIGNED,
  reviewed_at DATETIME,
  review_feedback TEXT,
  completed_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (primary_assignee_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS task_assignees (
  task_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_at DATETIME,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (task_id, user_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS task_attachments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  task_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  kind ENUM('clarification','evidence','issue','deliverable') NOT NULL DEFAULT 'clarification',
  label VARCHAR(180) NOT NULL,
  link_url VARCHAR(1000),
  stored_name VARCHAR(255),
  original_name VARCHAR(255),
  mime_type VARCHAR(120),
  size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

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
);

CREATE TABLE IF NOT EXISTS weight_presets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(120) NOT NULL,
  points TINYINT UNSIGNED NOT NULL DEFAULT 1,
  description VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO weight_presets (id, label, points, description, is_active, sort_order) VALUES
(1, '0 — Tham gia / Hỗ trợ nhẹ', 0, 'Không tính điểm khối lượng', 1, 1),
(2, '1 — Tiêu chuẩn / Lặp lại', 1, 'Trực phòng làm việc, trực bàn sự kiện, chuẩn bị hậu cần', 1, 2),
(3, '2 — Trung bình / Có sản phẩm', 2, 'Thiết kế ấn phẩm, viết bài truyền thông, phụ trách kỹ thuật', 1, 3),
(4, '3 — Trọng trách / Đột xuất', 3, 'Xử lý sự cố gấp, quản lý khu vực sự kiện', 1, 4),
(5, '5 — Trọng điểm / Quy mô lớn', 5, 'Điều phối chính, phụ trách toàn bộ 1 mảng lớn', 1, 5)
ON DUPLICATE KEY UPDATE id=id;

CREATE TABLE IF NOT EXISTS participants (
  activity_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  state ENUM('volunteered','confirmed','declined') NOT NULL DEFAULT 'volunteered',
  responsibility VARCHAR(255),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (activity_id, user_id),
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS updates (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  activity_id INT UNSIGNED NOT NULL,
  task_id INT UNSIGNED,
  user_id INT UNSIGNED NOT NULL,
  tagged_user_id INT UNSIGNED,
  body TEXT NOT NULL,
  kind ENUM('comment','progress','evidence','issue','review_note') NOT NULL DEFAULT 'comment',
  attachment_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (tagged_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS update_tagged_users (
  update_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (update_id, user_id),
  INDEX update_tagged_users_user (user_id),
  FOREIGN KEY (update_id) REFERENCES updates(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  link_url VARCHAR(1000) NOT NULL,
  description TEXT NOT NULL,
  applicable_year SMALLINT UNSIGNED NOT NULL,
  issuing_team_id INT UNSIGNED NOT NULL,
  visibility ENUM('all_teams','issuing_team') NOT NULL DEFAULT 'issuing_team',
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX documents_year (applicable_year),
  INDEX documents_team (issuing_team_id),
  FOREIGN KEY (issuing_team_id) REFERENCES teams(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  activity_id INT UNSIGNED,
  task_id INT UNSIGNED,
  kind VARCHAR(50) NOT NULL,
  title VARCHAR(180) NOT NULL,
  body VARCHAR(500) NOT NULL,
  url VARCHAR(500),
  source_key VARCHAR(190) NOT NULL,
  email_status ENUM('pending','success','failed') NULL,
  push_status ENUM('pending','success','failed') NULL,
  seen_at TIMESTAMP NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY notifications_user_source (user_id, source_key),
  INDEX notifications_inbox (user_id, seen_at, created_at),
  INDEX notifications_expiry (expires_at),
  INDEX notifications_activity (activity_id),
  INDEX notifications_task (task_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);


INSERT INTO teams (id,name,description,color) VALUES (1,'Ban mẫu','Ban giả định để kiểm tra triển khai','#1E3A8A');
INSERT INTO users (id,name,email,password_hash,role,auth_provider) VALUES (1,'Quản trị viên mẫu','admin@example.com','$2b$10$vG4lMlOx27NeDAbm3gBbdeg0ENIADakzjdR0OggZLZp7IpjPaMfK.','admin','local');
INSERT INTO user_teams (user_id,team_id,is_lead) VALUES (1,1,1);
INSERT INTO activities (id,title,description,type,status,team_id,creator_id,event_lead_id,deadline) VALUES (1,'Hoạt động mẫu','Thay thế hoạt động giả định này sau khi xác minh triển khai.','event','approved',1,1,1,DATE_ADD(CURDATE(), INTERVAL 14 DAY));
INSERT INTO activity_teams (activity_id,team_id,role) VALUES (1,1,'primary');
INSERT INTO tasks (activity_id,title,team_id,primary_assignee_id,assigned_by,deadline) VALUES (1,'Xác minh triển khai',1,1,1,DATE_ADD(CURDATE(), INTERVAL 7 DAY));
INSERT INTO task_assignees (task_id,user_id,is_primary) VALUES (LAST_INSERT_ID(),1,1);
