from django.db import transaction as db_transaction
from django.utils import timezone
from rest_framework import permissions, response, status, views

from common.permissions import IsStudentUserRole
from common.rbac import AdminAction
from apps.enrollments.models import Enrollment
from apps.notifications.models import Notification

from . import paystack
from .models import Payment, Transaction
from .serializers import PaymentInitializeSerializer, PaymentSerializer


def fulfill_payment(payment, transaction):
    """Mark a payment successful and grant access. Idempotent — safe to call from
    both the verify endpoint and the webhook."""
    with db_transaction.atomic():
        payment = Payment.objects.select_for_update().get(id=payment.id)
        if payment.status == "successful":
            return payment

        transaction.provider_status = "success"
        transaction.verified_at = timezone.now()
        transaction.save(update_fields=["provider_status", "verified_at", "updated_at"])

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

    _send_receipt_email(payment)
    return payment


def _send_receipt_email(payment):
    from common.email import frontend_url, send_transactional_email

    send_transactional_email(
        to_email=payment.student.user.email,
        subject=f"Payment receipt — {payment.course.title}",
        heading="Payment successful 🎉",
        greeting=f"Hi {payment.student.user.display_name},",
        intro=f"Thank you for your purchase. {payment.course.title} is now unlocked in your account.",
        details=[
            {"label": "Course", "value": payment.course.title},
            {"label": "Amount", "value": f"{payment.currency} {payment.amount:,.2f}"},
            {"label": "Reference", "value": payment.transactions.first().reference if payment.transactions.exists() else "—"},
        ],
        button_label="Start learning",
        button_url=frontend_url(f"/course/{payment.course_id}"),
        footer="Keep this email as your receipt.",
    )


def amount_matches(payment, amount_kobo):
    """Guard against tampering: the paid amount must equal what we charged."""
    if amount_kobo is None:  # simulation mode
        return True
    return int(payment.amount * 100) == int(amount_kobo)


def refund_eligibility(payment):
    """(eligible, reason) per the configurable refund policy:
    successful + within the window + under the progress cap."""
    from datetime import timedelta

    from apps.platform.models import PlatformSettings

    if payment.status != "successful":
        return False, "Only successful payments can be refunded."

    settings_row = PlatformSettings.get_solo()
    window_days = settings_row.refund_window_days
    max_progress = settings_row.refund_max_progress_percent

    paid_at = payment.paid_at or payment.created_at
    if window_days and paid_at and (timezone.now() - paid_at) > timedelta(days=window_days):
        return False, f"Refund window of {window_days} days has passed."

    enrollment = Enrollment.objects.select_related("course_progress").filter(
        student=payment.student, course=payment.course
    ).first()
    progress = getattr(enrollment, "course_progress", None) if enrollment else None
    if progress and progress.progress_percent >= max_progress:
        return False, f"Student has completed {progress.progress_percent}% (refunds capped at {max_progress}%)."

    return True, ""


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
        try:
            created = serializer.save()
        except paystack.PaystackError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return response.Response(
            {
                "payment_id": created["payment"].id,
                "reference": created["transaction"].reference,
                "authorization_url": created["transaction"].authorization_url,
                "amount": created["payment"].amount,
                "currency": created["payment"].currency,
                "provider": "paystack",
                "status": created["payment"].status,
                "live": paystack.is_live(),
            },
            status=status.HTTP_201_CREATED,
        )


class PaymentVerifyView(views.APIView):
    """Confirms a payment by asking Paystack directly — never trusts the client."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        reference = request.data.get("reference")
        record = (
            Transaction.objects.select_related("payment__course", "payment__student")
            .filter(reference=reference)
            .first()
        )
        if not record:
            return response.Response({"detail": "Transaction not found."}, status=status.HTTP_404_NOT_FOUND)
        if request.user.role == "student" and record.payment.student.user_id != request.user.id:
            return response.Response({"detail": "You cannot verify this transaction."}, status=status.HTTP_403_FORBIDDEN)

        payment = record.payment
        if payment.status == "successful":
            return self._ok(payment, record)

        result = paystack.verify_transaction(reference)
        if not result["success"]:
            return response.Response(
                {"reference": record.reference, "status": payment.status, "course_unlocked": False},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )
        if not amount_matches(payment, result["amount_kobo"]):
            payment.status = "failed"
            payment.save(update_fields=["status", "updated_at"])
            return response.Response(
                {"detail": "Payment amount mismatch. Please contact support."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        fulfill_payment(payment, record)
        return self._ok(payment, record)

    def _ok(self, payment, record):
        return response.Response(
            {
                "payment_id": payment.id,
                "reference": record.reference,
                "status": "successful",
                "course_unlocked": True,
                "courseId": str(payment.course_id),
            }
        )


class PaymentWebhookView(views.APIView):
    """Authoritative source of truth: Paystack POSTs charge.success here."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request, provider):
        if provider != "paystack":
            return response.Response({"detail": "Unsupported provider."}, status=status.HTTP_400_BAD_REQUEST)

        signature = request.headers.get("x-paystack-signature", "")
        if not paystack.verify_signature(request.body, signature):
            return response.Response({"detail": "Invalid signature."}, status=status.HTTP_401_UNAUTHORIZED)

        event = request.data.get("event")
        data = request.data.get("data") or {}
        reference = data.get("reference")

        if event == "charge.success" and reference:
            record = (
                Transaction.objects.select_related("payment__course", "payment__student")
                .filter(reference=reference)
                .first()
            )
            if record and amount_matches(record.payment, data.get("amount")):
                fulfill_payment(record.payment, record)

        # Always 200 so Paystack stops retrying.
        return response.Response({"detail": "ok"})


class AdminTransactionListView(views.APIView):
    permission_classes = [AdminAction("payments:view")]

    def get(self, request):
        transactions = (
            Transaction.objects.select_related(
                "payment__course", "payment__student__user", "payment__student"
            )
            .order_by("-created_at")
        )
        data = []
        for txn in transactions:
            payment = txn.payment
            eligible, reason = refund_eligibility(payment)
            data.append(
                {
                    "id": str(txn.id),
                    "provider": txn.provider,
                    "reference": txn.reference,
                    "provider_status": txn.provider_status,
                    "amount": str(txn.amount),
                    "currency": txn.currency,
                    "verified_at": txn.verified_at.isoformat() if txn.verified_at else None,
                    "created_at": txn.created_at.isoformat(),
                    "payment_id": str(payment.id),
                    "payment__status": payment.status,
                    "payment__course__title": payment.course.title,
                    "payment__student__user__display_name": payment.student.user.display_name,
                    "payment__student__user__email": payment.student.user.email,
                    "refundEligible": eligible,
                    "refundReason": reason,
                }
            )
        return response.Response(data)


class AdminTransactionExportView(views.APIView):
    permission_classes = [AdminAction("analytics:export")]

    def get(self, request):
        import csv

        from django.http import HttpResponse

        payments = Payment.objects.select_related("course", "student__user").order_by("-created_at")
        date_from = request.query_params.get("from", "").strip()
        date_to = request.query_params.get("to", "").strip()
        if date_from:
            payments = payments.filter(created_at__date__gte=date_from)
        if date_to:
            payments = payments.filter(created_at__date__lte=date_to)

        http_response = HttpResponse(content_type="text/csv")
        http_response["Content-Disposition"] = 'attachment; filename="revenue.csv"'
        writer = csv.writer(http_response)
        writer.writerow(["Date", "Student", "Course", "Amount", "Currency", "Status", "Paid at"])
        for payment in payments:
            writer.writerow(
                [
                    payment.created_at.isoformat(),
                    payment.student.user.display_name,
                    payment.course.title,
                    payment.amount,
                    payment.currency,
                    payment.status,
                    payment.paid_at.isoformat() if payment.paid_at else "",
                ]
            )
        return http_response


class AdminPaymentRefundView(views.APIView):
    permission_classes = [AdminAction("payments:refund")]

    def post(self, request, payment_id):
        from apps.platform.audit import record_audit

        payment = (
            Payment.objects.select_related("course", "student")
            .prefetch_related("transactions")
            .filter(id=payment_id)
            .first()
        )
        if not payment:
            return response.Response({"detail": "Payment not found."}, status=status.HTTP_404_NOT_FOUND)

        eligible, reason = refund_eligibility(payment)
        if not eligible:
            return response.Response({"detail": reason}, status=status.HTTP_400_BAD_REQUEST)

        refund_reason = (request.data.get("reason") or "").strip()
        if not refund_reason:
            return response.Response(
                {"detail": "A refund reason is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        transaction = payment.transactions.order_by("-created_at").first()
        result = paystack.create_refund(transaction.reference if transaction else "")
        if not result["success"]:
            return response.Response(
                {"detail": result.get("message") or "Refund failed at Paystack."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        payment.status = "refunded"
        payment.save(update_fields=["status", "updated_at"])
        # Revoke access so a refunded student loses the course.
        Enrollment.objects.filter(student=payment.student, course=payment.course).update(
            status="revoked", updated_at=timezone.now()
        )
        Notification.objects.create(
            user=payment.student.user,
            title="Payment refunded",
            body=f"Your payment for {payment.course.title} was refunded.",
            kind="payment",
        )
        record_audit(
            request,
            "payment.refund",
            resource_type="payment",
            resource_id=payment.id,
            resource_name=payment.course.title,
            metadata={"amount": str(payment.amount), "reason": refund_reason},
        )
        return response.Response({"detail": "Refund processed.", "status": "refunded"})
