# Frontend Integration & Design System (گالری طلا آنیل)

`Anil Gold Home.dc.html` is a **high-fidelity** working prototype. Recreate it faithfully (React/Next
recommended, RTL) OR keep the single file and replace only its mock data layer with API calls.
Either way, the visuals below are the spec — match them.

---

## 1. Design tokens

**Direction / language:** `dir="rtl"`, lang `fa`. Persian digits via `Number(x).toLocaleString('fa-IR')`.

**Colors**
| Token | Hex | Use |
|-------|-----|-----|
| Background | `#060606` | page base |
| Surface / panel top | `#0a0906` → `#100e0a` | cards, footer |
| Warm dark | `#1a1206`, `#0d0b07` | bands, announcement |
| Gold primary | `#d4af37` | buttons, key accents |
| Gold light | `#e8c976` | prices, highlights |
| Gold deep | `#c9a24b` | eyebrows, secondary |
| Gold gradient | `linear-gradient(100deg,#8a6a2f,#e8c976,#fff6d8,#caa24d,#8a6a2f)` | shimmer headlines, CTAs |
| Text primary | `#f5ede2` | headings/body |
| Text muted | `#a49a8b`, `#8a7f6a` | secondary |
| Up / positive | `#37d391` | price up, live dot |
| Down / negative | `#e0655f` | price down |
| Hairlines | `rgba(255,255,255,.06–.08)`, `rgba(212,175,55,.14–.22)` | borders |

**Typography**
- Farsi UI: **Vazirmatn** (weights 200–900). Body 14–17px, headings 800.
- Latin display ("ANIL", plate numbers): **Cormorant Garamond** (500–600), letter-spacing 5px for the wordmark.
- Hero H1 ≈ 60px/800; section H2 ≈ 28–32px/800; price numerals 800.

**Radius:** cards 16–24px · buttons/inputs 12px · pills 999px.
**Shadows:** gold glow `0 12px 30px rgba(212,175,55,.3)` on primary buttons.
**Max content width:** 1280px, 32px side padding.

**Motion (keyframes in the file):**
- `anil-spin3d` — 360° Y-rotation of the ring (9s / 6s reverse inner).
- `anil-shimmer` — moving gold gradient on headlines (5s).
- `anil-marquee` — infinite horizontal ticker (34s, translateX -50% on duplicated list).
- `anil-glow` — pulsing radial glow behind the ring.
- `anil-sweep` — light sheen sweeping across product images.
- `anil-slidein` / `anil-toast` — cart drawer + toast entrance.

---

## 2. Screens

### A. Homepage (`view = 'home'`)
Sticky header (logo → home, nav, live 18k-gold pill, search, cart w/ badge) · announcement bar ·
**Hero**: shimmer headline, two CTAs (→ products), trust stats, and a **draggable 360° gold ring**
(drag to rotate — `rotateX/rotateY` from pointer delta) · **live price ticker** marquee ·
**live market panel** (4 cards: طلای ۱۸، طلای ۲۴، سکه امامی، دلار — each with % change chip + a
12-bar mini sparkline built from recent history) · **categories** (6) · **featured products** (grid of 8) ·
**dynamic-pricing band** (shows the formula) · **new arrivals** (horizontal scroll) · custom-order CTA ·
trust badges · gold-price-alert signup · footer.

### B. Products listing (`view = 'products'`)
Breadcrumb · title (all or active category) · result count · **category filter chips** (همه + 6) ·
**sort `<select>`** (پیشنهادی / ارزان‌ترین / گران‌ترین / سنگین‌ترین) · responsive 4-col product grid.
Clicking a card image/name → product detail; the `+` button → add to cart (toast).

### C. Product detail (`view = 'product'`)
Left: large **draggable 360° viewer** + thumbnail row (نما ۱–۳ + فیلم). Right: category+tag chips,
name, description, big **live price** + "قیمت زنده" indicator, **price breakdown table**
(ارزش طلا / اجرت / سنگ / مالیات / قیمت نهایی), quantity stepper, add-to-cart, mini specs
(وزن/عیار/گارانتی), trust line. Below: **related products** (same category first).

### D. Cart drawer (overlay, any view)
Slides from the right (RTL). Line items with qty steppers + remove, **live subtotal**, checkout button,
and an empty state. Header cart badge shows total item count.

---

## 3. State model (mirror in your framework)

```
gold_price          # current 18k Toman/gram — from /api/gold-price/, polled on interval
market_rows[]       # ticker + panel values (+ % change, sparkline history)
view                # 'home' | 'products' | 'product'
filter, sort        # listing controls
current_product_id
cart {product_id: qty}
cart_open, toast, detail_qty
ring dragRx/dragRy  # 3D viewer rotation
```

All product prices are **derived**, never stored in cart state — recompute from `gold_price` on every
render so the cart total ticks live with the market.

---

## 4. Swapping mock data → real API

In the prototype, `Component` holds a `DEFS` array and a `jitter()` timer that fakes the market.
Replace with:

1. **Gold price:** `GET /api/gold-price/` every 10–30s → set `gold_price` + market rows.
   (Keep a short client-side history array per row to render the sparklines.)
2. **Catalog:** `GET /api/products/` and `GET /api/categories/` on load → replace `DEFS`.
   Each product already carries `price` + `breakdown` from the server for first paint; keep recomputing
   client-side on each gold-price tick using the **same formula** so display stays live between fetches:

   ```js
   const gold  = weight_g * gold_price;
   const fee   = gold * fee_ratio;
   const tax   = fee * 0.09;
   const price = Math.round(gold + fee + stone_value + tax);
   ```
3. **Filter/sort:** either client-side (small catalog) or pass through to the API query params.
4. **Checkout:** `POST /api/orders/` with `{full_name, phone, address, items:[{product_id, qty}]}`.
   Show the server-returned total (authoritative).

Keep every color, font, radius, animation, and layout identical to the prototype.

---

## 5. Assets to replace
All product/hero images in the prototype are **striped placeholders** labeled in monospace
(e.g. "انگشتر", "تصویر شاخص محصول"). Swap these for real `ProductImage` uploads from the backend.
The wordmark is text ("ANIL" + "GOLD & JEWELRY"); a logo file can be dropped in the header slot.
