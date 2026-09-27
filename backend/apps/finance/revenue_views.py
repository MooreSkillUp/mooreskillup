"""The Revenue Split, and the costs that feed it.

An open month is recomputed on every read, so the screen shows a live picture.
Closing a month freezes it, and nothing here will touch it again.
"""

from datetime import date, datetime

from rest_framework import response, status, views, viewsets

from apps.platform.audit import record_audit
from common.rbac import AdminAction, AdminActionsPerMethod, AdminActionsPerViewSetAction

from .revenue_models import CostEntry, RevenuePeriod, SplitPolicy
from .revenue_serializers import (
    CostEntrySerializer,
    RevenuePeriodSerializer,
    SplitPolicySerializer,
)
from .split import (
    compute,
    month_start,
    months_with_activity,
    save_period,
    teacher_breakdown,
    unearned_reasons,
)


def parse_month(value):
    """Accept 2026-11 or 2026-11-01. Anything else is not a month."""
    if not value:
        return month_start(date.today())
    for pattern in ("%Y-%m", "%Y-%m-%d"):
        try:
            return month_start(datetime.strptime(value, pattern).date())
        except ValueError:
            continue
    return None


def split_payload(first_of_month, period=None):
    """One month, whether it is live or frozen.

    A closed month is read back from what was stored; an open one is worked out
    afresh. The screen cannot tell the difference except by the status, which
    is the point.
    """
    if period is not None and period.is_closed:
        return {
            "month": first_of_month.strftime("%Y-%m"),
            "status": period.status,
            "live": False,
            **RevenuePeriodSerializer(period).data,
        }

    result = compute(first_of_month)
    return {
        "month": first_of_month.strftime("%Y-%m"),
        "status": period.status if period else RevenuePeriod.OPEN,
        "live": True,
        "gross": str(result["gross"]),
        "processorFees": str(result["processor_fees"]),
        "netRevenue": str(result["net_revenue"]),
        "teacherTotal": str(result["teacher_total"]),
        "operationsPool": str(result["operations_pool"]),
        "reserveAmount": str(result["reserve_amount"]),
        "saleCount": result["sale_count"],
        "salesMissingFee": result["sales_missing_fee"],
        "operationsPercentUsed": str(result["operations_percent_used"]),
        "allocations": [
            {
                "departmentId": str(row["department"].id),
                "department": row["department"].name,
                "isCostFloor": row["department"].is_cost_floor,
                "percentUsed": str(row["percent_used"]),
                "calculated": str(row["calculated"]),
                "capApplied": str(row["cap_applied"]) if row["cap_applied"] is not None else None,
                "costTotal": str(row["cost_total"]),
                "actual": str(row["actual"]),
                "reserveDraw": str(row["reserve_draw"]),
                "excessReturned": str(row["excess_returned"]),
            }
            for row in result["allocations"]
        ],
    }


class RevenueSplitView(AdminActionsPerMethod, views.APIView):
    """GET a month's split. POST closes it."""

    admin_actions = {
        "GET": ("payments:view",),
        "POST": ("payments:refund",),
    }

    def get(self, request):
        first = parse_month(request.query_params.get("month"))
        if first is None:
            return response.Response(
                {"detail": "Give a month as 2026-11."}, status=status.HTTP_400_BAD_REQUEST
            )
        period = RevenuePeriod.objects.filter(month=first).first()
        payload = split_payload(first, period)
        payload["months"] = [m.strftime("%Y-%m") for m in months_with_activity()]
        payload["teachers"] = [
            {
                "teacherId": str(row["teacher"].id) if row["teacher"] else None,
                "name": row["teacher"].user.display_name if row["teacher"] else "",
                "total": str(row["total"]),
                "sales": [
                    {
                        "course": item["course"].title,
                        "paidAt": item["payment"].paid_at,
                        "amount": str(item["payment"].amount),
                        "fee": str(item["payment"].processor_fee or 0),
                        "sharePercent": str(item["share_percent"]),
                        "earned": str(item["amount"]),
                    }
                    for item in row["sales"]
                ],
            }
            for row in teacher_breakdown(first)
        ]
        payload["unearned"] = [
            {
                "course": payment.course.title,
                "paidAt": payment.paid_at,
                "amount": str(payment.amount),
                "reason": reason,
            }
            for payment, reason in unearned_reasons(first)
        ]
        return response.Response(payload)

    def post(self, request):
        """Close a month. Deliberately hard to undo — there is no reopen."""
        first = parse_month(request.data.get("month"))
        if first is None:
            return response.Response(
                {"detail": "Give a month as 2026-11."}, status=status.HTTP_400_BAD_REQUEST
            )
        existing = RevenuePeriod.objects.filter(month=first).first()
        if existing is not None and existing.is_closed:
            return response.Response(
                {"detail": f"{first:%B %Y} is already closed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        period, _ = save_period(first, close=True, user=request.user)
        record_audit(
            request,
            action="finance.period.close",
            resource_type="revenue_period",
            resource_id=str(period.id),
            resource_name=f"{first:%B %Y}",
            changes={
                "net": str(period.net_revenue),
                "teachers": str(period.teacher_total),
                "pool": str(period.operations_pool),
                "reserve": str(period.reserve_amount),
            },
        )
        return response.Response(RevenuePeriodSerializer(period).data)


class CostEntryViewSet(AdminActionsPerViewSetAction, viewsets.ModelViewSet):
    serializer_class = CostEntrySerializer
    pagination_class = None
    admin_actions = {
        "list": ("payments:view",),
        "retrieve": ("payments:view",),
        "create": ("campaigns:manage",),
        "update": ("campaigns:manage",),
        "partial_update": ("campaigns:manage",),
        "destroy": ("campaigns:manage",),
    }

    def get_queryset(self):
        entries = CostEntry.objects.select_related("department").all()
        first = parse_month(self.request.query_params.get("month"))
        if self.request.query_params.get("month") and first is not None:
            entries = entries.filter(month=first)
        return entries

    def perform_create(self, serializer):
        self._guard_closed(serializer.validated_data.get("month"))
        serializer.save(entered_by=self.request.user)

    def perform_update(self, serializer):
        self._guard_closed(serializer.validated_data.get("month", serializer.instance.month))
        serializer.save()

    def perform_destroy(self, instance):
        self._guard_closed(instance.month)
        super().perform_destroy(instance)

    def _guard_closed(self, month):
        """A closed month's figures are what somebody has been shown. Adding a
        cost to it afterwards would quietly change them."""
        from rest_framework.exceptions import ValidationError

        if month and RevenuePeriod.objects.filter(month=month, status=RevenuePeriod.CLOSED).exists():
            raise ValidationError(
                {"month": f"{month:%B %Y} is closed. Record this against the current month instead."}
            )


class SplitPolicyViewSet(AdminActionsPerViewSetAction, viewsets.ModelViewSet):
    serializer_class = SplitPolicySerializer
    pagination_class = None
    queryset = SplitPolicy.objects.all()
    admin_actions = {
        "list": ("payments:view",),
        "retrieve": ("payments:view",),
        "create": ("payments:refund",),
        "update": ("payments:refund",),
        "partial_update": ("payments:refund",),
        "destroy": ("payments:refund",),
    }

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class RevenuePeriodListView(views.APIView):
    """Every month that has been written, newest first."""

    permission_classes = [AdminAction("payments:view")]

    def get(self, request):
        periods = RevenuePeriod.objects.all().prefetch_related("allocations__department")
        return response.Response(RevenuePeriodSerializer(periods, many=True).data)
