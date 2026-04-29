import secrets
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework import generics, permissions, response, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView

from common.permissions import IsAdminUserRole

from apps.courses.models import Course

from .models import PasswordResetToken
from .password_reset_email import try_send_password_reset_email
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
        email = (serializer.validated_data["email"] or "").strip()
        from .models import User

        user = User.objects.filter(email__iexact=email).first()
        debug_token = None
        debug_reset_url = None
        email_hint = None

        if user:
            PasswordResetToken.objects.filter(user=user, used_at__isnull=True).delete()
            reset_token = PasswordResetToken.objects.create(
                user=user,
                token=secrets.token_urlsafe(32),
                expires_at=timezone.now() + timedelta(hours=1),
            )
            frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
            reset_url = f"{frontend_url}/auth/reset-password?token={reset_token.token}"
            sent_ok = try_send_password_reset_email(
                to_email=user.email,
                display_name=user.display_name or user.username or "there",
                reset_url=reset_url,
            )
            if settings.DEBUG:
                debug_token = reset_token.token
                debug_reset_url = reset_url
                backend = (getattr(settings, "EMAIL_BACKEND", "") or "").lower()
                if not sent_ok:
                    email_hint = (
                        "Email could not be sent (check SMTP credentials in backend/.env). "
                        "Use the preview link below to reset your password locally."
                    )
                elif "console" in backend:
                    email_hint = (
                        "Console email backend is active: nothing is sent to a real inbox. "
                        "Open a terminal and run: docker compose logs -f api "
                        "(you will see the full message there), or use the preview link below."
                    )

        payload = {"detail": "If the account exists, a reset link has been sent."}
        if debug_token:
            payload["debugToken"] = debug_token
            payload["debugResetUrl"] = debug_reset_url
        if email_hint:
            payload["emailHint"] = email_hint
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
        PasswordResetToken.objects.filter(user=reset_token.user, used_at__isnull=True).exclude(
            pk=reset_token.pk
        ).delete()
        return response.Response({"detail": "Password reset successful."})


class RefreshView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]


class ChangePasswordView(APIView):
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        if request.user.role == "teacher" and hasattr(request.user, "teacher_profile"):
            teacher_profile = request.user.teacher_profile
            if teacher_profile.must_change_password:
                teacher_profile.must_change_password = False
                teacher_profile.save(update_fields=["must_change_password", "updated_at"])
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
        if "tracks" in request.data:
            tracks = [str(track).strip() for track in request.data.get("tracks", []) if str(track).strip()]
            teacher.tracks = tracks
            if tracks:
                teacher.track = tracks[0]
        elif "track" in request.data:
            teacher.tracks = [request.data["track"]] if request.data["track"] else []
        teacher.save()
        if teacher.status == "inactive":
            Course.objects.filter(teacher=teacher).update(teacher=None, updated_at=timezone.now())
        return response.Response(TeacherProfileSerializer(teacher).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok"})
