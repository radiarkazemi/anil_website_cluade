from django.core.management.base import BaseCommand

from apps.store.services.gold import refresh_gold_price


class Command(BaseCommand):
    help = "Fetch live gold/coin prices (sekefarshad / goldbridge) and store a snapshot"

    def add_arguments(self, parser):
        parser.add_argument(
            "--allow-jitter",
            action="store_true",
            help="Fall back to jitter if live providers fail",
        )

    def handle(self, *args, **options):
        row = refresh_gold_price(force_live=True, allow_jitter=options["allow_jitter"])
        self.stdout.write(
            self.style.SUCCESS(
                f"OK source={row.source} g18={row.price_18k_per_gram:,} "
                f"emami={row.coin_emami:,} at {row.created_at:%Y-%m-%d %H:%M:%S}"
            )
        )
