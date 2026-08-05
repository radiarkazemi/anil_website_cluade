# Database setup (Windows)

## Option A — Docker (recommended)

> If you see `bash: docker: command not found`, Docker is **not installed**.
> Install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/),
> restart Git Bash, then retry. Until then use **Option B (SQLite)** — the shop works fine without Docker.

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and ensure it is running
2. From project root (`D:\anil_website_cluade`):

```bash
docker compose up -d
```

3. Backend `.env`:

```env
DATABASE_URL=postgres://anil:anil@127.0.0.1:5432/anil_gold
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_NAME=anil_gold
```

4. Migrate & seed:

```bash
cd backend
source .venv/Scripts/activate
python manage.py migrate
python manage.py seed
python manage.py seed_images
python manage.py create_admin
# WebSocket gold stream (Faraz) — use Daphne ASGI
daphne -b 0.0.0.0 -p 8000 config.asgi:application
# HTTP-only fallback: python manage.py runserver
```

Gold stream: `ws://localhost:8000/ws/gold/` (Faraz مثقال ۱۷ → گرم ۱۸). Product prices use streamed گرم ۱۸.

## Option B — SQLite only (no Docker) ← use this if Docker is missing

Leave `DATABASE_URL` empty / unset. Django falls back to `db.sqlite3`.
MongoDB analytics become optional (features degrade gracefully if Mongo is down).

```bash
cd backend
source .venv/Scripts/activate
# do NOT set DATABASE_URL
python manage.py migrate
python manage.py seed
python manage.py seed_images
python manage.py create_admin
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

## Admin panel login

- URL: http://localhost:5180/panel/login  ← managers only
- Customer login: http://localhost:5180/login
- Default admin: phone `09120000000` / password `anil-admin-2026`

Admin and customer sessions are separate (different tokens). Use `/panel/login` for the ops console.

Advanced panel features: command palette (`Ctrl+K`), live KPIs, order drawer, analytics, role management.
