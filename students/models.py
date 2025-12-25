from django.db import models
from accounts.models import User


class Student(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='student_profile'
    )

    coach = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='students'
    )

    age = models.PositiveIntegerField()
    height_cm = models.PositiveIntegerField()
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2)

    objective = models.CharField(max_length=100)
    level = models.CharField(max_length=50)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - Coach: {self.coach.username}"
