"""Create (or promote) a Super Admin without a prompt.

The first admin on a fresh deployment is a chicken-and-egg problem: the admin
screens need an admin, and the public admin sign-up page reads
`ADMIN_REGISTRATION_TOKEN`, which nothing passes to the deployed container — so
that page can't work in production at all.

`createsuperuser` works but asks four questions, which is awkward down a
container exec and impossible in a one-shot job. This does the same job in one
line, and is safe to run twice:

    python manage.py create_admin --email eric@example.com --name "Eric Moore"

With no `--password` it generates one and prints it once. An existing account is
promoted rather than duplicated, and its password is left alone unless a new one
is given — so a stray second run can't lock anybody out.
"""

import secrets

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email

from apps.accounts.models import User
from common.rbac import SUPER_ADMIN


class Command(BaseCommand):
    help = "Create a Super Admin, or promote an existing account to one."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True, help="Sign-in address for the admin.")
        parser.add_argument("--name", default="", help='Display name, e.g. "Eric Moore".')
        parser.add_argument("--username", default="", help="Defaults to the part before the @.")
        parser.add_argument(
            "--password",
            default="",
            help="Leave empty to generate one and print it once.",
        )

    def handle(self, *args, **options):
        email = options["email"].strip().lower()
        try:
            validate_email(email)
        except ValidationError as error:
            raise CommandError(f"{email!r} is not a valid email address.") from error

        password = options["password"].strip()
        generated = not password
        if generated:
            password = secrets.token_urlsafe(10)

        existing = User.objects.filter(email__iexact=email).first()
        if existing:
            existing.role = "admin"
            existing.admin_role = SUPER_ADMIN
            existing.is_staff = True
            existing.is_superuser = True
            existing.is_active = True
            fields = ["role", "admin_role", "is_staff", "is_superuser", "is_active"]
            # Only touch the password when a new one was actually asked for:
            # re-running this must never lock out the person already using it.
            if not generated:
                existing.set_password(password)
                existing.must_change_password = False
                fields += ["password", "must_change_password"]
            existing.save(update_fields=fields)
            self.stdout.write(self.style.SUCCESS(f"{email} is now a Super Admin."))
            if not generated:
                self.stdout.write("Its password was set to the one you passed.")
            else:
                self.stdout.write("Its password was left as it was.")
            return

        name = options["name"].strip() or email.split("@")[0]
        username = options["username"].strip() or email.split("@")[0]
        if User.objects.filter(username__iexact=username).exists():
            raise CommandError(
                f"The username {username!r} is taken. Pass a different --username."
            )

        first, _, last = name.partition(" ")
        User.objects.create_superuser(
            email=email,
            username=username,
            display_name=name,
            password=password,
            first_name=first,
            last_name=last,
            # A generated password is a handover, not a chosen one.
            must_change_password=generated,
        )

        self.stdout.write(self.style.SUCCESS(f"Super Admin created: {email}"))
        if generated:
            self.stdout.write("")
            self.stdout.write(f"  Password: {password}")
            self.stdout.write("")
            self.stdout.write(
                "That's the only time it's shown. You'll be asked to change it at first sign-in."
            )
