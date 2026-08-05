import uuid

from django.conf import settings
from django.db import models

from apps.store.models import GoldPrice, Product


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "در انتظار پرداخت"
        PAID = "paid", "پرداخت‌شده"
        PROCESSING = "processing", "در حال پردازش"
        SHIPPED = "shipped", "ارسال‌شده"
        DELIVERED = "delivered", "تحویل‌شده"
        CANCELLED = "cancelled", "لغوشده"
        REFUNDED = "refunded", "مرجوع‌شده"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=20, unique=True, editable=False, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    address = models.TextField()
    city = models.CharField(max_length=80, blank=True)
    postal_code = models.CharField(max_length=10, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    gold_price_snapshot = models.BigIntegerField(help_text="نرخ ۱۸ عیار در لحظه ثبت")
    subtotal = models.BigIntegerField(default=0)
    shipping_cost = models.BigIntegerField(default=0)
    discount = models.BigIntegerField(default=0)
    total = models.BigIntegerField(default=0)
    note = models.TextField(blank=True)
    tracking_code = models.CharField(max_length=50, blank=True)
    # Iranian payment gateways
    payment_gateway = models.CharField(
        max_length=20,
        blank=True,
        default="",
        help_text="zarinpal | idpay | …",
    )
    payment_authority = models.CharField(max_length=80, blank=True, db_index=True)
    payment_ref_id = models.CharField(max_length=80, blank=True)
    payment_raw = models.JSONField(default=dict, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    shipped_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "سفارش"
        verbose_name_plural = "سفارش‌ها"
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["phone", "-created_at"]),
        ]

    def __str__(self):
        return f"سفارش {self.order_number} — {self.full_name}"

    def save(self, *args, **kwargs):
        if not self.order_number:
            last = Order.objects.order_by("-created_at").first()
            num = 1001 if not last or not last.order_number else int(last.order_number.replace("AG-", "")) + 1
            self.order_number = f"AG-{num}"
        super().save(*args, **kwargs)


class OrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    product_name = models.CharField(max_length=200)
    weight_g = models.DecimalField(max_digits=8, decimal_places=2)
    fee_ratio = models.DecimalField(max_digits=5, decimal_places=3)
    stone_value = models.BigIntegerField(default=0)
    qty = models.PositiveIntegerField(default=1)
    unit_price = models.BigIntegerField()

    class Meta:
        verbose_name = "قلم سفارش"
        verbose_name_plural = "اقلام سفارش"

    def __str__(self):
        return f"{self.product_name} × {self.qty}"

    @property
    def line_total(self):
        return self.unit_price * self.qty
