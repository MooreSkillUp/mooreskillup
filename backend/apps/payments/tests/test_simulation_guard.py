"""Simulated payments must never be possible on a deployed server.

Production had no `PAYSTACK_SECRET_KEY` — it was never passed to the container
app — so `is_live()` was False and the client ran in simulation mode: checkout
bounced the browser straight to the callback, verify reported success, and the
student was enrolled in a paid course having paid nothing. No error, no log
line, no money.

Simulation is a development convenience. It is now tied to DEBUG, so the same
misconfiguration fails at checkout instead of quietly giving the catalog away.
"""

import pytest
from django.test import override_settings

from apps.payments.paystack import (
    PaystackError,
    create_refund,
    initialize_transaction,
    is_live,
    simulation_allowed,
    verify_transaction,
)

# No key and DEBUG off: exactly what production looked like.
DEPLOYED_WITHOUT_KEY = override_settings(PAYSTACK_SECRET_KEY="", DEBUG=False)
LOCAL_WITHOUT_KEY = override_settings(PAYSTACK_SECRET_KEY="", DEBUG=True)


@DEPLOYED_WITHOUT_KEY
def test_checkout_refuses_rather_than_faking_a_payment():
    assert is_live() is False
    assert simulation_allowed() is False

    with pytest.raises(PaystackError) as raised:
        initialize_transaction(
            email="student@example.test",
            amount_kobo=500_000,
            reference="MSU-TEST",
            callback_url="https://example.test/callback",
        )
    assert "not configured" in str(raised.value)


@DEPLOYED_WITHOUT_KEY
def test_verification_refuses_too():
    """The dangerous one: verify used to return success unconditionally.

    Blocking only checkout would leave a reference that could still be verified
    into an enrolment.
    """
    with pytest.raises(PaystackError):
        verify_transaction("MSU-TEST")


@DEPLOYED_WITHOUT_KEY
def test_refunds_refuse_too():
    with pytest.raises(PaystackError):
        create_refund("MSU-TEST")


@LOCAL_WITHOUT_KEY
def test_local_development_still_simulates_end_to_end():
    """The convenience has to survive, or nobody can test checkout locally."""
    assert simulation_allowed() is True

    started = initialize_transaction(
        email="student@example.test",
        amount_kobo=500_000,
        reference="MSU-TEST",
        callback_url="https://example.test/callback",
    )
    assert "simulated=1" in started["authorization_url"]
    assert started["reference"] == "MSU-TEST"

    assert verify_transaction("MSU-TEST")["success"] is True


@override_settings(PAYSTACK_SECRET_KEY="sk_test_abc123", DEBUG=False)
def test_a_real_key_is_all_a_deployment_needs():
    assert is_live() is True
    assert simulation_allowed() is False
