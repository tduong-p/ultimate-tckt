#!/usr/bin/env bash
# Usage: deploy.sh <staging|production> <core|ctd-api|noti> <image-tag>
# Chạy TRÊN VM (GitHub Actions SSH vào và gọi). Chỉ đụng service của một app trong một môi trường.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

ENV="${1:-}"; APP="${2:-}"; TAG="${3:-}"
BRANCH="$(ut_env_branch "$ENV")"
read -ra SERVICES <<< "$(ut_app_service "$APP")"
[[ -n "$TAG" ]] || ut_die "Usage: deploy.sh <staging|production> <core|ctd-api|noti> <image-tag>"
# Kiểm cổng trước khi đụng git: app chưa cấu hình cho môi trường này (vd noti ở production) thì dừng ngay.
PORT="$(ut_app_port "$ENV" "$APP")"

ut_lock "$ENV"
git -C "$(ut_env_dir "$ENV")" pull --ff-only origin "$BRANCH"

# Giữ tag của các app còn lại để compose không đòi biến rỗng.
export CORE_IMAGE_TAG="${CORE_IMAGE_TAG:-$(ut_current_tag "$ENV" core)}"
export CTD_API_IMAGE_TAG="${CTD_API_IMAGE_TAG:-$(ut_current_tag "$ENV" ctd-api)}"
export NOTI_IMAGE_TAG="${NOTI_IMAGE_TAG:-$(ut_current_tag "$ENV" noti-api)}"
export "$(ut_app_tag_var "$APP")=$TAG"
# App còn lại chưa từng chạy -> tag rỗng làm ${VAR:?} của compose lỗi. Giá trị giả chỉ để nội suy;
# --no-deps đảm bảo service kia không bị pull/up.
: "${CORE_IMAGE_TAG:=$TAG}" "${CTD_API_IMAGE_TAG:=$TAG}" "${NOTI_IMAGE_TAG:=$TAG}"
export CORE_IMAGE_TAG CTD_API_IMAGE_TAG NOTI_IMAGE_TAG

ut_compose "$ENV" pull "${SERVICES[@]}"
ut_compose "$ENV" up -d --no-deps "${SERVICES[@]}"
ut_health "http://127.0.0.1:$PORT$(ut_app_health_path "$APP")"
docker image prune -f >/dev/null
echo "Deployed $APP@$TAG to $ENV"
