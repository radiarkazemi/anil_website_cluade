from django.contrib import admin

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("product", "product_name", "qty", "unit_price")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "full_name", "phone", "status", "total", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("order_number", "full_name", "phone")
    inlines = [OrderItemInline]
    readonly_fields = ("order_number", "gold_price_snapshot", "subtotal", "total", "created_at")


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ("order", "product_name", "qty", "unit_price")
