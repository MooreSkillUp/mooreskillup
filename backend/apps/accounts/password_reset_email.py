import logging

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def send_password_reset_email(*, to_email: str, display_name: str, reset_url: str) -> None:
    site_name = getattr(settings, "EMAIL_SITE_NAME", "MooreSkillUp")
    context = {
        "display_name": display_name,
        "reset_url": reset_url,
        "site_name": site_name,
    }
    subject = f"Reset your {site_name} password"
    text_body = render_to_string("emails/password_reset.txt", context)
    html_body = render_to_string("emails/password_reset.html", context)
    send_mail(
        subject=subject,
        message=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[to_email],
        fail_silently=False,
        html_message=html_body,
    )


def try_send_password_reset_email(*, to_email: str, display_name: str, reset_url: str) -> bool:
    try:
        send_password_reset_email(to_email=to_email, display_name=display_name, reset_url=reset_url)
        return True
    except Exception:
        logger.exception("Password reset email failed for %s", to_email)
        return False
