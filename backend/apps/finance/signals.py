"""Freeze a course's earning terms the moment it is published.

A signal rather than a call at each publish site: there are two routes that
publish a course today — the teacher's own submit-and-approve flow and the
admin's owned-course publish — and a third will be added eventually. Missing
one means a teacher silently earns nothing on that course, and nobody notices
until they query a payment that never came.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.courses.models import Course

from .models import freeze_terms_for


@receiver(post_save, sender=Course, dispatch_uid="finance.freeze_course_earning_terms")
def freeze_course_earning_terms(sender, instance, **kwargs):
    freeze_terms_for(instance)
