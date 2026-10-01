import secrets
import string

from django.db import connection, migrations, models


def _has_share_code_column() -> bool:
    with connection.cursor() as cursor:
        vendor = connection.vendor
        if vendor == "postgresql":
            cursor.execute(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'store_contentpage' AND column_name = 'share_code'
                """
            )
            return bool(cursor.fetchone())
        if vendor == "sqlite":
            cursor.execute("PRAGMA table_info(store_contentpage)")
            return any(row[1] == "share_code" for row in cursor.fetchall())
    return False


def ensure_share_code_column(apps, schema_editor):
    if _has_share_code_column():
        return
    ContentPage = apps.get_model("store", "ContentPage")
    field = models.CharField(
        blank=True,
        default="",
        help_text="کد کوتاه اشتراک‌گذاری — /b/<code>",
        max_length=12,
    )
    field.set_attributes_from_name("share_code")
    schema_editor.add_field(ContentPage, field)


def backfill_share_codes(apps, schema_editor):
    ContentPage = apps.get_model("store", "ContentPage")
    alphabet = string.ascii_lowercase + string.digits
    used = set(
        ContentPage.objects.exclude(share_code="")
        .exclude(share_code__isnull=True)
        .values_list("share_code", flat=True)
    )
    for page in ContentPage.objects.all():
        code = (page.share_code or "").strip()
        if code:
            used.add(code)
            continue
        for _ in range(40):
            candidate = "".join(secrets.choice(alphabet) for _ in range(8))
            if candidate not in used:
                page.share_code = candidate
                page.save(update_fields=["share_code"])
                used.add(candidate)
                break


def ensure_unique(apps, schema_editor):
    """Ensure unique constraint exists without failing if already present."""
    with connection.cursor() as cursor:
        if connection.vendor != "postgresql":
            return
        cursor.execute(
            """
            SELECT 1 FROM pg_constraint
            WHERE conname = 'store_contentpage_share_code_key'
            """
        )
        if cursor.fetchone():
            return
        cursor.execute(
            """
            ALTER TABLE store_contentpage
            ADD CONSTRAINT store_contentpage_share_code_key UNIQUE (share_code)
            """
        )


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0010_sitesettings_cms_map"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name="contentpage",
                    name="share_code",
                    field=models.CharField(
                        blank=True,
                        default="",
                        help_text="کد کوتاه اشتراک‌گذاری — /b/<code>",
                        max_length=12,
                    ),
                ),
            ],
            database_operations=[
                migrations.RunPython(ensure_share_code_column, migrations.RunPython.noop),
            ],
        ),
        migrations.RunPython(backfill_share_codes, migrations.RunPython.noop),
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name="contentpage",
                    name="share_code",
                    field=models.CharField(
                        blank=True,
                        help_text="کد کوتاه اشتراک‌گذاری — /b/<code>",
                        max_length=12,
                        unique=True,
                    ),
                ),
            ],
            database_operations=[
                migrations.RunPython(ensure_unique, migrations.RunPython.noop),
            ],
        ),
    ]
