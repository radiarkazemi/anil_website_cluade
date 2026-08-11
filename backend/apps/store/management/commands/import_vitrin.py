"""Import vitrin inventory products from data/vitrin_import.json."""

from __future__ import annotations

import json
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from apps.store.models import Category, Product


class Command(BaseCommand):
    help = (
        "Import ویترین products from data/vitrin_import.json "
        "(fee already includes +2% for customers)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--path",
            type=str,
            default="",
            help="Optional path to JSON (default: data/vitrin_import.json)",
        )
        parser.add_argument(
            "--deactivate-demo",
            action="store_true",
            help="Deactivate non-VIT- SKU products so only vitrin shows",
        )
        parser.add_argument(
            "--replace-vitrin",
            action="store_true",
            help="Delete existing VIT-* products before import",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Parse and report without writing",
        )

    def handle(self, *args, **options):
        root = Path(__file__).resolve().parents[5]
        path = Path(options["path"]) if options["path"] else root / "data" / "vitrin_import.json"
        if not path.exists():
            self.stderr.write(f"JSON not found: {path}")
            return

        data = json.loads(path.read_text(encoding="utf-8"))
        products = data.get("products") or []
        self.stdout.write(
            f"Loaded {len(products)} products from {path.name} "
            f"(skipped in source: {data.get('skipped_count', '?')})"
        )

        if options["dry_run"]:
            cats = sorted({p["category"] for p in products})
            self.stdout.write(f"Categories: {', '.join(cats)}")
            self.stdout.write(self.style.WARNING("Dry run — no DB changes"))
            return

        with transaction.atomic():
            if options["replace_vitrin"]:
                deleted, _ = Product.objects.filter(sku__startswith="VIT-").delete()
                self.stdout.write(f"Removed {deleted} existing VIT- products")

            if options["deactivate_demo"]:
                n = Product.objects.exclude(sku__startswith="VIT-").update(is_active=False)
                self.stdout.write(f"Deactivated {n} non-vitrin products")

            cat_cache: dict[str, Category] = {}
            for order, name in enumerate(
                sorted({p["category"] for p in products}),
                start=1,
            ):
                cat, _ = Category.objects.update_or_create(
                    name=name,
                    defaults={
                        "slug": slugify(name, allow_unicode=True) or f"cat-{order}",
                        "order": order,
                        "is_active": True,
                    },
                )
                cat_cache[name] = cat

            created = 0
            updated = 0
            for p in products:
                cat = cat_cache[p["category"]]
                sku = p.get("sku") or None
                base_slug = slugify(p["name"], allow_unicode=True) or (sku or "product")
                slug = base_slug
                # keep slug unique if name collides with non-sku product
                n = 2
                while Product.objects.filter(slug=slug).exclude(sku=sku).exists():
                    slug = f"{base_slug}-{n}"
                    n += 1

                defaults = {
                    "name": p["name"][:200],
                    "slug": slug,
                    "category": cat,
                    "weight_g": p["weight_g"],
                    "karat": int(p.get("karat") or 18),
                    "fee_ratio": p["fee_ratio"],
                    "stone_value": int(p.get("stone_value") or 0),
                    "tag": p.get("tag") or "",
                    "description": p.get("description") or "",
                    "placeholder_label": (p.get("placeholder_label") or p["category"])[:40],
                    "stock": max(0, int(p.get("stock") or 0)),
                    "is_active": bool(p.get("is_active", True)),
                    "is_featured": bool(p.get("is_featured", False)),
                }

                if sku:
                    obj, was_created = Product.objects.update_or_create(
                        sku=sku,
                        defaults=defaults,
                    )
                else:
                    obj, was_created = Product.objects.update_or_create(
                        name=defaults["name"],
                        category=cat,
                        defaults=defaults,
                    )

                if was_created:
                    created += 1
                else:
                    updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Vitrin import done — created={created} updated={updated} "
                f"active_vitrin={Product.objects.filter(sku__startswith='VIT-', is_active=True).count()}"
            )
        )
