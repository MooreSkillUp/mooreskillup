"""Admin endpoints for what a teacher signed, and what their courses earn."""

from rest_framework import response, status, views

from apps.accounts.models import TeacherProfile
from apps.platform.audit import record_audit
from common.rbac import AdminAction, AdminActionsPerMethod

from .models import STANDARD, CourseEarningTerm, TeacherTerms
from .serializers import CourseEarningTermSerializer, TeacherTermsSerializer


class TeacherTermsView(AdminActionsPerMethod, views.APIView):
    """The agreement on one teacher's record.

    A GET always returns something: a teacher with nothing recorded gets the
    standard defaults, unsaved, so the admin screen has figures to show and to
    correct rather than an empty form.
    """

    admin_actions = {
        "GET": ("teachers:view",),
        "PUT": ("teachers:edit",),
    }

    def _teacher(self, teacher_id):
        return TeacherProfile.objects.filter(id=teacher_id).select_related("user").first()

    def get(self, request, teacher_id):
        teacher = self._teacher(teacher_id)
        if teacher is None:
            return response.Response(
                {"detail": "Teacher not found."}, status=status.HTTP_404_NOT_FOUND
            )
        terms = TeacherTerms.objects.filter(teacher=teacher).first()
        recorded = terms is not None
        if terms is None:
            # Unsaved, purely so the screen has figures to show and correct.
            # Its pk is not a useful test of that: a UUID primary key is set
            # when the instance is built, long before anything is written.
            terms = TeacherTerms(teacher=teacher, **TeacherTerms.defaults_for(STANDARD))
        earning = CourseEarningTerm.objects.filter(teacher=teacher).select_related("course")
        return response.Response(
            {
                "recorded": recorded,
                "terms": TeacherTermsSerializer(terms).data,
                "courses": CourseEarningTermSerializer(earning, many=True).data,
            }
        )

    def put(self, request, teacher_id):
        teacher = self._teacher(teacher_id)
        if teacher is None:
            return response.Response(
                {"detail": "Teacher not found."}, status=status.HTTP_404_NOT_FOUND
            )
        terms = TeacherTerms.objects.filter(teacher=teacher).first()
        serializer = TeacherTermsSerializer(terms, data=request.data, partial=terms is not None)
        serializer.is_valid(raise_exception=True)
        saved = serializer.save(teacher=teacher)
        record_audit(
            request,
            action="teacher.terms.set",
            resource_type="teacher",
            resource_id=str(teacher.id),
            resource_name=teacher.user.display_name,
            changes={
                "agreement_type": saved.agreement_type,
                "premium": str(saved.premium_share_percent),
                "premium_courses": saved.premium_course_count,
                "standard": str(saved.standard_share_percent),
            },
        )
        return response.Response(TeacherTermsSerializer(saved).data)


class CourseEarningTermListView(views.APIView):
    """Every course's recorded terms, so the ones needing a look can be found.

    Courses published before anyone recorded what their teacher signed were
    given the standard rate and flagged. They have to be confirmed before the
    first payout, which is why they are filterable.
    """

    permission_classes = [AdminAction("payments:view")]

    def get(self, request):
        terms = CourseEarningTerm.objects.select_related("course", "teacher__user")
        if request.query_params.get("needsReview") == "true":
            terms = terms.filter(needs_review=True)
        teacher = request.query_params.get("teacher")
        if teacher:
            terms = terms.filter(teacher_id=teacher)
        return response.Response(
            {
                "results": CourseEarningTermSerializer(terms, many=True).data,
                "needsReview": CourseEarningTerm.objects.filter(needs_review=True).count(),
            }
        )
