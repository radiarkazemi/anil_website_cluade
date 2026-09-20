import secrets
import string

from django.db import migrations, models


def backfill_share_codes(apps, schema_editor):
    ContentPage = apps.get_model("store", "ContentPage")
    alphabet = string.ascii_lowercase + string.digits
    used = set()
    for page in ContentPage.objects.all():
        code = (page.share_code or "").strip()
        if code:
            used.add(code)
            continue
        for _ in range(40):
            candidate = "".join(secrets.choice(alphabet) for _ in range(8))
            if candidate not in used:
                page.share_code = candidate
                page.save(update_fields=["share_code"])
                used.add(candidate)
                break


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0012_orders_enabled"),
    ]

    operations = [
        migrations.AddField(
            model_name="contentpage",
            name="share_code",
            field=models.CharField(
                blank=True,
                default="",
                help_text="کد کوتاه اشتراک‌گذاری — /b/<code>",
                max_length=12,
            ),
        ),
        migrations.RunPython(backfill_share_codes, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="contentpage",
            name="share_code",
            field=models.CharField(
                blank=True,
                help_text="کد کوتاه اشتراک‌گذاری — /b/<code>",
                max_length=12,
                unique=True,
            ),
        ),
    ]
