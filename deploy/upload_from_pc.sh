#!/usr/bin/env bash
# Run from YOUR Windows Git Bash / WSL — uploads local repo and bootstraps VPS.
# Works when the VPS cannot reach GitHub (common in IR).
#
# Usage:
#   export VPS_HOST=185.222.163.108
#   export VPS_USER=root
#   export SSHPASS='your-root-password'
#   bash deploy/upload_from_pc.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VPS_HOST="${VPS_HOST:?set VPS_HOST}"
VPS_USER="${VPS_USER:-root}"
SSHPASS="${SSHPASS:?set SSHPASS}"
export SSHPASS

SSH=(sshpass -e ssh -o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no)
SCP=(sshpass -e scp -o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no)

echo "==> SSH test"
"${SSH[@]}" "${VPS_USER}@${VPS_HOST}" 'echo OK; hostname'

echo "==> Upload DNS fix + bootstrap"
"${SCP[@]}" \
  "${ROOT_DIR}/deploy/fix_vps_dns.sh" \
  "${ROOT_DIR}/deploy/bootstrap_vps.sh" \
  "${VPS_USER}@${VPS_HOST}:/root/"

echo "==> Fix DNS/apt on VPS"
"${SSH[@]}" "${VPS_USER}@${VPS_HOST}" 'bash /root/fix_vps_dns.sh'

echo "==> Pack and upload project (no .venv / node_modules)"
TMP_TGZ="$(mktemp -t anilXXXXXX.tar.gz)"
tar -C "${ROOT_DIR}" \
  --exclude='.git' \
  --exclude='backend/.venv' \
  --exclude='frontend/node_modules' \
  --exclude='frontend/dist' \
  --exclude='backend/db.sqlite3' \
  --exclude='**/__pycache__' \
  --exclude='*.pyc' \
  -czf "${TMP_TGZ}" .
"${SCP[@]}" "${TMP_TGZ}" "${VPS_USER}@${VPS_HOST}:/root/anil-src.tar.gz"
rm -f "${TMP_TGZ}"

echo "==> Unpack on VPS and run bootstrap (skip git clone)"
"${SSH[@]}" "${VPS_USER}@${VPS_HOST}" bash -s <<'REMOTE'
set -euo pipefail
rm -rf /var/www/anil /tmp/anil-unpack
mkdir -p /tmp/anil-unpack /var/www
tar -xzf /root/anil-src.tar.gz -C /tmp/anil-unpack
# If tarball root is flat files, use as-is; if nested, detect
if [[ -d /tmp/anil-unpack/backend ]]; then
  rm -rf /var/www/anil
  mv /tmp/anil-unpack /var/www/anil
else
  echo "Unexpected archive layout"; ls -la /tmp/anil-unpack; exit 1
fi
# Patch bootstrap to skip git clone when /var/www/anil already exists with backend/
export SERVER_IP=185.222.163.108
export REPO_URL=local
# Force bootstrap to use existing tree: fake .git so it pulls path is skipped — rewrite
# Easiest: run bootstrap but replace clone section by ensuring .git exists
mkdir -p /var/www/anil/.git
# Make bootstrap "update" path no-op fetch by using a local stub — instead call bootstrap after
# temporarily commenting clone: we set BRANCH and existing dir with .git
cd /var/www/anil
git init >/dev/null 2>&1 || true
SERVER_IP=185.222.163.108 bash /root/bootstrap_vps.sh
REMOTE

echo "Done. Open http://${VPS_HOST}/"
