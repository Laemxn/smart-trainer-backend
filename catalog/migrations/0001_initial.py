from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="VisualResource",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=120)),
                ("description", models.TextField(blank=True)),
                ("video_url", models.URLField()),
                ("muscle_group", models.CharField(blank=True, max_length=60)),
                (
                    "level",
                    models.CharField(
                        choices=[
                            ("BEGINNER", "Principiante"),
                            ("INTERMEDIATE", "Intermedio"),
                            ("ADVANCED", "Avanzado"),
                        ],
                        default="BEGINNER",
                        max_length=20,
                    ),
                ),
                ("duration_seconds", models.PositiveIntegerField(blank=True, help_text="Duración aproximada en segundos", null=True)),
                ("equipment", models.CharField(blank=True, max_length=80)),
                ("is_public", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=models.PROTECT,
                        related_name="visual_resources",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Recurso visual",
                "verbose_name_plural": "Recursos visuales",
                "ordering": ["-created_at"],
            },
        ),
    ]
