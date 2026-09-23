#!/usr/bin/env bash
# Usage: ./create-core-admin.sh <staging|production>
# Run ON THE VM. Creates (or promotes) a local-auth admin
# account in the core database — for bootstrapping access when no working
# admin account exists yet (e.g. the seeded admin@example.com password is
# unknown, or that account got deactivated).
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

ENV="${1:-}"; ut_env_branch "$ENV" >/dev/null
ENV_FILE="$(ut_env_dir "$ENV")/infra/.env"

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
HASH="$(printf '%s' "$ADMIN_PASSWORD" | ut_compose "$ENV" exec -T core node -e '
  let data = "";
  process.stdin.on("data", c => data += c);
  process.stdin.on("end", () => {
    process.stdout.write(require("bcryptjs").hashSync(data, 10));
  });
')"
unset ADMIN_PASSWORD

if [ -z "$HASH" ]; then
  echo "Failed to generate a password hash (is the core container running?)." >&2
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

CORE_DB_USER_VAL="$(grep -m1 '^CORE_DB_USER=' "$ENV_FILE" | cut -d= -f2-)"
CORE_DB_NAME_VAL="$(grep -m1 '^CORE_DB_NAME=' "$ENV_FILE" | cut -d= -f2-)"
printf '%s\n' "$SQL" | ut_compose "$ENV" exec -T core-db \
  mysql -u "$CORE_DB_USER_VAL" -p"$(grep -m1 '^CORE_DB_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)" "$CORE_DB_NAME_VAL"

echo "Admin account ready: ${ADMIN_EMAIL} (role=admin, auth_provider=local)."
