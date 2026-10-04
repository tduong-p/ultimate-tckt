#!/usr/bin/env bash
# Usage: backup.sh <staging|production>
# Dump MySQL (core) + Postgres (ctd) + Postgres noti (nếu có DB `noti` trên ctd-db) của một môi trường vào $UT_ROOT/backups/, giữ 14 bản mỗi loại.
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

# DB `noti` (module Mail/Noti) nằm cùng container ctd-db. Chỉ dump khi DB tồn tại; stack cũ (UT_BACKUP_COMPOSE_ARGS) không có.
NOTI_WRITTEN=0
if [[ -z "${UT_BACKUP_COMPOSE_ARGS:-}" ]]; then
  noti_check="psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -tAc \"select 1 from pg_database where datname='noti'\""
  noti_exists="$(dc exec -T ctd-db sh -c "$noti_check" 2>/dev/null | tr -d '[:space:]' || true)"
  if [[ "$noti_exists" == "1" ]]; then
    # shellcheck disable=SC2016
    dc exec -T ctd-db sh -c 'pg_dump --clean --if-exists -U "$POSTGRES_USER" noti' \
      | gzip > "$OUT/$ENV-$TS-noti.sql.gz"
    NOTI_WRITTEN=1
  fi
fi

for kind in core ctd noti; do
  { ls -1t "$OUT"/"$ENV"-*-"$kind".sql.gz 2>/dev/null || true; } | tail -n +15 | xargs -r rm -f
done
echo "Backups written: $OUT/$ENV-$TS-{core,ctd}.sql.gz"
[[ "$NOTI_WRITTEN" == 1 ]] && echo "  + $OUT/$ENV-$TS-noti.sql.gz"
true
