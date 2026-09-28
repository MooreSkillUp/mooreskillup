"""The catalogue sends cards, not curricula.

Found by publishing a real course. The public course list returned every
section, every lesson and every lesson's full text for every published course
— so one course of thirty-eight text lessons more than doubled the payload on
its own, and it would have grown with every lesson anyone wrote.

Nothing on a course card reads any of it. The card shows a title, a price, a
level and a lesson count, and the count is computed on the server.

This matters more than a typical payload saving, because the students it is for
are on mobile data — and the course that exposed it teaches, in section 1, that
a page asking for too much is a real failure rather than a slow server.
"""

from decimal import Decimal

import pytest
from rest_framework.renderers import JSONRenderer
from rest_framework.test import APIClient

from apps.accounts.models import TeacherProfile, User
from apps.categories.models import Category, Subcategory
from apps.courses.models import Course, Lesson, Section
from apps.courses.serializers import CourseCardSerializer, CourseSerializer


@pytest.fixture
def a_heavy_course(db):
    """A course shaped like Tech Foundations: many lessons, lots of text."""
    category, _ = Category.objects.get_or_create(name="Programming")
    subcategory, _ = Subcategory.objects.get_or_create(category=category, name="Python")
    user = User.objects.create_user(
        email="t@cat.dev", username="tcat", display_name="T", password="x", role="teacher"
    )
    teacher = TeacherProfile.objects.create(user=user, program="Tech", track="Python")
    course = Course.objects.create(
        teacher=teacher,
        category=category,
        subcategory=subcategory,
        title="Heavy Course",
        subtitle="s",
        overview="o",
        scheme_of_work="w",
        price=Decimal("0"),
        status="published",
        visibility="visible",
    )
    for section_index in range(5):
        section = Section.objects.create(
            course=course,
            title=f"Section {section_index}",
            description="d",
            order=section_index + 1,
            is_published=True,
            access_type="free",
        )
        for lesson_index in range(8):
            Lesson.objects.create(
                section=section,
                title=f"Lesson {section_index}.{lesson_index}",
                content_type="text",
                text_content="<p>" + ("word " * 400) + "</p>",
                order=lesson_index + 1,
                is_published=True,
            )
    return course


def size_of(serializer_class, queryset):
    return len(JSONRenderer().render(serializer_class(queryset, many=True).data))


class TestTheCardIsSmall:
    def test_a_card_is_a_fraction_of_the_full_course(self, a_heavy_course, db):
        published = Course.objects.filter(status="published", visibility="visible")

        full = size_of(CourseSerializer, published)
        card = size_of(CourseCardSerializer, published)

        assert card < full / 4, (
            f"the card is {card} bytes against {full} — the saving has been lost"
        )

    def test_the_card_carries_no_lesson_text(self, a_heavy_course, db):
        published = Course.objects.filter(status="published", visibility="visible")
        rendered = JSONRenderer().render(CourseCardSerializer(published, many=True).data)
        assert b"word word word" not in rendered

    def test_the_card_has_no_sections_at_all(self, a_heavy_course, db):
        card = CourseCardSerializer(a_heavy_course).data
        assert "sections" not in card


class TestTheCardStillHasWhatItRenders:
    def test_the_lesson_count_survives(self, a_heavy_course, db):
        """The count is computed on the server, so dropping sections does not
        take it with them."""
        card = CourseCardSerializer(a_heavy_course).data
        assert card["totalLessons"] == 40

    @pytest.mark.parametrize(
        "field", ["id", "title", "subtitle", "price", "level", "totalLessons"]
    )
    def test_the_fields_a_card_shows_are_present(self, field, a_heavy_course, db):
        assert field in CourseCardSerializer(a_heavy_course).data


class TestThroughTheApi:
    def test_the_public_list_sends_cards(self, a_heavy_course, db):
        response = APIClient().get("/api/courses/")

        assert response.status_code == 200
        rows = response.data.get("results", response.data)
        assert rows, "expected at least one published course"
        assert "sections" not in rows[0]

    def test_the_detail_view_still_sends_the_curriculum(self, a_heavy_course, db):
        """The saving must not cost the course page its contents."""
        response = APIClient().get(f"/api/courses/{a_heavy_course.id}/")

        assert response.status_code == 200
        assert "sections" in response.data
        assert len(response.data["sections"]) == 5
