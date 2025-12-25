from django.contrib import admin
from .models import Week, Workout, Diet, WorkoutDay, WorkoutExercise


@admin.register(Week)
class WeekAdmin(admin.ModelAdmin):
    list_display = (
        'student',
        'start_date',
        'end_date',
        'is_active',
        'created_at'
    )
    list_filter = ('is_active', 'start_date')
    search_fields = ('student__user__username',)


@admin.register(Workout)
class WorkoutAdmin(admin.ModelAdmin):
    list_display = (
        'week',
        'created_at',
    )
    search_fields = ('week__student__user__username',)


@admin.register(WorkoutDay)
class WorkoutDayAdmin(admin.ModelAdmin):
    list_display = ('workout', 'name', 'order', 'created_at')
    list_filter = ('name',)
    search_fields = ('workout__week__student__user__username',)


@admin.register(WorkoutExercise)
class WorkoutExerciseAdmin(admin.ModelAdmin):
    list_display = ('day', 'exercise', 'sets', 'reps', 'order')
    search_fields = ('exercise__title', 'day__workout__week__student__user__username')


@admin.register(Diet)
class DietAdmin(admin.ModelAdmin):
    list_display = (
        'week',
        'created_at',
    )
    search_fields = ('week__student__user__username',)
