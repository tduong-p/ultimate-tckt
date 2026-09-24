---
doc_id: AI-MAP-001
title: Cần X thì xem file nào
version: 1.1
status: active
audience: [ai, dev]
owner: DYC
updated: 2026-09-24
related_code: []
---

# Cần X thì xem file nào

Bảng tra nhanh, dựa trên cây thư mục thật của repo (kiểm bằng `find` khi viết tài liệu này). Dùng để không phải
đoán hoặc grep lại từ đầu mỗi lần.

## Core (`core/`, Node/Express/MySQL)

| Cần gì | Xem ở đâu |
|---|---|
| Route/endpoint HTTP | `core/src/routes/*.js` — mỗi file một router: `activities.js`, `tasks.js`, `users.js`, `teams.js`, `documents.js`, `reports.js`, `notifications.js`, `settings-email.js`, `settings-cron.js`, `system.js`, `units.js`, `platform.js`; đăng ký ở `core/src/routes/index.js` |
| Phân quyền / phạm vi dữ liệu | `core/src/policies/access.js` (`activityScope`, `canManageTeam`, `canManageActivity`, `canReviewTask`…); middleware role ở `core/src/middleware/auth.js` (`auth`, `admin`, `manager`, `managerOrEventLead`, `platformAdmin`) |
| Đơn vị, membership, role theo đơn vị | `core/src/units/catalog.js` (loại đơn vị, role hợp lệ), `core/src/units/memberships.js` (đọc/ghi membership, đồng bộ `users.role` ↔ TCKT), `core/src/middleware/unit-context.js` (`req.memberships`, `req.unit`, `req.actor`), API ở `core/src/routes/units.js` |
| Chặn route Điều hành theo đơn vị / audit DYC đọc chéo | `core/src/middleware/legacy-gate.js` (`LEGACY_PREFIXES`), `core/src/services/audit.js` (`recordAudit`) |
| Setting nền tảng vs setting đơn vị, khoá setting | `core/src/settings/catalog.js` (`SETTINGS`, `managed_by`), `core/src/middleware/setting-guard.js`, `core/src/routes/platform.js` (`/api/platform/setting-locks`) |
| Ranh giới module (việc nào được tự làm, việc nào phải raise) | `docs/dev/ranh-gioi-module.md` |
| Gửi email / rule engine | `core/src/services/email-events.js` (registry sự kiện + gửi), `core/src/services/email-condition-evaluator.js` (ma trận điều kiện), `core/src/services/email-settings.js` (cấu hình SMTP mã hoá) |
| Cron job | `core/src/services/cron-runner.js` (registry handler + chạy job), route quản trị ở `core/src/routes/settings-cron.js` |
| Schema DB / migration | `core/db.sql` (schema gốc), `core/src/config/migrate.js` (migration idempotent chạy bằng `npm run migrate`), `core/src/config/migrate-units.js` (bảng đơn vị/membership/audit/khoá setting + backfill một lần) |
| Cấu hình môi trường | `core/src/config/environment.js`, `core/src/config/validate.js`, mẫu biến ở `core/.env.example` |
| Mã hoá secret cấu hình | `core/src/config/settings-crypto.js` (AES-256-GCM, khoá `SETTINGS_ENCRYPTION_KEY`) |
| Đăng nhập Microsoft SSO | `core/src/auth/hust-account.js`, `core/src/auth/hust-identity.js` |
| Session / DB pool | `core/src/config/session.js`, `core/src/config/database.js` |
| Upload file đính kèm task | `core/src/middleware/uploads.js`, `core/src/services/task-attachments.js` |
| Thông báo hạn chót | `core/src/services/deadline-notifications.js` |
| Frontend cũ (chỉ bảo trì) | `core/public/app.js` (logic chính), `core/public/index.html`, `core/public/styles.css` + `components.css`, `core/public/settings.js` (trang Setting), `core/public/notifications.js` |
| Push notification (OneSignal) | `core/src/push.js`, `core/public/OneSignalSDKWorker.js` |
| Entry point / server | `core/src/app.js` (khởi tạo Express + middleware + routes), `core/src/server.js` (lắng nghe cổng + lifecycle cron), `core/app.js` (điểm chạy `npm start`) |
| Test | `core/tests/*.test.js`, fixture/helper dùng chung ở `core/tests/helpers/` |

## CTD (`services/ctd-api/`, FastAPI/Postgres)

| Cần gì | Xem ở đâu |
|---|---|
| Router / endpoint API | `services/ctd-api/backend/app/api/auth.py`, `cases.py`, `documents.py`; đăng ký ở `services/ctd-api/backend/app/main.py` (`include_router`) |
| Model / bảng DB | `services/ctd-api/backend/app/models/identity.py` (User, Role, Unit), `case.py` (Case, CaseDetail, Batch), `document.py`, `workflow.py`, `audit.py`, `notification.py` |
| Migration | `services/ctd-api/backend/alembic/versions/` (mỗi thay đổi schema là một revision mới, không sửa DB bằng tay) |
| Phân quyền thao tác hồ sơ | `services/ctd-api/backend/app/services/permissions.py` (danh sách trắng theo `ThaoTac`/vai trò/trạng thái — cửa duy nhất là `kiem_quyen`) |
| Luồng trạng thái hồ sơ (workflow) | `services/ctd-api/backend/app/services/workflow.py` (nơi duy nhất được gán `case.status`) |
| Phạm vi dữ liệu theo đơn vị | `services/ctd-api/backend/app/services/scope.py` |
| Xác thực (JWT + OTP/mật khẩu) | `services/ctd-api/backend/app/deps.py` (tạo/kiểm JWT), `app/infra/otp.py` (mã OTP, có nhánh dev `123456`), `app/infra/password.py` |
| Cấu hình / chốt chặn secret mặc định | `services/ctd-api/backend/app/config.py` (`app_env`, chặn `jwt_secret` mặc định ngoài môi trường dev) |
| Gửi mail | `services/ctd-api/backend/app/infra/mailer.py` (`MAILER_DRIVER=console|smtp`) |
| Lưu trữ file hồ sơ | `services/ctd-api/backend/app/infra/storage.py` (`STORAGE_DRIVER=memory|s3|local`) |
| Job nền (nhắc hạn, gửi outbox) | `services/ctd-api/backend/app/jobs/run_reminders.py`, `send_outbox.py` |
| Seed dữ liệu | `services/ctd-api/backend/app/seeds/admin_seed.py`, `catalog_seed.py`, `workflow_seed.py`, `demo_seed.py` |
| Frontend — đăng nhập | `services/ctd-api/frontend/src/features/auth/Login.tsx`, `src/lib/auth.tsx` |
| Frontend — nộp/theo dõi hồ sơ (sinh viên) | `services/ctd-api/frontend/src/features/hoso/SubmitCase.tsx`, `CaseStatus.tsx` |
| Frontend — xử lý hồ sơ (cán bộ) | `services/ctd-api/frontend/src/features/canbo/Inbox.tsx`, `ReviewCase.tsx` |
| Frontend — báo cáo | `services/ctd-api/frontend/src/features/baocao/Dashboard.tsx` |
| Frontend — gọi API / theme | `services/ctd-api/frontend/src/lib/api.ts`, `src/theme/tokens.ts`, `src/components/ui.tsx` |
| Test | `services/ctd-api/backend/tests/test_*.py` |

## Hạ tầng và CI

| Cần gì | Xem ở đâu |
|---|---|
| Docker Compose từng môi trường | `infra/compose/docker-compose.staging.yml`, `docker-compose.production.yml` |
| Cấu hình nginx | `infra/nginx/<env>/{core,ctd}.conf` |
| Script vận hành VM | `infra/scripts/lib.sh` (hàm dùng chung), `deploy.sh`, `apply-infra.sh`, `backup.sh`, `migrate-volumes.sh`, `bootstrap-vm.sh`, `setup-vm.sh`, `create-core-admin.sh`, `create-core-readonly-user.sh` |
| Seed DB ban đầu | `infra/seed/core-db.sql` |
| Mẫu biến `.env` hạ tầng | `infra/.env.example` |
| Workflow CI/CD | `.github/workflows/deploy.yml` (test → build → deploy), `docs.yml` (kiểm + xuất tài liệu), `ghcr-cleanup.yml` |
| Kiểm tài liệu | `tools/docs-check/{frontmatter,rules,index,cli}.js` |
| Xuất tài liệu docx/pdf | `tools/docs-export/export.sh` |
| Test script hạ tầng/tooling | `tools/tests/*.test.js`, stub lệnh hệ thống ở `tools/tests/helpers/sandbox.js` |

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
| 1.1 | 2026-09-24 | Cập nhật theo GĐ1-A: đơn vị/membership, legacy gate, setting guard, `platformAdmin` thay `devops`; trỏ tới ranh giới module | DYC |
