#!/usr/bin/env bash
# Usage: ./setup-vm.sh <github-owner>
# This VM hosts BOTH staging and production (single Always-Free VM), so it
# enables every Nginx site under nginx/staging/ and nginx/production/.
set -euo pipefail

GH_OWNER="${1:?Usage: setup-vm.sh <github-owner>}"

echo "== Opening firewall (iptables) for 80/443 =="
# Insert ACCEPT rules right before the first REJECT/DROP rule in INPUT, not at
# a hardcoded line number — a fixed position (e.g. "-I INPUT 6") can land
# AFTER an existing catch-all REJECT rule depending on the base image's
# default ruleset, silently making the new rule dead (this bit us once: the
# fixed position 6 landed after a REJECT at position 5, so 80/443 stayed
# blocked despite `iptables -C` reporting the rule existed).
reject_line=$(sudo iptables -L INPUT --line-numbers -n | awk '$2 ~ /^(REJECT|DROP)$/ {print $1; exit}')
insert_before="${reject_line:-9999}"
sudo iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || sudo iptables -I INPUT "$insert_before" -p tcp --dport 80 -j ACCEPT
reject_line=$(sudo iptables -L INPUT --line-numbers -n | awk '$2 ~ /^(REJECT|DROP)$/ {print $1; exit}')
insert_before="${reject_line:-9999}"
sudo iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || sudo iptables -I INPUT "$insert_before" -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

echo "== Installing Docker =="
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi

echo "== Installing Nginx + Certbot =="
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx git

echo "== Cloning infra repo to /opt/infra =="
# Uses git@github.com: (SSH) rather than https:// because this repo is
# private and the VM authenticates via a read-only deploy key registered on
# GitHub, not a stored PAT — see docs/manual-setup-guide.md for how that key
# was set up.
sudo mkdir -p /opt/infra
sudo chown "$USER":"$USER" /opt/infra
if [[ ! -d /opt/infra/.git ]]; then
  git clone "git@github.com:${GH_OWNER}/infra.git" /opt/infra
fi

echo "== Enabling all Nginx sites (staging + production) =="
for conf in /opt/infra/nginx/staging/*.conf /opt/infra/nginx/production/*.conf; do
  role=$(basename "$(dirname "$conf")")
  name="${role}-$(basename "$conf")"
  sudo cp "$conf" "/etc/nginx/sites-available/$name"
  sudo ln -sf "/etc/nginx/sites-available/$name" "/etc/nginx/sites-enabled/$name"
done
sudo nginx -t
sudo systemctl reload nginx

echo "== Done. Next steps (manual): =="
echo "1. sudo certbot --nginx  (issues certs for every server_name found in enabled sites)"
echo "2. Create /opt/infra/.env.staging AND /opt/infra/.env.production with real secrets (see infra/README.md)"
echo "3. docker login ghcr.io -u $GH_OWNER  (use a GitHub PAT with read:packages scope)"
