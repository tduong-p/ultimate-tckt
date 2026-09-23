---
doc_id: PB-SCH-001
title: Playbook — đổi schema
version: 1.0
status: active
audience: [dev, ai]
owner: DYC
updated: 2026-09-24
related_code: [core/db.sql, core/src/config/migrate.js, services/ctd-api/backend/alembic/**]
---

# Playbook — đổi schema

Tài liệu này giúp dev và AI agent đổi cấu trúc dữ liệu đúng cách ở cả hai app — chi tiết kỹ thuật đầy đủ nằm ở `docs/dev/db-migration.md`, tài liệu này chỉ là **trình tự thao tác** khi bắt tay vào đổi schema.

## Khi nào dùng

Khi cần thêm/sửa/xoá bảng hoặc cột ở Core (MySQL) hoặc CTD (Postgres) — kể cả khi thay đổi chỉ để phục vụ một tính năng nhỏ.

## Các bước

### Core (MySQL) — migration tự viết, idempotent

1. Thêm một khối mới trong `core/src/config/migrate.js`, dùng các hàm kiểm-tồn-tại có sẵn (`tableExists`, `columnExists`, `getColumnType`, `foreignKeyExists`) trước khi `CREATE`/`ALTER` — không giả định trạng thái DB hiện tại.
2. Chạy `npm run migrate` (từ `core/`) hai lần liên tiếp trên cùng một DB — lần thứ hai phải không lỗi và không đổi gì thêm (chứng minh idempotent).
3. Chạy lại `npm run migrate` trên một DB **trống** (tạo mới từ `core/db.sql`) — cũng phải không lỗi.
4. Cập nhật `core/db.sql` để bản import lần đầu đã có sẵn thay đổi này (tránh DB mới phải chạy migrate nhiều bước).
5. Không xoá dữ liệu người dùng trong migration mà không có bước sao lưu/xác nhận rõ ràng trong PR.

### CTD (Postgres) — Alembic

1. Sửa model SQLAlchemy, sinh revision:
   ```bash
   cd services/ctd-api/backend
   .venv/bin/alembic revision --autogenerate -m "mo_ta_ngan_gon"
   ```
2. **Đọc lại file revision vừa sinh** — Alembic có thể bỏ sót enum hoặc constraint đặc thù Postgres, không tin tưởng mù quáng bản autogenerate.
3. Áp lên DB local: `.venv/bin/alembic upgrade head`. Kiểm revert nếu cần: `.venv/bin/alembic downgrade -1`.
4. Chạy `.venv/bin/pytest tests/test_migrations.py` để xác nhận migration chạy đúng.
5. Một revision chỉ nên chứa một thay đổi có ý nghĩa — không gộp nhiều thay đổi không liên quan vào một revision.

### Áp lên staging/production

Migration DB **không tự chạy** trong `deploy.sh`. Phải qua:
```bash
# trên VM, hoặc qua workflow_dispatch của deploy.yml với apply_db=true
infra/scripts/backup.sh <env>          # bắt buộc trước khi áp thay đổi có khả năng phá dữ liệu
infra/scripts/apply-infra.sh <env> true
```

## Kiểm tra xong

- [ ] Core: `npm run migrate` chạy 2 lần liên tiếp trên DB có dữ liệu cũ — không lỗi, lần 2 không đổi thêm gì.
- [ ] Core: `npm run migrate` chạy trên DB trống (từ `db.sql` mới) — không lỗi.
- [ ] CTD: đã đọc lại revision autogenerate, không có enum/constraint bị bỏ sót.
- [ ] CTD: `pytest tests/test_migrations.py` xanh.
- [ ] Đã chạy `backup.sh <env>` trước khi áp migration có khả năng phá dữ liệu lên staging/production.
- [ ] Không có lệnh `ALTER`/DDL nào chạy tay trực tiếp trên DB staging/production ngoài quy trình `apply-infra.sh`.

## Tài liệu phải cập nhật

- `docs/dev/db-migration.md` nếu quy trình/quy ước thay đổi (không chỉ thêm một schema cụ thể).
- `docs/dev/api.md` nếu schema mới kéo theo thay đổi endpoint.
- `docs/ba/*.md` tương ứng nếu thay đổi schema phản ánh một quyết định nghiệp vụ mới.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
