from django.db import transaction as db_transaction
from django.utils import timezone
from rest_framework import permissions, response, status, views

from common.permissions import IsAdminUserRole, IsStudentUserRole
from apps.enrollments.models import Enrollment
from apps.notifications.models import Notification

from .models import Payment, Transaction
from .serializers import PaymentInitializeSerializer, PaymentSerializer


class PaymentListView(views.APIView):
    permission_classes = [IsStudentUserRole]

    def get(self, request):
        payments = (
            Payment.objects.filter(student=request.user.student_profile)
            .select_related("course")
            .prefetch_related("transactions")
            .order_by("-created_at")
        )
        return response.Response(PaymentSerializer(payments, many=True).data)


class PaymentInitializeView(views.APIView):
    permission_classes = [IsStudentUserRole]

    def post(self, request):
        serializer = PaymentInitializeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        created = serializer.save()
        return response.Response(
            {
                "payment_id": created["payment"].id,
                "transaction_id": created["transaction"].id,
                "reference": created["transaction"].reference,
                "authorization_url": created["transaction"].authorization_url,
                "amount": created["payment"].amount,
                "currency": created["payment"].currency,
                "provider": created["payment"].payment_method,
                "status": created["payment"].status,
            },
            status=status.HTTP_201_CREATED,
        )


class PaymentVerifyView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        reference = request.data.get("reference")
        record = Transaction.objects.select_related("payment__course", "payment__student").filter(reference=reference).first()
        if not record:
            return response.Response({"detail": "Transaction not found."}, status=status.HTTP_404_NOT_FOUND)
        if request.user.role == "student" and record.payment.student.user_id != request.user.id:
            return response.Response({"detail": "You cannot verify this transaction."}, status=status.HTTP_403_FORBIDDEN)

        with db_transaction.atomic():
            if record.payment.status == "successful":
                return response.Response(
                    {
                        "payment_id": record.payment.id,
                        "reference": record.reference,
                        "status": record.payment.status,
                        "course_unlocked": True,
                    }
                )
            record.provider_status = "success"
            record.verified_at = timezone.now()
            record.save(update_fields=["provider_status", "verified_at", "updated_at"])

            payment = record.payment
            payment.status = "successful"
            payment.paid_at = timezone.now()
            payment.save(update_fields=["status", "paid_at", "updated_at"])

            Enrollment.objects.get_or_create(
                student=payment.student,
                course=payment.course,
                defaults={"access_source": "payment", "status": "active"},
            )
            Notification.objects.get_or_create(
                user=payment.student.user,
                title="Course unlocked",
                body=f"{payment.course.title} is now available in My Courses.",
                kind="payment",
            )

        return response.Response(
            {
                "payment_id": payment.id,
                "reference": record.reference,
                "status": payment.status,
                "course_unlocked": True,
            }
        )


class PaymentWebhookView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, provider):
        if provider not in {"paystack", "opay"}:
            return response.Response({"detail": "Unsupported provider."}, status=status.HTTP_400_BAD_REQUEST)
        return response.Response({"detail": f"{provider} webhook received."})


class AdminTransactionListView(views.APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        data = list(
            Transaction.objects.select_related("payment__course", "payment__student__user")
            .order_by("-created_at")
            .values("id", "provider", "reference", "provider_status", "amount", "currency", "verified_at")
        )
        return response.Response(data)
