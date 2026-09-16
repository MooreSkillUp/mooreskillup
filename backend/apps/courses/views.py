from datetime import timedelta

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, response, status, viewsets
from rest_framework.decorators import action
from rest_framework.views import APIView

from apps.platform.audit import record_audit
from common.permissions import IsStudentUserRole, IsTeacherUserRole
from common.rbac import AdminAction

from .activity import prune_teacher_activity_logs
from .models import Course, CourseReview, Lesson, Project, Section, Task, TeacherActivityLog
from .ordering import OrderMismatch, apply_order, next_order
from .serializers import (
    CourseReviewSerializer,
    CourseSerializer,
    LessonSerializer,
    ProjectSerializer,
    SectionSerializer,
    TaskSerializer,
    TeacherActivitySerializer,
)

ALLOWED_STATUS_TRANSITIONS = {
    "draft": {"review", "archived"},
    "review": {"published", "approved", "declined", "archived"},
    "approved": {"published", "declined", "archived"},
    "declined": {"review", "archived"},
    "published": {"archived"},
    "archived": {"draft"},
}


TRANSITION_AUDIT_ACTIONS = {
    "published": "course.approve",
    "declined": "course.decline",
    "archived": "course.archive",
    "draft": "course.restore",
}


def transition_course_or_error(course, next_status, next_visibility, request):
    allowed = ALLOWED_STATUS_TRANSITIONS.get(course.status, set())
    if next_status not in allowed:
        return response.Response(
            {"detail": f"Invalid transition from '{course.status}' to '{next_status}'."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    decline_reason = (request.data.get("reason") or "").strip() if next_status == "declined" else ""
    if next_status == "declined" and not decline_reason:
        # A course sent back with no reason is a dead end: the teacher can see
        # it failed and has nothing to act on. The reviewer is the only person
        # who knows what is wrong, so they have to say.
        return response.Response(
            {"reason": ["Tell the teacher what to change before sending the course back."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    previous_status = course.status
    if request.user.role == "admin":
        record_audit(
            request,
            TRANSITION_AUDIT_ACTIONS.get(next_status, "course.update"),
            resource_type="course",
            resource_id=course.id,
            resource_name=course.title,
            changes={"status": {"before": previous_status, "after": next_status}},
        )
    course.status = next_status
    course.visibility = next_visibility
    update_fields = ["status", "visibility", "updated_at"]
    if next_status == "published" and not course.published_at:
        course.published_at = timezone.now()
        update_fields.append("published_at")

    # The decision lives on the course, where the teacher goes to act on it.
    # A decline writes the note; approval answers it, so the note goes.
    if next_status in {"declined", "approved", "published"}:
        course.decline_reason = decline_reason
        course.reviewed_at = timezone.now()
        course.reviewed_by = request.user
        update_fields += ["decline_reason", "reviewed_at", "reviewed_by"]
    course.save(update_fields=update_fields)

    if next_status in {"published", "declined"} and course.teacher:
        from common.email import frontend_url, send_transactional_email

        approved = next_status == "published"
        send_transactional_email(
            to_email=course.teacher.user.email,
            subject=f"Your course was {'approved' if approved else 'declined'} — {course.title}",
            heading="Course approved ✅" if approved else "Course needs changes",
            greeting=f"Hi {course.teacher.user.display_name},",
            intro=(
                f"Great news — “{course.title}” has been approved and is now live for learners."
                if approved
                else f"“{course.title}” was reviewed and sent back for changes. Please update it and resubmit."
            ),
            lines=[f"Reviewer note: {decline_reason}"] if decline_reason else None,
            button_label="Open the course" if approved else "Edit your course",
            button_url=frontend_url(f"/teacher/courses/{course.id}/edit"),
        )
        # Also drop an in-app notification so the teacher sees the reason in their bell.
        if not approved:
            _notify_course_owner(
                course,
                f"Course declined — {course.title}",
                decline_reason or "Your course was sent back for changes. Please review and resubmit.",
            )

    return response.Response(
        CourseSerializer(course, context={"request": request}).data,
        status=status.HTTP_200_OK,
    )


class CourseViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CourseSerializer
    permission_classes = [permissions.AllowAny]

    def get_serializer_context(self):
        """Add the signed-in student's completed lessons, as one set.

        LessonSerializer needs to know whether each lesson is done. Looking that
        up per lesson would mean a query per row; fetching the ids once here
        makes a forty-lesson course a single extra query.

        Only for the detail view — a catalogue listing renders no lesson rows,
        so paying for this on every card would be waste.
        """
        context = super().get_serializer_context()
        request = self.request
        if (
            self.action == "retrieve"
            and request.user.is_authenticated
            and getattr(request.user, "role", None) == "student"
        ):
            from apps.progress.models import LessonProgress

            context["completed_lesson_ids"] = set(
                LessonProgress.objects.filter(
                    enrollment__student=request.user.student_profile,
                    enrollment__course_id=self.kwargs.get("pk"),
                    status="completed",
                ).values_list("lesson_id", flat=True)
            )

            # In a sequential course, which sections this student has reached.
            # Computed once here rather than per section, and left absent for
            # open courses so nothing gates that shouldn't.
            from apps.enrollments.models import Enrollment

            enrollment = Enrollment.objects.with_access().filter(
                student=request.user.student_profile, course_id=self.kwargs.get("pk")
            ).select_related("course").first()
            if enrollment and enrollment.course.progression_mode == "sequential":
                from apps.quizzes.progression import accessible_section_ids

                context["reachable_section_ids"] = accessible_section_ids(enrollment)
        return context

    def get_queryset(self):
        from django.db.models import Avg, Count, Q

        queryset = (
            Course.objects.filter(status="published", visibility="visible")
            .select_related("teacher__user", "category", "subcategory")
            .prefetch_related("sections__lessons", "sections__tasks", "sections__projects", "tags")
            .annotate(
                published_lesson_count=Count(
                    "sections__lessons",
                    filter=Q(sections__lessons__is_published=True, sections__is_published=True),
                    distinct=True,
                )
            )
        )
        params = self.request.query_params
        category = params.get("category", "").strip()
        track = params.get("track", "").strip()
        level = params.get("level", "").strip()
        price = params.get("price", "").strip()
        instructor = params.get("instructor", "").strip()
        search = params.get("search", "").strip()
        sort = params.get("sort", "newest").strip()

        if category:
            queryset = queryset.filter(category__name__iexact=category)
        if track:
            queryset = queryset.filter(subcategory__name__iexact=track)
        if level:
            queryset = queryset.filter(level=level)
        if instructor:
            queryset = queryset.filter(teacher_id=instructor)
        if price == "free":
            queryset = queryset.filter(price=0)
        elif price == "paid":
            queryset = queryset.filter(price__gt=0)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(subtitle__icontains=search)
                | Q(overview__icontains=search)
                | Q(tags__name__icontains=search)
            ).distinct()

        # Featured courses always lead the list, whatever the chosen sort.
        if sort == "price-low":
            queryset = queryset.order_by("-featured", "price", "-created_at")
        elif sort == "price-high":
            queryset = queryset.order_by("-featured", "-price", "-created_at")
        elif sort == "rating":
            queryset = queryset.annotate(
                _avg=Avg("reviews__rating", filter=Q(reviews__status="published"))
            ).order_by("-featured", "-_avg", "-created_at")
        elif sort == "popular":
            queryset = queryset.annotate(_enrolls=Count("enrollments")).order_by(
                "-featured", "-_enrolls", "-created_at"
            )
        else:  # newest
            queryset = queryset.order_by("-featured", "-published_at", "-created_at")
        return queryset


class AdminCourseListView(APIView):
    permission_classes = [AdminAction("courses:view")]

    def get(self, request):
        from .serializers import AdminCourseListSerializer

        courses = (
            Course.objects.all()
            .select_related("teacher__user", "category", "subcategory", "reviewed_by")
            # Only what the reviewer checklist reads. Prefetched, the list costs
            # the same queries for three courses as for three hundred.
            .prefetch_related("sections__lessons", "quizzes__questions__choices")
            .order_by("-updated_at", "-created_at")
        )
        return response.Response(AdminCourseListSerializer(courses, many=True).data)


class TeacherCourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    permission_classes = [IsTeacherUserRole]

    def get_queryset(self):
        return (
            Course.objects.filter(teacher=self.request.user.teacher_profile)
            .select_related("teacher__user", "category", "subcategory")
            .prefetch_related("sections__lessons", "sections__tasks", "sections__projects", "tags")
        )

    def perform_create(self, serializer):
        course = serializer.save(teacher=self.request.user.teacher_profile)
        TeacherActivityLog.objects.create(
            teacher=self.request.user.teacher_profile,
            course=course,
            message=f"Created course {course.title}",
            activity_type="create-course",
        )

    def perform_update(self, serializer):
        course = serializer.save()
        teacher = self.request.user.teacher_profile
        message = f"Updated course {course.title}"

        # Autosave runs every twelve seconds while a teacher types, and each save
        # wrote its own entry — "Updated course" four times in a few minutes,
        # burying everything else in the teacher's and the admin's feeds. One
        # editing session is one entry: a recent one is refreshed instead.
        recent = (
            TeacherActivityLog.objects.filter(
                teacher=teacher,
                course=course,
                activity_type="edit-course",
                created_at__gte=timezone.now() - timedelta(minutes=30),
            )
            .order_by("-created_at")
            .first()
        )
        if recent:
            TeacherActivityLog.objects.filter(pk=recent.pk).update(
                created_at=timezone.now(), message=message
            )
            return
        TeacherActivityLog.objects.create(
            teacher=teacher, course=course, message=message, activity_type="edit-course"
        )

    def destroy(self, request, *args, **kwargs):
        # Teachers can't delete platform content directly — they request it and
        # an admin approves or aborts.
        course = self.get_object()
        course.pending_deletion = True
        course.deletion_reason = (request.data.get("reason") or "").strip()
        course.save(update_fields=["pending_deletion", "deletion_reason", "updated_at"])
        TeacherActivityLog.objects.create(
            teacher=request.user.teacher_profile,
            course=course,
            message=f"Requested deletion of {course.title}",
            activity_type="delete-course",
        )
        notify_admins(
            "Course deletion requested",
            f"{request.user.display_name} requested to delete \"{course.title}\". Review it in Admin courses.",
        )
        return response.Response(
            {"detail": "Deletion request sent to admin for approval.", "pendingDeletion": True}
        )

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        from .versioning import save_course_version

        course = self.get_object()
        # Snapshot the state being submitted so it can be restored later.
        save_course_version(course, user=request.user, note="Submitted for review")
        course.status = "review"
        course.visibility = "hidden"
        # The decline note is deliberately left in place — the next reviewer
        # needs to see what was asked for last time. Approval clears it.
        course.submitted_at = timezone.now()
        course.save(update_fields=["status", "visibility", "submitted_at", "updated_at"])
        TeacherActivityLog.objects.create(
            teacher=request.user.teacher_profile,
            course=course,
            message=f"Submitted course {course.title} for admin review",
            activity_type="publish-course",
        )
        return response.Response(self.get_serializer(course).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        from .versioning import duplicate_course

        course = self.get_object()
        new_course = duplicate_course(course, teacher=request.user.teacher_profile)
        TeacherActivityLog.objects.create(
            teacher=request.user.teacher_profile,
            course=new_course,
            message=f"Duplicated course {course.title}",
            activity_type="create-course",
        )
        return response.Response(self.get_serializer(new_course).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        from .serializers import CourseVersionSerializer

        course = self.get_object()
        return response.Response(CourseVersionSerializer(course.versions.all(), many=True).data)

    @action(detail=True, methods=["post"], url_path="versions/(?P<version_id>[^/.]+)/restore")
    def restore_version(self, request, pk=None, version_id=None):
        from .versioning import restore_course_from_snapshot, save_course_version

        course = self.get_object()
        version = get_object_or_404(course.versions, id=version_id)
        # Preserve the current state as a new version before overwriting it.
        save_course_version(course, user=request.user, note="Auto-saved before restore")
        restore_course_from_snapshot(course, version.snapshot)
        TeacherActivityLog.objects.create(
            teacher=request.user.teacher_profile,
            course=course,
            message=f"Restored course {course.title} to version {version.version_number}",
            activity_type="edit-course",
        )
        course = self.get_queryset().get(id=course.id)
        return response.Response(self.get_serializer(course).data)


class TeacherSectionViewSet(viewsets.ModelViewSet):
    serializer_class = SectionSerializer
    permission_classes = [IsTeacherUserRole]

    def get_queryset(self):
        return Section.objects.select_related("course").filter(course__teacher=self.request.user.teacher_profile)


class TeacherLessonViewSet(viewsets.ModelViewSet):
    serializer_class = LessonSerializer
    permission_classes = [IsTeacherUserRole]

    def get_queryset(self):
        return Lesson.objects.select_related("section__course").filter(
            section__course__teacher=self.request.user.teacher_profile
        )


class TeacherTaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsTeacherUserRole]

    def get_queryset(self):
        return Task.objects.select_related("section__course").filter(
            section__course__teacher=self.request.user.teacher_profile
        )


class TeacherProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [IsTeacherUserRole]

    def get_queryset(self):
        return Project.objects.select_related("section__course").filter(
            section__course__teacher=self.request.user.teacher_profile
        )


class TeacherCourseSectionCreateView(APIView):
    permission_classes = [IsTeacherUserRole]

    def post(self, request, course_id):
        course = get_object_or_404(Course, id=course_id, teacher=request.user.teacher_profile)
        serializer = SectionSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(course=course, order=next_order(Section.objects.filter(course=course)))
        return response.Response(serializer.data, status=status.HTTP_201_CREATED)


class TeacherSectionLessonCreateView(APIView):
    permission_classes = [IsTeacherUserRole]

    def post(self, request, section_id):
        section = get_object_or_404(Section, id=section_id, course__teacher=request.user.teacher_profile)
        serializer = LessonSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(section=section, order=next_order(Lesson.objects.filter(section=section)))
        return response.Response(serializer.data, status=status.HTTP_201_CREATED)


class TeacherSectionTaskCreateView(APIView):
    permission_classes = [IsTeacherUserRole]

    def post(self, request, section_id):
        section = get_object_or_404(Section, id=section_id, course__teacher=request.user.teacher_profile)
        serializer = TaskSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(section=section, order=next_order(Task.objects.filter(section=section)))
        return response.Response(serializer.data, status=status.HTTP_201_CREATED)


class TeacherSectionProjectCreateView(APIView):
    permission_classes = [IsTeacherUserRole]

    def post(self, request, section_id):
        section = get_object_or_404(Section, id=section_id, course__teacher=request.user.teacher_profile)
        serializer = ProjectSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(section=section, order=next_order(Project.objects.filter(section=section)))
        return response.Response(serializer.data, status=status.HTTP_201_CREATED)


def reorder_children(children, data):
    """Re-sequence one parent's children from the id lists in `data`, all or nothing.

    `children` maps a key in the request body to the queryset it orders, such as
    {"lessons": ...}. A key the body leaves out is untouched; a key it includes
    must list every child exactly once. Several lists arrive together because
    they are one decision — a rejected task list must not leave a lesson
    reorder half-applied.
    """
    lists = {}
    for key in children:
        if key not in data:
            continue
        if not isinstance(data[key], list):
            return response.Response(
                {key: ["Expected a list of ids."]}, status=status.HTTP_400_BAD_REQUEST
            )
        lists[key] = data[key]
    if not lists:
        return response.Response({"detail": "Nothing to reorder."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            for key, ids in lists.items():
                try:
                    apply_order(children[key], ids)
                except OrderMismatch as mismatch:
                    raise OrderMismatch(f"{key}: {mismatch}") from mismatch
    except OrderMismatch as mismatch:
        return response.Response({"detail": str(mismatch)}, status=status.HTTP_400_BAD_REQUEST)
    return response.Response(status=status.HTTP_204_NO_CONTENT)


class TeacherCourseSectionReorderView(APIView):
    permission_classes = [IsTeacherUserRole]

    def post(self, request, course_id):
        course = get_object_or_404(Course, id=course_id, teacher=request.user.teacher_profile)
        return reorder_children({"sections": Section.objects.filter(course=course)}, request.data)


class TeacherSectionReorderView(APIView):
    permission_classes = [IsTeacherUserRole]

    def post(self, request, section_id):
        section = get_object_or_404(Section, id=section_id, course__teacher=request.user.teacher_profile)
        return reorder_children(
            {
                "lessons": Lesson.objects.filter(section=section),
                "tasks": Task.objects.filter(section=section),
                "projects": Project.objects.filter(section=section),
            },
            request.data,
        )


class TeacherCoursePricingView(APIView):
    permission_classes = [IsTeacherUserRole]

    def patch(self, request, course_id):
        course = get_object_or_404(Course, id=course_id, teacher=request.user.teacher_profile)
        serializer = CourseSerializer(course, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return response.Response(serializer.data)


class TeacherActivityListView(APIView):
    permission_classes = [IsTeacherUserRole]

    def get(self, request):
        teacher = request.user.teacher_profile
        prune_teacher_activity_logs(teacher)
        activities = TeacherActivityLog.objects.filter(teacher=teacher)[:50]
        return response.Response(TeacherActivitySerializer(activities, many=True).data)

    def post(self, request):
        message = request.data.get("message", "").strip()
        activity_type = request.data.get("type", "").strip()
        if not message or not activity_type:
            return response.Response(
                {"detail": "message and type are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        activity = TeacherActivityLog.objects.create(
            teacher=request.user.teacher_profile,
            course_id=request.data.get("courseId"),
            message=message,
            activity_type=activity_type,
        )
        prune_teacher_activity_logs(request.user.teacher_profile)
        return response.Response(TeacherActivitySerializer(activity).data, status=status.HTTP_201_CREATED)

    def delete(self, request):
        deleted_count, _ = TeacherActivityLog.objects.filter(teacher=request.user.teacher_profile).delete()
        return response.Response({"detail": "Teacher activity history cleared.", "deleted": deleted_count})


class AdminCourseReassignView(APIView):
    permission_classes = [AdminAction("courses:reassign")]

    def post(self, request, course_id):
        from apps.accounts.models import TeacherProfile

        course = get_object_or_404(Course, id=course_id)
        next_teacher_id = request.data.get("new_teacher_profile_id")
        if next_teacher_id in (None, "", "admin-owned"):
            course.teacher = None
            course.save(update_fields=["teacher", "updated_at"])
            record_audit(
                request,
                "course.reassign",
                resource_type="course",
                resource_id=course.id,
                resource_name=course.title,
                metadata={"newOwner": "admin"},
            )
            return response.Response({"detail": "Course moved to admin ownership successfully."})

        teacher = get_object_or_404(TeacherProfile, id=next_teacher_id)
        course.teacher = teacher
        course.save(update_fields=["teacher", "updated_at"])
        record_audit(
            request,
            "course.reassign",
            resource_type="course",
            resource_id=course.id,
            resource_name=course.title,
            metadata={"newOwner": teacher.user.display_name},
        )
        return response.Response({"detail": "Course reassigned successfully."})


class AdminCourseApproveView(APIView):
    permission_classes = [AdminAction("courses:approve")]

    def post(self, request, course_id):
        from apps.platform.models import PlatformSettings
        from common.rbac import get_admin_role

        course = get_object_or_404(Course, id=course_id)
        settings_row = PlatformSettings.get_solo()
        actor_role = get_admin_role(request.user)

        # When a second approval is required, a moderator approving only moves the
        # course to "approved" (awaiting an admin/super-admin). Admins and
        # super-admins always publish directly. A course already "approved" is
        # published by whoever has the publish permission.
        if (
            settings_row.require_admin_second_approval
            and actor_role == "moderator"
            and course.status == "review"
        ):
            return transition_course_or_error(course, "approved", "hidden", request)
        return transition_course_or_error(course, "published", "visible", request)


class AdminCourseDeclineView(APIView):
    permission_classes = [AdminAction("courses:decline")]

    def post(self, request, course_id):
        course = get_object_or_404(Course, id=course_id)
        return transition_course_or_error(course, "declined", "hidden", request)


class AdminCourseArchiveView(APIView):
    permission_classes = [AdminAction("courses:archive")]

    def post(self, request, course_id):
        course = get_object_or_404(Course, id=course_id)
        return transition_course_or_error(course, "archived", "hidden", request)


class AdminCourseRestoreView(APIView):
    permission_classes = [AdminAction("courses:restore")]

    def post(self, request, course_id):
        course = get_object_or_404(Course, id=course_id)
        return transition_course_or_error(course, "draft", "hidden", request)


def notify_admins(title, body):
    """In-app notification to every active admin."""
    from apps.accounts.models import User
    from apps.notifications.models import Notification

    admins = User.objects.filter(role="admin", is_active=True)
    Notification.objects.bulk_create(
        [Notification(user=admin, title=title, body=body, kind="message") for admin in admins],
        batch_size=500,
    )


def _notify_course_owner(course, title, body):
    from apps.notifications.models import Notification

    if course.teacher and course.teacher.user:
        Notification.objects.create(user=course.teacher.user, title=title, body=body, kind="course")
        from common.email import frontend_url, send_transactional_email

        send_transactional_email(
            to_email=course.teacher.user.email,
            subject=title,
            heading=title,
            greeting=f"Hi {course.teacher.user.display_name},",
            intro=body,
            button_label="Open My Courses",
            button_url=frontend_url("/teacher/courses"),
        )


class AdminCourseDeleteApproveView(APIView):
    """Approve a deletion (or delete directly): permanently removes the course."""

    permission_classes = [AdminAction("courses:delete")]

    def post(self, request, course_id):
        course = get_object_or_404(Course, id=course_id)
        title = course.title
        record_audit(
            request,
            "course.delete",
            resource_type="course",
            resource_id=course.id,
            resource_name=title,
        )
        _notify_course_owner(course, "Course deleted", f"Your course \"{title}\" was deleted by an admin.")
        course.delete()
        return response.Response({"detail": f"Course \"{title}\" deleted."})


class AdminCourseDeleteRejectView(APIView):
    """Abort a teacher's deletion request — the course stays."""

    permission_classes = [AdminAction("courses:edit")]

    def post(self, request, course_id):
        course = get_object_or_404(Course, id=course_id)
        course.pending_deletion = False
        course.deletion_reason = ""
        course.save(update_fields=["pending_deletion", "deletion_reason", "updated_at"])
        record_audit(
            request,
            "course.update",
            resource_type="course",
            resource_id=course.id,
            resource_name=course.title,
            metadata={"action": "deletion-request-aborted"},
        )
        _notify_course_owner(
            course,
            "Deletion request declined",
            f"Your request to delete \"{course.title}\" was declined by an admin. The course is still live.",
        )
        return response.Response({"detail": "Deletion request aborted."})


def student_can_review(student, course):
    """Eligible if enrolled AND completed or >= 50% progress."""
    from apps.enrollments.models import Enrollment

    enrollment = Enrollment.objects.with_access().filter(student=student, course=course).select_related(
        "course_progress"
    ).first()
    if not enrollment:
        return False
    if enrollment.status == "completed":
        return True
    progress = getattr(enrollment, "course_progress", None)
    return bool(progress and progress.progress_percent >= 50)


class CourseReviewListCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, course_id):
        reviews = (
            CourseReview.objects.filter(course_id=course_id, status="published")
            .select_related("student__user")
        )
        return response.Response(CourseReviewSerializer(reviews, many=True).data)

    def post(self, request, course_id):
        from apps.platform.models import PlatformSettings

        if getattr(request.user, "role", None) != "student":
            return response.Response({"detail": "Only students can review."}, status=status.HTTP_403_FORBIDDEN)
        if not PlatformSettings.get_solo().feature_reviews_enabled:
            return response.Response({"detail": "Reviews are turned off."}, status=status.HTTP_403_FORBIDDEN)

        course = get_object_or_404(Course, id=course_id)
        student = request.user.student_profile
        if not student_can_review(student, course):
            return response.Response(
                {"detail": "You can review a course after completing at least half of it."},
                status=status.HTTP_403_FORBIDDEN,
            )

        existing = CourseReview.objects.filter(course=course, student=student).first()
        serializer = CourseReviewSerializer(existing, data=request.data, partial=bool(existing))
        serializer.is_valid(raise_exception=True)
        serializer.save(course=course, student=student)
        return response.Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminReviewModerateView(APIView):
    permission_classes = [AdminAction("reviews:moderate")]

    def get(self, request):
        reviews = CourseReview.objects.select_related("student__user", "course").order_by("-created_at")
        return response.Response(CourseReviewSerializer(reviews, many=True).data)

    def patch(self, request, review_id):
        review = get_object_or_404(CourseReview, id=review_id)
        next_status = request.data.get("status")
        if next_status not in {"published", "hidden"}:
            return response.Response({"detail": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)
        review.status = next_status
        review.save(update_fields=["status", "updated_at"])
        record_audit(
            request,
            "review.moderate",
            resource_type="review",
            resource_id=review.id,
            resource_name=review.course.title,
            metadata={"status": next_status},
        )
        return response.Response(CourseReviewSerializer(review).data)


class StudentLessonView(APIView):
    """Everything the lesson player needs: gated content, curriculum, progress, neighbours."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, lesson_id):
        from .video import build_embed_url

        lesson = get_object_or_404(
            Lesson.objects.select_related("section__course"), id=lesson_id
        )
        course = lesson.section.course
        user = request.user
        is_student = getattr(user, "role", None) == "student"

        enrollment = None
        if is_student:
            from apps.enrollments.models import Enrollment

            enrollment = Enrollment.objects.with_access().filter(student=user.student_profile, course=course).first()

        # Two separate gates, and both must open.
        #
        # Entitlement: has this student paid for, or been given, access at all.
        # Progression: in a sequential course, have they finished what comes
        # before. An open course only ever applies the first.
        reachable_section_ids = None
        if enrollment and course.progression_mode == "sequential":
            from apps.quizzes.progression import accessible_section_ids

            reachable_section_ids = accessible_section_ids(enrollment)

        def section_unlocked(section):
            entitled = course.price == 0 or section.access_type == "free" or bool(enrollment)
            if not entitled:
                return False
            if reachable_section_ids is None:
                return True
            return section.id in reachable_section_ids

        def lesson_accessible(lsn):
            return section_unlocked(lsn.section) or lsn.is_previewable

        can_access = lesson_accessible(lesson)

        # Ordered, flattened lesson list for prev/next.
        sections = list(
            course.sections.filter(is_published=True)
            .order_by("order")
            .prefetch_related("lessons", "tasks", "projects")
        )
        flat = []
        for section in sections:
            for lsn in section.lessons.all().order_by("order"):
                flat.append((section, lsn))
        ids = [str(lsn.id) for _, lsn in flat]
        try:
            idx = ids.index(str(lesson.id))
        except ValueError:
            idx = -1
        prev_id = ids[idx - 1] if idx > 0 else None
        next_id = ids[idx + 1] if 0 <= idx < len(ids) - 1 else None

        # Progress + resume
        progress_status = "not_started"
        last_position = 0
        if enrollment:
            from apps.progress.models import LessonProgress

            lp = LessonProgress.objects.filter(enrollment=enrollment, lesson=lesson).first()
            if lp:
                progress_status = lp.status
                last_position = lp.last_position_seconds

        curriculum = []
        completed_ids = set()
        if enrollment:
            from apps.progress.models import LessonProgress

            completed_ids = {
                str(x)
                for x in LessonProgress.objects.filter(
                    enrollment=enrollment, status="completed"
                ).values_list("lesson_id", flat=True)
            }
        for section in sections:
            unlocked = section_unlocked(section)
            curriculum.append(
                {
                    "id": str(section.id),
                    "title": section.title,
                    "isLocked": not unlocked,
                    # Counted here so the sidebar can show "3 tasks" without a
                    # second round trip per section.
                    "taskCount": len(section.tasks.all()),
                    "lessons": [
                        {
                            "id": str(lsn.id),
                            "title": lsn.title,
                            "type": lsn.content_type,
                            "durationMinutes": lsn.duration_minutes,
                            "isPreviewable": lsn.is_previewable,
                            "locked": not (unlocked or lsn.is_previewable),
                            "completed": str(lsn.id) in completed_ids,
                        }
                        for lsn in section.lessons.all().order_by("order")
                    ],
                }
            )

        section = lesson.section
        payload = {
            "course": {"id": str(course.id), "title": course.title, "certificateEnabled": course.certificate_enabled},
            "isEnrolled": bool(enrollment),
            "canAccess": can_access,
            "lesson": {
                "id": str(lesson.id),
                "title": lesson.title,
                "type": lesson.content_type,
                "sectionTitle": section.title,
                "videoUrl": lesson.video_url if can_access else "",
                "embedUrl": build_embed_url(lesson.video_url) if can_access else "",
                "textContent": lesson.text_content if can_access else "",
                "resourceLinks": lesson.resource_links if can_access else [],
            },
            "progress": {"status": progress_status, "lastPositionSeconds": last_position},
            "sectionItems": {
                "assignments": [
                    {
                        "id": str(t.id),
                        "title": t.title,
                        "instructions": t.instructions,
                        "submissionType": t.submission_type,
                        "submissionUrl": t.submission_url if can_access else "",
                        "howToSubmit": t.how_to_submit,
                        "dueDate": t.due_date.isoformat() if t.due_date else None,
                    }
                    for t in section.tasks.all().order_by("order")
                ]
                if can_access
                else [],
                "projects": [
                    {
                        "id": str(p.id),
                        "title": p.title,
                        "description": p.description,
                        "requirements": p.requirements,
                        "deliverables": p.deliverables,
                        "submissionUrl": p.submission_url if can_access else "",
                        "howToSubmit": p.how_to_submit,
                    }
                    for p in section.projects.all().order_by("order")
                ]
                if can_access
                else [],
            },
            "curriculum": curriculum,
            "prevLessonId": prev_id,
            "nextLessonId": next_id,
        }
        return response.Response(payload)


class RecommendedCoursesView(APIView):
    permission_classes = [IsStudentUserRole]

    def get(self, request):
        from django.db.models import Count, Q

        from apps.platform.models import PlatformSettings

        # The Settings switch for this read nothing, on either side.
        if not PlatformSettings.get_solo().feature_recommendations_enabled:
            return response.Response([])

        student = request.user.student_profile
        tracks = student.selected_tracks or ([student.selected_track] if student.selected_track else [])
        published = (
            Course.objects.filter(status="published", visibility="visible")
            .select_related("teacher__user", "category", "subcategory")
            .prefetch_related("sections__lessons", "sections__tasks", "sections__projects", "tags")
            .annotate(
                published_lesson_count=Count(
                    "sections__lessons",
                    filter=Q(sections__lessons__is_published=True, sections__is_published=True),
                    distinct=True,
                )
            )
        )
        # Track-based recommendations first, then flagged ones, de-duplicated.
        track_courses = published.filter(subcategory__name__in=tracks) if tracks else published.none()
        flagged = published.filter(is_recommended=True)
        seen = set()
        ordered = []
        for course in list(track_courses) + list(flagged) + list(published):
            if course.id in seen:
                continue
            seen.add(course.id)
            ordered.append(course)
            if len(ordered) >= 12:
                break
        return response.Response(CourseSerializer(ordered, many=True, context={"request": request}).data)
