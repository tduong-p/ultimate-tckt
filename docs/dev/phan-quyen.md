---
doc_id: DEV-RBAC-001
title: Phân quyền
version: 3.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-28
related_code: [core/src/policies/**, core/src/middleware/auth.js, core/src/middleware/unit-context.js, services/ctd-api/backend/app/deps.py]
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

## Middleware ngữ cảnh đơn vị — `loadUnitContext` (đã code, `core/src/middleware/unit-context.js`)

Middleware `loadUnitContext` chạy **sau session** và **sau `express.static`**, trước mọi route. Gắn 4 thuộc tính
vào mỗi request đã đăng nhập:

| Property | Kiểu | Mô tả |
|---|---|---|
| `req.memberships` | `Membership[]` | Danh sách đơn vị user tham gia (chỉ đơn vị `is_active=1`), mỗi phần tử `{ unit_id, code, name, kind, role }`. Rỗng nếu chưa đăng nhập hoặc không có membership. |
| `req.unit` | `{ id, code, name, kind }` hoặc `null` | Đơn vị đang chọn. `null` nếu chưa đăng nhập hoặc không có membership. |
| `req.unitRole` | `string` hoặc `null` | Role của user trong đơn vị đang chọn. |
| `req.actor` | `{ ...session.user, role }` hoặc `null` | `role` = `legacyRole(memberships, method)` — dùng cho route Điều hành cũ (`admin`, `manager`...). |

**Fallback logic:**
- Nếu `session.current_unit_id` trỏ tới đơn vị không thuộc quyền hoặc bị tắt → tự chọn membership đầu tiên
  (theo thứ tự `unit_memberships.id`).
- User không có membership nào → `req.unit = null`, `req.memberships = []`, `req.actor.role = null`.
  Middleware **không trả 403** — việc chặn thuộc về middleware `auth` (Task 4).

**`legacyRole(memberships, method)` — bridge cho route Điều hành cũ:**
- GET/HEAD **và** có membership DYC (`kind = 'platform_owner'`) → `'admin'`
- Có membership TCKT → role TCKT của user
- Còn lại → `null`
- **Không phụ thuộc** `current_unit_id`. Lý do: frontend `core/public/` chưa có bộ chọn đơn vị (GĐ1-D);
  nếu tính theo đơn vị đang chọn, người vừa DYC vừa TCKT sẽ mất quyền ghi TCKT khi đứng ở DYC.

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
