#!/usr/bin/env bash
# Anil Gold — one-shot VPS bootstrap (run ON the server as root)
# Usage: bash bootstrap_vps.sh
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
APP_DIR=/var/www/anil
REPO_URL="${REPO_URL:-https://github.com/radiarkazemi/anil_website_cluade.git}"
BRANCH="${BRANCH:-cursor/anil-gold-product-site-9af9}"
SERVER_IP="${SERVER_IP:-$(curl -4 -s --max-time 5 ifconfig.me || hostname -I | awk '{print $1}')}"
DOMAIN="${DOMAIN:-}"   # optional, e.g. anil.example.com
PUBLIC_HOST="${DOMAIN:-$SERVER_IP}"
PUBLIC_ORIGIN="http://${PUBLIC_HOST}"
if [[ -n "${DOMAIN}" ]]; then
  PUBLIC_ORIGIN="https://${PUBLIC_HOST}"
fi

echo "==> Host: ${PUBLIC_HOST}"
echo "==> App dir: ${APP_DIR}"

apt-get update -y
apt-get install -y \
  git curl ca-certificates gnupg ufw \
  nginx redis-server \
  python3 python3-venv python3-pip python3-dev \
  build-essential libpq-dev libjpeg-dev zlib1g-dev \
  postgresql postgresql-contrib

# Node 20
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

systemctl enable --now redis-server nginx postgresql

# Postgres DB + user
DB_PASS="$(openssl rand -hex 16)"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='anil'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE USER anil WITH PASSWORD '${DB_PASS}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='anil_gold'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE anil_gold OWNER anil;"
sudo -u postgres psql -c "ALTER USER anil WITH PASSWORD '${DB_PASS}';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE anil_gold TO anil;"

# Code
mkdir -p /var/www
if [[ "${SKIP_GIT:-0}" == "1" && -d "${APP_DIR}/backend" ]]; then
  echo "==> SKIP_GIT=1 — using existing ${APP_DIR}"
elif [[ -d "${APP_DIR}/.git" ]]; then
  cd "${APP_DIR}"
  git fetch origin
  git checkout "${BRANCH}"
  git pull origin "${BRANCH}"
else
  rm -rf "${APP_DIR}"
  git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
fi

SECRET_KEY="$(openssl rand -hex 48)"
ADMIN_PASS="${ADMIN_PASS:-$(openssl rand -base64 12)}"

# Backend env
cat > "${APP_DIR}/backend/.env" <<EOF
DEBUG=False
SECRET_KEY=${SECRET_KEY}
ALLOWED_HOSTS=${PUBLIC_HOST},127.0.0.1,localhost
DATABASE_URL=postgres://anil:${DB_PASS}@127.0.0.1:5432/anil_gold
REDIS_URL=redis://127.0.0.1:6379/0
CACHE_URL=redis://127.0.0.1:6379/1
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_NAME=anil_gold

CORS_ALLOWED_ORIGINS=${PUBLIC_ORIGIN}
CSRF_TRUSTED_ORIGINS=${PUBLIC_ORIGIN}
FRONTEND_URL=${PUBLIC_ORIGIN}
PAYMENT_CALLBACK_BASE=${PUBLIC_ORIGIN}

PAYMENT_SANDBOX=True
SECURE_SSL_REDIRECT=False
MEDIA_ROOT=${APP_DIR}/backend/media
MEDIA_SERVE=0

GOLD_STREAM=1
GOLD_POLL_SECONDS=8
GOLD_PERSIST_SECONDS=120
LOG_LEVEL=INFO
EOF

# Backend venv + migrate
cd "${APP_DIR}/backend"
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip wheel setuptools
pip install -r requirements.txt
mkdir -p media staticfiles
python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py seed_layout || true
# Admin with known password for first login (change immediately)
python manage.py create_admin --phone 09120000000 --password "${ADMIN_PASS}" || true
deactivate

# Frontend build (API via same host /api proxy)
cd "${APP_DIR}/frontend"
cat > .env.production <<EOF
VITE_API_URL=${PUBLIC_ORIGIN}/api/v1
VITE_WS_URL=ws://${PUBLIC_HOST}/ws/gold/
EOF
if [[ -n "${DOMAIN}" ]]; then
  cat > .env.production <<EOF
VITE_API_URL=https://${DOMAIN}/api/v1
VITE_WS_URL=wss://${DOMAIN}/ws/gold/
EOF
fi
npm ci
npm run build

# systemd API
cat > /etc/systemd/system/anil-api.service <<EOF
[Unit]
Description=Anil Gold ASGI API
After=network.target postgresql.service redis-server.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=${APP_DIR}/backend
EnvironmentFile=${APP_DIR}/backend/.env
ExecStart=${APP_DIR}/backend/.venv/bin/uvicorn config.asgi:application --host 127.0.0.1 --port 8000 --workers 1
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

chown -R www-data:www-data "${APP_DIR}"
# keep .env readable by service user only
chmod 640 "${APP_DIR}/backend/.env"
chown root:www-data "${APP_DIR}/backend/.env"

systemctl daemon-reload
systemctl enable --now anil-api

# Nginx site
cat > /etc/nginx/sites-available/anil <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name ${PUBLIC_HOST};

    client_max_body_size 8m;
    root ${APP_DIR}/frontend/dist;
    index index.html;

    location /assets/ {
        expires 7d;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    location /media/ {
        alias ${APP_DIR}/backend/media/;
        expires 1d;
        access_log off;
    }

    location /static/ {
        alias ${APP_DIR}/backend/staticfiles/;
        expires 7d;
        access_log off;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
    }

    location /admin/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/anil /etc/nginx/sites-enabled/anil
nginx -t
systemctl reload nginx

# Firewall
ufw allow OpenSSH || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw --force enable || true

sleep 2
curl -sf "http://127.0.0.1/api/v1/health/" || curl -sf "http://127.0.0.1:8000/api/v1/health/" || true

cat > /root/anil-deploy-credentials.txt <<EOF
Anil Gold deploy summary
========================
URL:          ${PUBLIC_ORIGIN}
Admin panel:  ${PUBLIC_ORIGIN}/panel/login
Admin phone:  09120000000
Admin pass:   ${ADMIN_PASS}
DB user:      anil
DB pass:      ${DB_PASS}
App dir:      ${APP_DIR}
API service:  systemctl status anil-api

CHANGE the admin password and root SSH password immediately.
When you have a domain, set DOMAIN=... and re-run, then certbot.
EOF
chmod 600 /root/anil-deploy-credentials.txt

echo
echo "=========================================="
echo "Deploy finished: ${PUBLIC_ORIGIN}"
echo "Admin: 09120000000 / (see /root/anil-deploy-credentials.txt)"
echo "=========================================="
