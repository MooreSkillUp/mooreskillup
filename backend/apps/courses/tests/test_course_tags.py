"""Tags a teacher types must not block saving a course.

The studio lets a teacher type any tag and press enter. The API used to accept
only tags that already existed, so the first teacher to type "Python" was told
"Object with name=Python does not exist" and could not save the course at all
— a message that blamed them for a row we had never created.
"""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import TeacherProfile, User
from apps.categories.models import Category, Subcategory
from apps.courses.models import Course, CourseTag


@pytest.fixture
def teacher(db):
    user = User.objects.create_user(
        email="teacher@test.dev",
        username="teacher",
        display_name="A Teacher",
        password="pass12345",
        role="teacher",
    )
    return TeacherProfile.objects.create(user=user)


@pytest.fixture
def course(db, teacher):
    category = Category.objects.create(name="Programming Languages")
    return Course.objects.create(
        teacher=teacher,
        category=category,
        subcategory=Subcategory.objects.create(category=category, name="Python"),
        title="Python for Beginners",
        status="draft",
    )


@pytest.fixture
def client(teacher):
    api = APIClient()
    api.force_authenticate(user=teacher.user)
    return api


def test_a_tag_nobody_has_used_before_saves(client, course):
    response = client.patch(f"/api/teacher/courses/{course.id}/", {"tags": ["Python", "Pip"]}, format="json")

    assert response.status_code == 200, response.data
    course.refresh_from_db()
    assert sorted(tag.name for tag in course.tags.all()) == ["Pip", "Python"]


def test_an_existing_tag_is_reused_not_duplicated(client, course):
    CourseTag.objects.create(name="Python")

    client.patch(f"/api/teacher/courses/{course.id}/", {"tags": ["Python"]}, format="json")

    assert CourseTag.objects.filter(name__iexact="python").count() == 1


def test_case_does_not_create_a_second_tag(client, course):
    """Python and python would look like one tag in a filter list and behave as two."""
    CourseTag.objects.create(name="Python")

    client.patch(f"/api/teacher/courses/{course.id}/", {"tags": ["python"]}, format="json")

    assert CourseTag.objects.filter(name__iexact="python").count() == 1
    assert course.tags.first().name == "Python"


def test_surrounding_spaces_do_not_create_a_separate_tag(client, course):
    CourseTag.objects.create(name="Django")

    client.patch(f"/api/teacher/courses/{course.id}/", {"tags": ["  Django  "]}, format="json")

    assert CourseTag.objects.filter(name__iexact="django").count() == 1
