import re

from rest_framework import serializers

from .models import Category, GoldPrice, Order, OrderItem, Product, ProductImage


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "image", "alt", "order"]


class ProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    category = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    price = serializers.SerializerMethodField()
    breakdown = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "category",
            "category_slug",
            "weight_g",
            "karat",
            "fee_ratio",
            "stone_value",
            "tag",
            "description",
            "placeholder_label",
            "images",
            "price",
            "breakdown",
        ]

    def get_price(self, obj):
        return obj.price_breakdown()["total"]

    def get_breakdown(self, obj):
        return obj.price_breakdown()


class CategorySerializer(serializers.ModelSerializer):
    count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "order", "count", "display_count"]

    def get_count(self, obj):
        return obj.products.filter(is_active=True).count()


class GoldPriceSerializer(serializers.ModelSerializer):
    mesghal = serializers.IntegerField(read_only=True)
    market_rows = serializers.SerializerMethodField()

    class Meta:
        model = GoldPrice
        fields = [
            "price_18k_per_gram",
            "price_24k_per_gram",
            "mesghal",
            "coin_emami",
            "coin_half",
            "coin_quarter",
            "usd_toman",
            "ounce_usd",
            "updated_at",
            "market_rows",
        ]

    def get_market_rows(self, obj):
        return [
            {"key": "g18", "label": "طلای ۱۸ عیار", "v": obj.price_18k_per_gram, "unit": "هر گرم · تومان", "dollar": False},
            {"key": "g24", "label": "طلای ۲۴ عیار", "v": obj.price_24k_per_gram, "unit": "هر گرم · تومان", "dollar": False},
            {"key": "mes", "label": "مثقال طلا", "v": obj.mesghal, "unit": "تومان", "dollar": False},
            {"key": "sek", "label": "سکه امامی", "v": obj.coin_emami, "unit": "تومان", "dollar": False},
            {"key": "nim", "label": "نیم سکه", "v": obj.coin_half, "unit": "تومان", "dollar": False},
            {"key": "rob", "label": "ربع سکه", "v": obj.coin_quarter, "unit": "تومان", "dollar": False},
            {"key": "usd", "label": "دلار", "v": obj.usd_toman, "unit": "تومان", "dollar": False},
            {"key": "ons", "label": "انس جهانی", "v": obj.ounce_usd, "unit": "دلار", "dollar": True},
        ]


class OrderItemInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    qty = serializers.IntegerField(min_value=1, max_value=99)


class OrderCreateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=140)
    phone = serializers.CharField(max_length=20)
    address = serializers.CharField(required=False, allow_blank=True, default="")
    note = serializers.CharField(required=False, allow_blank=True, default="")
    items = OrderItemInputSerializer(many=True)

    def validate_phone(self, value):
        digits = re.sub(r"\D", "", value)
        if len(digits) < 10 or len(digits) > 15:
            raise serializers.ValidationError("شماره تماس معتبر نیست.")
        return value

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("سبد خرید خالی است.")
        return value

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        gold = GoldPrice.current()
        if not gold:
            raise serializers.ValidationError("نرخ طلا تنظیم نشده است.")

        gp = gold.price_18k_per_gram
        product_ids = [i["product_id"] for i in items_data]
        products = {
            p.id: p
            for p in Product.objects.filter(id__in=product_ids, is_active=True).select_related("category")
        }
        if len(products) != len(set(product_ids)):
            raise serializers.ValidationError("یکی از محصولات یافت نشد یا غیرفعال است.")

        order = Order.objects.create(
            full_name=validated_data["full_name"],
            phone=validated_data["phone"],
            address=validated_data.get("address", ""),
            note=validated_data.get("note", ""),
            gold_price=gp,
            total=0,
        )
        total = 0
        for item in items_data:
            product = products[item["product_id"]]
            unit = product.price_breakdown(gp)["total"]
            qty = item["qty"]
            OrderItem.objects.create(order=order, product=product, qty=qty, unit_price=unit)
            total += unit * qty
        order.total = total
        order.save(update_fields=["total"])
        return order


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = OrderItem
        fields = ["product", "product_name", "qty", "unit_price"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "full_name",
            "phone",
            "address",
            "status",
            "gold_price",
            "total",
            "note",
            "created_at",
            "items",
        ]
