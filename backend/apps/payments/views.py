from datetime import timedelta

from django.db import transaction as db_transaction
from django.utils import timezone
from rest_framework import permissions, response, status, views

from apps.enrollments.models import Enrollment
from apps.notifications.models import Notification
from apps.platform.audit import record_audit
from common.permissions import IsStudentUserRole
from common.rbac import AdminAction, AdminActionsPerMethod

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

        # update_or_create, not get_or_create: after a refund the revoked
        # enrolment is still there, and buying again has to reopen it.
        enrollment = Enrollment.objects.filter(student=payment.student, course=payment.course).first()
        if enrollment is None:
            Enrollment.objects.create(
                student=payment.student, course=payment.course, access_source="payment", status="active"
            )
        elif enrollment.status == "revoked":
            enrollment.status = "active"
            enrollment.access_source = "payment"
            enrollment.save(update_fields=["status", "access_source", "updated_at"])
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
        from .pricing import purchase_refusal

        refusal = purchase_refusal(getattr(request.user, "student_profile", None))
        if refusal:
            return response.Response({"detail": refusal}, status=status.HTTP_403_FORBIDDEN)

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


# A checkout left pending this long was walked away from. Paystack can still
# confirm a late payment, which fulfils it as normal; until then it is not a
# payment anyone is waiting on.
ABANDONED_AFTER = timedelta(hours=24)


def payment_state(payment, now):
    if payment.status == "successful":
        return "paid"
    if payment.status == "pending":
        return "abandoned" if now - payment.created_at > ABANDONED_AFTER else "awaiting"
    return payment.status


class AdminTransactionListView(views.APIView):
    """One row per purchase, saying what actually happened to it.

    This listed Paystack transactions, so a student who opened checkout twice
    appeared as two purchases. It also ran the refund policy per row, a query
    each, and could not say whether a payment was real money.
    """

    permission_classes = [AdminAction("payments:view")]

    def get(self, request):
        from django.db.models import Prefetch

        from apps.platform.models import PlatformSettings

        payments = list(
            Payment.objects.select_related("course", "student__user", "refunded_by")
            .prefetch_related(
                Prefetch("transactions", queryset=Transaction.objects.order_by("-created_at"))
            )
            .order_by("-created_at")
        )
        paid = [payment for payment in payments if payment.status == "successful"]
        progress = {
            (student_id, course_id): percent
            for student_id, course_id, percent in Enrollment.objects.filter(
                student_id__in={payment.student_id for payment in paid},
                course_id__in={payment.course_id for payment in paid},
            ).values_list("student_id", "course_id", "course_progress__progress_percent")
        }
        policy = PlatformSettings.get_solo()
        now = timezone.now()

        rows = []
        for payment in payments:
            transactions = list(payment.transactions.all())
            row = {
                "paymentId": str(payment.id),
                "reference": transactions[0].reference if transactions else None,
                "mode": payment.mode,
                "state": payment_state(payment, now),
                "amount": str(payment.amount),
                "currency": payment.currency,
                "createdAt": payment.created_at.isoformat(),
                "paidAt": payment.paid_at.isoformat() if payment.paid_at else None,
                "course": {"id": str(payment.course_id), "title": payment.course.title},
                "student": {
                    "id": str(payment.student_id),
                    "name": payment.student.user.display_name,
                    "email": payment.student.user.email,
                },
                "refund": None,
                "refundedAt": payment.refunded_at.isoformat() if payment.refunded_at else None,
                "refundedByName": payment.refunded_by.display_name if payment.refunded_by else None,
                "refundReason": payment.refund_reason,
            }
            if payment.status == "successful":
                eligible, reason = policy_allows_refund(
                    payment, progress.get((payment.student_id, payment.course_id)), policy, now
                )
                row["refund"] = {"eligible": eligible, "reason": reason}
            rows.append(row)
        return response.Response(rows)


def policy_allows_refund(payment, progress_percent, policy, now):
    """The refund policy, from facts already fetched — no queries of its own."""
    window_days = policy.refund_window_days
    max_progress = policy.refund_max_progress_percent
    paid_at = payment.paid_at or payment.created_at
    if window_days and paid_at and (now - paid_at) > timedelta(days=window_days):
        return False, f"Paid more than {window_days} days ago — outside the refund window."
    if progress_percent is not None and progress_percent >= max_progress:
        return False, f"The student is {progress_percent}% through (refunds stop at {max_progress}%)."
    return True, ""


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

        payments = payments.select_related("refunded_by").prefetch_related("transactions")
        now = timezone.now()

        http_response = HttpResponse(content_type="text/csv")
        http_response["Content-Disposition"] = 'attachment; filename="payments.csv"'
        writer = csv.writer(http_response)
        # "Money" is what an accountant needs first: a test or simulated payment
        # in a revenue export is a number nobody was charged.
        writer.writerow(
            ["Started", "Reference", "Student", "Email", "Course", "Amount", "Currency",
             "State", "Money", "Paid at", "Refunded at", "Refund reason"]
        )
        for payment in payments:
            latest = max(payment.transactions.all(), key=lambda txn: txn.created_at, default=None)
            writer.writerow(
                [
                    payment.created_at.isoformat(),
                    latest.reference if latest else "",
                    payment.student.user.display_name,
                    payment.student.user.email,
                    payment.course.title,
                    payment.amount,
                    payment.currency,
                    payment_state(payment, now),
                    "Real" if payment.mode == "live" else payment.get_mode_display(),
                    payment.paid_at.isoformat() if payment.paid_at else "",
                    payment.refunded_at.isoformat() if payment.refunded_at else "",
                    payment.refund_reason,
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

        # Only live payments have money at Paystack to send back. A test-key or
        # simulated payment exists only here, and asking Paystack to refund a
        # reference it never charged fails — leaving an admin unable to reverse
        # a purchase the platform itself recorded.
        if payment.mode == "live":
            transaction = payment.transactions.order_by("-created_at").first()
            result = paystack.create_refund(transaction.reference if transaction else "")
            if not result["success"]:
                return response.Response(
                    {"detail": result.get("message") or "Paystack could not refund this payment."},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        from apps.certificates.models import Certificate

        now = timezone.now()
        with db_transaction.atomic():
            payment.status = "refunded"
            payment.refunded_at = now
            payment.refunded_by = request.user
            payment.refund_reason = refund_reason
            payment.save(update_fields=["status", "refunded_at", "refunded_by", "refund_reason", "updated_at"])
            # Access checks read Enrollment.objects.with_access(), which leaves
            # this out; the row stays so progress survives buying again.
            Enrollment.objects.filter(student=payment.student, course=payment.course).update(
                status="revoked", updated_at=now
            )
            # A certificate for a course the student was refunded for would
            # still verify publicly as earned.
            Certificate.objects.filter(
                student=payment.student, course=payment.course, is_revoked=False
            ).update(is_revoked=True, revoked_at=now, updated_at=now)
            Notification.objects.create(
                user=payment.student.user,
                title="Payment refunded",
                body=f"Your payment for {payment.course.title} was refunded, and the course has been "
                "removed from My Courses. If you buy it again, your progress will still be there.",
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



def _campaign_payload(campaign, used=0):
    from django.utils import timezone

    now = timezone.now()
    if not campaign.is_active:
        state = "ended"
    elif now < campaign.starts_at:
        state = "scheduled"
    elif now >= campaign.ends_at:
        state = "finished"
    else:
        state = "running"
    return {
        "id": campaign.id,
        "name": campaign.name,
        "percentOff": campaign.percent_off,
        "startsAt": campaign.starts_at.isoformat(),
        "endsAt": campaign.ends_at.isoformat(),
        "audience": campaign.audience,
        "categoryId": str(campaign.category_id) if campaign.category_id else None,
        "categoryName": campaign.category.name if campaign.category_id else "",
        "showCountdown": campaign.show_countdown,
        "isActive": campaign.is_active,
        "state": state,
        # Purchases actually priced by it — the number that says it worked.
        "purchases": used,
    }


def _read_campaign(data, campaign=None):
    """Validate a campaign from request data. Returns (fields, errors)."""
    from django.utils.dateparse import parse_datetime

    from apps.categories.models import Category

    errors = {}
    fields = {}

    if campaign is None or "name" in data:
        name = (data.get("name") or "").strip()
        if not name:
            errors["name"] = ["Give the campaign a name, like Founding price."]
        fields["name"] = name[:120]

    if campaign is None or "percentOff" in data:
        try:
            percent = int(data.get("percentOff"))
        except (TypeError, ValueError):
            percent = 0
        if not 1 <= percent <= 100:
            errors["percentOff"] = ["A discount between 1% and 100%."]
        fields["percent_off"] = percent

    for key, field in (("startsAt", "starts_at"), ("endsAt", "ends_at")):
        if campaign is None or key in data:
            value = parse_datetime(str(data.get(key) or ""))
            if value is None:
                errors[key] = ["A date and time is needed."]
            fields[field] = value

    starts = fields.get("starts_at", campaign.starts_at if campaign else None)
    ends = fields.get("ends_at", campaign.ends_at if campaign else None)
    if starts and ends and ends <= starts:
        errors["endsAt"] = ["The end has to be after the start."]

    if "audience" in data or campaign is None:
        audience = data.get("audience") or "everyone"
        if audience not in ("everyone", "founding"):
            errors["audience"] = ["Everyone or founding members."]
        fields["audience"] = audience

    if "categoryId" in data:
        category_id = data.get("categoryId")
        if category_id:
            category = Category.objects.filter(id=category_id).first()
            if category is None:
                errors["categoryId"] = ["That programme no longer exists."]
            fields["category"] = category
        else:
            fields["category"] = None

    for key, field in (("showCountdown", "show_countdown"), ("isActive", "is_active")):
        if key in data:
            fields[field] = bool(data.get(key))

    return fields, errors


class AdminCampaignListView(AdminActionsPerMethod, views.APIView):
    """Discount campaigns: the founding price and every promotion after it."""

    admin_actions = {"GET": ("campaigns:view",), "POST": ("campaigns:manage",)}

    def get(self, request):
        from django.db.models import Count

        from .models import DiscountCampaign

        campaigns = list(DiscountCampaign.objects.select_related("category"))
        used = dict(
            Payment.objects.filter(discount_campaign__in=campaigns, status="successful")
            .values("discount_campaign")
            .annotate(n=Count("id"))
            .values_list("discount_campaign", "n")
        )
        return response.Response([_campaign_payload(c, used.get(c.id, 0)) for c in campaigns])

    def post(self, request):
        from .models import DiscountCampaign

        fields, errors = _read_campaign(request.data)
        if errors:
            return response.Response(errors, status=status.HTTP_400_BAD_REQUEST)
        campaign = DiscountCampaign.objects.create(created_by=request.user, **fields)
        record_audit(
            request,
            "settings.update",
            resource_type="campaign",
            resource_id=campaign.id,
            resource_name=f"{campaign.name} ({campaign.percent_off}% off)",
            metadata={"action": "campaign-created"},
        )
        return response.Response(_campaign_payload(campaign), status=status.HTTP_201_CREATED)


class AdminCampaignDetailView(AdminActionsPerMethod, views.APIView):
    admin_actions = {"PATCH": ("campaigns:manage",)}

    def patch(self, request, campaign_id):
        from .models import DiscountCampaign

        campaign = DiscountCampaign.objects.filter(id=campaign_id).first()
        if campaign is None:
            return response.Response(
                {"detail": "That campaign no longer exists."}, status=status.HTTP_404_NOT_FOUND
            )
        fields, errors = _read_campaign(request.data, campaign)
        if errors:
            return response.Response(errors, status=status.HTTP_400_BAD_REQUEST)
        changes = {}
        for field, value in fields.items():
            before = getattr(campaign, field)
            if before != value:
                changes[field] = {"before": str(before), "after": str(value)}
                setattr(campaign, field, value)
        campaign.save()
        record_audit(
            request,
            "settings.update",
            resource_type="campaign",
            resource_id=campaign.id,
            resource_name=f"{campaign.name} ({campaign.percent_off}% off)",
            changes=changes,
        )
        used = Payment.objects.filter(discount_campaign=campaign, status="successful").count()
        return response.Response(_campaign_payload(campaign, used))
