---
doc_id: SPEC-UNIT-004
title: Kế hoạch triển khai — GĐ1-A Nền tảng đa đơn vị trong Core
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: []
---

# GĐ1-A: Nền tảng đa đơn vị trong Core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Core biết "đơn vị": mỗi người có membership theo đơn vị, quyền tính theo đơn vị đang chọn, DYC là admin global chỉ đọc có audit, setting có `managed_by` + khoá DYC, và có API quản lý membership — trong khi toàn bộ tính năng Điều hành cũ của TCKT chạy y như trước.

**Architecture:** Một migration idempotent tạo toàn bộ bảng đa đơn vị (§5.1) và backfill một lần (có marker). Middleware toàn cục `loadUnitContext` gắn `req.memberships`, `req.unit`, `req.unitRole` và `req.actor` (user với `role` = role TCKT của membership, hoặc `admin` cho DYC khi đọc, hoặc `null`). Route Điều hành cũ được bọc bởi `legacyGate` (chỉ TCKT, hoặc DYC đọc có audit; còn lại 403) và đọc quyền từ `req.actor` thay vì `req.session.user`. Setting đi qua `settingGuard(key)` theo catalog `managed_by`.

**Tech Stack:** Node 22, Express 5, mysql2, MySQL 8, `node --test`.

**Spec:** `.kiro/specs/nen-tang-da-don-vi/design.md` (+ `requirements.md`, `tasks.md`). Plan này phủ `tasks.md` mục 1, 2, 3, 4 và phần backend của 8. Các plan sau: GĐ1-B (Điều hành: directives/submissions/scopeFor/ops_logs + test chống rò rỉ mức `summary`), GĐ1-C (module registry + gateway + JWT bridge + CTD), GĐ1-D (shell `web/` + chuyển màn hình), GĐ1-E (email + cron thật).

## Global Constraints

- Đơn vị và role theo `kind` (design §2): `platform_owner` DYC: `dyc_admin`, `dyc_engineer`; `standing_committee` BTV: `btv_lead`, `btv_member`; `department` TCKT: `admin`, `vice_admin`, `leader`, `vice_leader`, `member`; `office` VP Đoàn: `officer`; `party_cell` Chi bộ: `observer`; `grassroots` ĐT/LCĐ: `officer`.
- Role gắn với **từng membership**, không gắn với user. Mỗi người có thể thuộc nhiều đơn vị.
- ĐT/LCĐ trong GĐ1 là **dữ liệu giả, đánh dấu rõ là giả**; thay bằng danh sách thật trước khi mở cho người dùng thật.
- `unit_modules` seed: TCKT `dieu-hanh`,`ctd`; BTV `dieu-hanh`,`ctd`; VP Đoàn, Chi bộ, ĐT/LCĐ: `ctd`.
- `unit_visibility_policies` seed BTV→TCKT = `summary`.
- `users.role` **giữ trong GĐ1** như bản sao role TCKT; code mới đọc từ `unit_memberships`. Hai chiều phải đồng bộ.
- `users.is_devops=1` → membership DYC `dyc_engineer`. Email trong `DEVOPS_EMAILS` luôn được đảm bảo membership `dyc_admin` mỗi lần khởi động (chống khoá ngoài).
- DYC là admin global: đọc được mọi dữ liệu nghiệp vụ (không 403), **mỗi lượt đọc liên đơn vị ghi `audit_logs`**. Người ngoài đơn vị chỉ đọc; mọi thao tác ghi khác từ đơn vị ngoài trả 403.
- `current_unit_id` không thuộc membership → chuyển về membership đầu tiên. Không có membership nào → 403.
- Migration duy nhất, idempotent, chạy qua `npm run migrate` (và auto-migrate lúc khởi động).
- Setting `managed_by`: `platform` (SMTP, cron jobs, đơn vị, membership ngoài đơn vị mình, danh mục module) chỉ DYC; `unit` (email templates, email rules, mức xem, weight presets) admin đơn vị sửa được trừ khi có dòng `setting_locks`. Server trả 403 **kèm lý do khoá**.
- `audit_logs` GĐ1 ghi: truy cập liên đơn vị, đổi mức xem, khoá/mở khoá setting, đổi membership.
- Tài liệu: mọi thay đổi code phải cập nhật tài liệu liên quan + tăng `version` + thêm dòng lịch sử trong cùng PR (`npm run docs:index && npm run docs:check -- --base origin/staging` ở gốc repo phải xanh).
- Không ghi secret/mật khẩu vào repo hay tài liệu.

## Review Focus

1. **Migration lỗi trên production thì app vẫn chạy** (`runtime.js` nuốt lỗi auto-migrate) → mọi người dính 403 "chưa thuộc đơn vị". Kỳ vọng: migration đa đơn vị chạy trong transaction từng bước và test chạy trên bản sao dữ liệu thật (staging) trước khi lên `main`; runbook ghi cách kiểm `SELECT COUNT(*) FROM unit_memberships`.
2. **Đổi role qua UI cũ (`PATCH /api/users/:id`, tạo user, bulk import, SSO lần đầu)** mà membership TCKT không đổi theo → quyền thật khác quyền hiển thị. Kỳ vọng: mọi đường ghi `users.role` đều đồng bộ membership TCKT (Task 8 test từng đường).
3. **Người dùng SSO mới đăng nhập lần đầu** bị 403 vì chưa có membership. Kỳ vọng: giữ hành vi cũ — tài khoản HUST mới là `member` của TCKT (Task 8).
4. **Email trong `DEVOPS_EMAILS` chưa có tài khoản lúc khởi động**. Kỳ vọng: được cấp `dyc_admin` ngay lần đăng nhập đầu, không phải đợi restart (Task 6).
5. **Session cũ trỏ tới đơn vị đã bị gỡ membership hoặc đơn vị bị tắt `is_active=0`**. Kỳ vọng: tự rơi về membership đầu tiên còn hiệu lực, không 500 (Task 4).

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `core/src/units/catalog.js` (mới) | Hằng số thuần: kind, role hợp lệ theo kind, role admin theo kind, seed đơn vị/module |
| `core/src/units/memberships.js` (mới) | Truy vấn membership: `unitIdByCode`, `listMemberships`, `upsertMembership`, `removeMembership`, `syncTcktMembershipFromRole`, `ensureDycAdmins`, `hasDycMembership` |
| `core/src/services/audit.js` (mới) | `recordAudit(db, entry)` |
| `core/src/config/migrate-units.js` (mới) | Bước migration đa đơn vị, gọi từ `migrateDatabase` |
| `core/src/middleware/unit-context.js` (mới) | `createUnitContext(db)` → middleware `loadUnitContext`; `legacyRole` |
| `core/src/middleware/legacy-gate.js` (mới) | `LEGACY_PREFIXES`, `createLegacyGate({ db })` |
| `core/src/settings/catalog.js` (mới) | `SETTINGS` key → `managed_by` |
| `core/src/middleware/setting-guard.js` (mới) | `createSettingGuard(db)` → `settingGuard(key)` |
| `core/src/routes/units.js` (mới) | API đơn vị + membership + khoá setting |
| `core/src/middleware/auth.js` | `auth` thêm 403 không membership; `admin`/`manager`/`managerOrEventLead` đọc `req.actor`; `platformAdmin` thay `devops` |
| `core/src/app.js`, `core/src/runtime.js`, `core/src/routes/*.js` | Nối middleware, thay `req.session.user` → `req.actor` trong route Điều hành |
| `core/tests/helpers/db.js`, `core/tests/helpers/fixtures.js` | DB test chạy migrate; fixture tạo membership |

---

### Task 1: Catalog đơn vị và role

**Files:**
- Create: `core/src/units/catalog.js`
- Test: `core/tests/units.catalog.test.js`

**Interfaces:**
- Produces: `UNIT_ROLES` (object kind → string[]), `UNIT_ADMIN_ROLES` (kind → string[]), `TCKT_CODE = 'TCKT'`, `DYC_CODE = 'DYC'`, `SEED_UNITS` (array `{code,name,kind}`), `SEED_UNIT_MODULES` (code → string[]), `isValidRole(kind, role) → boolean`, `isUnitAdmin(kind, role) → boolean`.

- [ ] **Step 1: Write the failing test**

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { UNIT_ROLES, SEED_UNITS, SEED_UNIT_MODULES, isValidRole, isUnitAdmin, TCKT_CODE, DYC_CODE } = require('../src/units/catalog');

test('role validity is checked against the unit kind', () => {
  assert.equal(isValidRole('department', 'vice_leader'), true);
  assert.equal(isValidRole('department', 'btv_lead'), false);
  assert.equal(isValidRole('standing_committee', 'btv_member'), true);
  assert.equal(isValidRole('platform_owner', 'dyc_engineer'), true);
  assert.equal(isValidRole('party_cell', 'observer'), true);
  assert.equal(isValidRole('grassroots', 'officer'), true);
  assert.equal(isValidRole('nope', 'officer'), false);
  assert.deepEqual(UNIT_ROLES.department, ['admin', 'vice_admin', 'leader', 'vice_leader', 'member']);
});

test('unit admins are dyc_admin, btv_lead and TCKT admin/vice_admin only', () => {
  assert.equal(isUnitAdmin('platform_owner', 'dyc_admin'), true);
  assert.equal(isUnitAdmin('platform_owner', 'dyc_engineer'), false);
  assert.equal(isUnitAdmin('standing_committee', 'btv_lead'), true);
  assert.equal(isUnitAdmin('department', 'vice_admin'), true);
  assert.equal(isUnitAdmin('department', 'leader'), false);
  assert.equal(isUnitAdmin('office', 'officer'), false);
});

test('seed units cover every kind, codes are unique, grassroots are marked fake', () => {
  const codes = SEED_UNITS.map(u => u.code);
  assert.equal(new Set(codes).size, codes.length);
  for (const kind of Object.keys(UNIT_ROLES)) assert.ok(SEED_UNITS.some(u => u.kind === kind), kind);
  assert.ok(codes.includes(TCKT_CODE) && codes.includes(DYC_CODE));
  for (const u of SEED_UNITS.filter(x => x.kind === 'grassroots')) assert.match(u.name, /^\[Dữ liệu giả\]/);
  assert.deepEqual(SEED_UNIT_MODULES.TCKT, ['dieu-hanh', 'ctd']);
  assert.deepEqual(SEED_UNIT_MODULES.BTV, ['dieu-hanh', 'ctd']);
  for (const code of codes.filter(c => !['TCKT', 'BTV', 'DYC'].includes(c))) assert.deepEqual(SEED_UNIT_MODULES[code], ['ctd'], code);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd core && node --test tests/units.catalog.test.js`
Expected: FAIL with `Cannot find module '../src/units/catalog'`

- [ ] **Step 3: Write minimal implementation**

`core/src/units/catalog.js`:

```js
'use strict';

const UNIT_ROLES = Object.freeze({
  platform_owner: ['dyc_admin', 'dyc_engineer'],
  standing_committee: ['btv_lead', 'btv_member'],
  department: ['admin', 'vice_admin', 'leader', 'vice_leader', 'member'],
  office: ['officer'],
  party_cell: ['observer'],
  grassroots: ['officer']
});

// Role được quản lý membership của chính đơn vị mình. Đơn vị không có admin thì chỉ DYC quản lý.
const UNIT_ADMIN_ROLES = Object.freeze({
  platform_owner: ['dyc_admin'],
  standing_committee: ['btv_lead'],
  department: ['admin', 'vice_admin'],
  office: [],
  party_cell: [],
  grassroots: []
});

const DYC_CODE = 'DYC';
const TCKT_CODE = 'TCKT';

// ĐT/LCĐ là dữ liệu giả trong GĐ1 — thay bằng danh sách thật trước khi mở cho người dùng thật.
const SEED_UNITS = Object.freeze([
  { code: DYC_CODE, name: 'DYC — Chủ quản nền tảng', kind: 'platform_owner' },
  { code: 'BTV', name: 'Ban Thường vụ', kind: 'standing_committee' },
  { code: TCKT_CODE, name: 'Ban Tổ chức – Kiểm tra', kind: 'department' },
  { code: 'VPD', name: 'Văn phòng Đoàn', kind: 'office' },
  { code: 'CHIBO', name: 'Chi bộ', kind: 'party_cell' },
  { code: 'DEMO-DT-01', name: '[Dữ liệu giả] Đoàn trường mẫu 01', kind: 'grassroots' },
  { code: 'DEMO-LCD-01', name: '[Dữ liệu giả] Liên chi đoàn mẫu 01', kind: 'grassroots' }
]);

const SEED_UNIT_MODULES = Object.freeze({
  TCKT: ['dieu-hanh', 'ctd'],
  BTV: ['dieu-hanh', 'ctd'],
  VPD: ['ctd'],
  CHIBO: ['ctd'],
  'DEMO-DT-01': ['ctd'],
  'DEMO-LCD-01': ['ctd']
});

const isValidRole = (kind, role) => (UNIT_ROLES[kind] || []).includes(role);
const isUnitAdmin = (kind, role) => (UNIT_ADMIN_ROLES[kind] || []).includes(role);

module.exports = { UNIT_ROLES, UNIT_ADMIN_ROLES, DYC_CODE, TCKT_CODE, SEED_UNITS, SEED_UNIT_MODULES, isValidRole, isUnitAdmin };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd core && node --test tests/units.catalog.test.js`
Expected: PASS 3/3

- [ ] **Step 5: Commit**

```bash
git add core/src/units/catalog.js core/tests/units.catalog.test.js
git commit -m "feat(core): unit kinds, roles and seed catalog"
```

---

### Task 2: Migration đa đơn vị (bảng + seed + backfill một lần)

**Files:**
- Create: `core/src/config/migrate-units.js`
- Modify: `core/src/config/migrate.js` (gọi `migrateMultiUnit` ngay trước dòng `log('Database schema check and migration complete.')`; export thêm `indexExists`)
- Modify: `core/tests/helpers/db.js` (chạy `migrateDatabase` sau khi nạp `db.sql`)
- Test: `core/tests/migrate.units.test.js`
- Docs: `docs/dev/db-migration.md`, `docs/dev/test.md`, `docs/playbooks/doi-schema.md`

**Interfaces:**
- Consumes: `SEED_UNITS`, `SEED_UNIT_MODULES`, `TCKT_CODE`, `DYC_CODE` (Task 1); `tableExists`, `columnExists`, `foreignKeyExists` từ `migrate.js`.
- Produces: bảng `org_units`, `unit_memberships` (có cột `id` AUTO_INCREMENT UNIQUE để xác định "membership đầu tiên"), `unit_modules`, `unit_visibility_policies`, `setting_locks`, `audit_logs`, `directives`, `submissions`, `ops_logs`, `ops_log_attendance`, `platform_migrations`; cột `teams.unit_id`, `activities.unit_id` (NOT NULL, DEFAULT = id TCKT), `activities.directive_id`. Hàm `migrateMultiUnit(db, { log, tableExists, columnExists, foreignKeyExists, indexExists })`.

- [ ] **Step 1: Write the failing test**

`core/tests/migrate.units.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd core && node --test tests/migrate.units.test.js`
Expected: FAIL — `tableExists(pool,'org_units')` là `false`

- [ ] **Step 3: Write minimal implementation**

`core/src/config/migrate-units.js`:

```js
'use strict';
const { SEED_UNITS, SEED_UNIT_MODULES, TCKT_CODE, DYC_CODE } = require('../units/catalog');

const BACKFILL_MARKER = 'multi_unit_backfill_v1';
const T = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

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
    user_id INT NOT NULL,
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
    updated_by INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (viewer_unit_id, owner_unit_id),
    CONSTRAINT fk_uvp_viewer FOREIGN KEY (viewer_unit_id) REFERENCES org_units(id) ON DELETE CASCADE,
    CONSTRAINT fk_uvp_owner FOREIGN KEY (owner_unit_id) REFERENCES org_units(id) ON DELETE CASCADE,
    CONSTRAINT fk_uvp_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL) ${T}`],
  ['setting_locks', `CREATE TABLE setting_locks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(80) NOT NULL,
    unit_id INT NULL,
    locked_by INT NULL,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX setting_locks_key (setting_key, unit_id),
    CONSTRAINT fk_sl_unit FOREIGN KEY (unit_id) REFERENCES org_units(id) ON DELETE CASCADE,
    CONSTRAINT fk_sl_user FOREIGN KEY (locked_by) REFERENCES users(id) ON DELETE SET NULL) ${T}`],
  // Không có FK: log phải sống sót khi user/đơn vị bị xoá.
  ['audit_logs', `CREATE TABLE audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_id INT NULL,
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
    created_by INT NULL,
    owner_user_id INT NULL,
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
    submitted_by INT NULL,
    response ENUM('seen','revision_requested','accepted') NULL,
    response_note TEXT NULL,
    responded_by INT NULL,
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
    recorded_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX ops_logs_unit (unit_id, started_at),
    CONSTRAINT fk_ol_unit FOREIGN KEY (unit_id) REFERENCES org_units(id),
    CONSTRAINT fk_ol_by FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL) ${T}`],
  ['ops_log_attendance', `CREATE TABLE ops_log_attendance (
    ops_log_id INT NOT NULL,
    user_id INT NOT NULL,
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
```

Trong `core/src/config/migrate.js`: thêm hàm `indexExists` cạnh `foreignKeyExists`:

```js
async function indexExists(db, tableName, indexName) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [tableName, indexName]
  );
  return rows[0].count > 0;
}
```

thêm `const { migrateMultiUnit } = require('./migrate-units');` ở đầu file, và ngay trước `log('Database schema check and migration complete.');`:

```js
  // 11. Nền tảng đa đơn vị (GĐ1) — xem .kiro/specs/nen-tang-da-don-vi/design.md §5
  await migrateMultiUnit(db, { log, tableExists, columnExists, foreignKeyExists, indexExists });
```

và thêm `indexExists` vào `module.exports`.

Trong `core/tests/helpers/db.js`: sau `await admin.end();` và tạo `pool`, chạy migrate:

```js
  const pool = mysql.createPool({ ...rootConfig, database: dbName, multipleStatements: false, waitForConnections: true, connectionLimit: 5 });
  // Schema test = db.sql + migrate, giống production (bảng đa đơn vị chỉ có trong migrate).
  await migrateDatabase(pool, { logger: { info: () => {} } });
```

với `const { migrateDatabase } = require('../../src/config/migrate');` ở đầu file.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd core && node --test tests/migrate.units.test.js tests/migrate.test.js`
Expected: PASS (tất cả)

- [ ] **Step 5: Run full suite**

Run: `cd core && npm test > /tmp/core.log 2>&1; grep -E "^ℹ (tests|pass|fail)" /tmp/core.log`
Expected: `fail 0` (94 test cũ + 6 test mới; chưa code nào đọc membership nên test cũ không đổi)

- [ ] **Step 6: Docs**

- `docs/dev/db-migration.md`: thêm mục "Bước 11 — đa đơn vị": danh sách bảng, `teams/activities.unit_id` DEFAULT = id TCKT (vì sao), marker `platform_migrations.multi_unit_backfill_v1` (backfill một lần; migrate lại không thêm lại membership đã gỡ), cách kiểm sau deploy: `SELECT COUNT(*) FROM unit_memberships;` phải ≥ `SELECT COUNT(*) FROM users;`. Bump version + dòng lịch sử.
- `docs/dev/test.md`: sửa mô tả `createTestDatabase` = `db.sql` + `migrateDatabase` (giờ đúng thật). Bump.
- `docs/playbooks/doi-schema.md`: bảng mới đặt trong `migrate-units.js` hoặc bước mới của `migrate.js`; dữ liệu seed người dùng có thể sửa phải đi sau marker. Bump.

- [ ] **Step 7: Commit**

```bash
npm run docs:index && npm run docs:check -- --base origin/staging
git add core/src/config/migrate-units.js core/src/config/migrate.js core/tests/helpers/db.js core/tests/migrate.units.test.js docs/
git commit -m "feat(core): multi-unit migration with one-time backfill"
```

---

### Task 3: Fixture membership + helper truy vấn membership

**Files:**
- Create: `core/src/units/memberships.js`
- Modify: `core/tests/helpers/fixtures.js`
- Test: `core/tests/units.memberships-repo.test.js`

**Interfaces:**
- Consumes: bảng Task 2; `TCKT_CODE`, `DYC_CODE`, `isValidRole` (Task 1).
- Produces (`core/src/units/memberships.js`):
  - `unitIdByCode(db, code) → Promise<number|null>`
  - `getUnit(db, unitId) → Promise<{id,code,name,kind,is_active}|null>`
  - `listMemberships(db, userId) → Promise<Array<{unit_id,code,name,kind,role}>>` — chỉ đơn vị `is_active=1`, thứ tự `unit_memberships.id` tăng dần
  - `upsertMembership(db, userId, unitId, role) → Promise<void>` — ném `Error` có `status=400` nếu role không hợp lệ với `kind`
  - `removeMembership(db, userId, unitId) → Promise<boolean>`
  - `syncTcktMembershipFromRole(db, userId) → Promise<void>` — đọc `users.role`, upsert membership TCKT
  - `setTcktRoleColumn(db, userId, role) → Promise<void>` — ghi `users.role` (chiều ngược)
  - `ensureDycAdmins(db, emails) → Promise<number>` — số user được đảm bảo `dyc_admin`
  - `hasDycMembership(memberships) → boolean`
- Produces (fixtures): `createUser(pool, { ..., units })` — nếu không truyền `units` thì tạo membership TCKT theo `role`; `units: [['BTV','btv_lead'], ...]` thì chỉ tạo các membership đó (`units: []` = không membership). `addMembership(pool, userId, code, role)`, `unitIdByCode(pool, code)`.

- [ ] **Step 1: Write the failing test**

`core/tests/units.memberships-repo.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { createTeam, createUser, addMembership } = require('./helpers/fixtures');
const m = require('../src/units/memberships');

test('fixture user gets a TCKT membership equal to its role; units override replaces it', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    const teamId = await createTeam(pool);
    const a = await createUser(pool, { role: 'leader', team_id: teamId });
    assert.deepEqual((await m.listMemberships(pool, a.id)).map(x => [x.code, x.role]), [['TCKT', 'leader']]);
    const b = await createUser(pool, { units: [['BTV', 'btv_lead']] });
    assert.deepEqual((await m.listMemberships(pool, b.id)).map(x => [x.code, x.role]), [['BTV', 'btv_lead']]);
    const c = await createUser(pool, { units: [] });
    assert.deepEqual(await m.listMemberships(pool, c.id), []);
  } finally { await teardown(); }
});

test('listMemberships keeps insertion order and hides inactive units', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    const u = await createUser(pool, { units: [['BTV', 'btv_member']] });
    await addMembership(pool, u.id, 'TCKT', 'member');
    await addMembership(pool, u.id, 'VPD', 'officer');
    assert.deepEqual((await m.listMemberships(pool, u.id)).map(x => x.code), ['BTV', 'TCKT', 'VPD']);
    await pool.query("UPDATE org_units SET is_active=0 WHERE code='BTV'");
    assert.deepEqual((await m.listMemberships(pool, u.id)).map(x => x.code), ['TCKT', 'VPD']);
  } finally { await teardown(); }
});

test('upsertMembership rejects a role that does not fit the unit kind with status 400', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    const u = await createUser(pool, { units: [] });
    const btv = await m.unitIdByCode(pool, 'BTV');
    await assert.rejects(m.upsertMembership(pool, u.id, btv, 'admin'), e => e.status === 400);
    await m.upsertMembership(pool, u.id, btv, 'btv_member');
    await m.upsertMembership(pool, u.id, btv, 'btv_lead');
    assert.deepEqual((await m.listMemberships(pool, u.id)).map(x => x.role), ['btv_lead']);
    assert.equal(await m.removeMembership(pool, u.id, btv), true);
    assert.equal(await m.removeMembership(pool, u.id, btv), false);
  } finally { await teardown(); }
});

test('TCKT role sync works both ways', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    const u = await createUser(pool, { role: 'member', units: [] });
    await pool.query("UPDATE users SET role='vice_admin' WHERE id=?", [u.id]);
    await m.syncTcktMembershipFromRole(pool, u.id);
    assert.deepEqual((await m.listMemberships(pool, u.id)).map(x => [x.code, x.role]), [['TCKT', 'vice_admin']]);
    await m.setTcktRoleColumn(pool, u.id, 'leader');
    const [[row]] = await pool.query('SELECT role FROM users WHERE id=?', [u.id]);
    assert.equal(row.role, 'leader');
  } finally { await teardown(); }
});

test('ensureDycAdmins grants (or upgrades to) dyc_admin for existing emails only, idempotently', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    const a = await createUser(pool, { email: 'boss@hust.edu.vn' });
    const b = await createUser(pool, { email: 'eng@hust.edu.vn' });
    await addMembership(pool, b.id, 'DYC', 'dyc_engineer');
    assert.equal(await m.ensureDycAdmins(pool, ['Boss@Hust.edu.vn', 'eng@hust.edu.vn', 'ghost@hust.edu.vn']), 2);
    assert.equal(await m.ensureDycAdmins(pool, ['boss@hust.edu.vn', 'eng@hust.edu.vn']), 2);
    for (const id of [a.id, b.id]) {
      const dyc = (await m.listMemberships(pool, id)).find(x => x.code === 'DYC');
      assert.equal(dyc.role, 'dyc_admin');
    }
    assert.equal(m.hasDycMembership(await m.listMemberships(pool, a.id)), true);
    assert.equal(m.hasDycMembership([{ kind: 'department' }]), false);
  } finally { await teardown(); }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd core && node --test tests/units.memberships-repo.test.js`
Expected: FAIL with `Cannot find module '../src/units/memberships'`

- [ ] **Step 3: Write minimal implementation**

`core/src/units/memberships.js`:

```js
'use strict';
const { TCKT_CODE, DYC_CODE, isValidRole } = require('./catalog');

async function unitIdByCode(db, code) {
  const [rows] = await db.execute('SELECT id FROM org_units WHERE code=?', [code]);
  return rows[0]?.id ?? null;
}

async function getUnit(db, unitId) {
  const [rows] = await db.execute('SELECT id,code,name,kind,is_active FROM org_units WHERE id=?', [unitId]);
  return rows[0] || null;
}

async function listMemberships(db, userId) {
  const [rows] = await db.execute(
    `SELECT m.unit_id, u.code, u.name, u.kind, m.role
     FROM unit_memberships m JOIN org_units u ON u.id=m.unit_id AND u.is_active=1
     WHERE m.user_id=? ORDER BY m.id`,
    [userId]
  );
  return rows.map(r => ({ unit_id: r.unit_id, code: r.code, name: r.name, kind: r.kind, role: r.role }));
}

async function upsertMembership(db, userId, unitId, role) {
  const unit = await getUnit(db, unitId);
  if (!unit || !isValidRole(unit.kind, role)) {
    const error = new Error(`Vai trò "${role}" không hợp lệ cho đơn vị này.`);
    error.status = 400;
    throw error;
  }
  await db.execute(
    'INSERT INTO unit_memberships(user_id,unit_id,role) VALUES (?,?,?) ON DUPLICATE KEY UPDATE role=VALUES(role)',
    [userId, unitId, role]
  );
}

async function removeMembership(db, userId, unitId) {
  const [result] = await db.execute('DELETE FROM unit_memberships WHERE user_id=? AND unit_id=?', [userId, unitId]);
  return result.affectedRows > 0;
}

// users.role là bản sao role TCKT trong GĐ1 (xoá ở GĐ2). Mọi đường ghi users.role gọi hàm này.
async function syncTcktMembershipFromRole(db, userId) {
  const [rows] = await db.execute('SELECT role FROM users WHERE id=?', [userId]);
  if (!rows.length) return;
  await upsertMembership(db, userId, await unitIdByCode(db, TCKT_CODE), rows[0].role);
}

async function setTcktRoleColumn(db, userId, role) {
  await db.execute('UPDATE users SET role=? WHERE id=?', [role, userId]);
}

async function ensureDycAdmins(db, emails) {
  const list = [...new Set((emails || []).map(e => String(e).trim().toLowerCase()).filter(Boolean))];
  if (!list.length) return 0;
  const dycId = await unitIdByCode(db, DYC_CODE);
  const [users] = await db.query('SELECT id FROM users WHERE LOWER(email) IN (?)', [list]);
  for (const user of users) await upsertMembership(db, user.id, dycId, 'dyc_admin');
  return users.length;
}

const hasDycMembership = memberships => (memberships || []).some(x => x.kind === 'platform_owner');

module.exports = { unitIdByCode, getUnit, listMemberships, upsertMembership, removeMembership, syncTcktMembershipFromRole, setTcktRoleColumn, ensureDycAdmins, hasDycMembership };
```

Trong `core/tests/helpers/fixtures.js`: sau `if (overrides.team_id) {...}` trong `createUser`, trước `return`:

```js
  const units = overrides.units ?? [['TCKT', overrides.role || 'member']];
  for (const [code, role] of units) await addMembership(pool, result.insertId, code, role);
```

và thêm hai helper, export cùng các helper cũ:

```js
async function unitIdByCode(pool, code) {
  const [rows] = await pool.execute('SELECT id FROM org_units WHERE code=?', [code]);
  if (!rows.length) throw new Error(`Unknown unit ${code}`);
  return rows[0].id;
}

async function addMembership(pool, userId, code, role) {
  await pool.execute(
    'INSERT INTO unit_memberships(user_id,unit_id,role) VALUES (?,?,?) ON DUPLICATE KEY UPDATE role=VALUES(role)',
    [userId, await unitIdByCode(pool, code), role]
  );
}

module.exports = { createTeam, createUser, createActivity, createTask, unitIdByCode, addMembership };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd core && node --test tests/units.memberships-repo.test.js`
Expected: PASS 5/5

- [ ] **Step 5: Run full suite**

Run: `cd core && npm test > /tmp/core.log 2>&1; grep -E "^ℹ (tests|pass|fail)" /tmp/core.log`
Expected: `fail 0`

- [ ] **Step 6: Commit**

```bash
git add core/src/units/memberships.js core/tests/helpers/fixtures.js core/tests/units.memberships-repo.test.js
git commit -m "feat(core): membership repository and test fixtures"
```

---

### Task 4: Ngữ cảnh đơn vị, `auth` theo membership, `/api/session` có đơn vị, đồng bộ đường ghi `users.role`

**Files:**
- Create: `core/src/middleware/unit-context.js`
- Modify: `core/src/middleware/auth.js`, `core/src/app.js`, `core/src/routes/system.js` (dòng 9 `/api/session`; thêm `POST /api/session/unit`), `core/src/routes/users.js` (POST, bulk-import, PATCH), `core/src/auth/hust-account.js`
- Test: `core/tests/units.context.test.js`
- Docs: `docs/dev/phan-quyen.md`, `docs/dev/api.md`

**Interfaces:**
- Consumes: `listMemberships`, `hasDycMembership`, `syncTcktMembershipFromRole` (Task 3); `TCKT_CODE` (Task 1).
- Produces:
  - `legacyRole(memberships, method) → 'admin'|'vice_admin'|'leader'|'vice_leader'|'member'|null` — quy tắc: GET/HEAD và có membership DYC → `'admin'`; nếu không, có membership TCKT → role TCKT; còn lại `null`. **Không phụ thuộc đơn vị đang chọn** (xem Ruling bên dưới).
  - `createUnitContext(db) → middleware` gắn `req.memberships` (mảng từ `listMemberships`), `req.unit` (`{id,code,name,kind}` hoặc `null`), `req.unitRole` (string hoặc `null`), `req.actor` (`{...req.session.user, role: legacyRole(...)}` hoặc `null` khi chưa đăng nhập).
  - `sessionView(req) → { user, units: { current, memberships } }` — `user.role` = `legacyRole(memberships,'GET') ?? users.role`, `user.is_devops` = `1` nếu có membership DYC, ngược lại `0`.
  - `auth`: 401 nếu chưa đăng nhập; 403 `{ error: 'Tài khoản chưa thuộc đơn vị nào. Liên hệ quản trị đơn vị.' }` nếu `req.memberships` rỗng.
  - `admin`, `manager`, `managerOrEventLead` đọc `req.actor` thay cho `req.session.user`.
  - `POST /api/session/unit { unit_id }` → 200 `sessionView`; 403 nếu không phải thành viên đơn vị đó.

**Ruling ghi trong plan:** role cho route Điều hành cũ lấy từ membership TCKT bất kể `current_unit_id`. Lý do: frontend `core/public/` chưa có bộ chọn đơn vị (GĐ1-D mới có); nếu tính theo đơn vị đang chọn, người thuộc cả DYC và TCKT sẽ mất quyền ghi TCKT khi đang đứng ở DYC. `current_unit_id` vẫn được lưu, trả về trong `/api/session`, và được route mới (GĐ1-B trở đi) dùng.

- [ ] **Step 1: Write the failing test**

`core/tests/units.context.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser, createTeam, addMembership, unitIdByCode } = require('./helpers/fixtures');
const { legacyRole } = require('../src/middleware/unit-context');

test('legacyRole: DYC reads as admin, TCKT role otherwise, null for outsiders', () => {
  const dyc = { code: 'DYC', kind: 'platform_owner', role: 'dyc_engineer' };
  const tckt = { code: 'TCKT', kind: 'department', role: 'leader' };
  const btv = { code: 'BTV', kind: 'standing_committee', role: 'btv_lead' };
  assert.equal(legacyRole([dyc], 'GET'), 'admin');
  assert.equal(legacyRole([dyc], 'POST'), null);
  assert.equal(legacyRole([dyc, tckt], 'POST'), 'leader');
  assert.equal(legacyRole([tckt, dyc], 'GET'), 'admin');
  assert.equal(legacyRole([btv], 'GET'), null);
  assert.equal(legacyRole([], 'GET'), null);
});

test('session exposes units; a user without memberships is refused with 403', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const nobody = await createUser(pool, { units: [] });
    await client.login(nobody.email, nobody.password);
    const s = await client.request('GET', '/api/session');
    assert.deepEqual(s.json.units.memberships, []);
    assert.equal(s.json.units.current, null);
    const b = await client.request('GET', '/api/bootstrap');
    assert.equal(b.status, 403);
    assert.match(b.json.error, /chưa thuộc đơn vị/);

    const multi = await createUser(pool, { role: 'leader' });
    await addMembership(pool, multi.id, 'BTV', 'btv_member');
    await client.login(multi.email, multi.password);
    const s2 = await client.request('GET', '/api/session');
    assert.equal(s2.json.units.current.code, 'TCKT');
    assert.deepEqual(s2.json.units.memberships.map(m => m.code), ['TCKT', 'BTV']);
    assert.equal(s2.json.user.role, 'leader');
    assert.equal(s2.json.user.is_devops, 0);
  } finally { await close(); await teardown(); }
});

test('switching unit: members only; stale current unit falls back to the first membership', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const u = await createUser(pool, { role: 'member' });
    await addMembership(pool, u.id, 'BTV', 'btv_member');
    await client.login(u.email, u.password);
    const btv = await unitIdByCode(pool, 'BTV');
    const vpd = await unitIdByCode(pool, 'VPD');
    assert.equal((await client.request('POST', '/api/session/unit', { body: { unit_id: vpd } })).status, 403);
    const ok = await client.request('POST', '/api/session/unit', { body: { unit_id: btv } });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.units.current.code, 'BTV');
    // Gỡ membership BTV, rồi tắt luôn đơn vị: phiên cũ không được 500, phải rơi về TCKT.
    await pool.query('DELETE FROM unit_memberships WHERE user_id=? AND unit_id=?', [u.id, btv]);
    const s = await client.request('GET', '/api/session');
    assert.equal(s.status, 200);
    assert.equal(s.json.units.current.code, 'TCKT');
    await addMembership(pool, u.id, 'BTV', 'btv_member');
    await client.request('POST', '/api/session/unit', { body: { unit_id: btv } });
    await pool.query('UPDATE org_units SET is_active=0 WHERE id=?', [btv]);
    assert.equal((await client.request('GET', '/api/session')).json.units.current.code, 'TCKT');
  } finally { await close(); await teardown(); }
});

test('role changes through the old user API keep the TCKT membership in sync', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  const tcktRole = async email => {
    const [[row]] = await pool.query("SELECT m.role FROM unit_memberships m JOIN users u ON u.id=m.user_id JOIN org_units o ON o.id=m.unit_id AND o.code='TCKT' WHERE u.email=?", [email]);
    return row?.role;
  };
  try {
    const teamId = await createTeam(pool);
    const boss = await createUser(pool, { role: 'admin' });
    await client.login(boss.email, boss.password);
    const created = await client.request('POST', '/api/users', { body: { name: 'Mới', email: 'moi@example.com', password: 'MatKhauTest2026!', role: 'vice_leader', team_ids: [teamId] } });
    assert.equal(created.status, 201);
    assert.equal(await tcktRole('moi@example.com'), 'vice_leader');
    await client.request('POST', '/api/users/bulk-import', { body: { rows: [{ name: 'Nhập', email: 'nhap@hust.edu.vn', team_ids: [teamId] }] } });
    assert.equal(await tcktRole('nhap@hust.edu.vn'), 'member');
    const patched = await client.request('PATCH', `/api/users/${created.json.id}`, { body: { name: 'Mới', email: 'moi@example.com', role: 'leader', team_ids: [teamId] } });
    assert.equal(patched.status, 200);
    assert.equal(await tcktRole('moi@example.com'), 'leader');
  } finally { await close(); await teardown(); }
});

test('a first-time SSO account becomes a TCKT member', async () => {
  const { pool, teardown } = await createTestDatabase();
  try {
    const bcrypt = require('bcryptjs');
    const crypto = require('crypto');
    const { findOrCreateHustAccount } = require('../src/auth/hust-account');
    const user = await findOrCreateHustAccount({ db: pool, bcrypt, crypto }, 'sv.moi@sis.hust.edu.vn', { name: 'SV Mới' });
    const { listMemberships } = require('../src/units/memberships');
    assert.deepEqual((await listMemberships(pool, user.id)).map(m => [m.code, m.role]), [['TCKT', 'member']]);
  } finally { await teardown(); }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd core && node --test tests/units.context.test.js`
Expected: FAIL with `Cannot find module '../src/middleware/unit-context'`

- [ ] **Step 3: Write minimal implementation**

`core/src/middleware/unit-context.js`:

```js
'use strict';
const { listMemberships, hasDycMembership } = require('../units/memberships');
const { TCKT_CODE } = require('../units/catalog');

const READ_METHODS = new Set(['GET', 'HEAD']);

// Role "kiểu cũ" (5 role TCKT) cho route Điều hành trong core/src/routes/*.
// DYC đọc như admin (D4), ghi thì chỉ bằng role TCKT của chính mình.
function legacyRole(memberships, method) {
  if (READ_METHODS.has(method) && hasDycMembership(memberships)) return 'admin';
  return (memberships || []).find(m => m.code === TCKT_CODE)?.role ?? null;
}

const unitView = m => m && { id: m.unit_id, code: m.code, name: m.name, kind: m.kind };

function createUnitContext(db) {
  return async function loadUnitContext(req, _res, next) {
    try {
      req.memberships = [];
      req.unit = null;
      req.unitRole = null;
      req.actor = null;
      const user = req.session?.user;
      if (!user) return next();
      req.memberships = await listMemberships(db, user.id);
      let current = req.memberships.find(m => m.unit_id === Number(req.session.current_unit_id));
      if (!current && req.memberships.length) {
        current = req.memberships[0];
        req.session.current_unit_id = current.unit_id;
      }
      req.unit = unitView(current) || null;
      req.unitRole = current?.role ?? null;
      req.actor = { ...user, role: legacyRole(req.memberships, req.method) };
      next();
    } catch (error) {
      next(error);
    }
  };
}

function sessionView(req) {
  const user = req.session?.user;
  if (!user) return { user: null, units: { current: null, memberships: [] } };
  return {
    user: { ...user, role: legacyRole(req.memberships, 'GET') ?? user.role, is_devops: hasDycMembership(req.memberships) ? 1 : 0 },
    units: { current: req.unit, memberships: req.memberships }
  };
}

module.exports = { createUnitContext, legacyRole, sessionView };
```

`core/src/middleware/auth.js` — thay `auth`, `admin`, `manager`, `managerOrEventLead` (giữ `isExecutive`, `isLeadership`, `isDevops`, `devops` nguyên cho tới Task 6):

```js
const auth = (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ error: 'Please sign in to continue.' });
  if (!req.memberships?.length) return res.status(403).json({ error: 'Tài khoản chưa thuộc đơn vị nào. Liên hệ quản trị đơn vị.' });
  next();
};
const admin = (req, res, next) => isExecutive(req.actor) ? next() : res.status(403).json({ error: 'Administrator access is required.' });
const manager = (req, res, next) => (isExecutive(req.actor) || isLeadership(req.actor)) ? next() : res.status(403).json({ error: 'You do not have permission for this action.' });
const managerOrEventLead = (canManageActivity) => (req, res, next) => {
  const user = req.actor;
  if (!user) return res.status(401).json({ error: 'Vui lòng đăng nhập để tiếp tục.' });
  if (isExecutive(user) || isLeadership(user)) return next();
  canManageActivity(user, req.params.id).then(allowed => allowed ? next() : res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này.' })).catch(next);
};
```

`core/src/app.js` — thêm `const { createUnitContext } = require('./middleware/unit-context');` và ngay sau `app.use(express.static(...))`:

```js
  app.use(createUnitContext(db));
```

`core/src/routes/system.js` — thêm `const { sessionView } = require('../middleware/unit-context');` ở đầu file; thay dòng 9 bằng:

```js
router.get('/api/session',(req,res)=>{const view=sessionView(req);res.json({...view,user:withHustIdentity(view.user)})});
router.post('/api/session/unit',auth,(req,res)=>{const unitId=Number(req.body.unit_id);const m=req.memberships.find(x=>x.unit_id===unitId);if(!m)return res.status(403).json({error:'Bạn không thuộc đơn vị này.'});req.session.current_unit_id=unitId;req.unit={id:m.unit_id,code:m.code,name:m.name,kind:m.kind};req.unitRole=m.role;const view=sessionView(req);res.json({...view,user:withHustIdentity(view.user)})});
```

`core/src/routes/users.js` — thêm `const { syncTcktMembershipFromRole } = require('../units/memberships');` ở đầu file, rồi:
- `POST /api/users`: ngay sau `await conn.commit();` thêm `await syncTcktMembershipFromRole(db, result.insertId);`
- `POST /api/users/bulk-import`: ngay sau `await conn.commit();` thêm `await syncTcktMembershipFromRole(db, result.insertId);`
- `PATCH /api/users/:id`: ngay sau `await conn.commit()` (trước `res.json({ok:true})`) thêm `await syncTcktMembershipFromRole(db,req.params.id);`

`core/src/auth/hust-account.js` — thêm `const { syncTcktMembershipFromRole } = require('../units/memberships');` và, trong nhánh tạo mới, ngay sau khối `try { INSERT ... } catch {...}`:

```js
    const [[created]] = await db.execute('SELECT id FROM users WHERE email=?', [email]);
    // Giữ hành vi cũ: tài khoản HUST mới là member của TCKT, không bị khoá ngoài.
    if (created) await syncTcktMembershipFromRole(db, created.id);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd core && node --test tests/units.context.test.js`
Expected: PASS 5/5

- [ ] **Step 5: Run full suite**

Run: `cd core && npm test > /tmp/core.log 2>&1; grep -E "^ℹ (tests|pass|fail)" /tmp/core.log`
Expected: `fail 0`. Nếu `tests/settings.permissions.test.js` hỏng vì gọi middleware trực tiếp với `{ session: {...} }`: thêm `memberships: [{ code: 'TCKT', kind: 'department', role }]` và `actor: { role, is_devops }` vào request giả trong test đó (Task 6 viết lại hẳn test này).

- [ ] **Step 6: Docs**

- `docs/dev/phan-quyen.md`: thêm mục "Membership và `req.actor`": nguồn quyền là `unit_memberships`; `legacyRole` (bảng 3 dòng: DYC+đọc → admin; có TCKT → role TCKT; còn lại → null); `auth` 403 khi không có membership; `current_unit_id` và cách rơi về membership đầu tiên. Bump version + lịch sử.
- `docs/dev/api.md`: `GET /api/session` trả thêm `units.{current,memberships}`, `user.is_devops` giờ = có membership DYC; thêm `POST /api/session/unit`. Bump.

- [ ] **Step 7: Commit**

```bash
npm run docs:index && npm run docs:check -- --base origin/staging
git add core/src core/tests docs/
git commit -m "feat(core): unit context, membership-based auth and unit switching"
```

---

### Task 5: Cổng Điều hành cũ (`legacyGate`), audit đọc liên đơn vị, route đọc `req.actor`

**Files:**
- Create: `core/src/services/audit.js`, `core/src/middleware/legacy-gate.js`
- Modify: `core/src/app.js`; `core/src/routes/{activities,tasks,users,teams,documents,reports}.js` và `core/src/routes/system.js` **chỉ từ dòng 23 trở xuống** (thay `req.session.user` → `req.actor`)
- Test: `core/tests/units.legacy-gate.test.js`
- Docs: `docs/dev/phan-quyen.md`, `docs/ai/bat-bien.md`, `docs/playbooks/doi-quyen.md`

**Interfaces:**
- Consumes: `req.memberships`, `req.actor` (Task 4); `hasDycMembership`, `unitIdByCode` (Task 3); `TCKT_CODE` (Task 1).
- Produces:
  - `recordAudit(db, { actorId, actorUnitId, action, targetType, targetId, ownerUnitId, meta }) → Promise<void>` — `meta` là object, lưu JSON; mọi trường trừ `action`, `targetType` có thể `null`.
  - `LEGACY_PREFIXES` (mảng string) và `createLegacyGate(db) → middleware`: chưa đăng nhập hoặc không có membership → `next()` (để `auth` trả 401/403 như Task 4); có membership TCKT → `next()`; có DYC và GET/HEAD → ghi audit `action='cross_unit_read'`, `targetType='http'`, `targetId='<METHOD> <originalUrl không query>'`, `ownerUnitId=<TCKT id>`, rồi `next()`; còn lại → 403 `{ error: 'Chức năng Điều hành hiện chỉ dành cho Ban TCKT.' }`.

- [ ] **Step 1: Write the failing test**

`core/tests/units.legacy-gate.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser, createTeam, createActivity, addMembership } = require('./helpers/fixtures');

const audits = async (pool, action) => (await pool.query('SELECT * FROM audit_logs WHERE action=? ORDER BY id', [action]))[0];

test('outsiders (BTV only) get 403 on Điều hành routes', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const btv = await createUser(pool, { units: [['BTV', 'btv_lead']] });
    await client.login(btv.email, btv.password);
    for (const p of ['/api/bootstrap', '/api/activities', '/api/tasks/1', '/api/teams', '/api/people', '/api/reports/export']) {
      const r = await client.request('GET', p);
      assert.equal(r.status, 403, p);
    }
    assert.equal((await client.request('POST', '/api/activities', { body: { title: 'x' } })).status, 403);
  } finally { await close(); await teardown(); }
});

test('DYC reads private TCKT data with an audit row per request, and cannot write', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const owner = await createUser(pool, { role: 'leader', team_id: teamId });
    const activityId = await createActivity(pool, { team_id: teamId, creator_id: owner.id, event_lead_id: owner.id });
    await pool.query('UPDATE activities SET is_public=0 WHERE id=?', [activityId]);
    const dyc = await createUser(pool, { units: [['DYC', 'dyc_engineer']] });
    await client.login(dyc.email, dyc.password);
    const r = await client.request('GET', `/api/activities/${activityId}`);
    assert.equal(r.status, 200);
    const rows = await audits(pool, 'cross_unit_read');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].actor_id, dyc.id);
    assert.equal(rows[0].target_id, `GET /api/activities/${activityId}`);
    const [[tckt]] = await pool.query("SELECT id FROM org_units WHERE code='TCKT'");
    assert.equal(rows[0].owner_unit_id, tckt.id);
    assert.equal((await client.request('POST', '/api/activities', { body: { title: 'x' } })).status, 403);
    assert.equal((await client.request('PATCH', `/api/activities/${activityId}`, { body: { title: 'y' } })).status, 403);
  } finally { await close(); await teardown(); }
});

test('TCKT members are not audited and permission follows the membership, not users.role', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    // users.role nói admin nhưng membership TCKT chỉ là member → phải bị đối xử như member.
    const u = await createUser(pool, { role: 'admin', units: [['TCKT', 'member']] });
    await client.login(u.email, u.password);
    assert.equal((await client.request('GET', '/api/bootstrap')).status, 200);
    assert.equal((await client.request('POST', '/api/teams', { body: { name: 'Không được tạo' } })).status, 403);
    assert.equal((await audits(pool, 'cross_unit_read')).length, 0);
  } finally { await close(); await teardown(); }
});

test('a user in both TCKT and DYC writes with the TCKT role and reads without audit', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const teamId = await createTeam(pool);
    const u = await createUser(pool, { role: 'admin', team_id: teamId });
    await addMembership(pool, u.id, 'DYC', 'dyc_admin');
    await client.login(u.email, u.password);
    assert.equal((await client.request('GET', '/api/people')).status, 200);
    assert.equal((await audits(pool, 'cross_unit_read')).length, 0);
    const created = await client.request('POST', '/api/teams', { body: { name: 'Ban DYC tạo' } });
    assert.ok([200, 201].includes(created.status), JSON.stringify(created.json));
  } finally { await close(); await teardown(); }
});
```


- [ ] **Step 2: Run test to verify it fails**

Run: `cd core && node --test tests/units.legacy-gate.test.js`
Expected: FAIL — BTV nhận 200/404 thay vì 403 (chưa có cổng), và `audit_logs` rỗng.

- [ ] **Step 3: Write minimal implementation**

`core/src/services/audit.js`:

```js
'use strict';

async function recordAudit(db, entry) {
  await db.execute(
    'INSERT INTO audit_logs(actor_id,actor_unit_id,action,target_type,target_id,owner_unit_id,meta) VALUES (?,?,?,?,?,?,?)',
    [
      entry.actorId ?? null,
      entry.actorUnitId ?? null,
      entry.action,
      entry.targetType,
      entry.targetId == null ? null : String(entry.targetId).slice(0, 191),
      entry.ownerUnitId ?? null,
      entry.meta == null ? null : JSON.stringify(entry.meta)
    ]
  );
}

module.exports = { recordAudit };
```

`core/src/middleware/legacy-gate.js`:

```js
'use strict';
const { hasDycMembership, unitIdByCode } = require('../units/memberships');
const { TCKT_CODE } = require('../units/catalog');
const { recordAudit } = require('../services/audit');

// Route Điều hành "kiểu cũ" — dữ liệu của TCKT. /api/admin/weight-presets KHÔNG ở đây:
// nó là setting do settingGuard quản (Task 7).
const LEGACY_PREFIXES = [
  '/api/activities', '/api/documents', '/api/archive', '/api/reports', '/api/tasks',
  '/api/task-attachments', '/api/teams', '/api/people', '/api/users',
  '/api/bootstrap', '/api/my-tasks-today', '/api/weight-presets'
];

function createLegacyGate(db) {
  let tcktId = null;
  return async function legacyGate(req, res, next) {
    try {
      const memberships = req.memberships || [];
      if (!req.session?.user || !memberships.length) return next();
      if (memberships.some(m => m.code === TCKT_CODE)) return next();
      if ((req.method === 'GET' || req.method === 'HEAD') && hasDycMembership(memberships)) {
        tcktId ??= await unitIdByCode(db, TCKT_CODE);
        await recordAudit(db, {
          actorId: req.session.user.id,
          actorUnitId: memberships.find(m => m.kind === 'platform_owner').unit_id,
          action: 'cross_unit_read',
          targetType: 'http',
          targetId: `${req.method} ${req.originalUrl.split('?')[0]}`,
          ownerUnitId: tcktId
        });
        return next();
      }
      res.status(403).json({ error: 'Chức năng Điều hành hiện chỉ dành cho Ban TCKT.' });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { LEGACY_PREFIXES, createLegacyGate };
```

`core/src/app.js` — thêm `const { LEGACY_PREFIXES, createLegacyGate } = require('./middleware/legacy-gate');` và ngay sau `app.use(createUnitContext(db));`:

```js
  app.use(LEGACY_PREFIXES, createLegacyGate(db));
```

Thay thế cơ học (chạy ở `core/`):

```bash
perl -pi -e 's/req\.session\.user/req.actor/g' src/routes/activities.js src/routes/tasks.js src/routes/users.js src/routes/teams.js src/routes/documents.js src/routes/reports.js
perl -pi -e 's/req\.session\.user/req.actor/g if $. >= 23' src/routes/system.js
grep -c "req.session.user" src/routes/*.js
```

Expected của `grep -c`: `activities/tasks/users/teams/documents/reports` = 0; `system.js` chỉ còn các dòng 12–21 (SSO, login, onboarding, account); `notifications.js`, `settings-*.js` giữ nguyên.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd core && node --test tests/units.legacy-gate.test.js`
Expected: PASS 4/4

- [ ] **Step 5: Run full suite**

Run: `cd core && npm test > /tmp/core.log 2>&1; grep -E "^ℹ (tests|pass|fail)" /tmp/core.log`
Expected: `fail 0`

- [ ] **Step 6: Docs**

- `docs/dev/phan-quyen.md`: mục "Cổng Điều hành (`legacyGate`)": danh sách prefix, 3 quy tắc, audit `cross_unit_read`; route mới trong `core/src/routes/` phải đọc `req.actor`, không đọc `req.session.user` (trừ đăng nhập/tài khoản). Bump.
- `docs/ai/bat-bien.md`: thêm bất biến "Quyền đọc từ `unit_memberships` qua `req.actor`/`req.unitRole`; không dùng `users.role` cho quyết định quyền" và "Mọi lượt DYC đọc dữ liệu đơn vị khác phải có dòng `audit_logs`". Bump.
- `docs/playbooks/doi-quyen.md`: bước "thêm route Điều hành mới → thêm prefix vào `LEGACY_PREFIXES` nếu route nằm ngoài các prefix sẵn có". Bump.

- [ ] **Step 7: Commit**

```bash
npm run docs:index && npm run docs:check -- --base origin/staging
git add core/src core/tests docs/
git commit -m "feat(core): gate legacy Điều hành routes by unit and audit DYC reads"
```

---

### Task 6: DYC bootstrap và `platformAdmin` thay `devops`

**Files:**
- Modify: `core/src/middleware/auth.js` (xoá `isDevops`, `devops`; thêm `devopsEmailAllowlist` export, `platformAdmin`), `core/src/app.js` (context), `core/src/routes/settings-email.js`, `core/src/routes/settings-cron.js` (`devops` → `platformAdmin`, tạm thời cho mọi route; Task 7 tinh chỉnh), `core/src/routes/system.js` (login + SSO callback), `core/src/runtime.js`
- Modify tests: `core/tests/settings.permissions.test.js` (viết lại), `core/tests/routes.settings-email.test.js`, `core/tests/routes.settings-cron.test.js`
- Test: `core/tests/units.dyc-bootstrap.test.js`
- Docs: `docs/dev/email-cron.md`, `docs/dev/phan-quyen.md`

**Interfaces:**
- Consumes: `ensureDycAdmins`, `hasDycMembership` (Task 3); `req.memberships` (Task 4).
- Produces: `platformAdmin` middleware — 403 `{ error: 'Chỉ DYC được thao tác cấu hình nền tảng.' }` nếu không có membership DYC (bất kể đơn vị đang chọn); `devopsEmailAllowlist() → string[]` (chữ thường).

- [ ] **Step 1: Write the failing test**

`core/tests/units.dyc-bootstrap.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser, addMembership } = require('./helpers/fixtures');
const { platformAdmin } = require('../src/middleware/auth');

const withEnv = async (value, fn) => {
  const original = process.env.DEVOPS_EMAILS;
  process.env.DEVOPS_EMAILS = value;
  try { await fn(); } finally { if (original === undefined) delete process.env.DEVOPS_EMAILS; else process.env.DEVOPS_EMAILS = original; }
};

test('platformAdmin: any DYC membership passes, anything else is 403', () => {
  const res = () => { const r = {}; r.status = c => { r.statusCode = c; return r; }; r.json = b => { r.body = b; return r; }; return r; };
  let called = false;
  platformAdmin({ memberships: [{ kind: 'platform_owner', role: 'dyc_engineer' }] }, res(), () => { called = true; });
  assert.equal(called, true);
  const r2 = res();
  platformAdmin({ memberships: [{ kind: 'department', role: 'admin' }] }, r2, () => assert.fail('must not pass'));
  assert.equal(r2.statusCode, 403);
});

test('an email in DEVOPS_EMAILS that did not exist at startup becomes dyc_admin on first login', async () => {
  await withEnv('late@example.com', async () => {
    const { pool, teardown } = await createTestDatabase();
    const { client, close } = await startTestServer(pool);
    try {
      const u = await createUser(pool, { email: 'late@example.com', units: [] });
      await client.login(u.email, u.password);
      const s = await client.request('GET', '/api/session');
      assert.equal(s.json.user.is_devops, 1);
      assert.ok(s.json.units.memberships.some(m => m.code === 'DYC' && m.role === 'dyc_admin'));
      assert.equal((await client.request('GET', '/api/admin/email/settings')).status, 200);
    } finally { await close(); await teardown(); }
  });
});

test('users.is_devops no longer grants platform access after the backfill; membership does', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const flagOnly = await createUser(pool, { role: 'admin' });
    await pool.query('UPDATE users SET is_devops=1 WHERE id=?', [flagOnly.id]);
    await client.login(flagOnly.email, flagOnly.password);
    assert.equal((await client.request('GET', '/api/admin/cron/jobs')).status, 403);
    const eng = await createUser(pool, { units: [['DYC', 'dyc_engineer']] });
    await client.login(eng.email, eng.password);
    assert.equal((await client.request('GET', '/api/admin/cron/jobs')).status, 200);
  } finally { await close(); await teardown(); }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd core && node --test tests/units.dyc-bootstrap.test.js`
Expected: FAIL — `platformAdmin is not a function`

- [ ] **Step 3: Write minimal implementation**

`core/src/middleware/auth.js` — xoá `isDevops`, `devops`; thêm:

```js
const { hasDycMembership } = require('../units/memberships');
const devopsEmailAllowlist = () => String(process.env.DEVOPS_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const platformAdmin = (req, res, next) => hasDycMembership(req.memberships) ? next() : res.status(403).json({ error: 'Chỉ DYC được thao tác cấu hình nền tảng.' });
```

và sửa `module.exports` thành `{ executiveRoles, leadershipRoles, isExecutive, isLeadership, devopsEmailAllowlist, auth, admin, manager, platformAdmin, managerOrEventLead }`.

`core/src/app.js` — import `platformAdmin` thay `devops`, trong `context` thay `devops` bằng `platformAdmin`.

`core/src/routes/settings-email.js` và `settings-cron.js`: `const { ..., devops, ... } = context;` → `platformAdmin`; mọi `auth, devops,` → `auth, platformAdmin,`. (`deliveries` vẫn `auth, admin`.)

`core/src/routes/system.js` — thêm ở đầu `const { ensureDycAdmins } = require('../units/memberships');` và `const { devopsEmailAllowlist } = require('../middleware/auth');`. Trong `POST /api/login`, ngay trước `delete user.password_hash;` thêm:

```js
if(devopsEmailAllowlist().includes(email))await ensureDycAdmins(db,[email]);
```

Trong SSO callback, ngay trước `req.session.user=user;` thêm:

```js
if(devopsEmailAllowlist().includes(email))await ensureDycAdmins(db,[email]);
```

(`loadUnitContext` chạy trước route login nên request login chưa thấy membership mới; request kế tiếp đọc lại từ DB nên thấy ngay.)

`core/src/runtime.js` — thêm `const { ensureDycAdmins } = require('./units/memberships');` và `const { devopsEmailAllowlist } = require('./middleware/auth');`; ngay sau khối auto-migrate (trong cùng `if`, sau `try/catch` migrate):

```js
    try {
      const granted = await ensureDycAdmins(application.db, devopsEmailAllowlist());
      logger.info(`DYC bootstrap: ${granted} account(s) ensured as dyc_admin.`);
    } catch (err) {
      logger.error('DYC bootstrap failed during startup', err);
    }
```

Viết lại `core/tests/settings.permissions.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { devopsEmailAllowlist, admin } = require('../src/middleware/auth');

test('devopsEmailAllowlist lowercases and trims DEVOPS_EMAILS', () => {
  const original = process.env.DEVOPS_EMAILS;
  process.env.DEVOPS_EMAILS = 'boss@hust.edu.vn, Other@Hust.Edu.Vn,,';
  try {
    assert.deepEqual(devopsEmailAllowlist(), ['boss@hust.edu.vn', 'other@hust.edu.vn']);
  } finally {
    if (original === undefined) delete process.env.DEVOPS_EMAILS; else process.env.DEVOPS_EMAILS = original;
  }
});

test('admin middleware reads the projected actor role, not the session row', () => {
  const res = () => { const r = {}; r.status = c => { r.statusCode = c; return r; }; r.json = b => { r.body = b; return r; }; return r; };
  let called = false;
  admin({ session: { user: { role: 'member' } }, actor: { role: 'admin' } }, res(), () => { called = true; });
  assert.equal(called, true);
  const r2 = res();
  admin({ session: { user: { role: 'admin' } }, actor: { role: 'member' } }, r2, () => assert.fail('must not pass'));
  assert.equal(r2.statusCode, 403);
});
```

Trong `routes.settings-email.test.js` và `routes.settings-cron.test.js`: thay `UPDATE users SET is_devops=1 WHERE id=?` bằng `addMembership(pool, <user>.id, 'DYC', 'dyc_engineer')` (import `addMembership` từ `./helpers/fixtures`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd core && node --test tests/units.dyc-bootstrap.test.js tests/settings.permissions.test.js tests/routes.settings-email.test.js tests/routes.settings-cron.test.js`
Expected: PASS (tất cả)

- [ ] **Step 5: Run full suite**

Run: `cd core && npm test > /tmp/core.log 2>&1; grep -E "^ℹ (tests|pass|fail)" /tmp/core.log; grep -rn "isDevops\|\bdevops\b" src/ | grep -v "^src/.*://" || true`
Expected: `fail 0`; `grep` không còn `isDevops`/`devops` middleware trong `src/` (chuỗi trong comment/URL chấp nhận).

- [ ] **Step 6: Docs**

- `docs/dev/email-cron.md`: quyền cấu hình SMTP/cron = membership DYC (`platformAdmin`), không còn `is_devops`/`isExecutive`; `DEVOPS_EMAILS` (trên VM là `CORE_DEVOPS_EMAILS`) = danh sách luôn được đảm bảo `dyc_admin` lúc khởi động và lúc đăng nhập. Bump.
- `docs/dev/phan-quyen.md`: mục "DYC": `dyc_admin`/`dyc_engineer`, bootstrap, cột `users.is_devops` còn nhưng không còn được đọc (xoá ở GĐ2). Bump.

- [ ] **Step 7: Commit**

```bash
npm run docs:index && npm run docs:check -- --base origin/staging
git add core/src core/tests docs/
git commit -m "feat(core): DYC membership replaces devops flag for platform settings"
```

---

### Task 7: Danh mục setting (`managed_by`), `settingGuard` và khoá setting

**Files:**
- Create: `core/src/settings/catalog.js`, `core/src/middleware/setting-guard.js`, `core/src/routes/platform.js`
- Modify: `core/src/app.js` (context `settingGuard`), `core/src/routes/index.js`, `core/src/routes/settings-email.js`, `core/src/routes/settings-cron.js`, `core/src/routes/system.js` (các route `/api/admin/weight-presets*`)
- Test: `core/tests/units.settings-guard.test.js`
- Docs: `docs/dev/email-cron.md`, `docs/dev/api.md`, `docs/ba/co-cau-don-vi-va-role.md`

**Interfaces:**
- Consumes: `hasDycMembership`, `unitIdByCode` (Task 3); `isUnitAdmin`, `TCKT_CODE` (Task 1); `recordAudit` (Task 5); `platformAdmin` (Task 6).
- Produces:
  - `SETTINGS` = `{ 'email.smtp': { managed_by: 'platform' }, 'cron.jobs': { managed_by: 'platform' }, 'email.templates': { managed_by: 'unit' }, 'email.rules': { managed_by: 'unit' }, 'weight_presets': { managed_by: 'unit' } }`.
  - `createSettingGuard(db) → settingGuard(key) → middleware`:
    - `platform`: chỉ membership DYC; ngược lại 403 `{ error: 'Chỉ DYC được thao tác cấu hình nền tảng.' }`.
    - `unit`: DYC, hoặc membership TCKT với `isUnitAdmin('department', role)`; ngược lại 403 `{ error: 'Bạn không có quyền với cấu hình này.' }`. (GĐ1: bảng email/weight preset chưa có `unit_id`, nên "đơn vị" của setting unit là TCKT.)
    - Với method khác GET/HEAD và người gọi không phải DYC: nếu có dòng `setting_locks` với `setting_key=key` và (`unit_id IS NULL` hoặc `unit_id=<TCKT id>`) → 403 `{ error: 'Cấu hình này đang bị DYC khoá.', locked: true, reason }`.
  - `GET /api/platform/setting-locks` (auth) → `[{ id, setting_key, unit_id, unit_code, reason, locked_by, created_at }]`.
  - `POST /api/platform/setting-locks { setting_key, unit_id|null, reason }` (auth + platformAdmin) → 201 `{ id }`; 400 nếu key không có trong `SETTINGS` hoặc `managed_by !== 'unit'` hoặc `reason` rỗng; audit `setting.lock`.
  - `DELETE /api/platform/setting-locks/:id` (auth + platformAdmin) → 200 `{ ok: true }` / 404; audit `setting.unlock`.

- [ ] **Step 1: Write the failing test**

`core/tests/units.settings-guard.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser } = require('./helpers/fixtures');
const { SETTINGS } = require('../src/settings/catalog');

test('catalog marks SMTP and cron as platform, templates/rules/weight presets as unit', () => {
  assert.equal(SETTINGS['email.smtp'].managed_by, 'platform');
  assert.equal(SETTINGS['cron.jobs'].managed_by, 'platform');
  for (const k of ['email.templates', 'email.rules', 'weight_presets']) assert.equal(SETTINGS[k].managed_by, 'unit', k);
});

test('TCKT admin edits unit settings until DYC locks them; lock reason is returned; DYC bypasses the lock', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const tcktAdmin = await createUser(pool, { role: 'vice_admin' });
    const dyc = await createUser(pool, { units: [['DYC', 'dyc_admin']] });
    const body = { name: 'Nhẹ', points: 1 };

    await client.login(tcktAdmin.email, tcktAdmin.password);
    assert.equal((await client.request('GET', '/api/admin/email/settings')).status, 403);
    assert.equal((await client.request('POST', '/api/admin/weight-presets', { body })).status, 201);
    assert.equal((await client.request('GET', '/api/admin/email/templates')).status, 200);
    assert.equal((await client.request('POST', '/api/platform/setting-locks', { body: { setting_key: 'weight_presets', unit_id: null, reason: 'x' } })).status, 403);

    await client.login(dyc.email, dyc.password);
    assert.equal((await client.request('POST', '/api/platform/setting-locks', { body: { setting_key: 'email.smtp', unit_id: null, reason: 'x' } })).status, 400);
    assert.equal((await client.request('POST', '/api/platform/setting-locks', { body: { setting_key: 'weight_presets', unit_id: null, reason: '' } })).status, 400);
    const lock = await client.request('POST', '/api/platform/setting-locks', { body: { setting_key: 'weight_presets', unit_id: null, reason: 'Chốt thang điểm học kỳ' } });
    assert.equal(lock.status, 201);
    assert.equal((await client.request('POST', '/api/admin/weight-presets', { body })).status, 201);

    await client.login(tcktAdmin.email, tcktAdmin.password);
    const blocked = await client.request('POST', '/api/admin/weight-presets', { body });
    assert.equal(blocked.status, 403);
    assert.equal(blocked.json.locked, true);
    assert.equal(blocked.json.reason, 'Chốt thang điểm học kỳ');
    assert.equal((await client.request('GET', '/api/admin/weight-presets')).status, 200);
    const locks = await client.request('GET', '/api/platform/setting-locks');
    assert.equal(locks.json.length, 1);

    await client.login(dyc.email, dyc.password);
    assert.equal((await client.request('DELETE', `/api/platform/setting-locks/${lock.json.id}`)).status, 200);
    await client.login(tcktAdmin.email, tcktAdmin.password);
    assert.equal((await client.request('POST', '/api/admin/weight-presets', { body })).status, 201);

    const [rows] = await pool.query("SELECT action FROM audit_logs WHERE action LIKE 'setting.%' ORDER BY id");
    assert.deepEqual(rows.map(r => r.action), ['setting.lock', 'setting.unlock']);
  } finally { await close(); await teardown(); }
});

test('TCKT leader (not unit admin) cannot touch unit settings', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const leader = await createUser(pool, { role: 'leader' });
    await client.login(leader.email, leader.password);
    assert.equal((await client.request('GET', '/api/admin/email/rules')).status, 403);
    assert.equal((await client.request('POST', '/api/admin/weight-presets', { body: { name: 'x', points: 1 } })).status, 403);
  } finally { await close(); await teardown(); }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd core && node --test tests/units.settings-guard.test.js`
Expected: FAIL with `Cannot find module '../src/settings/catalog'`

- [ ] **Step 3: Write minimal implementation**

`core/src/settings/catalog.js`:

```js
'use strict';

// managed_by: 'platform' → chỉ DYC; 'unit' → admin đơn vị sửa được, DYC có thể khoá (setting_locks).
const SETTINGS = Object.freeze({
  'email.smtp': { managed_by: 'platform' },
  'cron.jobs': { managed_by: 'platform' },
  'email.templates': { managed_by: 'unit' },
  'email.rules': { managed_by: 'unit' },
  weight_presets: { managed_by: 'unit' }
});

module.exports = { SETTINGS };
```

`core/src/middleware/setting-guard.js`:

```js
'use strict';
const { SETTINGS } = require('../settings/catalog');
const { hasDycMembership, unitIdByCode } = require('../units/memberships');
const { isUnitAdmin, TCKT_CODE } = require('../units/catalog');

function createSettingGuard(db) {
  let tcktId = null;
  return function settingGuard(key) {
    const entry = SETTINGS[key];
    if (!entry) throw new Error(`Unknown setting key ${key}`);
    return async (req, res, next) => {
      try {
        const memberships = req.memberships || [];
        const isDyc = hasDycMembership(memberships);
        if (entry.managed_by === 'platform') {
          return isDyc ? next() : res.status(403).json({ error: 'Chỉ DYC được thao tác cấu hình nền tảng.' });
        }
        // GĐ1: setting "unit" nằm trong bảng chưa có unit_id → thuộc TCKT.
        const tckt = memberships.find(m => m.code === TCKT_CODE);
        if (!isDyc && !(tckt && isUnitAdmin(tckt.kind, tckt.role))) {
          return res.status(403).json({ error: 'Bạn không có quyền với cấu hình này.' });
        }
        if (isDyc || req.method === 'GET' || req.method === 'HEAD') return next();
        tcktId ??= await unitIdByCode(db, TCKT_CODE);
        const [locks] = await db.execute(
          'SELECT reason FROM setting_locks WHERE setting_key=? AND (unit_id IS NULL OR unit_id=?) ORDER BY id LIMIT 1',
          [key, tcktId]
        );
        if (locks.length) return res.status(403).json({ error: 'Cấu hình này đang bị DYC khoá.', locked: true, reason: locks[0].reason });
        next();
      } catch (error) {
        next(error);
      }
    };
  };
}

module.exports = { createSettingGuard };
```

`core/src/routes/platform.js`:

```js
'use strict';
const express = require('express');
const { SETTINGS } = require('../settings/catalog');
const { recordAudit } = require('../services/audit');

function createPlatformRoutes(context) {
  const { db, auth, platformAdmin, asyncRoute } = context;
  const router = express.Router();
  const dycUnitId = req => req.memberships.find(m => m.kind === 'platform_owner')?.unit_id ?? null;

  router.get('/api/platform/setting-locks', auth, asyncRoute(async (_req, res) => {
    const [rows] = await db.query(
      `SELECT l.id, l.setting_key, l.unit_id, u.code unit_code, l.reason, l.locked_by, l.created_at
       FROM setting_locks l LEFT JOIN org_units u ON u.id=l.unit_id ORDER BY l.id`
    );
    res.json(rows);
  }));

  router.post('/api/platform/setting-locks', auth, platformAdmin, asyncRoute(async (req, res) => {
    const key = String(req.body.setting_key || '');
    const reason = String(req.body.reason || '').trim().slice(0, 255);
    const unitId = req.body.unit_id == null ? null : Number(req.body.unit_id);
    if (SETTINGS[key]?.managed_by !== 'unit') return res.status(400).json({ error: 'Chỉ khoá được cấu hình do đơn vị quản lý.' });
    if (!reason) return res.status(400).json({ error: 'Cần ghi lý do khoá.' });
    if (unitId !== null) {
      const [[unit]] = await db.execute('SELECT id FROM org_units WHERE id=?', [unitId]);
      if (!unit) return res.status(400).json({ error: 'Đơn vị không tồn tại.' });
    }
    const [result] = await db.execute('INSERT INTO setting_locks(setting_key,unit_id,locked_by,reason) VALUES (?,?,?,?)', [key, unitId, req.session.user.id, reason]);
    await recordAudit(db, { actorId: req.session.user.id, actorUnitId: dycUnitId(req), action: 'setting.lock', targetType: 'setting', targetId: key, ownerUnitId: unitId, meta: { reason, lock_id: result.insertId } });
    res.status(201).json({ id: result.insertId });
  }));

  router.delete('/api/platform/setting-locks/:id', auth, platformAdmin, asyncRoute(async (req, res) => {
    const [[lock]] = await db.execute('SELECT * FROM setting_locks WHERE id=?', [req.params.id]);
    if (!lock) return res.status(404).json({ error: 'Không tìm thấy khoá.' });
    await db.execute('DELETE FROM setting_locks WHERE id=?', [lock.id]);
    await recordAudit(db, { actorId: req.session.user.id, actorUnitId: dycUnitId(req), action: 'setting.unlock', targetType: 'setting', targetId: lock.setting_key, ownerUnitId: lock.unit_id, meta: { reason: lock.reason, lock_id: lock.id } });
    res.json({ ok: true });
  }));

  return router;
}

module.exports = { createPlatformRoutes };
```

`core/src/app.js` — `const { createSettingGuard } = require('./middleware/setting-guard');` và thêm `settingGuard: createSettingGuard(db)` vào `context`.

`core/src/routes/index.js` — `const { createPlatformRoutes } = require('./platform');` và `app.use(createPlatformRoutes(context));` sau `createSettingsCronRoutes`.

Gắn guard (thay middleware quyền, giữ `auth`):
- `settings-email.js`: `/api/admin/email/settings*`, `/api/admin/email/events` → `settingGuard('email.smtp')`; `/api/admin/email/templates*` → `settingGuard('email.templates')`; `/api/admin/email/rules*` → `settingGuard('email.rules')`. Lấy `settingGuard` từ `context` thay cho `platformAdmin`.
- `settings-cron.js`: mọi route → `settingGuard('cron.jobs')`.
- `system.js`: 4 route `/api/admin/weight-presets*` → `auth, settingGuard('weight_presets')` (bỏ `admin`); thêm `settingGuard` vào danh sách lấy từ `context`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd core && node --test tests/units.settings-guard.test.js tests/routes.settings-email.test.js tests/routes.settings-cron.test.js tests/weight-presets.test.js`
Expected: PASS (tất cả). `routes.settings-email.test.js` khẳng định "plain admin (không DYC) GET `/api/admin/email/settings` → 403" — vẫn đúng vì SMTP là `platform`.

- [ ] **Step 5: Run full suite**

Run: `cd core && npm test > /tmp/core.log 2>&1; grep -E "^ℹ (tests|pass|fail)" /tmp/core.log`
Expected: `fail 0`

- [ ] **Step 6: Docs**

- `docs/dev/email-cron.md`: bảng setting → `managed_by`; TCKT admin/vice_admin giờ **được** sửa template/rule email qua API (UI vẫn chỉ hiện với DYC tới GĐ1-D); khoá setting. Bump.
- `docs/dev/api.md`: `/api/platform/setting-locks` (GET/POST/DELETE, mã lỗi, body 403 `{locked, reason}`). Bump.
- `docs/ba/co-cau-don-vi-va-role.md`: mục "Ai sửa cấu hình nào" (bảng 5 setting, ai sửa, DYC khoá được). Bump.

- [ ] **Step 7: Commit**

```bash
npm run docs:index && npm run docs:check -- --base origin/staging
git add core/src core/tests docs/
git commit -m "feat(core): setting catalog with managed_by, guard and DYC locks"
```

---

### Task 8: API đơn vị và membership (backend của spec mục 8)

**Files:**
- Create: `core/src/routes/units.js`
- Modify: `core/src/routes/index.js`
- Test: `core/tests/units.routes.test.js`
- Docs: `docs/dev/api.md`, `docs/ba/co-cau-don-vi-va-role.md`, `docs/playbooks/doi-quyen.md`

**Interfaces:**
- Consumes: `getUnit`, `listMemberships`, `upsertMembership`, `removeMembership`, `setTcktRoleColumn`, `hasDycMembership` (Task 3); `isUnitAdmin`, `TCKT_CODE`, `UNIT_ROLES` (Task 1); `recordAudit` (Task 5).
- Produces:
  - `GET /api/units` (auth) → DYC: mọi đơn vị; người khác: chỉ đơn vị mình thuộc. Mỗi dòng `{ id, code, name, kind, is_active, member_count, roles }` (`roles` = `UNIT_ROLES[kind]`).
  - `GET /api/units/:id/members` (auth) → DYC hoặc thành viên đơn vị đó; `[{ user_id, name, email, role }]`; 403/404.
  - `PUT /api/units/:id/members/:userId { role }` (auth) → người quản lý được (quy tắc `canManageUnit` dưới đây) → 200 `{ ok: true }`; 400 role sai kind; 404 user/đơn vị không có; audit `membership.upsert` (`meta: { role, previous_role }`); đơn vị TCKT → ghi `users.role` theo.
  - `DELETE /api/units/:id/members/:userId` (auth) → 200/404; 409 `{ error: 'Không thể gỡ dyc_admin cuối cùng.' }` nếu là `dyc_admin` cuối cùng; audit `membership.remove`; đơn vị TCKT → `users.role='member'`.
  - `canManageUnit(memberships, unit)`: có membership DYC và (đơn vị không phải DYC hoặc mình là `dyc_admin`); hoặc mình là admin của chính đơn vị đó (`isUnitAdmin(kind, role)`).

- [ ] **Step 1: Write the failing test**

`core/tests/units.routes.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser, unitIdByCode } = require('./helpers/fixtures');

test('unit list is scoped: DYC sees every unit, others only their own', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const dyc = await createUser(pool, { units: [['DYC', 'dyc_engineer']] });
    const btv = await createUser(pool, { units: [['BTV', 'btv_member']] });
    await client.login(dyc.email, dyc.password);
    const all = await client.request('GET', '/api/units');
    assert.ok(all.json.length >= 7);
    assert.ok(all.json.find(u => u.code === 'DEMO-DT-01').name.startsWith('[Dữ liệu giả]'));
    await client.login(btv.email, btv.password);
    assert.deepEqual((await client.request('GET', '/api/units')).json.map(u => u.code), ['BTV']);
    assert.equal((await client.request('GET', `/api/units/${await unitIdByCode(pool, 'TCKT')}/members`)).status, 403);
    assert.equal((await client.request('GET', `/api/units/${await unitIdByCode(pool, 'BTV')}/members`)).status, 200);
  } finally { await close(); await teardown(); }
});

test('BTV lead manages BTV members only; role must fit the unit kind; changes are audited', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const lead = await createUser(pool, { units: [['BTV', 'btv_lead']] });
    const target = await createUser(pool, { units: [] });
    const btv = await unitIdByCode(pool, 'BTV');
    const tckt = await unitIdByCode(pool, 'TCKT');
    await client.login(lead.email, lead.password);
    assert.equal((await client.request('PUT', `/api/units/${btv}/members/${target.id}`, { body: { role: 'admin' } })).status, 400);
    assert.equal((await client.request('PUT', `/api/units/${btv}/members/${target.id}`, { body: { role: 'btv_member' } })).status, 200);
    assert.equal((await client.request('PUT', `/api/units/${tckt}/members/${target.id}`, { body: { role: 'member' } })).status, 403);
    assert.equal((await client.request('PUT', `/api/units/${btv}/members/999999`, { body: { role: 'btv_member' } })).status, 404);
    assert.equal((await client.request('DELETE', `/api/units/${btv}/members/${target.id}`)).status, 200);
    const [rows] = await pool.query("SELECT action, meta FROM audit_logs WHERE action LIKE 'membership.%' ORDER BY id");
    assert.deepEqual(rows.map(r => r.action), ['membership.upsert', 'membership.remove']);
    const meta = typeof rows[0].meta === 'string' ? JSON.parse(rows[0].meta) : rows[0].meta;
    assert.equal(meta.role, 'btv_member');
  } finally { await close(); await teardown(); }
});

test('TCKT membership changes are mirrored to users.role; DYC unit is managed by dyc_admin only; last dyc_admin cannot be removed', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  const roleOf = async id => (await pool.query('SELECT role FROM users WHERE id=?', [id]))[0][0].role;
  try {
    const boss = await createUser(pool, { units: [['DYC', 'dyc_admin']] });
    const eng = await createUser(pool, { units: [['DYC', 'dyc_engineer']] });
    const m = await createUser(pool, { role: 'member' });
    const tckt = await unitIdByCode(pool, 'TCKT');
    const dyc = await unitIdByCode(pool, 'DYC');

    await client.login(eng.email, eng.password);
    assert.equal((await client.request('PUT', `/api/units/${tckt}/members/${m.id}`, { body: { role: 'vice_leader' } })).status, 200);
    assert.equal(await roleOf(m.id), 'vice_leader');
    assert.equal((await client.request('PUT', `/api/units/${dyc}/members/${m.id}`, { body: { role: 'dyc_engineer' } })).status, 403);

    await client.login(boss.email, boss.password);
    assert.equal((await client.request('DELETE', `/api/units/${tckt}/members/${m.id}`)).status, 200);
    assert.equal(await roleOf(m.id), 'member');
    const last = await client.request('DELETE', `/api/units/${dyc}/members/${boss.id}`);
    assert.equal(last.status, 409);
    assert.equal((await client.request('PUT', `/api/units/${dyc}/members/${eng.id}`, { body: { role: 'dyc_admin' } })).status, 200);
    assert.equal((await client.request('DELETE', `/api/units/${dyc}/members/${boss.id}`)).status, 200);
  } finally { await close(); await teardown(); }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd core && node --test tests/units.routes.test.js`
Expected: FAIL — `GET /api/units` trả 404 `Endpoint not found.`

- [ ] **Step 3: Write minimal implementation**

`core/src/routes/units.js`:

```js
'use strict';
const express = require('express');
const { UNIT_ROLES, TCKT_CODE, isUnitAdmin } = require('../units/catalog');
const { getUnit, upsertMembership, removeMembership, setTcktRoleColumn, hasDycMembership } = require('../units/memberships');
const { recordAudit } = require('../services/audit');

function canManageUnit(memberships, unit) {
  const dyc = memberships.find(m => m.kind === 'platform_owner');
  if (dyc && (unit.kind !== 'platform_owner' || dyc.role === 'dyc_admin')) return true;
  const own = memberships.find(m => m.unit_id === unit.id);
  return Boolean(own && isUnitAdmin(own.kind, own.role));
}

function createUnitRoutes(context) {
  const { db, auth, asyncRoute } = context;
  const router = express.Router();

  const loadUnit = async (req, res) => {
    const unit = await getUnit(db, Number(req.params.id));
    if (!unit) { res.status(404).json({ error: 'Đơn vị không tồn tại.' }); return null; }
    return unit;
  };
  const actorUnitId = (req, unit) => (req.memberships.find(m => m.unit_id === unit.id) || req.memberships.find(m => m.kind === 'platform_owner'))?.unit_id ?? null;

  router.get('/api/units', auth, asyncRoute(async (req, res) => {
    const isDyc = hasDycMembership(req.memberships);
    const mine = req.memberships.map(m => m.unit_id);
    const [rows] = await db.query(
      `SELECT u.id, u.code, u.name, u.kind, u.is_active, COUNT(m.user_id) member_count
       FROM org_units u LEFT JOIN unit_memberships m ON m.unit_id=u.id
       ${isDyc ? '' : 'WHERE u.id IN (?)'} GROUP BY u.id ORDER BY u.id`,
      isDyc ? [] : [mine]
    );
    res.json(rows.map(r => ({ ...r, roles: UNIT_ROLES[r.kind] })));
  }));

  router.get('/api/units/:id/members', auth, asyncRoute(async (req, res) => {
    const unit = await loadUnit(req, res); if (!unit) return;
    if (!hasDycMembership(req.memberships) && !req.memberships.some(m => m.unit_id === unit.id)) return res.status(403).json({ error: 'Bạn không thuộc đơn vị này.' });
    const [rows] = await db.execute(
      'SELECT m.user_id, u.name, u.email, m.role FROM unit_memberships m JOIN users u ON u.id=m.user_id WHERE m.unit_id=? ORDER BY u.name',
      [unit.id]
    );
    res.json(rows);
  }));

  router.put('/api/units/:id/members/:userId', auth, asyncRoute(async (req, res) => {
    const unit = await loadUnit(req, res); if (!unit) return;
    if (!canManageUnit(req.memberships, unit)) return res.status(403).json({ error: 'Bạn không quản lý đơn vị này.' });
    const userId = Number(req.params.userId);
    const [[user]] = await db.execute('SELECT id FROM users WHERE id=?', [userId]);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
    const role = String(req.body.role || '');
    const [[previous]] = await db.execute('SELECT role FROM unit_memberships WHERE user_id=? AND unit_id=?', [userId, unit.id]);
    try { await upsertMembership(db, userId, unit.id, role); } catch (e) { if (e.status === 400) return res.status(400).json({ error: e.message }); throw e; }
    if (unit.code === TCKT_CODE) await setTcktRoleColumn(db, userId, role);
    await recordAudit(db, { actorId: req.session.user.id, actorUnitId: actorUnitId(req, unit), action: 'membership.upsert', targetType: 'user', targetId: userId, ownerUnitId: unit.id, meta: { role, previous_role: previous?.role ?? null } });
    res.json({ ok: true });
  }));

  router.delete('/api/units/:id/members/:userId', auth, asyncRoute(async (req, res) => {
    const unit = await loadUnit(req, res); if (!unit) return;
    if (!canManageUnit(req.memberships, unit)) return res.status(403).json({ error: 'Bạn không quản lý đơn vị này.' });
    const userId = Number(req.params.userId);
    const [[current]] = await db.execute('SELECT role FROM unit_memberships WHERE user_id=? AND unit_id=?', [userId, unit.id]);
    if (!current) return res.status(404).json({ error: 'Tài khoản không thuộc đơn vị này.' });
    if (current.role === 'dyc_admin') {
      const [[{ c }]] = await db.execute("SELECT COUNT(*) c FROM unit_memberships WHERE unit_id=? AND role='dyc_admin'", [unit.id]);
      if (c <= 1) return res.status(409).json({ error: 'Không thể gỡ dyc_admin cuối cùng.' });
    }
    await removeMembership(db, userId, unit.id);
    if (unit.code === TCKT_CODE) await setTcktRoleColumn(db, userId, 'member');
    await recordAudit(db, { actorId: req.session.user.id, actorUnitId: actorUnitId(req, unit), action: 'membership.remove', targetType: 'user', targetId: userId, ownerUnitId: unit.id, meta: { previous_role: current.role } });
    res.json({ ok: true });
  }));

  return router;
}

module.exports = { createUnitRoutes, canManageUnit };
```

`core/src/routes/index.js` — `const { createUnitRoutes } = require('./units');` và `app.use(createUnitRoutes(context));`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd core && node --test tests/units.routes.test.js`
Expected: PASS 3/3

- [ ] **Step 5: Run full suite**

Run: `cd core && npm test > /tmp/core.log 2>&1; grep -E "^ℹ (tests|pass|fail)" /tmp/core.log`
Expected: `fail 0`

- [ ] **Step 6: Docs**

- `docs/dev/api.md`: 4 endpoint `/api/units*` (quyền, mã lỗi 400/403/404/409). Bump.
- `docs/ba/co-cau-don-vi-va-role.md`: "Ai quản lý thành viên đơn vị nào" (DYC mọi đơn vị; chỉ `dyc_admin` quản DYC; `btv_lead` quản BTV; TCKT admin/vice_admin quản TCKT; VP Đoàn/Chi bộ/ĐT-LCĐ do DYC quản); đổi role TCKT ở đây = đổi role ở màn Tài khoản cũ. Bump.
- `docs/playbooks/doi-quyen.md`: cách cấp quyền cho người mới qua API membership; không sửa trực tiếp `users.role` bằng SQL. Bump.

- [ ] **Step 7: Commit**

```bash
npm run docs:index && npm run docs:check -- --base origin/staging
git add core/src core/tests docs/
git commit -m "feat(core): unit and membership management API"
```

---

### Task 9: Test chống rò rỉ toàn bộ route GET, runbook deploy, đóng tài liệu

**Files:**
- Test: `core/tests/units.leak.test.js`
- Modify docs: `docs/dev/kien-truc.md`, `docs/ai/bat-bien.md`, `docs/ops/chuyen-doi-ultimate-tckt.md` (hoặc runbook deploy hiện hành trong `docs/ops/`), `.kiro/specs/nen-tang-da-don-vi/tasks.md`

**Interfaces:**
- Consumes: toàn bộ route sau Task 4–8.
- Produces: bảo đảm hồi quy — mọi route `GET /api/*` mới thêm sau này tự động được kiểm.

- [ ] **Step 1: Write the test**

`core/tests/units.leak.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser } = require('./helpers/fixtures');

const ROUTES_DIR = path.join(__dirname, '..', 'src', 'routes');
// Route người ngoài TCKT được phép đọc (không phải dữ liệu nghiệp vụ của đơn vị khác).
const OUTSIDER_ALLOW = [/^\/api\/session$/, /^\/api\/version$/, /^\/api\/health$/, /^\/api\/push\/config$/, /^\/api\/notifications/, /^\/api\/units$/, /^\/api\/platform\/setting-locks$/];

function getPaths() {
  const found = new Set();
  for (const file of fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(ROUTES_DIR, file), 'utf8');
    for (const m of src.matchAll(/router\.get\(\s*['"`](\/api\/[^'"`]+)['"`]/g)) found.add(m[1].replace(/:[A-Za-z_]+/g, '1'));
  }
  return [...found].sort();
}

test('route parser finds the real surface (guards against a silently empty test)', () => {
  assert.ok(getPaths().length > 30, `only ${getPaths().length} paths`);
});

test('a BTV-only user is refused on every GET except the allowlist; DYC is never refused', async () => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  try {
    const btv = await createUser(pool, { units: [['BTV', 'btv_lead']] });
    const dyc = await createUser(pool, { units: [['DYC', 'dyc_engineer']] });
    const paths = getPaths();
    const leaks = [];
    await client.login(btv.email, btv.password);
    for (const p of paths) {
      if (OUTSIDER_ALLOW.some(rx => rx.test(p))) continue;
      const r = await client.request('GET', p);
      if (r.status !== 403) leaks.push(`${p} → ${r.status}`);
    }
    assert.deepEqual(leaks, [], 'BTV read TCKT/platform data');
    const refused = [];
    await client.login(dyc.email, dyc.password);
    for (const p of paths) {
      const r = await client.request('GET', p);
      if (r.status === 403) refused.push(p);
    }
    assert.deepEqual(refused, [], 'DYC (D4) must read everything');
  } finally { await close(); await teardown(); }
});
```

- [ ] **Step 2: Run it**

Run: `cd core && node --test tests/units.leak.test.js`
Expected: PASS 2/2. Nếu có dòng trong `leaks`: đó là lỗ rò thật — sửa route (thêm prefix vào `LEGACY_PREFIXES` hoặc gắn `settingGuard`/`platformAdmin`), **không** nới `OUTSIDER_ALLOW`, trừ khi route đó thật sự là dữ liệu cá nhân của người gọi (ghi lý do trong comment cạnh regex). Nếu có dòng trong `refused`: route thiếu nhánh DYC — sửa route.

- [ ] **Step 3: Run full suite**

Run: `cd core && npm test > /tmp/core.log 2>&1; grep -E "^ℹ (tests|pass|fail)" /tmp/core.log`
Expected: `fail 0`

- [ ] **Step 4: Docs**

- `docs/dev/kien-truc.md`: sơ đồ middleware mới: session → static → `loadUnitContext` → `legacyGate` (theo prefix) → routes (`auth`, `admin`/`manager` đọc `req.actor`, `settingGuard`, `platformAdmin`). Thêm `core/src/units/`, `core/src/settings/`. Bump.
- `docs/ai/bat-bien.md`: "Mọi route `GET /api/*` mới phải qua `units.leak.test.js` — người ngoài 403, DYC không 403". Bump.
- `docs/ops/deploy-va-nhanh.md`: thêm mục "Deploy GĐ1-A": (1) backup `core-db` trước khi merge vào `main`; (2) sau deploy staging chạy trên VM `docker compose -p ultimate-tckt-staging exec core-db mysql ... -e "SELECT COUNT(*) FROM unit_memberships; SELECT COUNT(*) FROM users; SELECT name FROM platform_migrations;"` — `unit_memberships` ≥ `users`, có `multi_unit_backfill_v1`; (3) `docker compose ... logs core | grep -i "migrat"` không có `Auto-migration failed`; (4) đăng nhập một tài khoản TCKT thường và một tài khoản `CORE_DEVOPS_EMAILS`, kiểm `/api/session` có `units`; chỉ khi cả 4 đạt mới mở PR `staging → main`. Bump.
- `.kiro/specs/nen-tang-da-don-vi/tasks.md`: tick mục 1, 2, 3, 4 và các ý backend của mục 8; ghi chú "UI mục 8 → GĐ1-D".

- [ ] **Step 5: Commit**

```bash
npm run docs:index && npm run docs:check -- --base origin/staging
git add core/tests/units.leak.test.js docs/ .kiro/specs/nen-tang-da-don-vi/tasks.md
git commit -m "test(core): route-wide unit leak test; docs for GĐ1-A rollout"
```

---

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu: plan GĐ1-A (task spec 1–4 + backend mục 8) | DYC |
