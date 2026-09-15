"""
Jewelry catalog photo polish (Pillow only).

Goal: cleaner, brighter gold on phone/showcase snaps without neon color,
halos, or crunchy over-sharpen. Heavy AI denoise/upscale is out of scope —
this is a careful tone + light clarity pass.
"""

from __future__ import annotations

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

MEDIAN_SIZE = 3
AUTOCONTRAST_CUTOFF = 1
COLOR_FACTOR = 1.08
CONTRAST_FACTOR = 1.08
BRIGHTNESS_FACTOR = 1.025
SHARPNESS_FACTOR = 1.18
UNSHARP_RADIUS = 1.2
UNSHARP_PERCENT = 85
UNSHARP_THRESHOLD = 8


def enhance_jewelry_image(img: Image.Image) -> Image.Image:
    """
    Gentle jewelry polish: denoise → open tones → light edge clarity.

    Expects RGB (caller flattens alpha).
    """
    if img.mode != "RGB":
        img = img.convert("RGB")

    # Denoise grain on bust / glass before any edge work.
    img = img.filter(ImageFilter.MedianFilter(size=MEDIAN_SIZE))
    img = img.filter(ImageFilter.SMOOTH)

    img = ImageOps.autocontrast(img, cutoff=AUTOCONTRAST_CUTOFF)

    img = ImageEnhance.Color(img).enhance(COLOR_FACTOR)
    img = ImageEnhance.Contrast(img).enhance(CONTRAST_FACTOR)
    img = ImageEnhance.Brightness(img).enhance(BRIGHTNESS_FACTOR)
    img = ImageEnhance.Sharpness(img).enhance(SHARPNESS_FACTOR)

    # Mild unsharp with high threshold — edges only, skip noise.
    img = img.filter(
        ImageFilter.UnsharpMask(
            radius=UNSHARP_RADIUS,
            percent=UNSHARP_PERCENT,
            threshold=UNSHARP_THRESHOLD,
        )
    )
    return img
