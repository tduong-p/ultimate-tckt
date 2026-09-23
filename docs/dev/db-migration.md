---
doc_id: DEV-DB-001
title: Migration cơ sở dữ liệu
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
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
   định trạng thái DB hiện tại.
2. Chạy `npm run migrate` trên DB dev đã có dữ liệu cũ **và** trên DB trống — cả hai phải không lỗi.
3. Cập nhật `core/db.sql` để bản import lần đầu (DB trống) đã có sẵn thay đổi, tránh phải chạy `migrate` nhiều
   bước cho môi trường hoàn toàn mới.
4. Không migration nào được xoá dữ liệu người dùng mà không có bước sao lưu/xác nhận rõ ràng.

Không có khái niệm "rollback migration" tự động — muốn revert thì viết một thay đổi mới đảo ngược.

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

Migration DB **không** tự chạy trong `deploy.sh` (script đó chỉ pull image + up một service). Áp schema mới lên
staging/production đi qua `infra/scripts/apply-infra.sh <env> true` (tham số `apply_db=true` mới đụng tới
`core-db`/`ctd-db`) — chạy `backup.sh <env>` trước khi áp migration có khả năng phá dữ liệu (đổi kiểu cột, xoá
cột). Runbook đầy đủ: `docs/ops/deploy-va-nhanh.md`, `docs/ops/backup-restore.md`.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
