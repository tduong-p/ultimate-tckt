---
doc_id: OPS-BAK-001
title: Backup và restore database
version: 1.0
status: active
audience: [dev, ops, ai]
owner: DYC
updated: 2026-09-24
related_code: [infra/scripts/backup.sh]
---

# Backup và restore database

Tài liệu này giúp người vận hành sao lưu và khôi phục MySQL (core) và Postgres (ctd-api) của một môi trường.

## 1. Backup (`backup.sh`)

```bash
ssh ubuntu@168.107.68.32
bash /opt/ultimate-tckt/<env>/infra/scripts/backup.sh <staging|production>
```

Script dump `core-db` (`mysqldump --single-transaction --routines`) và `ctd-db` (`pg_dump`) qua `docker compose exec`, nén gzip, ghi vào:

```
/opt/ultimate-tckt/backups/<env>-<yyyymmdd-hhmm>-core.sql.gz
/opt/ultimate-tckt/backups/<env>-<yyyymmdd-hhmm>-ctd.sql.gz
```

Giữ 14 bản gần nhất mỗi loại (core, ctd), bản cũ hơn bị xoá tự động.

**Backup stack cũ trước khi chuyển đổi:** khi chạy `backup.sh` nhắm vào stack cũ (project `seee-ctd-<env>`, tên service `tckt-db` thay vì `core-db`), truyền `UT_BACKUP_COMPOSE_ARGS` để ghi đè compose project/file mặc định:

```bash
UT_BACKUP_COMPOSE_ARGS="-p seee-ctd-staging --env-file /opt/infra/.env.staging -f /opt/infra/docker-compose.staging.yml" \
  bash infra/scripts/backup.sh staging
```

Dùng trong runbook chuyển đổi, xem `docs/ops/chuyen-doi-ultimate-tckt.md`.

## 2. Restore

### MySQL (core)

```bash
gunzip -c /opt/ultimate-tckt/backups/<env>-<ts>-core.sql.gz \
  | ut_compose <env> exec -T core-db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
```

(`ut_compose <env> ...` là cách gọi tắt tương đương `docker compose -p ultimate-tckt-<env> --env-file infra/.env -f infra/compose/docker-compose.<env>.yml ...`, định nghĩa trong `infra/scripts/lib.sh`.)

### Postgres (ctd-api)

```bash
gunzip -c /opt/ultimate-tckt/backups/<env>-<ts>-ctd.sql.gz \
  | ut_compose <env> exec -T ctd-db sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
```

**Lưu ý khi restore:** dừng ứng dụng (`core`/`ctd-api`) hoặc chấp nhận downtime ngắn trước khi restore đè lên dữ liệu hiện có — restore không tự dừng app. Kiểm tra lại số dòng ở vài bảng chính sau khi restore (xem cách đếm ở `docs/ops/chuyen-doi-ultimate-tckt.md` mục đếm mốc) để xác nhận dữ liệu đã vào đúng.

## 3. File đính kèm / tài liệu (không nằm trong dump SQL)

- Task attachment của core: volume `core_uploads`.
- Tài liệu hồ sơ của ctd-api: volume `ctd_documents`.

Backup thủ công một volume:

```bash
docker run --rm -v ultimate-tckt-<env>_core_uploads:/data -v "$(pwd)":/backup alpine \
  tar czf /backup/core-uploads-$(date +%F).tar.gz -C /data .
```

Restore là chép ngược lại (`tar xzf` vào volume qua container tạm) — chưa có script riêng cho việc này; làm thủ công khi cần và xác nhận volume đích rỗng trước khi ghi đè.

## Lịch sử phiên bản

| Version | Ngày | Thay đổi | Người |
|---|---|---|---|
| 1.0 | 2026-09-24 | Bản đầu (viết lại từ tài liệu cũ khi gộp monorepo) | DYC |
