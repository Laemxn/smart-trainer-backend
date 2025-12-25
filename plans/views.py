from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin, IsAlumno
from students.models import Student
from .models import Week, Workout, Diet
from .serializers import (
    WeekCreateSerializer,
    WeekActiveSerializer,
    WorkoutCreateSerializer,
    WorkoutMeSerializer,
    DietCreateSerializer,
    DietMeSerializer,
    WeekStatusSerializer,
)
from plans.ai.async_tasks import (
    generate_workout_async,
    generate_diet_async,
)


def _sync_week_status(week: Week):
    """
    Ensure status flags reflect persisted workout/diet records.
    Useful when legacy data left statuses in 'pending' but the related
    objects already exist.
    """
    updates = {}
    if hasattr(week, "workout") or Workout.objects.filter(week=week).exists():
        if week.workout_status != Week.STATUS_READY:
            updates["workout_status"] = Week.STATUS_READY
    if hasattr(week, "diet") or Diet.objects.filter(week=week).exists():
        if week.diet_status != Week.STATUS_READY:
            updates["diet_status"] = Week.STATUS_READY
    if updates:
        Week.objects.filter(id=week.id).update(**updates)
        for key, value in updates.items():
            setattr(week, key, value)


# ------------------------------------------------------------------
# WEEKS
# ------------------------------------------------------------------

class WeekCreateView(generics.CreateAPIView):
    serializer_class = WeekCreateSerializer
    permission_classes = [IsAuthenticated, IsAdmin]


class WeekActiveView(APIView):
    permission_classes = [IsAuthenticated, IsAlumno]

    def get(self, request):
        try:
            student = Student.objects.get(user=request.user)
            week = Week.objects.get(student=student, is_active=True)
        except Student.DoesNotExist:
            return Response({"detail": "Alumno no encontrado"}, status=404)
        except Week.DoesNotExist:
            return Response({"detail": "No hay semana activa"}, status=404)

        serializer = WeekActiveSerializer(week)
        return Response(serializer.data)


# ------------------------------------------------------------------
# WORKOUTS
# ------------------------------------------------------------------

class WorkoutCreateView(generics.CreateAPIView):
    serializer_class = WorkoutCreateSerializer
    permission_classes = [IsAuthenticated, IsAdmin]


class WorkoutMeView(APIView):
    permission_classes = [IsAuthenticated, IsAlumno]

    def get(self, request):
        try:
            student = Student.objects.get(user=request.user)
            week = Week.objects.get(student=student, is_active=True)
            workout = Workout.objects.select_related('week').prefetch_related(
                'days__exercises__exercise'
            ).get(week=week)
        except Student.DoesNotExist:
            return Response({"detail": "Alumno no encontrado"}, status=404)
        except Week.DoesNotExist:
            return Response({"detail": "No hay semana activa"}, status=404)
        except Workout.DoesNotExist:
            return Response({"detail": "No hay rutina asignada"}, status=404)

        serializer = WorkoutMeSerializer(workout)
        return Response(serializer.data)


class WorkoutAICreateView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        week_id = request.data.get("week_id")
        if not week_id:
            return Response({"detail": "week_id es requerido"}, status=400)

        if request.user.role == "ROOT":
            week = Week.objects.filter(id=week_id).first()
        else:
            week = Week.objects.filter(
                id=week_id,
                student__coach=request.user
            ).first()

        if not week:
            return Response({"detail": "Semana no encontrada"}, status=404)

        # Siempre permitimos regenerar: si ya hay rutina, se elimina para crear una nueva.
        if Workout.objects.filter(week=week).exists():
            Workout.objects.filter(week=week).delete()
            Week.objects.filter(id=week.id).update(
                workout_status=Week.STATUS_PENDING
            )

        context = {
            "age": week.student.age,
            "weight": float(week.student.weight_kg),
            "height": week.student.height_cm,
            "level": week.student.level,
            "objective": week.student.objective,
            "focus_muscle": request.data.get("focus_muscle"),
            "days_per_week": request.data.get("days_per_week"),
            "ai_notes": request.data.get("ai_notes"),
        }

        Week.objects.filter(id=week.id).update(
            workout_status=Week.STATUS_GENERATING
        )
        generate_workout_async(week.id, context)

        return Response({
            "message": "Rutina en proceso",
            "status": Week.STATUS_GENERATING,
        })


# ------------------------------------------------------------------
# DIETS
# ------------------------------------------------------------------

class DietCreateView(generics.CreateAPIView):
    serializer_class = DietCreateSerializer
    permission_classes = [IsAuthenticated, IsAdmin]


class DietMeView(APIView):
    permission_classes = [IsAuthenticated, IsAlumno]

    def get(self, request):
        try:
            student = Student.objects.get(user=request.user)
            week = Week.objects.get(student=student, is_active=True)
            diet = Diet.objects.get(week=week)
        except Student.DoesNotExist:
            return Response({"detail": "Alumno no encontrado"}, status=404)
        except Week.DoesNotExist:
            return Response({"detail": "No hay semana activa"}, status=404)
        except Diet.DoesNotExist:
            return Response({"detail": "No hay dieta asignada"}, status=404)

        serializer = DietMeSerializer(diet)
        return Response(serializer.data)


class DietAICreateView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        week_id = request.data.get("week_id")
        if not week_id:
            return Response({"detail": "week_id es requerido"}, status=400)

        if request.user.role == "ROOT":
            week = Week.objects.filter(id=week_id).first()
        else:
            week = Week.objects.filter(
                id=week_id,
                student__coach=request.user
            ).first()

        if not week:
            return Response({"detail": "Semana no encontrada"}, status=404)

        if Diet.objects.filter(week=week).exists():
            Week.objects.filter(id=week.id).update(
                diet_status=Week.STATUS_READY
            )
            return Response({
                "message": "La dieta ya existe",
                "status": Week.STATUS_READY,
            })

        context = {
            "age": week.student.age,
            "weight": float(week.student.weight_kg),
            "height": week.student.height_cm,
            "objective": week.student.objective,
            "diet_notes": request.data.get("notes"),
            "diet_calories": request.data.get("calories"),
        }

        Week.objects.filter(id=week.id).update(
            diet_status=Week.STATUS_GENERATING
        )
        generate_diet_async(week.id, context)

        return Response({
            "message": "Dieta en proceso",
            "status": Week.STATUS_GENERATING,
        })


# ------------------------------------------------------------------
# STATUS (COACH)
# ------------------------------------------------------------------

class PlanStatusView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        week_id = request.query_params.get("week_id")

        if request.user.role == "ROOT":
            weeks = Week.objects.all()
        else:
            weeks = Week.objects.filter(student__coach=request.user)

        if week_id:
            week = weeks.filter(id=week_id).prefetch_related(
                'workout__days__exercises__exercise',
                'diet',
            ).first()
            if not week:
                return Response({"detail": "Semana no encontrada"}, status=404)
            _sync_week_status(week)
            serializer = WeekStatusSerializer(week)
            data = serializer.data
            try:
                workout_data = WorkoutMeSerializer(week.workout).data
                data["workout_content"] = workout_data.get("content")
                data["workout_plan"] = workout_data.get("plan")
            except Workout.DoesNotExist:
                data["workout_content"] = None
                data["workout_plan"] = []
            try:
                data["diet_content"] = week.diet.content
            except Diet.DoesNotExist:
                data["diet_content"] = None
            return Response(data)

        weeks = weeks.order_by("-created_at")
        for wk in weeks:
            _sync_week_status(wk)

        serializer = WeekStatusSerializer(weeks, many=True)
        return Response(serializer.data)
