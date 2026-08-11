"""Apply smart meta_title / meta_description to catalog products."""

from __future__ import annotations

from django.core.management.base import BaseCommand

from apps.store.models import Product


def _fa_num(n: float | int) -> str:
    s = f"{n:.2f}".rstrip("0").rstrip(".") if isinstance(n, float) else str(n)
    trans = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")
    return s.translate(trans)


def _clip(text: str, max_len: int) -> str:
    t = " ".join((text or "").split())
    if len(t) <= max_len:
        return t
    cut = t[: max_len - 1]
    sp = cut.rfind(" ")
    return f"{(cut[:sp] if sp > 40 else cut).strip()}…"


def best_product_seo(
    *,
    name: str,
    category_name: str = "",
    weight_g: float | None = None,
    karat: int = 18,
    tag: str = "",
    sku: str = "",
    description: str = "",
    brand: str = "گالری طلا آنیل",
) -> tuple[str, str]:
    name = (name or "").strip()
    if not name:
        return "", ""

    category = (category_name or "").strip()
    karat = int(karat or 18)
    has_weight = weight_g is not None and float(weight_g) > 0
    weight_fa = _fa_num(round(float(weight_g), 2)) if has_weight else ""
    karat_fa = _fa_num(karat)
    tag = (tag or "").strip()
    sku = (sku or "").strip()
    desc_seed = (description or "").strip()
    brand = (brand or "گالری طلا آنیل").strip()

    cat_bit = f"{category} طلا" if category else "زیورآلات طلا"
    weight_bit = f" وزن {weight_fa} گرم" if has_weight else ""
    karat_bit = f" عیار {karat_fa}"
    tag_bit = f" | {tag}" if tag else ""
    buy_bits = "قیمت لحظه‌ای · ضمانت اصالت · ارسال بیمه‌شده"

    candidates = [
        (
            f"{name} | {cat_bit}{karat_bit} | {brand}",
            f"{name}{f' از دسته {category}' if category else ''} با طلای {karat_fa} عیار"
            f"{f' و وزن {weight_fa} گرم' if has_weight else ''}. خرید آنلاین از {brand} با {buy_bits}.",
            40 + (10 if category else 0) + (10 if has_weight else 0) + (5 if tag else 0),
        ),
        (
            f"خرید {name}{weight_bit}{karat_bit} | {brand}",
            f"برای خرید {name}{f' {weight_fa} گرمی' if has_weight else ''} با قیمت‌گذاری لحظه‌ای طلا به {brand} سر بزنید. "
            f"{buy_bits}{f' · کد کالا {sku}' if sku else ''}.",
            35 + (10 if has_weight else 0),
        ),
        (
            f"{name}{weight_bit} | طلای {karat_fa} عیار{f' · {category}' if category else ''} | {brand}",
            f"{desc_seed or f'{name} دست‌چین‌شده در {brand}'} — عیار {karat_fa}"
            f"{f'، وزن {weight_fa} گرم' if has_weight else ''}. مناسب هدیه و استفاده روزمره با ضمانت اصالت.",
            30 + (10 if has_weight else 0),
        ),
        (
            f"{cat_bit} {name}{tag_bit} | {brand}",
            f"بهترین انتخاب برای {cat_bit}: {name}. قیمت شفاف بر اساس نرخ روز طلا، بازخرید تضمینی و مشاوره تخصصی در {brand}.",
            25 + (10 if category else 0) + (5 if tag else 0),
        ),
    ]

    best = max(candidates, key=lambda c: c[2])
    return _clip(best[0], 60), _clip(best[1], 158)


class Command(BaseCommand):
    help = "Fill meta_title / meta_description for products using smart jewelry SEO"

    def add_arguments(self, parser):
        parser.add_argument(
            "--only-empty",
            action="store_true",
            help="Only products missing meta_title or meta_description",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report without writing",
        )

    def handle(self, *args, **options):
        from django.db.models import Q

        qs = Product.objects.select_related("category").all()
        if options["only_empty"]:
            qs = qs.filter(
                Q(meta_title="")
                | Q(meta_description="")
                | Q(meta_title__isnull=True)
                | Q(meta_description__isnull=True)
            )

        updated = 0
        for p in qs.iterator():
            title, desc = best_product_seo(
                name=p.name,
                category_name=p.category.name if p.category_id else "",
                weight_g=float(p.weight_g) if p.weight_g is not None else None,
                karat=p.karat or 18,
                tag=p.tag or "",
                sku=p.sku or "",
                description=p.description or "",
            )
            if not title:
                continue
            if p.meta_title == title and p.meta_description == desc:
                continue
            if options["dry_run"]:
                self.stdout.write(f"DRY {p.sku or p.id}: {title}")
            else:
                p.meta_title = title
                p.meta_description = desc
                p.save(update_fields=["meta_title", "meta_description", "updated_at"])
            updated += 1

        self.stdout.write(self.style.SUCCESS(f"SEO applied to {updated} products"))
