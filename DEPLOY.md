# Anil Gold — production deploy checklist
# Run on the VPS after code is pulled and deps installed.

## 1) Infrastructure
- [ ] Ubuntu 22.04/24.04 VPS (2 vCPU / 4 GB+)
- [ ] Domain + DNS A record
- [ ] TLS (certbot) on Nginx
- [ ] Postgres 16 + Redis 7 (+ Mongo optional for analytics)
- [ ] Firewall: 80/443 only public; 8000 localhost

## 2) Backend env (`backend/.env`)
```bash
DEBUG=False
SECRET_KEY=<openssl rand -hex 48>
ALLOWED_HOSTS=anil.example.com,www.anil.example.com
DATABASE_URL=postgres://USER:PASS@127.0.0.1:5432/anil_gold
REDIS_URL=redis://127.0.0.1:6379/0
CACHE_URL=redis://127.0.0.1:6379/1
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_NAME=anil_gold

CORS_ALLOWED_ORIGINS=https://anil.example.com
CSRF_TRUSTED_ORIGINS=https://anil.example.com
FRONTEND_URL=https://anil.example.com
PAYMENT_CALLBACK_BASE=https://anil.example.com

PAYMENT_SANDBOX=False
ZARINPAL_MERCHANT_ID=...
IDPAY_API_KEY=...

# Media: prefer nginx alias to MEDIA_ROOT (see deploy/nginx.conf.example)
MEDIA_ROOT=/var/www/anil/backend/media
MEDIA_SERVE=0
# Or object storage:
# USE_S3=1
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...
# AWS_STORAGE_BUCKET_NAME=...
# AWS_S3_ENDPOINT_URL=https://...   # Liara / MinIO / Arvan

GOLD_STREAM=1
GOLD_POLL_SECONDS=8
GOLD_PERSIST_SECONDS=120
SECURE_SSL_REDIRECT=True
```

## 3) Install & migrate
```bash
cd /var/www/anil/backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py seed_layout
python manage.py create_admin   # then CHANGE the password immediately
python manage.py check_prod --strict
```

## 4) Run API (ASGI — required for WebSockets)
```bash
# systemd recommended; workers=1 while GOLD_STREAM=1 (one poller)
uvicorn config.asgi:application --host 127.0.0.1 --port 8000 --workers 1
# or: daphne -b 127.0.0.1 -p 8000 config.asgi:application
```

## 5) Frontend
```bash
cd /var/www/anil/frontend
cp .env.example .env.production   # set VITE_API_URL
npm ci && npm run build
# Nginx root → dist/
```

## 6) Nginx
- Copy `deploy/nginx.conf.example` → `/etc/nginx/sites-available/anil`
- Point `/media/` at `MEDIA_ROOT`
- Reload nginx; confirm:
  - `https://…/` SPA
  - `https://…/api/v1/health/`
  - `wss://…/ws/gold/`
  - product images load from `/media/…`

## 7) Security smoke test
- [ ] `DEBUG=False` (no Django debug page on 404)
- [ ] Admin password changed from default
- [ ] `PAYMENT_SANDBOX=False` + real test payment
- [ ] Upload rejects non-images / files > 5MB
- [ ] Rate limits return 429 under spam
- [ ] HSTS / HTTPS redirect works
- [ ] CORS blocks unknown origins

## 8) Ops
- Nightly Postgres backup
- Media volume / S3 backup
- Log rotation for uvicorn/daphne
- Monitor `/api/v1/health/`
