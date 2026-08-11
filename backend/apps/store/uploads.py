"""Safe image upload validation + automatic resize/compression."""

from __future__ import annotations

import io
import os
import uuid
from typing import Tuple

from django.conf import settings
from django.core.files.uploadedfile import InMemoryUploadedFile, UploadedFile
from PIL import Image, ImageOps, UnidentifiedImageError
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
    max_mb = int(getattr(settings, "MAX_UPLOAD_IMAGE_MB", 8))
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
            # Soft dimension guard before processing
            max_px = int(getattr(settings, "MAX_UPLOAD_IMAGE_PIXELS", 6000 * 6000))
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


def _safe_basename(name: str) -> str:
    base = os.path.basename(name or "image")
    stem = os.path.splitext(base)[0][:40] or "image"
    cleaned = "".join(ch if ch.isalnum() or ch in "-_" else "-" for ch in stem)
    return cleaned.strip("-_") or "image"


def ensure_media_subdir(subdir: str = "products") -> Path:
    """Create media subdir if missing. Caller still needs OS write permission."""
    from pathlib import Path

    root = Path(settings.MEDIA_ROOT)
    target = root / subdir
    target.mkdir(parents=True, exist_ok=True)
    return target


def process_uploaded_image(
    uploaded_file: UploadedFile,
    *,
    field_name: str = "image",
    max_side: int | None = None,
    quality: int | None = None,
) -> Tuple[InMemoryUploadedFile, dict]:
    """
    Validate, auto-orient, resize, and compress an uploaded image.
    Returns a Django InMemoryUploadedFile ready for ImageField + meta info.
    """
    validate_uploaded_image(uploaded_file, field_name=field_name)

    max_side = int(max_side or getattr(settings, "IMAGE_MAX_SIDE", 1600))
    quality = int(quality or getattr(settings, "IMAGE_JPEG_QUALITY", 82))

    uploaded_file.seek(0)
    with Image.open(uploaded_file) as raw:
        img = ImageOps.exif_transpose(raw)
        img.load()

    # Flatten transparency onto white for JPEG output
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        rgba = img.convert("RGBA")
        background = Image.new("RGB", rgba.size, (255, 255, 255))
        background.paste(rgba, mask=rgba.split()[-1])
        img = background
    elif img.mode != "RGB":
        img = img.convert("RGB")

    original_size = img.size
    img.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality, optimize=True, progressive=True)
    data = buf.getvalue()
    buf.seek(0)

    filename = f"{_safe_basename(getattr(uploaded_file, 'name', '') or 'image')}-{uuid.uuid4().hex[:8]}.jpg"
    processed = InMemoryUploadedFile(
        file=buf,
        field_name=field_name,
        name=filename,
        content_type="image/jpeg",
        size=len(data),
        charset=None,
    )
    meta = {
        "original_width": original_size[0],
        "original_height": original_size[1],
        "width": img.size[0],
        "height": img.size[1],
        "bytes": len(data),
        "filename": filename,
    }
    return processed, meta
