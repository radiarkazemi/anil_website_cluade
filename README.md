# گالری طلا آنیل — Anil Gold Gallery

Production-grade e-commerce platform for a Persian gold & jewelry shop with **live dynamic pricing**.

## Architecture

```
/
├── backend/           Django REST API (Python 3.12+)
│   ├── config/        Django settings, URLs, WSGI
│   ├── apps/
│   │   ├── accounts/  Custom User (UUID, phone-auth, JWT)
│   │   ├── store/     Products, Categories, GoldPrice, Wishlist
│   │   ├── orders/    Orders, OrderItems (server-side pricing)
│   │   └── analytics/ MongoDB: price history, page views, audit
│   └── manage.py
├── frontend/          React SPA (Vite + TypeScript)
│   ├── src/
│   │   ├── api/       Axios client + API endpoints
│   │   ├── components/ Header, ProductCard, CartDrawer, Toast
│   │   ├── hooks/     useGoldPrice (polling)
│   │   ├── pages/     Home, Products, ProductDetail, Login, Register
│   │   ├── store/     Zustand (cart, auth, UI, toast)
│   │   ├── types/     TypeScript interfaces
│   │   └── utils/     Formatting + price calculation
│   └── vite.config.ts (proxy /api → backend)
└── data/              Seed catalog (seed.json)
```

## Databases

| Database   | Purpose                                                  |
|------------|----------------------------------------------------------|
| PostgreSQL | Users, products, categories, orders, gold prices (ACID)  |
| MongoDB    | Price history time-series, product view analytics, audit |

## Authentication

- **JWT** via `djangorestframework-simplejwt`
- Separate sessions: **customer** (`/login`) vs **admin/staff** (`/panel/login`)
- Custom claims: `role`, `full_name`, `phone`, `panel`
- Phone-based login (custom user model, no username)

## Pricing Formula

```
gold_value   = weight_g × gold_price_18k
making_fee   = gold_value × fee_ratio
tax          = making_fee × 0.09
final_price  = gold_value + making_fee + stone_value + tax
```

Computed on both server (authoritative, for orders) and client (live display).

## Quick Start — new Windows machine (`D:\anil_website_cluade`)

Use **Git Bash**. SQLite works without Docker (recommended for a quick local setup).

### 0) Clone / update

```bash
# First time on this PC:
cd /d/
git clone https://github.com/radiarkazemi/anil_website_cluade.git
cd anil_website_cluade
git checkout cursor/anil-gold-product-site-9af9

# If the folder already exists:
cd /d/anil_website_cluade
git fetch origin
git checkout cursor/anil-gold-product-site-9af9
git pull origin cursor/anil-gold-product-site-9af9
```

### 1) Backend `:8000` (ASGI + live gold WebSocket)

**Recommended (fixes Pillow / missing tables in one go):**

```bash
cd /d/anil_website_cluade/backend
bash setup_local.sh
uvicorn config.asgi:application --host 0.0.0.0 --port 8000
```

**Manual steps:**

```bash
cd /d/anil_website_cluade/backend
python -m venv .venv
source .venv/Scripts/activate
pip install -r requirements.txt
# If ImageField errors appear later:  python -m pip install --upgrade Pillow
# Optional: copy .env.example → .env  (leave DATABASE_URL unset for SQLite)
python manage.py migrate
python manage.py seed
python manage.py seed_images
python manage.py seed_layout
python manage.py create_admin
# Prefer uvicorn on Windows (more reliable than Daphne + cryptography wheels)
uvicorn config.asgi:application --host 0.0.0.0 --port 8000
# Alternative: daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

> `seed_layout` loads the 9 jewelry categories with images, homepage layout (hero/logo), and pages **راهنمای خرید** + **بلاگ**.
>
> Use **uvicorn** or **Daphne** (not plain `runserver`) so `/ws/gold/` works for live Faraz prices.
>
> **DB out of date** (`no such table: store_sitesettings` / `no such column: …payment_gateway`):
> stop the server, then run `bash setup_local.sh` (or `migrate` + `seed_layout` after Pillow works).
> Nuclear reset (deletes local SQLite data):
> ```bash
> rm -f db.sqlite3
> bash setup_local.sh
> ```
>
> **Pillow missing** (`Cannot use ImageField because Pillow is not installed`):
> ```bash
> python -m pip install --upgrade Pillow
> python manage.py migrate
> python manage.py seed_layout
> ```
>
> **Windows fix** if Daphne crashes with `No module named '_cffi_backend'`:
> ```bash
> pip install --upgrade --force-reinstall cffi cryptography
> # then either retry daphne, or use uvicorn (recommended on Windows):
> uvicorn config.asgi:application --host 0.0.0.0 --port 8000
> ```

### 2) Frontend `:5180`

```bash
cd /d/anil_website_cluade/frontend
npm install
npm run dev
# → http://localhost:5180
```

| Service | URL |
|---------|-----|
| Shop | http://localhost:5180/ |
| Customer login | http://localhost:5180/login |
| **Admin login** | http://localhost:5180/panel/login |
| Admin panel | http://localhost:5180/panel |

Default admin: phone `09120000000` / password `anil-admin-2026`  
(Customer and admin logins are separate.)

Need Postgres/Mongo? See `DATABASE.md`.

## API Endpoints

```
Auth:
  POST /api/v1/auth/register/          Customer register + JWT
  POST /api/v1/auth/login/             Customer login (rejects staff/admin)
  POST /api/v1/auth/admin/login/       Ops panel login (staff/admin only)
  POST /api/v1/auth/token/refresh/     Refresh access token
  POST /api/v1/auth/logout/            Blacklist refresh token
  GET/PATCH /api/v1/auth/profile/      User profile

Store:
  GET  /api/v1/gold-price/             Current gold + market rates
  WS   /ws/gold/                       Live Faraz price stream
  GET  /api/v1/categories/             Category list
  GET  /api/v1/products/               Paginated, filterable, sortable
  GET  /api/v1/products/<slug>/        Product detail + breakdown
  GET  /api/v1/wishlist/               User wishlist
  POST /api/v1/wishlist/               Add to wishlist

Orders:
  POST /api/v1/orders/                 Create order (server-side pricing)
  GET  /api/v1/orders/mine/            User's orders
  GET  /api/v1/orders/<number>/        Order detail

Analytics (MongoDB):
  GET  /api/v1/analytics/price-history/    Gold price time-series
  POST /api/v1/analytics/product-view/     Log a product view
  GET  /api/v1/analytics/popular/          Popular products
```

## Deploy

### Backend

```bash
docker build -t anil-gold-api ./backend
docker run -p 8000:8000 \
  -e SECRET_KEY=... \
  -e DATABASE_URL=postgres://... \
  -e MONGODB_URI=mongodb://... \
  anil-gold-api
```

### Frontend

```bash
cd frontend && npm run build
# Serve dist/ with nginx, Vercel, Netlify, etc.
# Set VITE_API_URL to your backend URL
```

## Gold Price Updates

Live rates from **Faraz.io** (`abshodeNaghdi` → مثقال ۱۷ → گرم ۱۸ via `/ws/gold/`).

```bash
cd backend && python manage.py refresh_gold

GET  /api/v1/gold-price/          # latest (memory cache / DB)
GET  /api/v1/gold-price/live/     # fetch live + persist
POST /api/v1/gold-price/live/     # force live refresh
POST /api/v1/admin/gold-price/refresh/
WS   /ws/gold/                    # streamed quotes (Daphne)
```

See `backend/.env.example` for `FARAZ_BASE_URL`, `GOLD_POLL_SECONDS`, etc.
