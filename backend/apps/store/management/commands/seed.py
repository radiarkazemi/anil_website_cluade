import json
from pathlib import Path

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.text import slugify

from apps.store.models import Category, GoldPrice, Product


class Command(BaseCommand):
    help = "Seed catalog + gold price from data/seed.json"

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Clear before seeding")

    def handle(self, *args, **options):
        root = Path(__file__).resolve().parents[5]
        seed_path = root / "data" / "seed.json"
        if not seed_path.exists():
            self.stderr.write(f"seed.json not found at {seed_path}")
            return
        data = json.loads(seed_path.read_text(encoding="utf-8"))

        if options["reset"]:
            Product.objects.all().delete()
            Category.objects.all().delete()
            GoldPrice.objects.all().delete()
            self.stdout.write("Cleared existing data.")

        gp = data["gold_price"]
        GoldPrice.objects.create(
            price_18k_per_gram=gp["price_18k_per_gram"],
            price_24k_per_gram=gp["price_24k_per_gram"],
            mesghal_17=gp.get("mesghal_17") or gp.get("mesghal") or 0,
            coin_emami=gp["coin_emami"],
            coin_half=gp["coin_half"],
            coin_quarter=gp["coin_quarter"],
            usd_toman=0,
            ounce_usd=gp["ounce_usd"],
            source="seed",
            created_at=timezone.now(),
        )
        self.stdout.write(self.style.SUCCESS("Gold price seeded."))

        cats = {}
        for i, c in enumerate(data["categories"]):
            obj, _ = Category.objects.update_or_create(
                name=c["name"],
                defaults={
                    "slug": slugify(c["name"], allow_unicode=True),
                    "order": i,
                    "display_count": c.get("display_count", 0),
                },
            )
            cats[c["name"]] = obj
        self.stdout.write(self.style.SUCCESS(f"{len(cats)} categories seeded."))

        ph_map = {
            "انگشتر": "انگشتر", "گردنبند و زنجیر": "گردنبند",
            "دستبند و النگو": "النگو", "گوشواره": "گوشواره",
            "سکه و شمش": "سکه", "ست کامل": "ست",
        }
        name_hints = {
            "زنجیر ونیزی رِسا": "گردنبند", "النگوی شش‌پر نازنین": "النگو",
            "دستبند زنجیربافت کیان": "دستبند", "آویز قلب مهتا": "آویز",
            "نیم‌ست پرنیان": "نیم‌ست", "سرویس کامل درسا": "سرویس",
            "شمش ۱۰ گرمی آنیل": "شمش", "سکه تمام بهار آزادی": "سکه",
        }

        created = 0
        for p in data["products"]:
            cat = cats[p["category"]]
            label = name_hints.get(p["name"], ph_map.get(p["category"], p["category"][:8]))
            slug = slugify(p["name"], allow_unicode=True)
            Product.objects.update_or_create(
                name=p["name"],
                defaults={
                    "slug": slug,
                    "category": cat,
                    "weight_g": p["weight_g"],
                    "karat": p["karat"],
                    "fee_ratio": p["fee_ratio"],
                    "stone_value": p["stone_value"],
                    "tag": p.get("tag") or "",
                    "description": f'{p["name"]} — ساخته‌شده در گالری طلا آنیل، عیار {p["karat"]}، وزن {p["weight_g"]} گرم.',
                    "placeholder_label": label,
                    "is_active": True,
                    "is_featured": p.get("tag") in ("پرفروش", "ویژه"),
                },
            )
            created += 1

        self.stdout.write(self.style.SUCCESS(f"{created} products seeded."))
