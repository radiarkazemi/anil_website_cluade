"""Safe image upload validation for admin media endpoints."""

from __future__ import annotations

from django.conf import settings
from PIL import Image, UnidentifiedImageError
from rest_framework.exceptions import ValidationError

ALLOWED_IMAGE_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
ALLOWED_PIL_FORMATS = {"JPEG", "PNG", "WEBP", "GIF"}


def validate_uploaded_image(uploaded_file, *, field_name: str = "image") -> None:
    """Reject oversized / non-image uploads before they hit storage."""
    max_mb = int(getattr(settings, "MAX_UPLOAD_IMAGE_MB", 5))
    max_bytes = max_mb * 1024 * 1024
    size = getattr(uploaded_file, "size", None) or 0
    if size <= 0:
        raise ValidationError({field_name: "فایل خالی است."})
    if size > max_bytes:
        raise ValidationError({field_name: f"حداکثر حجم تصویر {max_mb} مگابایت است."})

    name = (getattr(uploaded_file, "name", "") or "").lower()
    ext = "." + name.rsplit(".", 1)[-1] if "." in name else ""
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValidationError({field_name: "فرمت مجاز: JPG، PNG، WEBP، GIF."})

    content_type = (getattr(uploaded_file, "content_type", "") or "").lower()
    if content_type and content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise ValidationError({field_name: "نوع فایل تصویر معتبر نیست."})

    pos = uploaded_file.tell() if hasattr(uploaded_file, "tell") else 0
    try:
        uploaded_file.seek(0)
        with Image.open(uploaded_file) as img:
            img.verify()
        uploaded_file.seek(0)
        with Image.open(uploaded_file) as img:
            fmt = (img.format or "").upper()
            if fmt not in ALLOWED_PIL_FORMATS:
                raise ValidationError({field_name: "فرمت تصویر پشتیبانی نمی‌شود."})
            # Soft dimension guard (very large images can DoS Pillow/CPU)
            max_px = int(getattr(settings, "MAX_UPLOAD_IMAGE_PIXELS", 4096 * 4096))
            w, h = img.size
            if w * h > max_px:
                raise ValidationError({field_name: "ابعاد تصویر بیش از حد مجاز است."})
    except ValidationError:
        raise
    except (UnidentifiedImageError, OSError, ValueError):
        raise ValidationError({field_name: "محتوای فایل تصویر معتبر نیست."})
    finally:
        if hasattr(uploaded_file, "seek"):
            try:
                uploaded_file.seek(pos)
            except Exception:
                uploaded_file.seek(0)
