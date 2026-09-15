from django.db.models import Avg, Count, Sum
from rest_framework import serializers

from apps.enrollments.models import Enrollment, Watchlist
from apps.progress.models import LessonProgress

from .models import (
    Course,
    CourseReview,
    CourseTag,
    CourseVersion,
    Lesson,
    Project,
    Section,
    Task,
    TeacherActivityLog,
)
from .video import build_embed_url, validate_video_url


class CourseReviewSerializer(serializers.ModelSerializer):
    studentName = serializers.CharField(source="student.user.display_name", read_only=True)
    studentAvatar = serializers.CharField(source="student.user.avatar_url", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = CourseReview
        fields = ("id", "rating", "comment", "status", "studentName", "studentAvatar", "createdAt")
        read_only_fields = ("status",)

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value


class LessonSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source="content_type", read_only=True)
    status = serializers.SerializerMethodField()
    duration = serializers.SerializerMethodField()
    embedUrl = serializers.SerializerMethodField()
    resourceLinks = serializers.JSONField(source="resource_links", read_only=True)
    durationMinutes = serializers.IntegerField(source="duration_minutes", read_only=True)
    isPreviewable = serializers.BooleanField(source="is_previewable", read_only=True)
    completed = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = (
            "id",
            "title",
            "type",
            "content_type",
            "video_url",
            "text_content",
            "resource_links",
            "resourceLinks",
            "tags",
            "duration_minutes",
            "durationMinutes",
            "duration",
            "embedUrl",
            "order",
            "is_previewable",
            "isPreviewable",
            "is_published",
            "status",
            "completed",
        )

    def get_duration(self, obj):
        return f"{obj.duration_minutes} min" if obj.duration_minutes else None

    def get_completed(self, obj):
        """Whether the signed-in student has finished this lesson.

        Read from a set the parent serializer puts in context, so a course with
        forty lessons costs one query rather than forty.
        """
        completed_ids = self.context.get("completed_lesson_ids")
        if completed_ids is None:
            return False
        return obj.id in completed_ids

    def get_embedUrl(self, obj):
        return build_embed_url(obj.video_url)

    def get_status(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated or request.user.role != "student":
            return "unlocked"

        student_profile = request.user.student_profile
        enrollment = Enrollment.objects.filter(student=student_profile, course=obj.section.course).first()
        if not enrollment:
            if obj.section.access_type == "free" or obj.is_previewable or obj.section.course.price == 0:
                return "unlocked"
            return "locked"

        progress = LessonProgress.objects.filter(enrollment=enrollment, lesson=obj).first()
        if progress:
            if progress.status == "completed":
                return "completed"
            if progress.status == "in_progress":
                return "in-progress"
        return "unlocked"

    def to_internal_value(self, data):
        mutable = _apply_camel_aliases(data, {"resourceLinks": "resource_links"})
        return super().to_internal_value(mutable)

    def validate(self, attrs):
        content_type = attrs.get("content_type", getattr(self.instance, "content_type", None))
        video_url = attrs.get("video_url", getattr(self.instance, "video_url", ""))
        if content_type == "video" and video_url:
            validate_video_url(video_url)
        return attrs


def _apply_camel_aliases(data, mapping):
    """Let the studio send camelCase while the model fields stay snake_case."""
    mutable = data.copy() if hasattr(data, "copy") else dict(data)
    for camel, snake in mapping.items():
        if camel in mutable and snake not in mutable:
            mutable[snake] = mutable[camel]
    return mutable


class TaskSerializer(serializers.ModelSerializer):
    """An assignment. Submission is off-platform via submission_type + URL."""

    # camelCase mirrors for reading; writes use the snake_case model fields.
    submissionType = serializers.CharField(source="submission_type", read_only=True)
    submissionUrl = serializers.URLField(source="submission_url", read_only=True)
    howToSubmit = serializers.CharField(source="how_to_submit", read_only=True)
    dueDate = serializers.DateField(source="due_date", read_only=True)

    class Meta:
        model = Task
        fields = (
            "id",
            "title",
            "instructions",
            "submission_type",
            "submissionType",
            "submission_url",
            "submissionUrl",
            "how_to_submit",
            "howToSubmit",
            "due_date",
            "dueDate",
            "resource_links",
            "order",
            "is_required",
        )

    def to_internal_value(self, data):
        mutable = _apply_camel_aliases(
            data,
            {
                "submissionType": "submission_type",
                "submissionUrl": "submission_url",
                "howToSubmit": "how_to_submit",
                "dueDate": "due_date",
            },
        )
        alias = {
            "whatsapp-group": "whatsapp_group",
            "google-form": "google_form",
            "external-link": "external_link",
        }
        if mutable.get("submission_type") in alias:
            mutable["submission_type"] = alias[mutable["submission_type"]]
        return super().to_internal_value(mutable)


class ProjectSerializer(serializers.ModelSerializer):
    submissionUrl = serializers.URLField(source="submission_url", read_only=True)
    howToSubmit = serializers.CharField(source="how_to_submit", read_only=True)

    class Meta:
        model = Project
        fields = (
            "id",
            "title",
            "description",
            "requirements",
            "deliverables",
            "submission_url",
            "submissionUrl",
            "how_to_submit",
            "howToSubmit",
            "order",
            "is_required",
        )

    def to_internal_value(self, data):
        mutable = _apply_camel_aliases(
            data, {"submissionUrl": "submission_url", "howToSubmit": "how_to_submit"}
        )
        return super().to_internal_value(mutable)


class SectionSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)
    tasks = TaskSerializer(many=True, read_only=True)
    projects = ProjectSerializer(many=True, read_only=True)
    isFree = serializers.SerializerMethodField()
    isLocked = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    quiz = serializers.SerializerMethodField()
    lockReason = serializers.SerializerMethodField()
    lessonCount = serializers.SerializerMethodField()
    durationMinutes = serializers.SerializerMethodField()
    completedCount = serializers.SerializerMethodField()

    class Meta:
        model = Section
        fields = (
            "id",
            "title",
            "description",
            "order",
            "access_type",
            "is_published",
            "isFree",
            "isLocked",
            "status",
            "quiz",
            "lockReason",
            "lessonCount",
            "durationMinutes",
            "completedCount",
            "lessons",
            "tasks",
            "projects",
        )

    def _published_lessons(self, obj):
        return [lesson for lesson in obj.lessons.all() if lesson.is_published]

    def get_quiz(self, obj):
        """The section's quiz, if it has one worth showing.

        An unready quiz — published with no questions, or a question with no
        correct answer — is reported as absent, matching how the progression
        rules treat it. Showing a quiz a student cannot pass would be worse
        than showing none.
        """
        from apps.quizzes.models import Quiz

        quiz = Quiz.objects.filter(section=obj, kind="section").first()
        if not quiz or not quiz.is_ready:
            return None

        passed = False
        request = self.context.get("request")
        if request and request.user.is_authenticated and request.user.role == "student":
            from apps.quizzes.models import has_passed

            passed = has_passed(request.user.student_profile, quiz)

        return {
            "id": str(quiz.id),
            "title": quiz.title,
            "questionCount": quiz.questions_per_attempt or quiz.question_count,
            "passMarkPercent": quiz.pass_mark_percent,
            "passed": passed,
        }

    def get_lockReason(self, obj):
        """Why this section is shut, in a word the UI can turn into a sentence.

        "Locked" alone makes a student guess whether to pay, to finish
        something, or to wait. Naming the reason is the difference between a
        closed door and a signpost.
        """
        if not self.get_isLocked(obj):
            return None
        reachable = self.context.get("reachable_section_ids")
        if reachable is not None and obj.id not in reachable:
            return "sequential"
        return "enrolment"

    def get_lessonCount(self, obj):
        return len(self._published_lessons(obj))

    def get_durationMinutes(self, obj):
        """Total minutes in this section, from the per-lesson estimates.

        Lessons without a duration count as zero rather than guessing — a made-up
        figure on a curriculum is worse than an obviously incomplete one.
        """
        return sum(lesson.duration_minutes or 0 for lesson in self._published_lessons(obj))

    def get_completedCount(self, obj):
        """Lessons this student has finished in this section.

        Cached on the serializer context so a six-section course does one query
        rather than six.
        """
        completed = self.context.get("_completed_lesson_ids")
        if completed is None:
            enrollment = self._get_enrollment(obj)
            if not enrollment:
                self.context["_completed_lesson_ids"] = set()
                return 0
            from apps.progress.models import LessonProgress

            completed = set(
                LessonProgress.objects.filter(enrollment=enrollment, status="completed").values_list(
                    "lesson_id", flat=True
                )
            )
            self.context["_completed_lesson_ids"] = completed
        return sum(1 for lesson in self._published_lessons(obj) if lesson.id in completed)

    def _get_enrollment(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated or request.user.role != "student":
            return None
        return Enrollment.objects.filter(student=request.user.student_profile, course=obj.course).first()

    def get_isFree(self, obj):
        return obj.course.price == 0 or obj.access_type == "free"

    def get_isLocked(self, obj):
        """Locked by entitlement, or by not having got here yet.

        Two separate reasons a section can be shut, and both have to be checked:
        payment, and — in a sequential course — whether the sections before it
        are finished. The reachable set is computed once by the parent
        serializer and read from context, so this stays cheap per section.
        """
        request = self.context.get("request")
        if not request or not request.user.is_authenticated or request.user.role != "student":
            return False

        reachable = self.context.get("reachable_section_ids")
        if reachable is not None and obj.id not in reachable:
            return True

        if obj.course.price == 0 or obj.access_type == "free":
            return False
        return not Enrollment.objects.filter(
            student=request.user.student_profile, course=obj.course
        ).exists()

    def get_status(self, obj):
        if self.get_isLocked(obj):
            return "locked"
        return "unlocked"


class CourseSerializer(serializers.ModelSerializer):
    sections = SectionSerializer(many=True, read_only=True)
    teacherName = serializers.SerializerMethodField()
    teacherId = serializers.SerializerMethodField()
    ownerType = serializers.SerializerMethodField()
    ownerId = serializers.SerializerMethodField()
    teacherProgram = serializers.SerializerMethodField()
    teacherTrack = serializers.SerializerMethodField()
    producedBy = serializers.SerializerMethodField()
    isOwned = serializers.SerializerMethodField()
    isInWatchlist = serializers.SerializerMethodField()
    cta = serializers.SerializerMethodField()
    categoryName = serializers.CharField(source="category.name", read_only=True)
    subcategoryName = serializers.CharField(source="subcategory.name", read_only=True)
    totalLessons = serializers.SerializerMethodField()
    totalDurationMinutes = serializers.SerializerMethodField()
    ratingBreakdown = serializers.SerializerMethodField()
    learningOutcomes = serializers.JSONField(source="learning_outcomes", required=False)
    categoryId = serializers.UUIDField(source="category_id", read_only=True)
    subcategoryId = serializers.UUIDField(source="subcategory_id", read_only=True)
    program = serializers.CharField(source="category.name", read_only=True)
    track = serializers.CharField(source="subcategory.name", read_only=True)
    lastUpdated = serializers.DateTimeField(source="updated_at", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    analytics = serializers.SerializerMethodField()
    tags = serializers.SlugRelatedField(slug_field="name", many=True, queryset=CourseTag.objects.all(), required=False)
    discountPrice = serializers.DecimalField(
        source="discount_price", max_digits=12, decimal_places=2, required=False, allow_null=True
    )
    metaTitle = serializers.CharField(source="meta_title", required=False, allow_blank=True)
    metaDescription = serializers.CharField(source="meta_description", required=False, allow_blank=True)
    techStack = serializers.JSONField(source="tech_stack", required=False)
    certificateEnabled = serializers.BooleanField(source="certificate_enabled", required=False)
    isRecommended = serializers.BooleanField(source="is_recommended", required=False)
    bannerImage = serializers.ImageField(source="banner_image", required=False, allow_null=True)
    bannerImageAlt = serializers.CharField(source="banner_image_alt", required=False, allow_blank=True)
    bannerTheme = serializers.CharField(source="banner_theme", required=False, allow_blank=True)
    pendingDeletion = serializers.BooleanField(source="pending_deletion", read_only=True)
    deletionReason = serializers.CharField(source="deletion_reason", read_only=True)
    averageRating = serializers.SerializerMethodField()
    reviewCount = serializers.SerializerMethodField()
    categoryAccentColor = serializers.CharField(source="category.accent_color", read_only=True)
    categoryBannerTheme = serializers.CharField(source="category.banner_theme", read_only=True)

    def to_internal_value(self, data):
        import json
        if hasattr(data, "_mutable") and not data._mutable:
            data = data.copy()

        for key in ["tags", "tech_stack"]:
            if key in data:
                val = data[key]
                if isinstance(val, str) and val.startswith("[") and val.endswith("]"):
                    try:
                        parsed = json.loads(val)
                        if hasattr(data, "setlist"):
                            data.setlist(key, parsed)
                        else:
                            data[key] = parsed
                    except Exception:
                        pass
        return super().to_internal_value(data)

    class Meta:
        model = Course
        fields = (
            "id",
            "slug",
            "title",
            "subtitle",
            "overview",
            "scheme_of_work",
            "roadmap_link",
            "level",
            "price",
            "discount_price",
            "discountPrice",
            "currency",
            "status",
            "visibility",
            "featured",
            "total_lessons",
            "totalLessons",
            "totalDurationMinutes",
            "ratingBreakdown",
            "learning_outcomes",
            "learningOutcomes",
            "meta_title",
            "metaTitle",
            "meta_description",
            "metaDescription",
            "tech_stack",
            "techStack",
            "certificate_enabled",
            "certificateEnabled",
            "is_recommended",
            "isRecommended",
            "bannerImage",
            "bannerImageAlt",
            "bannerTheme",
            "pendingDeletion",
            "deletionReason",
            "averageRating",
            "reviewCount",
            "teacherName",
            "teacherId",
            "ownerType",
            "ownerId",
            "teacherProgram",
            "teacherTrack",
            "producedBy",
            "isOwned",
            "isInWatchlist",
            "cta",
            "categoryName",
            "subcategoryName",
            "categoryId",
            "subcategoryId",
            "program",
            "track",
            "lastUpdated",
            "createdAt",
            "analytics",
            "category",
            "subcategory",
            "tags",
            "sections",
            "categoryAccentColor",
            "categoryBannerTheme",
        )

    def get_teacherName(self, obj):
        return obj.teacher.user.display_name if obj.teacher else "Admin ownership"

    def get_teacherId(self, obj):
        return str(obj.teacher_id) if obj.teacher_id else "admin-owned"

    def get_ownerType(self, obj):
        return "teacher" if obj.teacher_id else "admin"

    def get_ownerId(self, obj):
        return str(obj.teacher_id) if obj.teacher_id else "admin"

    def get_teacherProgram(self, obj):
        return obj.teacher.program if obj.teacher else None

    def get_teacherTrack(self, obj):
        return obj.teacher.track if obj.teacher else None

    def get_producedBy(self, obj):
        return "Produced by MooreSkillUp"

    def get_isOwned(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated or request.user.role != "student":
            return False
        return Enrollment.objects.filter(student=request.user.student_profile, course=obj).exists()

    def get_isInWatchlist(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated or request.user.role != "student":
            return False
        return Watchlist.objects.filter(student=request.user.student_profile, course=obj).exists()

    def get_cta(self, obj):
        if obj.price == 0:
            return "start_course"
        if self.get_isOwned(obj):
            return "open_course"
        return "unlock_course"

    def get_averageRating(self, obj):
        stats = obj.reviews.filter(status="published").aggregate(avg=Avg("rating"))
        return round(stats["avg"], 1) if stats["avg"] is not None else 0

    def get_reviewCount(self, obj):
        return obj.reviews.filter(status="published").count()

    def get_totalDurationMinutes(self, obj):
        """Course length, summed from the lessons a student can actually reach."""
        return (
            Lesson.objects.filter(
                section__course=obj, section__is_published=True, is_published=True
            ).aggregate(total=Sum("duration_minutes"))["total"]
            or 0
        )

    def get_ratingBreakdown(self, obj):
        """How many reviews gave each star, for the distribution bars.

        Always returns all five keys so the UI can render empty bars rather than
        deciding what a missing rating means.
        """
        counts = dict.fromkeys(range(1, 6), 0)
        rows = (
            obj.reviews.filter(status="published")
            .values("rating")
            .annotate(count=Count("id"))
        )
        for row in rows:
            rating = int(row["rating"])
            if rating in counts:
                counts[rating] = row["count"]
        return {str(star): counts[star] for star in range(5, 0, -1)}

    def get_totalLessons(self, obj):
        """Published lessons in this course.

        Course.total_lessons is a stored counter that nothing maintains, so it
        stays at 0 and every card read "0 lessons" — which is the last thing a
        student should see before deciding whether to enrol. List views annotate
        `published_lesson_count` so this stays one query; anything that doesn't
        falls back to counting, then to the stale field as a last resort.
        """
        annotated = getattr(obj, "published_lesson_count", None)
        if annotated is not None:
            return annotated
        counted = Lesson.objects.filter(section__course=obj, is_published=True).count()
        return counted or obj.total_lessons

    def get_analytics(self, obj):
        enrollments_count = obj.enrollments.count()
        course_progress = obj.enrollments.filter(course_progress__isnull=False).values_list(
            "course_progress__progress_percent", flat=True
        )
        completion_rate = 0
        progress_values = [float(value) for value in course_progress if value is not None]
        if progress_values:
            completion_rate = round(sum(progress_values) / len(progress_values))

        total_lessons = obj.total_lessons or Lesson.objects.filter(section__course=obj, is_published=True).count()

        # These used to be one field. It took the larger of "lessons opened"
        # and "enrolments touched" and called the result "views", which put
        # "4 enrolled, 24 engaged" on a teacher's dashboard — impossible, and a
        # sign the two had been conflated because neither was clearly what was
        # wanted. They are different questions, so they are two fields now.
        lesson_opens = (
            obj.sections.filter(lessons__lesson_progress__first_accessed_at__isnull=False)
            .values("lessons__lesson_progress")
            .distinct()
            .count()
        )
        engaged = obj.enrollments.filter(lesson_progress__isnull=False).distinct().count()

        return {
            "engaged": engaged,
            "lessonOpens": lesson_opens,
            "enrollments": enrollments_count,
            "completionRate": completion_rate,
            "totalLessons": total_lessons,
        }


class TeacherActivitySerializer(serializers.ModelSerializer):
    timestamp = serializers.DateTimeField(source="created_at", read_only=True)
    type = serializers.CharField(source="activity_type", read_only=True)

    class Meta:
        model = TeacherActivityLog
        fields = ("id", "message", "timestamp", "type", "created_at")


class CourseVersionSerializer(serializers.ModelSerializer):
    versionNumber = serializers.IntegerField(source="version_number", read_only=True)
    createdBy = serializers.CharField(source="created_by.display_name", read_only=True, default=None)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    sectionCount = serializers.SerializerMethodField()

    class Meta:
        model = CourseVersion
        fields = ("id", "versionNumber", "note", "createdBy", "createdAt", "sectionCount")

    def get_sectionCount(self, obj):
        return len(obj.snapshot.get("sections", []))
