from django.contrib import admin
from .models import Student


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'coach',
        'objective',
        'level',
        'weight_kg',
        'created_at'
    )
    list_filter = ('objective', 'level', 'coach')
    search_fields = ('user__username', 'coach__username')
