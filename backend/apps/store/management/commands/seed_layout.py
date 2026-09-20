"""Seed default jewelry categories with images + content pages + site layout."""

from __future__ import annotations

import sys
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

BLOG_INTRO = """در بلاگ آنیل، مطالب کاربردی و مستند درباره عیار، فرمول قیمت و سرمایه‌گذاری در طلا می‌خوانید.

هدف ما این است که قبل از خرید، با عدد و منطق تصمیم بگیرید — نه فقط با حس و تبلیغ.
"""

BLOG_KARAT = """عیار (Karat) نسبت جرم طلای خالص به جرم کل آلیاژ است. طبق استاندارد متداول جواهرسازی، طلای ۲۴ عیار تقریباً خالص در نظر گرفته می‌شود (۲۴/۲۴).

بنابراین طلای ۱۸ عیار یعنی ۱۸ قسمت از ۲۴ قسمت آلیاژ، طلای خالص است: ۱۸÷۲۴ = ۰٫۷۵ یا ۷۵٪ طلا. بقیه معمولاً مس، نقره یا سایر فلزات برای سختی و رنگ است.

در بازار ایران، زیورآلات روزمره عمدتاً ۱۸ عیار عرضه می‌شوند؛ چون تعادل خوبی بین درخشش، دوام و قیمت ایجاد می‌کند. طلای ۲۱ یا ۲۲ عیار نرم‌تر و برای ساخت ظریف‌تر حساس‌تر است.

برای سنجش واقعی، علاوه بر مُهر عیار روی قطعه، آزمایشگاه‌های عیارسنجی و دستگاه XRF ترکیب فلزی را گزارش می‌کنند. اگر قطعه مُهر معتبر و فاکتور رسمی نداشته باشد، صرفاً به ظاهر براق اعتماد نکنید.

جمع‌بندی کاربردی برای خریدار: وقتی می‌گوییم «نرخ طلای ۱۸»، منظور قیمت هر گرم آلیاژ ۷۵٪ طلاست — نه طلای خالص ۲۴. این پایه همان فرمول قیمت‌گذاری گالری است.
"""

BLOG_PRICE = """قیمت نهایی زیورآلات طلا در ایران معمولاً از چند جزء شفاف تشکیل می‌شود که باید روی فاکتور قابل پیگیری باشد.

۱) ارزش طلای خام: وزن (گرم) × نرخ روز طلای همان عیار. برای ۱۸ عیار، نرخ اعلامی بازار به ازای هر گرم ۱۸ عیار استفاده می‌شود.

۲) اجرت ساخت: درصدی از ارزش طلای خام (نه یک عدد مبهم). اجرت هزینه طراحی، ساخت و پرداخت قطعه است و بین مدل‌های ساده و پرکار تفاوت دارد.

۳) سود فروشنده: در بسیاری از واحدها روی مجموع طلا + اجرت اعمال می‌شود؛ در آنیل این جزء داخل جمع نهایی لحاظ می‌شود و در جدول مشتری جداگانه نمایش داده نمی‌شود تا با اجرت اشتباه گرفته نشود.

۴) مالیات ارزش افزوده: طبق رویه رایج صنف، مالیات معمولاً روی (اجرت + سود) محاسبه می‌شود نه روی کل ارزش طلای خام — چون طلای خام خود دارایی پایه است. نرخ متداول ۹٪ است؛ جزئیات را همیشه با فاکتور همان روز تطبیق دهید.

۵) سنگ و نگین: اگر قطعه نگین داشته باشد، ارزش سنگ جداگانه افزوده می‌شود.

فرمول خلاصه (سنگ صفر):
طلا = وزن × نرخ
اجرت = طلا × نسبت اجرت
سود = (طلا + اجرت) × نسبت سود
مالیات = (اجرت + سود) × ۰٫۰۹
جمع = طلا + اجرت + سود + مالیات

چرا این برای شما مهم است؟ چون با دانستن وزن و اجرت می‌توانید قبل از خرید، با ماشین‌حساب آتلیه آنیل یک برآورد نزدیک به فاکتور بسازید و گزینه‌های ویترین را منطقی‌تر مقایسه کنید.
"""

BLOG_INVEST = """طلا هم مصرف تزئینی دارد و هم ویژگی حفظ ارزش. اما «طلای ساخته‌شده» با «شمش/سکه بانکی» از نظر نقدشوندگی و هزینه ورود یکسان نیست.

شمش و سکه استاندارد معمولاً اجرت ساخت بسیار پایین‌تری نسبت به زیورآلات ظریف دارند؛ در عوض کاربرد روزمره و حس هدیه کمتری می‌دهند. زیورآلات، اجرت و مالیات بیشتری در قیمت خرید می‌نشانند؛ بنابراین اگر هدف صرفاً سرمایه‌گذاری کوتاه‌مدت و نقد کردن سریع باشد، اختلاف اجرت می‌تواند بازده را کم کند.

از نگاه فیزیکی، جرم طلای خالص داخل یک قطعه ۱۸ عیار برابر است با وزن × ۰٫۷۵. ارزش ذاتی فلز تقریباً به همین جرم × نرخ طلای خالص وابسته است؛ هرچه اجرت بالاتر باشد، فاصله قیمت خرید تا ارزش ذاتی بیشتر می‌شود.

شاخص‌های عملی برای تصمیم مشتری:
• افق نگهداری: هدیه یا استفاده روزانه → زیور؛ ذخیره ارزش با نقدشوندگی بالاتر → سکه/شمش یا قطعات سنگین‌تر کم‌اجرت.
• نسبت اجرت به وزن: برای سرمایه، اجرت پایین‌تر معمولاً منطقی‌تر است.
• فاکتور و اصالت: بدون فاکتور رسمی و عیار مشخص، ریسک فروش مجدد بیشتر است.
• نقدینگی بازار محلی: قطعات با وزن و مدل رایج راحت‌تر خریدار پیدا می‌کنند.

در گالری آنیل می‌توانید با فیلتر وزن و اجرت، قطعات نزدیک به هدف سرمایه‌ای یا هدیه‌ای را ببینید؛ و با مشاور هوشمند، بازه وزن/بودجه را دقیق‌تر کنید. این یادداشت جایگزین مشاوره مالی شخصی نیست، اما چارچوب محاسباتی شفاف برای مقایسه گزینه‌هاست.
"""


def _force_utf8_stdio() -> None:
    """Avoid UnicodeEncodeError on Windows consoles (cp1256 / cp1252)."""
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass


class Command(BaseCommand):
    help = "Seed Anil categories (9), content pages, and default site layout/hero"

    def say(self, msg: str, *, style=None) -> None:
        text = style(msg) if style else msg
        try:
            self.stdout.write(text)
        except UnicodeEncodeError:
            enc = getattr(self.stdout, "encoding", None) or "ascii"
            safe = text.encode(enc, errors="replace").decode(enc, errors="replace")
            self.stdout.write(safe)

    def handle(self, *args, **options):
        _force_utf8_stdio()

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
            mark = "+" if created else "~"
            self.say(f"  category {mark} {name} ({slug})")

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
        self.say("Site settings ready", style=self.style.SUCCESS)

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
            slug="عیار-طلا-۱۸-چیست",
            defaults={
                "title": "عیار طلا چیست؟ ۱۸ عیار دقیقاً یعنی چه؟",
                "page_type": ContentPage.PageType.BLOG,
                "excerpt": "تعریف علمی عیار، نسبت ۷۵٪ طلای خالص در ۱۸ عیار، و کاربردش در خرید روزمره",
                "body": BLOG_KARAT,
                "is_published": True,
                "show_in_nav": False,
                "order": 3,
            },
        )
        ContentPage.objects.update_or_create(
            slug="فرمول-قیمت-طلا-ایران",
            defaults={
                "title": "فرمول قیمت طلا در ایران: وزن، اجرت، سود و مالیات",
                "page_type": ContentPage.PageType.BLOG,
                "excerpt": "اجزای فاکتور رسمی را با منطق عددی بشناسید تا قبل از خرید برآورد واقعی بسازید",
                "body": BLOG_PRICE,
                "is_published": True,
                "show_in_nav": False,
                "order": 4,
            },
        )
        ContentPage.objects.update_or_create(
            slug="طلای-ساخته-یا-سکه",
            defaults={
                "title": "طلای ساخته‌شده یا سکه/شمش؟ مقایسه علمی برای خریدار",
                "page_type": ContentPage.PageType.BLOG,
                "excerpt": "تفاوت اجرت، نقدشوندگی و ارزش ذاتی فلز — با شاخص‌های عملی تصمیم‌گیری",
                "body": BLOG_INVEST,
                "is_published": True,
                "show_in_nav": False,
                "order": 5,
            },
        )
        # Keep legacy slug unpublished so the listing shows the three evidence-based posts
        ContentPage.objects.filter(slug="نگهداری-طلا").update(is_published=False)
        self.say("Content pages ready", style=self.style.SUCCESS)
        self.say("Done.", style=self.style.SUCCESS)
