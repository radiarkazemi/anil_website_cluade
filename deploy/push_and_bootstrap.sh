#!/usr/bin/env bash
# Run from YOUR PC (Git Bash / WSL) — cloud agents often cannot SSH to IR VPS.
# Usage:
#   export VPS_HOST=185.222.163.108
#   export VPS_USER=root
#   export SSHPASS='your-root-password'
#   bash deploy/push_and_bootstrap.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VPS_HOST="${VPS_HOST:?set VPS_HOST}"
VPS_USER="${VPS_USER:-root}"
SSHPASS="${SSHPASS:?set SSHPASS (root password)}"
export SSHPASS

SSH=(sshpass -e ssh -o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no)
SCP=(sshpass -e scp -o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no)

echo "==> Testing SSH to ${VPS_USER}@${VPS_HOST} ..."
"${SSH[@]}" "${VPS_USER}@${VPS_HOST}" 'uname -a && whoami'

echo "==> Uploading bootstrap script ..."
"${SCP[@]}" "${ROOT_DIR}/deploy/bootstrap_vps.sh" "${VPS_USER}@${VPS_HOST}:/root/bootstrap_vps.sh"

echo "==> Running bootstrap on server (this takes several minutes) ..."
"${SSH[@]}" "${VPS_USER}@${VPS_HOST}" "SERVER_IP=${VPS_HOST} DOMAIN=${DOMAIN:-} bash /root/bootstrap_vps.sh"

echo "==> Fetching credentials file (saved locally as anil-deploy-credentials.txt) ..."
"${SCP[@]}" "${VPS_USER}@${VPS_HOST}:/root/anil-deploy-credentials.txt" "${ROOT_DIR}/anil-deploy-credentials.txt" || true
chmod 600 "${ROOT_DIR}/anil-deploy-credentials.txt" 2>/dev/null || true

echo
echo "Done. Open http://${VPS_HOST}/"
echo "Credentials: ${ROOT_DIR}/anil-deploy-credentials.txt (do not commit)"
echo "IMPORTANT: change root + admin passwords now."
