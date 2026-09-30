from rest_framework import serializers

from .models import (
    Category,
    ContentPage,
    GoldPrice,
    HeroAlbumSlide,
    Product,
    ProductImage,
    SiteSettings,
    Wishlist,
)


def _abs_url(request, file_field):
    if not file_field:
        return None
    url = file_field.url
    return request.build_absolute_uri(url) if request else url


class ProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ["id", "image", "image_url", "alt", "order", "is_primary"]

    def get_image_url(self, obj):
        return _abs_url(self.context.get("request"), obj.image)


class ProductListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    price = serializers.SerializerMethodField()
    primary_image = serializers.SerializerMethodField()
    has_weight = serializers.SerializerMethodField()

    def get_has_weight(self, obj):
        return bool(getattr(obj, "has_weight", False))

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "category_name", "category_slug",
            "weight_g", "has_weight", "karat", "fee_ratio", "stone_value", "tag",
            "placeholder_label", "price", "primary_image", "in_stock",
            "is_featured", "needs_review",
        ]

    def get_price(self, obj):
        gp = self.context.get("gold_price")
        return obj.price_breakdown(gp=gp)["total"]

    def get_primary_image(self, obj):
        # Use prefetched related manager — avoid per-row .filter() queries.
        images = list(obj.images.all())
        img = next((i for i in images if i.is_primary), None) or (images[0] if images else None)
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
    has_weight = serializers.SerializerMethodField()

    def get_has_weight(self, obj):
        return bool(getattr(obj, "has_weight", False))

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "category_name", "category_slug",
            "weight_g", "has_weight", "karat", "fee_ratio", "stone_value", "tag",
            "description", "placeholder_label", "stock", "in_stock",
            "images", "price", "breakdown", "is_featured", "needs_review",
            "meta_title", "meta_description", "created_at",
        ]

    def get_price(self, obj):
        gp = self.context.get("gold_price")
        return obj.price_breakdown(gp=gp)["total"]

    def get_breakdown(self, obj):
        gp = self.context.get("gold_price")
        return obj.price_breakdown(gp=gp)


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


class HeroAlbumSlideSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = HeroAlbumSlide
        fields = [
            "id", "image", "image_url", "alt_text", "caption",
            "sort_order", "is_active", "created_at",
        ]
        read_only_fields = ["id", "image", "created_at"]

    def get_image_url(self, obj):
        return _abs_url(self.context.get("request"), obj.image)


class SiteSettingsSerializer(serializers.ModelSerializer):
    brand_logo_url = serializers.SerializerMethodField()
    hero_image_url = serializers.SerializerMethodField()
    hero_album = serializers.SerializerMethodField()
    contact_image_url = serializers.SerializerMethodField()
    products_promo_image_url = serializers.SerializerMethodField()
    moments_image_url = serializers.SerializerMethodField()
    collection_image_url = serializers.SerializerMethodField()
    editorial_image_url = serializers.SerializerMethodField()
    cms = serializers.SerializerMethodField()

    class Meta:
        model = SiteSettings
        fields = [
            "brand_name", "brand_tagline", "brand_logo", "brand_logo_url", "cart_label",
            "hero_badge", "hero_title", "hero_subtitle", "hero_image", "hero_image_url",
            "hero_album",
            "hero_mode", "hero_cta_primary", "hero_cta_secondary",
            "hero_cta_primary_url", "hero_cta_secondary_url",
            "show_rates", "show_categories", "show_featured", "show_trust",
            "section_order", "trust_heading", "footer_tagline",
            "contact_phone", "contact_email", "contact_address",
            "contact_kicker", "contact_title", "contact_body", "contact_cta_label",
            "contact_image", "contact_image_url",
            "map_embed_url", "map_query",
            "footer_copyright", "footer_about_heading",
            "cms",
            "products_promo_image", "products_promo_image_url",
            "moments_image", "moments_image_url",
            "collection_image", "collection_image_url",
            "editorial_image", "editorial_image_url",
            "top_banner", "updated_at",
        ]
        read_only_fields = ["updated_at"]
        extra_kwargs = {
            "contact_image": {"write_only": True, "required": False},
            "products_promo_image": {"write_only": True, "required": False},
            "moments_image": {"write_only": True, "required": False},
            "collection_image": {"write_only": True, "required": False},
            "editorial_image": {"write_only": True, "required": False},
            "brand_logo": {"write_only": True, "required": False},
            "hero_image": {"write_only": True, "required": False},
        }

    def get_cms(self, obj):
        from apps.store.cms_defaults import merged_cms

        return merged_cms(getattr(obj, "cms", None))

    def get_contact_image_url(self, obj):
        return _abs_url(self.context.get("request"), obj.contact_image)

    def get_products_promo_image_url(self, obj):
        return _abs_url(self.context.get("request"), obj.products_promo_image)

    def get_moments_image_url(self, obj):
        return _abs_url(self.context.get("request"), obj.moments_image)

    def get_collection_image_url(self, obj):
        return _abs_url(self.context.get("request"), obj.collection_image)

    def get_editorial_image_url(self, obj):
        return _abs_url(self.context.get("request"), obj.editorial_image)

    def get_brand_logo_url(self, obj):
        return _abs_url(self.context.get("request"), obj.brand_logo)

    def get_hero_image_url(self, obj):
        # Prefer first active album slide; fall back to legacy single image
        album = getattr(obj, "hero_album", None)
        if album is not None:
            first = album.filter(is_active=True).order_by("sort_order", "created_at").first()
            if first and first.image:
                return _abs_url(self.context.get("request"), first.image)
        return _abs_url(self.context.get("request"), obj.hero_image)

    def get_hero_album(self, obj):
        request = self.context.get("request")
        # Admin sees all slides; public only active
        qs = obj.hero_album.all().order_by("sort_order", "created_at")
        is_admin = bool(
            request
            and getattr(request, "user", None)
            and getattr(request.user, "is_authenticated", False)
            and getattr(request.user, "role", None) in ("admin", "staff")
        )
        if not is_admin:
            qs = qs.filter(is_active=True)
        slides = HeroAlbumSlideSerializer(qs, many=True, context=self.context).data
        if slides:
            return slides
        # Legacy fallback so storefront never goes blank mid-migration
        legacy = _abs_url(request, obj.hero_image)
        if legacy:
            return [{
                "id": "legacy",
                "image": None,
                "image_url": legacy,
                "alt_text": "هیرو",
                "caption": "",
                "sort_order": 0,
                "is_active": True,
                "created_at": None,
            }]
        return []


class ContentPageSerializer(serializers.ModelSerializer):
    cover_url = serializers.SerializerMethodField()
    # Accept pasted titles with ؟/! then clean in validate — avoid hard SlugField reject
    slug = serializers.CharField(required=False, allow_blank=True, max_length=200)

    class Meta:
        model = ContentPage
        fields = [
            "id", "title", "slug", "share_code", "page_type", "excerpt", "body",
            "cover", "cover_url", "is_published", "show_in_nav",
            "is_featured", "tags", "order",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "share_code", "created_at", "updated_at"]
        extra_kwargs = {
            "cover": {"write_only": True, "required": False},
        }

    def get_cover_url(self, obj):
        return _abs_url(self.context.get("request"), obj.cover)

    def validate_tags(self, value):
        import json

        if value in (None, ""):
            return []
        if isinstance(value, str):
            text = value.strip()
            try:
                value = json.loads(text) if text else []
            except Exception:
                value = [p.strip() for p in text.replace("،", ",").split(",") if p.strip()]
        # QueryDict can nest a single list: [["a", "b"]]
        if isinstance(value, list) and len(value) == 1 and isinstance(value[0], list):
            value = value[0]
        if not isinstance(value, list):
            raise serializers.ValidationError("برچسب‌ها باید لیست باشند.")
        out = []
        for item in value:
            if isinstance(item, (list, dict)):
                continue
            s = str(item).strip().strip("[]\"'")
            if s and s not in out and "JSON" not in s:
                out.append(s[:60])
        return out[:8]

    def validate(self, attrs):
        from django.utils.text import slugify

        title = attrs.get("title") or getattr(self.instance, "title", "") or ""
        raw = attrs.get("slug", None)
        if raw is None and self.instance is not None:
            raw = self.instance.slug
        cleaned = slugify((raw or title or "").strip(), allow_unicode=True)
        if not cleaned:
            raise serializers.ValidationError(
                {"slug": "یک اسلاگ معتبر وارد کنید (حروف، عدد، خط‌تیره — بدون ؟ !)."}
            )
        # uniqueness
        qs = ContentPage.objects.filter(slug=cleaned)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError({"slug": "این اسلاگ قبلاً استفاده شده است."})
        attrs["slug"] = cleaned
        return attrs


class ContentPageListSerializer(serializers.ModelSerializer):
    cover_url = serializers.SerializerMethodField()

    class Meta:
        model = ContentPage
        fields = [
            "id", "title", "slug", "share_code", "page_type", "excerpt", "cover_url",
            "show_in_nav", "is_featured", "tags", "order", "created_at",
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
