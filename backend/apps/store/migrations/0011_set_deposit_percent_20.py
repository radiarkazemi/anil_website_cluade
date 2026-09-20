from decimal import Decimal

from django.db import migrations, models


def set_percent(apps, schema_editor):
    SiteSettings = apps.get_model("store", "SiteSettings")
    SiteSettings.objects.all().update(made_to_order_deposit_percent=Decimal("20"))


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0009_made_to_order_deposit_reserve"),
    ]

    operations = [
        migrations.AlterField(
            model_name="sitesettings",
            name="made_to_order_deposit",
            field=models.BigIntegerField(
                default=5000000,
                help_text="مبلغ رزرو جایگزین وقتی تخمین قیمت ممکن نیست (تومان)",
            ),
        ),
        migrations.AlterField(
            model_name="sitesettings",
            name="made_to_order_deposit_percent",
            field=models.DecimalField(
                decimal_places=2,
                default=20,
                help_text="درصد مبلغ رزرو از قیمت تقریبی (شامل اجرت/سود/مالیات — فقط مبلغ نهایی به مشتری)",
                max_digits=5,
            ),
        ),
        migrations.RunPython(set_percent, migrations.RunPython.noop),
    ]
