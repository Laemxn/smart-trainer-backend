from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated

from accounts.permissions import IsRoot
from .models import VisualResource
from .serializers import VisualResourceSerializer


class VisualResourceListCreateView(generics.ListCreateAPIView):
    serializer_class = VisualResourceSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated(), IsRoot()]

    def get_queryset(self):
        queryset = VisualResource.objects.all()

        if self.request.method == "GET" and not (
            self.request.user.is_authenticated and self.request.user.role == "ROOT"
        ):
            queryset = queryset.filter(is_public=True)

        muscle_group = self.request.query_params.get("muscle_group")
        level = self.request.query_params.get("level")
        search = self.request.query_params.get("q")

        if muscle_group:
            queryset = queryset.filter(muscle_group__icontains=muscle_group)
        if level:
            queryset = queryset.filter(level=level)
        if search:
            queryset = queryset.filter(title__icontains=search)

        return queryset.order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class VisualResourceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = VisualResourceSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated(), IsRoot()]

    def get_queryset(self):
        queryset = VisualResource.objects.all()

        if self.request.method == "GET" and not (
            self.request.user.is_authenticated and self.request.user.role == "ROOT"
        ):
            queryset = queryset.filter(is_public=True)

        return queryset

