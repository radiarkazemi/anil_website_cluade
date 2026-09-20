from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0008_product_weight_nullable_needs_review"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitesettings",
            name="orders_enabled",
            field=models.BooleanField(
                default=False,
                help_text="اگر خاموش باشد، ثبت سفارش و پرداخت در فروشگاه غیرفعال است",
            ),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="sales_closed_message",
            field=models.CharField(
                blank=True,
                default="فروش آنلاین موقتاً بسته است. به‌زودی با درگاه پرداخت باز می‌شود.",
                help_text="پیام نمایشی وقتی سفارش‌گیری بسته است",
                max_length=300,
            ),
        ),
    ]
