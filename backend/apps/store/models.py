import uuid

from django.db import models
from django.utils import timezone
from django.utils.text import slugify


class GoldPrice(models.Model):
    """Immutable price snapshot — latest row is the source of truth."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    price_18k_per_gram = models.BigIntegerField(help_text="طلای ۱۸ عیار — تومان بر گرم")
    price_24k_per_gram = models.BigIntegerField(default=0)
    mesghal_17 = models.BigIntegerField(
        default=0,
        help_text="مثقال ۱۷ (آبشده نقدی فراز) — تومان",
    )
    coin_emami = models.BigIntegerField(default=0)
    coin_half = models.BigIntegerField(default=0)
    coin_quarter = models.BigIntegerField(default=0)
    usd_toman = models.BigIntegerField(default=0, help_text="Deprecated — always 0")
    ounce_usd = models.FloatField(default=0)
    source = models.CharField(max_length=40, default="manual", help_text="manual | faraz | api | admin")
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        verbose_name = "نرخ طلا"
        verbose_name_plural = "نرخ‌های طلا"
        ordering = ["-created_at"]
        get_latest_by = "created_at"

    def __str__(self):
        return f"۱۸ عیار: {self.price_18k_per_gram:,} — {self.created_at:%Y-%m-%d %H:%M}"

    @classmethod
    def current(cls):
        return cls.objects.order_by("-created_at").first()

    @property
    def mesghal(self):
        """مثقال ۱۷ — stored from Faraz when available, else reverse of گرم ۱۸ formula."""
        if self.mesghal_17:
            return int(self.mesghal_17)
        # Inverse: گرم۱۸ = (مثقال × 750 / 705) / 4.608
        return int(round(self.price_18k_per_gram * 4.608 * 705 / 750))


class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=80, unique=True, allow_unicode=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to="categories/", blank=True, null=True)
    order = models.PositiveIntegerField(default=0)
    display_count = models.PositiveIntegerField(default=0, help_text="عدد نمایشی روی کارت")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

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
    class Tag(models.TextChoices):
        NONE = "", "—"
        BESTSELLER = "پرفروش", "پرفروش"
        NEW = "جدید", "جدید"
        SPECIAL = "ویژه", "ویژه"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, db_index=True)
    slug = models.SlugField(max_length=200, unique=True, allow_unicode=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    weight_g = models.DecimalField(max_digits=8, decimal_places=2, help_text="وزن به گرم")
    karat = models.PositiveSmallIntegerField(default=18)
    fee_ratio = models.DecimalField(max_digits=5, decimal_places=3, default=0.200, help_text="اجرت — نسبت")
    stone_value = models.BigIntegerField(default=0, help_text="ارزش سنگ/نگین — تومان")
    tag = models.CharField(max_length=12, choices=Tag.choices, blank=True, default="")
    description = models.TextField(blank=True)
    placeholder_label = models.CharField(max_length=40, blank=True)
    sku = models.CharField(max_length=30, blank=True, unique=True, null=True)
    stock = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True, db_index=True)
    is_featured = models.BooleanField(default=False, db_index=True)
    meta_title = models.CharField(max_length=200, blank=True)
    meta_description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "محصول"
        verbose_name_plural = "محصولات"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name, allow_unicode=True)
        super().save(*args, **kwargs)

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

    @property
    def in_stock(self):
        return self.stock > 0


class ProductImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="products/")
    alt = models.CharField(max_length=200, blank=True)
    order = models.PositiveIntegerField(default=0)
    is_primary = models.BooleanField(default=False)

    class Meta:
        ordering = ["order"]
        verbose_name = "تصویر محصول"
        verbose_name_plural = "تصاویر محصول"

    def __str__(self):
        return f"{self.product.name} · #{self.order}"


class Wishlist(models.Model):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="wishlists")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="wishlisted_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "product")
        verbose_name = "علاقه‌مندی"
        verbose_name_plural = "علاقه‌مندی‌ها"


class SiteSettings(models.Model):
    """Singleton homepage/brand layout — editable from the ops panel."""

    brand_name = models.CharField(max_length=80, default="Anil")
    brand_tagline = models.CharField(max_length=120, default="درخششی ابدی")
    brand_logo = models.ImageField(upload_to="site/", blank=True, null=True)
    cart_label = models.CharField(max_length=40, default="گلد باکس")

    hero_badge = models.CharField(max_length=80, default="گالری طلا آنیل")
    hero_title = models.CharField(max_length=200, default="طلا،\nآن‌گونه که باید بدرخشد")
    hero_subtitle = models.TextField(
        default="مجموعه‌ای زنده از زیورآلات دست‌ساز، با قیمت‌گذاری لحظه‌ای بر پایه‌ی نرخ روز طلا."
    )
    hero_image = models.ImageField(upload_to="site/", blank=True, null=True)
    hero_mode = models.CharField(
        max_length=12,
        choices=[("image", "تصویر واقعی (پیش‌فرض)"), ("3d", "مدل ۳بعدی — فقط با کلیک کاربر")],
        default="image",
        help_text="هیرو همیشه با تصویر واقعی لود می‌شود؛ ۳بعدی فقط بعد از کلیک کاربر بارگذاری می‌شود",
    )
    hero_cta_primary = models.CharField(max_length=80, default="مشاهده‌ی محصولات")
    hero_cta_secondary = models.CharField(max_length=80, default="قیمت لحظه‌ای طلا")
    hero_cta_primary_url = models.CharField(max_length=200, default="/products")
    hero_cta_secondary_url = models.CharField(max_length=200, default="#market")

    show_rates = models.BooleanField(default=True)
    show_categories = models.BooleanField(default=True)
    show_featured = models.BooleanField(default=True)
    show_trust = models.BooleanField(default=True)
    section_order = models.JSONField(default=list, blank=True)

    trust_heading = models.CharField(max_length=80, default="چرا آنیل؟")
    footer_tagline = models.CharField(
        max_length=200,
        default="زیورآلات اصیل با قیمت شفاف و لحظه‌ای.",
        blank=True,
    )
    contact_phone = models.CharField(max_length=40, default="021-12345678", blank=True)
    contact_email = models.CharField(max_length=120, default="info@anilgold.ir", blank=True)
    contact_address = models.CharField(max_length=300, default="تهران، بازار بزرگ طلا", blank=True)

    top_banner = models.CharField(
        max_length=300,
        default="ارسال امن و بیمه‌شده به سراسر کشور · ضمانت اصالت و بازخرید · مشاوره‌ی رایگان تخصصی",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "تنظیمات چیدمان"
        verbose_name_plural = "تنظیمات چیدمان"

    def __str__(self):
        return "چیدمان فروشگاه"

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        if not obj.section_order:
            obj.section_order = ["hero", "rates", "categories", "featured", "trust"]
            obj.save(update_fields=["section_order"])
        return obj


class ContentPage(models.Model):
    class PageType(models.TextChoices):
        PAGE = "page", "صفحه"
        BLOG = "blog", "بلاگ"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True, allow_unicode=True)
    page_type = models.CharField(max_length=10, choices=PageType.choices, default=PageType.PAGE)
    excerpt = models.CharField(max_length=300, blank=True)
    body = models.TextField(help_text="متن صفحه — هر خط یک پاراگراف")
    cover = models.ImageField(upload_to="pages/", blank=True, null=True)
    is_published = models.BooleanField(default=True, db_index=True)
    show_in_nav = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "-created_at"]
        verbose_name = "صفحه محتوا"
        verbose_name_plural = "صفحات محتوا"

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title, allow_unicode=True)
        super().save(*args, **kwargs)
