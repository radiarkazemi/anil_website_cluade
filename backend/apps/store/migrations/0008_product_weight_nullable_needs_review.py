from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0007_hero_album_and_domain_email"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="needs_review",
            field=models.BooleanField(
                db_index=True,
                default=False,
                help_text="وزن/نام/توضیحات نیاز به بازبینی ادمین دارد",
            ),
        ),
        migrations.AlterField(
            model_name="product",
            name="weight_g",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="وزن به گرم — خالی تا زمان تأیید وزن واقعی",
                max_digits=8,
                null=True,
            ),
        ),
    ]
