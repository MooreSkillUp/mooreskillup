"""Saving a course with a banner must not mangle its lists.

A save carrying an image is multipart, so the studio sends tags, tech stack and
outcomes as JSON strings. Parsing them into a form's own storage kept only the
last element, so a tech stack of ["Python", "VS Code", "Pip", "Terminal",
"JSON"] arrived as the string "JSON" and the course refused to save with
"tech stack: Value must be valid JSON".
"""

import io
import json

import pytest
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.accounts.models import TeacherProfile, User
from apps.categories.models import Category, Subcategory
from apps.courses.models import Course

TECH_STACK = ["Python", "VS Code", "Pip", "Terminal", "JSON"]


def an_image():
    buffer = io.BytesIO()
    Image.new("RGB", (120, 63), (252, 98, 4)).save(buffer, format="PNG")
    buffer.seek(0)
    return SimpleUploadedFile("banner.png", buffer.read(), content_type="image/png")


@pytest.fixture
def course(db):
    user = User.objects.create_user(
        email="multipart@test.dev", username="multipart", display_name="T", password="pass12345", role="teacher"
    )
    teacher = TeacherProfile.objects.create(user=user)
    category = Category.objects.create(name="Programming Languages")
    return Course.objects.create(
        teacher=teacher,
        category=category,
        subcategory=Subcategory.objects.create(category=category, name="Python"),
        title="Python for Beginners",
        status="draft",
    )


@pytest.fixture
def client(course):
    api = APIClient()
    api.force_authenticate(user=course.teacher.user)
    return api


def test_a_tech_stack_sent_with_a_banner_keeps_every_entry(client, course):
    response = client.patch(
        f"/api/teacher/courses/{course.id}/",
        {"tech_stack": json.dumps(TECH_STACK), "bannerImage": an_image()},
        format="multipart",
    )

    assert response.status_code == 200, response.data
    course.refresh_from_db()
    assert course.tech_stack == TECH_STACK


def test_tags_sent_with_a_banner_survive_too(client, course):
    response = client.patch(
        f"/api/teacher/courses/{course.id}/",
        {"tags": json.dumps(["Python", "Programming", "Python Basics"]), "bannerImage": an_image()},
        format="multipart",
    )

    assert response.status_code == 200, response.data
    course.refresh_from_db()
    assert sorted(tag.name for tag in course.tags.all()) == ["Programming", "Python", "Python Basics"]


def test_a_single_entry_list_is_still_a_list(client, course):
    """One chip is the case a form is most likely to flatten into plain text."""
    response = client.patch(
        f"/api/teacher/courses/{course.id}/",
        {"tech_stack": json.dumps(["Python"]), "bannerImage": an_image()},
        format="multipart",
    )

    assert response.status_code == 200, response.data
    course.refresh_from_db()
    assert course.tech_stack == ["Python"]


def test_the_same_lists_still_work_as_plain_json(client, course):
    response = client.patch(
        f"/api/teacher/courses/{course.id}/",
        {"tech_stack": TECH_STACK, "tags": ["Python"]},
        format="json",
    )

    assert response.status_code == 200, response.data
    course.refresh_from_db()
    assert course.tech_stack == TECH_STACK
