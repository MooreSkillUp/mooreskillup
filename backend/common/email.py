"""Reusable transactional email helper.

One flexible template covers every transactional email (receipts, confirmations,
approvals, credentials, ticket replies). Never raises — emailing must not break
the action that triggered it. In dev the console backend just prints the message.
"""

import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def send_transactional_email(
    *,
    to_email,
    subject,
    heading,
    greeting="",
    intro="",
    lines=None,
    button_label="",
    button_url="",
    details=None,
    footer="",
):
    """Render and send a transactional email. Returns True on success.

    `details` is a list of {"label": ..., "value": ...} rows.
    """
    if not to_email:
        return False

    context = {
        "site_name": getattr(settings, "EMAIL_SITE_NAME", "MooreSkillUp"),
        "heading": heading,
        "greeting": greeting,
        "intro": intro,
        "lines": lines or [],
        "button_label": button_label,
        "button_url": button_url,
        "details": details or [],
        "footer": footer,
    }
    try:
        text_body = render_to_string("emails/transactional.txt", context)
        html_body = render_to_string("emails/transactional.html", context)
        message = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to_email],
        )
        message.attach_alternative(html_body, "text/html")
        message.send()
        return True
    except Exception:
        logger.exception("Transactional email failed for %s (%s)", to_email, subject)
        return False


def frontend_url(path=""):
    base = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    return f"{base}{path}"
