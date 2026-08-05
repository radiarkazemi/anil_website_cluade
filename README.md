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
- Access token (30min) + refresh token (7 days) with rotation & blacklist
- Custom claims: `role`, `full_name`, `phone`
- Phone-based login (custom user model, no username)

## Pricing Formula

```
gold_value   = weight_g × gold_price_18k
making_fee   = gold_value × fee_ratio
tax          = making_fee × 0.09
final_price  = gold_value + making_fee + stone_value + tax
```

Computed on both server (authoritative, for orders) and client (live display).

## API Endpoints

```
Auth:
  POST /api/v1/auth/register/          Register + auto-login (returns JWT)
  POST /api/v1/auth/login/             Phone + password → JWT pair
  POST /api/v1/auth/token/refresh/     Refresh access token
  POST /api/v1/auth/logout/            Blacklist refresh token
  GET/PATCH /api/v1/auth/profile/      User profile

Store:
  GET  /api/v1/gold-price/             Current gold + market rates
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

## Quick Start (two terminals — different ports)

| Service  | Port | URL |
|----------|------|-----|
| Backend (Django API) | **8000** | http://127.0.0.1:8000/api/v1/ |
| Frontend (Vite React) | **5173** | http://localhost:5173/ |

### Terminal 1 — Backend `:8000`

```bash
cd backend
source .venv/Scripts/activate   # Windows Git Bash; use .venv/bin/activate on Linux/macOS
python manage.py migrate
python manage.py seed
python manage.py seed_images
python manage.py create_admin
python manage.py runserver 8000
```

### Terminal 2 — Frontend `:5173`

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173  (proxies /api and /media → backend :8000)
```

Open the **frontend** URL to see the shop (fonts, theme, catalog). Do not open only the backend port for the UI.

### Admin panel (custom)

- Login: http://localhost:5173/login — phone `09120000000` / password `anil-admin-2026`
- Panel: http://localhost:5173/panel

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

- Edit in Admin → نرخ‌های طلا
- Or schedule: `python manage.py refresh_gold`
- Or set `GOLD_PROVIDER_URL` for a live API
