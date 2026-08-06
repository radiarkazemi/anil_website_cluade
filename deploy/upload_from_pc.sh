#!/usr/bin/env bash
# Run from YOUR Windows Git Bash / WSL — uploads local repo and bootstraps VPS.
# Use when the VPS cannot reach GitHub / Ubuntu mirrors.
#
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

echo "==> Upload helper scripts"
"${SCP[@]}" \
  "${ROOT_DIR}/deploy/fix_vps_dns.sh" \
  "${ROOT_DIR}/deploy/bootstrap_vps.sh" \
  "${VPS_USER}@${VPS_HOST}:/root/"

echo "==> Fix DNS + apt mirrors on VPS"
"${SSH[@]}" "${VPS_USER}@${VPS_HOST}" 'bash /root/fix_vps_dns.sh'

echo "==> Pack project (exclude venv/node_modules)"
TMP_TGZ="$(mktemp /tmp/anilXXXXXX.tar.gz)"
tar -C "${ROOT_DIR}" \
  --exclude='.git' \
  --exclude='backend/.venv' \
  --exclude='frontend/node_modules' \
  --exclude='frontend/dist' \
  --exclude='backend/db.sqlite3' \
  --exclude='**/__pycache__' \
  --exclude='*.pyc' \
  -czf "${TMP_TGZ}" .
ls -lh "${TMP_TGZ}"
"${SCP[@]}" "${TMP_TGZ}" "${VPS_USER}@${VPS_HOST}:/root/anil-src.tar.gz"
rm -f "${TMP_TGZ}"

echo "==> Unpack + bootstrap on VPS"
"${SSH[@]}" "${VPS_USER}@${VPS_HOST}" "bash -s" <<REMOTE
set -euo pipefail
rm -rf /var/www/anil
mkdir -p /var/www/anil
tar -xzf /root/anil-src.tar.gz -C /var/www/anil
test -d /var/www/anil/backend
cp /root/bootstrap_vps.sh /var/www/anil/deploy/bootstrap_vps.sh 2>/dev/null || true
SERVER_IP=${VPS_HOST} SKIP_GIT=1 bash /root/bootstrap_vps.sh
REMOTE

echo
echo "Done. Open http://${VPS_HOST}/"
echo "Credentials on server: /root/anil-deploy-credentials.txt"
