from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("courses", "0003_lesson_tags"),
    ]

    operations = [
        migrations.AlterField(
            model_name="course",
            name="status",
            field=models.CharField(
                choices=[
                    ("draft", "Draft"),
                    ("review", "In review"),
                    ("approved", "Approved"),
                    ("published", "Published"),
                    ("declined", "Declined"),
                    ("archived", "Archived"),
                ],
                default="draft",
                max_length=20,
            ),
        ),
    ]
