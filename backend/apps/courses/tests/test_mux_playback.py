"""Paid video that cannot be passed on.

A lesson used to store a plain URL. It was hidden from people who had not paid,
but a student who had paid could copy it out of the page and send it to anyone
— which is the whole problem with selling video.

Mux playback is by signed token: the URL alone plays nothing, the token is
short-lived, and it is minted in exactly one place — after the same entitlement
check that decides whether the lesson is visible at all. The test that matters
most here is the one proving a locked lesson returns no token.
"""

import base64
import time
from decimal import Decimal

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from django.test import override_settings
from rest_framework import serializers
from rest_framework.test import APIClient

from apps.accounts.models import StudentProfile, TeacherProfile, User
from apps.categories.models import Category, Subcategory
from apps.courses.models import Course, Lesson, Section
from apps.courses.mux import (
    is_configured,
    playback_id_from,
    playback_payload,
    sign_playback,
    validate_playback_id,
)
from apps.enrollments.models import Enrollment

PLAYBACK_ID = "qxb01i6T202018GFS02vp9RIe01icTcDCjVzQpmaB00CUisJ4"


def a_signing_key():
    """A throwaway RSA key, so the signing path is exercised for real."""
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()
    return key.public_key(), pem


PUBLIC_KEY, PRIVATE_PEM = a_signing_key()

signing_on = override_settings(
    MUX_SIGNING_KEY_ID="test-key-id", MUX_SIGNING_KEY_PRIVATE=PRIVATE_PEM
)


@pytest.fixture
def signing(settings):
    """override_settings cannot decorate a plain pytest class, so the
    entitlement tests take this instead."""
    settings.MUX_SIGNING_KEY_ID = "test-key-id"
    settings.MUX_SIGNING_KEY_PRIVATE = PRIVATE_PEM


class TestReadingWhatWasPasted:
    @pytest.mark.parametrize(
        "pasted",
        [
            PLAYBACK_ID,
            f"https://stream.mux.com/{PLAYBACK_ID}.m3u8",
            f"https://stream.mux.com/{PLAYBACK_ID}.m3u8?token=abc",
            f"https://image.mux.com/{PLAYBACK_ID}/thumbnail.jpg",
        ],
    )
    def test_every_shape_a_teacher_might_paste(self, pasted):
        """They paste what is in front of them — the bare id, the stream link,
        the thumbnail link. Refusing two of the three teaches people the field
        is fussy rather than that they made a mistake."""
        assert playback_id_from(pasted) == PLAYBACK_ID

    @pytest.mark.parametrize(
        "pasted",
        ["", "   ", "short", "https://youtube.com/watch?v=abc123", "https://example.com/a.mp4"],
    )
    def test_what_is_not_a_playback_id(self, pasted):
        assert playback_id_from(pasted) == ""

    def test_a_bad_value_says_what_to_paste(self):
        with pytest.raises(serializers.ValidationError) as caught:
            validate_playback_id("https://youtube.com/watch?v=abc")
        assert "Mux dashboard" in str(caught.value)

    def test_an_empty_value_is_allowed(self):
        assert validate_playback_id("") == ""


class TestSigning:
    @signing_on
    def test_a_token_is_a_real_rs256_jwt_for_that_video(self):
        token = sign_playback(PLAYBACK_ID)

        claims = jwt.decode(token, PUBLIC_KEY, algorithms=["RS256"], audience="v")

        assert claims["sub"] == PLAYBACK_ID
        assert claims["aud"] == "v"
        assert claims["kid"] == "test-key-id"
        assert claims["exp"] > time.time()

    @signing_on
    def test_a_thumbnail_gets_its_own_audience(self):
        """Each kind of asset needs its own token; a video token will not open
        a thumbnail."""
        token = sign_playback(PLAYBACK_ID, audience="t")
        claims = jwt.decode(token, PUBLIC_KEY, algorithms=["RS256"], audience="t")
        assert claims["aud"] == "t"

    @signing_on
    def test_the_token_expires(self):
        token = sign_playback(PLAYBACK_ID, ttl=1)
        time.sleep(2)
        with pytest.raises(jwt.ExpiredSignatureError):
            jwt.decode(token, PUBLIC_KEY, algorithms=["RS256"], audience="v")

    @override_settings(
        MUX_SIGNING_KEY_ID="test-key-id",
        MUX_SIGNING_KEY_PRIVATE=base64.b64encode(PRIVATE_PEM.encode()).decode(),
    )
    def test_a_base64_key_works_too(self):
        """Mux hands the key out base64-encoded. Whoever sets the variable will
        paste whichever form they were shown."""
        token = sign_playback(PLAYBACK_ID)
        assert jwt.decode(token, PUBLIC_KEY, algorithms=["RS256"], audience="v")["sub"] == PLAYBACK_ID

    @override_settings(MUX_SIGNING_KEY_ID="", MUX_SIGNING_KEY_PRIVATE="")
    def test_with_no_key_it_signs_nothing_rather_than_crashing(self):
        """A local checkout without Mux credentials should fall back, not take
        the lesson page down."""
        assert is_configured() is False
        assert sign_playback(PLAYBACK_ID) == ""
        payload = playback_payload(PLAYBACK_ID)
        assert payload["signed"] is False
        assert "token=" not in payload["streamUrl"]

    @signing_on
    def test_the_payload_carries_signed_urls(self):
        payload = playback_payload(PLAYBACK_ID)

        assert payload["signed"] is True
        assert payload["streamUrl"].startswith(f"https://stream.mux.com/{PLAYBACK_ID}.m3u8?token=")
        assert "token=" in payload["thumbnailUrl"]
        assert payload["expiresIn"] > 0

    def test_a_lesson_with_no_video_has_no_payload(self):
        assert playback_payload("") is None


# --- The gate ------------------------------------------------------------------


def a_paid_course():
    category, _ = Category.objects.get_or_create(name="Programming")
    subcategory, _ = Subcategory.objects.get_or_create(category=category, name="Python")
    teacher_user = User.objects.create_user(
        email="t@mux.dev", username="tmux", display_name="T", password="x", role="teacher"
    )
    teacher = TeacherProfile.objects.create(user=teacher_user, program="Tech", track="Python")
    course = Course.objects.create(
        teacher=teacher,
        category=category,
        subcategory=subcategory,
        title="Paid Python",
        subtitle="s",
        overview="o",
        scheme_of_work="w",
        price=Decimal("25000"),
        status="published",
        visibility="visible",
    )
    section = Section.objects.create(
        course=course, title="Paid", description="d", order=1, is_published=True, access_type="paid"
    )
    lesson = Lesson.objects.create(
        section=section,
        title="Locked lesson",
        content_type="video",
        mux_playback_id=PLAYBACK_ID,
        order=1,
        is_published=True,
    )
    return course, lesson


def a_student(email="s@mux.dev"):
    user = User.objects.create_user(
        email=email, username=email.split("@")[0], display_name="S", password="x", role="student"
    )
    return StudentProfile.objects.create(user=user)


def client_for(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user=user)
    return client


class TestOnlyThePaidGetAToken:
    def test_a_student_who_paid_gets_a_signed_url(self, signing, db):
        course, lesson = a_paid_course()
        student = a_student()
        Enrollment.objects.create(
            student=student, course=course, access_source="payment", status="active"
        )

        res = client_for(student.user).get(f"/api/student/lessons/{lesson.id}/")

        assert res.status_code == 200
        assert res.data["lesson"]["mux"]["signed"] is True
        assert res.data["lesson"]["mux"]["playbackId"] == PLAYBACK_ID
        assert "token=" in res.data["lesson"]["mux"]["streamUrl"]

    def test_a_student_who_has_not_paid_gets_nothing(self, signing, db):
        """The whole point. No token, no playback id, nothing to copy."""
        _, lesson = a_paid_course()
        student = a_student("broke@mux.dev")

        res = client_for(student.user).get(f"/api/student/lessons/{lesson.id}/")

        assert res.status_code == 200
        assert res.data["lesson"]["mux"] is None
        assert res.data["lesson"]["videoUrl"] == ""

    def test_a_signed_out_visitor_gets_nothing(self, signing, db):
        _, lesson = a_paid_course()

        res = client_for().get(f"/api/student/lessons/{lesson.id}/")

        assert res.data["lesson"]["mux"] is None

    def test_a_revoked_enrolment_gets_nothing(self, signing, db):
        """After a refund. The enrolment row is still there, revoked."""
        course, lesson = a_paid_course()
        student = a_student("refunded@mux.dev")
        Enrollment.objects.create(
            student=student, course=course, access_source="payment", status="revoked"
        )

        res = client_for(student.user).get(f"/api/student/lessons/{lesson.id}/")

        assert res.data["lesson"]["mux"] is None

    def test_a_free_preview_lesson_plays_for_anybody(self, signing, db):
        course, lesson = a_paid_course()
        lesson.is_previewable = True
        lesson.save(update_fields=["is_previewable"])

        res = client_for().get(f"/api/student/lessons/{lesson.id}/")

        assert res.data["lesson"]["mux"]["signed"] is True

    def test_each_request_mints_a_fresh_token(self, signing, db):
        """Tokens are not stored. A link that leaks is dead once it expires,
        and nothing keeps a copy alive."""
        course, lesson = a_paid_course()
        student = a_student()
        Enrollment.objects.create(
            student=student, course=course, access_source="payment", status="active"
        )
        client = client_for(student.user)

        first = client.get(f"/api/student/lessons/{lesson.id}/").data["lesson"]["mux"]["token"]
        time.sleep(1)
        second = client.get(f"/api/student/lessons/{lesson.id}/").data["lesson"]["mux"]["token"]

        assert first != second
