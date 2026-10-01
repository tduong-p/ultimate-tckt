# Schema Contract — Multi-Unit Platform (Developer 1 → Developer 2 & 3)

**Date:** 2026-09-27  
**From:** Developer 1 (Migration & Schema)  
**To:** Developer 2 (Authorization), Developer 3 (Directives API)

## Purpose

This document defines the database schema contract for multi-unit platform implementation. Developer 2 and Developer 3 can start implementation based on this schema without waiting for migration PR to merge.

## New Tables

### `org_units` — Organization Unit Registry

```sql
CREATE TABLE org_units (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  kind ENUM('platform_owner','standing_committee','department','office','party_cell','grassroots') NOT NULL,
  parent_id INT UNSIGNED NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_org_units_parent FOREIGN KEY (parent_id) REFERENCES org_units(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Seeded units:**
- `DYC` (platform_owner) — Chủ quản nền tảng
- `BTV` (standing_committee) — Ban Thường vụ
- `TCKT` (department) — Ban Tổ chức – Kiểm tra
- `VPD` (office) — Văn phòng Đoàn
- `CHIBO` (party_cell) — Chi bộ
- `DEMO-DT-01`, `DEMO-LCD-01` (grassroots) — Dữ liệu giả

### `unit_memberships` — User-Unit Membership

```sql
CREATE TABLE unit_memberships (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE,
  user_id INT UNSIGNED NOT NULL,
  unit_id INT UNSIGNED NOT NULL,
  role VARCHAR(32) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, unit_id),
  INDEX unit_memberships_unit (unit_id, role),
  CONSTRAINT fk_unit_memberships_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_unit_memberships_unit FOREIGN KEY (unit_id) REFERENCES org_units(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Valid roles by kind:**
- `platform_owner`: `dyc_admin`, `dyc_engineer`
- `standing_committee`: `btv_lead`, `btv_member`
- `department`: `admin`, `vice_admin`, `leader`, `vice_leader`, `member`
- `office`: `officer`
- `party_cell`: `observer`
- `grassroots`: `officer`

**Note:** Existing users get TCKT membership with their current `users.role`.

### `unit_modules` — Module Access per Unit

```sql
CREATE TABLE unit_modules (
  unit_id INT UNSIGNED NOT NULL,
  module_id VARCHAR(40) NOT NULL,
  PRIMARY KEY (unit_id, module_id),
  CONSTRAINT fk_unit_modules_unit FOREIGN KEY (unit_id) REFERENCES org_units(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Seeded module access:**
- TCKT: `dieu-hanh`, `ctd`
- BTV: `dieu-hanh`, `ctd`
- VPD, CHIBO, grassroots: `ctd` only
- DYC: no modules

### `unit_visibility_policies` — Cross-Unit Read Access

```sql
CREATE TABLE unit_visibility_policies (
  viewer_unit_id INT UNSIGNED NOT NULL,
  owner_unit_id INT UNSIGNED NOT NULL,
  level ENUM('summary','tasks_readonly','full_readonly') NOT NULL,
  updated_by INT UNSIGNED NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (viewer_unit_id, owner_unit_id),
  CONSTRAINT fk_visibility_viewer FOREIGN KEY (viewer_unit_id) REFERENCES org_units(id) ON DELETE CASCADE,
  CONSTRAINT fk_visibility_owner FOREIGN KEY (owner_unit_id) REFERENCES org_units(id) ON DELETE CASCADE,
  CONSTRAINT fk_visibility_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Seeded policy:** BTV → TCKT = `summary`

### `setting_locks` — DYC Platform Setting Locks

```sql
CREATE TABLE setting_locks (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(80) NOT NULL,
  unit_id INT UNSIGNED NULL,
  locked_by INT UNSIGNED NULL,
  reason VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX setting_locks_key (setting_key, unit_id),
  CONSTRAINT fk_setting_locks_unit FOREIGN KEY (unit_id) REFERENCES org_units(id) ON DELETE CASCADE,
  CONSTRAINT fk_setting_locks_user FOREIGN KEY (locked_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `audit_logs` — Cross-Unit Access Audit

```sql
CREATE TABLE audit_logs (
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
  INDEX audit_logs_actor (actor_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**No FK to users/org_units** — logs must survive user/unit deletion.

### `directives` — BTV → TCKT Assignment

```sql
CREATE TABLE directives (
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
  CONSTRAINT fk_directives_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `submissions` — Unit Reporting

```sql
CREATE TABLE submissions (
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
  CONSTRAINT fk_submissions_responder FOREIGN KEY (responded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `ops_logs` — Operations Duty Logs

```sql
CREATE TABLE ops_logs (
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
  CONSTRAINT fk_ops_logs_recorder FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `ops_log_attendance` — Attendance Records

```sql
CREATE TABLE ops_log_attendance (
  ops_log_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  status ENUM('present','late','absent_excused','absent') NOT NULL,
  note VARCHAR(255) NULL,
  PRIMARY KEY (ops_log_id, user_id),
  CONSTRAINT fk_ops_attendance_log FOREIGN KEY (ops_log_id) REFERENCES ops_logs(id) ON DELETE CASCADE,
  CONSTRAINT fk_ops_attendance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Modified Existing Tables

### `teams` — Added `unit_id`

```sql
ALTER TABLE teams ADD COLUMN unit_id INT UNSIGNED NOT NULL;
ALTER TABLE teams ADD INDEX teams_unit (unit_id);
ALTER TABLE teams ADD CONSTRAINT fk_teams_unit FOREIGN KEY (unit_id) REFERENCES org_units(id);
```

**Backfill:** All existing teams assigned to TCKT.

### `activities` — Added `unit_id` and `directive_id`

```sql
ALTER TABLE activities ADD COLUMN unit_id INT UNSIGNED NOT NULL;
ALTER TABLE activities ADD COLUMN directive_id INT UNSIGNED NULL;
ALTER TABLE activities ADD INDEX activities_unit (unit_id);
ALTER TABLE activities ADD INDEX activities_directive (directive_id);
ALTER TABLE activities ADD CONSTRAINT fk_activities_unit FOREIGN KEY (unit_id) REFERENCES org_units(id);
ALTER TABLE activities ADD CONSTRAINT fk_activities_directive FOREIGN KEY (directive_id) REFERENCES directives(id) ON DELETE SET NULL;
```

**Backfill:** All existing activities assigned to TCKT.

## Migration Markers

### `platform_migrations` Table

```sql
CREATE TABLE platform_migrations (
  name VARCHAR(80) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Markers:**
- `multi_unit_backfill_v1` — Main backfill (units, memberships, modules, policy)
- `devops_to_dyc_membership_v1` — DevOps user migration to DYC

## Code References

**Catalog (source of truth):**
```javascript
const { SEED_UNITS, SEED_UNIT_MODULES, UNIT_ROLES } = require('./src/units/catalog');
```

Located at: `core/src/units/catalog.js`

## For Developer 2 (Authorization)

**Unit context interface:**
```javascript
req.unit       // Current org_units row { id, code, name, kind, ... }
req.unitRole   // User's role in current unit (from unit_memberships)
req.memberships // Array of all user's memberships [{ unit_id, role }, ...]
```

**Scope function signature (proposed):**
```javascript
scopeFor(viewer, resourceType, ownerUnitId) → { sql, params }
```

Returns SQL WHERE condition + params for cross-unit access control.

## For Developer 3 (Directives API)

**Directive workflow states:**
- `sent` → `acknowledged` → `in_progress` → `submitted` → `accepted`
- `submitted` → `revision_requested` → `in_progress` (loop)

**Submission source types:** `activity`, `ops_log`, `report`

**Key constraints:**
- Only BTV can create directives
- Only TCKT admin/vice_admin can acknowledge
- Response requires submission linked to directive

## Migration Safety

- **Idempotent:** Safe to run multiple times
- **Markers:** Check `platform_migrations` before backfill
- **Transactions:** Backfill runs in transaction, rolls back on error
- **No data loss:** Existing teams/activities preserved with TCKT assignment

## Testing

Run migration tests:
```bash
cd core
npm test -- tests/migrate.units.test.js
npm test -- tests/units.catalog.test.js
```

All tests should pass before integration.

---

**Developer 1 Status:** ✅ Schema design complete, migration tested, ready for Day 2+ integration.
