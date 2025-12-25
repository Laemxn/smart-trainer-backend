from django.urls import path
from .views import (
    WeekCreateView,
    WeekActiveView,
    WorkoutCreateView,
    WorkoutMeView,
    WorkoutAICreateView,
    DietCreateView,
    DietMeView,
    DietAICreateView,
    PlanStatusView,
)

urlpatterns = [
    # Weeks
    path('weeks/', WeekCreateView.as_view()),
    path('weeks/active/', WeekActiveView.as_view()),

    # Workouts
    path('workouts/', WorkoutCreateView.as_view()),
    path('workouts/me/', WorkoutMeView.as_view()),
    path('workouts/ai/', WorkoutAICreateView.as_view()),

    # Diets
    path('diets/', DietCreateView.as_view()),
    path('diets/me/', DietMeView.as_view()),
    path('diets/ai/', DietAICreateView.as_view()),

    # Status (PASO 4)
    path('status/', PlanStatusView.as_view()),
]

