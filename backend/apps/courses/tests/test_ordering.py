"""Order has one writer, and a position can never collide.

The studio saved each section's and lesson's position with its own PATCH. The
positions are unique per parent, so moving a row into a slot another row still
held violated the constraint mid-save and returned a 500: nothing could be
reordered, and a course numbered from zero failed on every autosave. Reproduced
in the browser as `IntegrityError ... Key (course_id, "order")=(…, 1) already
exists` on an edit to a course subtitle.
"""

import pytest
from django.core.cache import cache

from apps.courses.models import Course, Lesson, Project, Section, Task

from .test_workflow import client_for, make_full_course, make_teacher


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def course(db):
    from apps.categories.models import Category, Subcategory

    category = Category.objects.create(name="Web")
    subcategory = Subcategory.objects.create(category=category, name="React")
    user, profile = make_teacher()
    course = make_full_course(profile, category, subcategory)  # one section at order 1
    first = course.sections.get()
    second = Section.objects.create(course=course, title="S2", description="d", order=2)
    return {"user": user, "profile": profile, "course": course, "first": first, "second": second,
            "category": category, "subcategory": subcategory}


def reorder_sections(user, course, ids):
    return client_for(user).post(
        f"/api/teacher/courses/{course.id}/sections/reorder/",
        {"sections": [str(pk) for pk in ids]},
        format="json",
    )


def test_two_sections_can_swap_places(course):
    response = reorder_sections(course["user"], course["course"], [course["second"].id, course["first"].id])
    assert response.status_code == 204

    course["first"].refresh_from_db()
    course["second"].refresh_from_db()
    assert (course["second"].order, course["first"].order) == (1, 2)


def test_rows_numbered_from_zero_are_renumbered_rather_than_failing(course):
    """How the seeded courses were built — and why every save of one 500'd."""
    Section.objects.filter(id=course["first"].id).update(order=0)
    Section.objects.filter(id=course["second"].id).update(order=1)

    response = reorder_sections(course["user"], course["course"], [course["first"].id, course["second"].id])
    assert response.status_code == 204
    assert list(course["course"].sections.values_list("order", flat=True)) == [1, 2]


def test_a_patch_cannot_move_a_row_into_an_occupied_slot(course):
    """The original failure. The edit saves; the position is left alone."""
    response = client_for(course["user"]).patch(
        f"/api/teacher/sections/{course['first'].id}/",
        {"title": "Renamed", "order": 2},
        format="json",
    )
    assert response.status_code == 200, response.data

    course["first"].refresh_from_db()
    assert course["first"].title == "Renamed"
    assert course["first"].order == 1


def test_a_new_section_is_appended_whatever_position_the_client_sends(course):
    response = client_for(course["user"]).post(
        f"/api/teacher/courses/{course['course'].id}/sections/",
        {"title": "S3", "description": "d", "order": 1, "access_type": "free"},
        format="json",
    )
    assert response.status_code == 201, response.data
    assert Section.objects.get(id=response.data["id"]).order == 3


def test_a_new_lesson_is_appended_too(course):
    response = client_for(course["user"]).post(
        f"/api/teacher/sections/{course['first'].id}/lessons/",
        {"title": "L2", "content_type": "text", "text_content": "notes", "order": 1},
        format="json",
    )
    assert response.status_code == 201, response.data
    assert Lesson.objects.get(id=response.data["id"]).order == 2


def test_lessons_tasks_and_projects_reorder_in_one_call(course):
    section = course["first"]
    l1 = section.lessons.get()
    t1 = section.tasks.get()
    p1 = section.projects.get()
    l2 = Lesson.objects.create(section=section, title="L2", content_type="text", order=2)
    t2 = Task.objects.create(
        section=section, title="A2", instructions="do", submission_type="whatsapp_group",
        submission_url="https://chat.whatsapp.com/y", order=2,
    )
    p2 = Project.objects.create(section=section, title="P2", description="build", order=2)

    response = client_for(course["user"]).post(
        f"/api/teacher/sections/{section.id}/reorder/",
        {
            "lessons": [str(l2.id), str(l1.id)],
            "tasks": [str(t2.id), str(t1.id)],
            "projects": [str(p2.id), str(p1.id)],
        },
        format="json",
    )
    assert response.status_code == 204

    for first, second in ((l2, l1), (t2, t1), (p2, p1)):
        first.refresh_from_db()
        second.refresh_from_db()
        assert (first.order, second.order) == (1, 2)


def test_a_partial_list_is_refused_and_changes_nothing(course):
    """Unnamed rows would be left with no defined position."""
    response = reorder_sections(course["user"], course["course"], [course["second"].id])
    assert response.status_code == 400
    assert list(course["course"].sections.values_list("title", flat=True)) == ["S1", "S2"]


def test_a_failure_in_one_list_rolls_back_the_others(course):
    """Lessons, tasks and projects are one decision — all of it or none."""
    section = course["first"]
    l1 = section.lessons.get()
    l2 = Lesson.objects.create(section=section, title="L2", content_type="text", order=2)

    response = client_for(course["user"]).post(
        f"/api/teacher/sections/{section.id}/reorder/",
        {"lessons": [str(l2.id), str(l1.id)], "tasks": []},  # tasks list omits A1
        format="json",
    )
    assert response.status_code == 400
    l1.refresh_from_db()
    assert l1.order == 1, "the lesson reorder must not survive a rejected task list"


def test_ids_from_another_course_are_refused(course):
    _, other_profile = make_teacher("other@test.dev")
    # Built by hand: make_full_course reuses one title, and slugs are unique.
    other_course = Course.objects.create(
        teacher=other_profile, category=course["category"], subcategory=course["subcategory"],
        title="Someone else's course", subtitle="s", overview="o", scheme_of_work="w",
    )
    foreign = Section.objects.create(course=other_course, title="Theirs", description="d", order=1)

    response = reorder_sections(course["user"], course["course"], [course["first"].id, foreign.id])
    assert response.status_code == 400


def test_a_teacher_cannot_reorder_someone_elses_course(course):
    other_user, _ = make_teacher("intruder@test.dev")
    response = reorder_sections(other_user, course["course"], [course["second"].id, course["first"].id])
    assert response.status_code == 404


def test_admin_owned_courses_reorder_through_the_admin_studio(course):
    """The admin studio saves the same way, through its own endpoints."""
    from common.rbac import SUPER_ADMIN

    from .test_workflow import make_admin

    admin = make_admin(SUPER_ADMIN, "owner@test.dev")
    owned = course["course"]
    owned.teacher = None
    owned.save(update_fields=["teacher"])

    response = client_for(admin).post(
        f"/api/admin/courses/{owned.id}/sections/reorder/",
        {"sections": [str(course["second"].id), str(course["first"].id)]},
        format="json",
    )
    assert response.status_code == 204, getattr(response, "data", None)
    course["second"].refresh_from_db()
    assert course["second"].order == 1

    lesson = course["first"].lessons.get()
    response = client_for(admin).post(
        f"/api/admin/sections/{course['first'].id}/reorder/",
        {"lessons": [str(lesson.id)]},
        format="json",
    )
    assert response.status_code == 204, getattr(response, "data", None)
