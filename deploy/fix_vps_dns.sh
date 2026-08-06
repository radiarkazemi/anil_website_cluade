#!/usr/bin/env bash
# Run on the VPS as root — fixes DNS + apt mirrors for Iran networks
set -euo pipefail

echo "==> Fix resolvers"
mkdir -p /etc/systemd/resolved.conf.d
cat > /etc/systemd/resolved.conf.d/anil.conf <<'EOF'
[Resolve]
DNS=178.22.122.100 185.51.200.2 8.8.8.8 1.1.1.1
FallbackDNS=9.9.9.9
Domains=~.
DNSSEC=no
EOF

# Also set classic resolv.conf (some images override)
if [[ -L /etc/resolv.conf ]]; then
  systemctl enable --now systemd-resolved 2>/dev/null || true
  systemctl restart systemd-resolved 2>/dev/null || true
  # Prefer stub if present; else write static
  if [[ -f /run/systemd/resolve/stub-resolv.conf ]]; then
    ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf
  fi
fi

# Hard fallback file if still broken
if ! getent hosts archive.ubuntu.com >/dev/null 2>&1; then
  chattr -i /etc/resolv.conf 2>/dev/null || true
  rm -f /etc/resolv.conf
  cat > /etc/resolv.conf <<'EOF'
nameserver 178.22.122.100
nameserver 185.51.200.2
nameserver 8.8.8.8
nameserver 1.1.1.1
options timeout:2 attempts:2
EOF
fi

echo "==> DNS test"
getent hosts archive.ubuntu.com || true
getent hosts github.com || true
ping -c 1 -W 3 8.8.8.8 || true

echo "==> Switch apt to Arvan Ubuntu mirror (often works in IR)"
. /etc/os-release
cat > /etc/apt/sources.list <<EOF
deb http://mirror.arvancloud.ir/ubuntu/ ${VERSION_CODENAME} main restricted universe multiverse
deb http://mirror.arvancloud.ir/ubuntu/ ${VERSION_CODENAME}-updates main restricted universe multiverse
deb http://mirror.arvancloud.ir/ubuntu/ ${VERSION_CODENAME}-backports main restricted universe multiverse
deb http://mirror.arvancloud.ir/ubuntu/ ${VERSION_CODENAME}-security main restricted universe multiverse
EOF

apt-get update -y
echo "DNS/apt fix done."
