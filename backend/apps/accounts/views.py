import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import generics, permissions, response, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView

from common.permissions import IsAdminUserRole

from .models import PasswordResetToken
from .serializers import (
    AdminTeacherCreateSerializer,
    ChangePasswordSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    TeacherProfileSerializer,
    UserSerializer,
    UserUpdateSerializer,
    build_auth_response,
)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["allow_admin_registration"] = False
        return context

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return response.Response(build_auth_response(user), status=status.HTTP_201_CREATED)


class AdminRegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["allow_admin_registration"] = True
        return context

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data={**request.data, "role": "admin"})
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
        debug_token = None
        debug_reset_url = None

        if user:
            reset_token = PasswordResetToken.objects.create(
                user=user,
                token=secrets.token_urlsafe(32),
                expires_at=timezone.now() + timedelta(hours=1),
            )
            frontend_url = getattr(settings, "FRONTEND_URL", "").rstrip("/")
            reset_url = (
                f"{frontend_url}/auth/reset-password?token={reset_token.token}"
                if frontend_url
                else reset_token.token
            )
            send_mail(
                subject="Reset your More SkillUp password",
                message=(
                    "We received a request to reset your password.\n\n"
                    f"Use this link to continue:\n{reset_url}\n\n"
                    "If you did not request this, you can ignore this email."
                ),
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
                recipient_list=[user.email],
                fail_silently=False,
            )
            if settings.DEBUG:
                debug_token = reset_token.token
                debug_reset_url = reset_url

        payload = {"detail": "If the account exists, a reset link has been sent."}
        if debug_token:
            payload["debugToken"] = debug_token
            payload["debugResetUrl"] = debug_reset_url
        return response.Response(payload)


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


class ChangePasswordView(APIView):
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        return response.Response({"detail": "Password updated successfully."})


class AdminTeacherListView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        from .models import TeacherProfile

        teachers = TeacherProfile.objects.select_related("user").all()
        return response.Response(TeacherProfileSerializer(teachers, many=True).data)

    def post(self, request):
        serializer = AdminTeacherCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        teacher = serializer.save()
        payload = TeacherProfileSerializer(teacher).data
        if settings.DEBUG:
            payload["temporaryPassword"] = getattr(teacher, "_generated_password", None)
        return response.Response(payload, status=status.HTTP_201_CREATED)


class AdminTeacherUpdateView(APIView):
    permission_classes = [IsAdminUserRole]

    def patch(self, request, teacher_id):
        from .models import TeacherProfile

        teacher = TeacherProfile.objects.select_related("user").get(id=teacher_id)
        if "email" in request.data:
            teacher.user.email = request.data["email"]
            teacher.user.save(update_fields=["email"])
        if "display_name" in request.data:
            teacher.user.display_name = request.data["display_name"]
            teacher.user.save(update_fields=["display_name"])
        if "displayName" in request.data:
            teacher.user.display_name = request.data["displayName"]
            teacher.user.save(update_fields=["display_name"])
        if "status" in request.data:
            teacher.status = request.data["status"]
        if "program" in request.data:
            teacher.program = request.data["program"]
        if "track" in request.data:
            teacher.track = request.data["track"]
        teacher.save()
        return response.Response(TeacherProfileSerializer(teacher).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok"})
