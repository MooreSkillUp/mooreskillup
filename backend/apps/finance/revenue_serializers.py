"""Reading the costs, the policy and a closed month."""

from rest_framework import serializers

from .revenue_models import CostEntry, DepartmentAllocation, RevenuePeriod, SplitPolicy


class CostEntrySerializer(serializers.ModelSerializer):
    departmentId = serializers.PrimaryKeyRelatedField(
        source="department", queryset=CostEntry._meta.get_field("department").related_model.objects.all()
    )
    departmentName = serializers.CharField(source="department.name", read_only=True)
    enteredBy = serializers.CharField(source="entered_by.display_name", read_only=True, default="")

    class Meta:
        model = CostEntry
        fields = (
            "id",
            "month",
            "departmentId",
            "departmentName",
            "category",
            "amount",
            "vendor",
            "note",
            "enteredBy",
        )

    def validate_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("A cost cannot be negative.")
        return value


class SplitPolicySerializer(serializers.ModelSerializer):
    operationsPercent = serializers.DecimalField(
        source="operations_percent", max_digits=5, decimal_places=2, required=False
    )
    foundingTeacherPercent = serializers.DecimalField(
        source="founding_teacher_percent", max_digits=5, decimal_places=2, required=False
    )
    standardTeacherPercent = serializers.DecimalField(
        source="standard_teacher_percent", max_digits=5, decimal_places=2, required=False
    )
    targetReservePercent = serializers.DecimalField(
        source="target_reserve_percent", max_digits=5, decimal_places=2, required=False
    )
    effectiveFrom = serializers.DateField(source="effective_from")

    class Meta:
        model = SplitPolicy
        fields = (
            "id",
            "operationsPercent",
            "foundingTeacherPercent",
            "standardTeacherPercent",
            "targetReservePercent",
            "effectiveFrom",
            "note",
        )


class AllocationSerializer(serializers.ModelSerializer):
    departmentId = serializers.PrimaryKeyRelatedField(source="department", read_only=True)
    department = serializers.CharField(source="department.name", read_only=True)
    isCostFloor = serializers.BooleanField(source="department.is_cost_floor", read_only=True)
    percentUsed = serializers.DecimalField(
        source="percent_used", max_digits=5, decimal_places=2, read_only=True
    )
    capApplied = serializers.DecimalField(
        source="cap_applied", max_digits=14, decimal_places=2, read_only=True
    )
    costTotal = serializers.DecimalField(
        source="cost_total", max_digits=14, decimal_places=2, read_only=True
    )
    reserveDraw = serializers.DecimalField(
        source="reserve_draw", max_digits=14, decimal_places=2, read_only=True
    )
    excessReturned = serializers.DecimalField(
        source="excess_returned", max_digits=14, decimal_places=2, read_only=True
    )

    class Meta:
        model = DepartmentAllocation
        fields = (
            "departmentId",
            "department",
            "isCostFloor",
            "percentUsed",
            "calculated",
            "capApplied",
            "costTotal",
            "actual",
            "reserveDraw",
            "excessReturned",
        )


class RevenuePeriodSerializer(serializers.ModelSerializer):
    processorFees = serializers.DecimalField(
        source="processor_fees", max_digits=14, decimal_places=2, read_only=True
    )
    netRevenue = serializers.DecimalField(
        source="net_revenue", max_digits=14, decimal_places=2, read_only=True
    )
    teacherTotal = serializers.DecimalField(
        source="teacher_total", max_digits=14, decimal_places=2, read_only=True
    )
    operationsPool = serializers.DecimalField(
        source="operations_pool", max_digits=14, decimal_places=2, read_only=True
    )
    reserveAmount = serializers.DecimalField(
        source="reserve_amount", max_digits=14, decimal_places=2, read_only=True
    )
    saleCount = serializers.IntegerField(source="sale_count", read_only=True)
    salesMissingFee = serializers.IntegerField(source="sales_missing_fee", read_only=True)
    operationsPercentUsed = serializers.DecimalField(
        source="operations_percent_used", max_digits=5, decimal_places=2, read_only=True
    )
    closedBy = serializers.CharField(source="closed_by.display_name", read_only=True, default="")
    closedAt = serializers.DateTimeField(source="closed_at", read_only=True)
    allocations = AllocationSerializer(many=True, read_only=True)

    class Meta:
        model = RevenuePeriod
        fields = (
            "id",
            "month",
            "status",
            "gross",
            "processorFees",
            "netRevenue",
            "teacherTotal",
            "operationsPool",
            "reserveAmount",
            "saleCount",
            "salesMissingFee",
            "operationsPercentUsed",
            "closedBy",
            "closedAt",
            "allocations",
        )
