# Backend Spec — Django + DRF (گالری طلا آنیل)

This describes a complete, admin-manageable backend. Adapt names as you like, but keep the
**pricing formula** and the **live-gold-price-as-source-of-truth** principle intact.

---

## 1. App layout

```
anil/                 # project
  settings.py         # add: rest_framework, corsheaders, store
  urls.py             # include store.urls under /api/
store/                # app
  models.py
  serializers.py
  views.py
  admin.py
  urls.py
  services/gold.py    # gold price refresh
  management/commands/seed.py
  management/commands/refresh_gold.py
```

Install: `django djangorestframework django-cors-headers pillow`.

---

## 2. Models (`store/models.py`)

```python
from django.db import models
from django.utils import timezone


class GoldPrice(models.Model):
    """Singleton-ish: the current live market rates. Source of truth for all pricing."""
    price_18k_per_gram = models.BigIntegerField(help_text="طلای ۱۸ عیار — تومان بر گرم")
    price_24k_per_gram = models.BigIntegerField(default=0)
    coin_emami         = models.BigIntegerField(default=0)  # سکه امامی
    coin_half          = models.BigIntegerField(default=0)  # نیم سکه
    coin_quarter       = models.BigIntegerField(default=0)  # ربع سکه
    usd_toman          = models.BigIntegerField(default=0)  # دلار
    ounce_usd          = models.FloatField(default=0)       # انس جهانی (USD)
    updated_at         = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = "نرخ طلا"
        verbose_name_plural = "نرخ‌های طلا"

    @classmethod
    def current(cls):
        return cls.objects.order_by("-updated_at").first()

    # mesghal = 4.3318 * per-gram (محاسبه‌شده، ذخیره نمی‌شود)
    @property
    def mesghal(self):
        return round(self.price_18k_per_gram * 4.3318)


class Category(models.Model):
    name  = models.CharField(max_length=80, unique=True)   # e.g. "انگشتر"
    slug  = models.SlugField(max_length=80, unique=True, allow_unicode=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "name"]
        verbose_name = "دسته‌بندی"; verbose_name_plural = "دسته‌بندی‌ها"

    def __str__(self): return self.name


class Product(models.Model):
    TAGS = [("", "—"), ("پرفروش", "پرفروش"), ("جدید", "جدید"), ("ویژه", "ویژه")]

    name        = models.CharField(max_length=140)
    category    = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    weight_g    = models.DecimalField(max_digits=8, decimal_places=2, help_text="وزن به گرم")
    karat       = models.PositiveSmallIntegerField(default=18)
    fee_ratio   = models.DecimalField(max_digits=4, decimal_places=2, default=0.20,
                                      help_text="اجرت — نسبت (0.22 = ۲۲٪)")
    stone_value = models.BigIntegerField(default=0, help_text="ارزش سنگ/نگین — تومان")
    tag         = models.CharField(max_length=12, choices=TAGS, blank=True, default="")
    description = models.TextField(blank=True)
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "محصول"; verbose_name_plural = "محصولات"

    def __str__(self): return self.name

    # ---- authoritative pricing (mirrors the frontend formula) ----
    def price_breakdown(self, gp=None):
        gp = gp or (GoldPrice.current().price_18k_per_gram if GoldPrice.current() else 0)
        gold   = float(self.weight_g) * gp
        fee    = gold * float(self.fee_ratio)
        tax    = fee * 0.09
        total  = gold + fee + float(self.stone_value) + tax
        return {"gold": round(gold), "fee": round(fee), "stone": self.stone_value,
                "tax": round(tax), "total": round(total)}

    @property
    def price(self):
        return self.price_breakdown()["total"]


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image   = models.ImageField(upload_to="products/")
    alt     = models.CharField(max_length=140, blank=True)
    order   = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]
        verbose_name = "تصویر محصول"; verbose_name_plural = "تصاویر محصول"


class Order(models.Model):
    STATUS = [("pending", "در انتظار پرداخت"), ("paid", "پرداخت‌شده"),
              ("shipped", "ارسال‌شده"), ("cancelled", "لغوشده")]
    full_name    = models.CharField(max_length=140)
    phone        = models.CharField(max_length=20)
    address      = models.TextField(blank=True)
    status       = models.CharField(max_length=12, choices=STATUS, default="pending")
    gold_price   = models.BigIntegerField(help_text="نرخ طلا در لحظه‌ی ثبت سفارش")
    total        = models.BigIntegerField(default=0)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "سفارش"; verbose_name_plural = "سفارش‌ها"


class OrderItem(models.Model):
    order      = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product    = models.ForeignKey(Product, on_delete=models.PROTECT)
    qty        = models.PositiveIntegerField(default=1)
    unit_price = models.BigIntegerField()  # snapshot of price at order time
```

---

## 3. Serializers (`store/serializers.py`)

`ProductSerializer` must return the **live** price + breakdown so the client can render immediately,
while still fetching the gold price separately for the interval-based live re-pricing.

```python
from rest_framework import serializers
from .models import Product, ProductImage, Category, GoldPrice, Order, OrderItem

class ProductImageSerializer(serializers.ModelSerializer):
    class Meta: model = ProductImage; fields = ["id", "image", "alt", "order"]

class ProductSerializer(serializers.ModelSerializer):
    images    = ProductImageSerializer(many=True, read_only=True)
    category  = serializers.CharField(source="category.name", read_only=True)
    price     = serializers.SerializerMethodField()
    breakdown = serializers.SerializerMethodField()
    class Meta:
        model = Product
        fields = ["id","name","category","weight_g","karat","fee_ratio",
                  "stone_value","tag","description","images","price","breakdown"]
    def get_price(self, o):     return o.price_breakdown()["total"]
    def get_breakdown(self, o): return o.price_breakdown()

class CategorySerializer(serializers.ModelSerializer):
    count = serializers.IntegerField(source="products.count", read_only=True)
    class Meta: model = Category; fields = ["id","name","slug","order","count"]

class GoldPriceSerializer(serializers.ModelSerializer):
    mesghal = serializers.IntegerField(read_only=True)
    class Meta:
        model = GoldPrice
        fields = ["price_18k_per_gram","price_24k_per_gram","mesghal","coin_emami",
                  "coin_half","coin_quarter","usd_toman","ounce_usd","updated_at"]
```

Orders: accept `[{product_id, qty}]`, **recompute price server-side** from the current gold price
(never trust a price sent by the client), snapshot `unit_price`, store `gold_price` + `total`.

---

## 4. Views / URLs

Read-only viewsets for catalog + a custom order create endpoint:

```
GET  /api/gold-price/            -> current GoldPrice (frontend polls this every ~10–30s)
GET  /api/categories/            -> list with product counts
GET  /api/products/              -> list (filters: ?category=<slug>&ordering=price|-price|-weight_g&tag=)
GET  /api/products/<id>/         -> detail (with images + breakdown)
POST /api/orders/                -> create order  {full_name, phone, address, items:[{product_id, qty}]}
```

Use `DjangoFilterBackend` + `OrderingFilter`. Map the design's sort options:
`ارزان‌ترین → ordering=price`, `گران‌ترین → -price`, `سنگین‌ترین → -weight_g`.
(Note: `price` isn't a DB column — either annotate an approximate ordering or sort in Python for small
catalogs; for large catalogs store a denormalized `cached_price` refreshed whenever gold price changes.)

CORS: allow the storefront origin via `django-cors-headers`.

---

## 5. Django Admin (`store/admin.py`) — the "manage everything" requirement

```python
from django.contrib import admin
from .models import *

class ProductImageInline(admin.TabularInline):
    model = ProductImage; extra = 3

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name","category","weight_g","fee_ratio","tag","live_price","is_active")
    list_filter  = ("category","tag","is_active")
    search_fields = ("name",)
    inlines = [ProductImageInline]
    @admin.display(description="قیمت زنده")
    def live_price(self, o): return f"{o.price:,} تومان"

@admin.register(GoldPrice)
class GoldPriceAdmin(admin.ModelAdmin):
    list_display = ("price_18k_per_gram","coin_emami","usd_toman","updated_at")

admin.site.register(Category)
admin.site.register(Order)
admin.site.register(OrderItem)
admin.site.site_header = "مدیریت گالری طلا آنیل"
```

Set `LANGUAGE_CODE = "fa"` and `USE_L10N = True`; the admin renders RTL automatically.
Everything the owner needs — products, photos (drag multiple per product), categories, texts,
making-fees, tags, and the gold price — is editable here with no code.

---

## 6. Gold price source (`store/services/gold.py`)

The design updates the gold price on an interval to feel "live". In production, refresh a real rate:

```python
def refresh_gold_price():
    """Fetch from your chosen provider (a market API, or manual owner entry) and store a new GoldPrice row."""
    # data = requests.get(PROVIDER_URL, ...).json()
    # GoldPrice.objects.create(price_18k_per_gram=..., coin_emami=..., usd_toman=..., ...)
    ...
```

Run it via a management command on a schedule (cron / Celery beat), e.g. every 1–5 minutes.
If no live provider is available, the owner simply edits `GoldPrice` in the admin and the whole
catalog re-prices instantly. Frontend polling of `/api/gold-price/` keeps displayed prices fresh.

---

## 7. Security notes

- Orders: recompute totals on the server from the live gold price; the client price is display-only.
- Rate-limit `/api/orders/`; validate phone.
- Product images: validate content-type/size on upload.
