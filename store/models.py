from django.db import models
from django.utils import timezone
from django.utils.text import slugify


class GoldPrice(models.Model):
    """Current live market rates — source of truth for all product pricing."""

    price_18k_per_gram = models.BigIntegerField(help_text="طلای ۱۸ عیار — تومان بر گرم")
    price_24k_per_gram = models.BigIntegerField(default=0)
    coin_emami = models.BigIntegerField(default=0)
    coin_half = models.BigIntegerField(default=0)
    coin_quarter = models.BigIntegerField(default=0)
    usd_toman = models.BigIntegerField(default=0)
    ounce_usd = models.FloatField(default=0)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = "نرخ طلا"
        verbose_name_plural = "نرخ‌های طلا"
        ordering = ["-updated_at"]

    def __str__(self):
        return f"۱۸ عیار: {self.price_18k_per_gram:,} — {self.updated_at:%Y-%m-%d %H:%M}"

    @classmethod
    def current(cls):
        return cls.objects.order_by("-updated_at").first()

    @property
    def mesghal(self):
        return round(self.price_18k_per_gram * 4.3318)


class Category(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=80, unique=True, allow_unicode=True)
    order = models.PositiveIntegerField(default=0)
    display_count = models.PositiveIntegerField(
        default=0,
        help_text="عدد نمایشی روی کارت دسته در صفحه اصلی (اختیاری)",
    )

    class Meta:
        ordering = ["order", "name"]
        verbose_name = "دسته‌بندی"
        verbose_name_plural = "دسته‌بندی‌ها"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name, allow_unicode=True)
        super().save(*args, **kwargs)


class Product(models.Model):
    TAGS = [
        ("", "—"),
        ("پرفروش", "پرفروش"),
        ("جدید", "جدید"),
        ("ویژه", "ویژه"),
    ]

    name = models.CharField(max_length=140)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    weight_g = models.DecimalField(max_digits=8, decimal_places=2, help_text="وزن به گرم")
    karat = models.PositiveSmallIntegerField(default=18)
    fee_ratio = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=0.20,
        help_text="اجرت — نسبت (0.22 = ۲۲٪)",
    )
    stone_value = models.BigIntegerField(default=0, help_text="ارزش سنگ/نگین — تومان")
    tag = models.CharField(max_length=12, choices=TAGS, blank=True, default="")
    description = models.TextField(blank=True)
    placeholder_label = models.CharField(
        max_length=40,
        blank=True,
        help_text="برچسب تصویر جایگزین وقتی عکسی آپلود نشده",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "محصول"
        verbose_name_plural = "محصولات"

    def __str__(self):
        return self.name

    def price_breakdown(self, gp=None):
        if gp is None:
            current = GoldPrice.current()
            gp = current.price_18k_per_gram if current else 0
        gold = float(self.weight_g) * float(gp)
        fee = gold * float(self.fee_ratio)
        tax = fee * 0.09
        total = gold + fee + float(self.stone_value) + tax
        return {
            "gold": round(gold),
            "fee": round(fee),
            "stone": int(self.stone_value),
            "tax": round(tax),
            "total": round(total),
        }

    @property
    def price(self):
        return self.price_breakdown()["total"]


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="products/")
    alt = models.CharField(max_length=140, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]
        verbose_name = "تصویر محصول"
        verbose_name_plural = "تصاویر محصول"

    def __str__(self):
        return f"{self.product.name} · #{self.order}"


class Order(models.Model):
    STATUS = [
        ("pending", "در انتظار پرداخت"),
        ("paid", "پرداخت‌شده"),
        ("shipped", "ارسال‌شده"),
        ("cancelled", "لغوشده"),
    ]

    full_name = models.CharField(max_length=140)
    phone = models.CharField(max_length=20)
    address = models.TextField(blank=True)
    status = models.CharField(max_length=12, choices=STATUS, default="pending")
    gold_price = models.BigIntegerField(help_text="نرخ طلا در لحظه‌ی ثبت سفارش")
    total = models.BigIntegerField(default=0)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "سفارش"
        verbose_name_plural = "سفارش‌ها"

    def __str__(self):
        return f"سفارش #{self.pk} — {self.full_name}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    qty = models.PositiveIntegerField(default=1)
    unit_price = models.BigIntegerField()

    class Meta:
        verbose_name = "قلم سفارش"
        verbose_name_plural = "اقلام سفارش"

    def __str__(self):
        return f"{self.product.name} × {self.qty}"

    @property
    def line_total(self):
        return self.unit_price * self.qty
