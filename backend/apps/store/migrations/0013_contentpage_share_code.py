import secrets
import string

from django.db import migrations, models


def backfill_share_codes(apps, schema_editor):
    ContentPage = apps.get_model("store", "ContentPage")
    alphabet = string.ascii_lowercase + string.digits
    used = set(
        ContentPage.objects.exclude(share_code="")
        .exclude(share_code__isnull=True)
        .values_list("share_code", flat=True)
    )
    for page in ContentPage.objects.all():
        if page.share_code:
            continue
        for _ in range(30):
            code = "".join(secrets.choice(alphabet) for _ in range(8))
            if code not in used:
                page.share_code = code
                page.save(update_fields=["share_code"])
                used.add(code)
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
                db_index=True,
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
                db_index=True,
                help_text="کد کوتاه اشتراک‌گذاری — /b/<code>",
                max_length=12,
                unique=True,
            ),
        ),
    ]
