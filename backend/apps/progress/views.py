import contextlib
import csv
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models.functions import Coalesce
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import response, status, views

from apps.accounts.models import User
from apps.courses.activity import prune_teacher_activity_logs
from apps.courses.models import Course, Lesson, TeacherActivityLog
from apps.courses.serializers import CourseSerializer, TeacherActivitySerializer
from apps.enrollments.models import Enrollment
from apps.notifications.models import Notification
from apps.payments.models import Payment
from common.permissions import IsStudentUserRole, IsTeacherUserRole
from common.rbac import AdminAction

from .activity import (
    current_streak,
    minutes_today,
    record_daily_activity,
    record_learning_time,
    total_learning_minutes,
    week_activity,
)
from .models import CourseProgress, LessonProgress
from .serializers import CourseProgressSerializer, LessonProgressSerializer


def with_last_studied(enrollments):
    """Annotate each enrolment with when a lesson in it was last worked on.

    `Enrollment.last_accessed_at` is a copy of this, written by the lesson-ping
    endpoint. Deriving it instead keeps one source of truth, so a row can never
    be recent by one measure and never-touched by the other.

    Falls back to when a lesson was completed, because a completed lesson that
    never recorded an access time still happened — without this a student who
    had finished a course read "100% · last active: Never" on the teacher's
    students table.
    """
    return enrollments.annotate(
        last_studied=Coalesce(
            models.Max("lesson_progress__last_accessed_at"),
            models.Max("lesson_progress__completed_at"),
        )
    )


def engaged_learner_count(enrollments):
    """How many distinct people have opened at least one lesson.

    Two things were wrong with the old count. It counted *enrolments*, under a
    label that says "learners", so one student taking three of this teacher's
    courses read as three people. And it read `Enrollment.last_accessed_at`, a
    denormalised timestamp only stamped by the lesson-progress endpoint — which
    left a dashboard reporting a 20% completion rate beside 0 engaged learners,
    two numbers that cannot both be true.

    A LessonProgress row *is* the evidence that a lesson was opened, so ask it
    directly rather than trusting a copy of the fact kept somewhere else.
    """
    return (
        enrollments.filter(lesson_progress__isnull=False)
        .values("student_id")
        .distinct()
        .count()
    )


def engaged_enrollment_count(enrollments):
    """Enrolments in which at least one lesson has been opened.

    Per-course engagement, where the unit genuinely is the enrolment: a student
    can be engaged in one of a teacher's courses and never open another.
    """
    return enrollments.filter(lesson_progress__isnull=False).distinct().count()


def refresh_course_progress(enrollment: Enrollment):
    total = Lesson.objects.filter(
        section__course=enrollment.course,
        section__is_published=True,
        is_published=True,
    ).count()
    completed = LessonProgress.objects.filter(enrollment=enrollment, status="completed").count()
    percentage = Decimal("0.00")
    if total:
        percentage = (Decimal(completed) / Decimal(total) * Decimal("100")).quantize(Decimal("0.01"))
    progress, _ = CourseProgress.objects.get_or_create(enrollment=enrollment)
    progress.completed_lessons_count = completed
    progress.total_lessons_count = total
    progress.progress_percent = percentage
    # Finishing the lessons is no longer the same as finishing the course.
    #
    # A course can carry section quizzes and a final assessment, and those have
    # to be passed too — otherwise the certificate rests on clicking "complete"
    # enough times, which is not evidence of anything. Courses without quizzes
    # behave exactly as before, because the rules return True when there is
    # nothing to check.
    from apps.quizzes.progression import certificate_is_earned

    progress.is_completed = total > 0 and completed == total and certificate_is_earned(enrollment)
    progress.save()
    if progress.is_completed and enrollment.status != "completed":
        enrollment.status = "completed"
        enrollment.completed_at = timezone.now()
        enrollment.save(update_fields=["status", "completed_at", "updated_at"])
        certificate = issue_certificate(enrollment)
        send_course_completed_email(enrollment, certificate)
    return progress


def send_course_completed_email(enrollment, certificate=None):
    """Tell a student they finished, and what they get for it.

    Sent for every completed course, not only certificate-bearing ones — the
    achievement is worth acknowledging either way, and an email that arrives
    only sometimes teaches students to ignore it. Where there is no certificate
    the message says so plainly rather than implying one is coming.
    """
    from common.email import frontend_url, send_transactional_email

    student_user = enrollment.student.user
    course = enrollment.course

    if certificate:
        intro = (
            f"You've completed “{course.title}”. Your certificate is ready to "
            "download, and carries a unique ID anyone can verify."
        )
        button_label, button_url = "View your certificate", frontend_url("/certificates")
    else:
        intro = (
            f"You've completed “{course.title}”. This course doesn't award a "
            "certificate, but the work still counts — it's on your record."
        )
        button_label, button_url = "Back to your courses", frontend_url("/dashboard/courses")

    send_transactional_email(
        to_email=student_user.email,
        subject=f"You finished {course.title}",
        heading="Course complete 🎓",
        greeting=f"Hi {student_user.first_name or student_user.display_name},",
        intro=intro,
        button_label=button_label,
        button_url=button_url,
    )


def issue_certificate(enrollment):
    """Issue an MSU certificate for a completed, certificate-enabled course."""
    import secrets

    from django.conf import settings as django_settings

    from apps.certificates.models import Certificate

    if not enrollment.course.certificate_enabled:
        return None

    certificate = Certificate.objects.filter(enrollment=enrollment).first()
    if certificate:
        return certificate

    code = f"MSU-{secrets.token_hex(4).upper()}"
    while Certificate.objects.filter(certificate_code=code).exists():
        code = f"MSU-{secrets.token_hex(4).upper()}"

    frontend_url = getattr(django_settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    return Certificate.objects.create(
        student=enrollment.student,
        course=enrollment.course,
        enrollment=enrollment,
        certificate_code=code,
        verification_url=f"{frontend_url}/verify/{code}",
    )


class LessonProgressUpdateView(views.APIView):
    permission_classes = [IsStudentUserRole]

    def post(self, request, lesson_id):
        lesson = Lesson.objects.select_related("section__course").get(id=lesson_id)
        enrollment = Enrollment.objects.get(student=request.user.student_profile, course=lesson.section.course)
        progress, _ = LessonProgress.objects.get_or_create(
            enrollment=enrollment,
            lesson=lesson,
            defaults={"first_accessed_at": timezone.now(), "last_accessed_at": timezone.now()},
        )
        next_status = request.data.get("status", "in_progress")
        was_completed = progress.status == "completed"

        # Bank the gap since the last ping *before* moving last_accessed_at.
        seconds_credited = record_learning_time(progress)

        progress.status = next_status
        progress.last_accessed_at = timezone.now()
        position = request.data.get("position_seconds")
        if position is not None:
            # A malformed position from the client just means "no resume point".
            with contextlib.suppress(TypeError, ValueError):
                progress.last_position_seconds = max(0, int(position))
        if next_status == "completed":
            progress.completed_at = timezone.now()
        if not progress.first_accessed_at:
            progress.first_accessed_at = timezone.now()
        progress.save()

        # Only count a completion the first time, so re-opening a finished
        # lesson doesn't inflate the day.
        record_daily_activity(
            enrollment.student,
            seconds=seconds_credited,
            lesson_completed=next_status == "completed" and not was_completed,
        )

        enrollment.last_lesson = lesson
        enrollment.last_accessed_at = timezone.now()
        enrollment.save(update_fields=["last_lesson", "last_accessed_at", "updated_at"])
        refresh_course_progress(enrollment)
        return response.Response(LessonProgressSerializer(progress).data, status=status.HTTP_200_OK)


class CourseProgressDetailView(views.APIView):
    permission_classes = [IsStudentUserRole]

    def get(self, request, course_id):
        enrollment = Enrollment.objects.get(student=request.user.student_profile, course_id=course_id)
        progress = refresh_course_progress(enrollment)
        return response.Response(CourseProgressSerializer(progress).data)



def build_upcoming_work(student, limit=5):
    """Assignments with a due date still ahead, across enrolled courses.

    Only assignments — `Project` has no due date field, so including projects
    would mean inventing one. Submission happens off-platform by design
    (WhatsApp, Google Forms), so we can say what is *due* but never what is
    outstanding; the UI is worded accordingly.
    """
    from apps.courses.models import Task

    today = timezone.localtime().date()
    tasks = (
        Task.objects.filter(
            section__course__enrollments__student=student,
            section__course__enrollments__status__in=["active", "completed"],
            due_date__gte=today,
        )
        .select_related("section__course")
        .order_by("due_date")
        .distinct()[:limit]
    )

    return [
        {
            "id": str(task.id),
            "title": task.title,
            "courseId": str(task.section.course_id),
            "courseTitle": task.section.course.title,
            "dueDate": task.due_date.isoformat(),
            "daysUntilDue": (task.due_date - today).days,
            "submissionType": task.submission_type,
            "submissionUrl": task.submission_url,
        }
        for task in tasks
    ]


def _next_lesson_for(enrollment):
    """The lesson a student should actually open next.

    This used to return `enrollment.last_lesson` — the lesson most recently
    *opened* — while the dashboard labelled it "Next lesson". For anyone who had
    finished what they last opened, that meant being sent back to material they
    had already completed: a student 87% through a course was pointed at lesson
    one.

    So: resume the last lesson if it is unfinished, otherwise move on to the
    first lesson they have not completed. Falls back to the opening lesson for
    someone who has not started, and to None when a course has no lessons.
    """
    last = enrollment.last_lesson
    if last:
        unfinished = (
            LessonProgress.objects.filter(enrollment=enrollment, lesson=last)
            .exclude(status="completed")
            .exists()
        )
        if unfinished:
            return last

    completed_ids = set(
        LessonProgress.objects.filter(enrollment=enrollment, status="completed").values_list(
            "lesson_id", flat=True
        )
    )
    lessons = (
        Lesson.objects.filter(
            section__course=enrollment.course, section__is_published=True, is_published=True
        )
        .order_by("section__order", "order")
    )
    for lesson in lessons:
        if lesson.id not in completed_ids:
            return lesson

    # Everything is done; offer the last lesson so the card still links somewhere.
    return lessons.last()


class StudentDashboardView(views.APIView):
    permission_classes = [IsStudentUserRole]

    def get(self, request):
        from apps.certificates.models import Certificate

        student = request.user.student_profile
        enrollments = (
            Enrollment.objects.filter(student=student)
            .select_related("course", "last_lesson", "course_progress")
            .order_by("-last_accessed_at", "-created_at")
        )
        completed_count = enrollments.filter(status="completed").count()
        in_progress_count = sum(
            1
            for e in enrollments
            if e.status != "completed" and getattr(e, "course_progress", None) and e.course_progress.progress_percent > 0
        )
        certificates_count = Certificate.objects.filter(student=student, is_revoked=False).count()

        continue_enrollment = enrollments.filter(last_lesson__isnull=False).first() or enrollments.first()

        # Full course payload so dashboard cards render identically to catalog
        # cards — same gradient, level, rating and pricing — instead of a
        # thinner shape the card has to guess at.
        recent_courses = []
        for enrollment in enrollments[:6]:
            progress = getattr(enrollment, "course_progress", None)
            course_data = CourseSerializer(enrollment.course, context={"request": request}).data
            course_data["progressPercent"] = float(progress.progress_percent) if progress else 0.0
            course_data["lastLessonId"] = str(enrollment.last_lesson_id) if enrollment.last_lesson_id else None
            course_data["enrollmentStatus"] = enrollment.status
            course_data["enrollmentId"] = str(enrollment.id)
            recent_courses.append(course_data)

        continue_progress = (
            float(continue_enrollment.course_progress.progress_percent)
            if continue_enrollment and getattr(continue_enrollment, "course_progress", None)
            else 0.0
        )
        continue_lesson = _next_lesson_for(continue_enrollment) if continue_enrollment else None

        return response.Response(
            {
                "user": {
                    "id": str(request.user.id),
                    "displayName": request.user.display_name,
                    "avatar": request.user.avatar,
                    "avatarUrl": request.user.avatar_url,
                    "selectedTrack": student.selected_track,
                },
                "stats": {
                    "enrolled": enrollments.count(),
                    "inProgress": in_progress_count,
                    "completed": completed_count,
                    "certificates": certificates_count,
                },
                "continueLearning": {
                    "courseId": str(continue_enrollment.course.id),
                    "courseTitle": continue_enrollment.course.title,
                    "lessonId": str(continue_lesson.id) if continue_lesson else None,
                    "lessonTitle": continue_lesson.title if continue_lesson else None,
                    "progressPercent": continue_progress,
                }
                if continue_enrollment
                else None,
                # Everything here comes from time we actually recorded. A brand
                # new student sees zeros, which is the honest answer.
                "activity": {
                    "streakDays": current_streak(student),
                    "minutesToday": minutes_today(student),
                    "dailyGoalMinutes": student.daily_goal_minutes,
                    "totalMinutes": total_learning_minutes(student),
                    "week": week_activity(student),
                },
                "upcoming": build_upcoming_work(student),
                "recentCourses": recent_courses,
                "unreadNotifications": Notification.objects.filter(user=request.user, is_read=False).count(),
            }
        )


class TeacherDashboardView(views.APIView):
    permission_classes = [IsTeacherUserRole]

    def get(self, request):
        from apps.platform.models import PlatformSettings

        teacher = request.user.teacher_profile
        prune_teacher_activity_logs(teacher)
        courses = Course.objects.filter(teacher=teacher)
        total_learners = Enrollment.objects.filter(course__teacher=teacher).values("student_id").distinct().count()
        enrollments = Enrollment.objects.filter(course__teacher=teacher)
        total_enrollments = enrollments.count()
        total_completed = enrollments.filter(status="completed").count()
        engaged_learners = engaged_learner_count(enrollments)
        recent_activities = TeacherActivityLog.objects.filter(teacher=teacher)[:8]
        recent_courses = courses.order_by("-updated_at", "-created_at")[:6]
        return response.Response(
            {
                "announcementsEnabled": PlatformSettings.get_solo().allow_teacher_announcements,
                "teacher": {
                    "id": str(teacher.id),
                    "displayName": request.user.display_name,
                    "email": request.user.email,
                    "program": teacher.program,
                    "track": teacher.track,
                    "tracks": teacher.tracks or ([teacher.track] if teacher.track else []),
                },
                "stats": {
                    "totalCourses": courses.count(),
                    "publishedCourses": courses.filter(status="published").count(),
                    "draftCourses": courses.filter(status="draft").count(),
                    "activeCourses": courses.filter(status="published", visibility="visible").count(),
                    "totalLearners": total_learners,
                    "pendingReviewCourses": courses.filter(status="review").count(),
                    "declinedCourses": courses.filter(status="declined").count(),
                    "approvedCourses": courses.filter(status="approved").count(),
                    "completionRate": round((total_completed / total_enrollments) * 100, 1)
                    if total_enrollments
                    else 0,
                    "engagedLearners": engaged_learners,
                },
                "recentActivities": TeacherActivitySerializer(recent_activities, many=True).data,
                "recentCourses": CourseSerializer(recent_courses, many=True, context={"request": request}).data,
            }
        )


def build_teacher_analytics(teacher):
    """Analytics scoped strictly to courses owned by this teacher."""
    now = timezone.now()
    active_window = now - timedelta(days=30)
    courses = Course.objects.filter(teacher=teacher).order_by("-updated_at", "-created_at")
    enrollments = Enrollment.objects.filter(course__teacher=teacher)

    course_rows = []
    for course in courses:
        course_enrollments = enrollments.filter(course=course)
        total = course_enrollments.count()
        completed = course_enrollments.filter(status="completed").count()
        active = (
            with_last_studied(course_enrollments)
            .filter(last_studied__gte=active_window)
            .values("student_id")
            .distinct()
            .count()
        )
        engaged = engaged_enrollment_count(course_enrollments)
        course_rows.append(
            {
                "courseId": str(course.id),
                "title": course.title,
                "status": course.status,
                "enrollments": total,
                "activeLearners": active,
                "completionRate": round((completed / total) * 100, 1) if total else 0,
                "engaged": engaged,
            }
        )

    total_enrollments = enrollments.count()
    total_completed = enrollments.filter(status="completed").count()
    active_learners = (
        with_last_studied(enrollments)
        .filter(last_studied__gte=active_window)
        .values("student_id")
        .distinct()
        .count()
    )

    enrollment_trend = []
    for offset in range(7, -1, -1):
        week_start = now - timedelta(days=(offset + 1) * 7)
        week_end = now - timedelta(days=offset * 7)
        enrollment_trend.append(
            {
                "label": week_end.strftime("%d %b"),
                "enrollments": enrollments.filter(
                    enrolled_at__gte=week_start, enrolled_at__lt=week_end
                ).count(),
            }
        )

    return {
        "totals": {
            "totalCourses": courses.count(),
            "publishedCourses": courses.filter(status="published").count(),
            "draftCourses": courses.filter(status="draft").count(),
            "pendingReviewCourses": courses.filter(status="review").count(),
            "declinedCourses": courses.filter(status="declined").count(),
            "totalEnrollments": total_enrollments,
            "activeLearners": active_learners,
            "completionRate": round((total_completed / total_enrollments) * 100, 1)
            if total_enrollments
            else 0,
            "engagedLearners": engaged_learner_count(enrollments),
        },
        "courses": course_rows,
        "enrollmentTrend": enrollment_trend,
    }


def build_teacher_students(teacher, course_id=None):
    """One row per (student, course) for this teacher's courses only."""
    now = timezone.now()
    active_window = now - timedelta(days=30)
    enrollments = with_last_studied(
        Enrollment.objects.filter(course__teacher=teacher)
        .select_related("student__user", "course", "course_progress")
        .order_by("-enrolled_at")
    )
    if course_id:
        enrollments = enrollments.filter(course_id=course_id)

    rows = []
    for enrollment in enrollments:
        progress = getattr(enrollment, "course_progress", None)
        last_studied = enrollment.last_studied
        is_active = bool(last_studied and last_studied >= active_window)
        rows.append(
            {
                "studentId": str(enrollment.student_id),
                "name": enrollment.student.user.display_name,
                "email": enrollment.student.user.email,
                "courseId": str(enrollment.course_id),
                "courseTitle": enrollment.course.title,
                "enrolledAt": enrollment.enrolled_at.isoformat(),
                "lastActiveAt": last_studied.isoformat() if last_studied else None,
                "progressPercent": float(progress.progress_percent) if progress else 0.0,
                "status": enrollment.status,
                "isActive": is_active,
            }
        )
    return rows


class TeacherStudentsView(views.APIView):
    permission_classes = [IsTeacherUserRole]

    def get(self, request):
        rows = build_teacher_students(
            request.user.teacher_profile, course_id=request.query_params.get("courseId")
        )
        # Every figure here counts enrolment rows except `uniqueStudents`,
        # and the names now say so. They used to end in "Students" while
        # counting rows, which put "Active (30d) 9" on a page that had just
        # said there were 4 students.
        completed = sum(1 for row in rows if row["status"] == "completed")
        active = sum(1 for row in rows if row["isActive"])
        return response.Response(
            {
                "summary": {
                    "totalEnrollments": len(rows),
                    "uniqueStudents": len({row["studentId"] for row in rows}),
                    "activeEnrollments": active,
                    "completedEnrollments": completed,
                    "dormantEnrollments": len(rows) - active,
                },
                "students": rows,
            }
        )


class TeacherStudentsExportView(views.APIView):
    permission_classes = [IsTeacherUserRole]

    def get(self, request):
        rows = build_teacher_students(
            request.user.teacher_profile, course_id=request.query_params.get("courseId")
        )
        http_response = HttpResponse(content_type="text/csv")
        http_response["Content-Disposition"] = 'attachment; filename="students.csv"'
        writer = csv.writer(http_response)
        writer.writerow(["Name", "Email", "Course", "Enrolled", "Progress %", "Status", "Last active"])
        for row in rows:
            writer.writerow(
                [
                    row["name"],
                    row["email"],
                    row["courseTitle"],
                    row["enrolledAt"],
                    row["progressPercent"],
                    row["status"],
                    row["lastActiveAt"] or "",
                ]
            )
        return http_response


class TeacherAnalyticsView(views.APIView):
    permission_classes = [IsTeacherUserRole]

    def get(self, request):
        return response.Response(build_teacher_analytics(request.user.teacher_profile))


class TeacherAnalyticsExportView(views.APIView):
    permission_classes = [IsTeacherUserRole]

    def get(self, request):
        data = build_teacher_analytics(request.user.teacher_profile)
        http_response = HttpResponse(content_type="text/csv")
        http_response["Content-Disposition"] = 'attachment; filename="course-analytics.csv"'
        writer = csv.writer(http_response)
        writer.writerow(
            [
                "Course",
                "Status",
                "Enrollments",
                "Active learners (30d)",
                "Completion rate %",
                "Engaged enrollments",
            ]
        )
        for course in data["courses"]:
            writer.writerow(
                [
                    course["title"],
                    course["status"],
                    course["enrollments"],
                    course["activeLearners"],
                    course["completionRate"],
                    course["engaged"],
                ]
            )
        return http_response


class AdminDashboardView(views.APIView):
    permission_classes = [AdminAction("dashboard:view")]

    def get(self, request):
        now = timezone.now()
        start_of_week = now - timedelta(days=6)
        start_of_month = now - timedelta(days=29)
        successful_payments = Payment.objects.filter(status="successful")
        enrollments = Enrollment.objects.select_related("course", "student__user")
        published_courses = Course.objects.filter(status="published", visibility="visible")
        completed_enrollments = enrollments.filter(status="completed").count()
        total_enrollments = enrollments.count()
        completion_rate = round((completed_enrollments / total_enrollments) * 100, 1) if total_enrollments else 0

        registration_series = []
        for offset in range(6, -1, -1):
            day = now - timedelta(days=offset)
            registration_series.append(
                {
                    "label": day.strftime("%a"),
                    "students": User.objects.filter(role="student", created_at__date=day.date()).count(),
                    "teachers": User.objects.filter(role="teacher", created_at__date=day.date()).count(),
                }
            )

        revenue_series = []
        for offset in range(5, -1, -1):
            month_anchor = now.replace(day=1) - timedelta(days=offset * 30)
            amount = sum(
                successful_payments.filter(
                    created_at__year=month_anchor.year,
                    created_at__month=month_anchor.month,
                ).values_list("amount", flat=True),
                start=Decimal("0.00"),
            )
            revenue_series.append(
                {
                    "label": month_anchor.strftime("%b"),
                    "revenue": float(amount),
                }
            )

        engagement = [
            {
                "courseId": str(course.id),
                "title": course.title,
                "enrollments": course.enrollments.count(),
                "completionRate": round(
                    sum(
                        float(value)
                        for value in course.enrollments.filter(course_progress__isnull=False).values_list(
                            "course_progress__progress_percent", flat=True
                        )
                        if value is not None
                    )
                    / max(course.enrollments.filter(course_progress__isnull=False).count(), 1),
                    1,
                )
                if course.enrollments.filter(course_progress__isnull=False).exists()
                else 0,
            }
            for course in published_courses[:6]
        ]

        recent_events = [
            {
                "id": f"user-{user.id}",
                "title": "New user registered",
                "message": f"{user.display_name} joined as a {user.role}.",
                "timestamp": user.created_at,
                "type": "registration",
            }
            for user in User.objects.order_by("-created_at")[:4]
        ] + [
            {
                "id": f"payment-{payment.id}",
                "title": "Payment received",
                "message": f"{payment.student.user.display_name} paid for {payment.course.title}.",
                "timestamp": payment.created_at,
                "type": "payment",
            }
            for payment in successful_payments.select_related("student__user", "course").order_by("-created_at")[:4]
        ] + [
            {
                "id": f"activity-{activity.id}",
                "title": "Teacher activity",
                "message": activity.message,
                "timestamp": activity.created_at,
                "type": activity.activity_type,
            }
            for activity in TeacherActivityLog.objects.select_related("teacher__user").order_by("-created_at")[:4]
        ]
        recent_events = sorted(recent_events, key=lambda item: item["timestamp"], reverse=True)[:10]

        return response.Response(
            {
                "totals": {
                    "users": User.objects.count(),
                    "teachers": User.objects.filter(role="teacher").count(),
                    "students": User.objects.filter(role="student").count(),
                    "courses": Course.objects.count(),
                    "payments": successful_payments.count(),
                    "transactions": successful_payments.count(),
                    "payingStudents": successful_payments.values("student_id").distinct().count(),
                    "revenue": str(
                        sum(successful_payments.values_list("amount", flat=True), start=Decimal("0.00"))
                    ),
                    "publishedCourses": published_courses.count(),
                    "pendingCourses": Course.objects.filter(status="review").count(),
                    "activeEnrollments": enrollments.filter(status="active").count(),
                    "completedEnrollments": completed_enrollments,
                    "monthlyRevenue": str(
                        sum(successful_payments.filter(created_at__gte=start_of_month).values_list("amount", flat=True), start=Decimal("0.00"))
                    ),
                    "courseCompletionRate": completion_rate,
                    "activeUsersToday": enrollments.filter(last_accessed_at__date=now.date()).values("student_id").distinct().count(),
                },
                "analytics": {
                    "registrations": registration_series,
                    "revenue": revenue_series,
                    "engagement": engagement,
                    "weeklyEnrollments": enrollments.filter(created_at__gte=start_of_week).count(),
                    "monthlyEnrollments": enrollments.filter(created_at__gte=start_of_month).count(),
                },
                "activityFeed": recent_events,
                "systemAlerts": {
                    "pendingReviews": Course.objects.filter(status="review").count(),
                    "failedPayments": Payment.objects.filter(status="failed").count(),
                    "inactiveTeachers": User.objects.filter(role="teacher", teacher_profile__status="inactive").count(),
                    # False means mail is going to a log file, not to people.
                    # Worth saying out loud on the screen where an admin creates
                    # a teacher, because the invite carries their password and
                    # nothing about the success response would reveal the loss.
                    "emailDelivers": getattr(settings, "EMAIL_IS_DELIVERED", False),
                },
            }
        )
