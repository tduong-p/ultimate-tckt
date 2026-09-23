#!/usr/bin/env bash
# Usage: ./setup-vm.sh
# This VM hosts BOTH staging and production (single Always-Free VM). Repo is
# fixed: tduong-p/ultimate-tckt.
set -euo pipefail

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

echo "== Preparing /opt/ultimate-tckt =="
sudo mkdir -p /opt/ultimate-tckt/backups
sudo chown -R "$USER":"$USER" /opt/ultimate-tckt
echo "== Next: add this VM's deploy key to tduong-p/ultimate-tckt, then for each env run =="
echo "   bash <(curl -fsSL …) is NOT used — copy infra/scripts from a checkout and run:"
echo "   infra/scripts/bootstrap-vm.sh staging && infra/scripts/apply-infra.sh staging"
echo "   infra/scripts/bootstrap-vm.sh production && infra/scripts/apply-infra.sh production"

echo "== Done. Next steps (manual): =="
echo "1. sudo certbot --nginx  (issues certs for every server_name found in enabled sites)"
echo "2. Add this VM's deploy key to tduong-p/ultimate-tckt (read-only), then run:"
echo "   infra/scripts/bootstrap-vm.sh staging && infra/scripts/apply-infra.sh staging"
echo "   infra/scripts/bootstrap-vm.sh production && infra/scripts/apply-infra.sh production"
echo "   (each writes /opt/ultimate-tckt/<env>/infra/.env; set UT_OLD_ENV_DIR if migrating an older host)"
echo "3. docker login ghcr.io -u <github-user>  (use a GitHub PAT with read:packages scope)"
