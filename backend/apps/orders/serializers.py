import re

from rest_framework import serializers

from apps.store.estimates import deposit_amount_for, estimated_weight_g
from apps.store.models import GoldPrice, Product

from .models import Order, OrderItem


class OrderItemInputSerializer(serializers.Serializer):
    product_id = serializers.UUIDField()
    qty = serializers.IntegerField(min_value=1, max_value=99)


class OrderCreateSerializer(serializers.Serializer):
    full_name = serializers.CharField(
        max_length=150,
        error_messages={"blank": "نام و نام خانوادگی الزامی است.", "required": "نام و نام خانوادگی الزامی است."},
    )
    phone = serializers.CharField(
        max_length=20,
        error_messages={"blank": "شماره موبایل الزامی است.", "required": "شماره موبایل الزامی است."},
    )
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    address = serializers.CharField(
        error_messages={"blank": "آدرس ارسال الزامی است.", "required": "آدرس ارسال الزامی است."},
    )
    city = serializers.CharField(max_length=80, required=False, allow_blank=True, default="")
    postal_code = serializers.CharField(
        max_length=10,
        required=False,
        allow_blank=True,
        allow_null=True,
        default="",
        error_messages={
            "blank": "کد پستی اختیاری است؛ خالی بگذارید یا ۱۰ رقم وارد کنید.",
            "null": "کد پستی اختیاری است.",
            "max_length": "کد پستی حداکثر ۱۰ رقم است.",
        },
    )
    note = serializers.CharField(required=False, allow_blank=True, default="")
    order_kind = serializers.ChoiceField(
        choices=Order.Kind.choices,
        required=False,
        default=Order.Kind.FULL,
    )
    items = OrderItemInputSerializer(many=True)

    def validate_phone(self, value):
        digits = re.sub(r"\D", "", value)
        if len(digits) < 10 or len(digits) > 15:
            raise serializers.ValidationError("شماره تماس معتبر نیست.")
        return value

    def validate_postal_code(self, value):
        # Optional — empty / null is fine; if provided, keep digits only
        if value is None:
            return ""
        digits = re.sub(r"\D", "", str(value))
        if not digits:
            return ""
        if len(digits) != 10:
            raise serializers.ValidationError("کد پستی باید ۱۰ رقم باشد (یا خالی بگذارید).")
        return digits

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("سبد خرید خالی است.")
        return value

    def create(self, validated_data):
        from django.db import transaction

        items_data = validated_data.pop("items")
        order_kind = validated_data.pop("order_kind", Order.Kind.FULL) or Order.Kind.FULL
        gold = GoldPrice.current()
        if not gold:
            raise serializers.ValidationError({"detail": "نرخ طلا تنظیم نشده است."})

        gp = gold.price_18k_per_gram
        product_ids = [i["product_id"] for i in items_data]
        user = self.context["request"].user if self.context["request"].user.is_authenticated else None

        with transaction.atomic():
            products = {
                p.id: p
                for p in Product.objects.select_for_update().filter(
                    id__in=product_ids, is_active=True
                ).select_related("category")
            }
            missing = set(product_ids) - set(products.keys())
            if missing:
                raise serializers.ValidationError({"items": "یک یا چند محصول یافت نشد یا غیرفعال است."})

            is_deposit = order_kind == Order.Kind.DEPOSIT

            for item in items_data:
                product = products[item["product_id"]]
                if is_deposit:
                    if product.has_weight:
                        raise serializers.ValidationError(
                            {
                                "items": (
                                    f"«{product.name}» وزن تأییدشده دارد؛ "
                                    "برای خرید کامل از سبد عادی استفاده کنید."
                                )
                            }
                        )
                else:
                    if not product.has_weight:
                        raise serializers.ValidationError(
                            {
                                "items": (
                                    f"«{product.name}» ناموجود است اما قابل سفارش با بیعانه — "
                                    "لطفاً رزرو با بیعانه را انتخاب کنید."
                                )
                            }
                        )
                    if product.stock is not None and product.stock < item["qty"]:
                        raise serializers.ValidationError(
                            {"items": f"موجودی «{product.name}» کافی نیست."}
                        )

            note = validated_data.get("note", "") or ""
            if is_deposit:
                reserve_note = "رزرو با بیعانه — قطعه ناموجود؛ تهیه بر اساس وزن تقریبی مدل‌های مشابه."
                note = f"{note}\n{reserve_note}".strip() if note else reserve_note

            order = Order.objects.create(
                user=user,
                full_name=validated_data["full_name"],
                phone=validated_data["phone"],
                email=validated_data.get("email", ""),
                address=validated_data["address"],
                city=validated_data.get("city", ""),
                postal_code=validated_data.get("postal_code", ""),
                note=note,
                gold_price_snapshot=gp,
                order_kind=order_kind,
            )

            subtotal = 0
            for item in items_data:
                product = products[item["product_id"]]
                if is_deposit:
                    est = estimated_weight_g(product)
                    unit = deposit_amount_for(product, gp)
                    weight_is_estimated = True
                    weight_g = est
                else:
                    bd = product.price_breakdown(gp)
                    unit = bd["total"]
                    if unit is None:
                        raise serializers.ValidationError(
                            {"items": f"قیمت «{product.name}» قابل محاسبه نیست."}
                        )
                    weight_is_estimated = False
                    weight_g = product.weight_g

                OrderItem.objects.create(
                    order=order,
                    product=product,
                    product_name=product.name,
                    weight_g=weight_g,
                    weight_is_estimated=weight_is_estimated,
                    fee_ratio=product.fee_ratio,
                    stone_value=product.stone_value,
                    qty=item["qty"],
                    unit_price=unit,
                )
                # Only decrement physical stock for confirmed in-stock purchases
                if not is_deposit and product.stock is not None:
                    product.stock = max(0, product.stock - item["qty"])
                    product.save(update_fields=["stock"])
                subtotal += unit * item["qty"]

            order.subtotal = subtotal
            order.total = subtotal + order.shipping_cost - order.discount
            order.save(update_fields=["subtotal", "total"])
            return order


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            "id", "product", "product_name", "weight_g", "weight_is_estimated",
            "fee_ratio", "stone_value", "qty", "unit_price", "line_total",
        ]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "full_name", "phone", "email",
            "address", "city", "postal_code", "status", "order_kind",
            "gold_price_snapshot", "subtotal", "shipping_cost", "discount", "total",
            "note", "tracking_code",
            "payment_gateway", "payment_authority", "payment_ref_id",
            "paid_at", "shipped_at", "delivered_at",
            "created_at", "items",
        ]
