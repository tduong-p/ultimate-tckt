#!/usr/bin/env bash
# Usage: deploy.sh <staging|production> <core|ctd-api> <image-tag>
# Chạy TRÊN VM (GitHub Actions SSH vào và gọi). Chỉ đụng một service của một môi trường.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

ENV="${1:-}"; APP="${2:-}"; TAG="${3:-}"
BRANCH="$(ut_env_branch "$ENV")"
SERVICE="$(ut_app_service "$APP")"
[[ -n "$TAG" ]] || ut_die "Usage: deploy.sh <staging|production> <core|ctd-api> <image-tag>"

ut_lock "$ENV"
git -C "$(ut_env_dir "$ENV")" pull --ff-only origin "$BRANCH"

# Giữ tag của app còn lại để compose không đòi biến rỗng.
export CORE_IMAGE_TAG="${CORE_IMAGE_TAG:-$(ut_current_tag "$ENV" core)}"
export CTD_API_IMAGE_TAG="${CTD_API_IMAGE_TAG:-$(ut_current_tag "$ENV" ctd-api)}"
export "$(ut_app_tag_var "$APP")=$TAG"
# App còn lại chưa từng chạy -> tag rỗng làm ${VAR:?} của compose lỗi. Giá trị giả chỉ để nội suy;
# --no-deps đảm bảo service kia không bị pull/up.
: "${CORE_IMAGE_TAG:=$TAG}" "${CTD_API_IMAGE_TAG:=$TAG}"; export CORE_IMAGE_TAG CTD_API_IMAGE_TAG

ut_compose "$ENV" pull "$SERVICE"
ut_compose "$ENV" up -d --no-deps "$SERVICE"
ut_health "http://127.0.0.1:$(ut_app_port "$ENV" "$APP")/api/health"
docker image prune -f >/dev/null
echo "Deployed $APP@$TAG to $ENV"
