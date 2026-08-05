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
python manage.py runserver
```

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
python manage.py runserver
```

## Admin panel login

- URL: http://localhost:5173/login
- Then open: http://localhost:5173/panel
- Default: phone `09120000000` / password `anil-admin-2026`
