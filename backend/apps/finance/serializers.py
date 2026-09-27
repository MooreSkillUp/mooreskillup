"""Reading and writing what a teacher signed."""

from decimal import Decimal

from rest_framework import serializers

from .models import AGREEMENT_TYPES, CourseEarningTerm, TeacherTerms


class TeacherTermsSerializer(serializers.ModelSerializer):
    agreementType = serializers.ChoiceField(
        source="agreement_type", choices=AGREEMENT_TYPES, required=False
    )
    premiumSharePercent = serializers.DecimalField(
        source="premium_share_percent", max_digits=5, decimal_places=2, required=False
    )
    premiumCourseCount = serializers.IntegerField(
        source="premium_course_count", required=False, min_value=0, max_value=20
    )
    standardSharePercent = serializers.DecimalField(
        source="standard_share_percent", max_digits=5, decimal_places=2, required=False
    )
    earningMonths = serializers.IntegerField(
        source="earning_months", required=False, min_value=1, max_value=120
    )
    creationFee = serializers.DecimalField(
        source="creation_fee", max_digits=12, decimal_places=2, required=False
    )
    agreementVersion = serializers.CharField(
        source="agreement_version", required=False, allow_blank=True
    )
    signedOn = serializers.DateField(source="signed_on", required=False, allow_null=True)
    premiumCoursesLeft = serializers.IntegerField(source="premium_courses_left", read_only=True)
    nextCourseShare = serializers.SerializerMethodField()

    class Meta:
        model = TeacherTerms
        fields = (
            "id",
            "agreementType",
            "premiumSharePercent",
            "premiumCourseCount",
            "standardSharePercent",
            "earningMonths",
            "creationFee",
            "agreementVersion",
            "signedOn",
            "note",
            "premiumCoursesLeft",
            "nextCourseShare",
        )

    def get_nextCourseShare(self, obj):
        """What their next published course would earn, as the admin screen
        should show it before anyone has to work it out."""
        published = obj.teacher.earning_terms.count()
        return str(obj.share_for_course_number(published + 1))

    def validate(self, attrs):
        premium = attrs.get(
            "premium_share_percent", getattr(self.instance, "premium_share_percent", None)
        )
        standard = attrs.get(
            "standard_share_percent", getattr(self.instance, "standard_share_percent", None)
        )
        count = attrs.get(
            "premium_course_count", getattr(self.instance, "premium_course_count", 0)
        )
        if premium is not None and standard is not None and count and premium < standard:
            raise serializers.ValidationError(
                {
                    "premiumSharePercent": (
                        "The higher rate is below the standard one. Either raise it or set the "
                        "number of courses it covers to zero."
                    )
                }
            )
        for field, value in (
            ("premiumSharePercent", premium),
            ("standardSharePercent", standard),
        ):
            if value is not None and not (Decimal("0") <= value <= Decimal("100")):
                raise serializers.ValidationError({field: "A share must be between 0 and 100."})
        return attrs


class CourseEarningTermSerializer(serializers.ModelSerializer):
    courseId = serializers.PrimaryKeyRelatedField(source="course", read_only=True)
    courseTitle = serializers.CharField(source="course.title", read_only=True)
    teacherName = serializers.CharField(source="teacher.user.display_name", read_only=True, default="")
    sharePercent = serializers.DecimalField(
        source="share_percent", max_digits=5, decimal_places=2, read_only=True
    )
    courseNumber = serializers.IntegerField(source="course_number", read_only=True)
    startsAt = serializers.DateTimeField(source="starts_at", read_only=True)
    endsAt = serializers.DateTimeField(source="ends_at", read_only=True)
    stoppedAt = serializers.DateTimeField(source="stopped_at", read_only=True)
    needsReview = serializers.BooleanField(source="needs_review", read_only=True)
    isRunning = serializers.BooleanField(source="is_running", read_only=True)

    class Meta:
        model = CourseEarningTerm
        fields = (
            "id",
            "courseId",
            "courseTitle",
            "teacherName",
            "role",
            "sharePercent",
            "courseNumber",
            "startsAt",
            "endsAt",
            "stoppedAt",
            "stopped_reason",
            "needsReview",
            "isRunning",
        )
