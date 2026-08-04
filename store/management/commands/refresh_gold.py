from django.core.management.base import BaseCommand

from store.services.gold import refresh_gold_price


class Command(BaseCommand):
    help = "Refresh the live gold price (provider API or demo jitter)"

    def handle(self, *args, **options):
        row = refresh_gold_price()
        self.stdout.write(
            self.style.SUCCESS(
                f"Updated 18k={row.price_18k_per_gram:,} at {row.updated_at:%H:%M:%S}"
            )
        )
