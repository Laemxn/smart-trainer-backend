from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsAdmin
from .models import Student
from .serializers import (
    StudentCreateSerializer,
    StudentListSerializer,
    StudentDetailSerializer,
)


class StudentCreateListView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return Student.objects.filter(coach=self.request.user)

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return StudentListSerializer
        return StudentCreateSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            student = serializer.save()
        except Exception as exc:
            return Response({"detail": str(exc)}, status=400)

        output = StudentListSerializer(student).data
        headers = self.get_success_headers(serializer.data)
        return Response(output, status=201, headers=headers)

from rest_framework.views import APIView
from rest_framework.response import Response

from accounts.permissions import IsAlumno
from .models import Student
from .serializers import StudentMeSerializer


class StudentMeView(APIView):
    permission_classes = [IsAuthenticated, IsAlumno]

    def get(self, request):
        student = Student.objects.get(user=request.user)
        serializer = StudentMeSerializer(student)
        return Response(serializer.data)
    
from rest_framework import generics
from accounts.permissions import IsAdmin
from .models import Student
from .serializers import StudentListSerializer


class StudentDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    serializer_class = StudentDetailSerializer

    def get_queryset(self):
        if self.request.user.role == "ROOT":
            return Student.objects.all()
        return Student.objects.filter(coach=self.request.user)

    def perform_destroy(self, instance):
        user = instance.user
        instance.delete()
        user.delete()


from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from plans.models import Week


class CoachSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in ("ADMIN", "ROOT"):
            return Response({"detail": "No autorizado"}, status=403)

        students_qs = Student.objects.filter(coach=request.user)
        total_students = students_qs.count()

        active_weeks_qs = Week.objects.filter(
            student__coach=request.user,
            is_active=True
        )

        active_weeks = active_weeks_qs.count()
        pending_workouts = active_weeks_qs.filter(workout__isnull=True).count()
        pending_diets = active_weeks_qs.filter(diet__isnull=True).count()

        return Response({
            "students_total": total_students,
            "active_weeks": active_weeks,
            "pending_workouts": pending_workouts,
            "pending_diets": pending_diets,
        })

