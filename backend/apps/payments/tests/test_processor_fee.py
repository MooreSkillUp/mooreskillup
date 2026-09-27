"""The processor's fee, recorded on the payment that paid it.

The teacher agreement pays a share of revenue *after* the payment processor's
fee. Paystack reports that fee once, on the transaction, and never again — so a
sale fulfilled without recording it has its real fee lost, and the teacher's
first statement would have to guess. Nothing here can be backfilled, which is
why it ships before the live keys go on rather than with the payouts module.

Both the verify endpoint and the webhook can be the first to fulfil a payment,
so both have to carry the fee across.
"""

from decimal import Decimal
from unittest.mock import patch

import pytest

from apps.payments.models import Payment, Transaction
from apps.payments.views import fulfill_payment, processor_fee_from

from .test_paystack import SECRET, _signed_webhook, client_for, make_course, make_student


def paystack_payload(fees_kobo=40000, amount_kobo=2000000):
    """What Paystack's verify and charge.success payloads look like, trimmed."""
    return {
        "status": "success",
        "reference": "MSU-FEE1",
        "amount": amount_kobo,
        "fees": fees_kobo,
        "currency": "NGN",
        "channel": "card",
    }


def pending(price=20000, ref="MSU-FEE1"):
    course = make_course(price=price)
    student = make_student()
    payment = Payment.objects.create(
        student=student,
        course=course,
        amount=Decimal(price),
        currency="NGN",
        payment_method="paystack",
        status="pending",
        description="x",
    )
    record = Transaction.objects.create(
        payment=payment, provider="paystack", reference=ref, amount=Decimal(price), currency="NGN"
    )
    return payment, record


class TestFeeReading:
    def test_kobo_becomes_naira(self):
        assert processor_fee_from({"fees": 40000}) == Decimal("400.00")

    def test_a_fee_with_odd_kobo_keeps_them(self):
        assert processor_fee_from({"fees": 40050}) == Decimal("400.50")

    @pytest.mark.parametrize(
        "payload",
        [{"simulated": True}, {}, {"fees": None}, {"fees": ""}, None, "not a dict"],
    )
    def test_a_payload_without_a_fee_is_not_an_error(self, payload):
        """Simulated and test payments carry no fee. That is expected, not broken:
        the field stays null, and a null fee can never earn anyone anything."""
        assert processor_fee_from(payload) is None

    def test_nonsense_does_not_crash_a_checkout(self):
        assert processor_fee_from({"fees": "free!"}) is None


class TestFulfilmentRecordsIt:
    def test_the_fee_and_the_whole_payload_are_kept(self, db):
        payment, record = pending()

        fulfill_payment(payment, record, provider_data=paystack_payload())

        payment.refresh_from_db()
        record.refresh_from_db()
        assert payment.processor_fee == Decimal("400.00")
        assert record.gateway_response["channel"] == "card"

    def test_net_revenue_is_computable_from_what_we_stored(self, db):
        """The whole point: ₦20,000 paid less a ₦400 fee is ₦19,600 net,
        and a 25% share of that is ₦4,900."""
        payment, record = pending()

        fulfill_payment(payment, record, provider_data=paystack_payload())

        payment.refresh_from_db()
        net = payment.amount - payment.processor_fee
        assert net == Decimal("19600.00")
        assert (net * Decimal("0.25")).quantize(Decimal("0.01")) == Decimal("4900.00")

    def test_a_second_call_records_a_fee_the_first_one_did_not_have(self, db):
        """The verify endpoint can fulfil a payment from a simulated payload with
        no fee in it, and the webhook then arrives with the real figure. The fee
        cannot be recovered afterwards, so the later call still gets to save it."""
        payment, record = pending()
        fulfill_payment(payment, record, provider_data={"simulated": True})
        payment.refresh_from_db()
        assert payment.processor_fee is None

        fulfill_payment(payment, record, provider_data=paystack_payload())

        payment.refresh_from_db()
        assert payment.processor_fee == Decimal("400.00")

    def test_a_recorded_fee_is_never_overwritten(self, db):
        payment, record = pending()
        fulfill_payment(payment, record, provider_data=paystack_payload(fees_kobo=40000))

        fulfill_payment(payment, record, provider_data=paystack_payload(fees_kobo=999999))

        payment.refresh_from_db()
        assert payment.processor_fee == Decimal("400.00")

    def test_fulfilment_still_works_with_no_payload_at_all(self, db):
        payment, record = pending()

        fulfill_payment(payment, record)

        payment.refresh_from_db()
        assert payment.status == "successful"
        assert payment.processor_fee is None


class TestBothRoutesIn:
    @patch("apps.payments.paystack.verify_transaction")
    def test_the_verify_endpoint_passes_the_fee_through(self, mock_verify, db):
        payment, record = pending()
        mock_verify.return_value = {
            "success": True,
            "amount_kobo": 2000000,
            "raw": paystack_payload(),
        }

        res = client_for(payment.student.user).post(
            "/api/payments/verify/", {"reference": record.reference}, format="json"
        )

        assert res.status_code == 200
        payment.refresh_from_db()
        assert payment.processor_fee == Decimal("400.00")

    def test_the_webhook_passes_the_fee_through(self, settings, db):
        settings.PAYSTACK_SECRET_KEY = SECRET
        payment, record = pending()

        res = _signed_webhook({"event": "charge.success", "data": paystack_payload()})

        assert res.status_code == 200
        payment.refresh_from_db()
        assert payment.status == "successful"
        assert payment.processor_fee == Decimal("400.00")
