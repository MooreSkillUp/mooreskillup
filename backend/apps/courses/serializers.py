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
    # Position is written only on create and by the reorder endpoints (see ordering.py).
    order = serializers.IntegerField(read_only=True)

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
        enrollment = Enrollment.objects.with_access().filter(student=student_profile, course=obj.section.course).first()
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
    # Position is written only on create and by the reorder endpoints (see ordering.py).
    order = serializers.IntegerField(read_only=True)

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
    # Position is written only on create and by the reorder endpoints (see ordering.py).
    order = serializers.IntegerField(read_only=True)

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
    # Position is written only on create and by the reorder endpoints (see ordering.py).
    order = serializers.IntegerField(read_only=True)

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
        return Enrollment.objects.with_access().filter(student=request.user.student_profile, course=obj.course).first()

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
        return not Enrollment.objects.with_access().filter(
            student=request.user.student_profile, course=obj.course
        ).exists()

    def get_status(self, obj):
        if self.get_isLocked(obj):
            return "locked"
        return "unlocked"


class CourseTagField(serializers.SlugRelatedField):
    """A tag the teacher types, created the first time it is used.

    Tags are free text in the studio: a teacher types "FastAPI" and presses
    enter. The plain SlugRelatedField refused anything not already in the
    database, so saving a course with a new tag failed with "Object with
    name=Python does not exist" - a message that blamed the teacher for a row
    we had simply never created. It blocked saving the course at all, because
    the whole request was rejected.

    Matching is case-insensitive, so Python and python stay one tag rather than
    two that look identical in a filter list.
    """

    def __init__(self, **kwargs):
        kwargs.setdefault("slug_field", "name")
        kwargs.setdefault("queryset", CourseTag.objects.all())
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        name = str(data).strip()
        if not name:
            self.fail("invalid")
        existing = CourseTag.objects.filter(name__iexact=name).first()
        if existing is not None:
            return existing
        tag, _ = CourseTag.objects.get_or_create(name=name[:100])
        return tag


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
    tags = CourseTagField(many=True, required=False)
    discountPrice = serializers.DecimalField(
        source="discount_price", max_digits=12, decimal_places=2, required=False, allow_null=True
    )
    # What this viewer would actually pay right now, and the campaign behind it.
    # Worked out here once, so the page, the card and checkout cannot disagree.
    effectivePrice = serializers.SerializerMethodField()
    activeCampaign = serializers.SerializerMethodField()
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
    declineReason = serializers.CharField(source="decline_reason", read_only=True)
    reviewedAt = serializers.DateTimeField(source="reviewed_at", read_only=True)
    reviewedByName = serializers.CharField(source="reviewed_by.display_name", read_only=True)
    submittedAt = serializers.DateTimeField(source="submitted_at", read_only=True)
    # Lists sent with a banner image: tags, tech stack, what you will learn.
    _LIST_FIELDS = (
        "tags",
        "tech_stack",
        "techStack",
        "learning_outcomes",
        "learningOutcomes",
    )

    def to_internal_value(self, data):
        """Read a course saved as a form, where every value arrives as text.

        A save carrying a banner image is multipart, so the studio sends its
        lists as JSON strings. Parsing them used to write the result back with
        `setlist`, which stores each element separately — and a form field read
        by name then gives back only the **last** one. A tech stack of
        ["Python", "VS Code", "Pip", "Terminal", "JSON"] arrived as the string
        "JSON", and the course refused to save with "tech stack: Value must be
        valid JSON": a message that named the right field and told the teacher
        nothing about what to change.
        """
        import contextlib
        import json

        if hasattr(data, "getlist"):
            # A plain dict can hold a real list; a QueryDict cannot.
            flattened = {}
            for key in list(data):
                values = data.getlist(key)
                flattened[key] = values[0] if len(values) == 1 else values
            data = flattened
        elif hasattr(data, "_mutable") and not data._mutable:
            data = data.copy()

        for key in self._LIST_FIELDS:
            value = data.get(key)
            if isinstance(value, str) and value.startswith("[") and value.endswith("]"):
                # Not JSON after all: leave it, and let the field say so.
                with contextlib.suppress(ValueError):
                    data[key] = json.loads(value)

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
            "effectivePrice",
            "activeCampaign",
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
            "declineReason",
            "reviewedAt",
            "reviewedByName",
            "submittedAt",
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

    def _pricing(self, obj):
        cache = self.context.setdefault("_pricing", {})
        if obj.pk not in cache:
            from apps.payments.pricing import price_for

            request = self.context.get("request")
            student = None
            if request and request.user.is_authenticated and request.user.role == "student":
                student = getattr(request.user, "student_profile", None)
            cache[obj.pk] = price_for(obj, student)
        return cache[obj.pk]

    def get_effectivePrice(self, obj):
        return str(self._pricing(obj)[0])

    def get_activeCampaign(self, obj):
        _, campaign, _ = self._pricing(obj)
        if campaign is None:
            return None
        return {
            "name": campaign.name,
            "percentOff": campaign.percent_off,
            "endsAt": campaign.ends_at.isoformat(),
            "showCountdown": campaign.show_countdown,
        }

    def get_isOwned(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated or request.user.role != "student":
            return False
        return Enrollment.objects.with_access().filter(student=request.user.student_profile, course=obj).exists()

    def get_isInWatchlist(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated or request.user.role != "student":
            return False
        return Watchlist.objects.filter(student=request.user.student_profile, course=obj).exists()

    def get_cta(self, obj):
        # Free if it costs nothing to this viewer now, including through a 100%
        # campaign, not only if the list price is zero.
        if self._pricing(obj)[0] == 0:
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


class AdminCourseListSerializer(serializers.ModelSerializer):
    """One row of the admin course list — only what admin screens read.

    The list used to reuse the catalog's CourseSerializer, which works out
    ratings, lengths, per-section quiz state and teacher analytics for every
    course: 248 queries and ~850ms for thirteen courses, and the admin chrome
    fetched it several times per page. No admin screen reads any of those.
    """

    categoryId = serializers.UUIDField(source="category_id", read_only=True)
    subcategoryId = serializers.UUIDField(source="subcategory_id", read_only=True)
    categoryName = serializers.CharField(source="category.name", read_only=True)
    subcategoryName = serializers.CharField(source="subcategory.name", read_only=True)
    program = serializers.CharField(source="category.name", read_only=True)
    track = serializers.CharField(source="subcategory.name", read_only=True)
    teacherId = serializers.SerializerMethodField()
    teacherName = serializers.SerializerMethodField()
    ownerType = serializers.SerializerMethodField()
    ownerId = serializers.SerializerMethodField()
    isRecommended = serializers.BooleanField(source="is_recommended", read_only=True)
    certificateEnabled = serializers.BooleanField(source="certificate_enabled", read_only=True)
    pendingDeletion = serializers.BooleanField(source="pending_deletion", read_only=True)
    deletionReason = serializers.CharField(source="deletion_reason", read_only=True)
    declineReason = serializers.CharField(source="decline_reason", read_only=True)
    reviewedAt = serializers.DateTimeField(source="reviewed_at", read_only=True)
    reviewedByName = serializers.CharField(source="reviewed_by.display_name", read_only=True)
    submittedAt = serializers.DateTimeField(source="submitted_at", read_only=True)
    lastUpdated = serializers.DateTimeField(source="updated_at", read_only=True)
    reviewSummary = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = (
            "id",
            "title",
            "price",
            "status",
            "visibility",
            "featured",
            "category",
            "subcategory",
            "categoryId",
            "subcategoryId",
            "categoryName",
            "subcategoryName",
            "program",
            "track",
            "teacherId",
            "teacherName",
            "ownerType",
            "ownerId",
            "isRecommended",
            "certificateEnabled",
            "pendingDeletion",
            "deletionReason",
            "declineReason",
            "reviewedAt",
            "reviewedByName",
            "submittedAt",
            "lastUpdated",
            "reviewSummary",
        )

    def get_teacherId(self, obj):
        return str(obj.teacher_id) if obj.teacher_id else "admin-owned"

    def get_teacherName(self, obj):
        return obj.teacher.user.display_name if obj.teacher else "Admin ownership"

    def get_ownerType(self, obj):
        return "teacher" if obj.teacher_id else "admin"

    def get_ownerId(self, obj):
        return str(obj.teacher_id) if obj.teacher_id else "admin"

    def get_reviewSummary(self, obj):
        """The objective facts a reviewer checks before approving.

        Reads only what the admin list prefetches, so a queue of twenty courses
        costs the same queries as a queue of one.

        Facts, not verdicts — the reviewer decides. What it removes is opening
        every lesson in a course to find the one with no video.
        """
        sections = [section for section in obj.sections.all() if section.is_published]
        lessons = [
            lesson for section in sections for lesson in section.lessons.all() if lesson.is_published
        ]

        def is_empty(lesson):
            if lesson.content_type == "video":
                return not (lesson.video_url or "").strip()
            if lesson.content_type == "text":
                return not (lesson.text_content or "").strip()
            if lesson.content_type == "resource":
                return not lesson.resource_links
            return False

        # Mirrors Quiz.is_ready, but over prefetched rows — is_ready queries.
        def quiz_ready(quiz):
            questions = list(quiz.questions.all())
            return (
                quiz.is_published
                and bool(questions)
                and all(any(choice.is_correct for choice in q.choices.all()) for q in questions)
            )

        quizzes = list(obj.quizzes.all())
        final = next((quiz for quiz in quizzes if quiz.kind == "final"), None)

        return {
            "sections": len(sections),
            "lessons": len(lessons),
            "emptyLessons": sum(1 for lesson in lessons if is_empty(lesson)),
            "lessonsWithoutDuration": sum(1 for lesson in lessons if not lesson.duration_minutes),
            "totalMinutes": sum(lesson.duration_minutes or 0 for lesson in lessons),
            "hasBanner": bool(obj.banner_image),
            "hasOverview": bool((obj.overview or "").strip()),
            "quizzes": len(quizzes),
            "unreadyQuizzes": sum(1 for quiz in quizzes if quiz.is_published and not quiz_ready(quiz)),
            "hasReadyFinal": bool(final and quiz_ready(final)),
        }
