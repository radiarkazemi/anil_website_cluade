import re

from rest_framework import serializers

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
    postal_code = serializers.CharField(max_length=10, required=False, allow_blank=True, default="")
    note = serializers.CharField(required=False, allow_blank=True, default="")
    items = OrderItemInputSerializer(many=True)

    def validate_phone(self, value):
        digits = re.sub(r"\D", "", value)
        if len(digits) < 10 or len(digits) > 15:
            raise serializers.ValidationError("شماره تماس معتبر نیست.")
        return value

    def validate_postal_code(self, value):
        # Optional — empty is fine; if provided, keep digits only
        digits = re.sub(r"\D", "", value or "")
        if digits and len(digits) not in (0, 10):
            raise serializers.ValidationError("کد پستی باید ۱۰ رقم باشد (یا خالی بگذارید).")
        return digits

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("سبد خرید خالی است.")
        return value

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        gold = GoldPrice.current()
        if not gold:
            raise serializers.ValidationError({"detail": "نرخ طلا تنظیم نشده است."})

        gp = gold.price_18k_per_gram
        product_ids = [i["product_id"] for i in items_data]
        products = {
            p.id: p
            for p in Product.objects.filter(id__in=product_ids, is_active=True).select_related("category")
        }
        missing = set(product_ids) - set(products.keys())
        if missing:
            raise serializers.ValidationError({"items": "یک یا چند محصول یافت نشد یا غیرفعال است."})

        user = self.context["request"].user if self.context["request"].user.is_authenticated else None

        order = Order.objects.create(
            user=user,
            full_name=validated_data["full_name"],
            phone=validated_data["phone"],
            email=validated_data.get("email", ""),
            address=validated_data["address"],
            city=validated_data.get("city", ""),
            postal_code=validated_data.get("postal_code", ""),
            note=validated_data.get("note", ""),
            gold_price_snapshot=gp,
        )

        subtotal = 0
        for item in items_data:
            product = products[item["product_id"]]
            bd = product.price_breakdown(gp)
            unit = bd["total"]
            OrderItem.objects.create(
                order=order,
                product=product,
                product_name=product.name,
                weight_g=product.weight_g,
                fee_ratio=product.fee_ratio,
                stone_value=product.stone_value,
                qty=item["qty"],
                unit_price=unit,
            )
            subtotal += unit * item["qty"]

        order.subtotal = subtotal
        order.total = subtotal + order.shipping_cost - order.discount
        order.save(update_fields=["subtotal", "total"])
        return order


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            "id", "product", "product_name", "weight_g", "fee_ratio",
            "stone_value", "qty", "unit_price", "line_total",
        ]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "full_name", "phone", "email",
            "address", "city", "postal_code", "status",
            "gold_price_snapshot", "subtotal", "shipping_cost", "discount", "total",
            "note", "tracking_code",
            "payment_gateway", "payment_authority", "payment_ref_id",
            "paid_at", "shipped_at", "delivered_at",
            "created_at", "items",
        ]
