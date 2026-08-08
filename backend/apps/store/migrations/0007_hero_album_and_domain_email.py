import uuid

import django.db.models.deletion
from django.db import migrations, models


def migrate_legacy_hero(apps, schema_editor):
    SiteSettings = apps.get_model("store", "SiteSettings")
    HeroAlbumSlide = apps.get_model("store", "HeroAlbumSlide")
    for site in SiteSettings.objects.all():
        if not site.hero_image:
            continue
        if HeroAlbumSlide.objects.filter(settings_id=site.pk).exists():
            continue
        HeroAlbumSlide.objects.create(
            id=uuid.uuid4(),
            settings_id=site.pk,
            image=site.hero_image,
            alt_text="هیرو",
            caption="",
            sort_order=0,
            is_active=True,
        )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0006_sitesettings_layout_extras"),
    ]

    operations = [
        migrations.AlterField(
            model_name="sitesettings",
            name="contact_email",
            field=models.CharField(blank=True, default="info@goldanil.ir", max_length=120),
        ),
        migrations.CreateModel(
            name="HeroAlbumSlide",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("image", models.ImageField(upload_to="hero/album/")),
                ("alt_text", models.CharField(blank=True, max_length=200)),
                ("caption", models.CharField(blank=True, max_length=160)),
                ("sort_order", models.PositiveIntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "settings",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="hero_album",
                        to="store.sitesettings",
                    ),
                ),
            ],
            options={
                "verbose_name": "اسلاید آلبوم هیرو",
                "verbose_name_plural": "آلبوم هیرو",
                "ordering": ["sort_order", "created_at"],
            },
        ),
        migrations.RunPython(migrate_legacy_hero, noop_reverse),
    ]
