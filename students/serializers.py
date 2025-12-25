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

    def create(self, validated_data):
        request = self.context['request']

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email'),
            password=validated_data['password'],
            role='STUDENT'
        )

        student = Student.objects.create(
            user=user,
            coach=request.user,
            age=validated_data['age'],
            height_cm=validated_data['height_cm'],
            weight_kg=validated_data['weight_kg'],
            objective=validated_data['objective'],
            level=validated_data['level'],
        )

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
