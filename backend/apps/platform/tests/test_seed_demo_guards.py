"""When seeding demo data is defensible, and when it absolutely is not.

Demo accounts are documented in a public repository, so the shared password is
public knowledge. Putting those accounts on a site reachable from the internet
would hand an admin account to anyone who reads the repo — and dropping fake
students in among real ones is impossible to undo cleanly.

Both risks disappear on exactly one kind of site: a deployed one nobody is using
yet, which is also the only kind a team cannot test, because it has no courses.
"""

from decimal import Decimal
from io import StringIO

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from apps.accounts.models import StudentProfile, User
from apps.platform.management.commands.seed_demo import DEMO_PASSWORD


def seed(**kwargs):
    out = StringIO()
    call_command("seed_demo", stdout=out, **kwargs)
    return out.getvalue()


def test_a_live_site_with_nobody_on_it_can_be_seeded(db):
    output = seed(allow_live=True)

    assert User.objects.filter(email__endswith="@demo.mooreskillup.test").exists()
    assert "Password for all of them:" in output


def test_the_public_password_is_never_used_on_a_live_site(db):
    """It is in a public repository. It cannot be the way in to a real site."""
    output = seed(allow_live=True)

    demo_admin = User.objects.get(email="admin@demo.mooreskillup.test")
    assert not demo_admin.check_password(DEMO_PASSWORD)
    # And it must not be *printed* either: the report used to end by echoing the
    # constant, so a live seeding announced two passwords, one of which was the
    # published one that no longer opens anything.
    assert DEMO_PASSWORD not in output


def test_the_password_it_prints_is_the_one_that_works(db):
    output = seed(allow_live=True)

    printed = output.split("Password for all of them:")[1].split("\n")[0].strip()
    assert User.objects.get(email="admin@demo.mooreskillup.test").check_password(printed)


def test_a_chosen_password_is_honoured(db):
    seed(allow_live=True, password="A-Chosen-One-4567")

    demo_admin = User.objects.get(email="admin@demo.mooreskillup.test")
    assert demo_admin.check_password("A-Chosen-One-4567")


def test_it_refuses_once_a_real_student_exists(db):
    real = User.objects.create_user(
        email="someone@gmail.com", username="someone", display_name="Someone",
        password="pass12345", role="student",
    )
    StudentProfile.objects.create(user=real)

    with pytest.raises(CommandError, match="real"):
        seed(allow_live=True)


def test_it_refuses_once_money_has_moved(db):
    """A payment means somebody paid — whatever the account count says."""
    from apps.categories.models import Category, Subcategory
    from apps.courses.models import Course
    from apps.payments.models import Payment

    student_user = User.objects.create_user(
        email="payer@demo.mooreskillup.test", username="payer", display_name="Payer",
        password="pass12345", role="student",
    )
    student = StudentProfile.objects.create(user=student_user)
    category = Category.objects.create(name="C")
    course = Course.objects.create(
        category=category, subcategory=Subcategory.objects.create(category=category, name="S"),
        title="Paid", subtitle="s", overview="o", scheme_of_work="w",
    )
    Payment.objects.create(
        student=student, course=course, amount=Decimal("1000"),
        payment_method="paystack", status="successful", description="x",
    )

    with pytest.raises(CommandError, match="payment"):
        seed(allow_live=True)


def test_without_the_flag_the_old_guards_still_apply(db, settings):
    settings.DEBUG = False

    with pytest.raises(CommandError, match="DEBUG"):
        seed()
