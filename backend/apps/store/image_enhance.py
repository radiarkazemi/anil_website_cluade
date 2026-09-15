"""
Subtle jewelry-oriented photo polish (Pillow only).

Goals: slightly clearer metal edges, richer gold tones, better contrast —
without the "over-processed HDR" look. Applied on upload before JPEG save.
"""

from __future__ import annotations

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

# Tuned for product / catalog jewelry shots (phone + lightbox).
COLOR_FACTOR = 1.07
CONTRAST_FACTOR = 1.05
BRIGHTNESS_FACTOR = 1.02
SHARPNESS_FACTOR = 1.12
UNSHARP_RADIUS = 1.5
UNSHARP_PERCENT = 130
UNSHARP_THRESHOLD = 2
AUTOCONTRAST_CUTOFF = 1


def enhance_jewelry_image(img: Image.Image) -> Image.Image:
    """
    Return an RGB image with mild clarity / color improvements for jewelry.

    Expects RGB (caller flattens alpha). Safe to call on already-decent studio
    photos — factors stay conservative.
    """
    if img.mode != "RGB":
        img = img.convert("RGB")

    # Lift muddy midtones without crushing gold highlights.
    img = ImageOps.autocontrast(img, cutoff=AUTOCONTRAST_CUTOFF)

    img = ImageEnhance.Color(img).enhance(COLOR_FACTOR)
    img = ImageEnhance.Contrast(img).enhance(CONTRAST_FACTOR)
    img = ImageEnhance.Brightness(img).enhance(BRIGHTNESS_FACTOR)
    img = ImageEnhance.Sharpness(img).enhance(SHARPNESS_FACTOR)

    # Micro-contrast for facets, bezels, and stone edges.
    img = img.filter(
        ImageFilter.UnsharpMask(
            radius=UNSHARP_RADIUS,
            percent=UNSHARP_PERCENT,
            threshold=UNSHARP_THRESHOLD,
        )
    )
    return img
