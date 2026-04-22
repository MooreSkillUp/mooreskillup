import secrets

from rest_framework import serializers

from apps.courses.models import Course
from apps.enrollments.models import Enrollment

from .models import Payment, Transaction


class PaymentSerializer(serializers.ModelSerializer):
    courseTitle = serializers.CharField(source="course.title", read_only=True)
    paymentMethod = serializers.CharField(source="payment_method", read_only=True)
    paidAt = serializers.DateTimeField(source="paid_at", read_only=True)
    reference = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = (
            "id",
            "course",
            "courseTitle",
            "amount",
            "currency",
            "paymentMethod",
            "status",
            "description",
            "paidAt",
            "reference",
            "created_at",
        )

    def get_reference(self, obj):
        first_txn = obj.transactions.order_by("-created_at").first()
        return first_txn.reference if first_txn else None


class PaymentInitializeSerializer(serializers.Serializer):
    course_id = serializers.UUIDField()
    payment_method = serializers.ChoiceField(choices=Payment.METHOD_CHOICES)
    callback_url = serializers.URLField(required=False, allow_blank=True)

    def validate(self, attrs):
        course = Course.objects.filter(id=attrs["course_id"], status="published", visibility="visible").first()
        if not course:
            raise serializers.ValidationError({"course_id": "Course not available for purchase."})
        if course.price <= 0:
            raise serializers.ValidationError({"course_id": "Free courses do not require payment."})
        if Enrollment.objects.filter(student=self.context["request"].user.student_profile, course=course).exists():
            raise serializers.ValidationError({"course_id": "Course already unlocked."})
        attrs["course"] = course
        return attrs

    def create(self, validated_data):
        student = self.context["request"].user.student_profile
        course = validated_data["course"]
        provider = validated_data["payment_method"]
        payment = Payment.objects.create(
            student=student,
            course=course,
            amount=course.price,
            currency=course.currency,
            payment_method=provider,
            status="pending",
            description=f"{course.title} full course access",
        )
        reference = f"{provider[:4].upper()}-{secrets.token_hex(6).upper()}"
        transaction = Transaction.objects.create(
            payment=payment,
            provider=provider,
            reference=reference,
            amount=course.price,
            currency=course.currency,
            authorization_url=validated_data.get("callback_url", "") or f"https://mock-gateway.moreskillup.dev/{provider}/{reference}",
        )
        return {"payment": payment, "transaction": transaction}
