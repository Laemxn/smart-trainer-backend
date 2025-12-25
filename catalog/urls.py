from django.urls import path

from .views import VisualResourceDetailView, VisualResourceListCreateView

urlpatterns = [
    path("videos/", VisualResourceListCreateView.as_view(), name="visualresource-list"),
    path("videos/<int:pk>/", VisualResourceDetailView.as_view(), name="visualresource-detail"),
]

