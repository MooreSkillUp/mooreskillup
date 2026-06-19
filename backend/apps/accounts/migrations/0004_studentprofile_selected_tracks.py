from django.db import migrations, models


def populate_student_selected_tracks(apps, schema_editor):
    StudentProfile = apps.get_model("accounts", "StudentProfile")
    for student in StudentProfile.objects.all():
        student.selected_tracks = [student.selected_track] if student.selected_track else []
        student.save(update_fields=["selected_tracks"])


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_teacherprofile_tracks"),
    ]

    operations = [
        migrations.AddField(
            model_name="studentprofile",
            name="selected_tracks",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(populate_student_selected_tracks, migrations.RunPython.noop),
    ]
