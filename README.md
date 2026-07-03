# گالری طلا آنیل — Anil Gold Gallery · Project Handoff

> **How to use this package:** Upload this whole folder into a Claude Project (claude.ai). It is
> self-sufficient. Claude should read `README.md` first, then `BACKEND_SPEC_DJANGO.md`,
> then `FRONTEND_INTEGRATION.md`. `Anil Gold Home.dc.html` is the **design reference**, and
> `data/seed.json` is the exact catalog + market data the design uses.

---

## 1. What this is

A Persian (Farsi, RTL) e-commerce storefront for a gold & jewelry shop, **گالری طلا آنیل**.
The signature feature is **live, dynamic pricing**: every product's price is computed in real time
from the current gold spot price, so nothing has to be re-priced by hand.

The bundled front-end (`Anil Gold Home.dc.html`) is a **working design prototype** built in HTML/JS.
It demonstrates the intended look, motion, and behavior with mock data. It is **not** the production
codebase — the task is to build a **real Django REST backend + admin panel**, then serve/consume the
same UI against real data.

## 2. Goal / definition of done

1. **Django + Django REST Framework backend** exposing the catalog, categories, live gold price, and orders.
2. **Django Admin** so the shop owner can manage *everything* — products, photos, categories, texts,
   making-fees, tags, and the gold price — with no code.
3. The storefront UI (recreated from the design, or served as-is and pointed at the API) fetches the
   **live gold price** on an interval and recomputes all prices client-side using the exact formula below.
4. Cart + checkout + order creation.
5. Easy to deploy and publish (standard Django project, Postgres or SQLite, env-based config).

## 3. Tech expectations

- **Backend:** Python 3.12+, Django 5.x, Django REST Framework, `django-cors-headers`.
- **DB:** SQLite for dev, Postgres for production.
- **Media:** Django `ImageField` for product photos (served via `MEDIA_URL`; use S3/whatever in prod).
- **Frontend:** you may (a) recreate the design in React/Next.js consuming the API, or
  (b) keep the existing single-file UI and replace its mock data layer with `fetch()` calls.
  Either way, **preserve the visual design exactly** — see `FRONTEND_INTEGRATION.md`.
- **Language/RTL:** all UI is Farsi, `dir="rtl"`. Numbers display with Persian digits (`toLocaleString('fa-IR')`).
- **Currency:** Iranian Toman (تومان).

## 4. The pricing model (most important part)

Every product stores a **weight (grams)**, a **making-fee ratio** (اجرت, e.g. 0.22 = 22%), and an
optional **stone value** (سنگ, fixed Toman). Given the live 18k gold price per gram `gp`:

```
gold_value   = weight * gp
making_fee   = gold_value * fee_ratio
tax          = making_fee * 0.09          # 9% VAT on the making-fee (مالیات بر ارزش افزوده)
final_price  = gold_value + making_fee + stone_value + tax
```

This formula lives in BOTH the backend (authoritative, for orders) and the frontend (for live display).
**The gold price is the single source of truth** — change it once and the whole catalog re-prices.

## 5. What's in this folder

| File | Purpose |
|------|---------|
| `README.md` | This brief. |
| `BACKEND_SPEC_DJANGO.md` | Data models, DRF endpoints, admin config, gold-price service. |
| `FRONTEND_INTEGRATION.md` | Design system tokens, screens, interactions, and how to swap mock→API. |
| `Anil Gold Home.dc.html` | The working design prototype (homepage + product list + product detail + cart). |
| `data/seed.json` | Exact product catalog, categories, and market rows used in the design. |

## 6. Product catalog scope

Categories (دسته‌بندی): انگشتر · گردنبند و زنجیر · دستبند و النگو · گوشواره · سکه و شمش · ست کامل.
Market rows shown in the live ticker: طلای ۱۸ عیار، طلای ۲۴ عیار، مثقال طلا، سکه امامی، نیم سکه،
ربع سکه، دلار، انس جهانی. See `data/seed.json` for exact values.

## 7. Suggested build order

1. Scaffold Django project + app `store`, models from the spec, migrations.
2. Seed the DB from `data/seed.json` (write a management command `seed`).
3. DRF serializers + viewsets + URLs. Verify `/api/products/` returns live-priced items.
4. Configure Django Admin for full content management (image uploads, inline gallery, gold-price editor).
5. Gold-price source: a `GoldPrice` singleton + a management command / Celery task to refresh it.
6. Wire the frontend to the API (`FRONTEND_INTEGRATION.md`), keeping the design identical.
7. Cart → checkout → `Order` creation with server-side price recomputation (never trust client prices).
8. Deploy.
