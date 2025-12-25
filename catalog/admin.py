from django.contrib import admin

from .models import VisualResource


@admin.register(VisualResource)
class VisualResourceAdmin(admin.ModelAdmin):
    list_display = ("title", "muscle_group", "level", "is_public", "created_by", "created_at")
    list_filter = ("level", "is_public", "muscle_group")
    search_fields = ("title", "description", "muscle_group")

