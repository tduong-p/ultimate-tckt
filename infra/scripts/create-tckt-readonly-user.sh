#!/usr/bin/env bash
# Usage: ./create-tckt-readonly-user.sh <staging|production> [username]
# Run ON THE VM, from /opt/infra. Creates a read-only (SELECT-only) MySQL user
# for remote DB inspection via DBeaver / SSH tunnel.
set -euo pipefail

ROLE="${1:?Usage: create-tckt-readonly-user.sh <staging|production> [username]}"
case "$ROLE" in
  staging|production) ;;
  *) echo "ROLE must be 'staging' or 'production', got: $ROLE" >&2; exit 1 ;;
esac

READONLY_USER="${2:-tckt_viewer}"

if [[ ! "$READONLY_USER" =~ ^[a-zA-Z0-9_]+$ ]]; then
  echo "Error: Username '$READONLY_USER' contains invalid characters. Only letters, numbers, and underscores are allowed." >&2
  exit 1
fi

cd /opt/infra
COMPOSE_FILE="docker-compose.${ROLE}.yml"
ENV_FILE=".env.${ROLE}"
PROJECT="seee-ctd-${ROLE}"
COMPOSE=(docker compose -p "$PROJECT" --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: Environment file '$ENV_FILE' not found in /opt/infra." >&2
  exit 1
fi

ROOT_PASSWORD="$(grep -m1 '^TCKT_MYSQL_ROOT_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)"
if [ -z "$ROOT_PASSWORD" ]; then
  echo "Error: TCKT_MYSQL_ROOT_PASSWORD not found in $ENV_FILE" >&2
  exit 1
fi

DB_NAME="$(grep -m1 '^TCKT_DB_NAME=' "$ENV_FILE" | cut -d= -f2-)"
DB_NAME="${DB_NAME:-tckt_activity_hub}"

read -rsp "Enter password for '$READONLY_USER' (leave empty to auto-generate secure password): " INPUT_PASSWORD
echo

if [ -z "$INPUT_PASSWORD" ]; then
  READONLY_PASSWORD="$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)"
else
  READONLY_PASSWORD="$INPUT_PASSWORD"
fi
unset INPUT_PASSWORD

# Escape single quotes for SQL literal
esc() { printf '%s' "$1" | sed "s/'/''/g"; }
PASS_SQL="$(esc "$READONLY_PASSWORD")"

SQL="CREATE USER IF NOT EXISTS '${READONLY_USER}'@'%' IDENTIFIED BY '${PASS_SQL}';
ALTER USER '${READONLY_USER}'@'%' IDENTIFIED BY '${PASS_SQL}';
REVOKE ALL PRIVILEGES, GRANT OPTION FROM '${READONLY_USER}'@'%';
GRANT SELECT ON \`${DB_NAME}\`.* TO '${READONLY_USER}'@'%';
FLUSH PRIVILEGES;"

printf '%s\n' "$SQL" | "${COMPOSE[@]}" exec -T tckt-db \
  mysql -u root -p"$ROOT_PASSWORD"

HOST_PORT="$([ "$ROLE" = "staging" ] && echo 3306 || echo 3307)"

echo ""
echo "=============================================================="
echo "Read-only MySQL user ready!"
echo "--------------------------------------------------------------"
echo "Role:        ${ROLE}"
echo "Database:    ${DB_NAME}"
echo "Username:    ${READONLY_USER}"
echo "Password:    ${READONLY_PASSWORD}"
echo "Bound Host:  127.0.0.1:${HOST_PORT} (on VM host)"
echo "Privileges:  SELECT only on \`${DB_NAME}\`.*"
echo "=============================================================="
echo "Note: Save this password in your password manager / DBeaver connection."
echo "Do NOT commit this password to git or shell history."

unset READONLY_PASSWORD
unset PASS_SQL
unset ROOT_PASSWORD
