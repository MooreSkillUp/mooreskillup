import re
import secrets
from datetime import timedelta

from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, response, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.courses.models import Course
from apps.platform.audit import record_audit
from common.mail_backend import backend_delivers
from common.permissions import IsStudentUserRole
from common.rbac import SUPER_ADMIN, AdminAction, AdminActionsPerMethod

from .models import PasswordResetToken, StudentProfile
from .password_reset_email import try_send_password_reset_email
from .serializers import (
    AdminAccountCreateSerializer,
    AdminAccountSerializer,
    AdminAccountUpdateSerializer,
    AdminStudentSerializer,
    AdminTeacherCreateSerializer,
    ChangePasswordSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    TeacherProfileSerializer,
    UserSerializer,
    UserUpdateSerializer,
)
from .session_auth import (
    AUTH_REFRESH_COOKIE,
    build_session_auth_response,
    clear_auth_cookies,
    clear_failed_logins,
    include_refresh_in_body,
    refresh_session_from_token,
    register_failed_login,
    revoke_all_sessions,
    revoke_session,
    set_auth_cookies,
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
        from django.contrib.auth.hashers import make_password

        from apps.platform.models import PlatformSettings
        from common.email import send_transactional_email

        from .models import PendingRegistration

        platform = PlatformSettings.get_solo()
        # Sign-ups stay open before launch: these are the founding members, and
        # the whole pre-launch campaign exists to collect them. What is closed
        # before launch is the courses, not the door.
        if not platform.student_registration_open:
            return response.Response(
                {"detail": "New registrations are temporarily closed. Please check back later."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Agreement is enforced here, not only by the checkbox. A form can be
        # skipped; an API call cannot pretend a person agreed.
        if serializer.validated_data.get("role", "student") == "student" and not (
            serializer.validated_data.get("acceptTerms")
        ):
            return response.Response(
                {
                    "acceptTerms": [
                        "Please agree to the Terms of Service and Privacy Policy to create an account."
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data
        email = data.get("email")
        username = data.get("username")
        password = data.get("password")
        display_name = data.get("display_name")
        first_name = data.get("first_name", "")
        last_name = data.get("last_name", "")
        role = data.get("role", "student")
        selected_interest = data.get("selectedInterest", "")
        selected_track = data.get("selectedTrack", "")
        selected_tracks = data.get("selectedTracks", [])
        plan = data.get("plan", "free")
        whatsapp_number = (data.get("whatsappNumber") or "").strip()
        heard_about_us = (data.get("heardAboutUs") or "").strip()
        heard_about_us_detail = (data.get("heardAboutUsDetail") or "").strip()
        referred_by_code = (data.get("referralCode") or "").strip().upper()
        from apps.platform.models import current_legal_version

        terms_version = current_legal_version() if data.get("acceptTerms") else ""
        terms_accepted_at = timezone.now() if data.get("acceptTerms") else None
        utm_source = (data.get("utmSource") or "").strip()[:80]
        utm_medium = (data.get("utmMedium") or "").strip()[:80]
        utm_campaign = (data.get("utmCampaign") or "").strip()[:120]

        code = f"{secrets.randbelow(1_000_000):06d}"
        
        # Clear any previous pending registration for this email/username to avoid duplicates
        PendingRegistration.objects.filter(email=email).delete()
        
        pending = PendingRegistration.objects.create(
            email=email,
            username=username,
            display_name=display_name,
            first_name=first_name,
            last_name=last_name,
            password=make_password(password),
            role=role,
            selected_interest=selected_interest,
            selected_track=selected_track,
            selected_tracks=selected_tracks,
            plan=plan,
            whatsapp_number=whatsapp_number,
            heard_about_us=heard_about_us,
            heard_about_us_detail=heard_about_us_detail,
            referred_by_code=referred_by_code,
            terms_accepted_at=terms_accepted_at,
            terms_version=terms_version,
            utm_source=utm_source,
            utm_medium=utm_medium,
            utm_campaign=utm_campaign,
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


def send_waitlist_welcome(student):
    """Tell a new founding member they are in, in writing.

    Somebody who joins in October and hears nothing until November has no
    reason to remember us, nothing in their inbox to come back to, and no link
    to share from the place they actually forward things. The screen said all
    of this once; an email says it again in a month, which is when it matters.

    Only before launch. After that a signup is an ordinary signup and this
    would be a strange thing to receive.
    """
    from apps.platform.models import PlatformSettings
    from common.email import frontend_url, send_transactional_email

    platform = PlatformSettings.get_solo()
    if platform.launch_state == "live" or student.founding_member_number is None:
        return

    opens = ""
    if platform.launch_at:
        opens = platform.launch_at.strftime("%A %d %B %Y")

    lines = [
        f"You are founding member #{student.founding_member_number}.",
    ]
    if opens:
        lines.append(f"Courses open on {opens}. Your account is ready — nothing to redo.")
    if student.referral_code:
        lines.append(
            "Invite a friend with your link and you both get in early: "
            f"{frontend_url('/auth/register')}?ref={student.referral_code}"
        )
    if platform.community_url:
        lines.append(f"Meet the other founding members: {platform.community_url}")

    send_transactional_email(
        to_email=student.user.email,
        subject="You're in — MooreSkillUp",
        heading="You're in",
        greeting=f"Hi {student.user.first_name or student.user.display_name},",
        intro="Thanks for joining MooreSkillUp before we opened. Here is where you stand.",
        lines=lines,
        button_label="Open MooreSkillUp",
        button_url=frontend_url("/dashboard"),
    )


class VerifyRegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth-register"

    def post(self, request):
        from .models import PendingRegistration, StudentProfile, User

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
            first_name=pending.first_name,
            last_name=pending.last_name,
            role=pending.role,
            is_active=True,
            terms_accepted_at=pending.terms_accepted_at,
            terms_version=pending.terms_version,
        )
        user.password = pending.password
        user.save()

        student = StudentProfile.objects.create(
            user=user,
            selected_interest=pending.selected_interest,
            selected_track=pending.selected_track,
            selected_tracks=pending.selected_tracks,
            plan=pending.plan,
            onboarded=False,
            whatsapp_number=pending.whatsapp_number,
            heard_about_us=pending.heard_about_us,
            heard_about_us_detail=pending.heard_about_us_detail,
            utm_source=pending.utm_source,
            utm_medium=pending.utm_medium,
            utm_campaign=pending.utm_campaign,
        )

        # Numbered only once the email is verified, so the count on screen means
        # people we can actually reach on launch day rather than typos.
        from apps.platform.models import PlatformSettings as _Settings
        from apps.platform.models import assign_founding_number

        if _Settings.get_solo().launch_state != "live":
            assign_founding_number(student)

        # Their own code, and credit to whoever sent them. Credited here rather
        # than at the click, because a click is something anyone can produce by
        # refreshing their own link.
        from .models import generate_referral_code

        student.referral_code = generate_referral_code()
        if pending.referred_by_code:
            from .models import Ambassador

            # One namespace: a code belongs to an ambassador or to a student,
            # never both. A retired ambassador's code still credits nobody new.
            ambassador = Ambassador.objects.filter(
                code=pending.referred_by_code, is_active=True
            ).first()
            if ambassador:
                student.ambassador = ambassador
                student.referral_qualified_at = timezone.now()
            else:
                referrer = StudentProfile.objects.filter(
                    referral_code=pending.referred_by_code
                ).exclude(pk=student.pk).first()
                if referrer:
                    student.referred_by = referrer
                    student.referral_qualified_at = timezone.now()
        student.save(
            update_fields=[
                "referral_code",
                "referred_by",
                "ambassador",
                "referral_qualified_at",
                "updated_at",
            ]
        )

        send_waitlist_welcome(student)

        auth_response = build_session_auth_response(user, request=request)
        pending.delete()

        auth_response.status_code = status.HTTP_201_CREATED
        return auth_response


class ResendRegisterCodeView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth-register"

    def post(self, request):
        from common.email import send_transactional_email

        from .models import PendingRegistration

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
        auth_response = build_session_auth_response(user, request=request)
        auth_response.status_code = status.HTTP_201_CREATED
        return auth_response


def _send_login_otp(user):
    """Generate a 6-digit code, store it, and email it to the user."""
    from common.email import send_transactional_email

    from .models import EmailOtp

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


def two_factor_required_for_admins():
    from apps.platform.models import PlatformSettings

    return PlatformSettings.get_solo().require_admin_two_factor


def two_factor_applies(user):
    """Whether this sign-in needs an emailed code.

    Either the person turned it on, or the Super Admin requires it of every
    admin. It used to be the first alone, so it could not be required.
    """
    if user.two_factor_enabled:
        return True
    return user.role == "admin" and two_factor_required_for_admins()


class MyReferralsView(APIView):
    """Where a member stands: their link, their count, and what it has earned.

    One call, because the waiting room shows all of it at once and asking
    piecemeal invites the screen to disagree with itself.
    """

    permission_classes = [IsStudentUserRole]

    def get(self, request):
        from apps.platform.models import PlatformSettings

        from .models import StudentProfile

        student = request.user.student_profile
        platform = PlatformSettings.get_solo()

        qualified = StudentProfile.objects.filter(
            referred_by=student, referral_qualified_at__isnull=False
        ).count()

        # Position among people who have actually referred somebody. Being told
        # you are 400th when nobody has referred anyone is discouraging and
        # untrue.
        ahead = (
            StudentProfile.objects.filter(referral_qualified_at__isnull=False)
            .values("referred_by")
            .distinct()
            .count()
        )

        return response.Response(
            {
                "code": student.referral_code,
                "qualified": qualified,
                "rewardsEnabled": platform.referral_rewards_enabled,
                "earlyAccessAt": platform.referral_early_access_at,
                "freeCourseAt": platform.referral_free_course_at,
                "hasEarlyAccess": qualified >= platform.referral_early_access_at,
                "hasFreeCourse": qualified >= platform.referral_free_course_at,
                "referrersSoFar": ahead,
            }
        )


class ReferralLeaderboardView(APIView):
    """Top referrers, by the handle they chose.

    Usernames exist precisely so a public board can name somebody without
    putting their real name or email on a page anyone can read.
    """

    permission_classes = [IsStudentUserRole]

    def get(self, request):
        from django.db.models import Count

        from .models import StudentProfile

        rows = (
            StudentProfile.objects.filter(referrals__referral_qualified_at__isnull=False)
            .annotate(total=Count("referrals"))
            .order_by("-total", "founding_member_number")
            .values("user__username", "total")[:10]
        )
        return response.Response(
            [{"username": row["user__username"], "referrals": row["total"]} for row in rows]
        )


def _ambassador_payload(ambassador, stats):
    return {
        "id": str(ambassador.id),
        "name": ambassador.name,
        "code": ambassador.code,
        "phone": ambassador.phone,
        "email": ambassador.email,
        "community": ambassador.community,
        "notes": ambassador.notes,
        "isActive": ambassador.is_active,
        "createdAt": ambassador.created_at.isoformat(),
        "clicks": ambassador.clicks,
        # Started the form with this code but have not entered the emailed code
        # yet. Worth seeing: a high number here means the email is the problem.
        "started": stats.get("started", 0),
        "verified": stats.get("verified", 0),
        # The number that actually says whether the promotion works.
        "paying": stats.get("paying", 0),
    }


def _ambassador_stats(ambassadors):
    """Counts for every ambassador in three queries, not three per row."""
    from django.db.models import Count

    from apps.payments.models import Payment

    from .models import PendingRegistration

    codes = [a.code for a in ambassadors]
    started = dict(
        PendingRegistration.objects.filter(referred_by_code__in=codes)
        .values("referred_by_code")
        .annotate(n=Count("id"))
        .values_list("referred_by_code", "n")
    )
    verified = dict(
        StudentProfile.objects.filter(ambassador__in=ambassadors)
        .values("ambassador_id")
        .annotate(n=Count("id"))
        .values_list("ambassador_id", "n")
    )
    # Live money only: a test-key checkout is not a customer.
    paying = dict(
        Payment.objects.filter(
            student__ambassador__in=ambassadors, status="successful", mode="live"
        )
        .values("student__ambassador_id")
        .annotate(n=Count("student", distinct=True))
        .values_list("student__ambassador_id", "n")
    )
    return {
        a.id: {
            "started": started.get(a.code, 0),
            "verified": verified.get(a.id, 0),
            "paying": paying.get(a.id, 0),
        }
        for a in ambassadors
    }


def _clean_code(raw):
    code = (raw or "").strip().upper()
    if not re.fullmatch(r"[A-Z0-9-]{3,24}", code):
        return None
    return code


CODE_RULE = "3 to 24 characters: letters, numbers and dashes."


class AdminAmbassadorListView(AdminActionsPerMethod, APIView):
    """Every ambassador link, and what each one has brought in."""

    admin_actions = {"GET": ("ambassadors:view",), "POST": ("ambassadors:manage",)}

    def get(self, request):
        from .models import Ambassador

        ambassadors = list(Ambassador.objects.all())
        stats = _ambassador_stats(ambassadors)
        return response.Response([_ambassador_payload(a, stats[a.id]) for a in ambassadors])

    def post(self, request):
        from .models import Ambassador, generate_referral_code, referral_code_in_use

        name = (request.data.get("name") or "").strip()
        if not name:
            return response.Response(
                {"name": ["Give the ambassador a name you will recognise."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        requested = request.data.get("code")
        if requested:
            code = _clean_code(requested)
            if code is None:
                return response.Response({"code": [CODE_RULE]}, status=status.HTTP_400_BAD_REQUEST)
            if referral_code_in_use(code):
                return response.Response(
                    {"code": ["That code already belongs to someone."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            code = generate_referral_code()

        ambassador = Ambassador.objects.create(
            name=name[:120],
            code=code,
            phone=(request.data.get("phone") or "").strip()[:32],
            email=(request.data.get("email") or "").strip()[:254],
            community=(request.data.get("community") or "").strip()[:120],
            notes=(request.data.get("notes") or "").strip()[:500],
            created_by=request.user,
        )
        record_audit(
            request,
            "ambassador.create",
            resource_type="ambassador",
            resource_id=ambassador.id,
            resource_name=f"{ambassador.name} ({ambassador.code})",
        )
        stats = _ambassador_stats([ambassador])
        return response.Response(
            _ambassador_payload(ambassador, stats[ambassador.id]), status=status.HTTP_201_CREATED
        )


class AdminAmbassadorDetailView(AdminActionsPerMethod, APIView):
    admin_actions = {"PATCH": ("ambassadors:manage",)}

    def patch(self, request, ambassador_id):
        from .models import Ambassador, referral_code_in_use

        ambassador = Ambassador.objects.filter(id=ambassador_id).first()
        if ambassador is None:
            return response.Response(
                {"detail": "That ambassador no longer exists."}, status=status.HTTP_404_NOT_FOUND
            )

        changes = {}
        limits = (("name", 120), ("phone", 32), ("email", 254), ("community", 120), ("notes", 500))
        for field, limit in limits:
            if field in request.data:
                value = (request.data.get(field) or "").strip()[:limit]
                if field == "name" and not value:
                    return response.Response(
                        {"name": ["The name cannot be empty."]}, status=status.HTTP_400_BAD_REQUEST
                    )
                changes[field] = {"before": getattr(ambassador, field), "after": value}
                setattr(ambassador, field, value)

        if "code" in request.data:
            code = _clean_code(request.data.get("code"))
            if code is None:
                return response.Response({"code": [CODE_RULE]}, status=status.HTTP_400_BAD_REQUEST)
            if code != ambassador.code:
                if referral_code_in_use(code, exclude_ambassador=ambassador):
                    return response.Response(
                        {"code": ["That code already belongs to someone."]},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                # Changing a code breaks every link already shared with the old
                # one, so it is recorded like any other change and the screen
                # warns before doing it.
                changes["code"] = {"before": ambassador.code, "after": code}
                ambassador.code = code

        if "isActive" in request.data:
            active = bool(request.data.get("isActive"))
            changes["isActive"] = {"before": ambassador.is_active, "after": active}
            ambassador.is_active = active

        ambassador.save()
        record_audit(
            request,
            "ambassador.update",
            resource_type="ambassador",
            resource_id=ambassador.id,
            resource_name=f"{ambassador.name} ({ambassador.code})",
            changes=changes,
        )
        stats = _ambassador_stats([ambassador])
        return response.Response(_ambassador_payload(ambassador, stats[ambassador.id]))


class ReferralCodeCheckView(APIView):
    """What a code on the signup form belongs to, if anything.

    Lets the form say "Invited by ..." as somebody types, instead of accepting a
    mistyped code in silence and crediting nobody. Answers with the minimum: a
    student's public handle, or an ambassador's name, never an email or phone.
    """

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth-username"

    def get(self, request):
        from .models import Ambassador

        code = _clean_code(request.query_params.get("code"))
        if code is None:
            return response.Response({"valid": False})
        ambassador = Ambassador.objects.filter(code=code, is_active=True).first()
        if ambassador:
            return response.Response({"valid": True, "kind": "ambassador", "name": ambassador.name})
        student = StudentProfile.objects.select_related("user").filter(referral_code=code).first()
        if student:
            return response.Response({"valid": True, "kind": "friend", "name": student.user.username})
        return response.Response({"valid": False})


class ReferralClickView(APIView):
    """Count one visit through an ambassador link.

    The browser sends this once per session, so a refresh is not a new visitor.
    Student codes are not counted here: their measure is who verified, and
    visits would only invite people to farm them.
    """

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth-username"

    def post(self, request):
        from django.db.models import F

        from .models import Ambassador

        code = _clean_code(request.data.get("code"))
        if code:
            Ambassador.objects.filter(code=code, is_active=True).update(clicks=F("clicks") + 1)
        # Always the same answer, so the endpoint says nothing about which codes
        # exist.
        return response.Response(status=status.HTTP_204_NO_CONTENT)


class UsernameAvailableView(APIView):
    """Is this username free?

    The username is the handle a leaderboard can show without putting someone's
    real name or email on a public page, so it has to be unique — and telling
    someone that after they have filled in the whole form is the wrong moment.
    Throttled on its own bucket, not the login one: somebody trying usernames
    here would otherwise spend their sign-in budget and be locked out of the
    account they are in the middle of creating. It is still an enumeration
    surface, and usernames are public anyway, but not at speed.
    """

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth-username"

    def get(self, request):
        from .models import PendingRegistration, User

        username = (request.query_params.get("username") or "").strip()
        if len(username) < 3:
            return response.Response(
                {"available": False, "reason": "Usernames need at least 3 characters."}
            )
        if not re.fullmatch(r"[A-Za-z0-9_.-]+", username):
            return response.Response(
                {"available": False, "reason": "Letters, numbers, dots, dashes and underscores only."}
            )
        taken = (
            User.objects.filter(username__iexact=username).exists()
            # A name held by someone mid-verification is not free either, or two
            # people both get told yes and the second one fails at the last step.
            or PendingRegistration.objects.filter(username__iexact=username).exists()
        )
        return response.Response(
            {"available": not taken, "reason": "That one is taken." if taken else ""}
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth-login"

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError:
            email = (request.data.get("email") or "").strip()
            from .models import User

            user = User.objects.filter(email__iexact=email).first()
            if user and user.is_active and not user.is_locked:
                register_failed_login(user)
            raise
        user = serializer.validated_data["user"]
        # Sign-in can be closed while the team keeps working. Admins are never
        # locked out by it: a switch that can strand every administrator is not
        # a switch, it is an outage with no way back.
        from apps.platform.models import PlatformSettings

        if not PlatformSettings.get_solo().sign_in_enabled and user.role != "admin":
            return response.Response(
                {"detail": "Signing in is closed right now. Please try again shortly."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if two_factor_applies(user):
            _send_login_otp(user)
            return response.Response(
                {
                    "twoFactorRequired": True,
                    "userId": str(user.id),
                    "detail": "We emailed a 6-digit code to finish signing in.",
                }
            )
        clear_failed_logins(user)
        return build_session_auth_response(user, request=request)


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
        clear_failed_logins(user)
        return build_session_auth_response(user, request=request)


class TwoFactorToggleView(APIView):
    """The signed-in admin turns their own email 2FA on or off."""

    def post(self, request):
        if request.user.role != "admin":
            return response.Response(
                {"detail": "Two-factor sign-in is available for admin accounts."},
                status=status.HTTP_403_FORBIDDEN,
            )
        enabled = bool(request.data.get("enabled"))
        if not enabled and two_factor_required_for_admins():
            return response.Response(
                {
                    "detail": "Two-factor sign-in is required for every admin account. "
                    "Only the Super Admin can lift that, in Settings."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
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
        revoke_all_sessions(reset_token.user)
        cleared = response.Response({"detail": "Password reset successful."})
        return clear_auth_cookies(cleared)


class RefreshView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth-refresh"

    def post(self, request):
        refresh_token = request.data.get("refresh") or request.COOKIES.get(AUTH_REFRESH_COOKIE)
        if not refresh_token:
            return response.Response(
                {"detail": "No refresh session was found. Please sign in again."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            session, access, refreshed = refresh_session_from_token(refresh_token)
        except Exception as exc:
            cleared = response.Response(
                {"detail": str(exc) if str(exc) else "Your session has expired. Please sign in again."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            return clear_auth_cookies(cleared)

        payload = {"access": access, "user": UserSerializer(session.user).data}
        # Refresh tokens rotate, so a client relying on the body must receive the
        # new one or its next refresh fails and the session dies anyway.
        if include_refresh_in_body():
            payload["refresh"] = refreshed
        auth_response = response.Response(payload)
        return set_auth_cookies(auth_response, refreshed, session, request=request)


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
        revoke_all_sessions(request.user)
        cleared = response.Response({"detail": "Password updated successfully."})
        return clear_auth_cookies(cleared)


class LogoutView(APIView):
    def post(self, request):
        session_key = getattr(getattr(request, "auth", None), "get", lambda *_: None)("sid")
        if session_key:
            from .models import UserSession

            session = UserSession.objects.filter(session_key=session_key, user=request.user).first()
            if session:
                revoke_session(session)
        cleared = response.Response({"detail": "Signed out successfully."})
        return clear_auth_cookies(cleared)


class LogoutAllView(APIView):
    def post(self, request):
        revoke_all_sessions(request.user)
        cleared = response.Response({"detail": "Signed out of all devices."})
        return clear_auth_cookies(cleared)


def _credentials_handoff(temp_password):
    """How a new password reaches the person it belongs to.

    When email is delivered the password went to the teacher, and it never needs
    to appear on an admin's screen. When it isn't — production had never sent a
    single email — the invite goes nowhere and the admin is the only route, so
    the password comes back for them to pass on.

    Before, creation always returned it (even when emailed) while the UI said
    "emailed" either way, and resending an invite reset the password and
    returned nothing: with email off, that locked the teacher out with a
    password nobody had.
    """
    delivered = backend_delivers(settings.EMAIL_BACKEND)
    return {"emailDelivered": delivered, "temporaryPassword": None if delivered else temp_password}


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
        payload.update(_credentials_handoff(temp_password))
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
            teacher.user.is_active = request.data["status"] == "active"
            teacher.user.save(update_fields=["is_active"])
            if not teacher.user.is_active:
                from .session_auth import revoke_all_sessions

                revoke_all_sessions(teacher.user)
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
        handoff = _credentials_handoff(temp_password)
        detail = (
            f"New sign-in details emailed to {teacher.user.email}."
            if handoff["emailDelivered"]
            else "Email isn't being delivered, so the new password is shown here. "
            "Pass it on securely — the previous one no longer works."
        )
        return response.Response({"detail": detail, **handoff})


class AdminStudentListView(AdminActionsPerMethod, APIView):
    admin_actions = {"GET": ("students:view",)}

    def get(self, request):
        from django.db.models import Count, Max, Q
        from django.db.models.functions import Coalesce

        from .models import StudentProfile

        # Counted in the database. The serializer used to run three queries per
        # student — 56 for fifteen — because .filter() and .order_by() bypass a
        # prefetch. "Last studied" comes from lesson progress, the evidence, not
        # the copied Enrollment.last_accessed_at: ordering that field descending
        # puts empty values first in Postgres, so one never-opened enrolment made
        # an active student read "No recent activity".
        students = (
            StudentProfile.objects.select_related("user")
            .annotate(
                enrolled_count=Count("enrollments", distinct=True),
                completed_count=Count(
                    "enrollments", filter=Q(enrollments__status="completed"), distinct=True
                ),
                paid_count=Count("payments", filter=Q(payments__status="successful"), distinct=True),
                last_studied=Coalesce(
                    Max("enrollments__lesson_progress__last_accessed_at"),
                    Max("enrollments__lesson_progress__completed_at"),
                ),
            )
            .order_by("-user__created_at")
        )
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
        if not student.user.is_active:
            # Suspending has to end their sessions, not just the next sign-in.
            from .session_auth import revoke_all_sessions

            revoke_all_sessions(student.user)
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

        # A student's payments, certificates, enrolments and progress all
        # cascade from their profile. Deleting a paying student erased their
        # payment history, and deleting a certified one made a certificate that
        # someone else might be verifying simply stop existing. Those records
        # outlive the account; suspending keeps them.
        from apps.certificates.models import Certificate
        from apps.payments.models import Payment

        payments = Payment.objects.filter(student=student, status__in=["successful", "refunded"]).count()
        certificates = Certificate.objects.filter(student=student).count()
        if payments or certificates:
            held = " and ".join(
                part
                for part in (
                    f"{payments} payment record{'s' if payments != 1 else ''}" if payments else "",
                    f"{certificates} certificate{'s' if certificates != 1 else ''}" if certificates else "",
                )
                if part
            )
            return response.Response(
                {
                    "detail": f"{student.user.display_name} has {held}. Deleting the account would "
                    "erase those records, so it isn't allowed. Suspend the account instead — they won't be "
                    "able to sign in, and the records stay.",
                    "payments": payments,
                    "certificates": certificates,
                },
                status=status.HTTP_409_CONFLICT,
            )

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
        from apps.enrollments.models import Enrollment

        from .models import StudentProfile

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
        if not created and enrollment.status == "revoked":
            enrollment.status = "active"
            enrollment.access_source = "admin_grant"
            enrollment.save(update_fields=["status", "access_source", "updated_at"])
        elif not created:
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
        # Same rule as teachers: shown only when email can't deliver it.
        payload.update(_credentials_handoff(temp_password))
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
        # Same handoff as teachers: resetting a password and emailing it into a
        # backend that delivers nothing locked the admin out.
        handoff = _credentials_handoff(temp_password)
        detail = (
            f"New sign-in details emailed to {admin.email}."
            if handoff["emailDelivered"]
            else "Email isn't being delivered, so the new password is shown here. "
            "Pass it on securely — the previous one no longer works."
        )
        return response.Response({"detail": detail, **handoff})


class AdminUserLockView(APIView):
    permission_classes = [AdminAction("users:role-management")]

    def post(self, request, user_id):
        from .models import User, UserSession

        target = get_object_or_404(User, id=user_id)
        if target.id == request.user.id:
            return response.Response({"detail": "You cannot lock your own account."}, status=status.HTTP_400_BAD_REQUEST)
        target.is_active = False
        target.locked_until = None
        target.failed_login_attempts = 0
        target.save(update_fields=["is_active", "locked_until", "failed_login_attempts"])
        UserSession.objects.filter(user=target, is_active=True).update(is_active=False)
        return response.Response({"detail": f"{target.display_name} has been locked."})


class AdminUserUnlockView(APIView):
    permission_classes = [AdminAction("users:role-management")]

    def post(self, request, user_id):
        from .models import User

        target = get_object_or_404(User, id=user_id)
        target.is_active = True
        target.locked_until = None
        target.failed_login_attempts = 0
        target.save(update_fields=["is_active", "locked_until", "failed_login_attempts"])
        return response.Response({"detail": f"{target.display_name} has been unlocked."})


class AdminUserLogoutAllView(APIView):
    permission_classes = [AdminAction("users:role-management")]

    def post(self, request, user_id):
        from .models import User

        target = get_object_or_404(User, id=user_id)
        revoke_all_sessions(target)
        return response.Response({"detail": f"All sessions revoked for {target.display_name}."})


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok"})
