"""Recording and reading real learning activity.

`LessonProgress.time_spent_seconds` has existed since the first migration and
nothing ever wrote to it, so every "hours learned" figure on the dashboard was
invented. This module is where that stops.
"""

from datetime import timedelta

from django.db.models import Sum
from django.utils import timezone

from .models import DailyActivity, LessonProgress

# The player pings while a lesson is open. Anything longer than this between two
# pings is a tab left open, a laptop lid closed, or a phone in a pocket — not
# study. Capping per ping means an idle overnight tab banks two minutes, not
# eight hours, and it costs an honest student nothing because their pings are
# far more frequent than this.
MAX_SECONDS_PER_PING = 120


def record_learning_time(progress: LessonProgress, *, now=None) -> int:
    """Bank the time since this lesson's last ping. Returns seconds credited.

    Computed from the stored `last_accessed_at` rather than anything the client
    sends, so time cannot be claimed by editing a request. Call this *before*
    updating `last_accessed_at`.
    """
    now = now or timezone.now()
    previous = progress.last_accessed_at
    if not previous:
        return 0

    elapsed = int((now - previous).total_seconds())
    if elapsed <= 0:
        return 0

    credited = min(elapsed, MAX_SECONDS_PER_PING)
    progress.time_spent_seconds = (progress.time_spent_seconds or 0) + credited
    return credited


def record_daily_activity(student, *, seconds=0, lesson_completed=False, now=None) -> DailyActivity:
    """Roll a student's activity up into today's row.

    Seconds accumulate and minutes are derived from the running total, so a
    string of short pings doesn't each round up to a whole minute and inflate
    the day. Accumulating rather than recomputing also means a finished day
    stays finished — see the note on the model.
    """
    now = now or timezone.now()
    today = timezone.localtime(now).date()

    activity, _ = DailyActivity.objects.get_or_create(student=student, date=today)

    if seconds:
        activity.seconds = (activity.seconds or 0) + seconds
        activity.minutes = activity.seconds // 60
    if lesson_completed:
        activity.lessons_completed += 1

    activity.save(update_fields=["seconds", "minutes", "lessons_completed", "updated_at"])
    return activity


def current_streak(student, *, today=None) -> int:
    """Consecutive days of activity ending today or yesterday.

    Yesterday still counts so the streak doesn't appear to break first thing in
    the morning before anyone has had a chance to study.

    Any lesson activity keeps a streak alive — a deliberate choice. Requiring a
    completion would punish someone who studied for forty minutes on a long
    lesson without finishing it.
    """
    today = today or timezone.localtime().date()
    active_days = set(
        DailyActivity.objects.filter(student=student, minutes__gt=0).values_list("date", flat=True)
    )
    if not active_days:
        return 0

    if today in active_days:
        cursor = today
    elif (today - timedelta(days=1)) in active_days:
        cursor = today - timedelta(days=1)
    else:
        return 0

    streak = 0
    while cursor in active_days:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


def week_activity(student, *, today=None):
    """The last seven days, oldest first, for the weekly bars."""
    today = today or timezone.localtime().date()
    days = [today - timedelta(days=offset) for offset in range(6, -1, -1)]

    rows = {
        row.date: row
        for row in DailyActivity.objects.filter(student=student, date__gte=days[0], date__lte=today)
    }
    return [
        {
            "date": day.isoformat(),
            "minutes": rows[day].minutes if day in rows else 0,
            "lessonsCompleted": rows[day].lessons_completed if day in rows else 0,
            "isToday": day == today,
        }
        for day in days
    ]


def total_learning_minutes(student) -> int:
    """Lifetime minutes, read from the same table as today's and the week's.

    This used to sum LessonProgress instead, so the dashboard could show a
    lifetime total of 0m beside 22 minutes today. One source, no contradiction.
    """
    seconds = (
        DailyActivity.objects.filter(student=student).aggregate(total=Sum("seconds"))["total"] or 0
    )
    return seconds // 60


def minutes_today(student, *, today=None) -> int:
    today = today or timezone.localtime().date()
    row = DailyActivity.objects.filter(student=student, date=today).first()
    return row.minutes if row else 0
