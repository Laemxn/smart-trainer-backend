from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.exceptions import AuthenticationFailed

from accounts.models import User
from .permissions import IsRoot


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
  """
  Permite login con username o email.
  """
  def validate(self, attrs):
    username = attrs.get("username")
    if username and "@" in username:
      try:
        user = User.objects.get(email=username)
        attrs["username"] = user.username
      except User.DoesNotExist:
        raise AuthenticationFailed("No active account found with the given credentials", code="user_not_found")
    return super().validate(attrs)


class CustomTokenObtainPairView(TokenObtainPairView):
  serializer_class = CustomTokenObtainPairSerializer


class RootOnlyView(APIView):
    permission_classes = [IsAuthenticated, IsRoot]

    def get(self, request):
        return Response({
            "message": "Acceso permitido: usuario ROOT",
            "user": request.user.username,
            "role": request.user.role
        })

from rest_framework import generics
from .serializers import AdminCreateSerializer
from .permissions import IsRoot


class AdminCreateView(generics.CreateAPIView):
    serializer_class = AdminCreateSerializer
    permission_classes = [IsAuthenticated, IsRoot]

from .permissions import IsAdmin


class AdminOnlyView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        return Response({
            "message": "Acceso permitido: usuario ADMIN",
            "user": request.user.username,
            "role": request.user.role
        })
    
class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = request.user.role

        # Backward compatibility: normalize legacy role names
        if role == "ALUMNO":
            role = "STUDENT"
            try:
                request.user.role = role
                request.user.save(update_fields=["role"])
            except Exception:
                # If saving fails, still continue with normalized role
                pass

        redirect = {
            "STUDENT": "/frontend/alumno/dashboard.html",
            "ADMIN": "/frontend/coach/dashboard.html",
            "ROOT": "/frontend/coach/dashboard.html",
        }.get(role, "/frontend/alumno/dashboard.html")

        return Response({
            "user": request.user.username,
            "role": role,
            "redirect": redirect,
        })

