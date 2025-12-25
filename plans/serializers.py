from rest_framework import serializers

from catalog.models import VisualResource
from plans.workout_plan import (
    parse_text_workout,
    resolve_manual_plan,
    resolve_named_plan,
    save_workout_from_plan,
)
from .models import Week, Workout, Diet, WorkoutDay, WorkoutExercise


# ------------------------------------------------------------------
# WEEKS
# ------------------------------------------------------------------

class WeekCreateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Week
        fields = ['id', 'student', 'start_date', 'end_date']

    def create(self, validated_data):
        student = validated_data.pop('student')

        # Desactivar semanas previas del alumno
        Week.objects.filter(
            student=student,
            is_active=True
        ).update(is_active=False)

        # Crear nueva semana activa
        week = Week.objects.create(
            student=student,
            is_active=True,
            **validated_data
        )

        return week


class WeekActiveSerializer(serializers.ModelSerializer):
    student = serializers.CharField(source='student.user.username')

    class Meta:
        model = Week
        fields = (
            'id',
            'student',
            'start_date',
            'end_date',
            'is_active',
            'created_at',
        )


class WeekStatusSerializer(serializers.ModelSerializer):
    student = serializers.CharField(source='student.user.username')

    class Meta:
        model = Week
        fields = (
            'id',
            'student',
            'start_date',
            'end_date',
            'is_active',
            'workout_status',
            'diet_status',
            'created_at',
        )


# ------------------------------------------------------------------
# WORKOUTS
# ------------------------------------------------------------------

class WorkoutExerciseOutputSerializer(serializers.ModelSerializer):
    exercise_id = serializers.IntegerField(source="exercise.id", read_only=True)
    exercise = serializers.SerializerMethodField()

    class Meta:
        model = WorkoutExercise
        fields = (
            'id',
            'exercise_id',
            'exercise',
            'sets',
            'reps',
            'notes',
            'order',
        )

    def get_exercise(self, obj):
        return {
            "id": obj.exercise.id,
            "title": obj.exercise.title,
            "muscle_group": obj.exercise.muscle_group,
            "level": obj.exercise.level,
            "video_url": obj.exercise.video_url,
            "equipment": obj.exercise.equipment,
        }


class WorkoutDayOutputSerializer(serializers.ModelSerializer):
    exercises = WorkoutExerciseOutputSerializer(many=True, read_only=True)

    class Meta:
        model = WorkoutDay
        fields = ('id', 'name', 'order', 'exercises')


class WorkoutExerciseInputSerializer(serializers.Serializer):
    exercise_id = serializers.IntegerField()
    sets = serializers.IntegerField(required=False, allow_null=True)
    reps = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class WorkoutDayInputSerializer(serializers.Serializer):
    day = serializers.CharField()
    exercises = WorkoutExerciseInputSerializer(many=True)


class WorkoutCreateSerializer(serializers.ModelSerializer):
    week_id = serializers.IntegerField(write_only=True)
    plan = WorkoutDayInputSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = Workout
        fields = ('week_id', 'plan', 'content')
        extra_kwargs = {
            'content': {'required': False, 'allow_blank': True},
        }

    def validate_week_id(self, value):
        if not Week.objects.filter(id=value).exists():
            raise serializers.ValidationError("Semana no encontrada")
        return value

    def create(self, validated_data):
        week_id = validated_data.pop('week_id')
        plan_payload = validated_data.pop('plan', [])
        raw_content = validated_data.get('content', '')

        week = Week.objects.get(id=week_id)

        resolved_plan = []

        if plan_payload:
            resolved_plan, missing_ids = resolve_manual_plan(
                plan_payload,
                ignore_missing=False,
            )
            if missing_ids:
                missing = ", ".join(str(mid) for mid in sorted(set(missing_ids)))
                raise serializers.ValidationError(
                    {"plan": f"Ejercicios no encontrados en catalogo: {missing}"}
                )
        elif raw_content:
            named_plan = parse_text_workout(raw_content)
            exercises = VisualResource.objects.all()
            resolved_plan, missing_names = resolve_named_plan(
                named_plan,
                exercises,
                ignore_missing=False,
            )
            if missing_names:
                missing = ", ".join(sorted(set(missing_names)))
                raise serializers.ValidationError(
                    {"plan": f"Ejercicios no estan en el catalogo: {missing}"}
                )
        else:
            raise serializers.ValidationError(
                {"plan": "Debes enviar la rutina estructurada con ejercicios del catalogo."}
            )

        if not resolved_plan:
            raise serializers.ValidationError(
                {"plan": "No hay ejercicios validos en el plan."}
            )

        workout = save_workout_from_plan(week, resolved_plan)
        Week.objects.filter(id=week_id).update(workout_status=Week.STATUS_READY)
        return workout


class WorkoutMeSerializer(serializers.ModelSerializer):
    week = serializers.IntegerField(source='week.id')
    plan = WorkoutDayOutputSerializer(source='days', many=True, read_only=True)

    class Meta:
        model = Workout
        fields = (
            'week',
            'content',
            'plan',
            'created_at',
        )


# ------------------------------------------------------------------
# DIETS
# ------------------------------------------------------------------

class DietCreateSerializer(serializers.ModelSerializer):
    week_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Diet
        fields = ('week_id', 'content')

    def create(self, validated_data):
        week_id = validated_data.pop('week_id')
        week = Week.objects.get(id=week_id)

        # Garantizar una sola dieta por semana
        Diet.objects.filter(week=week).delete()

        diet = Diet.objects.create(
            week=week,
            content=validated_data['content']
        )
        Week.objects.filter(id=week_id).update(diet_status=Week.STATUS_READY)
        return diet


class DietMeSerializer(serializers.ModelSerializer):
    week = serializers.IntegerField(source='week.id')

    class Meta:
        model = Diet
        fields = (
            'week',
            'content',
            'created_at',
        )
