---
doc_id: DEV-DB-001
title: Migration cơ sở dữ liệu
version: 2.2
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-10-03
related_code: [core/db.sql, core/src/config/migrate.js, services/ctd-api/backend/alembic/**]
---

# Migration cơ sở dữ liệu

Tài liệu này giúp dev đổi schema đúng cách ở cả hai app — không app nào cho phép sửa DB bằng tay.

## Core (MySQL) — migration idempotent tự viết

Không dùng thư viện migration ngoài. `core/db.sql` là schema gốc (dùng để import lần đầu vào DB trống);
`core/src/config/migrate.js` chứa các hàm kiểm-rồi-đổi (`columnExists`, `getColumnType`, `tableExists`,
`foreignKeyExists`…) để mỗi thay đổi schema chạy được nhiều lần mà không lỗi.

Quy trình thêm một thay đổi schema:
1. Viết một khối trong `migrate.js` kiểm tồn tại trước khi `ALTER TABLE`/`CREATE TABLE`/thêm cột — không giả
   định trạng thái DB hiện tại. Từ giai đoạn Đa đơn vị (GĐ1), các bảng/cột mới liên quan tới đa đơn vị nằm trong `core/src/config/migrate-units.js` (gọi từ Bước 11 của `migrate.js`).
2. Chạy `npm run migrate` trên DB dev đã có dữ liệu cũ **và** trên DB trống — cả hai phải không lỗi.
3. Cập nhật `core/db.sql` để bản import lần đầu (DB trống) đã có sẵn thay đổi, tránh phải chạy `migrate` nhiều
   bước cho môi trường hoàn toàn mới.
4. Không migration nào được xoá dữ liệu người dùng mà không có bước sao lưu/xác nhận rõ ràng.

Không có khái niệm "rollback migration" tự động — muốn revert thì viết một thay đổi mới đảo ngược.

### Bước 11 — Đa đơn vị (GĐ1)
Toàn bộ logic tạo bảng đa đơn vị nằm ở `core/src/config/migrate-units.js`.
- Bảng mới: `org_units`, `unit_memberships`, `unit_modules`, `unit_visibility_policies`, `setting_locks`, `audit_logs`, `directives`, `submissions`, `ops_logs`, `ops_log_attendance`, `platform_migrations`.
- Sửa bảng cũ: `teams.unit_id` và `activities.unit_id` mặc định = ID của đơn vị TCKT (để mọi bản ghi tạo theo luồng cũ đều thuộc TCKT).
- **Backfill 1 lần**: marker `platform_migrations.multi_unit_backfill_v1` đảm bảo chỉ backfill membership/module vào lần đầu tiên chạy. Lần chạy migrate sau sẽ không tự ý thêm lại những membership mà người quản trị đã chủ động gỡ bỏ.
- **Cách kiểm tra sau deploy**: chạy truy vấn `SELECT COUNT(*) FROM unit_memberships;` kết quả phải ≥ `SELECT COUNT(*) FROM users;`. Lệnh chạy trong container và các kiểm tra khác (số đơn vị, marker, membership ngoài TCKT): `docs/ops/deploy-va-nhanh.md` mục 7.5.

## CTD (Postgres) — Alembic

Alembic chuẩn, revision nằm ở `services/ctd-api/backend/alembic/versions/`.

```bash
cd services/ctd-api/backend
.venv/bin/alembic revision --autogenerate -m "them_truong_x_cho_case"   # sinh revision, LUÔN đọc lại trước khi áp
.venv/bin/alembic upgrade head                                          # áp lên DB local
.venv/bin/alembic downgrade -1                                          # revert một bước khi cần
```

Quy tắc:
- Luôn đọc lại file revision do `--autogenerate` sinh ra — Alembic có thể bỏ sót thay đổi enum hoặc
  constraint đặc thù của Postgres.
- Mỗi revision một thay đổi có ý nghĩa (đặt tên rõ bằng `-m`), không gộp nhiều thay đổi không liên quan.
- Chạy `.venv/bin/pytest tests/test_migrations.py` sau khi thêm revision.

## Áp migration lên staging/production

Migration của Core **tự chạy khi container `core` khởi động**: `core/src/runtime.js` (`migrateOnStartup`) gọi `migrateDatabase`
(kể cả `migrate-units.js`) trước khi mở cổng. Vì vậy mỗi lần `deploy.sh <env> core <tag>` tạo lại container `core` là một lần chạy
migration trên DB của môi trường đó; không có bước "áp migration" riêng. Migration lỗi thì Core ghi log (file `log.md` trong
container), in lỗi ra stdout rồi thoát mã 1, container tự khởi động lại (`restart: unless-stopped`) cho tới khi chạy được — Core
không phục vụ trên schema dở dang, và `deploy.sh` báo đỏ khi health check không qua trong 60 giây. Với CTD, container chạy
`alembic upgrade head` rồi `python -m app.seeds` trước khi `uvicorn` (`CMD` trong `services/ctd-api/Dockerfile`), nên revision mới
cũng được áp khi deploy `ctd-api`.

`infra/scripts/apply-infra.sh <env> true` **không** áp migration: tham số `apply_db=true` chỉ `up -d` thêm hai container
`core-db`/`ctd-db`. Chạy `backup.sh <env>` trước khi deploy bản có migration có khả năng phá dữ liệu (đổi kiểu cột, xoá cột) —
SPEC-PILOT-001 §9.3 cấm kiểu migration đó trong thời gian pilot; ghi rõ trong PR khi có migration để người phát hành backup. Runbook
đầy đủ: `docs/ops/deploy-va-nhanh.md` mục 7; sao lưu và khôi phục: `docs/ops/backup-restore.md`.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
| 2.0 | 2026-09-27 | Đồng bộ `main` = `staging`: nội dung theo bản `main` (chưa có code đa đơn vị GĐ1-A). Bản 1.1 trên `staging` mô tả GĐ1-A, lưu ở nhánh `archive/gd1a-staging` — NTMT làm lại ở PR sau | DYC |
| 2.1 | 2026-09-27 | Thêm thông tin về migration đa đơn vị | D2 |
| 2.2 | 2026-10-03 | Sửa: migration Core tự chạy lúc khởi động container (không phải "không chạy khi deploy"); `apply_db=true` không áp migration | DYC |
