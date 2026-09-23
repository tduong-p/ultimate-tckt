#!/usr/bin/env bash
# Usage: migrate-volumes.sh <staging|production>
# Chép dữ liệu từ volume stack cũ (seee-ctd-<env>) sang volume tên mới (ultimate-tckt-<env>).
# KHÔNG xoá volume cũ. Từ chối (exit 3) nếu volume đích đã có dữ liệu.
# Phải dừng stack cũ TRƯỚC khi chạy (xem docs/ops/cutover runbook).
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

ENV="${1:-}"; ut_env_branch "$ENV" >/dev/null
OLD="seee-ctd-$ENV"; NEW="ultimate-tckt-$ENV"
PAIRS=("tckt_mysql_data:core_mysql" "tckt_uploads:core_uploads" "ctd_postgres_data:ctd_postgres" "ctd_documents:ctd_documents")
EXISTING="$(docker volume ls -q)"

for pair in "${PAIRS[@]}"; do
  to="${NEW}_${pair#*:}"
  if grep -qx "$to" <<<"$EXISTING"; then
    content="$(docker run --rm -v "$to:/to" alpine ls -A /to)"
    [[ -z "$content" ]] || { echo "ERROR: $to already contains data — refusing to overwrite" >&2; exit 3; }
  fi
done

for pair in "${PAIRS[@]}"; do
  from="${OLD}_${pair%%:*}"; to="${NEW}_${pair#*:}"
  if ! grep -qx "$from" <<<"$EXISTING"; then echo "skip: $from does not exist"; continue; fi
  docker volume create "$to" >/dev/null
  docker run --rm -v "$from:/from:ro" -v "$to:/to" alpine sh -c 'cp -a /from/. /to/'
  echo "copied $from -> $to"
done
