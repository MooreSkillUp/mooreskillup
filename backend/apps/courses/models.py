from django.db import models
from django.utils.text import slugify

from common.models import TimeStampedModel, UUIDPrimaryKeyModel


class CourseTag(UUIDPrimaryKeyModel, TimeStampedModel):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Course(UUIDPrimaryKeyModel, TimeStampedModel):
    STATUS_CHOICES = (
        ("draft", "Draft"),
        ("review", "In review"),
        ("approved", "Approved"),
        ("published", "Published"),
        ("declined", "Declined"),
        ("archived", "Archived"),
    )
    VISIBILITY_CHOICES = (("visible", "Visible"), ("hidden", "Hidden"))
    LEVEL_CHOICES = (
        ("beginner", "Beginner"),
        ("intermediate", "Intermediate"),
        ("advanced", "Advanced"),
    )

    teacher = models.ForeignKey("accounts.TeacherProfile", on_delete=models.SET_NULL, null=True, related_name="courses")
    category = models.ForeignKey("categories.Category", on_delete=models.PROTECT, related_name="courses")
    subcategory = models.ForeignKey("categories.Subcategory", on_delete=models.PROTECT, related_name="courses")
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    subtitle = models.CharField(max_length=255, blank=True)
    overview = models.TextField(blank=True)
    scheme_of_work = models.TextField(blank=True)
    roadmap_link = models.URLField(blank=True)
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default="beginner")
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=10, default="NGN")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    visibility = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default="hidden")
    featured = models.BooleanField(default=False)
    # Teacher/admin can flag a course to surface in students' "Recommended".
    is_recommended = models.BooleanField(default=False)
    total_lessons = models.PositiveIntegerField(default=0)
    # SEO
    meta_title = models.CharField(max_length=160, blank=True)
    meta_description = models.TextField(blank=True)
    # Technologies/tools the course teaches (the "stacks"), shown as chips.
    tech_stack = models.JSONField(default=list, blank=True)
    # Teacher flags a course "ready for certification"; students who complete it
    # are then auto-issued an MSU certificate (see apps/certificates).
    certificate_enabled = models.BooleanField(default=False)
    # Teachers can't delete courses directly — they request deletion, which an
    # admin approves (deletes) or aborts. Protects platform content.
    pending_deletion = models.BooleanField(default=False)
    deletion_reason = models.CharField(max_length=500, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    tags = models.ManyToManyField("courses.CourseTag", blank=True, related_name="courses")

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class Section(UUIDPrimaryKeyModel, TimeStampedModel):
    ACCESS_CHOICES = (("free", "Free"), ("paid", "Paid"))

    course = models.ForeignKey("courses.Course", on_delete=models.CASCADE, related_name="sections")
    title = models.CharField(max_length=255)
    description = models.TextField()
    order = models.PositiveIntegerField()
    access_type = models.CharField(max_length=20, choices=ACCESS_CHOICES, default="free")
    is_published = models.BooleanField(default=True)

    class Meta:
        ordering = ("order",)
        unique_together = ("course", "order")

    def __str__(self):
        return f"{self.course.title} - {self.title}"


class Lesson(UUIDPrimaryKeyModel, TimeStampedModel):
    CONTENT_CHOICES = (("video", "Video"), ("text", "Text"), ("resource", "Resource"))

    section = models.ForeignKey("courses.Section", on_delete=models.CASCADE, related_name="lessons")
    title = models.CharField(max_length=255)
    content_type = models.CharField(max_length=20, choices=CONTENT_CHOICES)
    video_url = models.URLField(blank=True)
    text_content = models.TextField(blank=True)
    # For resource lessons: list of {type, title, url}; type in
    # pdf/documentation/github/google_drive/zip/website.
    resource_links = models.JSONField(default=list, blank=True)
    tags = models.JSONField(default=list, blank=True)
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    order = models.PositiveIntegerField()
    is_previewable = models.BooleanField(default=False)
    is_published = models.BooleanField(default=True)

    class Meta:
        ordering = ("order",)
        unique_together = ("section", "order")

    def __str__(self):
        return self.title


class Task(UUIDPrimaryKeyModel, TimeStampedModel):
    """An assignment. Submission happens off-platform (WhatsApp group / Google
    Form / external link) — there is no in-app upload or grading by design."""

    SUBMISSION_CHOICES = (
        ("whatsapp_group", "WhatsApp group"),
        ("google_form", "Google Form"),
        ("external_link", "External link"),
        # Legacy values kept so old rows validate; not offered in the studio.
        ("file_upload", "File upload"),
        ("text_submission", "Text submission"),
    )

    section = models.ForeignKey("courses.Section", on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=255)
    instructions = models.TextField()
    submission_type = models.CharField(max_length=30, choices=SUBMISSION_CHOICES)
    # Where students submit (the WhatsApp group invite, form URL, etc.).
    submission_url = models.URLField(blank=True)
    how_to_submit = models.TextField(blank=True)
    due_date = models.DateField(null=True, blank=True)
    resource_links = models.JSONField(default=list, blank=True)
    order = models.PositiveIntegerField(default=1)
    is_required = models.BooleanField(default=False)

    class Meta:
        ordering = ("order",)
        unique_together = ("section", "order")

    def __str__(self):
        return self.title


class Project(UUIDPrimaryKeyModel, TimeStampedModel):
    """A larger deliverable than an assignment. Completed off-platform; students
    submit through the provided link."""

    section = models.ForeignKey("courses.Section", on_delete=models.CASCADE, related_name="projects")
    title = models.CharField(max_length=255)
    description = models.TextField()
    requirements = models.TextField(blank=True)
    deliverables = models.TextField(blank=True)
    submission_url = models.URLField(blank=True)
    how_to_submit = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=1)
    is_required = models.BooleanField(default=False)

    class Meta:
        ordering = ("order",)
        unique_together = ("section", "order")

    def __str__(self):
        return self.title


class CourseReview(UUIDPrimaryKeyModel, TimeStampedModel):
    STATUS_CHOICES = (("published", "Published"), ("hidden", "Hidden"))

    course = models.ForeignKey("courses.Course", on_delete=models.CASCADE, related_name="reviews")
    student = models.ForeignKey("accounts.StudentProfile", on_delete=models.CASCADE, related_name="reviews")
    rating = models.PositiveSmallIntegerField()  # 1..5
    comment = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="published")

    class Meta:
        ordering = ("-created_at",)
        unique_together = ("course", "student")

    def __str__(self):
        return f"{self.course.title} · {self.rating}★"


class CourseVersion(UUIDPrimaryKeyModel, TimeStampedModel):
    """A point-in-time snapshot of a course's full structure, for restore."""

    course = models.ForeignKey("courses.Course", on_delete=models.CASCADE, related_name="versions")
    version_number = models.PositiveIntegerField()
    note = models.CharField(max_length=255, blank=True)
    snapshot = models.JSONField(default=dict)
    created_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="course_versions"
    )

    class Meta:
        ordering = ("-version_number",)
        unique_together = ("course", "version_number")

    def __str__(self):
        return f"{self.course.title} v{self.version_number}"


class TeacherActivityLog(UUIDPrimaryKeyModel, TimeStampedModel):
    TYPE_CHOICES = (
        ("create-course", "Create course"),
        ("edit-course", "Edit course"),
        ("publish-course", "Publish course"),
        ("unpublish-course", "Unpublish course"),
        ("save-draft", "Save draft"),
        ("delete-course", "Delete course"),
        ("reorder-content", "Reorder content"),
        ("settings-update", "Settings update"),
    )

    teacher = models.ForeignKey("accounts.TeacherProfile", on_delete=models.CASCADE, related_name="activity_logs")
    course = models.ForeignKey("courses.Course", null=True, blank=True, on_delete=models.SET_NULL, related_name="activity_logs")
    message = models.CharField(max_length=255)
    activity_type = models.CharField(max_length=30, choices=TYPE_CHOICES)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.teacher.user.display_name}: {self.message}"
