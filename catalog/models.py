from django.conf import settings
from django.db import models


class VisualResource(models.Model):
    LEVEL_BEGINNER = "BEGINNER"
    LEVEL_INTERMEDIATE = "INTERMEDIATE"
    LEVEL_ADVANCED = "ADVANCED"

    LEVEL_CHOICES = (
        (LEVEL_BEGINNER, "Principiante"),
        (LEVEL_INTERMEDIATE, "Intermedio"),
        (LEVEL_ADVANCED, "Avanzado"),
    )

    title = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    video_url = models.URLField()
    muscle_group = models.CharField(max_length=60, blank=True)
    level = models.CharField(
        max_length=20,
        choices=LEVEL_CHOICES,
        default=LEVEL_BEGINNER,
    )
    duration_seconds = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Duración aproximada en segundos",
    )
    equipment = models.CharField(max_length=80, blank=True)
    is_public = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="visual_resources",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Recurso visual"
        verbose_name_plural = "Recursos visuales"

    def __str__(self):
        return self.title

