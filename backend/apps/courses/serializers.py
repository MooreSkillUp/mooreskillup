from rest_framework import serializers

from apps.enrollments.models import Enrollment, Watchlist
from apps.progress.models import LessonProgress

from .models import Course, CourseTag, Lesson, Section, Task, TeacherActivityLog
from .video import build_embed_url, validate_video_url


class LessonSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source="content_type", read_only=True)
    status = serializers.SerializerMethodField()
    duration = serializers.SerializerMethodField()
    embedUrl = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = (
            "id",
            "title",
            "type",
            "content_type",
            "video_url",
            "text_content",
            "tags",
            "duration_minutes",
            "duration",
            "embedUrl",
            "order",
            "is_previewable",
            "is_published",
            "status",
        )

    def get_duration(self, obj):
        return f"{obj.duration_minutes} min" if obj.duration_minutes else None

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

    def validate(self, attrs):
        content_type = attrs.get("content_type", getattr(self.instance, "content_type", None))
        video_url = attrs.get("video_url", getattr(self.instance, "video_url", ""))
        if content_type == "video" and video_url:
            validate_video_url(video_url)
        return attrs


class TaskSerializer(serializers.ModelSerializer):
    submissionGuide = serializers.SerializerMethodField()
    watchGuideUrl = serializers.SerializerMethodField()
    sectionChannelUrl = serializers.SerializerMethodField()
    submissionChannelUrl = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = (
            "id",
            "title",
            "instructions",
            "submission_type",
            "resource_links",
            "order",
            "is_required",
            "submissionGuide",
            "watchGuideUrl",
            "sectionChannelUrl",
            "submissionChannelUrl",
        )

    def get_submissionGuide(self, obj):
        return "Review the task brief, complete the work, and submit through the course channel."

    def get_watchGuideUrl(self, obj):
        return obj.resource_links[0] if len(obj.resource_links) > 0 else ""

    def get_sectionChannelUrl(self, obj):
        return obj.resource_links[1] if len(obj.resource_links) > 1 else ""

    def get_submissionChannelUrl(self, obj):
        return obj.resource_links[2] if len(obj.resource_links) > 2 else ""

    def to_internal_value(self, data):
        mutable = data.copy()
        submission_type = mutable.get("submission_type")
        if submission_type == "file-upload":
            mutable["submission_type"] = "file_upload"
        elif submission_type == "text-submission":
            mutable["submission_type"] = "text_submission"
        return super().to_internal_value(mutable)


class SectionSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)
    tasks = TaskSerializer(many=True, read_only=True)
    isFree = serializers.SerializerMethodField()
    isLocked = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

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
            "lessons",
            "tasks",
        )

    def _get_enrollment(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated or request.user.role != "student":
            return None
        return Enrollment.objects.filter(student=request.user.student_profile, course=obj.course).first()

    def get_isFree(self, obj):
        return obj.course.price == 0 or obj.access_type == "free"

    def get_isLocked(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated or request.user.role != "student":
            return False
        if obj.course.price == 0 or obj.access_type == "free":
            return False
        return not Enrollment.objects.filter(student=request.user.student_profile, course=obj.course).exists()

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
    categoryId = serializers.UUIDField(source="category_id", read_only=True)
    subcategoryId = serializers.UUIDField(source="subcategory_id", read_only=True)
    program = serializers.CharField(source="category.name", read_only=True)
    track = serializers.CharField(source="subcategory.name", read_only=True)
    lastUpdated = serializers.DateTimeField(source="updated_at", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    analytics = serializers.SerializerMethodField()
    tags = serializers.SlugRelatedField(slug_field="name", many=True, queryset=CourseTag.objects.all(), required=False)

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
            "price",
            "currency",
            "status",
            "visibility",
            "featured",
            "total_lessons",
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
        return "Produced by More SkillUp"

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
        lesson_views = obj.sections.filter(
            lessons__lesson_progress__first_accessed_at__isnull=False
        ).values("lessons__lesson_progress").distinct().count()
        enrollment_views = obj.enrollments.filter(last_accessed_at__isnull=False).count()
        real_views = max(lesson_views, enrollment_views)

        return {
            "views": real_views,
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
