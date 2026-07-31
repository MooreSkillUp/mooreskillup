from django.db import migrations, models


def raise_student_device_limit(apps, schema_editor):
    """Move existing installs off the old default of 2.

    Only rows still sitting on the old default are touched — if an admin has
    deliberately chosen a number, we leave their choice alone.
    """
    AuthenticationSettings = apps.get_model("platform", "AuthenticationSettings")
    AuthenticationSettings.objects.filter(max_student_devices=2).update(max_student_devices=5)


class Migration(migrations.Migration):
    dependencies = [
        ("platform", "0006_platformsettings_default_course_banner_accent_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="authenticationsettings",
            name="max_student_devices",
            field=models.PositiveIntegerField(default=5),
        ),
        migrations.RunPython(raise_student_device_limit, migrations.RunPython.noop),
    ]
