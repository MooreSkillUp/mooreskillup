"""Two teachers may want the same course title.

Course slugs are unique across the whole platform, and titles are not: "Python
for Beginners" is a name two people reach for. The second save used to hit the
database's unique constraint and return a 500 with no way to know what to
change.
"""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import TeacherProfile, User
from apps.categories.models import Category, Subcategory
from apps.courses.models import Course


@pytest.fixture
def classification(db):
    category = Category.objects.create(name="Programming Languages")
    return category, Subcategory.objects.create(category=category, name="Python")


def make_teacher(email):
    user = User.objects.create_user(
        email=email, username=email.split("@")[0], display_name="T", password="pass12345", role="teacher"
    )
    return TeacherProfile.objects.create(user=user)


def test_a_second_course_with_the_same_title_saves(db, classification):
    category, subcategory = classification
    Course.objects.create(
        teacher=make_teacher("first@test.dev"), category=category, subcategory=subcategory,
        title="Python for Beginners",
    )

    second = Course.objects.create(
        teacher=make_teacher("second@test.dev"), category=category, subcategory=subcategory,
        title="Python for Beginners",
    )

    assert second.slug == "python-for-beginners-2"


def test_the_first_course_keeps_the_clean_slug(db, classification):
    category, subcategory = classification

    first = Course.objects.create(
        teacher=make_teacher("a@test.dev"), category=category, subcategory=subcategory,
        title="Python for Beginners",
    )

    assert first.slug == "python-for-beginners"


def test_a_third_keeps_counting(db, classification):
    category, subcategory = classification
    for email in ("x@test.dev", "y@test.dev", "z@test.dev"):
        Course.objects.create(
            teacher=make_teacher(email), category=category, subcategory=subcategory,
            title="Python for Beginners",
        )

    assert sorted(Course.objects.values_list("slug", flat=True)) == [
        "python-for-beginners",
        "python-for-beginners-2",
        "python-for-beginners-3",
    ]


def test_saving_the_same_course_again_keeps_its_slug(db, classification):
    category, subcategory = classification
    course = Course.objects.create(
        teacher=make_teacher("keep@test.dev"), category=category, subcategory=subcategory,
        title="Python for Beginners",
    )

    course.subtitle = "Now with a subtitle"
    course.save()

    assert course.slug == "python-for-beginners"


def test_the_api_accepts_a_duplicate_title(db, classification):
    """The 500 a teacher actually hit, through the endpoint the studio calls."""
    category, subcategory = classification
    Course.objects.create(
        teacher=make_teacher("taken@test.dev"), category=category, subcategory=subcategory,
        title="Python for Beginners",
    )
    teacher = make_teacher("studio@test.dev")
    client = APIClient()
    client.force_authenticate(user=teacher.user)

    response = client.post(
        "/api/teacher/courses/",
        {
            "title": "Python for Beginners",
            "subtitle": "Write your first real programs",
            "category": str(category.id),
            "subcategory": str(subcategory.id),
            "level": "beginner",
            "price": 0,
            "status": "draft",
            "visibility": "hidden",
        },
        format="json",
    )

    assert response.status_code == 201, response.data
