import json
from pathlib import Path

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.text import slugify

from store.models import Category, GoldPrice, Product


class Command(BaseCommand):
    help = "Seed catalog + gold price from data/seed.json"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Clear products/categories/gold prices before seeding",
        )

    def handle(self, *args, **options):
        root = Path(__file__).resolve().parents[3]
        seed_path = root / "data" / "seed.json"
        if not seed_path.exists():
            seed_path = root / "store" / "seed_data.json"
        data = json.loads(seed_path.read_text(encoding="utf-8"))

        if options["reset"]:
            Product.objects.all().delete()
            Category.objects.all().delete()
            GoldPrice.objects.all().delete()
            self.stdout.write("Cleared existing catalog data.")

        gp = data["gold_price"]
        GoldPrice.objects.create(
            price_18k_per_gram=gp["price_18k_per_gram"],
            price_24k_per_gram=gp["price_24k_per_gram"],
            coin_emami=gp["coin_emami"],
            coin_half=gp["coin_half"],
            coin_quarter=gp["coin_quarter"],
            usd_toman=gp["usd_toman"],
            ounce_usd=gp["ounce_usd"],
            updated_at=timezone.now(),
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

        # Short placeholder labels for product cards
        ph_map = {
            "انگشتر": "انگشتر",
            "گردنبند و زنجیر": "گردنبند",
            "دستبند و النگو": "النگو",
            "گوشواره": "گوشواره",
            "سکه و شمش": "سکه",
            "ست کامل": "ست",
        }

        created = 0
        for p in data["products"]:
            cat = cats[p["category"]]
            label = ph_map.get(p["category"], p["category"][:8])
            # Override a few specific ones from the design
            name_hints = {
                "زنجیر ونیزی رِسا": "گردنبند",
                "النگوی شش‌پر نازنین": "النگو",
                "دستبند زنجیربافت کیان": "دستبند",
                "آویز قلب مهتا": "آویز",
                "نیم‌ست پرنیان": "نیم‌ست",
                "سرویس کامل درسا": "سرویس",
                "شمش ۱۰ گرمی آنیل": "شمش",
                "سکه تمام بهار آزادی": "سکه",
            }
            label = name_hints.get(p["name"], label)
            Product.objects.update_or_create(
                name=p["name"],
                defaults={
                    "category": cat,
                    "weight_g": p["weight_g"],
                    "karat": p["karat"],
                    "fee_ratio": p["fee_ratio"],
                    "stone_value": p["stone_value"],
                    "tag": p.get("tag") or "",
                    "description": p.get("description")
                    or f"{p['name']} — ساخته‌شده در گالری طلا آنیل، عیار {p['karat']}، وزن {p['weight_g']} گرم.",
                    "placeholder_label": label,
                    "is_active": True,
                },
            )
            created += 1

        self.stdout.write(self.style.SUCCESS(f"{created} products seeded."))
        self.stdout.write(self.style.SUCCESS("Done. Open /admin/ to manage content."))
