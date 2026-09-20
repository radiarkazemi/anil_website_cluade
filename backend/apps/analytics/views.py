import csv
import io

from django.http import HttpResponse
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminRole
from apps.store.models import Product

from .services.mongodb import (
    get_blog_traffic_summary,
    get_popular_products,
    get_price_history,
    get_traffic_summary,
    iter_traffic_rows,
    log_product_view,
    log_site_visit,
)


def _traffic_params(request):
    days = min(int(request.query_params.get("days", 14) or 14), 90)
    return {
        "days": days,
        "date_from": (request.query_params.get("from") or request.query_params.get("date_from") or "").strip() or None,
        "date_to": (request.query_params.get("to") or request.query_params.get("date_to") or "").strip() or None,
        "path": (request.query_params.get("path") or "").strip() or None,
        "product_id": (request.query_params.get("product_id") or "").strip() or None,
    }


def _enrich_products(summary: dict) -> dict:
    ids = [p["product_id"] for p in summary.get("top_products") or [] if p.get("product_id")]
    if not ids:
        return summary
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
    return summary


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
        meta = {k: v for k, v in meta.items() if v}
        log_product_view(str(product_id), user_id, meta=meta or None)
        return Response({"detail": "ok"})


class SiteVisitLogView(APIView):
    """Public beacon — storefront page views for admin traffic analysis."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        path = request.data.get("path") or "/"
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
            content_page_id=request.data.get("content_page_id"),
            page_type=request.data.get("page_type"),
            share_code=request.data.get("share_code"),
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
        params = _traffic_params(request)
        summary = get_traffic_summary(**params)
        return Response(_enrich_products(summary))


class AdminBlogTrafficView(APIView):
    """Admin-only blog views / readers dashboard."""

    permission_classes = [IsAdminRole]

    def get(self, request):
        days = min(int(request.query_params.get("days", 14) or 14), 90)
        date_from = (request.query_params.get("from") or request.query_params.get("date_from") or "").strip() or None
        date_to = (request.query_params.get("to") or request.query_params.get("date_to") or "").strip() or None
        summary = get_blog_traffic_summary(days, date_from=date_from, date_to=date_to)
        return Response(_enrich_blog_posts(summary))


def _enrich_blog_posts(summary: dict) -> dict:
    """Attach ContentPage title/slug/share_code/cover to top_posts + recent."""
    from apps.store.models import ContentPage

    posts = summary.get("top_posts") or []
    recent = summary.get("recent") or []

    ids = [p.get("content_page_id") for p in posts if p.get("content_page_id")]
    ids += [r.get("content_page_id") for r in recent if r.get("content_page_id")]
    codes = [p.get("share_code") for p in posts if p.get("share_code")]
    codes += [r.get("share_code") for r in recent if r.get("share_code")]

    # Resolve slugs from /blog/<slug> and /b/<code>
    slugs = []
    for p in posts + recent:
        path = (p.get("path") or "").rstrip("/")
        if path.startswith("/blog/") and path != "/blog":
            slugs.append(path[len("/blog/") :])
        if path.startswith("/b/") and len(path) > 3:
            codes.append(path[3:])

    by_id = {}
    by_slug = {}
    by_code = {}
    qs = ContentPage.objects.filter(page_type=ContentPage.PageType.BLOG)
    if ids:
        by_id = {str(p.id): p for p in qs.filter(id__in=ids)}
    if slugs:
        by_slug = {p.slug: p for p in qs.filter(slug__in=slugs)}
    if codes:
        by_code = {p.share_code: p for p in qs.filter(share_code__in=[c for c in codes if c])}

    def _resolve(row: dict):
        page = None
        if row.get("content_page_id"):
            page = by_id.get(str(row["content_page_id"]))
        path = (row.get("path") or "").rstrip("/")
        if not page and path.startswith("/blog/") and path != "/blog":
            page = by_slug.get(path[len("/blog/") :])
        if not page and path.startswith("/b/") and len(path) > 3:
            page = by_code.get(path[3:])
        if not page and row.get("share_code"):
            page = by_code.get(row["share_code"])
        if page:
            row["content_page_id"] = str(page.id)
            row["title"] = page.title
            row["slug"] = page.slug
            row["share_code"] = page.share_code or row.get("share_code")
            row["excerpt"] = page.excerpt or ""
            row["is_published"] = page.is_published
            if page.cover:
                try:
                    row["cover_url"] = page.cover.url
                except Exception:
                    row["cover_url"] = None
            else:
                row["cover_url"] = None
            row["path"] = f"/blog/{page.slug}" if page.slug != "بلاگ" else "/blog"
        elif path == "/blog":
            row["title"] = row.get("title") or "فهرست بلاگ"
            row["slug"] = None
        return row

    summary["top_posts"] = [_resolve(dict(p)) for p in posts]
    # Drop pure list row from "top posts" ranking display optional — keep but flag
    for p in summary["top_posts"]:
        p["is_list"] = (p.get("path") or "") in ("/blog", "/blog/")
    summary["recent"] = [_resolve(dict(r)) for r in recent]

    # Catalog snapshot: published blog posts count for context
    published = ContentPage.objects.filter(
        page_type=ContentPage.PageType.BLOG, is_published=True
    ).exclude(slug="بلاگ").count()
    summary["catalog"] = {
        "published_posts": published,
        "total_blog_pages": ContentPage.objects.filter(page_type=ContentPage.PageType.BLOG).count(),
    }
    return summary


class AdminTrafficExportView(APIView):
    """CSV export of filtered visit rows."""

    permission_classes = [IsAdminRole]

    def get(self, request):
        params = _traffic_params(request)
        # Blog-only export shortcut
        if (request.query_params.get("scope") or "").strip().lower() == "blog":
            params["path"] = "/blog"
        rows = iter_traffic_rows(**params, limit=int(request.query_params.get("limit", 5000) or 5000))

        # Enrich product names
        ids = [r.get("product_id") for r in rows if r.get("product_id")]
        names = {}
        if ids:
            names = {
                str(p.id): p.name
                for p in Product.objects.filter(id__in=ids).only("id", "name")
            }

        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(
            ["ts", "path", "title", "referrer_host", "device", "session_id", "product_id", "product_name", "user_id"]
        )
        for r in rows:
            pid = r.get("product_id") or ""
            writer.writerow(
                [
                    r.get("ts") or "",
                    r.get("path") or "",
                    r.get("title") or "",
                    r.get("referrer_host") or "direct",
                    r.get("device") or "",
                    r.get("session_id") or "",
                    pid,
                    names.get(str(pid), ""),
                    r.get("user_id") or "",
                ]
            )

        resp = HttpResponse(buf.getvalue(), content_type="text/csv; charset=utf-8")
        resp["Content-Disposition"] = 'attachment; filename="anil-traffic.csv"'
        return resp
