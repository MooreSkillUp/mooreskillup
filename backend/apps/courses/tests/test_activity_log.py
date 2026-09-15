"""An editing session is one activity entry, not one per autosave.

The studio autosaves every twelve seconds, and each save wrote its own
"Updated course" entry. Seen on the admin dashboard: the same line four times in
a few minutes, pushing registrations and submissions out of the feed.
"""

from datetime import timedelta

import pytest
from django.core.cache import cache
from django.utils import timezone

from apps.courses.models import TeacherActivityLog

from .test_workflow import client_for, make_full_course, make_teacher


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def editing(db):
    from apps.categories.models import Category, Subcategory

    category = Category.objects.create(name="Web")
    subcategory = Subcategory.objects.create(category=category, name="React")
    user, profile = make_teacher()
    course = make_full_course(profile, category, subcategory)
    return client_for(user), course


def save(client, course, title):
    response = client.patch(f"/api/teacher/courses/{course.id}/", {"title": title}, format="json")
    assert response.status_code == 200, response.data


def test_repeated_saves_refresh_one_entry(editing):
    client, course = editing
    for title in ("First draft", "Second draft", "Third draft"):
        save(client, course, title)

    entries = TeacherActivityLog.objects.filter(course=course, activity_type="edit-course")
    assert entries.count() == 1
    assert entries.get().message == "Updated course Third draft"


def test_a_later_session_gets_its_own_entry(editing):
    """Coming back the next day is a new piece of work worth seeing."""
    client, course = editing
    save(client, course, "Monday")
    TeacherActivityLog.objects.filter(course=course).update(
        created_at=timezone.now() - timedelta(hours=2)
    )

    save(client, course, "Tuesday")

    assert TeacherActivityLog.objects.filter(course=course, activity_type="edit-course").count() == 2
