from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("phone", "full_name", "role", "is_active", "created_at")
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("phone", "full_name", "email", "national_code")
    ordering = ("-created_at",)
    fieldsets = (
        (None, {"fields": ("phone", "password")}),
        ("اطلاعات شخصی", {"fields": ("full_name", "email", "national_code", "avatar")}),
        ("آدرس", {"fields": ("address", "city", "postal_code")}),
        ("نقش و دسترسی", {"fields": ("role", "is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("وضعیت تأیید", {"fields": ("email_verified", "phone_verified")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("phone", "full_name", "password1", "password2", "role")}),
    )
