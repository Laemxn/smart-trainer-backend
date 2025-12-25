from rest_framework import serializers

from .models import VisualResource


class VisualResourceSerializer(serializers.ModelSerializer):
    created_by = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = VisualResource
        fields = (
            "id",
            "title",
            "description",
            "video_url",
            "muscle_group",
            "level",
            "duration_seconds",
            "equipment",
            "is_public",
            "created_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at")

    def validate_video_url(self, value):
        if not value.lower().startswith(("http://", "https://")):
            raise serializers.ValidationError("La URL del video debe ser válida.")
        return value

