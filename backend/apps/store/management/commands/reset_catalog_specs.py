"""
Clear product codes (SKU) and weights without deleting products.
Also polish names (strip catalog model numbers) and fill missing descriptions.

Usage:
  python manage.py reset_catalog_specs
  python manage.py reset_catalog_specs --dry-run
  python manage.py reset_catalog_specs --keep-weights
"""

from __future__ import annotations

import re

from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.store.models import Product

# Trailing catalog / factory codes like "6001", "A1281", "E1701", "504"
# Keep descriptive thickness like "1میلی" / "1 میلی"
_CODE_RE = re.compile(
    r"""
    \s+
    (?:
        [A-Za-z]\d{3,}      # A1281, E1701
      | \d{3,}             # 6001, 2402, 504
    )
    \s*$
    """,
    re.VERBOSE,
)

_KEEP_THICKNESS = re.compile(r"(میلی|میلی‌متری|میلیمتری|عیار|گرم)", re.IGNORECASE)


def polish_name(name: str) -> str:
    raw = (name or "").strip()
    if not raw:
        return raw
    # Never strip if the trailing digits sit next to thickness words
    if _KEEP_THICKNESS.search(raw[-12:] if len(raw) > 12 else raw):
        # Still allow stripping pure codes after a space when thickness is earlier
        m = _CODE_RE.search(raw)
        if m and not _KEEP_THICKNESS.search(raw[m.start() :]):
            return (raw[: m.start()] + raw[m.end() :]).strip()
        return raw
    cleaned = _CODE_RE.sub("", raw).strip()
    return cleaned or raw


def build_description(product: Product) -> str:
    cat = product.category.name if product.category_id else "طلا"
    name = product.name
    fee_pct = round(float(product.fee_ratio or 0) * 100, 1)
    bits = [
        f"{name} از مجموعه {cat} گالری طلا آنیل.",
        "طلای ۱۸ عیار با قیمت‌گذاری لحظه‌ای بر اساس نرخ روز.",
    ]
    if product.has_weight:
        bits.append(f"وزن حدودی {product.weight_g} گرم.")
    else:
        bits.append("وزن دقیق پس از تأیید موجودی اعلام می‌شود.")
    if fee_pct:
        bits.append(f"اجرت ساخت حدود {fee_pct}٪.")
    bits.append("مناسب هدیه و استفاده روزمره · ضمانت اصالت.")
    return " ".join(bits)


class Command(BaseCommand):
    help = "Clear SKUs/weights (keep items), polish names, fill descriptions"

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument(
            "--keep-weights",
            action="store_true",
            help="Only clear SKUs; do not null weights",
        )
        parser.add_argument(
            "--keep-names",
            action="store_true",
            help="Do not strip catalog numbers from names",
        )

    def handle(self, *args, **opts):
        dry = opts["dry_run"]
        keep_w = opts["keep_weights"]
        keep_n = opts["keep_names"]

        qs = Product.objects.select_related("category").all()
        cleared_sku = cleared_w = renamed = described = 0

        for p in qs.iterator():
            fields: list[str] = []
            if p.sku:
                p.sku = None
                fields.append("sku")
                cleared_sku += 1

            if not keep_w and p.weight_g is not None:
                p.weight_g = None
                fields.append("weight_g")
                cleared_w += 1

            if not keep_n:
                new_name = polish_name(p.name)
                if new_name != p.name:
                    p.name = new_name
                    fields.append("name")
                    # refresh slug only if it still looks auto-derived from old pattern
                    p.slug = slugify(new_name, allow_unicode=True) or p.slug
                    fields.append("slug")
                    renamed += 1

            if not (p.description or "").strip():
                p.description = build_description(p)
                fields.append("description")
                described += 1

            if "weight_g" in fields or "sku" in fields or "name" in fields:
                if not p.needs_review:
                    p.needs_review = True
                    fields.append("needs_review")

            label = (p.placeholder_label or "").strip()
            if not keep_w and (not label or "وزن" not in label):
                base = p.category.name if p.category_id else "طلا"
                p.placeholder_label = f"{base} · وزن پس از تأیید"
                if "placeholder_label" not in fields:
                    fields.append("placeholder_label")

            if fields and not dry:
                # ensure unique slug after rename
                if "slug" in fields:
                    base_slug = p.slug
                    n = 2
                    while Product.objects.filter(slug=p.slug).exclude(pk=p.pk).exists():
                        p.slug = f"{base_slug}-{n}"
                        n += 1
                p.save(update_fields=list(dict.fromkeys(fields + ["updated_at"])))

        mode = "DRY-RUN" if dry else "DONE"
        self.stdout.write(
            self.style.SUCCESS(
                f"[{mode}] products={qs.count()} sku_cleared={cleared_sku} "
                f"weights_cleared={cleared_w} renamed={renamed} described={described}"
            )
        )
