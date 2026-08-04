# گالری طلا آنیل — Anil Gold

Persian (Farsi, RTL) e-commerce storefront for **گالری طلا آنیل**, with live gold-based dynamic pricing, Django admin, and a production-ready API.

## Features

- Live 18k gold price as the single source of truth — whole catalog re-prices automatically
- Product catalog, categories, cart, and checkout (orders)
- Django Admin (RTL) to manage products, photos, fees, tags, and gold rates
- Storefront UI preserved from the design prototype, wired to the real API
- Deployable with Gunicorn + WhiteNoise (SQLite for simple hosting, Postgres optional)

## Pricing formula

```
gold_value   = weight_g × gold_price_18k
making_fee   = gold_value × fee_ratio
tax          = making_fee × 0.09
final_price  = gold_value + making_fee + stone_value + tax
```

## Quick start

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
python manage.py migrate
python manage.py seed
python manage.py createsuperuser   # for /admin/
python manage.py runserver
```

Open:

| URL | Purpose |
|-----|---------|
| http://127.0.0.1:8000/ | Storefront |
| http://127.0.0.1:8000/admin/ | Owner admin panel |
| http://127.0.0.1:8000/api/products/ | Catalog API |
| http://127.0.0.1:8000/api/gold-price/ | Live gold rates |

## API

```
GET  /api/gold-price/
GET  /api/categories/
GET  /api/products/              ?category=&ordering=price|-price|-weight_g&tag=
GET  /api/products/<id>/
POST /api/orders/                {full_name, phone, address, items:[{product_id, qty}]}
GET  /api/health/
```

Order totals are always recomputed on the server from the current gold price.

## Gold price updates

- Edit rates anytime in **Admin → نرخ طلا**
- Or run on a schedule: `python manage.py refresh_gold`
- Optional live provider: set `GOLD_PROVIDER_URL` in `.env`

## Deploy

**Docker**

```bash
docker build -t anil-gold .
docker run -p 8000:8000 -e SECRET_KEY=... -e DEBUG=False -e ALLOWED_HOSTS=your.domain anil-gold
```

**Platform (Render / Railway / Fly)**

1. Set env vars from `.env.example` (`SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`)
2. Build command: `pip install -r requirements.txt && python manage.py collectstatic --noinput`
3. Start command: `gunicorn anil.wsgi:application --bind 0.0.0.0:$PORT`
4. Release: `python manage.py migrate && python manage.py seed`

For Postgres, set `DATABASE_URL=postgres://user:pass@host:5432/dbname`.

## Project layout

```
anil/                 Django project settings
store/                Models, API, admin, storefront template
static/               support.js runtime + logo
data/seed.json        Catalog seed data
manage.py
```

## Owner workflow

1. Log into `/admin/`
2. Update **نرخ طلا** when the market moves (or automate with `refresh_gold`)
3. Add/edit products, upload photos, set اجرت (`fee_ratio`) and سنگ
4. Fulfill orders from **سفارش‌ها**
