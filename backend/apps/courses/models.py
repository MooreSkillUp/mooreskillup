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
    STATUS_CHOICES = (("draft", "Draft"), ("published", "Published"), ("archived", "Archived"))
    VISIBILITY_CHOICES = (("visible", "Visible"), ("hidden", "Hidden"))

    teacher = models.ForeignKey("accounts.TeacherProfile", on_delete=models.SET_NULL, null=True, related_name="courses")
    category = models.ForeignKey("categories.Category", on_delete=models.PROTECT, related_name="courses")
    subcategory = models.ForeignKey("categories.Subcategory", on_delete=models.PROTECT, related_name="courses")
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    subtitle = models.CharField(max_length=255)
    overview = models.TextField()
    scheme_of_work = models.TextField()
    roadmap_link = models.URLField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default="NGN")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    visibility = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default="hidden")
    featured = models.BooleanField(default=False)
    total_lessons = models.PositiveIntegerField(default=0)
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
    CONTENT_CHOICES = (("video", "Video"), ("text", "Text"))

    section = models.ForeignKey("courses.Section", on_delete=models.CASCADE, related_name="lessons")
    title = models.CharField(max_length=255)
    content_type = models.CharField(max_length=20, choices=CONTENT_CHOICES)
    video_url = models.URLField(blank=True)
    text_content = models.TextField(blank=True)
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
    SUBMISSION_CHOICES = (
        ("file_upload", "File upload"),
        ("text_submission", "Text submission"),
        ("external_link", "External link"),
    )

    section = models.ForeignKey("courses.Section", on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=255)
    instructions = models.TextField()
    submission_type = models.CharField(max_length=30, choices=SUBMISSION_CHOICES)
    resource_links = models.JSONField(default=list, blank=True)
    order = models.PositiveIntegerField(default=1)
    is_required = models.BooleanField(default=False)

    class Meta:
        ordering = ("order",)
        unique_together = ("section", "order")

    def __str__(self):
        return self.title
