"""The waitlist: sign up before launch, learn on launch day.

Sign-ups stay open before launch, because those people are the founding members
and the whole pre-launch campaign exists to collect them. What is closed is the
courses, not the door.

Three states carry it: pre-launch (sign up, buy nothing), founding beta (the
people who waited may buy at the founding price), live (everyone).
"""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import StudentProfile, User
from apps.platform.models import PlatformSettings, assign_founding_number

from .test_audit_and_settings import make_user


@pytest.fixture(autouse=True)
def _reset(db):
    settings = PlatformSettings.get_solo()
    settings.launch_state = "live"
    settings.student_registration_open = True
    settings.sign_in_enabled = True
    settings.save()
    yield


def set_state(state):
    settings = PlatformSettings.get_solo()
    settings.launch_state = state
    settings.save()


def register(email="waiting@test.dev", username="waiting", **extra):
    payload = {
        "email": email,
        "username": username,
        "password": "password12345",
        "firstName": "Wait",
        "lastName": "Ing",
        "selectedInterest": "Web Development",
        "selectedTrack": "Frontend",
        "acceptTerms": True,
    }
    payload.update(extra)
    return APIClient().post("/api/auth/register/", payload, format="json")


def verify(email):
    from apps.accounts.models import PendingRegistration

    pending = PendingRegistration.objects.get(email=email)
    return APIClient().post(
        "/api/auth/register/verify/",
        {"pendingId": str(pending.id), "code": pending.code},
        format="json",
    )


# --- Signing up while the doors are shut --------------------------------------


def test_sign_up_stays_open_before_launch(db):
    set_state("pre_launch")

    assert register().status_code in (200, 201)


def test_a_verified_pre_launch_signup_gets_a_founding_number(db):
    set_state("pre_launch")
    register()

    assert verify("waiting@test.dev").status_code == 201

    student = StudentProfile.objects.get(user__email="waiting@test.dev")
    assert student.founding_member_number == 1


def test_numbers_run_in_order_without_collisions(db):
    set_state("pre_launch")
    for index in range(3):
        register(email=f"m{index}@test.dev", username=f"member{index}")
        verify(f"m{index}@test.dev")

    numbers = sorted(
        StudentProfile.objects.exclude(founding_member_number=None).values_list(
            "founding_member_number", flat=True
        )
    )
    assert numbers == [1, 2, 3]


def test_signing_up_after_launch_gets_no_number(db):
    set_state("live")
    register()
    verify("waiting@test.dev")

    student = StudentProfile.objects.get(user__email="waiting@test.dev")
    assert student.founding_member_number is None


def test_the_details_we_ask_for_survive_verification(db):
    """Anything not carried through the code step is silently discarded."""
    set_state("pre_launch")
    register(
        whatsappNumber="+2348012345678",
        heardAboutUs="whatsapp",
        heardAboutUsDetail="Ada sent it",
    )
    verify("waiting@test.dev")

    student = StudentProfile.objects.get(user__email="waiting@test.dev")
    assert student.whatsapp_number == "+2348012345678"
    assert student.heard_about_us == "whatsapp"
    assert student.heard_about_us_detail == "Ada sent it"


# --- Buying, and who may ------------------------------------------------------


def make_student(email, founding=False):
    user = make_user("student", email=email)
    profile, _ = StudentProfile.objects.get_or_create(user=user)
    if founding:
        assign_founding_number(profile)
    return user


def try_to_buy(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client.post("/api/payments/initialize/", {"courseId": "x"}, format="json")


def test_nobody_can_buy_before_launch(db):
    set_state("pre_launch")
    user = make_student("earlybird@test.dev", founding=True)

    response = try_to_buy(user)

    assert response.status_code == 403
    assert "launch day" in response.data["detail"]


def test_founding_members_can_buy_in_the_founding_window(db):
    set_state("founding_beta")
    user = make_student("founder@test.dev", founding=True)

    # Past the launch-state gate; the course id is nonsense, so it fails later.
    assert try_to_buy(user).status_code != 403


def test_latecomers_cannot_buy_in_the_founding_window(db):
    set_state("founding_beta")
    user = make_student("latecomer@test.dev", founding=False)

    response = try_to_buy(user)

    assert response.status_code == 403
    assert "founding members" in response.data["detail"]


# --- The username, which has to be unique to be a handle ----------------------


def check(username):
    return APIClient().get(f"/api/auth/username-available/?username={username}").data


def test_a_free_username_reads_as_available(db):
    assert check("adaokonkwo")["available"] is True


def test_a_taken_username_is_refused(db):
    make_user("student", email="taken@test.dev")
    User.objects.filter(email="taken@test.dev").update(username="adaokonkwo")

    assert check("adaokonkwo")["available"] is False


def test_a_username_held_mid_verification_is_not_free(db):
    """Otherwise two people are both told yes and the second one fails last."""
    set_state("pre_launch")
    register(email="pending@test.dev", username="reserved")

    assert check("reserved")["available"] is False


@pytest.mark.parametrize("bad", ["ab", "has space", "emoji🙂", "semi;colon"])
def test_unusable_usernames_are_refused_with_a_reason(db, bad):
    result = check(bad)

    assert result["available"] is False
    assert result["reason"]


# --- What a visitor with no account can read ----------------------------------


def test_the_community_link_reaches_the_pre_launch_screen(db):
    settings = PlatformSettings.get_solo()
    settings.launch_state = "pre_launch"
    settings.community_url = "https://chat.whatsapp.com/example"
    settings.community_label = "Join the WhatsApp community"
    settings.save()

    payload = APIClient().get("/api/platform/status/").data

    assert payload["launch"]["communityUrl"] == "https://chat.whatsapp.com/example"
    assert payload["launch"]["communityLabel"] == "Join the WhatsApp community"
