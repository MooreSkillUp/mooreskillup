from decimal import Decimal

from rest_framework import serializers

from apps.courses.models import Course
from apps.enrollments.models import Enrollment

from . import paystack
from .models import Payment, Transaction


def effective_price(course):
    """The amount actually charged: discount price when it's lower, else price."""
    if course.discount_price is not None and 0 < course.discount_price < course.price:
        return course.discount_price
    return course.price


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
        request = self.context["request"]
        student = request.user.student_profile
        course = validated_data["course"]
        amount = effective_price(course)  # server-computed; never trust the client
        reference = paystack.new_reference()

        payment = Payment.objects.create(
            student=student,
            course=course,
            amount=amount,
            currency="NGN",
            payment_method="paystack",
            status="pending",
            description=f"{course.title} full course access",
        )
        callback_url = validated_data.get("callback_url") or ""

        init = paystack.initialize_transaction(
            email=request.user.email,
            amount_kobo=int(amount * 100),
            reference=reference,
            callback_url=callback_url,
            metadata={"course_id": str(course.id), "student_id": str(student.id), "payment_id": str(payment.id)},
        )

        transaction = Transaction.objects.create(
            payment=payment,
            provider="paystack",
            reference=init["reference"],
            amount=amount,
            currency="NGN",
            authorization_url=init["authorization_url"],
        )
        return {"payment": payment, "transaction": transaction}
