"""Tests for jewelry image enhancement on upload."""

from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, override_settings
from PIL import Image


def _jpeg_bytes(size=(120, 80), color=(160, 120, 40)) -> bytes:
    buf = BytesIO()
    Image.new("RGB", size, color).save(buf, format="JPEG", quality=70)
    return buf.getvalue()


class JewelryEnhanceTests(SimpleTestCase):
    def test_enhance_jewelry_image_changes_pixels(self):
        from apps.store.image_enhance import enhance_jewelry_image

        src = Image.new("RGB", (64, 64), (140, 110, 50))
        out = enhance_jewelry_image(src)
        self.assertEqual(out.mode, "RGB")
        self.assertEqual(out.size, src.size)
        self.assertNotEqual(list(src.getdata())[0], list(out.getdata())[0])

    @override_settings(IMAGE_MAX_SIDE=200, IMAGE_JPEG_QUALITY=80, IMAGE_ENHANCE_JPEG_QUALITY=88)
    def test_process_uploaded_image_enhance_flag(self):
        from apps.store.uploads import process_uploaded_image

        raw = SimpleUploadedFile("ring.jpg", _jpeg_bytes(), content_type="image/jpeg")
        enhanced, meta_on = process_uploaded_image(raw, enhance=True)
        raw.seek(0)
        plain, meta_off = process_uploaded_image(raw, enhance=False)

        self.assertTrue(meta_on["enhanced"])
        self.assertFalse(meta_off["enhanced"])
        self.assertEqual(meta_on["jpeg_quality"], 88)
        self.assertEqual(meta_off["jpeg_quality"], 80)
        self.assertTrue(enhanced.name.endswith(".jpg"))
        # Same field path — enhanced bytes differ from plain resize.
        self.assertNotEqual(enhanced.read(), plain.read())

    @override_settings(IMAGE_MAX_SIDE=200)
    def test_enhance_defaults_on(self):
        from apps.store.uploads import process_uploaded_image

        raw = SimpleUploadedFile("band.jpg", _jpeg_bytes(), content_type="image/jpeg")
        _processed, meta = process_uploaded_image(raw)
        self.assertTrue(meta["enhanced"])
