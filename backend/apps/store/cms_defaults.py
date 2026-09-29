"""Default storefront copy — every key is editable via SiteSettings.cms / admin layout."""


def default_cms():
    return {
        "blog": {
            "hero_title": "مجله آنیل",
            "hero_subtitle": "همه‌چیز درباره طلا، سبک زندگی و بازار",
            "hero_lead": "راهنمای خرید، نگهداری، آموزش تخصصی و تحلیل بازار طلا — از گالری آنیل.",
            "latest_kicker": "همه مقالات",
            "latest_title": "آخرین مطالب مجله",
            "cta_label": "مطالعه مقاله",
        },
        "products_promo": {
            "title": "مجموعه‌ای از زیبایی ماندگار",
            "subtitle": "طراحی‌های خاص، مناسب لحظه‌های مهم زندگی شما",
            "cta_label": "مشاهده کلکسیون",
            "cta_url": "/products",
            "image_path": "/home/collection-banner.webp",
        },
        "products_page": {
            "crumb_home": "خانه",
            "all_label": "همه محصولات",
            "filter_label": "فیلترها",
            "sort_label": "مرتب‌سازی",
            "load_more": "مشاهده بیشتر",
            "empty": "محصولی با این فیلترها پیدا نشد.",
        },
        "moments": {
            "title": "طلا در لحظه‌های خاص زندگی شما",
            "subtitle": "قطعات منتخب گالری را برای مناسبت‌های مهم ببینید.",
            "cta_label": "مشاهده گالری",
            "cta_url": "/products",
            "image_path": "/home/editorial-triptych.webp",
        },
        "collection": {
            "title": "مجموعه‌ای از زیبایی ماندگار",
            "subtitle": "طراحی‌های خاص، مناسب لحظه‌های مهم زندگی شما",
            "cta_label": "مشاهده کلکسیون",
            "cta_url": "/products",
            "image_path": "/home/collection-banner.webp",
        },
        "editorial": {
            "title": "از کارگاه تا درخشش",
            "subtitle": "داستان ساخت و انتخاب هوشمند طلا در گالری آنیل",
            "cta_label": "بیشتر بدانید",
            "cta_url": "/atelier",
            "image_path": "/home/editorial-triptych.webp",
        },
        "why_anil": {
            "subtitle": "شفافیت قیمت، کیفیت ساخت، و همراهی واقعی برای انتخاب درست.",
            "items": [
                {
                    "title": "قیمت لحظه‌ای",
                    "body": "نرخ روز طلا به‌صورت زنده روی سایت به‌روز می‌شود.",
                },
                {
                    "title": "عیار ۱۸",
                    "body": "قطعات گالری بر پایه طلای ۱۸ عیار قیمت‌گذاری می‌شوند.",
                },
                {
                    "title": "مشاوره حضوری",
                    "body": "در ابهر کنار شما هستیم تا انتخاب مطمئن داشته باشید.",
                },
                {
                    "title": "خرید شفاف",
                    "body": "وزن، اجرت و جزئیات قیمت قبل از سفارش مشخص است.",
                },
            ],
        },
        "footer": {
            "customers_title": "خدمات مشتریان",
            "categories_title": "دسته‌بندی‌ها",
            "quick_title": "دسترسی سریع",
            "about_title": "گالری طلای آنیل",
            "customers_links": [
                {"label": "راهنمای خرید", "href": "/p/راهنمای-خرید"},
                {"label": "نحوه سفارش", "href": "/p/راهنمای-خرید"},
                {"label": "بلاگ و آموزش", "href": "/blog"},
            ],
            "quick_links": [
                {"label": "محصولات", "href": "/products"},
                {"label": "راهنمای خرید", "href": "/p/راهنمای-خرید"},
                {"label": "بلاگ", "href": "/blog"},
                {"label": "درباره ما", "href": "/p/درباره-ما"},
                {"label": "تماس با ما", "href": "#contact"},
            ],
            "legal_links": [
                {"label": "حریم خصوصی", "href": "/p/حریم-خصوصی"},
                {"label": "شرایط استفاده", "href": "/p/شرایط-استفاده"},
                {"label": "نقشه سایت", "href": "/"},
            ],
            "website_url": "https://goldanil.ir",
        },
        "header": {
            "search_placeholder": "جستجو در گالری طلا، دسته‌بندی‌ها و...",
        },
        "home": {
            "featured_title": "محصولات منتخب",
            "featured_subtitle": "جدیدترین و محبوب‌ترین زیورآلات آنیل",
            "featured_all": "مشاهده همه",
            "categories_title": "دسته‌بندی محصولات",
            "categories_subtitle": "دسته‌بندی مورد علاقه خود را انتخاب کنید",
            "categories_all": "مشاهده همه دسته‌ها",
            "category_cta": "مشاهده محصولات",
            "calculator_title": "محاسبه قیمت آنلاین طلا",
            "calculator_subtitle": "به‌سادگی وزن و عیار را وارد کنید تا قیمت تقریبی را مشاهده نمایید.",
            "calculator_weight_label": "وزن (گرم)",
            "calculator_karat_label": "عیار طلا",
            "calculator_result_label": "قیمت تقریبی",
            "rates_live": "به‌روزرسانی زنده قیمت‌ها",
            "rates_stale": "نرخ ممکن است به‌روز نباشد",
            "rates_empty": "نرخ طلا در دسترس نیست — کمی بعد دوباره تلاش کنید",
        },
        "map": {
            "open_label": "باز کردن در گوگل‌مپ",
            "iframe_title": "موقعیت گالری روی نقشه گوگل",
        },
        "ops": {
            "shipping_note": "هماهنگی ارسال پس از تأیید سفارش با گالری",
            "tax_note": "مالیات طبق قوانین جاری روی اجرت و سود محاسبه می‌شود",
            "low_stock_threshold": 2,
        },
    }


def deep_merge(base: dict, override) -> dict:
    """Merge override into a deep copy of base (dicts only)."""
    import copy

    out = copy.deepcopy(base)
    if not isinstance(override, dict):
        return out
    for key, val in override.items():
        if isinstance(val, dict) and isinstance(out.get(key), dict):
            out[key] = deep_merge(out[key], val)
        else:
            out[key] = val
    return out


def merged_cms(raw) -> dict:
    return deep_merge(default_cms(), raw if isinstance(raw, dict) else {})
