#!/usr/bin/env bash
# Usage: ./deploy.sh <staging|production> <tckt|ctd> <image-tag>
# Run ON THE VM (this is what GitHub Actions SSHes in and executes).
set -euo pipefail

ROLE="${1:?Usage: deploy.sh <staging|production> <tckt|ctd> <image-tag>}"
APP="${2:?Usage: deploy.sh <staging|production> <tckt|ctd> <image-tag>}"
TAG="${3:?Usage: deploy.sh <staging|production> <tckt|ctd> <image-tag>}"

case "$APP" in
  tckt) SERVICE=tckt-app; TAG_VAR=TCKT_IMAGE_TAG ;;
  ctd)  SERVICE=ctd-app;  TAG_VAR=CTD_IMAGE_TAG ;;
  *) echo "APP must be 'tckt' or 'ctd', got: $APP" >&2; exit 1 ;;
esac

# Acquire lock to serialize deployments and avoid concurrent git pull collisions on FETCH_HEAD
exec 200>/tmp/infra-deploy.lock
flock -x -w 180 200

cd /opt/infra
git pull --ff-only origin main

export "${TAG_VAR}=${TAG}"
COMPOSE_FILE="docker-compose.${ROLE}.yml"
ENV_FILE=".env.${ROLE}"
PROJECT="seee-ctd-${ROLE}"

docker compose -p "$PROJECT" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull "$SERVICE"
docker compose -p "$PROJECT" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d "$SERVICE"
docker image prune -f
