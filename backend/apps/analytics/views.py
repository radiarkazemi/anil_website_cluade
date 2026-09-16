from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminRole
from apps.store.models import Product

from .services.mongodb import (
    get_popular_products,
    get_price_history,
    get_traffic_summary,
    log_product_view,
    log_site_visit,
)


class PriceHistoryView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        limit = min(int(request.query_params.get("limit", 50)), 500)
        history = get_price_history(limit=limit)
        for h in history:
            if "ts" in h:
                h["ts"] = h["ts"].isoformat()
        return Response(history)


class ProductViewLogView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        product_id = request.data.get("product_id")
        if not product_id:
            return Response({"detail": "product_id required"}, status=status.HTTP_400_BAD_REQUEST)
        user_id = str(request.user.id) if request.user.is_authenticated else None
        meta = {
            "path": request.data.get("path"),
            "title": request.data.get("title"),
            "referrer": request.data.get("referrer") or request.META.get("HTTP_REFERER"),
            "session_id": request.data.get("session_id"),
            "user_agent": request.data.get("user_agent") or request.META.get("HTTP_USER_AGENT"),
            "screen": request.data.get("screen"),
            "language": request.data.get("language"),
        }
        # Drop empty meta keys
        meta = {k: v for k, v in meta.items() if v}
        log_product_view(str(product_id), user_id, meta=meta or None)
        return Response({"detail": "ok"})


class SiteVisitLogView(APIView):
    """Public beacon — storefront page views for admin traffic analysis."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        path = request.data.get("path") or "/"
        # Never track admin panel traffic as storefront visits
        if str(path).startswith("/panel"):
            return Response({"detail": "skipped"})
        user_id = str(request.user.id) if request.user.is_authenticated else None
        log_site_visit(
            path=str(path),
            title=request.data.get("title"),
            referrer=request.data.get("referrer") or request.META.get("HTTP_REFERER"),
            session_id=request.data.get("session_id"),
            user_id=user_id,
            user_agent=request.data.get("user_agent") or request.META.get("HTTP_USER_AGENT"),
            product_id=request.data.get("product_id"),
            screen=request.data.get("screen"),
            language=request.data.get("language"),
        )
        return Response({"detail": "ok"})


class PopularProductsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        days = min(int(request.query_params.get("days", 30)), 365)
        limit = min(int(request.query_params.get("limit", 10)), 50)
        data = get_popular_products(days=days, limit=limit)
        return Response(data)


class AdminTrafficView(APIView):
    """Admin-only site visit / traffic analysis."""

    permission_classes = [IsAdminRole]

    def get(self, request):
        days = min(int(request.query_params.get("days", 14)), 90)
        summary = get_traffic_summary(days=days)

        # Enrich product ids with names/slugs when possible
        ids = [p["product_id"] for p in summary.get("top_products") or [] if p.get("product_id")]
        if ids:
            products = {
                str(p.id): p
                for p in Product.objects.filter(id__in=ids).only("id", "name", "slug")
            }
            for row in summary["top_products"]:
                prod = products.get(str(row["product_id"]))
                if prod:
                    row["name"] = prod.name
                    row["slug"] = prod.slug
                else:
                    row["name"] = row["product_id"]
                    row["slug"] = None

        return Response(summary)
