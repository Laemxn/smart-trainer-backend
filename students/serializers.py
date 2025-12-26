from rest_framework import serializers
from accounts.models import User
from .models import Student


class StudentCreateSerializer(serializers.Serializer):
    # Datos de usuario
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    email = serializers.EmailField(required=False)

    # Datos fitness
    age = serializers.IntegerField()
    height_cm = serializers.IntegerField()
    weight_kg = serializers.DecimalField(max_digits=5, decimal_places=2)
    objective = serializers.CharField()
    level = serializers.CharField()

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("El usuario ya existe.")
        return value

    def create(self, validated_data):
        from django.db import IntegrityError
        request = self.context['request']

        try:
            user = User.objects.create_user(
                username=validated_data['username'],
                email=validated_data.get('email'),
                password=validated_data['password'],
                role='STUDENT'
            )
        except IntegrityError:
            raise serializers.ValidationError({"username": "Ya existe un usuario con ese nombre."})

        try:
            student = Student.objects.create(
                user=user,
                coach=request.user,
                age=validated_data['age'],
                height_cm=validated_data['height_cm'],
                weight_kg=validated_data['weight_kg'],
                objective=validated_data['objective'],
                level=validated_data['level'],
            )
        except Exception as exc:
            # Si falla, limpiar el user creado para no dejar basura
            user.delete()
            raise serializers.ValidationError({"detail": f"No se pudo crear el alumno: {exc}"})

        return student

class StudentListSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username')

    class Meta:
        model = Student
        fields = (
            'id',
            'username',
            'age',
            'height_cm',
            'weight_kg',
            'objective',
            'level',
            'created_at',
        )

class StudentMeSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username')
    coach = serializers.CharField(source='coach.username')

    class Meta:
        model = Student
        fields = (
            'username',
            'age',
            'height_cm',
            'weight_kg',
            'objective',
            'level',
            'coach',
            'created_at',
        )

class StudentDetailSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Student
        fields = (
            'id',
            'username',
            'age',
            'height_cm',
            'weight_kg',
            'objective',
            'level',
            'created_at',
        )
        read_only_fields = ('id', 'username', 'created_at')
