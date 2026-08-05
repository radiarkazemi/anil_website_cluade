from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0003_site_settings_and_pages"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitesettings",
            name="hero_mode",
            field=models.CharField(
                choices=[("3d", "مدل سه‌بعدی WebGL"), ("image", "تصویر ۲بعدی")],
                default="3d",
                help_text="هیرو: حلقه طلای ۳بعدی واقعی یا تصویر آپلودشده",
                max_length=12,
            ),
        ),
    ]
