import secrets
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, response, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView

from common.rbac import SUPER_ADMIN, AdminActionsPerMethod
from apps.platform.audit import record_audit

from apps.courses.models import Course

from .models import PasswordResetToken
from .password_reset_email import try_send_password_reset_email
from .serializers import (
    AdminAccountCreateSerializer,
    AdminAccountSerializer,
    AdminAccountUpdateSerializer,
    AdminTeacherCreateSerializer,
    AdminStudentSerializer,
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


def _email_new_account_credentials(user, temp_password, role_label):
    """Email a newly-created teacher/admin their login details."""
    from common.email import frontend_url, send_transactional_email

    details = [{"label": "Email", "value": user.email}]
    if temp_password:
        details.append({"label": "Temporary password", "value": temp_password})

    send_transactional_email(
        to_email=user.email,
        subject=f"Your MooreSkillUp {role_label} account",
        heading="Your account is ready",
        greeting=f"Hi {user.display_name},",
        intro=f"A {role_label} account has been created for you on MooreSkillUp.",
        lines=(
            ["Use the temporary password below to sign in, then change it from your settings."]
            if temp_password
            else ["Sign in with the password you were given, then change it from your settings."]
        ),
        details=details,
        button_label="Sign in",
        button_url=frontend_url("/auth/login"),
        footer="For your security, please change your password after your first login.",
    )


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth-register"

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["allow_admin_registration"] = False
        return context

    def create(self, request, *args, **kwargs):
        from apps.platform.models import PlatformSettings
        from django.contrib.auth.hashers import make_password
        from common.email import send_transactional_email
        from .models import PendingRegistration

        if not PlatformSettings.get_solo().student_registration_open:
            return response.Response(
                {"detail": "New registrations are temporarily closed. Please check back later."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        email = data.get("email")
        username = data.get("username")
        password = data.get("password")
        display_name = data.get("display_name")
        role = data.get("role", "student")
        selected_interest = data.get("selectedInterest", "")
        selected_track = data.get("selectedTrack", "")
        selected_tracks = data.get("selectedTracks", [])
        plan = data.get("plan", "free")

        code = f"{secrets.randbelow(1_000_000):06d}"
        
        # Clear any previous pending registration for this email/username to avoid duplicates
        PendingRegistration.objects.filter(email=email).delete()
        
        pending = PendingRegistration.objects.create(
            email=email,
            username=username,
            display_name=display_name,
            password=make_password(password),
            role=role,
            selected_interest=selected_interest,
            selected_track=selected_track,
            selected_tracks=selected_tracks,
            plan=plan,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=10)
        )

        send_transactional_email(
            to_email=email,
            subject="Verify your MooreSkillUp email",
            heading="Confirm your registration",
            greeting=f"Hi {display_name or username},",
            intro="Use the verification code below to complete your registration. It expires in 10 minutes.",
            details=[{"label": "Verification Code", "value": code}],
            footer="If you didn't request this code, you can safely ignore this email.",
        )

        return response.Response({
            "detail": "Verification code sent to email.",
            "pendingId": str(pending.id),
            "pending_id": str(pending.id),
            "email": email
        }, status=status.HTTP_200_OK)


class VerifyRegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth-register"

    def post(self, request):
        from .models import PendingRegistration, User, StudentProfile
        from .serializers import build_auth_response

        pending_id = request.data.get("pendingId") or request.data.get("pending_id")
        code = request.data.get("code")

        if not pending_id or not code:
            return Response(
                {"detail": "Verification ID and code are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            pending = PendingRegistration.objects.get(id=pending_id)
        except (PendingRegistration.DoesNotExist, ValueError):
            return Response(
                {"detail": "No pending registration found or session expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if pending.is_expired():
            pending.delete()
            return Response(
                {"detail": "Verification code has expired. Please register again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if pending.code != code.strip():
            return Response(
                {"detail": "Invalid verification code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Double check uniqueness constraints before creating
        if User.objects.filter(email=pending.email).exists():
            pending.delete()
            return Response(
                {"detail": "A user with this email already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if User.objects.filter(username=pending.username).exists():
            pending.delete()
            return Response(
                {"detail": "A user with this username already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create(
            email=pending.email,
            username=pending.username,
            display_name=pending.display_name,
            role=pending.role,
            is_active=True,
        )
        user.password = pending.password
        user.save()

        StudentProfile.objects.create(
            user=user,
            selected_interest=pending.selected_interest,
            selected_track=pending.selected_track,
            selected_tracks=pending.selected_tracks,
            plan=pending.plan,
            onboarded=False,
        )

        auth_data = build_auth_response(user)
        pending.delete()

        return Response(auth_data, status=status.HTTP_201_CREATED)


class ResendRegisterCodeView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth-register"

    def post(self, request):
        from .models import PendingRegistration
        from common.email import send_transactional_email

        pending_id = request.data.get("pendingId") or request.data.get("pending_id")
        if not pending_id:
            return Response(
                {"detail": "Pending registration ID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            pending = PendingRegistration.objects.get(id=pending_id)
        except (PendingRegistration.DoesNotExist, ValueError):
            return Response(
                {"detail": "Pending registration session expired or not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        code = f"{secrets.randbelow(1_000_000):06d}"
        pending.code = code
        pending.expires_at = timezone.now() + timedelta(minutes=10)
        pending.save(update_fields=["code", "expires_at"])

        send_transactional_email(
            to_email=pending.email,
            subject="Verify your MooreSkillUp email",
            heading="Confirm your registration",
            greeting=f"Hi {pending.display_name or pending.username},",
            intro="Use this new verification code to complete your registration. It expires in 10 minutes.",
            details=[{"label": "Verification Code", "value": code}],
            footer="If you didn't request this code, you can safely ignore this email.",
        )

        return Response({"detail": "A new verification code has been sent."}, status=status.HTTP_200_OK)


class CompleteOnboardingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role == "student":
            profile = getattr(request.user, "student_profile", None)
            if profile:
                profile.onboarded = True
                profile.save(update_fields=["onboarded"])
                return Response({"detail": "Onboarding completed."}, status=status.HTTP_200_OK)
            return Response({"detail": "Student profile not found."}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Only student profiles require onboarding."}, status=status.HTTP_400_BAD_REQUEST)



class AdminRegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth-register"

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["allow_admin_registration"] = True
        return context

    def create(self, request, *args, **kwargs):
        from .models import User

        # Bootstrap-only endpoint: once a Super Admin exists, all further admin
        # accounts must be created in-app by a Super Admin.
        if User.objects.filter(role="admin", admin_role=SUPER_ADMIN).exists():
            return response.Response(
                {"detail": "Admin registration is closed. Ask a Super Admin to create your account."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data={**request.data, "role": "admin"})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return response.Response(build_auth_response(user), status=status.HTTP_201_CREATED)


def _send_login_otp(user):
    """Generate a 6-digit code, store it, and email it to the user."""
    from .models import EmailOtp
    from common.email import send_transactional_email

    code = f"{secrets.randbelow(1_000_000):06d}"
    EmailOtp.objects.filter(user=user, used_at__isnull=True).delete()
    EmailOtp.objects.create(user=user, code=code, expires_at=timezone.now() + timedelta(minutes=10))
    send_transactional_email(
        to_email=user.email,
        subject="Your MooreSkillUp sign-in code",
        heading="Your verification code",
        greeting=f"Hi {user.display_name},",
        intro="Use this one-time code to finish signing in. It expires in 10 minutes.",
        details=[{"label": "Code", "value": code}],
        footer="If you didn't try to sign in, change your password right away.",
    )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth-login"

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        if user.two_factor_enabled:
            _send_login_otp(user)
            return response.Response(
                {
                    "twoFactorRequired": True,
                    "userId": str(user.id),
                    "detail": "We emailed a 6-digit code to finish signing in.",
                }
            )
        return response.Response(build_auth_response(user))


class TwoFactorVerifyView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth-login"

    def post(self, request):
        from .models import EmailOtp, User

        user_id = request.data.get("userId")
        code = (request.data.get("code") or "").strip()
        user = User.objects.filter(id=user_id).first() if user_id else None
        if not user or not code:
            return response.Response(
                {"detail": "Invalid verification request."}, status=status.HTTP_400_BAD_REQUEST
            )
        otp = (
            EmailOtp.objects.filter(user=user, code=code, used_at__isnull=True)
            .filter(expires_at__gte=timezone.now())
            .first()
        )
        if not otp:
            return response.Response(
                {"detail": "That code is invalid or has expired."}, status=status.HTTP_400_BAD_REQUEST
            )
        otp.used_at = timezone.now()
        otp.save(update_fields=["used_at"])
        EmailOtp.objects.filter(user=user, used_at__isnull=True).delete()
        return response.Response(build_auth_response(user))


class TwoFactorToggleView(APIView):
    """The signed-in admin turns their own email 2FA on or off."""

    def post(self, request):
        if request.user.role != "admin":
            return response.Response(
                {"detail": "Two-factor sign-in is available for admin accounts."},
                status=status.HTTP_403_FORBIDDEN,
            )
        enabled = bool(request.data.get("enabled"))
        request.user.two_factor_enabled = enabled
        request.user.save(update_fields=["two_factor_enabled"])
        return response.Response({"twoFactorEnabled": enabled})


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
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth-password-reset"

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
            if user.role == "admin":
                return response.Response(
                    {"detail": "Administrator accounts cannot reset passwords publicly. Please contact a Super Admin to resend your credentials."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if user.role == "teacher":
                return response.Response(
                    {"detail": "Teacher accounts cannot reset passwords through this page. Please contact an admin to have your credentials resent."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
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
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth-password-reset"

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
        update_fields = ["password"]
        if request.user.role == "admin" and request.user.must_change_password:
            request.user.must_change_password = False
            update_fields.append("must_change_password")
        request.user.save(update_fields=update_fields)

        if request.user.role == "teacher" and hasattr(request.user, "teacher_profile"):
            teacher_profile = request.user.teacher_profile
            if teacher_profile.must_change_password:
                teacher_profile.must_change_password = False
                teacher_profile.save(update_fields=["must_change_password", "updated_at"])
        return response.Response({"detail": "Password updated successfully."})


class AdminTeacherListView(AdminActionsPerMethod, APIView):
    admin_actions = {"GET": ("teachers:view",), "POST": ("teachers:create",)}

    def get(self, request):
        from .models import TeacherProfile

        teachers = TeacherProfile.objects.select_related("user").all()
        return response.Response(TeacherProfileSerializer(teachers, many=True).data)

    def post(self, request):
        serializer = AdminTeacherCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        teacher = serializer.save()
        record_audit(
            request,
            "teacher.create",
            resource_type="teacher",
            resource_id=teacher.id,
            resource_name=teacher.user.display_name,
            metadata={"email": teacher.user.email},
        )
        temp_password = getattr(teacher, "_generated_password", None)
        _email_new_account_credentials(teacher.user, temp_password, "teacher")
        payload = TeacherProfileSerializer(teacher).data
        payload["temporaryPassword"] = temp_password
        return response.Response(payload, status=status.HTTP_201_CREATED)


class AdminTeacherUpdateView(AdminActionsPerMethod, APIView):
    admin_actions = {"PATCH": ("teachers:edit",), "DELETE": ("teachers:delete",)}

    def patch(self, request, teacher_id):
        from .models import TeacherProfile

        teacher = get_object_or_404(TeacherProfile.objects.select_related("user"), id=teacher_id)
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
        record_audit(
            request,
            "teacher.update",
            resource_type="teacher",
            resource_id=teacher.id,
            resource_name=teacher.user.display_name,
            metadata={"fields": sorted(request.data.keys())},
        )
        return response.Response(TeacherProfileSerializer(teacher).data)

    def delete(self, request, teacher_id):
        from .models import TeacherProfile

        teacher = get_object_or_404(TeacherProfile.objects.select_related("user"), id=teacher_id)
        teacher_name = teacher.user.display_name
        record_audit(
            request,
            "teacher.delete",
            resource_type="teacher",
            resource_id=teacher.id,
            resource_name=teacher_name,
            metadata={"email": teacher.user.email},
        )
        teacher.user.delete()
        return response.Response({"detail": f"Teacher {teacher_name} deleted successfully."})


class AdminTeacherResendInviteView(AdminActionsPerMethod, APIView):
    admin_actions = {"POST": ("teachers:edit",)}

    def post(self, request, teacher_id):
        from .models import TeacherProfile

        teacher = get_object_or_404(TeacherProfile.objects.select_related("user"), id=teacher_id)
        temp_password = secrets.token_urlsafe(10)
        teacher.user.set_password(temp_password)
        teacher.user.save(update_fields=["password"])
        teacher.must_change_password = True
        teacher.save(update_fields=["must_change_password", "updated_at"])
        _email_new_account_credentials(teacher.user, temp_password, "teacher")
        record_audit(
            request,
            "teacher.resend_invite",
            resource_type="teacher",
            resource_id=teacher.id,
            resource_name=teacher.user.display_name,
            metadata={"email": teacher.user.email},
        )
        return response.Response({"detail": f"New sign-in details emailed to {teacher.user.email}."})


class AdminStudentListView(AdminActionsPerMethod, APIView):
    admin_actions = {"GET": ("students:view",)}

    def get(self, request):
        from .models import StudentProfile

        students = StudentProfile.objects.select_related("user").prefetch_related("enrollments", "payments")
        return response.Response(AdminStudentSerializer(students, many=True).data)


class AdminStudentUpdateView(AdminActionsPerMethod, APIView):
    admin_actions = {"PATCH": ("students:edit",), "DELETE": ("students:delete",)}

    def patch(self, request, student_id):
        from .models import StudentProfile

        student = get_object_or_404(StudentProfile.objects.select_related("user"), id=student_id)
        if "email" in request.data:
            student.user.email = request.data["email"]
        if "display_name" in request.data:
            student.user.display_name = request.data["display_name"]
        if "displayName" in request.data:
            student.user.display_name = request.data["displayName"]
        if "status" in request.data:
            student.user.is_active = request.data["status"] == "active"
        if "plan" in request.data:
            student.plan = request.data["plan"]
        if "selectedInterest" in request.data:
            student.selected_interest = request.data["selectedInterest"]
        if "selectedTrack" in request.data:
            student.selected_track = request.data["selectedTrack"]
        if "selectedTracks" in request.data:
            tracks = [str(track).strip() for track in request.data.get("selectedTracks", []) if str(track).strip()]
            student.selected_tracks = tracks
            if tracks:
                student.selected_track = tracks[0]
        student.user.save()
        student.save()
        record_audit(
            request,
            "student.update",
            resource_type="student",
            resource_id=student.id,
            resource_name=student.user.display_name,
            metadata={"fields": sorted(request.data.keys())},
        )
        return response.Response(AdminStudentSerializer(student).data)

    def delete(self, request, student_id):
        from .models import StudentProfile

        student = get_object_or_404(StudentProfile.objects.select_related("user"), id=student_id)
        student_name = student.user.display_name
        record_audit(
            request,
            "student.delete",
            resource_type="student",
            resource_id=student.id,
            resource_name=student_name,
            metadata={"email": student.user.email},
        )
        student.user.delete()
        return response.Response({"detail": f"Student {student_name} deleted successfully."})


class AdminStudentGrantAccessView(AdminActionsPerMethod, APIView):
    """Give a student free access to a course (no payment required)."""

    admin_actions = {"POST": ("students:edit",)}

    def post(self, request, student_id):
        from .models import StudentProfile
        from apps.enrollments.models import Enrollment

        student = get_object_or_404(StudentProfile.objects.select_related("user"), id=student_id)
        course_id = request.data.get("courseId") or request.data.get("course_id")
        if not course_id:
            return response.Response(
                {"detail": "A courseId is required."}, status=status.HTTP_400_BAD_REQUEST
            )
        course = get_object_or_404(Course, id=course_id)

        enrollment, created = Enrollment.objects.get_or_create(
            student=student,
            course=course,
            defaults={"access_source": "admin_grant", "status": "active"},
        )
        if not created:
            return response.Response(
                {"detail": f"{student.user.display_name} already has access to this course."},
                status=status.HTTP_200_OK,
            )

        from apps.notifications.models import Notification

        Notification.objects.create(
            user=student.user,
            title=f"You've been granted access to {course.title}",
            body="An admin gave you free access to this course. Open your dashboard to start learning.",
            kind="course",
        )
        record_audit(
            request,
            "student.grant_access",
            resource_type="student",
            resource_id=student.id,
            resource_name=student.user.display_name,
            metadata={"courseId": str(course.id), "courseTitle": course.title},
        )
        return response.Response(
            {"detail": f"Free access to “{course.title}” granted to {student.user.display_name}."},
            status=status.HTTP_201_CREATED,
        )


class AdminAccountListView(AdminActionsPerMethod, APIView):
    admin_actions = {"GET": ("admins:view",), "POST": ("admins:create",)}

    def get(self, request):
        from .models import User

        admins = User.objects.filter(role="admin").order_by("-date_joined")
        return response.Response(AdminAccountSerializer(admins, many=True).data)

    def post(self, request):
        serializer = AdminAccountCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        admin = serializer.save()
        record_audit(
            request,
            "admin.create",
            resource_type="user",
            resource_id=admin.id,
            resource_name=admin.display_name,
            metadata={"adminRole": admin.admin_role, "email": admin.email},
        )
        temp_password = getattr(admin, "_generated_password", None)
        _email_new_account_credentials(admin, temp_password, "admin")
        payload = AdminAccountSerializer(admin).data
        # Returned exactly once at creation; never retrievable again.
        payload["temporaryPassword"] = temp_password
        return response.Response(payload, status=status.HTTP_201_CREATED)


class AdminAccountDetailView(AdminActionsPerMethod, APIView):
    admin_actions = {"PATCH": ("admins:edit",), "DELETE": ("admins:delete",)}

    def patch(self, request, admin_id):
        from .models import User

        admin = get_object_or_404(User, id=admin_id, role="admin")
        before = AdminAccountSerializer(admin).data
        serializer = AdminAccountUpdateSerializer(
            admin, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        after = AdminAccountSerializer(admin).data
        record_audit(
            request,
            "admin.update",
            resource_type="user",
            resource_id=admin.id,
            resource_name=admin.display_name,
            changes={
                key: {"before": before.get(key), "after": after.get(key)}
                for key in after
                if before.get(key) != after.get(key)
            },
        )
        return response.Response(AdminAccountSerializer(admin).data)

    def delete(self, request, admin_id):
        from .models import User

        admin = get_object_or_404(User, id=admin_id, role="admin")

        # Guard 1: never delete yourself (prevents lock-out + accidental loss).
        if admin.id == request.user.id:
            return response.Response(
                {"detail": "You cannot delete your own admin account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Guard 2: never remove the last Super Admin (platform must keep an owner).
        if (admin.admin_role or SUPER_ADMIN) == SUPER_ADMIN:
            remaining_supers = (
                User.objects.filter(role="admin", admin_role=SUPER_ADMIN)
                .exclude(id=admin.id)
                .count()
            )
            if remaining_supers == 0:
                return response.Response(
                    {"detail": "You cannot delete the last Super Admin."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        admin_name = admin.display_name
        # Audit records reference the actor via SET_NULL, so the person's past
        # work and the audit trail survive the account deletion.
        record_audit(
            request,
            "admin.delete",
            resource_type="user",
            resource_id=admin.id,
            resource_name=admin_name,
            metadata={"adminRole": admin.admin_role, "email": admin.email},
        )
        admin.delete()
        return response.Response({"detail": f"Admin {admin_name} removed successfully."})


class AdminPermissionOverrideView(AdminActionsPerMethod, APIView):
    """Super-admin sets per-admin permission grants/revokes on top of their tier."""

    admin_actions = {"PATCH": ("permissions:manage",)}

    def patch(self, request, admin_id):
        from .models import User

        admin = get_object_or_404(User, id=admin_id, role="admin")
        grant = [str(item) for item in (request.data.get("grant") or [])]
        revoke = [str(item) for item in (request.data.get("revoke") or [])]
        admin.permission_overrides = {"grant": sorted(set(grant)), "revoke": sorted(set(revoke))}
        admin.save(update_fields=["permission_overrides"])
        record_audit(
            request,
            "admin.permissions",
            resource_type="user",
            resource_id=admin.id,
            resource_name=admin.display_name,
            metadata={"grant": grant, "revoke": revoke},
        )
        return response.Response(AdminAccountSerializer(admin).data)


class AdminAccountResendCredentialsView(AdminActionsPerMethod, APIView):
    admin_actions = {"POST": ("admins:edit",)}

    def post(self, request, admin_id):
        from .models import User

        admin = get_object_or_404(User, id=admin_id, role="admin")
        temp_password = secrets.token_urlsafe(10)
        admin.set_password(temp_password)
        admin.must_change_password = True
        admin.save(update_fields=["password", "must_change_password"])
        _email_new_account_credentials(admin, temp_password, "admin")
        record_audit(
            request,
            "admin.resend_credentials",
            resource_type="user",
            resource_id=admin.id,
            resource_name=admin.display_name,
            metadata={"email": admin.email},
        )
        return response.Response({"detail": f"New sign-in details emailed to {admin.email}."})


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok"})
