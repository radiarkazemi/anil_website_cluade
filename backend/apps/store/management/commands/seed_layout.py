"""Seed default jewelry categories with images + content pages + site layout."""

from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.store.models import Category, ContentPage, SiteSettings

CATS = [
    ("سرویس", "cat-service.png", 1),
    ("نیم ست", "cat-halfset.png", 2),
    ("انگشتر", "cat-ring.png", 3),
    ("سولیتر", "cat-solitaire.png", 4),
    ("النگو", "cat-bangle.png", 5),
    ("گوشواره", "cat-earrings.png", 6),
    ("گردنی", "cat-pendant.png", 7),
    ("زنجیر", "cat-chain.png", 8),
    ("دستبند", "cat-bracelet.png", 9),
]

GUIDE_BODY = """خرید طلا از گالری آنیل ساده و شفاف است.

۱. انتخاب محصول
از دسته‌بندی‌ها یا صفحه محصولات، قطعه‌ی موردنظر را انتخاب کنید. وزن، عیار و اجرت روی هر کارت مشخص است.

۲. قیمت لحظه‌ای
قیمت نهایی بر اساس نرخ زنده طلای ۱۸ عیار محاسبه می‌شود و در لحظه‌ی ثبت سفارش روی سرور قفل می‌شود.

۳. ثبت سفارش
نام، شماره تماس و آدرس را وارد کنید. تیم ما برای تأیید نهایی با شما تماس می‌گیرد.

۴. اصالت و ارسال
تمام قطعات با فاکتور رسمی و بسته‌بندی امن ارسال می‌شوند. امکان بازخرید طبق شرایط گالری وجود دارد.

۵. مشاوره
برای انتخاب وزن و مدل مناسب، از طریق واتساپ یا تلفن گالری با مشاوران ما در ارتباط باشید.
"""

BLOG_INTRO = """در بلاگ آنیل، نکات نگهداری طلا، روند بازار و راهنمای انتخاب زیورآلات را می‌خوانید.

هر هفته محتوای تازه درباره‌ی عیار، اجرت، و استایل‌های روز منتشر می‌کنیم.
"""


class Command(BaseCommand):
    help = "Seed Anil categories (9), content pages, and default site layout/hero"

    def handle(self, *args, **options):
        root = Path(__file__).resolve().parents[5]
        img_dir = root / "data" / "category-images"
        hero_src = img_dir / "hero-ring.png"
        logo_src = root / "frontend" / "public" / "logo.png"
        if not logo_src.exists():
            logo_src = root / "frontend" / "public" / "logo.jpg"

        # Categories
        keep_names = {n for n, _, _ in CATS}
        for name, fname, order in CATS:
            slug = slugify(name, allow_unicode=True)
            cat, created = Category.objects.update_or_create(
                name=name,
                defaults={
                    "slug": slug,
                    "order": order,
                    "display_count": 12 + order * 3,
                    "is_active": True,
                    "description": f"مجموعه‌ی {name} گالری آنیل",
                },
            )
            path = img_dir / fname
            if path.exists() and (created or not cat.image):
                with path.open("rb") as fh:
                    cat.image.save(fname, File(fh), save=True)
            self.stdout.write(f"  category {'+' if created else '~'} {name}")

        # Deactivate old categories not in the new set (keep products linked)
        Category.objects.exclude(name__in=keep_names).update(is_active=False)

        # Site settings
        site = SiteSettings.load()
        site.brand_name = "Anil"
        site.brand_tagline = "درخششی ابدی"
        site.cart_label = "گلد باکس"
        site.hero_badge = "گالری طلا آنیل"
        site.hero_title = "طلا،\nآن‌گونه که باید بدرخشد"
        site.hero_mode = "image"
        site.section_order = ["hero", "rates", "categories", "featured", "trust"]
        if hero_src.exists() and not site.hero_image:
            with hero_src.open("rb") as fh:
                site.hero_image.save("hero-ring.png", File(fh), save=False)
        if logo_src.exists():
            with logo_src.open("rb") as fh:
                site.brand_logo.save(logo_src.name, File(fh), save=False)
        site.save()
        self.stdout.write(self.style.SUCCESS("Site settings ready"))

        # Content pages
        ContentPage.objects.update_or_create(
            slug="راهنمای-خرید",
            defaults={
                "title": "راهنمای خرید",
                "page_type": ContentPage.PageType.PAGE,
                "excerpt": "از انتخاب تا تحویل — راهنمای کامل خرید از گالری آنیل",
                "body": GUIDE_BODY,
                "is_published": True,
                "show_in_nav": True,
                "order": 1,
            },
        )
        ContentPage.objects.update_or_create(
            slug="بلاگ",
            defaults={
                "title": "بلاگ آنیل",
                "page_type": ContentPage.PageType.BLOG,
                "excerpt": "نکات طلا، بازار و استایل",
                "body": BLOG_INTRO,
                "is_published": True,
                "show_in_nav": True,
                "order": 2,
            },
        )
        ContentPage.objects.update_or_create(
            slug="نگهداری-طلا",
            defaults={
                "title": "چگونه از طلای خود مراقبت کنیم؟",
                "page_type": ContentPage.PageType.BLOG,
                "excerpt": "راهنمای نگهداری روزانه زیورآلات طلا",
                "body": "طلا را دور از مواد شیمیایی و رطوبت زیاد نگه دارید.\n\nپس از استفاده، با پارچه‌ی نرم پاک کنید و جدا از جواهرات دیگر نگهداری کنید تا خراشیده نشود.\n\nبرای پولیش تخصصی، به گالری آنیل مراجعه کنید.",
                "is_published": True,
                "show_in_nav": False,
                "order": 3,
            },
        )
        self.stdout.write(self.style.SUCCESS("Content pages ready"))
