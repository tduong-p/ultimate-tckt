#!/usr/bin/env bash
# Usage: ./create-tckt-admin.sh <staging|production>
# Run ON THE VM, from /opt/infra. Creates (or promotes) a local-auth admin
# account in the TCKT database — for bootstrapping access when no working
# admin account exists yet (e.g. the seeded admin@example.com password is
# unknown, or that account got deactivated).
set -euo pipefail

ROLE="${1:?Usage: create-tckt-admin.sh <staging|production>}"
case "$ROLE" in
  staging|production) ;;
  *) echo "ROLE must be 'staging' or 'production', got: $ROLE" >&2; exit 1 ;;
esac

cd /opt/infra
COMPOSE_FILE="docker-compose.${ROLE}.yml"
ENV_FILE=".env.${ROLE}"
PROJECT="seee-ctd-${ROLE}"
COMPOSE=(docker compose -p "$PROJECT" --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

read -rp "Full name: " ADMIN_NAME
read -rp "Email: " ADMIN_EMAIL
read -rsp "Password (min 8 chars): " ADMIN_PASSWORD
echo
if [ "${#ADMIN_PASSWORD}" -lt 8 ]; then
  echo "Password must be at least 8 characters." >&2
  exit 1
fi

# Hash with the app's own bcryptjs (same lib/cost factor the app uses at login),
# piped over stdin so the plaintext never appears in argv/process list/shell history.
HASH="$(printf '%s' "$ADMIN_PASSWORD" | "${COMPOSE[@]}" exec -T tckt-app node -e '
  let data = "";
  process.stdin.on("data", c => data += c);
  process.stdin.on("end", () => {
    process.stdout.write(require("bcryptjs").hashSync(data, 10));
  });
')"
unset ADMIN_PASSWORD

if [ -z "$HASH" ]; then
  echo "Failed to generate a password hash (is the tckt-app container running?)." >&2
  exit 1
fi

# Escape single quotes for the SQL literals below (trusted operator input, not untrusted user input).
esc() { printf '%s' "$1" | sed "s/'/''/g"; }
NAME_SQL="$(esc "$ADMIN_NAME")"
EMAIL_SQL="$(esc "$ADMIN_EMAIL")"

SQL="INSERT INTO users (name, email, password_hash, role, auth_provider, is_active)
VALUES ('${NAME_SQL}', '${EMAIL_SQL}', '${HASH}', 'admin', 'local', 1)
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  role = 'admin',
  auth_provider = 'local',
  is_active = 1;"

printf '%s\n' "$SQL" | "${COMPOSE[@]}" exec -T tckt-db \
  mysql -u tckt_app -p"$(grep -m1 '^TCKT_DB_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)" tckt_activity_hub

echo "Admin account ready: ${ADMIN_EMAIL} (role=admin, auth_provider=local)."
