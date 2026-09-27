"""Admin endpoints for the company structure.

Everything here is Super Admin territory except reading, which an Admin may do.
Bank details are narrower still: one endpoint returns a full account number, it
has its own permission, and it writes an audit row every time it is used.
"""

import csv

from django.db.models import Prefetch
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import response, status, views, viewsets

from apps.platform.audit import record_audit
from common.rbac import AdminAction, AdminActionsPerMethod, AdminActionsPerViewSetAction

from .models import Department, DepartmentMembership, TeamMember
from .serializers import (
    BankDetailsWriteSerializer,
    DepartmentSerializer,
    MembershipSerializer,
    TeamMemberSerializer,
)


class DepartmentViewSet(AdminActionsPerViewSetAction, viewsets.ModelViewSet):
    serializer_class = DepartmentSerializer
    # Eight departments and a dozen people: the admin screens want the whole
    # set, and a paginated org chart is a worse org chart.
    pagination_class = None
    admin_actions = {
        "list": ("departments:view",),
        "retrieve": ("departments:view",),
        "create": ("departments:manage",),
        "update": ("departments:manage",),
        "partial_update": ("departments:manage",),
        "destroy": ("departments:manage",),
    }

    def get_queryset(self):
        qs = (
            Department.objects.select_related("lead", "parent")
            .prefetch_related("children", "memberships")
            .all()
        )
        if self.request.query_params.get("topLevel") == "true":
            qs = qs.filter(parent__isnull=True)
        if self.request.query_params.get("active") == "true":
            qs = qs.filter(is_active=True)
        return qs

    def list(self, request, *args, **kwargs):
        res = super().list(request, *args, **kwargs)
        total = Department.pool_percent_total()
        # Surfaced rather than enforced: the Super Admin edits one department at
        # a time and would otherwise be blocked halfway through a change.
        res.data = {
            "results": res.data,
            "poolPercentTotal": str(total),
            "poolPercentBalanced": total == 100,
        }
        return res

    def perform_destroy(self, instance):
        record_audit(
            self.request,
            action="department.delete",
            resource_type="department",
            resource_id=str(instance.id),
            resource_name=instance.name,
        )
        super().perform_destroy(instance)


class TeamMemberViewSet(AdminActionsPerViewSetAction, viewsets.ModelViewSet):
    serializer_class = TeamMemberSerializer
    # Eight departments and a dozen people: the admin screens want the whole
    # set, and a paginated org chart is a worse org chart.
    pagination_class = None
    admin_actions = {
        "list": ("team:view",),
        "retrieve": ("team:view",),
        "create": ("team:manage",),
        "update": ("team:manage",),
        "partial_update": ("team:manage",),
        "destroy": ("team:manage",),
    }

    def get_queryset(self):
        qs = TeamMember.objects.prefetch_related(
            Prefetch(
                "memberships",
                queryset=DepartmentMembership.objects.filter(is_active=True).select_related(
                    "department"
                ),
            )
        ).all()
        department = self.request.query_params.get("department")
        if department:
            qs = qs.filter(memberships__department_id=department, memberships__is_active=True)
        member_status = self.request.query_params.get("status")
        if member_status:
            qs = qs.filter(status=member_status)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(full_name__icontains=search)
        return qs.distinct()


class MembershipViewSet(AdminActionsPerViewSetAction, viewsets.ModelViewSet):
    serializer_class = MembershipSerializer
    # Eight departments and a dozen people: the admin screens want the whole
    # set, and a paginated org chart is a worse org chart.
    pagination_class = None
    admin_actions = {
        "list": ("team:view",),
        "retrieve": ("team:view",),
        "create": ("team:manage",),
        "update": ("team:manage",),
        "partial_update": ("team:manage",),
        "destroy": ("team:manage",),
    }

    def get_queryset(self):
        qs = DepartmentMembership.objects.select_related("team_member", "department").all()
        department = self.request.query_params.get("department")
        if department:
            qs = qs.filter(department_id=department)
        return qs


class TeamMemberBankDetailsView(AdminActionsPerMethod, views.APIView):
    """The only way in or out for a full account number.

    A GET is recorded in the audit log as well as a write. Reading where
    somebody's money goes is worth knowing about — it is the step before
    changing it.
    """

    admin_actions = {
        "GET": ("team:bank-details",),
        "PUT": ("team:bank-details",),
        "POST": ("team:bank-details",),
    }

    def _member(self, member_id):
        return TeamMember.objects.filter(id=member_id).first()

    def get(self, request, member_id):
        member = self._member(member_id)
        if member is None:
            return response.Response(
                {"detail": "Team member not found."}, status=status.HTTP_404_NOT_FOUND
            )
        record_audit(
            request,
            action="team.bank-details.view",
            resource_type="team_member",
            resource_id=str(member.id),
            resource_name=member.full_name,
        )
        return response.Response(
            {
                "accountName": member.account_name,
                "bankName": member.bank_name,
                "accountNumber": member.account_number,
                "verifiedAt": member.bank_verified_at,
                "changes": [
                    {
                        "field": c.field,
                        "from": c.old_value,
                        "to": c.new_value,
                        "at": c.created_at,
                        "by": c.changed_by.display_name if c.changed_by else "",
                    }
                    for c in member.bank_changes.all()[:20]
                ],
            }
        )

    def put(self, request, member_id):
        member = self._member(member_id)
        if member is None:
            return response.Response(
                {"detail": "Team member not found."}, status=status.HTTP_404_NOT_FOUND
            )
        serializer = BankDetailsWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        changed = serializer.apply(member, request.user)
        if changed:
            record_audit(
                request,
                action="team.bank-details.change",
                resource_type="team_member",
                resource_id=str(member.id),
                resource_name=member.full_name,
                changes={"fields": changed},
            )
        return response.Response(
            {
                "changed": changed,
                "accountNumberMasked": member.masked_account_number,
                "verifiedAt": member.bank_verified_at,
            }
        )

    def post(self, request, member_id):
        """Mark the details on file as checked.

        Separate from saving them so that the person who enters an account
        number is not automatically the person who confirms it is right.
        """
        member = self._member(member_id)
        if member is None:
            return response.Response(
                {"detail": "Team member not found."}, status=status.HTTP_404_NOT_FOUND
            )
        if not member.has_bank_details:
            return response.Response(
                {"detail": "There are no bank details to verify."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        member.bank_verified_at = timezone.now()
        member.bank_verified_by = request.user
        member.save(update_fields=["bank_verified_at", "bank_verified_by", "updated_at"])
        record_audit(
            request,
            action="team.bank-details.verify",
            resource_type="team_member",
            resource_id=str(member.id),
            resource_name=member.full_name,
        )
        return response.Response({"verifiedAt": member.bank_verified_at})


class StructureExportView(views.APIView):
    """The whole structure as a CSV, to show the team what was agreed.

    Deliberately excludes account numbers. This file gets shared, and a
    spreadsheet of everyone's bank details forwarded in a WhatsApp group is a
    bad afternoon.
    """

    permission_classes = [AdminAction("team:export")]

    def get(self, request):
        res = HttpResponse(content_type="text/csv")
        stamp = timezone.now().strftime("%Y-%m-%d")
        res["Content-Disposition"] = f'attachment; filename="mooreskillup-structure-{stamp}.csv"'
        writer = csv.writer(res)
        writer.writerow(
            [
                "Department",
                "Parent",
                "Percent of pool",
                "Monthly cap",
                "Member",
                "Role",
                "Lead",
                "Share basis",
                "Share value",
                "Individual cap",
                "Status",
                "Agreement signed",
            ]
        )
        departments = (
            Department.objects.select_related("parent")
            .prefetch_related(
                Prefetch(
                    "memberships",
                    queryset=DepartmentMembership.objects.filter(is_active=True).select_related(
                        "team_member"
                    ),
                )
            )
            .order_by("order", "name")
        )
        for dept in departments:
            memberships = list(dept.memberships.all())
            if not memberships:
                writer.writerow(
                    [
                        dept.name,
                        dept.parent.name if dept.parent else "",
                        dept.percent_of_pool,
                        dept.monthly_cap if dept.monthly_cap is not None else "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                    ]
                )
                continue
            for m in memberships:
                writer.writerow(
                    [
                        dept.name,
                        dept.parent.name if dept.parent else "",
                        dept.percent_of_pool,
                        dept.monthly_cap if dept.monthly_cap is not None else "",
                        m.team_member.full_name,
                        m.team_member.role_title,
                        "yes" if m.is_lead else "",
                        m.get_share_basis_display(),
                        m.share_value,
                        m.monthly_cap if m.monthly_cap is not None else "",
                        m.team_member.status,
                        m.team_member.agreement_signed_on or "",
                    ]
                )
        record_audit(request, action="team.structure.export", resource_type="organization")
        return res
