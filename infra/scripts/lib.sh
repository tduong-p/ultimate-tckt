#!/usr/bin/env bash
# Hàm dùng chung cho mọi script VM. Được `source`, không chạy trực tiếp.
UT_ROOT="${UT_ROOT:-/opt/ultimate-tckt}"
UT_LOCK_DIR="${UT_LOCK_DIR:-/tmp}"
UT_HEALTH_INTERVAL="${UT_HEALTH_INTERVAL:-2}"

ut_die() { echo "ERROR: $*" >&2; exit 1; }

ut_env_branch() {
  case "${1:-}" in
    staging) echo staging ;;
    production) echo main ;;
    *) ut_die "ENV must be 'staging' or 'production', got: '${1:-}'" ;;
  esac
}

ut_app_service() {
  case "${1:-}" in
    core) echo core ;;
    ctd-api) echo ctd-api ;;
    *) ut_die "APP must be 'core' or 'ctd-api', got: '${1:-}'" ;;
  esac
}

ut_app_tag_var() {
  case "$1" in core) echo CORE_IMAGE_TAG ;; ctd-api) echo CTD_API_IMAGE_TAG ;; esac
}

ut_app_port() {
  case "$1:$2" in
    staging:core) echo 3000 ;; staging:ctd-api) echo 8000 ;;
    production:core) echo 3001 ;; production:ctd-api) echo 8001 ;;
    *) ut_die "no port for $1/$2" ;;
  esac
}

ut_env_dir() { echo "$UT_ROOT/$1"; }

ut_compose() {
  local env="$1"; shift
  local dir; dir="$(ut_env_dir "$env")/infra"
  docker compose -p "ultimate-tckt-$env" --env-file "$dir/.env" \
    -f "$dir/compose/docker-compose.$env.yml" "$@"
}

ut_lock() {
  exec 200>"$UT_LOCK_DIR/ultimate-tckt-$1-deploy.lock"
  flock -x -w 180 200 || ut_die "could not acquire deploy lock for $1"
}

ut_health() {
  local url="$1" timeout="${2:-${UT_HEALTH_TIMEOUT:-60}}" waited=0 code
  while :; do
    code="$(curl -s -o /dev/null -w '%{http_code}' "$url" || true)"
    [[ "$code" == "200" ]] && return 0
    (( waited >= timeout )) && { echo "ERROR: health check failed for $url (last HTTP $code)" >&2; return 1; }
    sleep "$UT_HEALTH_INTERVAL"; waited=$(( waited + (UT_HEALTH_INTERVAL > 0 ? UT_HEALTH_INTERVAL : 1) ))
  done
}

# Tag image của container đang chạy (để up các service khác mà không rơi về :latest).
ut_current_tag() {
  local img
  img="$(docker inspect --format '{{.Config.Image}}' "ultimate-tckt-$1-$2-1" 2>/dev/null || true)"
  [[ "$img" == *:* ]] && echo "${img##*:}"
}
