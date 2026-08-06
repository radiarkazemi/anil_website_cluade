"""Production readiness checks — run: python manage.py check_prod"""

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Validate production settings (security, media, payments, cache)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--strict",
            action="store_true",
            help="Exit non-zero when any warning is found (CI / pre-deploy).",
        )

    def handle(self, *args, **options):
        errors: list[str] = []
        warnings: list[str] = []

        if settings.DEBUG:
            errors.append("DEBUG=True — must be False in production.")

        sk = settings.SECRET_KEY or ""
        weak = ("insecure", "change-me", "django-insecure", "secret", "anil")
        if len(sk) < 40 or any(w in sk.lower() for w in weak):
            errors.append("SECRET_KEY is weak or placeholder — use a long random value.")

        hosts = settings.ALLOWED_HOSTS
        if not hosts or hosts == ["*"] or set(hosts) <= {"localhost", "127.0.0.1"}:
            errors.append("ALLOWED_HOSTS must include your real domain(s).")

        if getattr(settings, "PAYMENT_SANDBOX", True):
            warnings.append("PAYMENT_SANDBOX=True — real gateway payments will not run.")
        if not settings.ZARINPAL_MERCHANT_ID and not settings.IDPAY_API_KEY:
            warnings.append("No ZARINPAL_MERCHANT_ID / IDPAY_API_KEY set.")

        if not (settings.CORS_ALLOWED_ORIGINS or []):
            errors.append("CORS_ALLOWED_ORIGINS is empty.")
        if not (settings.CSRF_TRUSTED_ORIGINS or []):
            warnings.append("CSRF_TRUSTED_ORIGINS is empty — set HTTPS frontend origin.")

        redis = (getattr(settings, "REDIS_URL", "") or "").strip()
        cache_backend = settings.CACHES.get("default", {}).get("BACKEND", "")
        if "LocMem" in cache_backend:
            warnings.append("Using LocMem cache — set REDIS_URL for multi-worker production.")
        if not redis:
            warnings.append("REDIS_URL unset — WebSockets won't scale across workers.")

        use_s3 = getattr(settings, "USE_S3", False)
        media_serve = getattr(settings, "MEDIA_SERVE", False)
        if not use_s3 and not media_serve and not settings.DEBUG:
            warnings.append(
                "Media: neither USE_S3 nor MEDIA_SERVE — configure nginx to serve MEDIA_ROOT "
                "or set MEDIA_SERVE=1 / USE_S3=1."
            )

        db = settings.DATABASES.get("default", {})
        engine = db.get("ENGINE", "")
        if "sqlite" in engine and not settings.DEBUG:
            warnings.append("SQLite in production — use PostgreSQL (DATABASE_URL).")

        for e in errors:
            self.stderr.write(self.style.ERROR(f"ERROR: {e}"))
        for w in warnings:
            self.stdout.write(self.style.WARNING(f"WARN:  {w}"))

        if not errors and not warnings:
            self.stdout.write(self.style.SUCCESS("Production checks passed."))
        elif not errors:
            self.stdout.write(self.style.SUCCESS(f"No blockers ({len(warnings)} warning(s))."))

        if errors or (options["strict"] and warnings):
            raise CommandError("Production check failed.")
