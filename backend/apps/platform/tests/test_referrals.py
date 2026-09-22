"""Referrals: who gets credit, and for what.

Credit lands when the invited person verifies their email — never on a click,
which anybody can produce by refreshing their own link. That single rule is what
keeps a referral count worth rewarding, so most of these pin it from a different
angle.
"""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import PendingRegistration, StudentProfile
from apps.platform.models import PlatformSettings

from .test_audit_and_settings import client_for, make_user


@pytest.fixture(autouse=True)
def _reset(db):
    settings = PlatformSettings.get_solo()
    settings.launch_state = "pre_launch"
    settings.student_registration_open = True
    settings.referral_rewards_enabled = True
    settings.referral_early_access_at = 3
    settings.referral_free_course_at = 10
    settings.save()
    yield


def register(email, username, ref=""):
    payload = {
        "email": email,
        "username": username,
        "password": "password12345",
        "firstName": "New",
        "lastName": "Person",
        "selectedInterest": "Web Development",
        "selectedTrack": "Frontend",
        "acceptTerms": True,
    }
    if ref:
        payload["referralCode"] = ref
    return APIClient().post("/api/auth/register/", payload, format="json")


def verify(email):
    pending = PendingRegistration.objects.get(email=email)
    return APIClient().post(
        "/api/auth/register/verify/",
        {"pendingId": str(pending.id), "code": pending.code},
        format="json",
    )


def join(email, username, ref=""):
    register(email, username, ref)
    verify(email)
    return StudentProfile.objects.get(user__email=email)


# --- Getting a code ------------------------------------------------------------


def test_everyone_leaves_verification_with_a_code(db):
    student = join("first@test.dev", "first")

    assert student.referral_code
    assert len(student.referral_code) == 6


def test_codes_avoid_characters_people_misread(db):
    """These travel as voice notes and get typed with thumbs."""
    student = join("clear@test.dev", "clear")

    assert not set(student.referral_code) & set("01OIL")


def test_two_people_never_share_a_code(db):
    codes = {join(f"p{i}@test.dev", f"person{i}").referral_code for i in range(5)}

    assert len(codes) == 5


# --- Getting credit ------------------------------------------------------------


def test_a_verified_invite_credits_the_referrer(db):
    referrer = join("host@test.dev", "host")

    invited = join("guest@test.dev", "guest", ref=referrer.referral_code)

    assert invited.referred_by_id == referrer.id
    assert invited.referral_qualified_at is not None


def test_an_unverified_invite_credits_nobody(db):
    """Signing up is not the bar. Verifying is."""
    referrer = join("host2@test.dev", "host2")
    register("ghost@test.dev", "ghost", ref=referrer.referral_code)

    assert StudentProfile.objects.filter(referred_by=referrer).count() == 0


def test_a_code_that_does_not_exist_is_ignored(db):
    invited = join("lost@test.dev", "lost", ref="ZZZZZZ")

    assert invited.referred_by_id is None
    assert invited.referral_qualified_at is None


def test_the_code_is_read_regardless_of_case(db):
    referrer = join("host3@test.dev", "host3")

    invited = join("guest3@test.dev", "guest3", ref=referrer.referral_code.lower())

    assert invited.referred_by_id == referrer.id


# --- What a member sees --------------------------------------------------------


def test_the_count_reflects_verified_invites_only(db):
    referrer = join("counter@test.dev", "counter")
    join("a@test.dev", "aaa", ref=referrer.referral_code)
    join("b@test.dev", "bbb", ref=referrer.referral_code)
    register("never@test.dev", "never", ref=referrer.referral_code)  # never verifies

    payload = client_for(referrer.user).get("/api/auth/referrals/").data

    assert payload["qualified"] == 2
    assert payload["code"] == referrer.referral_code


def test_rewards_unlock_at_the_thresholds_on_settings(db):
    settings = PlatformSettings.get_solo()
    settings.referral_early_access_at = 2
    settings.save()
    referrer = join("rewarded@test.dev", "rewarded")
    join("c@test.dev", "ccc", ref=referrer.referral_code)

    before = client_for(referrer.user).get("/api/auth/referrals/").data
    assert before["hasEarlyAccess"] is False

    join("d@test.dev", "ddd", ref=referrer.referral_code)

    after = client_for(referrer.user).get("/api/auth/referrals/").data
    assert after["hasEarlyAccess"] is True
    assert after["earlyAccessAt"] == 2


# --- The leaderboard -----------------------------------------------------------


def test_the_leaderboard_names_people_by_handle_not_by_email(db):
    top = join("top@test.dev", "topreferrer")
    join("e@test.dev", "eee", ref=top.referral_code)

    rows = client_for(top.user).get("/api/auth/referrals/leaderboard/").data

    assert rows[0]["username"] == "topreferrer"
    assert rows[0]["referrals"] == 1
    assert all("@" not in str(row) for row in rows)


def test_someone_who_has_referred_nobody_is_not_on_the_board(db):
    quiet = join("quiet@test.dev", "quiet")

    rows = client_for(quiet.user).get("/api/auth/referrals/leaderboard/").data

    assert rows == []


def test_a_teacher_cannot_read_the_student_referral_board(db):
    teacher = make_user("teacher")

    assert client_for(teacher).get("/api/auth/referrals/leaderboard/").status_code == 403
