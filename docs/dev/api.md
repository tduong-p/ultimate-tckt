---
doc_id: DEV-API-001
title: API
version: 5.3
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-02
related_code: [core/src/routes/**, services/ctd-api/backend/app/api/**]
---

# API

Bảng endpoint dưới đây được sinh bằng cách grep trực tiếp `router.get/post/patch/put/delete` (Core) và
`@router.get/post/patch/put/delete` (CTD) trong code hiện tại — không chép từ tài liệu cũ. Khi thêm/xoá route,
cập nhật lại bảng này (tăng version MINOR nếu chỉ thêm dòng, MAJOR nếu đổi/xoá đường dẫn đang dùng).

> Ghi chú: glob `services/ctd-api/backend/app/routers/**` trong kế hoạch gốc không khớp cấu trúc thật của repo —
> router CTD nằm ở `app/api/`, đã sửa lại trong `related_code` ở trên.

## Core — `core/src/routes/*.js` (đăng ký qua `core/src/routes/index.js`)

| Method | Path | File |
|---|---|---|
| GET | `/api/session` | `system.js` |
| POST | `/api/session/unit` | `system.js` |
| GET | `/auth/microsoft`, `/auth/microsoft/callback` | `system.js` |
| GET | `/api/version`, `/api/health` | `system.js` |
| POST | `/api/login`, `/api/logout` | `system.js` |
| POST | `/api/onboarding/faculty-notice`, `/api/onboarding/student-class` | `system.js` |
| PATCH | `/api/account` | `system.js` |
| GET | `/api/bootstrap`, `/api/my-tasks-today` | `system.js` |
| GET/POST/PATCH/DELETE | `/api/weight-presets`, `/api/admin/weight-presets[/:id]` | `system.js` |
| GET/POST | `/api/people`, `/api/users`, `/api/users/bulk-import` | `users.js` |
| PATCH/DELETE | `/api/users/:id` | `users.js` |
| GET/POST | `/api/activities` | `activities.js` |
| GET/PATCH/DELETE | `/api/activities/:id` | `activities.js` |
| POST | `/api/activities/:id/{submit,approve,reject,request-changes,volunteer,participants,updates,tasks,log-task}` | `activities.js` |
| GET/PATCH | `/api/tasks/:id` | `tasks.js` |
| POST | `/api/tasks/:id/{attachments,acknowledge,submit-review,review,cancel,checklist}` | `tasks.js` |
| PATCH/DELETE | `/api/tasks/:id/checklist/:itemId`, `/api/tasks/:id/status` | `tasks.js` |
| GET | `/api/task-attachments/:id/content` | `tasks.js` |

Ngày nghiệp vụ ("hôm nay", quá hạn, sắp đến hạn) luôn tính theo giờ Việt Nam qua `core/src/date-vn.js` (`dateInVietnam`), truyền vào SQL thay cho `CURDATE()`; không đặt `TZ` cho container.

Quy tắc lỗi bổ sung (pilot PR 4): `POST /api/activities/:id/updates` trả 400 khi `kind` không hợp lệ, `attachment_url` không phải http(s) hoặc `task_id` không thuộc hoạt động, 403 khi `kind=review_note` mà người gọi không quản lý được hoạt động; `POST /api/tasks/:id/attachments` trả 403 nếu người gọi không quản lý tổ của task và không được giao task; `POST /api/activities/:id/volunteer` không hạ người đã `confirmed`.
| GET/POST | `/api/teams` | `teams.js` |
| PATCH/DELETE | `/api/teams/:id` | `teams.js` |
| GET | `/api/teams/:id/{members,overview}` | `teams.js` |
| POST/PATCH/DELETE | `/api/teams/:id/members[/:userId]` | `teams.js` |
| GET/POST/PATCH | `/api/documents`, `/api/documents/:id` | `documents.js` |
| GET | `/api/archive` | `reports.js` |
| GET | `/api/reports/export` | `reports.js` |
| GET/POST/PATCH | `/api/notifications`, `/api/notifications/:id/seen`, `/api/notifications/seen` | `notifications.js` |
| GET/POST/DELETE | `/api/platform/setting-locks[/:id]` | `platform.js` |
| GET | `/api/units`, `/api/units/:id/members` | `units.js` |
| PUT/DELETE | `/api/units/:id/members/:userId` | `units.js` |
| GET/POST/PUT/DELETE/PATCH | `/api/admin/cron/{handlers,jobs[/:id][/activate\|deactivate\|run-now\|runs]}` | `settings-cron.js` |

Middleware quyền áp cho từng route: xem `docs/dev/phan-quyen.md`. Không có route nào bỏ qua `auth` trừ
`/api/health`, `/api/version`, `/api/login`, `/auth/microsoft*`.

---

## Endpoint Details (Core)

### GET /api/session

Lấy thông tin session hiện tại.

**Auth:** Optional (trả `user: null` nếu chưa đăng nhập)

**Response 200:**
```json
{
  "user": {
    "id": 1,
    "name": "Nguyễn Văn A",
    "email": "nva@example.com",
    "role": "leader",        // Legacy TCKT role (computed via legacyRole)
    "is_devops": 0,          // 1 nếu có membership DYC
    "avatar_color": "#3b82f6",
    "hust_identity": { "kind": "student", "cohort": 67, ... }
  },
  "units": {
    "current": {
      "id": 1,
      "code": "TCKT",
      "name": "Ban Tổ chức – Kiểm tra",
      "kind": "department"
    },
    "memberships": [
      {
        "unit_id": 1,
        "code": "TCKT",
        "name": "Ban Tổ chức – Kiểm tra",
        "kind": "department",
        "role": "leader"
      }
    ]
  }
}
```

**Chưa đăng nhập:**
```json
{
  "user": null,
  "units": {
    "current": null,
    "memberships": []
  }
}
```

### POST /api/session/unit

Đổi đơn vị đang chọn (current unit).

**Auth:** Required

**Request Body:**
```json
{
  "unit_id": 2
}
```

**Response 200:** Session view mới (giống GET /api/session)

**Response 403:**
```json
{
  "error": "Bạn không thuộc đơn vị này."
}
```

---

## Platform Settings & Locks

### GET /api/platform/setting-locks

Lấy danh sách tất cả setting locks hiện tại.

**Auth:** Required (mọi user đăng nhập, để UI hiển thị icon 🔒)

**Response 200:**
```json
[
  {
    "id": 1,
    "setting_key": "weight_presets",
    "unit_id": null,           // null = lock toàn platform
    "unit_code": null,
    "reason": "Đang kiểm tra hệ thống",
    "locked_by": 5,
    "created_at": "2026-09-29T10:30:00.000Z"
  },
  {
    "id": 2,
    "setting_key": "email.templates",
    "unit_id": 3,
    "unit_code": "TCKT",
    "reason": "Đang cấu hình lại template",
    "locked_by": 5,
    "created_at": "2026-09-29T11:00:00.000Z"
  }
]
```

### POST /api/platform/setting-locks

Tạo một setting lock mới.

**Auth:** platformAdmin (chỉ DYC)

**Request Body:**
```json
{
  "setting_key": "weight_presets",
  "unit_id": null,              // null = lock toàn platform, hoặc id đơn vị cụ thể
  "reason": "Đang kiểm tra hệ thống"
}
```

**Response 201:**
```json
{
  "id": 1
}
```

**Response 400:**
```json
{
  "error": "setting_key không tồn tại trong catalog."
}
// Hoặc
{
  "error": "Chỉ cấu hình unit-level mới có thể khoá."
}
// Hoặc
{
  "error": "reason không được rỗng."
}
```

**Response 403:**
```json
{
  "error": "Chỉ DYC được thao tác cấu hình nền tảng."
}
```

### DELETE /api/platform/setting-locks/:id

Xoá một setting lock.

**Auth:** platformAdmin (chỉ DYC)

**Response 200:**
```json
{
  "ok": true
}
```

**Response 404:**
```json
{
  "error": "Lock không tồn tại."
}
```

**Response 403:**
```json
{
  "error": "Chỉ DYC được thao tác cấu hình nền tảng."
}
```

### Hiệu ứng của Setting Lock

Khi một setting bị lock:

1. **Unit admin bị chặn 403 khi cố sửa:**
```json
{
  "error": "Cấu hình này đang bị DYC khoá.",
  "locked": true,
  "reason": "Đang kiểm tra hệ thống",
  "locked_by_name": "Nguyễn Văn A",
  "locked_at": "2026-09-29T10:30:00.000Z"
}
```

2. **DYC vẫn sửa được** (bypass lock)
3. **GET/HEAD requests không bị chặn** (chỉ chặn POST/PATCH/DELETE)
4. **Lock platform-level settings không được phép** (chỉ lock unit-level)

---

## Unit Management

### GET /api/units

Lấy danh sách các đơn vị user có quyền xem.

**Auth:** Required

**Permission:**
- DYC: Xem tất cả các đơn vị active
- User thường: Chỉ xem các đơn vị mình là thành viên

**Response 200:**
```json
[
  {
    "id": 1,
    "code": "DYC",
    "name": "DYC — Chủ quản nền tảng",
    "kind": "platform_owner",
    "is_active": 1,
    "created_at": "2026-09-20T00:00:00.000Z"
  },
  {
    "id": 2,
    "code": "BTV",
    "name": "Ban Thường vụ",
    "kind": "standing_committee",
    "is_active": 1,
    "created_at": "2026-09-20T00:00:00.000Z"
  }
]
```

**User không có membership:**
```json
[]
```

### GET /api/units/:id/members

Lấy danh sách thành viên của một đơn vị.

**Auth:** Required

**Permission:** User phải là thành viên của đơn vị này, hoặc là DYC

**Response 200:**
```json
[
  {
    "user_id": 1,
    "name": "Nguyễn Văn A",
    "email": "nva@example.com",
    "role": "admin"
  },
  {
    "user_id": 2,
    "name": "Trần Thị B",
    "email": "ttb@example.com",
    "role": "leader"
  }
]
```

**Response 403:**
```json
{
  "error": "Bạn không có quyền xem thành viên của đơn vị này."
}
```

### PUT /api/units/:id/members/:userId

Thêm hoặc cập nhật thành viên vào đơn vị.

**Auth:** Required

**Permission:**
- DYC (`dyc_admin` hoặc `dyc_engineer`): Quản lý mọi đơn vị, nhưng **chỉ `dyc_admin` mới sửa được chính đơn vị DYC**
- Unit admin: Chỉ quản lý đơn vị của mình

**Request Body:**
```json
{
  "role": "leader"
}
```

**Response 200:**
```json
{
  "ok": true
}
```

**Response 400 - Role không hợp lệ:**
```json
{
  "error": "Role \"btv_lead\" không hợp lệ cho đơn vị loại \"department\"."
}
```

**Response 400 - User bị vô hiệu hóa:**
```json
{
  "error": "User đã bị vô hiệu hóa."
}
```

**Response 403 - Không có quyền:**
```json
{
  "error": "Bạn không có quyền quản lý thành viên của đơn vị này."
}
```

**Response 404 - User không tồn tại:**
```json
{
  "error": "User không tồn tại."
}
```

**Response 404 - Đơn vị không tồn tại:**
```json
{
  "error": "Đơn vị không tồn tại."
}
```

**Behavior đặc biệt:**
- Nếu đơn vị là TCKT, hệ thống tự động đồng bộ `users.role` (legacy field) để tương thích code cũ
- Ghi audit log với `action = 'membership.upsert'`

### DELETE /api/units/:id/members/:userId

Xóa thành viên khỏi đơn vị.

**Auth:** Required

**Permission:** Giống PUT (DYC hoặc unit admin)

**Response 200:**
```json
{
  "ok": true
}
```

**Response 403:**
```json
{
  "error": "Bạn không có quyền quản lý thành viên của đơn vị này."
}
```

**Response 404 - Membership không tồn tại:**
```json
{
  "error": "Membership không tồn tại."
}
```

**Response 409 - Không thể xóa dyc_admin cuối cùng:**
```json
{
  "error": "Không thể xoá dyc_admin cuối cùng. Hãy chỉ định dyc_admin khác trước."
}
```

**Behavior đặc biệt:**
- Chặn xóa `dyc_admin` cuối cùng (409 Conflict) để tránh mất quyền kiểm soát hệ thống
- Nếu xóa membership TCKT và user không còn membership TCKT nào khác, set `users.role = 'member'` (legacy fallback)
- Ghi audit log với `action = 'membership.remove'`

---

## CTD — `services/ctd-api/backend/app/api/*.py` (đăng ký qua `app/main.py`)

| Method | Path | File |
|---|---|---|
| POST | `/api/auth/request-code` (204, không lộ email có tồn tại hay không) | `auth.py` |
| POST | `/api/auth/verify` (trả JWT — chấp nhận mật khẩu HOẶC mã OTP) | `auth.py` |
| GET | `/api/me` | `auth.py` |
| POST | `/api/cases` | `cases.py` |
| GET | `/api/cases` | `cases.py` |
| GET | `/api/cases/{case_id}` | `cases.py` |
| POST | `/api/cases/{case_id}/actions` | `cases.py` |
| GET | `/api/cases/{case_id}/events` | `cases.py` |
| PUT | `/api/cases/{case_id}/detail` | `cases.py` |
| POST | `/api/cases/{case_id}/documents` | `documents.py` |
| POST | `/api/documents/{document_id}/file` | `documents.py` |
| POST | `/api/documents/{document_id}/verdict` | `documents.py` |
| POST | `/api/documents/{document_id}/not-applicable` | `documents.py` |
| GET | `/api/documents/{document_id}/url` | `documents.py` |
| GET | `/api/documents/file` | `documents.py` |

Mọi route trừ `/api/auth/*` yêu cầu header `Authorization: Bearer <token>`, kiểm bởi `current_user`
(`app/deps.py`). Quyền theo thao tác trên từng hồ sơ: `docs/dev/phan-quyen.md`.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
| 2.0 | 2026-09-27 | Đồng bộ `main` = `staging`: nội dung theo bản `main` (chưa có code đa đơn vị GĐ1-A). Bản 1.6 trên `staging` mô tả GĐ1-A, lưu ở nhánh `archive/gd1a-staging` — NTMT làm lại ở PR sau | DYC |
| 3.0 | 2026-09-29 | Thêm POST /api/session/unit vào bảng routing. Thêm section "Endpoint Details" với spec đầy đủ cho GET /api/session và POST /api/session/unit, bao gồm cấu trúc units và user.is_devops. | DYC |
| 4.0 | 2026-09-29 | Thêm 3 endpoints `/api/platform/setting-locks*` vào bảng routing và section "Platform Settings & Locks" với spec đầy đủ (GET, POST, DELETE), logic lock, và hiệu ứng khi bị lock. | DYC |
| 5.0 | 2026-09-29 | Thêm 4 endpoints `/api/units*` vào bảng routing và section "Unit Management" với spec đầy đủ (GET units, GET members, PUT member, DELETE member), permission matrix (DYC vs unit admin), validation, edge cases (last dyc_admin, TCKT role sync). | DYC |
| 2.1 | 2026-09-30 | Quy tắc lỗi mới cho updates, attachments, volunteer (pilot PR 4) | DYC |
| 2.2 | 2026-09-30 | Ngày nghiệp vụ theo giờ Việt Nam qua date-vn.js (pilot PR 6) | DYC |
| 2.3 | 2026-09-30 | PR 8: bootstrap stats.openTasks đếm việc của chính người dùng; team overview và archive bỏ việc đã huỷ / chỉ đếm done | DYC |
| 5.1 | 2026-10-01 | Xử lý conflict merge staging và cập nhật tài liệu | DYC |
| 5.2 | 2026-10-02 | Bỏ `/api/push/config`, `/api/email/test` và nhóm `/api/admin/email/*` (không còn trong code) | DYC |

<!-- updated: 2026-10-02 dev3 routes -->
