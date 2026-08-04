from django.contrib import admin

from .models import Category, GoldPrice, Order, OrderItem, Product, ProductImage


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 3


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("product", "qty", "unit_price")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "weight_g", "fee_ratio", "tag", "live_price", "is_active")
    list_filter = ("category", "tag", "is_active")
    search_fields = ("name", "description")
    inlines = [ProductImageInline]

    @admin.display(description="قیمت زنده")
    def live_price(self, obj):
        return f"{obj.price:,} تومان"


@admin.register(GoldPrice)
class GoldPriceAdmin(admin.ModelAdmin):
    list_display = (
        "price_18k_per_gram",
        "price_24k_per_gram",
        "coin_emami",
        "usd_toman",
        "updated_at",
    )
    readonly_fields = ("updated_at",)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "order", "display_count")
    ordering = ("order",)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "full_name", "phone", "status", "total", "gold_price", "created_at")
    list_filter = ("status",)
    search_fields = ("full_name", "phone")
    inlines = [OrderItemInline]
    readonly_fields = ("gold_price", "total", "created_at")


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ("order", "product", "qty", "unit_price")


admin.site.site_header = "مدیریت گالری طلا آنیل"
admin.site.site_title = "آنیل گلد"
admin.site.index_title = "پنل مدیریت فروشگاه"
