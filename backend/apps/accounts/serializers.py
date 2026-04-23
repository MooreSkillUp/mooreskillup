import os
import secrets

from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from apps.enrollments.models import Enrollment, Watchlist

from .models import PasswordResetToken, StudentProfile, TeacherProfile, User


class StudentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = ("selected_interest", "selected_track", "plan")


class TeacherProfileSerializer(serializers.ModelSerializer):
    displayName = serializers.CharField(source="user.display_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    userId = serializers.UUIDField(source="user_id", read_only=True)
    academicProgram = serializers.CharField(source="program", read_only=True)
    academicTrack = serializers.CharField(source="track", read_only=True)

    class Meta:
        model = TeacherProfile
        fields = (
            "id",
            "userId",
            "displayName",
            "email",
            "program",
            "track",
            "academicProgram",
            "academicTrack",
            "bio",
            "status",
        )


class UserSerializer(serializers.ModelSerializer):
    displayName = serializers.CharField(source="display_name", read_only=True)
    avatarUrl = serializers.CharField(source="avatar_url", read_only=True)
    selectedInterest = serializers.SerializerMethodField()
    selectedTrack = serializers.SerializerMethodField()
    selectedTracks = serializers.SerializerMethodField()
    interests = serializers.SerializerMethodField()
    wishlist = serializers.SerializerMethodField()
    purchasedCourseIds = serializers.SerializerMethodField()
    plan = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "username",
            "displayName",
            "role",
            "avatar",
            "avatarUrl",
            "selectedInterest",
            "selectedTrack",
            "selectedTracks",
            "interests",
            "wishlist",
            "purchasedCourseIds",
            "plan",
            "status",
        )

    def get_selectedInterest(self, obj):
        if hasattr(obj, "student_profile"):
            return obj.student_profile.selected_interest or None
        if hasattr(obj, "teacher_profile"):
            return obj.teacher_profile.program or None
        return None

    def get_selectedTrack(self, obj):
        if hasattr(obj, "student_profile"):
            return obj.student_profile.selected_track or None
        if hasattr(obj, "teacher_profile"):
            return obj.teacher_profile.track or None
        return None

    def get_selectedTracks(self, obj):
        selected_track = self.get_selectedTrack(obj)
        return [selected_track] if selected_track else []

    def get_interests(self, obj):
        selected_interest = self.get_selectedInterest(obj)
        return [selected_interest] if selected_interest else []

    def get_wishlist(self, obj):
        if hasattr(obj, "student_profile"):
            return list(
                Watchlist.objects.filter(student=obj.student_profile).values_list("course_id", flat=True)
            )
        return []

    def get_purchasedCourseIds(self, obj):
        if hasattr(obj, "student_profile"):
            return list(
                Enrollment.objects.filter(student=obj.student_profile).values_list("course_id", flat=True)
            )
        return []

    def get_plan(self, obj):
        if hasattr(obj, "student_profile"):
            return obj.student_profile.plan
        return "free"

    def get_status(self, obj):
        if obj.role == "teacher" and hasattr(obj, "teacher_profile"):
            return obj.teacher_profile.status
        return "active" if obj.is_active else "disabled"


class UserUpdateSerializer(serializers.ModelSerializer):
    displayName = serializers.CharField(source="display_name", required=False)
    avatarUrl = serializers.URLField(source="avatar_url", required=False, allow_blank=True)
    selectedInterest = serializers.CharField(required=False, allow_blank=True)
    selectedTrack = serializers.CharField(required=False, allow_blank=True)
    selectedTracks = serializers.ListField(child=serializers.CharField(), required=False)
    interests = serializers.ListField(child=serializers.CharField(), required=False)

    class Meta:
        model = User
        fields = (
            "username",
            "displayName",
            "avatarUrl",
            "selectedInterest",
            "selectedTrack",
            "selectedTracks",
            "interests",
        )

    def update(self, instance, validated_data):
        selected_interest = validated_data.pop("selectedInterest", None)
        selected_track = validated_data.pop("selectedTrack", None)
        selected_tracks = validated_data.pop("selectedTracks", None)
        interests = validated_data.pop("interests", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if hasattr(instance, "student_profile"):
            profile = instance.student_profile
            if selected_interest is not None:
                profile.selected_interest = selected_interest
            elif interests:
                profile.selected_interest = interests[0]
            if selected_track is not None:
                profile.selected_track = selected_track
            elif selected_tracks:
                profile.selected_track = selected_tracks[0]
            profile.save()
        elif hasattr(instance, "teacher_profile"):
            profile = instance.teacher_profile
            if selected_interest is not None:
                profile.program = selected_interest
            elif interests:
                profile.program = interests[0]
            if selected_track is not None:
                profile.track = selected_track
            elif selected_tracks:
                profile.track = selected_tracks[0]
            profile.save()

        return instance


class RegisterSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    displayName = serializers.CharField(source="display_name", write_only=True, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)
    interests = serializers.ListField(child=serializers.CharField(), write_only=True, required=False)
    selectedInterest = serializers.CharField(write_only=True, required=False, allow_blank=True)
    selectedTrack = serializers.CharField(write_only=True, required=False, allow_blank=True)
    selectedTracks = serializers.ListField(child=serializers.CharField(), write_only=True, required=False)
    plan = serializers.CharField(write_only=True, required=False, allow_blank=True)
    adminRegistrationToken = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = (
            "email",
            "username",
            "display_name",
            "displayName",
            "password",
            "role",
            "interests",
            "selectedInterest",
            "selectedTrack",
            "selectedTracks",
            "plan",
            "adminRegistrationToken",
        )

    def validate(self, attrs):
        role = attrs.get("role", "student")
        allow_admin_registration = self.context.get("allow_admin_registration", False)
        allow_teacher_registration = self.context.get("allow_teacher_registration", False)

        if role == "admin":
            if not allow_admin_registration:
                raise serializers.ValidationError(
                    {"role": "Admin accounts cannot be created through public registration."}
                )
            expected_token = os.getenv("ADMIN_REGISTRATION_TOKEN", "").strip()
            provided_token = attrs.pop("adminRegistrationToken", "").strip()
            if not expected_token:
                raise serializers.ValidationError(
                    {"adminRegistrationToken": "Admin registration is not configured on this server."}
                )
            if not provided_token or provided_token != expected_token:
                raise serializers.ValidationError(
                    {"adminRegistrationToken": "Invalid admin registration token."}
                )
        else:
            attrs.pop("adminRegistrationToken", None)

        if role == "teacher" and not allow_teacher_registration:
            raise serializers.ValidationError(
                {"role": "Teacher accounts must be created by an admin."}
            )

        if not attrs.get("display_name"):
            username = attrs.get("username", "").strip()
            attrs["display_name"] = " ".join(
                part.capitalize() for part in username.replace(".", " ").replace("_", " ").split() if part
            ) or username

        return attrs

    def create(self, validated_data):
        role = validated_data.get("role", "student")
        selected_interest = validated_data.pop("selectedInterest", "")
        selected_track = validated_data.pop("selectedTrack", "")
        selected_tracks = validated_data.pop("selectedTracks", [])
        interests = validated_data.pop("interests", [])
        plan = validated_data.pop("plan", "free")
        validated_data.pop("adminRegistrationToken", None)
        if role == "admin":
            validated_data["is_staff"] = True
        user = User.objects.create_user(**validated_data)
        if role == "teacher":
            TeacherProfile.objects.create(
                user=user,
                program=selected_interest or (interests[0] if interests else ""),
                track=selected_track or (selected_tracks[0] if selected_tracks else ""),
            )
        elif role == "student":
            StudentProfile.objects.create(
                user=user,
                selected_interest=selected_interest or (interests[0] if interests else ""),
                selected_track=selected_track or (selected_tracks[0] if selected_tracks else ""),
                plan=plan or "free",
            )
        return user


class AdminTeacherCreateSerializer(serializers.Serializer):
    displayName = serializers.CharField()
    email = serializers.EmailField()
    program = serializers.CharField()
    track = serializers.CharField()
    password = serializers.CharField(required=False, allow_blank=True, min_length=8)
    status = serializers.ChoiceField(choices=("active", "inactive"), required=False, default="active")

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        display_name = validated_data["displayName"].strip()
        email = validated_data["email"]
        program = validated_data["program"].strip()
        track = validated_data["track"].strip()
        status = validated_data.get("status", "active")
        password = validated_data.get("password", "").strip() or secrets.token_urlsafe(10)
        username_base = display_name.lower().replace(" ", ".")
        username = username_base
        suffix = 1
        while User.objects.filter(username=username).exists():
            suffix += 1
            username = f"{username_base}.{suffix}"

        user = User.objects.create_user(
            email=email,
            username=username,
            display_name=display_name,
            password=password,
            role="teacher",
        )
        teacher_profile = TeacherProfile.objects.create(
            user=user,
            program=program,
            track=track,
            status=status,
        )
        teacher_profile._generated_password = password
        return teacher_profile


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(email=attrs["email"], password=attrs["password"])
        if not user:
            raise serializers.ValidationError("Invalid credentials.")
        attrs["user"] = user
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField(min_length=8)

    def validate(self, attrs):
        try:
            reset_token = PasswordResetToken.objects.get(token=attrs["token"])
        except PasswordResetToken.DoesNotExist as exc:
            raise serializers.ValidationError({"token": "Invalid token."}) from exc

        if reset_token.used_at or reset_token.expires_at <= timezone.now():
            raise serializers.ValidationError({"token": "Expired or used token."})
        attrs["reset_token"] = reset_token
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField()
    new_password = serializers.CharField(min_length=8)

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.check_password(attrs["current_password"]):
            raise serializers.ValidationError({"current_password": "Current password is incorrect."})
        return attrs


def build_auth_response(user: User):
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": UserSerializer(user).data,
    }
