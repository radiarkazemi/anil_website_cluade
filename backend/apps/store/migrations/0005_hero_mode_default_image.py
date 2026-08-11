from django.db import migrations, models


def set_default_image(apps, schema_editor):
    SiteSettings = apps.get_model("store", "SiteSettings")
    SiteSettings.objects.all().update(hero_mode="image")


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0004_sitesettings_hero_mode"),
    ]

    operations = [
        migrations.AlterField(
            model_name="sitesettings",
            name="hero_mode",
            field=models.CharField(
                choices=[
                    ("image", "تصویر واقعی (پیش‌فرض)"),
                    ("3d", "مدل ۳بعدی — فقط با کلیک کاربر"),
                ],
                default="image",
                help_text="هیرو همیشه با تصویر واقعی لود می‌شود؛ ۳بعدی فقط بعد از کلیک کاربر بارگذاری می‌شود",
                max_length=12,
            ),
        ),
        migrations.RunPython(set_default_image, migrations.RunPython.noop),
    ]
