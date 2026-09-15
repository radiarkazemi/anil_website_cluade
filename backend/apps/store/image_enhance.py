"""
Jewelry catalog photo polish (Pillow only).

Goal: keep gold detail crisp on phone/showcase snaps without neon color,
halos, or mushy over-denoise. Heavy AI upscale is out of scope.
"""

from __future__ import annotations

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

AUTOCONTRAST_CUTOFF = 1
COLOR_FACTOR = 1.06
CONTRAST_FACTOR = 1.1
BRIGHTNESS_FACTOR = 1.03
SHARPNESS_FACTOR = 1.28
UNSHARP_RADIUS = 1.4
UNSHARP_PERCENT = 110
UNSHARP_THRESHOLD = 6


def enhance_jewelry_image(img: Image.Image) -> Image.Image:
    """
    Jewelry polish: light denoise → open tones → edge clarity.

    Avoids MedianFilter (it smears fine chain/filigree detail).
    Expects RGB (caller flattens alpha).
    """
    if img.mode != "RGB":
        img = img.convert("RGB")

    # Gentle grain soften without destroying metal edges.
    img = img.filter(ImageFilter.SMOOTH_MORE)

    img = ImageOps.autocontrast(img, cutoff=AUTOCONTRAST_CUTOFF)

    img = ImageEnhance.Color(img).enhance(COLOR_FACTOR)
    img = ImageEnhance.Contrast(img).enhance(CONTRAST_FACTOR)
    img = ImageEnhance.Brightness(img).enhance(BRIGHTNESS_FACTOR)
    img = ImageEnhance.Sharpness(img).enhance(SHARPNESS_FACTOR)

    img = img.filter(
        ImageFilter.UnsharpMask(
            radius=UNSHARP_RADIUS,
            percent=UNSHARP_PERCENT,
            threshold=UNSHARP_THRESHOLD,
        )
    )
    return img
