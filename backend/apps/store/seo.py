"""Public SEO endpoints — robots, sitemap, and crawlable blog HTML shells."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from xml.sax.saxutils import escape

from django.conf import settings
from django.http import Http404, HttpResponse, HttpResponsePermanentRedirect
from django.utils.html import escape as html_escape
from django.views.decorators.http import require_GET

from .models import ContentPage, Product, SiteSettings


def _site_origin(request) -> str:
    configured = (getattr(settings, "FRONTEND_URL", "") or "").rstrip("/")
    if configured and "localhost" not in configured and "127.0.0.1" not in configured:
        return configured
    scheme = request.headers.get("X-Forwarded-Proto") or request.scheme or "https"
    host = request.get_host()
    return f"{scheme}://{host}".rstrip("/")


def _spa_index_path() -> Path:
    env = os.environ.get("SPA_INDEX", "").strip()
    if env:
        return Path(env)
    # /var/www/anil/backend → ../frontend/dist/index.html
    return (settings.BASE_DIR.parent / "frontend" / "dist" / "index.html").resolve()


def _plain_text(value: str, limit: int = 160) -> str:
    text = re.sub(r"[#>*_`]+", " ", value or "")
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def _abs_media(request, url: str | None) -> str | None:
    if not url:
        return None
    if url.startswith("http://") or url.startswith("https://"):
        return url
    origin = _site_origin(request)
    if not url.startswith("/"):
        url = "/" + url
    return origin + url


def _brand_name() -> str:
    try:
        site = SiteSettings.get_solo()
        return (site.brand_name or "").strip() or "گالری طلا آنیل"
    except Exception:
        return "گالری طلا آنیل"


@require_GET
def robots_txt(request):
    origin = _site_origin(request)
    body = (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /panel\n"
        "Disallow: /panel/\n"
        "Disallow: /account\n"
        "Disallow: /account/\n"
        "Disallow: /api/\n"
        "Disallow: /admin/\n"
        f"Sitemap: {origin}/sitemap.xml\n"
    )
    return HttpResponse(body, content_type="text/plain; charset=utf-8")


@require_GET
def sitemap_xml(request):
    origin = _site_origin(request)
    urls: list[tuple[str, str | None, str]] = [
        (f"{origin}/", None, "daily"),
        (f"{origin}/products", None, "daily"),
        (f"{origin}/blog", None, "daily"),
        (f"{origin}/atelier", None, "weekly"),
    ]

    for page in ContentPage.objects.filter(is_published=True, page_type=ContentPage.PageType.PAGE).only(
        "slug", "updated_at"
    ):
        if page.slug == "بلاگ":
            continue
        urls.append((f"{origin}/p/{page.slug}", page.updated_at.date().isoformat() if page.updated_at else None, "monthly"))

    for page in ContentPage.objects.filter(is_published=True, page_type=ContentPage.PageType.BLOG).only(
        "slug", "updated_at"
    ):
        if page.slug == "بلاگ":
            continue
        urls.append(
            (
                f"{origin}/blog/{page.slug}",
                page.updated_at.date().isoformat() if page.updated_at else None,
                "weekly",
            )
        )

    for product in Product.objects.filter(is_active=True).only("slug", "updated_at"):
        urls.append(
            (
                f"{origin}/products/{product.slug}",
                product.updated_at.date().isoformat() if product.updated_at else None,
                "daily",
            )
        )

    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for loc, lastmod, freq in urls:
        parts.append("<url>")
        parts.append(f"<loc>{escape(loc)}</loc>")
        if lastmod:
            parts.append(f"<lastmod>{escape(lastmod)}</lastmod>")
        parts.append(f"<changefreq>{freq}</changefreq>")
        parts.append("</url>")
    parts.append("</urlset>")
    return HttpResponse("\n".join(parts), content_type="application/xml; charset=utf-8")


def _inject_spa_seo(
    *,
    request,
    title: str,
    description: str,
    canonical: str,
    image: str | None = None,
    json_ld: dict | list | None = None,
    article_html: str = "",
    og_type: str = "website",
) -> HttpResponse:
    index_path = _spa_index_path()
    if not index_path.is_file():
        # Dev fallback — still return crawlable HTML
        html = (
            "<!doctype html><html lang=\"fa\" dir=\"rtl\"><head>"
            f"<meta charset=\"utf-8\"><title>{html_escape(title)}</title>"
            f"<meta name=\"description\" content=\"{html_escape(description)}\">"
            f"<link rel=\"canonical\" href=\"{html_escape(canonical)}\">"
            "</head><body>"
            f"{article_html}"
            "</body></html>"
        )
        return HttpResponse(html, content_type="text/html; charset=utf-8")

    html = index_path.read_text(encoding="utf-8")
    brand = _brand_name()
    image = image or f"{_site_origin(request)}/logo.jpg"

    meta_block = "\n".join(
        [
            f"<title>{html_escape(title)}</title>",
            f'<meta name="description" content="{html_escape(description)}" />',
            f'<link rel="canonical" href="{html_escape(canonical)}" />',
            '<meta name="robots" content="index,follow,max-image-preview:large" />',
            f'<meta property="og:locale" content="fa_IR" />',
            f'<meta property="og:type" content="{html_escape(og_type)}" />',
            f'<meta property="og:site_name" content="{html_escape(brand)}" />',
            f'<meta property="og:title" content="{html_escape(title)}" />',
            f'<meta property="og:description" content="{html_escape(description)}" />',
            f'<meta property="og:url" content="{html_escape(canonical)}" />',
            f'<meta property="og:image" content="{html_escape(image)}" />',
            '<meta name="twitter:card" content="summary_large_image" />',
            f'<meta name="twitter:title" content="{html_escape(title)}" />',
            f'<meta name="twitter:description" content="{html_escape(description)}" />',
            f'<meta name="twitter:image" content="{html_escape(image)}" />',
        ]
    )
    if json_ld:
        meta_block += (
            '\n<script type="application/ld+json">'
            + json.dumps(json_ld, ensure_ascii=False)
            + "</script>"
        )

    # Replace default title / description if present
    html = re.sub(r"<title>.*?</title>", "", html, count=1, flags=re.I | re.S)
    html = re.sub(
        r'<meta\s+name="description"\s+content="[^"]*"\s*/?>',
        "",
        html,
        count=1,
        flags=re.I,
    )
    if "</head>" in html:
        html = html.replace("</head>", meta_block + "\n</head>", 1)
    else:
        html = meta_block + html

    if article_html:
        noscript = f"<noscript>\n{article_html}\n</noscript>\n"
        # Also keep a crawlable copy that React will replace after mount
        crawl = (
            '<div id="anil-seo-content" data-seo="1" style="position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden">'
            f"{article_html}"
            "</div>\n"
        )
        if "</body>" in html:
            html = html.replace("</body>", noscript + crawl + "</body>", 1)
        else:
            html += noscript + crawl

    resp = HttpResponse(html, content_type="text/html; charset=utf-8")
    resp["Cache-Control"] = "public, max-age=300"
    return resp


def _article_markup(page: ContentPage, *, cover_url: str | None) -> str:
    paragraphs = []
    for line in (page.body or "").splitlines():
        line = line.strip()
        if not line:
            continue
        paragraphs.append(f"<p>{html_escape(line)}</p>")
    cover = f'<img src="{html_escape(cover_url)}" alt="{html_escape(page.title)}" />' if cover_url else ""
    return (
        f'<article><h1>{html_escape(page.title)}</h1>'
        + (f"<p>{html_escape(page.excerpt)}</p>" if page.excerpt else "")
        + cover
        + "".join(paragraphs)
        + "</article>"
    )


@require_GET
def seo_blog_list(request):
    origin = _site_origin(request)
    brand = _brand_name()
    title = f"بلاگ | {brand}"
    description = "نکات طلا، بازار، عیار و استایل — نوشته‌های مجله گالری آنیل برای خرید آگاهانه."
    canonical = f"{origin}/blog"
    posts = (
        ContentPage.objects.filter(is_published=True, page_type=ContentPage.PageType.BLOG)
        .exclude(slug="بلاگ")
        .order_by("order", "-created_at")[:50]
    )
    items = []
    for p in posts:
        items.append(
            f'<li><a href="{html_escape(origin)}/blog/{html_escape(p.slug)}">'
            f"{html_escape(p.title)}</a>"
            + (f" — {html_escape(p.excerpt)}" if p.excerpt else "")
            + "</li>"
        )
    article_html = (
        f"<main><h1>{html_escape(title)}</h1><p>{html_escape(description)}</p>"
        f"<ul>{''.join(items)}</ul></main>"
    )
    json_ld = {
        "@context": "https://schema.org",
        "@type": "Blog",
        "name": title,
        "description": description,
        "url": canonical,
        "inLanguage": "fa-IR",
        "publisher": {"@type": "Organization", "name": brand, "url": origin},
    }
    return _inject_spa_seo(
        request=request,
        title=title,
        description=description,
        canonical=canonical,
        json_ld=json_ld,
        article_html=article_html,
    )


@require_GET
def seo_blog_detail(request, slug: str):
    origin = _site_origin(request)
    brand = _brand_name()
    try:
        page = ContentPage.objects.get(
            slug=slug, is_published=True, page_type=ContentPage.PageType.BLOG
        )
    except ContentPage.DoesNotExist as exc:
        raise Http404("نوشته یافت نشد") from exc

    if page.slug == "بلاگ":
        return HttpResponsePermanentRedirect(f"{origin}/blog")

    cover = None
    if page.cover:
        try:
            cover = _abs_media(request, page.cover.url)
        except Exception:
            cover = None

    title = f"{page.title} | {brand}"
    description = _plain_text(page.excerpt or page.body or page.title)
    canonical = f"{origin}/blog/{page.slug}"
    json_ld = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": page.title,
        "description": description,
        "inLanguage": "fa-IR",
        "datePublished": page.created_at.isoformat() if page.created_at else None,
        "dateModified": page.updated_at.isoformat() if page.updated_at else None,
        "image": [cover] if cover else None,
        "author": {"@type": "Organization", "name": brand},
        "publisher": {
            "@type": "Organization",
            "name": brand,
            "logo": {"@type": "ImageObject", "url": f"{origin}/logo.jpg"},
        },
        "mainEntityOfPage": {"@type": "WebPage", "@id": canonical},
        "url": canonical,
    }
    # Drop nulls for cleaner JSON-LD
    json_ld = {k: v for k, v in json_ld.items() if v is not None}

    return _inject_spa_seo(
        request=request,
        title=title,
        description=description,
        canonical=canonical,
        image=cover,
        json_ld=json_ld,
        article_html=_article_markup(page, cover_url=cover),
        og_type="article",
    )


@require_GET
def seo_share_redirect(request, code: str):
    origin = _site_origin(request)
    try:
        page = ContentPage.objects.get(share_code=code, is_published=True)
    except ContentPage.DoesNotExist as exc:
        raise Http404("لینک نامعتبر است") from exc
    if page.page_type == ContentPage.PageType.BLOG:
        return HttpResponsePermanentRedirect(f"{origin}/blog/{page.slug}")
    return HttpResponsePermanentRedirect(f"{origin}/p/{page.slug}")
