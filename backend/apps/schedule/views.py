from datetime import datetime, time, timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, response, views

from apps.courses.models import Course, Task
from apps.enrollments.models import Enrollment
from common.permissions import IsStudentUserRole, IsTeacherUserRole
from common.rbac import AdminAction

from .models import Event
from .serializers import EventSerializer, StudentEventSerializer, TeacherCourseChoiceSerializer

# How far ahead the student dashboard looks. Far enough to plan a fortnight,
# short enough that "coming up" still means something.
UPCOMING_WINDOW_DAYS = 30


def _visible_events_for(student_profile, *, now=None, days=UPCOMING_WINDOW_DAYS):
    """Published, uncancelled events a student should see, soonest first.

    Course events reach students enrolled in that course; events with no course
    are platform-wide and reach everyone.
    """
    now = now or timezone.now()
    enrolled_course_ids = Enrollment.objects.filter(student=student_profile).values_list(
        "course_id", flat=True
    )

    return (
        Event.objects.filter(
            is_published=True,
            is_cancelled=False,
            starts_at__gte=now,
            starts_at__lte=now + timedelta(days=days),
        )
        .filter(Q(course__isnull=True) | Q(course_id__in=enrolled_course_ids))
        .select_related("course")
        .order_by("starts_at")
    )


def upcoming_for_student(student_profile, *, limit=5, now=None):
    """Events and assignment deadlines merged into one "what's coming" list.

    Assignments answer "what do I owe", events answer "where should I be". A
    student thinks about both as one question, so the dashboard shows them
    together, ordered by when they happen.
    """
    now = now or timezone.now()
    horizon = now + timedelta(days=UPCOMING_WINDOW_DAYS)

    items = [
        {
            "id": str(event.id),
            "type": "event",
            "kind": event.kind,
            "title": event.title,
            "courseId": str(event.course_id) if event.course_id else None,
            "courseTitle": event.course.title if event.course else "",
            "at": event.starts_at.isoformat(),
            # Events happen at a time; assignments are due on a day.
            "allDay": False,
            "joinUrl": event.join_url,
            "location": event.location,
        }
        for event in _visible_events_for(student_profile, now=now)[:limit]
    ]

    enrolled_course_ids = Enrollment.objects.filter(student=student_profile).values_list(
        "course_id", flat=True
    )
    # Task.due_date is a DateField, so compare against local dates rather than
    # `now` — a task due today is still due, whatever the time is.
    today = timezone.localtime(now).date()
    tasks = (
        Task.objects.filter(
            section__course_id__in=enrolled_course_ids,
            section__is_published=True,
            due_date__gte=today,
            due_date__lte=horizon.date(),
        )
        .select_related("section__course")
        .order_by("due_date")[:limit]
    )

    items.extend(
        {
            "id": str(task.id),
            "type": "assignment",
            "kind": "deadline",
            "title": task.title,
            "courseId": str(task.section.course_id),
            "courseTitle": task.section.course.title,
            # End of the due day, so a deadline sorts after that day's sessions
            # rather than jumping ahead of them at midnight.
            "at": _end_of_day(task.due_date).isoformat(),
            "allDay": True,
            "joinUrl": task.submission_url,
            "location": "",
        }
        for task in tasks
    )

    items.sort(key=lambda item: item["at"])
    return items[:limit]


def _end_of_day(day):
    """A date turned into an aware datetime at the last moment of that day."""
    naive = datetime.combine(day, time(23, 59, 59))
    return timezone.make_aware(naive, timezone.get_current_timezone())


class StudentUpcomingView(views.APIView):
    """The dashboard's "Coming up" list and the student Schedule page."""

    permission_classes = [IsStudentUserRole]

    def get(self, request):
        limit = min(int(request.query_params.get("limit", 5)), 50)
        return response.Response(upcoming_for_student(request.user.student_profile, limit=limit))


class StudentScheduleView(views.APIView):
    permission_classes = [IsStudentUserRole]

    def get(self, request):
        events = _visible_events_for(request.user.student_profile, days=90)
        return response.Response(StudentEventSerializer(events, many=True).data)


class TeacherEventListCreateView(generics.ListCreateAPIView):
    serializer_class = EventSerializer
    permission_classes = [IsTeacherUserRole]

    def get_queryset(self):
        teacher_profile = getattr(self.request.user, "teacher_profile", None)
        if not teacher_profile:
            return Event.objects.none()
        return Event.objects.filter(course__teacher=teacher_profile).select_related("course")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class TeacherEventDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EventSerializer
    permission_classes = [IsTeacherUserRole]
    lookup_url_kwarg = "event_id"

    def get_queryset(self):
        teacher_profile = getattr(self.request.user, "teacher_profile", None)
        if not teacher_profile:
            return Event.objects.none()
        return Event.objects.filter(course__teacher=teacher_profile)


class TeacherCourseChoicesView(views.APIView):
    """Courses this teacher may schedule against."""

    permission_classes = [IsTeacherUserRole]

    def get(self, request):
        teacher_profile = getattr(request.user, "teacher_profile", None)
        courses = (
            Course.objects.filter(teacher=teacher_profile).order_by("title")
            if teacher_profile
            else Course.objects.none()
        )
        return response.Response(TeacherCourseChoiceSerializer(courses, many=True).data)


class AdminEventListCreateView(generics.ListCreateAPIView):
    serializer_class = EventSerializer
    permission_classes = [AdminAction("courses:view")]
    queryset = Event.objects.select_related("course").all()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AdminEventDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EventSerializer
    permission_classes = [AdminAction("courses:view")]
    queryset = Event.objects.all()
    lookup_url_kwarg = "event_id"


class AdminCourseChoicesView(views.APIView):
    """Every course, for the admin's course picker."""

    permission_classes = [AdminAction("courses:view")]

    def get(self, request):
        courses = Course.objects.order_by("title")
        return response.Response(TeacherCourseChoiceSerializer(courses, many=True).data)


__all__ = [
    "AdminCourseChoicesView",
    "AdminEventDetailView",
    "AdminEventListCreateView",
    "StudentScheduleView",
    "StudentUpcomingView",
    "TeacherCourseChoicesView",
    "TeacherEventDetailView",
    "TeacherEventListCreateView",
    "upcoming_for_student",
]
