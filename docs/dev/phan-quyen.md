---
doc_id: DEV-RBAC-001
title: Phân quyền
version: 1.2
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: [core/src/policies/**, core/src/middleware/auth.js, core/src/middleware/unit-context.js, core/src/middleware/legacy-gate.js, core/src/services/audit.js, services/ctd-api/backend/app/deps.py]
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
  `devops` (executive **và** cờ devops — xem dưới), `managerOrEventLead` (executive/leadership, hoặc người được
  gán Event Lead của đúng hoạt động đang thao tác).
- Phạm vi dữ liệu: `activityScope(user)` trong `core/src/policies/access.js` — executive thấy tất cả (`1=1`);
  người khác chỉ thấy hoạt động công khai hoặc hoạt động của tổ mình (qua `activity_teams`/`user_teams`).
  `canManageActivity`, `canManageTeam`, `canManageUser`, `canReviewTask` áp thêm điều kiện theo vai trò +
  quan hệ với team/hoạt động cụ thể (là người tạo, Event Lead, hoặc lead/vice-lead của tổ liên quan).
- **Devops** (quyền cấu hình SMTP/Templates/Rules/Cron) là một lớp **cắt ngang** role, không phải role riêng:
  cần vừa `isExecutive` vừa `isDevops` (`users.is_devops = 1` hoặc email nằm trong allowlist `DEVOPS_EMAILS`).
  Trang Delivery Log (chỉ đọc) chỉ cần `admin` bình thường; mọi trang cấu hình còn lại cần `devops`.

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

## Membership và `req.actor` (`core/src/middleware/unit-context.js`)

Nguồn quyền cho route Điều hành cũ giờ là bảng `unit_memberships`, không còn đọc thẳng `users.role`.
`createUnitContext(db)` chạy sau session middleware, gắn vào mỗi request: `req.memberships` (mảng membership
đang hoạt động của user, từ `listMemberships`), `req.unit`/`req.unitRole` (đơn vị đang chọn — `current_unit_id`
lưu trong session), và `req.actor` = `{ ...session.user, role: legacyRole(...) }`. Middleware `admin`, `manager`,
`managerOrEventLead` đọc `req.actor` thay vì `req.session.user`; `isExecutive`/`isLeadership` không đổi.

`legacyRole(memberships, method)` quy về đúng 3 trường hợp:

| Điều kiện | Kết quả |
|---|---|
| Method là GET/HEAD **và** có membership đơn vị `platform_owner` (DYC) | `'admin'` |
| Ngược lại, có membership đơn vị TCKT | role TCKT của membership đó (`admin`/`vice_admin`/`leader`/`vice_leader`/`member`) |
| Không thuộc hai trường hợp trên (kể cả DYC đang ghi, hoặc chỉ thuộc đơn vị khác TCKT) | `null` |

**Ruling:** role tính theo membership TCKT của người dùng, **không phụ thuộc `current_unit_id`** đang chọn.
Lý do: `core/public/` GĐ1 chưa có bộ chọn đơn vị (GĐ1-D mới thêm); nếu tính theo đơn vị đang đứng, người vừa
thuộc DYC vừa thuộc TCKT sẽ mất quyền ghi TCKT khi đang đứng ở DYC. `current_unit_id` vẫn được lưu và trả về
trong `/api/session`, dùng bởi các route mới từ GĐ1-B trở đi.

`auth` giờ trả 401 nếu chưa đăng nhập, và 403 `{ error: 'Tài khoản chưa thuộc đơn vị nào. Liên hệ quản trị đơn vị.' }`
nếu `req.memberships` rỗng (tài khoản không thuộc đơn vị nào). `current_unit_id` không khớp membership nào
(đơn vị bị xoá membership, hoặc đơn vị bị `is_active=0`) thì tự rơi về membership đầu tiên trong danh sách,
không bao giờ 500. `POST /api/session/unit { unit_id }` chuyển `current_unit_id` sang đơn vị được chỉ định,
403 nếu người dùng không phải thành viên đơn vị đó — xem `docs/dev/api.md`.

`users.role` **giữ trong GĐ1** như bản sao role TCKT (đọc bởi code cũ chưa migrate hết); mọi đường ghi
(`POST /api/users`, `/api/users/bulk-import`, `PATCH /api/users/:id`, tài khoản HUST SSO tạo mới lần đầu) gọi
`syncTcktMembershipFromRole(db, userId)` ngay sau khi commit để đồng bộ ngược sang `unit_memberships`.

## Cổng Điều hành (`legacyGate`) và audit đọc liên đơn vị (`core/src/middleware/legacy-gate.js`)

Route Điều hành "kiểu cũ" nằm dưới các prefix trong `LEGACY_PREFIXES`:

```
/api/activities, /api/documents, /api/archive, /api/reports, /api/tasks,
/api/task-attachments, /api/teams, /api/people, /api/users,
/api/bootstrap, /api/my-tasks-today, /api/weight-presets
```

`/api/admin/weight-presets` (setting `managed_by=unit`, quản bởi `settingGuard` — GĐ1-A Task 7) **không** nằm
trong danh sách này — đừng thêm nhầm.

`createLegacyGate(db)` chạy ngay sau `createUnitContext(db)` trong `app.js`, áp cho các prefix trên, theo đúng
3 quy tắc:

1. Chưa đăng nhập hoặc không có membership nào → `next()` (để `auth` ở route xử lý, trả 401/403 riêng).
2. Có membership TCKT → `next()` — ghi/đọc bình thường theo role TCKT của chính họ.
3. Không có membership TCKT nhưng có membership DYC (`platform_owner`) **và** method là GET/HEAD → ghi một dòng
   `audit_logs` (`action='cross_unit_read'`, `target_type='http'`, `target_id='<METHOD> <path không query>'`,
   `owner_unit_id=<id TCKT>`), rồi `next()`. Còn lại (DYC đang ghi, hoặc đơn vị khác không phải TCKT/DYC) →
   403 `{ error: 'Chức năng Điều hành hiện chỉ dành cho Ban TCKT.' }` — middleware lỗi chung
   (`core/src/middleware/errors.js`) không đọc `err.status` nên cổng này tự trả response, không gọi `next(error)`
   cho nhánh 403.

`recordAudit(db, entry)` (`core/src/services/audit.js`) là hàm ghi `audit_logs` dùng chung — mọi chỗ khác cần
ghi audit (đổi mức xem, khoá/mở khoá setting, đổi membership — GĐ1-A Task 6/7) gọi lại hàm này, không tự viết
`INSERT` riêng.

Route mới thêm trong `core/src/routes/*` (trừ đăng nhập/SSO/onboarding/`/api/account` trong `system.js`) đọc
`req.actor`, **không** đọc `req.session.user` — xem mục "Membership và `req.actor`" phía trên.

## Quyết định đã chốt nhưng CHƯA LÀM (theo `.kiro/specs/nen-tang-da-don-vi/`)

Hai điểm dưới đây là quyết định nghiệp vụ đã chốt ngày 2026-09-23, **chưa có trong code** — đừng lập trình theo
đây mà không kiểm tra lại trạng thái `.kiro/specs/nen-tang-da-don-vi/tasks.md` trước:

- **DYC là admin global.** DYC (Văn phòng Đoàn trường) sẽ đọc được mọi dữ liệu nghiệp vụ của mọi đơn vị và mọi
  module (kể cả hồ sơ CTD), có audit log riêng. Phần route Điều hành cũ trong `core/` **đã làm** (xem mục
  "Cổng Điều hành (`legacyGate`)" phía trên: DYC đọc được, có audit `cross_unit_read`, không ghi được). **Chưa có**
  cơ chế tương đương bên `services/ctd-api/` — CTD vẫn kiểm quyền độc lập trong phạm vi của mình.
- **TCKT từ tổ phó trở lên có quyền CTD.** Người dùng Core có role `vice_leader`, `leader`, `vice_admin`, `admin`
  sẽ được cấp quyền tương đương role `tckt` bên CTD; `member` thì không. Hiện tại **chưa có** cầu nối cấp quyền
  CTD tự động từ role Core — CTD vẫn cấp role độc lập qua `identity.py`/seed của chính nó.

Khi lập trình hai phần trên, cập nhật bảng ở tài liệu này và bỏ đoạn "chưa làm" tương ứng.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
| 1.1 | 2026-09-24 | Thêm mục "Membership và `req.actor`": `unit_memberships` là nguồn quyền, `legacyRole`, `auth` 403 khi không có membership, `current_unit_id` rơi về membership đầu tiên | DYC |
| 1.2 | 2026-09-24 | Thêm mục "Cổng Điều hành (`legacyGate`)": `LEGACY_PREFIXES`, 3 quy tắc gate, audit `cross_unit_read`, `recordAudit`; cập nhật "DYC là admin global" — phần core đã làm | DYC |
