"""Bootstrapping the first Super Admin on a fresh deployment.

The admin screens need an admin, and the public admin sign-up page reads
`ADMIN_REGISTRATION_TOKEN`, which nothing passes to the deployed container — so
on a new environment there is no way in through the product itself.
"""

from io import StringIO

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from apps.accounts.models import User
from common.rbac import SUPER_ADMIN


def run(**kwargs):
    out = StringIO()
    call_command("create_admin", stdout=out, **kwargs)
    return out.getvalue()


def test_it_creates_a_super_admin_and_shows_the_password_once(db):
    output = run(email="boss@example.com", name="Eric Moore")

    user = User.objects.get(email="boss@example.com")
    assert user.role == "admin"
    assert user.admin_role == SUPER_ADMIN
    assert user.is_superuser is True
    assert (user.first_name, user.last_name) == ("Eric", "Moore")
    # Handed over, not chosen — so it has to be changed at first sign-in.
    assert user.must_change_password is True
    assert "Password:" in output


def test_a_given_password_works_and_is_not_a_handover(db):
    run(email="boss@example.com", name="Eric Moore", password="ChosenPass123!")

    user = User.objects.get(email="boss@example.com")
    assert user.check_password("ChosenPass123!")
    assert user.must_change_password is False


def test_running_it_again_promotes_instead_of_failing(db):
    User.objects.create_user(
        email="already@example.com", username="already", display_name="Already Here",
        password="TheirOwnPass123!", role="student",
    )

    run(email="already@example.com")

    user = User.objects.get(email="already@example.com")
    assert user.role == "admin"
    assert user.admin_role == SUPER_ADMIN
    # Their password is untouched: a second run must not lock anybody out.
    assert user.check_password("TheirOwnPass123!")


def test_it_refuses_a_bad_address(db):
    with pytest.raises(CommandError):
        run(email="not-an-email")
    assert not User.objects.exists()


def test_it_says_so_when_the_username_is_taken(db):
    User.objects.create_user(
        email="other@example.com", username="boss", display_name="Other", password="pass12345",
    )

    with pytest.raises(CommandError, match="taken"):
        run(email="boss@example.com")
