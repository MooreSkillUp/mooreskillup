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
    class Meta:
        model = TeacherProfile
        fields = ("program", "track", "bio", "status")


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
    class Meta:
        model = User
        fields = ("username", "display_name", "avatar_url")


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    interests = serializers.ListField(child=serializers.CharField(), write_only=True, required=False)
    selectedInterest = serializers.CharField(write_only=True, required=False, allow_blank=True)
    selectedTrack = serializers.CharField(write_only=True, required=False, allow_blank=True)
    selectedTracks = serializers.ListField(child=serializers.CharField(), write_only=True, required=False)
    plan = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = (
            "email",
            "username",
            "display_name",
            "password",
            "role",
            "interests",
            "selectedInterest",
            "selectedTrack",
            "selectedTracks",
            "plan",
        )

    def validate_role(self, value):
        if value == "admin":
            raise serializers.ValidationError("Admin accounts cannot be created through public registration.")
        return value

    def create(self, validated_data):
        role = validated_data.get("role", "student")
        selected_interest = validated_data.pop("selectedInterest", "")
        selected_track = validated_data.pop("selectedTrack", "")
        selected_tracks = validated_data.pop("selectedTracks", [])
        interests = validated_data.pop("interests", [])
        plan = validated_data.pop("plan", "free")
        user = User.objects.create_user(**validated_data)
        if role == "teacher":
            TeacherProfile.objects.create(user=user, program=selected_interest or (interests[0] if interests else ""), track=selected_track)
        elif role == "student":
            StudentProfile.objects.create(
                user=user,
                selected_interest=selected_interest or (interests[0] if interests else ""),
                selected_track=selected_track or (selected_tracks[0] if selected_tracks else ""),
                plan=plan or "free",
            )
        return user


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


def build_auth_response(user: User):
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": UserSerializer(user).data,
    }
