from django.urls import path
from .views import (
    StudentCreateListView,
    StudentMeView,
    StudentDetailView,
    CoachSummaryView,
)

urlpatterns = [
    path('', StudentCreateListView.as_view()),          # /api/students/
    path('me/', StudentMeView.as_view()),               # /api/students/me/
    path('summary/', CoachSummaryView.as_view()),       # /api/students/summary/
    path('<int:pk>/', StudentDetailView.as_view()),     # /api/students/1/
]

