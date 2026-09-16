from django.db import models

from common.models import TimeStampedModel, UUIDPrimaryKeyModel


class Payment(UUIDPrimaryKeyModel, TimeStampedModel):
    METHOD_CHOICES = (("paystack", "Paystack"),)
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("successful", "Successful"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
        ("refunded", "Refunded"),
    )

    student = models.ForeignKey("accounts.StudentProfile", on_delete=models.CASCADE, related_name="payments")
    course = models.ForeignKey("courses.Course", on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default="NGN")
    payment_method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    # How the money was taken. Only "live" is money the business has: a Paystack
    # test key and simulation both report success without anyone being charged,
    # and nothing used to record which, so test checkouts showed up as revenue.
    MODE_CHOICES = (("live", "Live"), ("test", "Paystack test mode"), ("simulated", "Simulated"))

    description = models.CharField(max_length=255)
    paid_at = models.DateTimeField(null=True, blank=True)
    mode = models.CharField(max_length=10, choices=MODE_CHOICES, default="live")
    refunded_at = models.DateTimeField(null=True, blank=True)
    refunded_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    refund_reason = models.TextField(blank=True)


class Transaction(UUIDPrimaryKeyModel, TimeStampedModel):
    payment = models.ForeignKey("payments.Payment", on_delete=models.CASCADE, related_name="transactions")
    provider = models.CharField(max_length=20, choices=Payment.METHOD_CHOICES)
    reference = models.CharField(max_length=255, unique=True)
    provider_transaction_id = models.CharField(max_length=255, blank=True)
    provider_status = models.CharField(max_length=50, default="pending")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default="NGN")
    authorization_url = models.URLField(blank=True)
    gateway_response = models.JSONField(default=dict, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
