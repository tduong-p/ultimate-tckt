---
doc_id: DEV-RBAC-001
title: Phân quyền
version: 6.5
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-10
related_code: [core/src/policies/**, core/src/middleware/auth.js, core/src/middleware/unit-context.js, core/src/middleware/legacy-gate.js, core/src/services/audit.js, core/src/routes/system.js, services/ctd-api/backend/app/deps.py]
---

# Phân quyền

Tài liệu này mô tả phân quyền **đang chạy trong code** của cả hai app, cộng phần quyết định nghiệp vụ đã chốt
(2026-09-23) nhưng **chưa lập trình** — phần sau được đánh dấu rõ để không ai tưởng nhầm là đã hoạt động.

## Core / module Điều hành — 5 role TCKT (đã code, `core/src/middleware/auth.js` + `core/src/policies/access.js`)

| Role | Nhóm | Quyền chính |
|---|---|---|
| `admin` | Điều hành (executive) | Toàn quyền: duyệt hoạt động, quản lý team/người dùng, cấu hình weight-preset, bypass Anti-Self-Review. |
| `vice_admin` | Điều hành (executive) | Ngang `admin` trong `isExecutive` — cùng tập quyền. |
| `leader` | Lãnh đạo tổ (leadership) | Tạo hoạt động, phân công/nghiệm thu task trong tổ mình lãnh đạo, xoá thành viên thường khỏi tổ. |
| `vice_leader` | Lãnh đạo tổ (leadership) | Như `leader` trong phạm vi tổ, trừ các quyền chỉ dành cho executive (không duyệt hoạt động cấp toàn hệ thống). |
| `member` | Thành viên | Thực hiện task được giao, tự ghi nhận việc phát sinh (`log-task`). Không tự nghiệm thu task của chính mình (Anti-Self-Review), trừ khi được gán làm Event Lead của hoạt động đó. |

Cơ chế trong code:
- `isExecutive(user)` = role ∈ `['admin', 'vice_admin']`; `isLeadership(user)` = role ∈ `['leader', 'vice_leader']`
  (`core/src/middleware/auth.js`).
- Middleware theo route: `auth` (đã đăng nhập), `admin` (executive), `manager` (executive hoặc leadership),
  `platformAdmin` (yêu cầu membership DYC), `managerOrEventLead` (executive/leadership, hoặc người được
  gán Event Lead của đúng hoạt động đang thao tác).
- Phạm vi dữ liệu: `activityScope(user)` trong `core/src/policies/access.js` — executive thấy tất cả (`1=1`);
  người khác chỉ thấy hoạt động công khai, hoạt động của tổ mình (qua `activity_teams`/`user_teams`), hoặc hoạt động
  mà mình là Event Lead / người tạo / người tham gia (`participants`) dù không thuộc tổ nào của hoạt động.
  `canManageActivity`, `canManageTeam`, `canManageUser`, `canReviewTask` áp thêm điều kiện theo vai trò +
  quan hệ với team/hoạt động cụ thể (là người tạo, Event Lead, hoặc lead/vice-lead của tổ liên quan).
- **Platform Admin** (quyền cấu hình SMTP/Templates/Rules/Cron): yêu cầu người dùng phải có membership của đơn vị DYC (`kind = 'platform_owner'`).
  Không phụ thuộc vào các role Điều hành (admin, leader, v.v.). Danh sách `DEVOPS_EMAILS` luôn được cấp membership này tự động lúc khởi động hệ thống và lúc đăng nhập.
  Trang Delivery Log (chỉ đọc) chỉ cần `admin` bình thường; mọi trang cấu hình còn lại cần `platformAdmin`.
- **Ranh giới quản lý tài khoản** (`canManageUser`): tổ trưởng/tổ phó chỉ sửa/khoá được `member` mà **mọi** tổ của
  người đó đều do mình phụ trách; không được đổi mật khẩu hoặc email của người khác (chỉ executive). Thêm một
  `member` vào tổ mình không làm người đó trở thành "người của mình" nếu họ còn thuộc tổ khác.
- **Event Lead** (`member` được gán) được thêm task và người tham gia cho hoạt động của mình, nhưng chỉ với các tổ
  thuộc `activity_teams` của hoạt động đó.
- **Bài cập nhật hoạt động**: `kind=review_note` chỉ người `canManageActivity` mới đăng được; `attachment_url` phải
  là http(s); `task_id` phải thuộc đúng hoạt động. Đính tệp vào task (`POST /api/tasks/:id/attachments`) cần
  `canTouchTask` (quản lý tổ của task hoặc được giao task).
- **Devops** (quyền cấu hình SMTP/Templates/Rules/Cron) là một lớp **cắt ngang** role, không phải role riêng:
  cần vừa `isExecutive` vừa `isDevops` (`users.is_devops = 1` hoặc email nằm trong allowlist `DEVOPS_EMAILS`).
  Trang Delivery Log (chỉ đọc) chỉ cần `admin` bình thường; mọi trang cấu hình còn lại cần `devops`.

## Middleware ngữ cảnh đơn vị — `loadUnitContext` (đã code, `core/src/middleware/unit-context.js`)

Middleware `loadUnitContext` chạy **sau session** và **sau `express.static`**, trước mọi route. Gắn 4 thuộc tính
vào mỗi request đã đăng nhập:

| Property | Kiểu | Mô tả |
|---|---|---|
| `req.memberships` | `Membership[]` | Danh sách đơn vị user tham gia (chỉ đơn vị `is_active=1`), mỗi phần tử `{ unit_id, code, name, kind, role }`. Rỗng nếu chưa đăng nhập hoặc không có membership. |
| `req.unit` | `{ id, code, name, kind, modules }` hoặc `null` | Đơn vị đang chọn; `modules` là danh sách module đang bật từ `unit_modules`. `null` nếu chưa đăng nhập hoặc không có membership. |
| `req.unitRole` | `string` hoặc `null` | Role của user trong đơn vị đang chọn. |
| `req.actor` | `{ ...session.user, role }` hoặc `null` | `role` = `legacyRole(memberships, method)` — dùng cho route Điều hành cũ (`admin`, `manager`...). |

**Fallback logic:**
- Nếu `session.current_unit_id` trỏ tới đơn vị không thuộc quyền hoặc bị tắt → tự chọn membership đầu tiên
  (theo thứ tự `unit_memberships.id`).
- User không có membership nào → `req.unit = null`, `req.memberships = []`, `req.actor.role = null`.
  Middleware **không trả 403** — việc chặn thuộc về middleware `auth` (Task 4).

**`legacyRole(memberships, method)` — bridge cho route Điều hành cũ:**

| Điều kiện | Legacy Role |
|-----------|-------------|
| GET/HEAD + có membership DYC (`kind = 'platform_owner'`) | `'admin'` |
| Có membership TCKT | Role TCKT của user |
| Còn lại | `null` |

**Không phụ thuộc** `current_unit_id`. Lý do: frontend `core/public/` chưa có bộ chọn đơn vị (GĐ1-D);
nếu tính theo đơn vị đang chọn, người vừa DYC vừa TCKT sẽ mất quyền ghi TCKT khi đứng ở DYC.

## Giao việc và Trình — cổng module và quyền trên giao diện web

`/api/directives*` và `/api/submissions*` yêu cầu `auth` và module `dieu-hanh` của đơn vị đang chọn; đơn vị DYC
(`platform_owner`) cũng qua được cổng module. Hai router này không nằm trong `LEGACY_PREFIXES`, nên không được
`legacyGate` ghi audit. Danh sách chỉ đạo lọc theo đơn vị gửi/nhận, nhưng endpoint chi tiết theo ID và một số thao
tác ghi chưa kiểm tra đầy đủ quyền sở hữu đơn vị. Đây là phần còn thiếu đã được ghi nhận tại issue #95 và đang để
sau theo quyết định phạm vi. `GET /api/session` và `POST /api/session/unit` trả `units.current.modules`; đổi đơn vị
sẽ nạp lại danh sách module tương ứng. Web dùng dữ liệu này để ẩn menu và đưa route không phù hợp về `#/dashboard`.
Server vẫn là nơi quyết định cuối cùng cho mọi request.

Các điều kiện nút trong `web/src/core/features/dieuhanh/permissions.ts` phản chiếu điều kiện route Core:

| Thao tác | Điều kiện giao diện |
|---|---|
| Tạo chỉ đạo | BTV (`btv_lead`, `btv_member`) hoặc DYC |
| Tiếp nhận chỉ đạo | Admin/phó admin đơn vị nhận; trạng thái `sent` hoặc `pending` |
| Gắn hoạt động, nộp kết quả | Đơn vị nhận; admin/phó admin/trưởng/phó nhóm hoặc người phụ trách; trạng thái phù hợp |
| Đánh giá chỉ đạo | BTV của đơn vị gửi hoặc DYC; trạng thái `submitted` |
| Tạo trình | Admin/phó admin hoặc BTV |
| Phản hồi trình | BTV đơn vị nhận hoặc DYC; chưa rút; chưa phản hồi hoặc đã đánh dấu `seen` |
| Rút trình | Admin/phó admin của đơn vị gửi; chưa phản hồi và chưa rút |

Frontend dùng role của membership trong đơn vị hiện tại (`unitRole` từ session capabilities), không dùng `users.role`
để quyết định các nút này.

## Membership và `req.actor` — GĐ1-A Task 4 (đã code)

### Nguồn Quyền

Từ GĐ1-A, quyền được tính theo **membership** (`unit_memberships`), không còn chỉ dựa vào `users.role`.

Middleware `loadUnitContext` gắn vào mọi request:
- `req.memberships`: Mảng memberships của user (`[{unit_id, code, name, kind, role}]`)
- `req.unit`: Đơn vị hiện tại user đang chọn (`{id, code, name, kind}`)
- `req.unitRole`: Role trong đơn vị hiện tại (string)
- `req.actor`: User với `role` = legacy role TCKT (để tương thích route cũ)

### Middleware Auth Changes

**`auth` middleware (`core/src/middleware/auth.js`):**
- ✅ Kiểm tra `req.session.user` (401 nếu chưa đăng nhập)
- ✅ Kiểm tra `req.memberships?.length` (403 nếu không thuộc đơn vị nào)
  - Message: `"Tài khoản chưa thuộc đơn vị nào. Liên hệ quản trị đơn vị."`

**`admin`, `manager`, `managerOrEventLead`:**
- ✅ Đọc `req.actor` thay vì `req.session.user`

### Current Unit Fallback

- User có `current_unit_id` trong session → Ưu tiên chọn đơn vị đó
- `current_unit_id` không còn trong memberships (gỡ membership / đơn vị bị tắt) → **Tự động fallback về membership đầu tiên**
- Không có membership nào → 403 tất cả route bảo mật

### API Session

**GET /api/session** trả về:
```json
{
  "user": {
    "id": 1,
    "name": "...",
    "role": "leader",  // ← Legacy role (computed via legacyRole)
    "is_devops": 0     // ← 1 nếu có DYC membership
  },
  "units": {
    "current": { "id": 1, "code": "TCKT", "name": "...", "kind": "department" },
    "memberships": [
      { "unit_id": 1, "code": "TCKT", "name": "...", "kind": "department", "role": "leader" }
    ]
  }
}
```

**POST /api/session/unit** - Đổi đơn vị đang chọn:
- Request: `{ "unit_id": 2 }`
- Response: 200 (session view mới) | 403 (không thuộc đơn vị đó)

### Role Sync

Mọi đường ghi `users.role` tự động đồng bộ membership TCKT:
- `POST /api/users` (tạo mới)
- `POST /api/users/bulk-import` (import hàng loạt)
- `PATCH /api/users/:id` (cập nhật)
- SSO login lần đầu (`findOrCreateHustAccount`)

Bốn route của `teams.js` đổi role/cờ lead (`POST` và `PATCH`/`DELETE` `/api/teams/:id/members[/:userId]`, `DELETE /api/teams/:id`) chỉ **cập nhật** membership TCKT đang có
(`syncTcktMembershipFromRole(db, userId, { createIfMissing: false })`). Chúng không tạo lại membership đã bị gỡ qua `DELETE /api/units/:id/members/:userId`; các đường tạo user mới ở trên dùng mặc định `createIfMissing: true`.
Gỡ membership TCKT hiện chưa dọn `user_teams` của người đó (PLAN-REL-001 Task 6, R7).

## CTD — role theo `services/ctd-api/backend/app/models/identity.py`

| Role (`Role` enum) | Ý nghĩa |
|---|---|
| `sinh_vien` | Người nộp hồ sơ Đảng. Chỉ sửa/đính file hồ sơ của chính mình, khi hồ sơ đang ở trạng thái cho sửa. |
| `can_bo_don_vi` | Cán bộ đơn vị — xử lý hồ sơ (đánh giá giấy tờ, thêm đầu mục), thuộc nhóm `VAI_TRO_CAN_BO`. |
| `tckt` | Cán bộ TCKT — cùng nhóm `VAI_TRO_CAN_BO`. Đây là role được cấp cho người bên Core có quyền CTD (xem mục "quyết định chưa làm" bên dưới). |
| `vp_doan` | Văn phòng Đoàn trường — cùng nhóm `VAI_TRO_CAN_BO`. |
| `chi_bo` | Chi bộ — cùng nhóm `VAI_TRO_CAN_BO`. |
| `quan_tri` | Quản trị hệ thống CTD — có quyền của cả người nộp (thao tác thay khi hỗ trợ) lẫn cán bộ. |

Cơ chế trong code (`services/ctd-api/backend/app/services/permissions.py`): kiểm quyền theo **danh sách trắng**
`LUAT: dict[ThaoTac, Luat]` — mỗi thao tác (`dinh_file`, `khai_khong_ap_dung`, `sua_thong_tin`, `danh_gia_giay_to`,
`them_dau_muc`) khai rõ vai trò nào được làm, có bắt buộc là chủ hồ sơ không, và hồ sơ phải ở trạng thái nào.
Thêm thao tác mới mà quên khai vào bảng này thì bị từ chối mặc định — không có nhánh "còn lại thì cho qua".
Hồ sơ ở trạng thái kết thúc (`TERMINAL_STATUSES`) thì không ai sửa nội dung được nữa, kể cả `quan_tri`.

Xác thực CTD: JWT HS256 tự phát (`app/deps.py`), không liên quan trực tiếp tới session Core trừ khi đi qua JWT
bridge mô tả ở `docs/dev/kien-truc.md`.

## Legacy Gate — Bảo vệ route Điều hành cũ — GĐ1-A Task 5 (đã code)

Middleware `createLegacyGate` (`core/src/middleware/legacy-gate.js`) bảo vệ 12 route prefix Điều hành cũ, chạy **sau** `loadUnitContext` và **trước** các route handler. Ráp vào pipeline qua `app.use(LEGACY_PREFIXES, createLegacyGate(db))`.

### 12 Route Prefix được bảo vệ

```javascript
'/api/activities', '/api/documents', '/api/archive', '/api/reports', '/api/tasks',
'/api/task-attachments', '/api/teams', '/api/people', '/api/users',
'/api/bootstrap', '/api/my-tasks-today', '/api/weight-presets'
```

### Ma trận phân quyền

| Trạng thái user | Unit có module dieu-hanh | TCKT membership | DYC membership | GET/HEAD | POST/PATCH/DELETE |
|---|---|---|---|---|---|
| Chưa login / Mồ côi | - | - | - | → `next()` (auth xử lý) | → `next()` (auth xử lý) |
| Đơn vị có module | ✅ | - | - | ✅ Cho qua, không audit | ✅ Cho qua |
| Thành viên TCKT | - | ✅ | - hoặc ✅ | ✅ Cho qua, không audit | ✅ Cho qua |
| Chỉ DYC (không TCKT) | ❌ | ❌ | ✅ | ✅ Cho qua + **audit log** | ❌ 403 |
| Outsider (VPD, LCĐ...) | ❌ | ❌ | ❌ | ❌ 403 | ❌ 403 |

**Ưu tiên kiểm tra:** 1) Đơn vị hiện tại có module `dieu-hanh` → 2) TCKT membership → 3) DYC membership. Người có cả hai membership được coi là TCKT, không bị audit.

**Đơn vị có module:** Kiểm tra bảng `unit_modules` xem `req.unit.id` có entry với `module_id='dieu-hanh'` không. Theo seed mặc định, TCKT và BTV có module này.

### Audit Log Format

Mỗi lần DYC đọc dữ liệu TCKT, một bản ghi được tạo trong `audit_logs`:

```sql
INSERT INTO audit_logs(
  actor_id,           -- user.id của DYC
  actor_unit_id,      -- unit_id của DYC
  action,             -- 'cross_unit_read'
  target_type,        -- 'http'
  target_id,          -- 'GET /api/activities' (truncated to 191 chars)
  owner_unit_id,      -- unit_id của TCKT
  meta                -- NULL (có thể mở rộng sau)
) VALUES (...)
```

Service: `core/src/services/audit.js` — hàm `recordAudit(db, entry)`.

### Refactor req.session.user → req.actor

Tất cả route Điều hành cũ (6 file + một phần system.js) đã chuyển sang đọc `req.actor` thay vì `req.session.user`:

- ✅ `core/src/routes/activities.js` (toàn bộ)
- ✅ `core/src/routes/tasks.js` (toàn bộ)
- ✅ `core/src/routes/users.js` (toàn bộ)
- ✅ `core/src/routes/teams.js` (toàn bộ)
- ✅ `core/src/routes/documents.js` (toàn bộ)
- ✅ `core/src/routes/reports.js` (toàn bộ)
- ✅ `core/src/routes/system.js`: chỉ `/api/bootstrap`, `/api/my-tasks-today`
- ⚠️ `core/src/routes/system.js`: GIỮ NGUYÊN `req.session.user` cho `/api/login`, `/api/logout`, `/auth/microsoft/*`, `/api/onboarding/*`, `/api/account`, `/api/email/test`

### Test Coverage

File `core/tests/units.legacy-gate.test.js` bao phủ 5 kịch bản:

1. **Outsiders (VPD without module) get 403** — VPD không có module dieu-hanh bị chặn mọi route
2. **DYC reads with audit, cannot write** — DYC GET thành công + audit log, POST/PATCH bị 403
3. **TCKT không audit** — TCKT member truy cập bình thường, không tạo audit log
4. **Dual user (TCKT + DYC)** — TCKT takes precedence, không audit, write được
5. **Orphan user → auth 403** — User không membership nào bị auth chặn với message "chưa thuộc đơn vị"

File `core/tests/units.visibility.test.js` kiểm tra cross-unit data visibility với `scopeFor` và `unit_visibility_policies`.

## Quyết định đã chốt nhưng CHƯA LÀM (theo `.kiro/specs/nen-tang-da-don-vi/`)

Hai điểm dưới đây là quyết định nghiệp vụ đã chốt ngày 2026-09-23, **chưa có trong code** — đừng lập trình theo
đây mà không kiểm tra lại trạng thái `.kiro/specs/nen-tang-da-don-vi/tasks.md` trước:

- **DYC là admin global.** DYC (Văn phòng Đoàn trường) sẽ đọc được mọi dữ liệu nghiệp vụ của mọi đơn vị và mọi
  module (kể cả hồ sơ CTD), có audit log riêng. Hiện tại **chưa có** cơ chế nào trong `core/` hay `services/ctd-api/`
  cấp quyền xuyên module như vậy — cả hai app vẫn kiểm quyền độc lập trong phạm vi của mình.
- **TCKT từ tổ phó trở lên có quyền CTD.** Người dùng Core có role `vice_leader`, `leader`, `vice_admin`, `admin`
  sẽ được cấp quyền tương đương role `tckt` bên CTD; `member` thì không. Hiện tại **chưa có** cầu nối cấp quyền
  CTD tự động từ role Core — CTD vẫn cấp role độc lập qua `identity.py`/seed của chính nó.

Khi lập trình hai phần trên, cập nhật bảng ở tài liệu này và bỏ đoạn "chưa làm" tương ứng.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
| 2.0 | 2026-09-27 | Đồng bộ `main` = `staging`: nội dung theo bản `main` (chưa có code đa đơn vị GĐ1-A). Bản 1.4 trên `staging` mô tả GĐ1-A, lưu ở nhánh `archive/gd1a-staging` — NTMT làm lại ở PR sau | DYC |
| 3.0 | 2026-09-28 | Thêm mục `loadUnitContext` middleware: `req.unit`, `req.unitRole`, `req.memberships`, `req.actor`, fallback logic, `legacyRole`. Thêm `unit-context.js` vào `related_code`. | NTMT |
| 4.0 | 2026-09-29 | Thêm section "Membership và req.actor": auth middleware 403 check, bảng legacyRole mapping, API session structure, role sync. Thêm `system.js` vào `related_code`. | DYC |
| 5.0 | 2026-09-29 | Thêm section "Legacy Gate": 12 route prefixes, ma trận phân quyền 5 trạng thái, audit log format, refactor req.actor, test coverage. Thêm `legacy-gate.js` và `audit.js` vào `related_code`. | DYC |
| 6.0 | 2026-09-29 | Cập nhật cấu trúc phân quyền cấu hình nền tảng thành platformAdmin thay thế devops. Thêm chi tiết về cơ chế bootstrap DYC membership. | DYC |
| 3.1 | 2026-09-30 | Phạm vi hoạt động, ranh giới canManageUser, Event Lead, quy tắc bài cập nhật (pilot PR 4) | DYC |
| 6.1 | 2026-10-01 | Cập nhật ma trận phân quyền Legacy Gate: thêm kiểm tra unit_modules (đơn vị có module dieu-hanh được truy cập). Cập nhật test coverage ghi nhận units.visibility.test.js | AI |
| 6.2 | 2026-10-03 | Đồng bộ hai chiều users.role ↔ unit_memberships (TCKT) trên cả 4 route teams.js (R1, G1) | DYC |
| 6.3 | 2026-10-03 | Route tổ chỉ cập nhật membership TCKT đang có, không hồi sinh membership đã gỡ (`createIfMissing: false`) | DYC |
| 6.4 | 2026-10-09 | Ghi nhận `req.unit.modules`, module trong session và cổng/quyền của Giao việc, Trình trên web | DYC |
| 6.5 | 2026-10-10 | Sửa mô tả audit: directives/submissions không thuộc legacy gate; ghi rõ thiếu kiểm tra sở hữu đơn vị và liên kết issue #95 | DYC |
