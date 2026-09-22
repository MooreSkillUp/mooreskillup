"""Ambassador links: who brought whom, and whether it worked.

An ambassador never signs in. A Super Admin makes their link and reads what it
brought in — visits, people who started, people who verified, people who paid.
These pin the ways that record could lie: a code meaning two people, a retired
link still collecting credit, a test-key payment counted as a customer, and a
refresh counted as a visitor.
"""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Ambassador, PendingRegistration, StudentProfile, User
from apps.platform.models import PlatformSettings
from common.rbac import ADMIN, MODERATOR, SUPER_ADMIN


def make_admin(tier, email):
    return User.objects.create_user(
        email=email,
        username=email.split("@")[0],
        display_name="Admin",
        password="pass12345",
        role="admin",
        admin_role=tier,
    )


def client_for(user=None):
    client = APIClient()
    if user:
        client.force_authenticate(user=user)
    return client


@pytest.fixture(autouse=True)
def _open(db):
    settings = PlatformSettings.get_solo()
    settings.launch_state = "pre_launch"
    settings.student_registration_open = True
    settings.save()
    yield


@pytest.fixture
def boss(db):
    return make_admin(SUPER_ADMIN, "boss@test.dev")


def create(boss, **data):
    return client_for(boss).post("/api/admin/ambassadors/", data, format="json")


def join(email, code):
    APIClient().post(
        "/api/auth/register/",
        {
            "email": email,
            "username": email.split("@")[0],
            "password": "password12345",
            "firstName": "New",
            "lastName": "Member",
            "selectedInterest": "Web Development",
            "selectedTrack": "Frontend",
            "acceptTerms": True,
            "referralCode": code,
        },
        format="json",
    )
    pending = PendingRegistration.objects.get(email=email)
    APIClient().post(
        "/api/auth/register/verify/",
        {"pendingId": str(pending.id), "code": pending.code},
        format="json",
    )
    return StudentProfile.objects.get(user__email=email)


# --- Making them ---------------------------------------------------------------


def test_a_super_admin_creates_a_link_with_a_chosen_code(boss):
    response = create(boss, name="Chidi", community="UNIZIK", code="unizik-chidi")

    assert response.status_code == 201
    assert response.data["code"] == "UNIZIK-CHIDI"


def test_a_code_is_generated_when_none_is_given(boss):
    response = create(boss, name="Ngozi")

    assert response.status_code == 201
    assert len(response.data["code"]) == 6


def test_a_code_already_used_by_a_student_is_refused(boss):
    student = join("taken@test.dev", "")

    response = create(boss, name="Clash", code=student.referral_code)

    assert response.status_code == 400
    assert "belongs to someone" in response.data["code"][0]


def test_an_admin_can_see_but_not_create(db):
    admin = make_admin(ADMIN, "ops@test.dev")

    assert client_for(admin).get("/api/admin/ambassadors/").status_code == 200
    assert create(admin, name="Nope").status_code == 403


def test_a_moderator_cannot_see_them(db):
    moderator = make_admin(MODERATOR, "mod@test.dev")

    assert client_for(moderator).get("/api/admin/ambassadors/").status_code == 403


# --- Credit --------------------------------------------------------------------


def test_a_signup_through_the_code_is_credited_to_the_ambassador(boss):
    ambassador_id = create(boss, name="Chidi", code="CAMPUS-1").data["id"]

    student = join("recruit@test.dev", "CAMPUS-1")

    assert str(student.ambassador_id) == ambassador_id
    # An ambassador signup is not also a student referral.
    assert student.referred_by_id is None


def test_a_retired_link_credits_nobody_new(boss):
    ambassador_id = create(boss, name="Gone", code="OLD-LINK").data["id"]
    client_for(boss).patch(
        f"/api/admin/ambassadors/{ambassador_id}/", {"isActive": False}, format="json"
    )

    student = join("late@test.dev", "OLD-LINK")

    assert student.ambassador_id is None


def test_the_numbers_count_verified_people_separately_from_starters(boss):
    create(boss, name="Chidi", code="COUNT-ME")
    join("one@test.dev", "COUNT-ME")
    join("two@test.dev", "COUNT-ME")
    # Started, never verified.
    APIClient().post(
        "/api/auth/register/",
        {
            "email": "ghost@test.dev",
            "username": "ghost",
            "password": "password12345",
            "firstName": "G",
            "lastName": "H",
            "selectedInterest": "Web Development",
            "selectedTrack": "Frontend",
            "acceptTerms": True,
            "referralCode": "COUNT-ME",
        },
        format="json",
    )

    row = client_for(boss).get("/api/admin/ambassadors/").data[0]

    assert row["verified"] == 2
    assert row["started"] == 1
    assert row["paying"] == 0


def test_a_test_key_payment_is_not_a_paying_customer(boss):
    from apps.categories.models import Category, Subcategory
    from apps.courses.models import Course
    from apps.payments.models import Payment

    create(boss, name="Chidi", code="MONEY")
    student = join("buyer@test.dev", "MONEY")
    category = Category.objects.create(name="Web")
    course = Course.objects.create(
        category=category,
        subcategory=Subcategory.objects.create(category=category, name="Front"),
        title="Course",
        price=1000,
    )
    Payment.objects.create(student=student, course=course, amount=1000, status="successful", mode="test")

    assert client_for(boss).get("/api/admin/ambassadors/").data[0]["paying"] == 0

    Payment.objects.create(student=student, course=course, amount=1000, status="successful", mode="live")

    assert client_for(boss).get("/api/admin/ambassadors/").data[0]["paying"] == 1


# --- Editing -------------------------------------------------------------------


def test_editing_a_code_to_one_in_use_is_refused(boss):
    create(boss, name="First", code="FIRST")
    second_id = create(boss, name="Second", code="SECOND").data["id"]

    response = client_for(boss).patch(
        f"/api/admin/ambassadors/{second_id}/", {"code": "FIRST"}, format="json"
    )

    assert response.status_code == 400


def test_keeping_your_own_code_on_save_is_not_a_clash(boss):
    ambassador_id = create(boss, name="Same", code="KEEP").data["id"]

    response = client_for(boss).patch(
        f"/api/admin/ambassadors/{ambassador_id}/", {"code": "KEEP", "name": "Renamed"}, format="json"
    )

    assert response.status_code == 200
    assert response.data["name"] == "Renamed"


# --- The signup form -----------------------------------------------------------


def test_the_form_can_tell_who_a_code_belongs_to(boss):
    create(boss, name="Chidi Okeke", code="CHIDI")

    answer = APIClient().get("/api/auth/referral-code/?code=chidi").data

    assert answer == {"valid": True, "kind": "ambassador", "name": "Chidi Okeke"}


def test_an_unknown_code_is_simply_not_valid(db):
    assert APIClient().get("/api/auth/referral-code/?code=NOPE99").data == {"valid": False}


def test_a_visit_counts_once_per_call_and_says_nothing_about_the_code(boss):
    create(boss, name="Chidi", code="CLICKS")

    known = APIClient().post("/api/auth/referral-code/click/", {"code": "CLICKS"}, format="json")
    unknown = APIClient().post("/api/auth/referral-code/click/", {"code": "NOSUCH"}, format="json")

    assert known.status_code == unknown.status_code == 204
    assert Ambassador.objects.get(code="CLICKS").clicks == 1
