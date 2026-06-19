"""Course snapshot, restore, and duplication helpers."""

from django.db import transaction

from .models import Course, CourseVersion, Lesson, Project, Section, Task

COURSE_FIELDS = (
    "title",
    "subtitle",
    "overview",
    "scheme_of_work",
    "roadmap_link",
    "level",
    "price",
    "discount_price",
    "currency",
    "meta_title",
    "meta_description",
    "tech_stack",
    "certificate_enabled",
)


def snapshot_course(course):
    """Serialize a course's full structure into a plain dict."""
    sections = []
    for section in course.sections.all().order_by("order"):
        sections.append(
            {
                "title": section.title,
                "description": section.description,
                "order": section.order,
                "access_type": section.access_type,
                "is_published": section.is_published,
                "lessons": [
                    {
                        "title": lesson.title,
                        "content_type": lesson.content_type,
                        "video_url": lesson.video_url,
                        "text_content": lesson.text_content,
                        "resource_links": lesson.resource_links,
                        "tags": lesson.tags,
                        "duration_minutes": lesson.duration_minutes,
                        "order": lesson.order,
                        "is_previewable": lesson.is_previewable,
                        "is_published": lesson.is_published,
                    }
                    for lesson in section.lessons.all().order_by("order")
                ],
                "tasks": [
                    {
                        "title": task.title,
                        "instructions": task.instructions,
                        "submission_type": task.submission_type,
                        "submission_url": task.submission_url,
                        "how_to_submit": task.how_to_submit,
                        "due_date": task.due_date.isoformat() if task.due_date else None,
                        "resource_links": task.resource_links,
                        "order": task.order,
                        "is_required": task.is_required,
                    }
                    for task in section.tasks.all().order_by("order")
                ],
                "projects": [
                    {
                        "title": project.title,
                        "description": project.description,
                        "requirements": project.requirements,
                        "deliverables": project.deliverables,
                        "submission_url": project.submission_url,
                        "how_to_submit": project.how_to_submit,
                        "order": project.order,
                        "is_required": project.is_required,
                    }
                    for project in section.projects.all().order_by("order")
                ],
            }
        )
    return {"course": {field: _json_safe(getattr(course, field)) for field in COURSE_FIELDS}, "sections": sections}


def _json_safe(value):
    # Decimal price fields must be JSON-serializable.
    from decimal import Decimal

    if isinstance(value, Decimal):
        return str(value)
    return value


def save_course_version(course, user=None, note=""):
    last = course.versions.order_by("-version_number").first()
    next_number = (last.version_number if last else 0) + 1
    return CourseVersion.objects.create(
        course=course,
        version_number=next_number,
        note=note,
        snapshot=snapshot_course(course),
        created_by=user,
    )


def _build_nested(section, section_data):
    for lesson in section_data.get("lessons", []):
        Lesson.objects.create(section=section, **lesson)
    for task in section_data.get("tasks", []):
        Task.objects.create(section=section, **task)
    for project in section_data.get("projects", []):
        Project.objects.create(section=section, **project)


@transaction.atomic
def restore_course_from_snapshot(course, snapshot):
    """Replace the course's structure with a snapshot. Returns the course."""
    for field, value in snapshot.get("course", {}).items():
        setattr(course, field, value)
    course.status = "draft"
    course.visibility = "hidden"
    course.save()

    course.sections.all().delete()  # cascades to lessons/tasks/projects
    for section_data in snapshot.get("sections", []):
        section = Section.objects.create(
            course=course,
            title=section_data["title"],
            description=section_data["description"],
            order=section_data["order"],
            access_type=section_data["access_type"],
            is_published=section_data["is_published"],
        )
        _build_nested(section, section_data)
    return course


@transaction.atomic
def duplicate_course(course, teacher=None):
    """Create a new draft copy of a course (same owner unless overridden)."""
    snapshot = snapshot_course(course)
    new_course = Course.objects.create(
        teacher=teacher if teacher is not None else course.teacher,
        category=course.category,
        subcategory=course.subcategory,
        title=f"{course.title} (Copy)",
        subtitle=course.subtitle,
        overview=course.overview,
        scheme_of_work=course.scheme_of_work,
        roadmap_link=course.roadmap_link,
        level=course.level,
        price=course.price,
        discount_price=course.discount_price,
        currency=course.currency,
        meta_title=course.meta_title,
        meta_description=course.meta_description,
        tech_stack=course.tech_stack,
        certificate_enabled=course.certificate_enabled,
        status="draft",
        visibility="hidden",
    )
    for section_data in snapshot["sections"]:
        section = Section.objects.create(
            course=new_course,
            title=section_data["title"],
            description=section_data["description"],
            order=section_data["order"],
            access_type=section_data["access_type"],
            is_published=section_data["is_published"],
        )
        _build_nested(section, section_data)
    return new_course
