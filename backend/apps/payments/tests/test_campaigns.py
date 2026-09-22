"""Discount campaigns: what a person pays, and that it is the same everywhere.

The expensive mistakes here are all about the number. Two discounts stacking
into a free course. A founding price reaching a stranger. A campaign that
ended still being charged. A page showing one price while checkout charges
another. A 100% promotion used to walk in before launch. Each has a test.
"""

from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import StudentProfile, User
from apps.categories.models import Category, Subcategory
from apps.courses.models import Course
from apps.enrollments.models import Enrollment
from apps.payments.models import DiscountCampaign
from apps.payments.pricing import price_for
from apps.platform.models import PlatformSettings, assign_founding_number
from common.rbac import ADMIN, SUPER_ADMIN

NOW = timezone.now()


def running(**extra):
    defaults = {
        "name": "Founding price",
        "percent_off": 30,
        "starts_at": NOW - timedelta(days=1),
        "ends_at": NOW + timedelta(days=7),
    }
    defaults.update(extra)
    return DiscountCampaign.objects.create(**defaults)


@pytest.fixture(autouse=True)
def _live(db):
    settings = PlatformSettings.get_solo()
    settings.launch_state = "live"
    settings.payments_enabled = True
    settings.save()
    yield


@pytest.fixture
def web(db):
    return Category.objects.create(name="Web")


def make_course(category, price=10000, discount=None):
    serial = Course.objects.count() + 1
    return Course.objects.create(
        category=category,
        subcategory=Subcategory.objects.create(category=category, name=f"Sub{serial}"),
        title=f"Course {serial}",
        price=Decimal(price),
        discount_price=Decimal(discount) if discount is not None else None,
        status="published",
        visibility="visible",
    )


def make_student(email, founding=False):
    user = User.objects.create_user(
        email=email, username=email.split("@")[0], display_name="S", password="pass12345", role="student"
    )
    student = StudentProfile.objects.create(user=user)
    if founding:
        assign_founding_number(student)
    return student


# --- The arithmetic -------------------------------------------------------------


def test_a_running_campaign_takes_its_percentage_off(web):
    running(percent_off=30)
    course = make_course(web, 10000)

    amount, campaign, list_price = price_for(course)

    assert amount == Decimal("7000")
    assert campaign is not None
    assert list_price == Decimal("10000")


def test_overlapping_campaigns_do_not_stack(web):
    """50% and 60% must never become 110% — or 80%. The bigger one wins."""
    running(name="Half", percent_off=50)
    running(name="Sixty", percent_off=60)
    course = make_course(web, 10000)

    amount, campaign, _ = price_for(course)

    assert amount == Decimal("4000")
    assert campaign.name == "Sixty"


def test_a_campaign_is_applied_to_the_list_price_not_on_top_of_a_discount(web):
    """A course discounted to 8000, plus 30% off, is 7000 — not 5600."""
    running(percent_off=30)
    course = make_course(web, 10000, discount=8000)

    assert price_for(course)[0] == Decimal("7000")


def test_the_course_discount_wins_when_it_is_the_bigger_one(web):
    running(percent_off=10)
    course = make_course(web, 10000, discount=5000)

    amount, campaign, _ = price_for(course)

    assert amount == Decimal("5000")
    assert campaign is None


def test_prices_come_out_in_whole_naira(web):
    running(percent_off=33)
    course = make_course(web, 10000)

    assert price_for(course)[0] == Decimal("6700")


# --- Who and when ----------------------------------------------------------------


def test_a_campaign_that_has_ended_charges_full_price(web):
    running(starts_at=NOW - timedelta(days=10), ends_at=NOW - timedelta(minutes=1))

    assert price_for(make_course(web, 10000))[0] == Decimal("10000")


def test_a_campaign_that_has_not_started_charges_full_price(web):
    running(starts_at=NOW + timedelta(hours=1), ends_at=NOW + timedelta(days=2))

    assert price_for(make_course(web, 10000))[0] == Decimal("10000")


def test_ending_a_campaign_early_stops_it_at_once(web):
    running(is_active=False)

    assert price_for(make_course(web, 10000))[0] == Decimal("10000")


def test_the_founding_price_is_for_founding_members_only(web):
    running(audience="founding", percent_off=40)
    course = make_course(web, 10000)
    founder = make_student("founder@test.dev", founding=True)
    latecomer = make_student("late@test.dev")

    assert price_for(course, founder)[0] == Decimal("6000")
    assert price_for(course, latecomer)[0] == Decimal("10000")
    # A stranger who is not signed in sees the price they would actually pay.
    assert price_for(course, None)[0] == Decimal("10000")


def test_a_campaign_can_be_limited_to_one_programme(web):
    design = Category.objects.create(name="Design")
    running(category=web, percent_off=50)

    assert price_for(make_course(web, 10000))[0] == Decimal("5000")
    assert price_for(make_course(design, 10000))[0] == Decimal("10000")


# --- The same number everywhere --------------------------------------------------


def test_the_course_page_shows_what_checkout_will_charge(web):
    running(percent_off=25)
    course = make_course(web, 20000)
    student = make_student("viewer@test.dev")
    client = APIClient()
    client.force_authenticate(user=student.user)

    payload = client.get(f"/api/courses/{course.id}/").data

    assert Decimal(payload["effectivePrice"]) == Decimal("15000")
    assert payload["activeCampaign"]["percentOff"] == 25
    assert Decimal(payload["effectivePrice"]) == price_for(course, student)[0]


# --- 100% off, and the launch gate ------------------------------------------------


def test_a_100_percent_campaign_enrols_without_payment(web):
    running(percent_off=100)
    course = make_course(web, 10000)
    student = make_student("free@test.dev")
    client = APIClient()
    client.force_authenticate(user=student.user)

    response = client.post(f"/api/courses/{course.id}/enroll/")

    assert response.status_code in (200, 201), response.data
    enrollment = Enrollment.objects.get(student=student, course=course)
    # Recorded as a campaign, so it is never mistaken for a free course.
    assert enrollment.access_source == "campaign"


def test_a_100_percent_campaign_is_not_a_way_in_before_launch(web):
    settings = PlatformSettings.get_solo()
    settings.launch_state = "pre_launch"
    settings.save()
    running(percent_off=100)
    course = make_course(web, 10000)
    student = make_student("early@test.dev", founding=True)
    client = APIClient()
    client.force_authenticate(user=student.user)

    response = client.post(f"/api/courses/{course.id}/enroll/")

    assert response.status_code == 403
    assert not Enrollment.objects.filter(student=student, course=course).exists()


def test_a_genuinely_free_course_waits_for_launch_too(web):
    """No courses before launch day, free ones included."""
    settings = PlatformSettings.get_solo()
    settings.launch_state = "pre_launch"
    settings.save()
    course = make_course(web, 0)
    student = make_student("keen@test.dev", founding=True)
    client = APIClient()
    client.force_authenticate(user=student.user)

    assert client.post(f"/api/courses/{course.id}/enroll/").status_code == 403


# --- Who may run them --------------------------------------------------------------


def admin(tier, email):
    return User.objects.create_user(
        email=email, username=email.split("@")[0], display_name="A", password="pass12345",
        role="admin", admin_role=tier,
    )


def as_user(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def campaign_payload(**extra):
    payload = {
        "name": "Christmas gift-a-skill",
        "percentOff": 20,
        "startsAt": (NOW + timedelta(days=1)).isoformat(),
        "endsAt": (NOW + timedelta(days=8)).isoformat(),
        "audience": "everyone",
    }
    payload.update(extra)
    return payload


def test_a_super_admin_creates_a_campaign(db):
    response = as_user(admin(SUPER_ADMIN, "boss@test.dev")).post(
        "/api/admin/campaigns/", campaign_payload(), format="json"
    )

    assert response.status_code == 201
    assert response.data["state"] == "scheduled"


def test_an_admin_can_see_campaigns_but_not_create_them(db):
    ops = admin(ADMIN, "ops@test.dev")

    assert as_user(ops).get("/api/admin/campaigns/").status_code == 200
    assert as_user(ops).post("/api/admin/campaigns/", campaign_payload(), format="json").status_code == 403


@pytest.mark.parametrize("percent", [0, 101, -5])
def test_impossible_percentages_are_refused(db, percent):
    response = as_user(admin(SUPER_ADMIN, f"b{percent}@test.dev")).post(
        "/api/admin/campaigns/", campaign_payload(percentOff=percent), format="json"
    )

    assert response.status_code == 400
    assert "percentOff" in response.data


def test_an_end_before_the_start_is_refused(db):
    response = as_user(admin(SUPER_ADMIN, "boss2@test.dev")).post(
        "/api/admin/campaigns/",
        campaign_payload(startsAt=(NOW + timedelta(days=5)).isoformat(), endsAt=NOW.isoformat()),
        format="json",
    )

    assert response.status_code == 400
    assert "endsAt" in response.data
