import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
        ("courses", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="TeacherActivityLog",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("message", models.CharField(max_length=255)),
                (
                    "activity_type",
                    models.CharField(
                        choices=[
                            ("create-course", "Create course"),
                            ("edit-course", "Edit course"),
                            ("publish-course", "Publish course"),
                            ("unpublish-course", "Unpublish course"),
                            ("save-draft", "Save draft"),
                            ("delete-course", "Delete course"),
                            ("reorder-content", "Reorder content"),
                            ("settings-update", "Settings update"),
                        ],
                        max_length=30,
                    ),
                ),
                (
                    "course",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="activity_logs",
                        to="courses.course",
                    ),
                ),
                (
                    "teacher",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="activity_logs",
                        to="accounts.teacherprofile",
                    ),
                ),
            ],
            options={"ordering": ("-created_at",)},
        ),
    ]
