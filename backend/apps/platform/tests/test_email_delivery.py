"""Whether mail actually leaves the building.

Production ran on Django's console backend for its whole life: `EMAIL_BACKEND`
defaulted to console and nothing in the Terraform or the deploy workflow set it
otherwise. Every teacher invite — which carries a generated temporary password
and is the only copy of it the teacher ever gets — was written to a container
log and delivered to nobody. Nothing failed, so nothing said so.

The rule lives in `common.mail_backend` as two plain functions, which is what
these call. Testing it by reloading the settings module was the obvious first
attempt and the wrong one: `base.py` runs `load_dotenv`, so a reload picks the
key back up out of `.env` and the test passes for a reason unrelated to the
code.
"""

from django.core import mail
from django.test import override_settings

from apps.accounts.models import TeacherProfile
from common.mail_backend import BREVO, CONSOLE, backend_delivers, choose_email_backend


def test_a_brevo_key_switches_on_real_delivery():
    backend = choose_email_backend("", "xkeysib-not-a-real-key")
    assert backend == BREVO
    assert backend_delivers(backend) is True


def test_no_key_means_no_delivery_and_says_so():
    """The console backend is a legitimate default — it must not pretend."""
    backend = choose_email_backend("", "")
    assert backend == CONSOLE
    assert backend_delivers(backend) is False


def test_an_explicit_backend_still_wins():
    """Naming a backend outright overrides the key, in both directions."""
    silenced = choose_email_backend("django.core.mail.backends.locmem.EmailBackend", "key")
    assert silenced == "django.core.mail.backends.locmem.EmailBackend"
    assert backend_delivers(silenced) is False

    other = choose_email_backend("django.core.mail.backends.smtp.EmailBackend", "")
    assert other == "django.core.mail.backends.smtp.EmailBackend"
    assert backend_delivers(other) is True


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
def test_creating_a_teacher_sends_them_their_password(db):
    """The invite is the only copy of the temporary password a teacher gets."""
    from apps.accounts.serializers import AdminTeacherCreateSerializer
    from apps.accounts.views import _email_new_account_credentials

    serializer = AdminTeacherCreateSerializer(
        data={
            "email": "new.teacher@example.test",
            "displayName": "New Teacher",
            "program": "Web Development",
            "track": "Frontend Development",
        }
    )
    assert serializer.is_valid(), serializer.errors
    teacher = serializer.save()
    temp_password = getattr(teacher, "_generated_password", None)
    assert temp_password, "a teacher must be created with a password to send"

    mail.outbox.clear()
    _email_new_account_credentials(teacher.user, temp_password, "teacher")

    assert len(mail.outbox) == 1, "the invite must actually be sent"
    message = mail.outbox[0]
    assert message.to == ["new.teacher@example.test"]
    assert temp_password in message.body, "the password has to be in the email"

    # For a teacher the flag lives on the profile, not the user row.
    profile = TeacherProfile.objects.get(user__email="new.teacher@example.test")
    assert profile.must_change_password is True
