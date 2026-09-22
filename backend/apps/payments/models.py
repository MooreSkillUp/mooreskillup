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
    # What the course cost before any discount, and which campaign cut it, so a
    # refund, a revenue figure or a dispute can say what actually happened.
    list_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    discount_campaign = models.ForeignKey(
        "payments.DiscountCampaign",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments",
    )
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


class DiscountCampaign(models.Model):
    """A named, dated discount a Super Admin runs: the founding price, a
    Christmas gift-a-skill week, a campus promotion.

    One mechanism rather than special code per promotion. It takes a percentage
    off the course's list price for the people it applies to, between two
    dates, and when two campaigns overlap the bigger discount wins — they never
    stack. Stacking is how a 50% campaign and a 60% campaign end up giving a
    course away by accident.
    """

    AUDIENCES = (
        ("everyone", "Everyone"),
        # People who joined before launch day: the founding price.
        ("founding", "Founding members"),
    )

    name = models.CharField(max_length=120)
    percent_off = models.PositiveSmallIntegerField()
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    audience = models.CharField(max_length=20, choices=AUDIENCES, default="everyone")
    # Empty means every course; set, it limits the campaign to one programme.
    category = models.ForeignKey(
        "categories.Category", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    # The deadline is what turns "later" into "now", so it is shown by default.
    show_countdown = models.BooleanField(default=True)
    # A kill switch that does not rewrite history: ending a campaign early
    # leaves its dates as they were planned.
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-starts_at",)

    def __str__(self):
        return f"{self.name} ({self.percent_off}% off)"

    def is_running(self, now=None):
        from django.utils import timezone

        now = now or timezone.now()
        return self.is_active and self.starts_at <= now < self.ends_at
