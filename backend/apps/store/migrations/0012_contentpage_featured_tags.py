from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0011_contentpage_share_code"),
    ]

    operations = [
        migrations.AddField(
            model_name="contentpage",
            name="is_featured",
            field=models.BooleanField(
                db_index=True,
                default=False,
                help_text="اگر بلاگ باشد، به‌عنوان بنر اول مجله نمایش داده می‌شود",
            ),
        ),
        migrations.AddField(
            model_name="contentpage",
            name="tags",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
