#!/usr/bin/env bash
# Usage: backup.sh <staging|production>
# Dump MySQL (core) + Postgres (ctd) của một môi trường vào $UT_ROOT/backups/, giữ 14 bản mỗi loại.
# Mật khẩu KHÔNG đi qua host: lệnh dump chạy trong container và đọc biến môi trường của chính container.
# Backup stack cũ trước khi chuyển đổi (xem docs/ops/chuyen-doi-ultimate-tckt.md):
#   UT_BACKUP_COMPOSE_ARGS="-p <project cũ> --env-file <env cũ> -f <compose cũ>" backup.sh <env>
#   (service MySQL cũ tên tckt-db; đổi bằng UT_BACKUP_CORE_DB_SVC nếu khác)
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

ENV="${1:-}"; ut_env_branch "$ENV" >/dev/null
OUT="$UT_ROOT/backups"; mkdir -p "$OUT"
TS="$(date -u +%Y%m%d-%H%M)"
if [[ -n "${UT_BACKUP_COMPOSE_ARGS:-}" ]]; then
  # shellcheck disable=SC2086
  dc() { docker compose $UT_BACKUP_COMPOSE_ARGS "$@"; }
  CORE_DB_SVC="${UT_BACKUP_CORE_DB_SVC:-tckt-db}"
else
  dc() { ut_compose "$ENV" "$@"; }
  CORE_DB_SVC=core-db
fi

# shellcheck disable=SC2016  # biến được mở rộng bên trong container
dc exec -T "$CORE_DB_SVC" sh -c 'mysqldump --single-transaction --routines -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' \
  | gzip > "$OUT/$ENV-$TS-core.sql.gz"
# shellcheck disable=SC2016
dc exec -T ctd-db sh -c 'pg_dump --clean --if-exists -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip > "$OUT/$ENV-$TS-ctd.sql.gz"

for kind in core ctd; do
  ls -1t "$OUT"/"$ENV"-*-"$kind".sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
done
echo "Backups written: $OUT/$ENV-$TS-{core,ctd}.sql.gz"
