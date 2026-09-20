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
from django.views.decorators.http import require_GET, require_http_methods

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
        # Prefer Persian storefront name for SERP titles
        badge = (getattr(site, "hero_badge", "") or "").strip()
        name = (site.brand_name or "").strip()
        if badge:
            return badge
        if name and name.lower() not in ("anil", "anil gold"):
            return name
        return "گالری طلا آنیل"
    except Exception:
        return "گالری طلا آنیل"


def _brand_aliases() -> list[str]:
    return [
        "آنیل",
        "Anil",
        "Anil Gold",
        "گالری طلا آنیل",
        "گالری آنیل",
        "goldanil",
        "goldanil.ir",
        "طلا آنیل",
    ]


def _organization_ld(origin: str, request=None) -> dict:
    brand = _brand_name()
    logo = f"{origin}/logo.jpg"
    phone = ""
    email = ""
    address = ""
    try:
        site = SiteSettings.get_solo()
        phone = (site.contact_phone or "").strip()
        email = (site.contact_email or "").strip()
        address = (site.contact_address or "").strip()
        if site.brand_logo:
            try:
                logo = _abs_media(request, site.brand_logo.url) if request else logo
            except Exception:
                pass
    except Exception:
        pass

    org: dict = {
        "@type": "JewelryStore",
        "@id": f"{origin}/#organization",
        "name": brand,
        "alternateName": _brand_aliases(),
        "url": origin,
        "logo": {"@type": "ImageObject", "url": logo},
        "image": logo,
        "inLanguage": "fa-IR",
        "areaServed": {"@type": "Country", "name": "Iran"},
        "priceRange": "$$",
    }
    if phone:
        org["telephone"] = phone
    if email:
        org["email"] = email
    if address:
        org["address"] = {
            "@type": "PostalAddress",
            "streetAddress": address,
            "addressCountry": "IR",
        }
    return org


def _website_ld(origin: str) -> dict:
    brand = _brand_name()
    return {
        "@type": "WebSite",
        "@id": f"{origin}/#website",
        "name": brand,
        "alternateName": _brand_aliases(),
        "url": origin,
        "inLanguage": "fa-IR",
        "publisher": {"@id": f"{origin}/#organization"},
        "potentialAction": {
            "@type": "SearchAction",
            "target": f"{origin}/products?q={{search_term_string}}",
            "query-input": "required name=search_term_string",
        },
    }


@require_http_methods(["GET", "HEAD"])
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


@require_http_methods(["GET", "HEAD"])
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

    # Replace default title / description / static brand tags if present
    html = re.sub(r"<title>.*?</title>", "", html, count=1, flags=re.I | re.S)
    html = re.sub(
        r'<meta\s+name="description"\s+content="[^"]*"\s*/?>',
        "",
        html,
        count=1,
        flags=re.I,
    )
    html = re.sub(
        r'<meta\s+name="keywords"\s+content="[^"]*"\s*/?>',
        "",
        html,
        count=1,
        flags=re.I,
    )
    html = re.sub(
        r'<link\s+rel="canonical"\s+href="[^"]*"\s*/?>',
        "",
        html,
        count=1,
        flags=re.I,
    )
    html = re.sub(
        r'<script\s+type="application/ld\+json">.*?</script>',
        "",
        html,
        count=1,
        flags=re.I | re.S,
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


@require_http_methods(["GET", "HEAD"])
def seo_home(request):
    """Brand-rich crawlable homepage shell — critical for 'آنیل / Anil' queries."""
    origin = _site_origin(request)
    brand = _brand_name()
    title = f"{brand} | Anil Gold | فروشگاه طلا"
    description = (
        "گالری طلا آنیل (Anil Gold) — خرید زیورآلات طلا با قیمت لحظه‌ای ۱۸ عیار، "
        "فاکتور رسمی و ارسال بیمه‌شده. سایت رسمی آنیل: goldanil.ir"
    )
    canonical = f"{origin}/"
    try:
        site = SiteSettings.get_solo()
        if site.hero_subtitle:
            description = _plain_text(
                f"{brand} (Anil Gold) — {site.hero_subtitle} سایت رسمی: goldanil.ir",
                170,
            )
        image = None
        if site.hero_image:
            try:
                image = _abs_media(request, site.hero_image.url)
            except Exception:
                image = None
        if not image and site.brand_logo:
            try:
                image = _abs_media(request, site.brand_logo.url)
            except Exception:
                image = None
    except Exception:
        image = None

    posts = (
        ContentPage.objects.filter(is_published=True, page_type=ContentPage.PageType.BLOG)
        .exclude(slug="بلاگ")
        .order_by("order", "-created_at")[:8]
    )
    blog_links = "".join(
        f'<li><a href="{html_escape(origin)}/blog/{html_escape(p.slug)}">{html_escape(p.title)}</a></li>'
        for p in posts
    )
    article_html = (
        f"<main>"
        f"<h1>{html_escape(brand)} — Anil Gold</h1>"
        f"<p>{html_escape(description)}</p>"
        f"<p>نام‌های برند: آنیل، Anil، Anil Gold، گالری طلا آنیل، goldanil.ir</p>"
        f'<p><a href="{html_escape(origin)}/products">محصولات</a> · '
        f'<a href="{html_escape(origin)}/blog">بلاگ</a> · '
        f'<a href="{html_escape(origin)}/atelier">آتلیه</a></p>'
        + (f"<h2>آخرین نوشته‌های بلاگ</h2><ul>{blog_links}</ul>" if blog_links else "")
        + "</main>"
    )
    json_ld = {
        "@context": "https://schema.org",
        "@graph": [_organization_ld(origin, request), _website_ld(origin)],
    }
    return _inject_spa_seo(
        request=request,
        title=title,
        description=description,
        canonical=canonical,
        image=image,
        json_ld=json_ld,
        article_html=article_html,
        og_type="website",
    )


@require_http_methods(["GET", "HEAD"])
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
        "publisher": _organization_ld(origin, request),
        "isPartOf": {"@id": f"{origin}/#website"},
    }
    return _inject_spa_seo(
        request=request,
        title=title,
        description=description,
        canonical=canonical,
        json_ld=json_ld,
        article_html=article_html,
    )


@require_http_methods(["GET", "HEAD"])
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
        "author": {"@id": f"{origin}/#organization"},
        "publisher": _organization_ld(origin, request),
        "mainEntityOfPage": {"@type": "WebPage", "@id": canonical},
        "url": canonical,
        "isPartOf": {"@id": f"{origin}/#website"},
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


@require_http_methods(["GET", "HEAD"])
def seo_share_redirect(request, code: str):
    origin = _site_origin(request)
    try:
        page = ContentPage.objects.get(share_code=code, is_published=True)
    except ContentPage.DoesNotExist as exc:
        raise Http404("لینک نامعتبر است") from exc
    if page.page_type == ContentPage.PageType.BLOG:
        return HttpResponsePermanentRedirect(f"{origin}/blog/{page.slug}")
    return HttpResponsePermanentRedirect(f"{origin}/p/{page.slug}")
