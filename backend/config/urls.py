from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.db import connection
from django.urls import include, path
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    """Liveness/readiness — checks Postgres; Mongo/Redis are best-effort."""
    checks = {"db": False, "mongo": None, "redis": None}
    try:
        connection.ensure_connection()
        checks["db"] = True
    except Exception as exc:
        return Response(
            {"status": "error", "service": "anil-gold-api", "checks": checks, "detail": str(exc)},
            status=503,
        )

    try:
        from apps.analytics.services.mongodb import get_db

        db = get_db()
        if db is not None:
            db.command("ping")
            checks["mongo"] = True
        else:
            checks["mongo"] = False
    except Exception:
        checks["mongo"] = False

    redis_url = getattr(settings, "REDIS_URL", "") or ""
    if redis_url:
        try:
            from django.core.cache import cache

            cache.set("healthcheck", 1, 5)
            checks["redis"] = cache.get("healthcheck") == 1
        except Exception:
            checks["redis"] = False

    return Response({"status": "ok", "service": "anil-gold-api", "checks": checks})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/", health, name="health"),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/", include("apps.store.urls")),
    path("api/v1/", include("apps.orders.urls")),
    path("api/v1/", include("apps.analytics.urls")),
]

# Dev always; prod only when MEDIA_SERVE=1 (small VPS). Prefer nginx/S3 in real deploys.
if settings.DEBUG or getattr(settings, "MEDIA_SERVE", False):
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
