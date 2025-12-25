from django.db import models
from students.models import Student
from catalog.models import VisualResource


class Week(models.Model):
    STATUS_PENDING = "pending"
    STATUS_GENERATING = "generating"
    STATUS_READY = "ready"
    STATUS_ERROR = "error"

    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_GENERATING, "Generating"),
        (STATUS_READY, "Ready"),
        (STATUS_ERROR, "Error"),
    )

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='weeks'
    )

    start_date = models.DateField()
    end_date = models.DateField()

    is_active = models.BooleanField(default=True)

    workout_status = models.CharField(
        max_length=12,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )

    diet_status = models.CharField(
        max_length=12,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Week {self.start_date} - {self.end_date} ({self.student.user.username})"

class Workout(models.Model):
    week = models.OneToOneField(
        Week,
        on_delete=models.CASCADE,
        related_name='workout'
    )

    content = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Workout - Week {self.week.id}"


class WorkoutDay(models.Model):
    workout = models.ForeignKey(
        Workout,
        on_delete=models.CASCADE,
        related_name='days'
    )

    name = models.CharField(max_length=40)
    order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('order', 'id')

    def __str__(self):
        return f"{self.name} - Week {self.workout.week.id}"


class WorkoutExercise(models.Model):
    day = models.ForeignKey(
        WorkoutDay,
        on_delete=models.CASCADE,
        related_name='exercises'
    )
    exercise = models.ForeignKey(
        VisualResource,
        on_delete=models.PROTECT,
        related_name='workout_exercises'
    )
    sets = models.PositiveSmallIntegerField(null=True, blank=True)
    reps = models.CharField(max_length=50, blank=True)
    notes = models.CharField(max_length=200, blank=True)
    order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('order', 'id')

    def __str__(self):
        return f"{self.exercise.title} ({self.day.name})"

class Diet(models.Model):
    week = models.OneToOneField(
        Week,
        on_delete=models.CASCADE,
        related_name='diet'
    )

    content = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Diet - Week {self.week.id}"
