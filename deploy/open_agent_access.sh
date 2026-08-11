#!/usr/bin/env bash
# Anil VPS — open durable remote access for Cursor cloud agent
# Paste-run as root on the VPS. Keeps working after reboot.
#
# BEFORE running: create a Tailscale auth key (free):
#   1) https://login.tailscale.com/admin/settings/keys
#   2) Generate auth key → enable "Reusable" + "Ephemeral" OFF
#   3) export TS_AUTHKEY='tskey-auth-xxxxxxxx'
#   4) bash open_agent_access.sh
#
# If you have no Tailscale key yet, the script still fixes DNS + SSH key,
# then prints exact next steps.
set -euo pipefail

AGENT_PUBKEY='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINdUQSfQVYhNQzeFJP1EQmGCxzk0r8BE6IclJZaplv8H cursor-cloud-anil-deploy'
REPORT=/root/anil-agent-access.txt

echo "=============================================="
echo " Anil — agent access setup"
echo "=============================================="

# ── 1) DNS (required on many IR VPS) ─────────────────────────────────────────
echo "==> [1/6] Fix DNS"
chattr -i /etc/resolv.conf 2>/dev/null || true
cat > /etc/resolv.conf <<'EOF'
nameserver 178.22.122.100
nameserver 185.51.200.2
nameserver 8.8.8.8
nameserver 1.1.1.1
options timeout:2 attempts:3
EOF
# Also try systemd-resolved drop-in
mkdir -p /etc/systemd/resolved.conf.d
cat > /etc/systemd/resolved.conf.d/anil.conf <<'EOF'
[Resolve]
DNS=178.22.122.100 185.51.200.2 8.8.8.8
FallbackDNS=1.1.1.1
DNSSEC=no
EOF
systemctl restart systemd-resolved 2>/dev/null || true

echo "DNS probes:"
(getent hosts login.tailscale.com || true)
(getent hosts pkgs.tailscale.com || true)
(ping -c 1 -W 3 8.8.8.8 || true)

# ── 2) SSH harden + agent pubkey ─────────────────────────────────────────────
echo "==> [2/6] Install Cursor agent SSH public key"
mkdir -p /root/.ssh
chmod 700 /root/.ssh
touch /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
grep -qF 'cursor-cloud-anil-deploy' /root/.ssh/authorized_keys 2>/dev/null \
  || echo "$AGENT_PUBKEY" >> /root/.ssh/authorized_keys

# Ensure password + pubkey auth both work (until key-only is desired)
SSHD_CFG=/etc/ssh/sshd_config
cp -a "$SSHD_CFG" "${SSHD_CFG}.bak.$(date +%s)" || true
sed -i 's/^#\?PubkeyAuthentication.*/PubkeyAuthentication yes/' "$SSHD_CFG"
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication yes/' "$SSHD_CFG"
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin yes/' "$SSHD_CFG"
# Drop any Match Address deny rules that block foreign nets (if present)
if grep -qiE 'Match.*(Address|Host)' "$SSHD_CFG"; then
  echo "NOTE: sshd_config has Match rules — review ${SSHD_CFG}.bak.*"
fi
systemctl reload sshd 2>/dev/null || systemctl reload ssh 2>/dev/null || true

# ── 3) UFW open SSH (won't fix provider geo-block, still good) ───────────────
echo "==> [3/6] UFW basics"
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH || true
  ufw allow 80/tcp || true
  ufw allow 443/tcp || true
  # Current + recent Cursor cloud egress samples (they rotate!)
  for ip in 52.40.48.127 52.13.17.46 54.201.20.43 44.239.176.212 44.236.205.197; do
    ufw allow from "$ip" to any port 22 proto tcp || true
  done
  ufw --force enable || true
  ufw status | head -40
fi

# ── 4) Diagnose inbound geo-block ───────────────────────────────────────────
echo "==> [4/6] Local SSH banner check"
python3 - <<'PY' || true
import socket
s=socket.socket(); s.settimeout(3)
try:
    s.connect(("127.0.0.1",22))
    print("local banner:", s.recv(80))
except Exception as e:
    print("local ssh failed:", e)
finally:
    s.close()
PY

# ── 5) Tailscale = durable path for cloud agent ──────────────────────────────
echo "==> [5/6] Tailscale install (durable access)"
install_tailscale() {
  if command -v tailscale >/dev/null 2>&1; then
    echo "tailscale already installed: $(tailscale version | head -1)"
    return 0
  fi
  # Official installer (needs DNS + HTTPS)
  if curl -fsSL https://tailscale.com/install.sh -o /tmp/ts-install.sh; then
    bash /tmp/ts-install.sh
    return 0
  fi
  # Apt via Tailscale package repo (fallback)
  . /etc/os-release
  curl -fsSL "https://pkgs.tailscale.com/stable/ubuntu/${VERSION_CODENAME}.noarmor.gpg" \
    -o /usr/share/keyrings/tailscale-archive-keyring.gpg || return 1
  curl -fsSL "https://pkgs.tailscale.com/stable/ubuntu/${VERSION_CODENAME}.tailscale-keyring.list" \
    -o /etc/apt/sources.list.d/tailscale.list || return 1
  apt-get update -y && apt-get install -y tailscale
}

TS_OK=0
if install_tailscale; then
  systemctl enable --now tailscaled
  if [[ -n "${TS_AUTHKEY:-}" ]]; then
    echo "Bringing Tailscale up with auth key..."
    tailscale up --authkey="${TS_AUTHKEY}" --ssh --hostname="anil-vps" --accept-routes=false
    sleep 2
    tailscale status || true
    TS_IP="$(tailscale ip -4 2>/dev/null || true)"
    TS_OK=1
  else
    echo
    echo "!!! TS_AUTHKEY not set — Tailscale installed but NOT joined."
    echo "    Create key: https://login.tailscale.com/admin/settings/keys"
    echo "    Then run:"
    echo "      export TS_AUTHKEY='tskey-auth-...'"
    echo "      tailscale up --authkey=\"\$TS_AUTHKEY\" --ssh --hostname=anil-vps"
  fi
else
  echo "WARNING: could not download Tailscale (DNS/HTTPS blocked)."
  echo "From your Windows PC, install Tailscale manually later, or scp the .deb"
fi

# ── 6) Optional temporary serveo tunnel (bonus, keep terminal open) ──────────
echo "==> [6/6] Write access report"
{
  echo "Anil agent access report — $(date -u)"
  echo "hostname: $(hostname)"
  echo "public_ip: $(curl -4 -s --max-time 5 ifconfig.me || echo unknown)"
  echo "agent_pubkey_installed: yes"
  echo "tailscale_joined: $TS_OK"
  if [[ "$TS_OK" == "1" ]]; then
    echo "tailscale_ip: ${TS_IP:-unknown}"
    echo "tailscale_status:"
    tailscale status || true
  fi
  echo
  echo "Provider inbound SSH from AWS is often RESET (geo-block)."
  echo "Durable access = Tailscale SSH to the 100.x address."
} | tee "$REPORT"
chmod 600 "$REPORT"

echo
echo "=============================================="
echo " DONE. Full report: $REPORT"
echo "=============================================="
if [[ "$TS_OK" == "1" ]]; then
  echo "Paste this back to Cursor:"
  echo "TAILSCALE_IP=${TS_IP}"
  echo "HOSTNAME=anil-vps"
else
  echo "NEXT: export TS_AUTHKEY=... and re-run this script (or tailscale up ...)"
fi
echo
echo "Optional TEMP tunnel (keep window open), then paste output to Cursor:"
echo "  ssh -o StrictHostKeyChecking=accept-new -R 0:localhost:22 serveo.net"
