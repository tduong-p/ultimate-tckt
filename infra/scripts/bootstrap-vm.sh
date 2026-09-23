#!/usr/bin/env bash
# Usage: bootstrap-vm.sh <staging|production>
# Chạy MỘT LẦN trên VM khi chuyển sang repo ultimate-tckt. Không đụng container đang chạy.
# Yêu cầu trước: deploy key chỉ-đọc của VM đã được thêm vào repo (docs/ops runbook).
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

ENV="${1:-}"; BRANCH="$(ut_env_branch "$ENV")"
DIR="$(ut_env_dir "$ENV")"
OLD_ENV="${UT_OLD_ENV_DIR:-/opt/infra}/.env.$ENV"
# Có thể trỏ sang alias SSH riêng của VM (vd host trong ~/.ssh/config) thay vì github.com trực tiếp.
UT_REPO_URL="${UT_REPO_URL:-git@github.com:tduong-p/ultimate-tckt.git}"

if [[ ! -d "$DIR/.git" ]]; then
  mkdir -p "$(dirname "$DIR")"
  git clone --filter=blob:none --sparse --branch "$BRANCH" "$UT_REPO_URL" "$DIR"
  git -C "$DIR" sparse-checkout set infra
fi

TARGET="$DIR/infra/.env"
if [[ -f "$TARGET" ]]; then echo "$TARGET already exists — leaving it untouched"; exit 0; fi
[[ -f "$OLD_ENV" ]] || ut_die "old env file not found: $OLD_ENV"

TMP="$(mktemp)"; trap 'rm -f "$TMP"' EXIT
sed -E 's/^TCKT_/CORE_/' "$OLD_ENV" > "$TMP"
printf '\n' >> "$TMP"   # đảm bảo dòng cuối có xuống dòng (file nguồn có thể thiếu) trước khi append
if ! grep -Eq '^CORE_SETTINGS_ENCRYPTION_KEY=.+' "$TMP"; then
  sed -i.bak '/^CORE_SETTINGS_ENCRYPTION_KEY=/d' "$TMP" && rm -f "$TMP.bak"
  echo "CORE_SETTINGS_ENCRYPTION_KEY=$(openssl rand -base64 32)" >> "$TMP"
fi

missing=()
while IFS= read -r key; do
  [[ "$key" == "CORE_DEVOPS_EMAILS" ]] && continue   # tuỳ chọn
  grep -Eq "^${key}=.+" "$TMP" || missing+=("$key")
done < <(sed -nE 's/^([A-Z0-9_]+)=.*/\1/p' "$DIR/infra/.env.example")
if (( ${#missing[@]} )); then
  echo "ERROR: missing required variables in $OLD_ENV (after rename): ${missing[*]}" >&2
  exit 2
fi

install -m 600 "$TMP" "$TARGET"
echo "Wrote $TARGET"
