from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0005_hero_mode_default_image"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitesettings",
            name="hero_cta_primary_url",
            field=models.CharField(default="/products", max_length=200),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="hero_cta_secondary_url",
            field=models.CharField(default="#market", max_length=200),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="trust_heading",
            field=models.CharField(default="چرا آنیل؟", max_length=80),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="footer_tagline",
            field=models.CharField(
                blank=True,
                default="زیورآلات اصیل با قیمت شفاف و لحظه‌ای.",
                max_length=200,
            ),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="contact_phone",
            field=models.CharField(blank=True, default="021-12345678", max_length=40),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="contact_email",
            field=models.CharField(blank=True, default="info@anilgold.ir", max_length=120),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="contact_address",
            field=models.CharField(blank=True, default="تهران، بازار بزرگ طلا", max_length=300),
        ),
    ]
