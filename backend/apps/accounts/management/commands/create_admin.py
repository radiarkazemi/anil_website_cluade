from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()


class Command(BaseCommand):
    help = "Create default admin user for the custom panel (phone login)"

    def add_arguments(self, parser):
        parser.add_argument("--phone", default="radiar9841")
        parser.add_argument("--password", required=True, help="Admin password (do not commit secrets)")
        parser.add_argument("--name", default="Radiar")

    def handle(self, *args, **options):
        phone = options["phone"]
        password = options["password"]
        name = options["name"]
        user, created = User.objects.get_or_create(
            phone=phone,
            defaults={
                "full_name": name,
                "role": User.Role.ADMIN,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        user.full_name = name
        user.role = User.Role.ADMIN
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save()
        self.stdout.write(
            self.style.SUCCESS(
                f"{'Created' if created else 'Updated'} admin → phone={phone} password={password}"
            )
        )
