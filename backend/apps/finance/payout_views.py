"""Running a payout month, and a teacher seeing their own earnings.

Admin side: generate the drafts, look at what each figure is made of, approve,
then record the transfer made at the bank. Teacher side: what they have earned,
what is still inside its refund window, and when each course's 12 months ends.
"""

from django.utils import timezone
from rest_framework import permissions, response, status, views

from apps.accounts.models import TeacherProfile
from apps.organization.models import _mask_account
from apps.platform.audit import record_audit
from common.permissions import IsTeacherUserRole
from common.rbac import AdminAction, AdminActionsPerMethod

from .payout_models import (
    EarningLine,
    Payout,
    TeacherPayoutDetail,
    TeacherPayoutDetailChange,
)
from .payout_serializers import (
    EarningLineSerializer,
    PayoutSerializer,
    TeacherBankWriteSerializer,
)
from .payouts import approve, generate, mark_paid, owed_summary, record_earnings, settle_windows


class PayoutRunView(AdminActionsPerMethod, views.APIView):
    """GET the payouts for a month. POST builds them."""

    admin_actions = {
        "GET": ("payments:view",),
        "POST": ("payments:refund",),
    }

    def get(self, request):
        period = request.query_params.get("period") or timezone.now().strftime("%Y-%m")
        payouts = (
            Payout.objects.filter(period=period)
            .select_related("teacher__user", "teacher__payout_detail")
            .prefetch_related("lines__payment__course", "adjustments")
        )
        totals = {
            "owed": sum((p.amount for p in payouts if p.status == Payout.DRAFT), 0),
            "approved": sum((p.amount for p in payouts if p.status == Payout.APPROVED), 0),
            "paid": sum((p.amount for p in payouts if p.status == Payout.PAID), 0),
            "carried": sum((p.amount for p in payouts if p.status == Payout.CARRIED), 0),
        }
        return response.Response(
            {
                "period": period,
                "payouts": PayoutSerializer(payouts, many=True).data,
                "totals": {key: str(value) for key, value in totals.items()},
                "periods": sorted(
                    set(
                        EarningLine.objects.values_list("period", flat=True).distinct()
                    ),
                    reverse=True,
                ),
            }
        )

    def post(self, request):
        """Record any new earnings, settle windows, and build the drafts.

        Safe to press twice: a payment has at most one earning line, and a
        payout is unique per teacher per period.
        """
        period = request.data.get("period") or timezone.now().strftime("%Y-%m")
        created = record_earnings()
        settled = settle_windows()
        payouts = generate(period)
        record_audit(
            request,
            action="finance.payouts.generate",
            resource_type="payout_run",
            resource_name=period,
            changes={"lines": len(created), "payouts": len(payouts), **settled},
        )
        return response.Response(
            {
                "period": period,
                "newLines": len(created),
                "nowPayable": settled["payable"],
                "reversed": settled["reversed"],
                "payouts": len(payouts),
            }
        )


class PayoutActionView(AdminActionsPerMethod, views.APIView):
    """Approve a payout, or record the transfer that was made for it."""

    admin_actions = {"POST": ("payments:refund",)}

    def post(self, request, payout_id):
        payout = (
            Payout.objects.filter(id=payout_id)
            .select_related("teacher__user", "teacher__payout_detail")
            .first()
        )
        if payout is None:
            return response.Response(
                {"detail": "Payout not found."}, status=status.HTTP_404_NOT_FOUND
            )

        action = request.data.get("action")
        if action == "approve":
            payout, error = approve(payout, request.user)
        elif action == "pay":
            payout, error = mark_paid(payout, request.user, request.data.get("reference", ""))
        else:
            return response.Response(
                {"detail": "Say whether to approve or pay."}, status=status.HTTP_400_BAD_REQUEST
            )

        if error:
            return response.Response({"detail": error}, status=status.HTTP_400_BAD_REQUEST)

        record_audit(
            request,
            action=f"finance.payout.{action}",
            resource_type="payout",
            resource_id=str(payout.id),
            resource_name=f"{payout.teacher.user.display_name} {payout.period}",
            changes={"amount": str(payout.amount), "reference": payout.reference},
        )
        return response.Response(PayoutSerializer(payout).data)


class TeacherBankDetailsView(AdminActionsPerMethod, views.APIView):
    """The only way in or out for a teacher's full account number.

    Same shape as a team member's, and for the same reason: changing where
    money goes is the attack worth designing against, so a change is audited,
    masked and clears verification.
    """

    admin_actions = {
        "GET": ("team:bank-details",),
        "PUT": ("team:bank-details",),
        "POST": ("team:bank-details",),
    }

    def _teacher(self, teacher_id):
        return TeacherProfile.objects.filter(id=teacher_id).select_related("user").first()

    def get(self, request, teacher_id):
        teacher = self._teacher(teacher_id)
        if teacher is None:
            return response.Response(
                {"detail": "Teacher not found."}, status=status.HTTP_404_NOT_FOUND
            )
        detail = TeacherPayoutDetail.objects.filter(teacher=teacher).first()
        record_audit(
            request,
            action="teacher.bank-details.view",
            resource_type="teacher",
            resource_id=str(teacher.id),
            resource_name=teacher.user.display_name,
        )
        return response.Response(
            {
                "accountName": detail.account_name if detail else "",
                "bankName": detail.bank_name if detail else "",
                "accountNumber": detail.account_number if detail else "",
                "verifiedAt": detail.verified_at if detail else None,
                "changes": [
                    {
                        "field": change.field,
                        "from": change.old_value,
                        "to": change.new_value,
                        "at": change.created_at,
                        "by": change.changed_by.display_name if change.changed_by else "",
                    }
                    for change in teacher.payout_detail_changes.all()[:20]
                ],
            }
        )

    def put(self, request, teacher_id):
        teacher = self._teacher(teacher_id)
        if teacher is None:
            return response.Response(
                {"detail": "Teacher not found."}, status=status.HTTP_404_NOT_FOUND
            )
        serializer = TeacherBankWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        detail, _ = TeacherPayoutDetail.objects.get_or_create(teacher=teacher)

        changed = []
        fields = {
            "account_name": ("accountName", False),
            "bank_name": ("bankName", False),
            "account_number": ("accountNumber", True),
        }
        for attr, (key, sensitive) in fields.items():
            if key not in serializer.validated_data:
                continue
            new = serializer.validated_data[key]
            old = getattr(detail, attr)
            if new == old:
                continue
            TeacherPayoutDetailChange.objects.create(
                teacher=teacher,
                changed_by=request.user if request.user.is_authenticated else None,
                field=attr,
                old_value=_mask_account(old) if sensitive else old,
                new_value=_mask_account(new) if sensitive else new,
            )
            setattr(detail, attr, new)
            changed.append(attr)

        if changed:
            detail.verified_at = None
            detail.verified_by = None
            detail.save(
                update_fields=[*changed, "verified_at", "verified_by", "updated_at"]
            )
            record_audit(
                request,
                action="teacher.bank-details.change",
                resource_type="teacher",
                resource_id=str(teacher.id),
                resource_name=teacher.user.display_name,
                changes={"fields": changed},
            )
        return response.Response(
            {
                "changed": changed,
                "accountNumberMasked": detail.masked_account_number,
                "verifiedAt": detail.verified_at,
            }
        )

    def post(self, request, teacher_id):
        teacher = self._teacher(teacher_id)
        if teacher is None:
            return response.Response(
                {"detail": "Teacher not found."}, status=status.HTTP_404_NOT_FOUND
            )
        detail = TeacherPayoutDetail.objects.filter(teacher=teacher).first()
        if detail is None or not detail.is_complete:
            return response.Response(
                {"detail": "There are no bank details to verify."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        detail.verified_at = timezone.now()
        detail.verified_by = request.user
        detail.save(update_fields=["verified_at", "verified_by", "updated_at"])
        record_audit(
            request,
            action="teacher.bank-details.verify",
            resource_type="teacher",
            resource_id=str(teacher.id),
            resource_name=teacher.user.display_name,
        )
        return response.Response({"verifiedAt": detail.verified_at})


class MyEarningsView(views.APIView):
    """A teacher's own earnings. Their figures only, never anybody else's."""

    permission_classes = [permissions.IsAuthenticated, IsTeacherUserRole]

    def get(self, request):
        teacher = getattr(request.user, "teacher_profile", None)
        if teacher is None:
            return response.Response(
                {"detail": "No teacher profile."}, status=status.HTTP_404_NOT_FOUND
            )

        lines = (
            EarningLine.objects.filter(teacher=teacher)
            .select_related("payment__course", "term")
            .order_by("-qualifies_at")[:200]
        )
        payouts = Payout.objects.filter(teacher=teacher).order_by("-period")[:24]
        courses = [
            {
                "course": term.course.title,
                "sharePercent": str(term.share_percent),
                "startsAt": term.starts_at,
                "endsAt": term.ends_at,
                "isRunning": term.is_running,
            }
            for term in teacher.earning_terms.select_related("course")
        ]

        return response.Response(
            {
                "summary": {key: str(value) for key, value in owed_summary(teacher).items()},
                "courses": courses,
                "lines": EarningLineSerializer(lines, many=True).data,
                "payouts": [
                    {
                        "period": payout.period,
                        "amount": str(payout.amount),
                        "status": payout.status,
                        "paidAt": payout.paid_at,
                        "reference": payout.reference,
                    }
                    for payout in payouts
                ],
            }
        )


class CourseTermsNeedingReviewView(views.APIView):
    """How many courses published without recorded terms, for the dashboard."""

    permission_classes = [AdminAction("payments:view")]

    def get(self, request):
        from .models import CourseEarningTerm

        return response.Response(
            {"needsReview": CourseEarningTerm.objects.filter(needs_review=True).count()}
        )
