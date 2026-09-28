"""Reading payouts and earning lines."""

from rest_framework import serializers

from .payout_models import EarningLine, Payout, PayoutAdjustment


class EarningLineSerializer(serializers.ModelSerializer):
    course = serializers.CharField(source="payment.course.title", read_only=True)
    paidAt = serializers.DateTimeField(source="payment.paid_at", read_only=True)
    processorFee = serializers.DecimalField(
        source="processor_fee", max_digits=12, decimal_places=2, read_only=True
    )
    sharePercent = serializers.DecimalField(
        source="share_percent", max_digits=5, decimal_places=2, read_only=True
    )
    qualifiesAt = serializers.DateTimeField(source="qualifies_at", read_only=True)

    class Meta:
        model = EarningLine
        fields = (
            "id",
            "course",
            "paidAt",
            "gross",
            "processorFee",
            "net",
            "sharePercent",
            "amount",
            "qualifiesAt",
            "period",
            "status",
        )


class AdjustmentSerializer(serializers.ModelSerializer):
    kindLabel = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = PayoutAdjustment
        fields = ("id", "kind", "kindLabel", "amount", "reason")


class PayoutSerializer(serializers.ModelSerializer):
    teacherId = serializers.PrimaryKeyRelatedField(source="teacher", read_only=True)
    teacherName = serializers.CharField(source="teacher.user.display_name", read_only=True)
    linesTotal = serializers.DecimalField(
        source="lines_total", max_digits=14, decimal_places=2, read_only=True
    )
    adjustmentsTotal = serializers.DecimalField(
        source="adjustments_total", max_digits=14, decimal_places=2, read_only=True
    )
    approvedBy = serializers.CharField(source="approved_by.display_name", read_only=True, default="")
    approvedAt = serializers.DateTimeField(source="approved_at", read_only=True)
    paidBy = serializers.CharField(source="paid_by.display_name", read_only=True, default="")
    paidAt = serializers.DateTimeField(source="paid_at", read_only=True)
    lines = EarningLineSerializer(many=True, read_only=True)
    adjustments = AdjustmentSerializer(many=True, read_only=True)
    bank = serializers.SerializerMethodField()

    class Meta:
        model = Payout
        fields = (
            "id",
            "teacherId",
            "teacherName",
            "period",
            "linesTotal",
            "adjustmentsTotal",
            "amount",
            "status",
            "approvedBy",
            "approvedAt",
            "paidBy",
            "paidAt",
            "reference",
            "note",
            "lines",
            "adjustments",
            "bank",
        )

    def get_bank(self, obj):
        """Enough to know whether this payout can go out, and never the number."""
        detail = getattr(obj.teacher, "payout_detail", None)
        if detail is None:
            return {"onFile": False, "verified": False, "masked": "", "bankName": ""}
        return {
            "onFile": detail.is_complete,
            "verified": detail.verified_at is not None,
            "masked": detail.masked_account_number,
            "bankName": detail.bank_name,
        }


class TeacherBankWriteSerializer(serializers.Serializer):
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
