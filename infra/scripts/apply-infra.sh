#!/usr/bin/env bash
# Usage: ./apply-infra.sh [apply_db: true|false]
# Run ON THE VM (invoked by GitHub Actions when infra repo pushes to main or via workflow_dispatch).
set -euo pipefail

APPLY_DB="${1:-false}"

echo "=========================================="
echo "Starting infra deployment on VM"
echo "Date: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "=========================================="

cd /opt/infra

echo "== 1. Pulling latest code from origin/main =="
git pull --ff-only origin main
COMMIT="$(git rev-parse --short HEAD)"
COMMIT_MSG="$(git log -1 --pretty=format:'%s')"
echo "Synced to commit: ${COMMIT} (${COMMIT_MSG})"

echo "== 2. Updating Nginx configurations =="
for conf in /opt/infra/nginx/staging/*.conf /opt/infra/nginx/production/*.conf; do
  if [[ -f "$conf" ]]; then
    role=$(basename "$(dirname "$conf")")
    name="${role}-$(basename "$conf")"
    echo "Installing site: $name"
    sudo cp "$conf" "/etc/nginx/sites-available/$name"
    sudo ln -sf "/etc/nginx/sites-available/$name" "/etc/nginx/sites-enabled/$name"
  fi
done

echo "Checking existing Let's Encrypt certificates..."
sudo certbot certificates || true

echo "Testing Nginx syntax..."
sudo nginx -t


echo "Reloading Nginx service..."
sudo systemctl reload nginx
echo "Nginx reloaded successfully."


echo "== 3. Applying Docker Compose stacks =="
SERVICES=("tckt-app" "ctd-app")
if [[ "$APPLY_DB" == "true" ]]; then
  SERVICES+=("tckt-db" "ctd-db")
  echo "Database apply: ENABLED (tckt-db and ctd-db will be updated)"
else
  echo "Database apply: DISABLED (safe mode - only tckt-app and ctd-app)"
fi

for ROLE in staging production; do
  echo "--- Processing environment: ${ROLE} (project: seee-ctd-${ROLE}) ---"
  COMPOSE_FILE="docker-compose.${ROLE}.yml"
  ENV_FILE=".env.${ROLE}"
  PROJECT="seee-ctd-${ROLE}"

  if [[ ! -f "$COMPOSE_FILE" ]]; then
    echo "Error: Compose file $COMPOSE_FILE not found in /opt/infra!" >&2
    exit 1
  fi

  if [[ ! -f "$ENV_FILE" ]]; then
    echo "Warning: Env file $ENV_FILE not found in /opt/infra." >&2
  fi

  # Resolve current app image tags from running containers or local cache
  # to prevent Docker Compose from falling back to ':latest' (which does not exist on GHCR).
  local_services=()

  # Check tckt-app
  tckt_img=$(docker inspect --format '{{.Config.Image}}' "${PROJECT}-tckt-app-1" 2>/dev/null || true)
  if [[ -z "$tckt_img" ]]; then
    tckt_img=$(docker images --format '{{.Repository}}:{{.Tag}}' "ghcr.io/tduong-p/tckt-activity-hub" 2>/dev/null | grep -v '<none>' | head -n 1 || true)
  fi
  if [[ -n "$tckt_img" && "$tckt_img" == *":"* ]]; then
    export TCKT_IMAGE_TAG="${tckt_img##*:}"
    local_services+=("tckt-app")
    echo "Resolved tckt-app tag for ${ROLE}: ${TCKT_IMAGE_TAG}"
  fi

  # Check ctd-app
  ctd_img=$(docker inspect --format '{{.Config.Image}}' "${PROJECT}-ctd-app-1" 2>/dev/null || true)
  if [[ -z "$ctd_img" ]]; then
    ctd_img=$(docker images --format '{{.Repository}}:{{.Tag}}' "ghcr.io/tduong-p/ctd" 2>/dev/null | grep -v '<none>' | head -n 1 || true)
  fi
  if [[ -n "$ctd_img" && "$ctd_img" == *":"* ]]; then
    export CTD_IMAGE_TAG="${ctd_img##*:}"
    local_services+=("ctd-app")
    echo "Resolved ctd-app tag for ${ROLE}: ${CTD_IMAGE_TAG}"
  fi

  if [[ "$APPLY_DB" == "true" ]]; then
    local_services+=("tckt-db" "ctd-db")
  fi

  EXTRA_ARGS=()
  if [[ "$APPLY_DB" != "true" ]]; then
    EXTRA_ARGS+=("--no-deps")
  fi

  if [[ ${#local_services[@]} -gt 0 ]]; then
    echo "Applying services for ${PROJECT}: ${local_services[*]} (flags: ${EXTRA_ARGS[*]:-none})"
    docker compose -p "$PROJECT" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d "${EXTRA_ARGS[@]}" "${local_services[@]}"
    echo "Environment ${ROLE} applied successfully."
  else
    echo "No active or deployable services found for ${PROJECT} (DB excluded, apps not initialized)."
  fi
done



echo "=========================================="
echo "Infra deployment finished successfully!"
echo "Commit: ${COMMIT} - ${COMMIT_MSG}"
echo "Services applied: ${SERVICES[*]}"
echo "=========================================="
