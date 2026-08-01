from django.db import models

from common.models import TimeStampedModel, UUIDPrimaryKeyModel


class Event(UUIDPrimaryKeyModel, TimeStampedModel):
    """Something happening at a specific time that students should turn up to.

    Assignments answer "what do I owe?"; this answers "where should I be?" —
    live classes, Q&A sessions, workshops, cohort launches. It is the one thing
    on the platform that gives a student a reason to come back on a *particular
    day*, which is why it is a first-class model rather than another
    notification.

    Two audiences:
      - course events reach students enrolled in that course
      - platform events (no course) reach every student

    Teachers may only schedule against courses they own. Admins may schedule
    against any course, and are the only ones who can address the whole platform.
    """

    KIND_CHOICES = (
        ("live_class", "Live class"),
        ("q_and_a", "Q&A session"),
        ("workshop", "Workshop"),
        ("launch", "Cohort launch"),
        ("deadline", "Deadline"),
        ("other", "Other"),
    )

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default="live_class")

    starts_at = models.DateTimeField()
    # Optional: a launch or a deadline is a moment, not a window.
    ends_at = models.DateTimeField(null=True, blank=True)

    # Null means platform-wide. Admin-only, enforced in the serializer.
    course = models.ForeignKey(
        "courses.Course",
        on_delete=models.CASCADE,
        related_name="events",
        null=True,
        blank=True,
    )

    # Zoom, Meet, WhatsApp — wherever the session actually happens.
    join_url = models.URLField(blank=True)
    location = models.CharField(max_length=200, blank=True)

    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, related_name="scheduled_events"
    )
    # Drafts let a teacher line up a term's sessions before students see them.
    is_published = models.BooleanField(default=True)
    is_cancelled = models.BooleanField(default=False)

    class Meta:
        ordering = ("starts_at",)
        indexes = [
            models.Index(fields=["starts_at"]),
            models.Index(fields=["course", "starts_at"]),
        ]

    def __str__(self):
        return f"{self.title} @ {self.starts_at:%Y-%m-%d %H:%M}"

    @property
    def is_platform_wide(self) -> bool:
        return self.course_id is None
