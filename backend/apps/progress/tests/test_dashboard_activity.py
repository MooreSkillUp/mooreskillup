

def test_continue_learning_points_at_the_next_unfinished_lesson(db):
    """A student most of the way through must not be sent back to lesson one.

    continueLearning used to return `enrollment.last_lesson` — the lesson most
    recently *opened* — while the dashboard labelled it "Next lesson". Once that
    lesson was finished, the card pointed backwards at completed material.
    """
    from apps.accounts.models import StudentProfile, User
    from apps.categories.models import Category, Subcategory
    from apps.courses.models import Course, Lesson, Section
    from apps.enrollments.models import Enrollment
    from apps.progress.models import LessonProgress
    from apps.progress.views import _next_lesson_for

    user = User.objects.create_user(
        email="next@test.dev", username="nextuser", display_name="Next User", password="password123"
    )
    student = StudentProfile.objects.create(user=user)
    category = Category.objects.create(name="Web")
    subcategory = Subcategory.objects.create(category=category, name="Frontend")
    course = Course.objects.create(
        category=category, subcategory=subcategory, title="Course", status="published"
    )
    section = Section.objects.create(course=course, title="S1", description="", order=0)
    first = Lesson.objects.create(section=section, title="One", content_type="text", order=0)
    second = Lesson.objects.create(section=section, title="Two", content_type="text", order=1)
    third = Lesson.objects.create(section=section, title="Three", content_type="text", order=2)

    enrollment = Enrollment.objects.create(student=student, course=course, access_source="free")

    # Finished the first two, and the last one opened was the second.
    for lesson in (first, second):
        LessonProgress.objects.create(enrollment=enrollment, lesson=lesson, status="completed")
    enrollment.last_lesson = second
    enrollment.save(update_fields=["last_lesson"])

    # Not "Two" again — the next one they have not done.
    assert _next_lesson_for(enrollment) == third

    # An unfinished last lesson is resumed rather than skipped.
    LessonProgress.objects.create(enrollment=enrollment, lesson=third, status="in_progress")
    enrollment.last_lesson = third
    enrollment.save(update_fields=["last_lesson"])
    assert _next_lesson_for(enrollment) == third
