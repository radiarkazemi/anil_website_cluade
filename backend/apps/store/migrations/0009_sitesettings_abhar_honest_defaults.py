"""Honest Abhar contact defaults + homepage section order.

On production (which already had store.0013), the equivalent change was
applied as store.0014_sitesettings_abhar_honest_defaults.
"""

from django.db import migrations, models


OLD_TEHRAN = "تهران، بازار بزرگ طلا"
OLD_PHONE = "021-12345678"
OLD_BANNER = "ارسال امن و بیمه‌شده به سراسر کشور · ضمانت اصالت و بازخرید · مشاوره‌ی رایگان تخصصی"

NEW_ADDRESS = "ابهر، استان زنجان"
NEW_BANNER = "قیمت‌گذاری لحظه‌ای بر پایه‌ی نرخ روز طلا · مشاوره حضوری در گالری آنیل، ابهر"

NEW_ORDER = [
    "hero",
    "rates",
    "featured",
    "categories",
    "collection",
    "calculator",
    "trust",
    "editorial",
    "contact",
]


def forwards(apps, schema_editor):
    SiteSettings = apps.get_model("store", "SiteSettings")
    for obj in SiteSettings.objects.all():
        changed = []
        if (obj.contact_address or "").strip() in ("", OLD_TEHRAN):
            obj.contact_address = NEW_ADDRESS
            changed.append("contact_address")
        phone = (obj.contact_phone or "").strip().replace(" ", "")
        if phone in ("", OLD_PHONE, "02112345678"):
            obj.contact_phone = ""
            changed.append("contact_phone")
        banner = obj.top_banner or ""
        if banner.strip() == OLD_BANNER or "بیمه‌شده" in banner or "فاکتور رسمی" in banner:
            obj.top_banner = NEW_BANNER
            changed.append("top_banner")
        order = list(obj.section_order or [])
        if not order or order == ["hero", "rates", "categories", "featured", "trust"] or order != NEW_ORDER:
            obj.section_order = NEW_ORDER
            if "section_order" not in changed:
                changed.append("section_order")
        if changed:
            obj.save(update_fields=changed)


def backwards(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0008_product_weight_nullable_needs_review"),
    ]

    operations = [
        migrations.AlterField(
            model_name="sitesettings",
            name="contact_address",
            field=models.CharField(
                blank=True, default="ابهر، استان زنجان", max_length=300
            ),
        ),
        migrations.AlterField(
            model_name="sitesettings",
            name="contact_phone",
            field=models.CharField(blank=True, default="", max_length=40),
        ),
        migrations.AlterField(
            model_name="sitesettings",
            name="top_banner",
            field=models.CharField(
                default="قیمت‌گذاری لحظه‌ای بر پایه‌ی نرخ روز طلا · مشاوره حضوری در گالری آنیل، ابهر",
                max_length=300,
            ),
        ),
        migrations.RunPython(forwards, backwards),
    ]
