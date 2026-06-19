from django.db import migrations, models


def backfill_admin_role(apps, schema_editor):
    """Admins created before tiers existed are the founders: make them Super Admins."""
    User = apps.get_model("accounts", "User")
    User.objects.filter(role="admin", admin_role__isnull=True).update(admin_role="super_admin")


def clear_admin_role(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    User.objects.filter(role="admin").update(admin_role=None)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_studentprofile_selected_tracks"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="admin_role",
            field=models.CharField(
                blank=True,
                choices=[
                    ("super_admin", "Super Admin"),
                    ("admin", "Admin"),
                    ("moderator", "Moderator"),
                ],
                max_length=20,
                null=True,
            ),
        ),
        migrations.RunPython(backfill_admin_role, clear_admin_role),
    ]
