---
doc_id: DEV-API-001
title: API
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
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
| GET | `/auth/microsoft`, `/auth/microsoft/callback` | `system.js` |
| GET | `/api/push/config` | `system.js` |
| GET | `/api/version`, `/api/health` | `system.js` |
| POST | `/api/email/test` | `system.js` |
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
| GET/POST | `/api/teams` | `teams.js` |
| PATCH/DELETE | `/api/teams/:id` | `teams.js` |
| GET | `/api/teams/:id/{members,overview}` | `teams.js` |
| POST/PATCH/DELETE | `/api/teams/:id/members[/:userId]` | `teams.js` |
| GET/POST/PATCH | `/api/documents`, `/api/documents/:id` | `documents.js` |
| GET | `/api/archive` | `reports.js` |
| GET | `/api/reports/export` | `reports.js` |
| GET/PATCH/POST | `/api/notifications`, `/api/notifications/:id/seen`, `/api/notifications/seen` | `notifications.js` |
| GET/PUT/POST | `/api/admin/email/{settings,settings/test-send,events,templates,rules,deliveries}` | `settings-email.js` |
| PUT/DELETE/PATCH | `/api/admin/email/templates/:id`, `/api/admin/email/rules/:id[/activate\|deactivate\|simulate]` | `settings-email.js` |
| GET/POST/PUT/DELETE/PATCH | `/api/admin/cron/{handlers,jobs[/:id][/activate\|deactivate\|run-now\|runs]}` | `settings-cron.js` |

Middleware quyền áp cho từng route: xem `docs/dev/phan-quyen.md`. Không có route nào bỏ qua `auth` trừ
`/api/health`, `/api/version`, `/api/login`, `/auth/microsoft*`.

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
