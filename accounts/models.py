from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = (
    ("STUDENT", "Alumno"),
    ("ADMIN", "Administrador"),
    ("ROOT", "Root"),
)

    role = models.CharField(
    max_length=20,
    choices=ROLE_CHOICES,
    default="STUDENT"
)

    def __str__(self):
        return f"{self.username} ({self.role})"
