from datetime import timedelta

from django.utils import timezone

from .models import TeacherActivityLog

ACTIVITY_LOG_RETENTION_DAYS = 30
ACTIVITY_LOG_MAX_ENTRIES = 50


def prune_teacher_activity_logs(teacher) -> None:
    """Drop entries older than the retention window and cap total count."""
    cutoff = timezone.now() - timedelta(days=ACTIVITY_LOG_RETENTION_DAYS)
    TeacherActivityLog.objects.filter(teacher=teacher, created_at__lt=cutoff).delete()

    stale_ids = list(
        TeacherActivityLog.objects.filter(teacher=teacher)
        .order_by("-created_at")
        .values_list("id", flat=True)[ACTIVITY_LOG_MAX_ENTRIES:]
    )
    if stale_ids:
        TeacherActivityLog.objects.filter(id__in=stale_ids).delete()
