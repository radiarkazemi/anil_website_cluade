"""Attach curated product photos from data/product-images/ to seeded products."""

from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand

from apps.store.models import Product, ProductImage

# Maps product name substring → image filename
IMAGE_MAP = {
    "سولیتر": "ring-solitaire.png",
    "ونیزی": "necklace-chain.png",
    "شش‌پر": "bangle-gold.png",
    "حلقه‌ای": "earrings-hoop.png",
    "بهار آزادی": "coin-emami.png",
    "پرنیان": "set-parnian.png",
    "زنجیربافت": "bracelet-chain.png",
    "مهتا": "pendant-heart.png",
    "رخش": "ring-mens.png",
    "درسا": "set-dorsa.png",
    "میخی": "earrings-stud.png",
    "شمش": "gold-bar.png",
}


class Command(BaseCommand):
    help = "Attach real product photos to catalog items"

    def handle(self, *args, **options):
        root = Path(__file__).resolve().parents[5]
        img_dir = root / "data" / "product-images"
        if not img_dir.exists():
            self.stderr.write(f"Missing {img_dir}")
            return

        attached = 0
        for product in Product.objects.all():
            filename = None
            for key, fname in IMAGE_MAP.items():
                if key in product.name:
                    filename = fname
                    break
            if not filename:
                continue
            path = img_dir / filename
            if not path.exists():
                continue

            # Replace existing images for a clean primary photo
            product.images.all().delete()
            with path.open("rb") as fh:
                img = ProductImage(product=product, alt=product.name, order=0, is_primary=True)
                img.image.save(filename, File(fh), save=True)
            attached += 1
            self.stdout.write(f"  ✓ {product.name} ← {filename}")

        self.stdout.write(self.style.SUCCESS(f"Attached photos to {attached} products."))
