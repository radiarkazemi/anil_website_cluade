from rest_framework import serializers

from .models import Category, ContentPage, GoldPrice, Product, ProductImage, SiteSettings, Wishlist


def _abs_url(request, file_field):
    if not file_field:
        return None
    url = file_field.url
    return request.build_absolute_uri(url) if request else url


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
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id", "name", "slug", "description", "image", "image_url",
            "order", "display_count", "product_count", "is_active",
        ]

    def get_product_count(self, obj):
        return obj.products.filter(is_active=True).count()

    def get_image_url(self, obj):
        return _abs_url(self.context.get("request"), obj.image)


class SiteSettingsSerializer(serializers.ModelSerializer):
    brand_logo_url = serializers.SerializerMethodField()
    hero_image_url = serializers.SerializerMethodField()

    class Meta:
        model = SiteSettings
        fields = [
            "brand_name", "brand_tagline", "brand_logo", "brand_logo_url", "cart_label",
            "hero_badge", "hero_title", "hero_subtitle", "hero_image", "hero_image_url",
            "hero_mode", "hero_cta_primary", "hero_cta_secondary",
            "hero_cta_primary_url", "hero_cta_secondary_url",
            "show_rates", "show_categories", "show_featured", "show_trust",
            "section_order", "trust_heading", "footer_tagline",
            "contact_phone", "contact_email", "contact_address",
            "top_banner", "updated_at",
        ]
        read_only_fields = ["updated_at"]

    def get_brand_logo_url(self, obj):
        return _abs_url(self.context.get("request"), obj.brand_logo)

    def get_hero_image_url(self, obj):
        return _abs_url(self.context.get("request"), obj.hero_image)


class ContentPageSerializer(serializers.ModelSerializer):
    cover_url = serializers.SerializerMethodField()

    class Meta:
        model = ContentPage
        fields = [
            "id", "title", "slug", "page_type", "excerpt", "body",
            "cover", "cover_url", "is_published", "show_in_nav", "order",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_cover_url(self, obj):
        return _abs_url(self.context.get("request"), obj.cover)


class ContentPageListSerializer(serializers.ModelSerializer):
    cover_url = serializers.SerializerMethodField()

    class Meta:
        model = ContentPage
        fields = [
            "id", "title", "slug", "page_type", "excerpt", "cover_url",
            "show_in_nav", "order", "created_at",
        ]

    def get_cover_url(self, obj):
        return _abs_url(self.context.get("request"), obj.cover)


class GoldPriceSerializer(serializers.ModelSerializer):
    mesghal = serializers.IntegerField(read_only=True)
    market_rows = serializers.SerializerMethodField()

    class Meta:
        model = GoldPrice
        fields = [
            "id", "price_18k_per_gram", "price_24k_per_gram", "mesghal", "mesghal_17",
            "coin_emami", "coin_half", "coin_quarter",
            "usd_toman", "ounce_usd", "source", "created_at", "market_rows",
        ]

    def get_market_rows(self, obj):
        from apps.store.services.price_cache import market_rows_from_payload

        return market_rows_from_payload(
            {
                "price_18k_per_gram": obj.price_18k_per_gram,
                "price_24k_per_gram": obj.price_24k_per_gram,
                "mesghal_17": obj.mesghal,
                "coin_emami": obj.coin_emami,
                "coin_half": obj.coin_half,
                "coin_quarter": obj.coin_quarter,
                "ounce_usd": obj.ounce_usd,
            }
        )


class WishlistSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    product_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = Wishlist
        fields = ["id", "product", "product_id", "created_at"]
