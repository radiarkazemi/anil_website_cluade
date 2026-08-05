from rest_framework import serializers

from .models import Category, GoldPrice, Product, ProductImage, Wishlist


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "image", "alt", "order", "is_primary"]


class ProductListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    price = serializers.SerializerMethodField()
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "category_name", "category_slug",
            "weight_g", "karat", "fee_ratio", "stone_value", "tag",
            "placeholder_label", "price", "primary_image", "in_stock",
            "is_featured",
        ]

    def get_price(self, obj):
        return obj.price_breakdown()["total"]

    def get_primary_image(self, obj):
        img = obj.images.filter(is_primary=True).first() or obj.images.first()
        if img and img.image:
            request = self.context.get("request")
            return request.build_absolute_uri(img.image.url) if request else img.image.url
        return None


class ProductDetailSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    price = serializers.SerializerMethodField()
    breakdown = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "category_name", "category_slug",
            "weight_g", "karat", "fee_ratio", "stone_value", "tag",
            "description", "placeholder_label", "sku", "stock", "in_stock",
            "images", "price", "breakdown", "is_featured",
            "meta_title", "meta_description", "created_at",
        ]

    def get_price(self, obj):
        return obj.price_breakdown()["total"]

    def get_breakdown(self, obj):
        return obj.price_breakdown()


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description", "image", "order", "display_count", "product_count"]

    def get_product_count(self, obj):
        return obj.products.filter(is_active=True).count()


class GoldPriceSerializer(serializers.ModelSerializer):
    mesghal = serializers.IntegerField(read_only=True)
    market_rows = serializers.SerializerMethodField()

    class Meta:
        model = GoldPrice
        fields = [
            "id", "price_18k_per_gram", "price_24k_per_gram", "mesghal",
            "coin_emami", "coin_half", "coin_quarter",
            "usd_toman", "ounce_usd", "source", "created_at", "market_rows",
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


class WishlistSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    product_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = Wishlist
        fields = ["id", "product", "product_id", "created_at"]
