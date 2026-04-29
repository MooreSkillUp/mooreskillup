from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("courses", "0002_teacheractivitylog"),
    ]

    operations = [
        migrations.AddField(
            model_name="lesson",
            name="tags",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
