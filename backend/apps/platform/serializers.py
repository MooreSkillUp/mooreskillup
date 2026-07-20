from rest_framework import serializers

from .models import AuditLog, AuthenticationSettings, PlatformSettings


class AuditLogSerializer(serializers.ModelSerializer):
    actorEmail = serializers.EmailField(source="actor_email", read_only=True)
    actorName = serializers.CharField(source="actor_name", read_only=True)
    actorRole = serializers.CharField(source="actor_role", read_only=True)
    resourceType = serializers.CharField(source="resource_type", read_only=True)
    resourceId = serializers.CharField(source="resource_id", read_only=True)
    resourceName = serializers.CharField(source="resource_name", read_only=True)
    ipAddress = serializers.IPAddressField(source="ip_address", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "actorEmail",
            "actorName",
            "actorRole",
            "action",
            "resourceType",
            "resourceId",
            "resourceName",
            "metadata",
            "changes",
            "status",
            "ipAddress",
            "createdAt",
        )


class PlatformSettingsSerializer(serializers.ModelSerializer):
    siteName = serializers.CharField(source="site_name", required=False)
    maintenanceMode = serializers.BooleanField(source="maintenance_mode", required=False)
    maintenanceMessage = serializers.CharField(
        source="maintenance_message", required=False, allow_blank=True
    )
    studentRegistrationOpen = serializers.BooleanField(source="student_registration_open", required=False)
    auditRetentionDays = serializers.IntegerField(
        source="audit_retention_days", required=False, min_value=7, max_value=3650
    )
    requireAdminSecondApproval = serializers.BooleanField(
        source="require_admin_second_approval", required=False
    )
    allowTeacherAnnouncements = serializers.BooleanField(
        source="allow_teacher_announcements", required=False
    )
    allowModeratorAnnouncements = serializers.BooleanField(
        source="allow_moderator_announcements", required=False
    )
    featureReviewsEnabled = serializers.BooleanField(source="feature_reviews_enabled", required=False)
    featureCertificatesEnabled = serializers.BooleanField(source="feature_certificates_enabled", required=False)
    featureRecommendationsEnabled = serializers.BooleanField(
        source="feature_recommendations_enabled", required=False
    )
    featureAchievementsEnabled = serializers.BooleanField(source="feature_achievements_enabled", required=False)
    featureLeaderboardEnabled = serializers.BooleanField(source="feature_leaderboard_enabled", required=False)
    featureQuizEnabled = serializers.BooleanField(source="feature_quiz_enabled", required=False)
    defaultCourseBannerTheme = serializers.CharField(source="default_course_banner_theme", required=False, allow_blank=True)
    defaultCourseBannerAccent = serializers.CharField(source="default_course_banner_accent", required=False, allow_blank=True)
    defaultCourseBannerTextColor = serializers.CharField(source="default_course_banner_text_color", required=False, allow_blank=True)
    refundWindowDays = serializers.IntegerField(source="refund_window_days", required=False, min_value=0, max_value=365)
    refundMaxProgressPercent = serializers.IntegerField(
        source="refund_max_progress_percent", required=False, min_value=0, max_value=100
    )
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = PlatformSettings
        fields = (
            "siteName",
            "maintenanceMode",
            "maintenanceMessage",
            "studentRegistrationOpen",
            "auditRetentionDays",
            "requireAdminSecondApproval",
            "allowTeacherAnnouncements",
            "allowModeratorAnnouncements",
            "featureReviewsEnabled",
            "featureCertificatesEnabled",
            "featureRecommendationsEnabled",
            "featureAchievementsEnabled",
            "featureLeaderboardEnabled",
            "featureQuizEnabled",
            "defaultCourseBannerTheme",
            "defaultCourseBannerAccent",
            "defaultCourseBannerTextColor",
            "refundWindowDays",
            "refundMaxProgressPercent",
            "updatedAt",
        )


class AuthenticationSettingsSerializer(serializers.ModelSerializer):
    maxStudentDevices = serializers.IntegerField(source="max_student_devices", required=False, min_value=1, max_value=10)
    maxTeacherDevices = serializers.IntegerField(source="max_teacher_devices", required=False, min_value=1, max_value=10)
    maxAdminDevices = serializers.IntegerField(source="max_admin_devices", required=False, min_value=1, max_value=10)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = AuthenticationSettings
        fields = ("maxStudentDevices", "maxTeacherDevices", "maxAdminDevices", "updatedAt")
