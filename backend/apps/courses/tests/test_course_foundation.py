"""Phase 2 T1 tests: expanded course model, lesson types, assignments, projects."""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import TeacherProfile, User
from apps.categories.models import Category, Subcategory
from apps.courses.models import Course, Lesson, Project, Section, Task


def make_teacher(email="teacher@test.dev"):
    user = User.objects.create_user(
        email=email,
        username=email.split("@")[0],
        display_name="Test Teacher",
        password="pass12345",
        role="teacher",
    )
    profile = TeacherProfile.objects.create(user=user, program="Web Development", track="React")
    return user, profile


def make_taxonomy():
    category = Category.objects.create(name="Web Development")
    subcategory = Subcategory.objects.create(category=category, name="React")
    return category, subcategory


def client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def teacher(db):
    return make_teacher()


@pytest.fixture
def taxonomy(db):
    return make_taxonomy()


def make_course(profile, category, subcategory, **extra):
    defaults = dict(
        teacher=profile,
        category=category,
        subcategory=subcategory,
        title="Mastering React",
        subtitle="From zero to production",
        overview="A complete course.",
        scheme_of_work="Week by week.",
    )
    defaults.update(extra)
    return Course.objects.create(**defaults)


class TestCourseModelFields:
    def test_new_fields_have_sensible_defaults(self, teacher, taxonomy):
        _, profile = teacher
        category, subcategory = taxonomy
        course = make_course(profile, category, subcategory)
        assert course.level == "beginner"
        assert course.discount_price is None
        assert course.tech_stack == []
        assert course.certificate_enabled is False
        assert course.meta_title == ""

    def test_course_serializer_exposes_camelcase_fields(self, teacher, taxonomy):
        user, profile = teacher
        category, subcategory = taxonomy
        course = make_course(
            profile,
            category,
            subcategory,
            level="advanced",
            discount_price=15000,
            tech_stack=["React", "TypeScript"],
            certificate_enabled=True,
            meta_title="Learn React",
        )
        res = client_for(user).get(f"/api/teacher/courses/{course.id}/")
        assert res.status_code == 200
        data = res.json()
        assert data["level"] == "advanced"
        assert data["techStack"] == ["React", "TypeScript"]
        assert data["certificateEnabled"] is True
        assert data["metaTitle"] == "Learn React"
        assert str(data["discountPrice"]) == "15000.00"

    def test_teacher_can_update_new_fields_via_api(self, teacher, taxonomy):
        user, profile = teacher
        category, subcategory = taxonomy
        course = make_course(profile, category, subcategory)
        res = client_for(user).patch(
            f"/api/teacher/courses/{course.id}/",
            {"techStack": ["Next.js"], "level": "intermediate", "certificateEnabled": True},
            format="json",
        )
        assert res.status_code == 200
        course.refresh_from_db()
        assert course.tech_stack == ["Next.js"]
        assert course.level == "intermediate"
        assert course.certificate_enabled is True


class TestLessonResourceType:
    def test_resource_lesson_stores_links(self, teacher, taxonomy):
        user, profile = teacher
        category, subcategory = taxonomy
        course = make_course(profile, category, subcategory)
        section = Section.objects.create(course=course, title="Intro", description="", order=1)
        links = [
            {"type": "github", "title": "Starter repo", "url": "https://github.com/msu/starter"},
            {"type": "pdf", "title": "Slides", "url": "https://example.com/slides.pdf"},
        ]
        res = client_for(user).post(
            f"/api/teacher/sections/{section.id}/lessons/",
            {"title": "Resources", "content_type": "resource", "resourceLinks": links, "order": 1},
            format="json",
        )
        assert res.status_code == 201, res.json()
        lesson = Lesson.objects.get(id=res.json()["id"])
        assert lesson.content_type == "resource"
        assert lesson.resource_links == links


class TestAssignmentSubmission:
    def test_whatsapp_assignment_created(self, teacher, taxonomy):
        user, profile = teacher
        category, subcategory = taxonomy
        course = make_course(profile, category, subcategory)
        section = Section.objects.create(course=course, title="Practice", description="", order=1)
        res = client_for(user).post(
            f"/api/teacher/sections/{section.id}/tasks/",
            {
                "title": "Build a todo app",
                "instructions": "Make a todo app.",
                "submissionType": "whatsapp-group",
                "submissionUrl": "https://chat.whatsapp.com/abc123",
                "howToSubmit": "Drop your repo link in the group.",
                "order": 1,
            },
            format="json",
        )
        assert res.status_code == 201, res.json()
        task = Task.objects.get(id=res.json()["id"])
        assert task.submission_type == "whatsapp_group"
        assert task.submission_url == "https://chat.whatsapp.com/abc123"


class TestProjects:
    def test_project_create_and_appears_in_course(self, teacher, taxonomy):
        user, profile = teacher
        category, subcategory = taxonomy
        course = make_course(profile, category, subcategory)
        section = Section.objects.create(course=course, title="Capstone", description="", order=1)
        res = client_for(user).post(
            f"/api/teacher/sections/{section.id}/projects/",
            {
                "title": "Final project",
                "description": "Build a full app.",
                "requirements": "Auth, CRUD, deploy.",
                "deliverables": "Live URL + repo.",
                "submissionUrl": "https://forms.gle/xyz",
                "order": 1,
            },
            format="json",
        )
        assert res.status_code == 201, res.json()
        project = Project.objects.get(id=res.json()["id"])
        assert project.section_id == section.id

        detail = client_for(user).get(f"/api/teacher/courses/{course.id}/")
        section_data = detail.json()["sections"][0]
        assert len(section_data["projects"]) == 1
        assert section_data["projects"][0]["title"] == "Final project"

    def test_teacher_cannot_touch_another_teachers_project(self, teacher, taxonomy):
        _, profile = teacher
        category, subcategory = taxonomy
        course = make_course(profile, category, subcategory)
        section = Section.objects.create(course=course, title="S", description="", order=1)
        project = Project.objects.create(section=section, title="P", description="d", order=1)

        other_user, _ = make_teacher(email="other@test.dev")
        res = client_for(other_user).get(f"/api/teacher/projects/{project.id}/")
        assert res.status_code == 404
