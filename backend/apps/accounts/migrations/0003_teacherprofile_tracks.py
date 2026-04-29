from django.db import migrations, models


def populate_teacher_tracks(apps, schema_editor):
    TeacherProfile = apps.get_model("accounts", "TeacherProfile")
    for teacher in TeacherProfile.objects.all():
        teacher.tracks = [teacher.track] if teacher.track else []
        teacher.save(update_fields=["tracks"])


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_teacherprofile_must_change_password"),
    ]

    operations = [
        migrations.AddField(
            model_name="teacherprofile",
            name="tracks",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(populate_teacher_tracks, migrations.RunPython.noop),
    ]
