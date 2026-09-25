"""Starting a course in the studio must save.

The studio creates "Section 1" the moment a teacher starts a course, before
they have written a description. The API required one, so the very first save
of every new course failed — the course row was created, its section was not,
and the teacher was told only "Request failed".
"""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import TeacherProfile, User
from apps.categories.models import Category, Subcategory
from apps.courses.models import Course


@pytest.fixture
def teacher(db):
    user = User.objects.create_user(
        email="newteacher@test.dev",
        username="newteacher",
        display_name="New Teacher",
        password="pass12345",
        role="teacher",
    )
    return TeacherProfile.objects.create(user=user, program="Programming Languages", track="Python")


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


def test_the_first_section_saves_without_a_description(client, course):
    response = client.post(
        f"/api/teacher/courses/{course.id}/sections/",
        {"title": "Section 1", "description": "", "access_type": "free", "is_published": True},
        format="json",
    )

    assert response.status_code == 201, response.data
    assert course.sections.count() == 1


def test_a_description_is_still_kept_when_given(client, course):
    response = client.post(
        f"/api/teacher/courses/{course.id}/sections/",
        {"title": "Getting started", "description": "Install Python and run your first program.", "access_type": "free"},
        format="json",
    )

    assert response.status_code == 201
    assert course.sections.first().description.startswith("Install Python")


def test_a_project_saves_without_a_description(client, course):
    section = course.sections.create(title="Section 1", description="", order=1)

    response = client.post(
        f"/api/teacher/sections/{section.id}/projects/",
        {"title": "Your first project", "description": "", "submission_type": "whatsapp_group"},
        format="json",
    )

    assert response.status_code == 201, response.data
