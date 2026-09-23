#!/usr/bin/env bash
# Usage: apply-infra.sh <staging|production> [apply_db: true|false]
# Chạy TRÊN VM khi infra/** đổi. Chỉ xử lý MỘT môi trường.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

ENV="${1:-}"; APPLY_DB="${2:-false}"
BRANCH="$(ut_env_branch "$ENV")"
DIR="$(ut_env_dir "$ENV")"
ut_lock "$ENV"
git -C "$DIR" pull --ff-only origin "$BRANCH"

TS="$(date -u +%Y%m%d-%H%M%S)"
BK="$UT_ROOT/backups/nginx-$TS"
mkdir -p "$BK"
sudo cp -a /etc/nginx/sites-available/. "$BK/" 2>/dev/null || true
for app in core ctd; do
  name="ultimate-tckt-$ENV-$app.conf"
  sudo cp "$DIR/infra/nginx/$ENV/$app.conf" "/etc/nginx/sites-available/$name"
  sudo ln -sf "/etc/nginx/sites-available/$name" "/etc/nginx/sites-enabled/$name"
done
sudo nginx -t || ut_die "nginx -t failed; previous sites saved in $BK — nginx NOT reloaded"
sudo systemctl reload nginx

export CORE_IMAGE_TAG="${CORE_IMAGE_TAG:-$(ut_current_tag "$ENV" core)}"
export CTD_API_IMAGE_TAG="${CTD_API_IMAGE_TAG:-$(ut_current_tag "$ENV" ctd-api)}"
if [[ "$APPLY_DB" == "true" ]]; then
  ut_compose "$ENV" up -d core ctd-api core-db ctd-db
else
  ut_compose "$ENV" up -d --no-deps core ctd-api
fi
echo "Infra applied to $ENV at $(git -C "$DIR" rev-parse --short HEAD)"
