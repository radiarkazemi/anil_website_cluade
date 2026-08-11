from django.contrib import admin

from .models import Category, GoldPrice, Product, ProductImage, Wishlist


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 3


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "weight_g", "fee_ratio", "tag", "live_price", "stock", "is_active", "is_featured")
    list_filter = ("category", "tag", "is_active", "is_featured")
    search_fields = ("name", "sku", "description")
    prepopulated_fields = {"slug": ("name",)}
    inlines = [ProductImageInline]

    @admin.display(description="قیمت زنده")
    def live_price(self, obj):
        return f"{obj.price:,} تومان"


@admin.register(GoldPrice)
class GoldPriceAdmin(admin.ModelAdmin):
    list_display = ("price_18k_per_gram", "price_24k_per_gram", "coin_emami", "usd_toman", "source", "created_at")
    readonly_fields = ("created_at",)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "order", "display_count", "is_active")
    prepopulated_fields = {"slug": ("name",)}
    ordering = ("order",)


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ("user", "product", "created_at")


admin.site.site_header = "مدیریت گالری طلا آنیل"
admin.site.site_title = "آنیل گلد"
admin.site.index_title = "پنل مدیریت"
