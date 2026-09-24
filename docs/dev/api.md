---
doc_id: DEV-API-001
title: API
version: 1.5
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: [core/src/routes/**, core/src/settings/catalog.js, core/src/middleware/setting-guard.js, services/ctd-api/backend/app/api/**]
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
| GET/POST/DELETE | `/api/platform/setting-locks[/:id]` | `platform.js` |
| GET | `/api/units` | `units.js` |
| GET | `/api/units/:id/members` | `units.js` |
| PUT/DELETE | `/api/units/:id/members/:userId` | `units.js` |

Middleware quyền áp cho từng route: xem `docs/dev/phan-quyen.md`. Không có route nào bỏ qua `auth` trừ
`/api/health`, `/api/version`, `/api/login`, `/auth/microsoft*`.

### `/api/platform/setting-locks` — khoá cấu hình đơn vị (DYC)

Danh mục setting (`managed_by: 'platform' | 'unit'`) khai ở `core/src/settings/catalog.js`; xem
`docs/dev/email-cron.md` mục "Danh mục setting" để biết setting nào ai sửa được. Chỉ setting `managed_by:
'unit'` (`email.templates`, `email.rules`, `weight_presets`) mới khoá được ở đây.

- `GET /api/platform/setting-locks` (auth) → 200 `[{ id, setting_key, unit_id, unit_code, reason, locked_by,
  created_at }]` — bất kỳ ai đăng nhập cũng đọc được, nhưng danh sách được **scope theo đơn vị của người gọi**:
  thành viên DYC (`hasDycMembership`) thấy mọi dòng; người khác chỉ thấy khoá toàn cục (`unit_id IS NULL`) và
  khoá của (các) đơn vị mình là thành viên (`unit_id IN (<unit_id của req.memberships>)`) — không thấy khoá của
  đơn vị khác. Test: `core/tests/units.settings-guard.test.js` (khoá BTV + khoá TCKT, BTV chỉ thấy khoá BTV, DYC
  thấy cả hai) và `core/tests/units.leak.test.js` (route nằm trong `OUTSIDER_ALLOW` vì tự scope trong handler,
  không cần 403 ở tầng gate).
- `POST /api/platform/setting-locks { setting_key, unit_id: null, reason }` (auth + `platformAdmin`, chỉ DYC) →
  201 `{ id }`. 400 nếu `setting_key` không có trong `SETTINGS` hoặc `managed_by !== 'unit'`
  (`{ error: 'Chỉ khoá được cấu hình do đơn vị quản lý.' }`), hoặc `reason` rỗng
  (`{ error: 'Cần ghi lý do khoá.' }`); ghi `audit_logs` action `setting.lock`.
- `DELETE /api/platform/setting-locks/:id` (auth + `platformAdmin`, chỉ DYC) → 200 `{ ok: true }` / 404 nếu
  không tìm thấy; ghi `audit_logs` action `setting.unlock`.
- Khi một setting `unit` đang bị khoá, mọi request ghi (khác GET/HEAD) từ người không phải DYC vào route được
  bảo vệ bởi `settingGuard` của setting đó trả 403 `{ error: 'Cấu hình này đang bị DYC khoá.', locked: true,
  reason }` — `reason` lấy từ dòng `setting_locks` khớp.

`GET /api/session` giờ trả thêm `units: { current, memberships }` (đơn vị đang chọn và toàn bộ membership đang
hoạt động của user, xem `sessionView` trong `core/src/middleware/unit-context.js`); `user.is_devops` giờ tính
từ việc user có membership đơn vị DYC (`platform_owner`) hay không, không còn đọc thẳng cột `users.is_devops`.
`POST /api/session/unit { unit_id }` đổi `current_unit_id` sang đơn vị được chỉ định trong body, trả lại
`sessionView` như trên; 403 nếu người dùng không phải thành viên đơn vị đó, 401 nếu chưa đăng nhập.

`GET /api/units` (auth): DYC thấy mọi đơn vị; người khác chỉ thấy đơn vị mình thuộc. Mỗi dòng
`{ id, code, name, kind, is_active, member_count, roles }` (`roles = UNIT_ROLES[kind]`).
`GET /api/units/:id/members` (auth): DYC hoặc thành viên đơn vị đó mới xem được (403 nếu không); 404 nếu
đơn vị không tồn tại. Trả `[{ user_id, name, email, role }]`.
`PUT /api/units/:id/members/:userId { role }` (auth): chỉ người quản lý được đơn vị đó theo `canManageUnit`
(có membership DYC và (đơn vị không phải DYC hoặc mình là `dyc_admin`), hoặc mình là admin của chính đơn vị
đó theo `isUnitAdmin`) mới gọi được — 403 nếu không; 400 nếu `role` không hợp lệ với `kind` của đơn vị; 404
nếu tài khoản không tồn tại; 409 `{ error: 'Không thể gỡ dyc_admin cuối cùng.' }` nếu role hiện tại của
người đó trong đơn vị là `dyc_admin`, role mới khác `dyc_admin`, và đây là `dyc_admin` cuối cùng của đơn vị
(cùng điều kiện kiểm tra với DELETE bên dưới). Ghi `audit_logs` action `membership.upsert`
(`meta: { role, previous_role }`). Đơn vị TCKT: đồng bộ luôn cột `users.role` theo role mới (xem
`setTcktRoleColumn`).
`DELETE /api/units/:id/members/:userId` (auth): cùng điều kiện quyền như trên; 404 nếu tài khoản không
thuộc đơn vị; 409 `{ error: 'Không thể gỡ dyc_admin cuối cùng.' }` nếu gỡ `dyc_admin` cuối cùng của đơn vị
DYC. Ghi `audit_logs` action `membership.remove`. Đơn vị TCKT: đặt lại `users.role = 'member'`.
`/api/units*` không nằm trong danh sách route "cũ" (`LEGACY_PREFIXES`) — không áp policy khoá `settingGuard`.

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
| 1.1 | 2026-09-24 | `GET /api/session` trả thêm `units.{current,memberships}`, `user.is_devops` tính theo membership DYC; thêm `POST /api/session/unit` | DYC |
| 1.2 | 2026-09-24 | Thêm `/api/platform/setting-locks` (GET/POST/DELETE) và mục giải thích `managed_by`/`settingGuard`/mã lỗi khoá | DYC |
| 1.3 | 2026-09-24 | Thêm `/api/units*` (GET danh sách, GET thành viên, PUT/DELETE membership) và mã lỗi 400/403/404/409 | DYC |
| 1.4 | 2026-09-24 | `PUT /api/units/:id/members/:userId` cũng trả 409 khi tự hạ cấp `dyc_admin` cuối cùng của đơn vị (cùng điều kiện với DELETE) | DYC |
| 1.5 | 2026-09-24 | GĐ1-A Task 9 fix round 1: `GET /api/platform/setting-locks` scope theo đơn vị của người gọi (DYC thấy mọi dòng, người khác chỉ thấy khoá toàn cục + khoá đơn vị mình) thay vì trả mọi dòng cho mọi người | DYC |
