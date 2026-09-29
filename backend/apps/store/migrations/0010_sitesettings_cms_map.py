from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0009_sitesettings_abhar_honest_defaults"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitesettings",
            name="contact_kicker",
            field=models.CharField(blank=True, default="درخشش با ما", max_length=80),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="contact_title",
            field=models.CharField(blank=True, default="در شهر ابهر، در کنار شما", max_length=160),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="contact_body",
            field=models.TextField(
                blank=True,
                default=(
                    "گالری طلای آنیل در ابهر — مشاوره حضوری، قیمت شفاف بر پایه نرخ روز، "
                    "و همراهی برای انتخاب درست."
                ),
            ),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="contact_cta_label",
            field=models.CharField(blank=True, default="تماس با ما", max_length=80),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="contact_image",
            field=models.ImageField(blank=True, null=True, upload_to="site/"),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="map_embed_url",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="map_query",
            field=models.CharField(
                blank=True,
                default="",
                help_text="عبارت جستجوی نقشه؛ خالی = آدرس تماس",
                max_length=300,
            ),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="footer_copyright",
            field=models.CharField(
                blank=True,
                default="تمامی حقوق برای گالری طلای آنیل محفوظ است.",
                max_length=200,
            ),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="footer_about_heading",
            field=models.CharField(blank=True, default="گالری طلای آنیل", max_length=80),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="cms",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="products_promo_image",
            field=models.ImageField(blank=True, null=True, upload_to="site/"),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="moments_image",
            field=models.ImageField(blank=True, null=True, upload_to="site/"),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="collection_image",
            field=models.ImageField(blank=True, null=True, upload_to="site/"),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="editorial_image",
            field=models.ImageField(blank=True, null=True, upload_to="site/"),
        ),
    ]
