#!/usr/bin/env bash
# Usage: backup.sh <staging|production>
# Dump MySQL (core) + Postgres (ctd) của một môi trường vào $UT_ROOT/backups/, giữ 14 bản mỗi loại.
# UT_BACKUP_PROJECT=seee-ctd-<env> để backup stack cũ trước khi chuyển (dùng file compose cũ qua UT_BACKUP_COMPOSE_ARGS).
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

ENV="${1:-}"; ut_env_branch "$ENV" >/dev/null
OUT="$UT_ROOT/backups"; mkdir -p "$OUT"
TS="$(date -u +%Y%m%d-%H%M)"
if [[ -n "${UT_BACKUP_COMPOSE_ARGS:-}" ]]; then
  # shellcheck disable=SC2086
  dc() { docker compose $UT_BACKUP_COMPOSE_ARGS "$@"; }
  CORE_DB_SVC="${UT_BACKUP_CORE_DB_SVC:-tckt-db}"
  MYSQL_ROOT_PASSWORD_HOST="${UT_BACKUP_MYSQL_ROOT_PASSWORD:-}"
  MYSQL_DATABASE_HOST="${UT_BACKUP_MYSQL_DATABASE:-}"
  PG_USER_HOST="${UT_BACKUP_PG_USER:-}"
  PG_DB_HOST="${UT_BACKUP_PG_DATABASE:-}"
else
  dc() { ut_compose "$ENV" "$@"; }
  CORE_DB_SVC=core-db
  ENV_FILE="$(ut_env_dir "$ENV")/infra/.env"
  # Đọc .env trên host để truyền giá trị thật vào lệnh exec (container không thấy biến shell của host).
  [[ -f "$ENV_FILE" ]] && { set -a; source "$ENV_FILE"; set +a; }
  MYSQL_ROOT_PASSWORD_HOST="${CORE_MYSQL_ROOT_PASSWORD:-}"
  MYSQL_DATABASE_HOST="${CORE_DB_NAME:-}"
  PG_USER_HOST="${CTD_DB_USER:-}"
  PG_DB_HOST="${CTD_DB_NAME:-}"
fi

dc exec -T "$CORE_DB_SVC" mysqldump --single-transaction --routines -uroot -p"$MYSQL_ROOT_PASSWORD_HOST" "$MYSQL_DATABASE_HOST" \
  | gzip > "$OUT/$ENV-$TS-core.sql.gz"
dc exec -T ctd-db pg_dump -U "$PG_USER_HOST" "$PG_DB_HOST" \
  | gzip > "$OUT/$ENV-$TS-ctd.sql.gz"

for kind in core ctd; do
  ls -1t "$OUT"/"$ENV"-*-"$kind".sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
done
echo "Backups written: $OUT/$ENV-$TS-{core,ctd}.sql.gz"
