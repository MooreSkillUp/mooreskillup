
from django.db import transaction as db_transaction
from rest_framework import serializers

from apps.courses.models import Course
from apps.enrollments.models import Enrollment

from . import paystack
from .models import Payment, Transaction


def effective_price(course, student=None):
    """The amount actually charged. See payments.pricing for the rules."""
    from .pricing import price_for

    return price_for(course, student)[0]


class PaymentSerializer(serializers.ModelSerializer):
    courseTitle = serializers.CharField(source="course.title", read_only=True)
    paymentMethod = serializers.CharField(source="payment_method", read_only=True)
    paidAt = serializers.DateTimeField(source="paid_at", read_only=True)
    reference = serializers.SerializerMethodField()
    # "pending" was shown forever on a checkout the student walked away from,
    # as if we were still waiting for their money.
    state = serializers.SerializerMethodField()
    refundedAt = serializers.DateTimeField(source="refunded_at", read_only=True)

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
            "state",
            "description",
            "paidAt",
            "refundedAt",
            "reference",
            "created_at",
        )

    def get_state(self, obj):
        from django.utils import timezone

        from .views import payment_state

        return payment_state(obj, timezone.now())

    def get_reference(self, obj):
        first_txn = obj.transactions.order_by("-created_at").first()
        return first_txn.reference if first_txn else None


class PaymentInitializeSerializer(serializers.Serializer):
    course_id = serializers.UUIDField()
    payment_method = serializers.ChoiceField(choices=Payment.METHOD_CHOICES)
    callback_url = serializers.URLField(required=False, allow_blank=True)

    def validate(self, attrs):
        from apps.platform.models import PlatformSettings

        # A switch for taking money at all, separate from whether Paystack is
        # configured — for an outage, or a price that went out wrong.
        if not PlatformSettings.get_solo().payments_enabled:
            raise serializers.ValidationError(
                {"detail": "Course purchases are paused right now. Please try again later."}
            )
        course = Course.objects.filter(id=attrs["course_id"], status="published", visibility="visible").first()
        if not course:
            raise serializers.ValidationError({"course_id": "Course not available for purchase."})
        from .pricing import price_for

        student = self.context["request"].user.student_profile
        if price_for(course, student)[0] <= 0:
            # Free on its own or through a 100% campaign: enrolment, not checkout.
            raise serializers.ValidationError({"course_id": "Free courses do not require payment."})
        if Enrollment.objects.with_access().filter(
            student=self.context["request"].user.student_profile, course=course
        ).exists():
            raise serializers.ValidationError({"course_id": "Course already unlocked."})
        attrs["course"] = course
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        student = request.user.student_profile
        course = validated_data["course"]
        from .pricing import price_for

        # Server-computed, for this student, at this moment. Never the client's.
        amount, campaign, list_price = price_for(course, student)
        reference = paystack.new_reference()
        callback_url = validated_data.get("callback_url") or ""

        # One unit: if Paystack refuses to start the checkout, no pending
        # payment is left behind looking like a student who walked away.
        with db_transaction.atomic():
            payment = Payment.objects.create(
                student=student,
                course=course,
                amount=amount,
                currency="NGN",
                payment_method="paystack",
                status="pending",
                description=f"{course.title} full course access",
                mode=paystack.mode(),
                list_price=list_price,
                discount_campaign=campaign,
            )
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
