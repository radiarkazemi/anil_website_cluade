# Generated manually for payment gateway fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="payment_gateway",
            field=models.CharField(blank=True, default="", help_text="zarinpal | idpay | …", max_length=20),
        ),
        migrations.AddField(
            model_name="order",
            name="payment_authority",
            field=models.CharField(blank=True, db_index=True, max_length=80),
        ),
        migrations.AddField(
            model_name="order",
            name="payment_ref_id",
            field=models.CharField(blank=True, max_length=80),
        ),
        migrations.AddField(
            model_name="order",
            name="payment_raw",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddIndex(
            model_name="order",
            index=models.Index(fields=["status", "-created_at"], name="orders_orde_status_c918eb_idx"),
        ),
        migrations.AddIndex(
            model_name="order",
            index=models.Index(fields=["phone", "-created_at"], name="orders_orde_phone_7a2b1c_idx"),
        ),
    ]
