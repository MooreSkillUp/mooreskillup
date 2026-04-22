import secrets
from datetime import timedelta

from django.utils import timezone
from rest_framework import generics, permissions, response, status
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView

from common.permissions import IsAdminUserRole

from .models import PasswordResetToken
from .serializers import (
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserUpdateSerializer,
    UserSerializer,
    build_auth_response,
)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return response.Response(build_auth_response(user), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return response.Response(build_auth_response(serializer.validated_data["user"]))


class MeView(APIView):
    def get(self, request):
        return response.Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return response.Response(UserSerializer(request.user).data)


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        from .models import User

        user = User.objects.filter(email=email).first()
        if user:
            PasswordResetToken.objects.create(
                user=user,
                token=secrets.token_urlsafe(32),
                expires_at=timezone.now() + timedelta(hours=1),
            )
        return response.Response({"detail": "If the account exists, a reset link has been sent."})


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reset_token = serializer.validated_data["reset_token"]
        reset_token.user.set_password(serializer.validated_data["password"])
        reset_token.user.save(update_fields=["password"])
        reset_token.used_at = timezone.now()
        reset_token.save(update_fields=["used_at"])
        return response.Response({"detail": "Password reset successful."})


class RefreshView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]


class AdminTeacherListView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        from .models import TeacherProfile

        teachers = TeacherProfile.objects.select_related("user").all()
        return response.Response(
            [
                {
                    "id": str(teacher.id),
                    "userId": str(teacher.user_id),
                    "displayName": teacher.user.display_name,
                    "email": teacher.user.email,
                    "program": teacher.program,
                    "track": teacher.track,
                    "status": teacher.status,
                }
                for teacher in teachers
            ]
        )


class AdminTeacherUpdateView(APIView):
    permission_classes = [IsAdminUserRole]

    def patch(self, request, teacher_id):
        from .models import TeacherProfile

        teacher = TeacherProfile.objects.select_related("user").get(id=teacher_id)
        if "display_name" in request.data:
            teacher.user.display_name = request.data["display_name"]
            teacher.user.save(update_fields=["display_name", "updated_at"])
        if "status" in request.data:
            teacher.status = request.data["status"]
        if "program" in request.data:
            teacher.program = request.data["program"]
        if "track" in request.data:
            teacher.track = request.data["track"]
        teacher.save()
        return response.Response(
            {
                "id": str(teacher.id),
                "displayName": teacher.user.display_name,
                "email": teacher.user.email,
                "program": teacher.program,
                "track": teacher.track,
                "status": teacher.status,
            }
        )
