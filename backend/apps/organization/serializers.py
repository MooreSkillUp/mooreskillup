"""Serializers for the company structure.

Bank details are the reason this file is careful. The list and detail
representations carry only a masked account number; the full value comes back
from one endpoint, gated on its own permission, and every write records what
changed.
"""

from decimal import Decimal

from rest_framework import serializers

from .models import Department, DepartmentMembership, TeamMember, _mask_account


class MembershipSerializer(serializers.ModelSerializer):
    teamMemberId = serializers.PrimaryKeyRelatedField(
        source="team_member", queryset=TeamMember.objects.all()
    )
    departmentId = serializers.PrimaryKeyRelatedField(
        source="department", queryset=Department.objects.all()
    )
    memberName = serializers.CharField(source="team_member.full_name", read_only=True)
    departmentName = serializers.CharField(source="department.name", read_only=True)
    isLead = serializers.BooleanField(source="is_lead", required=False)
    shareBasis = serializers.ChoiceField(
        source="share_basis", choices=DepartmentMembership.BASIS_CHOICES, required=False
    )
    shareValue = serializers.DecimalField(
        source="share_value", max_digits=12, decimal_places=2, required=False
    )
    monthlyCap = serializers.DecimalField(
        source="monthly_cap", max_digits=12, decimal_places=2, required=False, allow_null=True
    )
    isActive = serializers.BooleanField(source="is_active", required=False)

    class Meta:
        model = DepartmentMembership
        fields = (
            "id",
            "teamMemberId",
            "departmentId",
            "memberName",
            "departmentName",
            "isLead",
            "shareBasis",
            "shareValue",
            "monthlyCap",
            "isActive",
            "note",
        )

    def validate(self, attrs):
        basis = attrs.get("share_basis", getattr(self.instance, "share_basis", "none"))
        value = attrs.get("share_value", getattr(self.instance, "share_value", Decimal("0")))
        if basis == "percent_of_department" and not (Decimal("0") <= value <= Decimal("100")):
            raise serializers.ValidationError(
                {"shareValue": "A percentage of the department must be between 0 and 100."}
            )
        if basis == "none" and value and value > 0:
            # Not an error worth blocking a save for, but the value would be
            # ignored, and a number that does nothing is a number someone will
            # later believe in.
            attrs["share_value"] = Decimal("0.00")
        return attrs


class DepartmentSerializer(serializers.ModelSerializer):
    percentOfPool = serializers.DecimalField(
        source="percent_of_pool", max_digits=5, decimal_places=2, required=False
    )
    monthlyCap = serializers.DecimalField(
        source="monthly_cap", max_digits=12, decimal_places=2, required=False, allow_null=True
    )
    isCostFloor = serializers.BooleanField(source="is_cost_floor", required=False)
    isActive = serializers.BooleanField(source="is_active", required=False)
    parentId = serializers.PrimaryKeyRelatedField(
        source="parent",
        queryset=Department.objects.all(),
        required=False,
        allow_null=True,
    )
    leadId = serializers.PrimaryKeyRelatedField(
        source="lead", queryset=TeamMember.objects.all(), required=False, allow_null=True
    )
    leadName = serializers.CharField(source="lead.full_name", read_only=True, default="")
    isSubDepartment = serializers.BooleanField(source="is_sub_department", read_only=True)
    memberCount = serializers.SerializerMethodField()
    children = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = (
            "id",
            "name",
            "slug",
            "parentId",
            "percentOfPool",
            "monthlyCap",
            "isCostFloor",
            "leadId",
            "leadName",
            "remit",
            "isActive",
            "order",
            "isSubDepartment",
            "memberCount",
            "children",
        )
        read_only_fields = ("slug",)

    def get_memberCount(self, obj):
        return obj.memberships.filter(is_active=True).count()

    def get_children(self, obj):
        if obj.parent_id is not None:
            return []
        return [
            {"id": str(child.id), "name": child.name, "memberCount": child.memberships.filter(is_active=True).count()}
            for child in obj.children.all().order_by("order", "name")
        ]

    def validate_parentId(self, value):
        if value is None:
            return value
        if self.instance is not None and value.id == self.instance.id:
            raise serializers.ValidationError("A department cannot be its own parent.")
        if value.parent_id is not None:
            # One level of nesting. Deeper trees make the allocation question
            # ("out of whose money?") ambiguous, and nobody needs it.
            raise serializers.ValidationError(
                "A sub-department cannot itself hold sub-departments."
            )
        return value


class TeamMemberSerializer(serializers.ModelSerializer):
    fullName = serializers.CharField(source="full_name")
    roleTitle = serializers.CharField(source="role_title", required=False, allow_blank=True)
    joinedOn = serializers.DateField(source="joined_on", required=False, allow_null=True)
    leftOn = serializers.DateField(source="left_on", required=False, allow_null=True)
    agreementVersion = serializers.CharField(
        source="agreement_version", required=False, allow_blank=True
    )
    agreementSignedOn = serializers.DateField(
        source="agreement_signed_on", required=False, allow_null=True
    )
    userId = serializers.PrimaryKeyRelatedField(
        source="user", read_only=True, allow_null=True
    )
    accountName = serializers.CharField(source="account_name", required=False, allow_blank=True)
    bankName = serializers.CharField(source="bank_name", required=False, allow_blank=True)
    # Never the real number. The one endpoint allowed to reveal it says so in
    # its own name.
    accountNumberMasked = serializers.CharField(source="masked_account_number", read_only=True)
    hasBankDetails = serializers.BooleanField(source="has_bank_details", read_only=True)
    bankVerifiedAt = serializers.DateTimeField(source="bank_verified_at", read_only=True)
    isLead = serializers.BooleanField(source="is_lead", read_only=True)
    departments = serializers.SerializerMethodField()

    class Meta:
        model = TeamMember
        fields = (
            "id",
            "fullName",
            "email",
            "phone",
            "userId",
            "roleTitle",
            "status",
            "joinedOn",
            "leftOn",
            "agreementVersion",
            "agreementSignedOn",
            "notes",
            "accountName",
            "bankName",
            "accountNumberMasked",
            "hasBankDetails",
            "bankVerifiedAt",
            "isLead",
            "departments",
        )

    def get_departments(self, obj):
        return [
            {
                "id": str(m.department_id),
                "name": m.department.name,
                "isLead": m.is_lead,
                "shareBasis": m.share_basis,
                "shareValue": str(m.share_value),
                "monthlyCap": str(m.monthly_cap) if m.monthly_cap is not None else None,
            }
            for m in obj.memberships.filter(is_active=True).select_related("department")
        ]


class BankDetailsWriteSerializer(serializers.Serializer):
    """Writing bank details, separately from everything else about a person.

    Kept apart from TeamMemberSerializer on purpose: an ordinary edit to
    someone's phone number should not be able to move where their money goes,
    and the audit trail only makes sense if there is one way in.
    """

    accountName = serializers.CharField(max_length=160, allow_blank=True, required=False)
    bankName = serializers.CharField(max_length=120, allow_blank=True, required=False)
    accountNumber = serializers.CharField(max_length=40, allow_blank=True, required=False)

    def validate_accountNumber(self, value):
        digits = "".join(ch for ch in value if ch.isdigit())
        if value and len(digits) < 10:
            raise serializers.ValidationError(
                "A Nigerian account number is 10 digits. Check it before saving."
            )
        return digits or ""

    def apply(self, member, user):
        """Save the change, record it, and clear verification.

        Verification is cleared rather than kept because the whole point of
        verifying is that somebody looked at these exact digits. New digits have
        not been looked at.
        """
        from .models import TeamMemberBankChange

        data = self.validated_data
        fields = {
            "account_name": ("accountName", False),
            "bank_name": ("bankName", False),
            "account_number": ("accountNumber", True),
        }
        changed = []
        for attr, (key, sensitive) in fields.items():
            if key not in data:
                continue
            new = data[key]
            old = getattr(member, attr)
            if new == old:
                continue
            TeamMemberBankChange.objects.create(
                team_member=member,
                changed_by=user if getattr(user, "is_authenticated", False) else None,
                field=attr,
                old_value=_mask_account(old) if sensitive else old,
                new_value=_mask_account(new) if sensitive else new,
            )
            setattr(member, attr, new)
            changed.append(attr)

        if changed:
            member.bank_verified_at = None
            member.bank_verified_by = None
            member.save(update_fields=[*changed, "bank_verified_at", "bank_verified_by", "updated_at"])
        return changed
