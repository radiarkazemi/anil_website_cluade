from django.core.management.base import BaseCommand

from apps.store.services.gold import refresh_gold_price


class Command(BaseCommand):
    help = "Refresh the live gold price"

    def handle(self, *args, **options):
        row = refresh_gold_price()
        self.stdout.write(
            self.style.SUCCESS(
                f"[{row.source}] 18k={row.price_18k_per_gram:,} at {row.created_at:%H:%M:%S}"
            )
        )
