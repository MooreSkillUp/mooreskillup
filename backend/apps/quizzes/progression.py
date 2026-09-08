"""What a student is allowed to reach, and when they have finished.

Two separate questions that are easy to conflate:

* **Access** — can this student open this section? Answered by payment, and in a
  sequential course also by whether the previous section is done.
* **Completion** — has this student finished the course, and have they earned
  the certificate? Answered by every section being done, and by the final
  assessment if there is one.

Kept out of the views because both answers are needed in several places — the
course page, the lesson player, the progress ping — and three copies of a rule
this important would drift.
"""

from apps.courses.models import Lesson, Section
from apps.progress.models import LessonProgress

from .models import Quiz, has_passed


def _completed_lesson_ids(enrollment) -> set:
    return set(
        LessonProgress.objects.filter(enrollment=enrollment, status="completed").values_list(
            "lesson_id", flat=True
        )
    )


def section_is_complete(enrollment, section, *, completed_ids=None) -> bool:
    """Every published lesson done, and the section quiz passed if there is one.

    A section with no quiz completes on its lessons alone. That is deliberate:
    gating should only ever come from something a teacher put there on purpose,
    which is what stops students getting stuck behind an accident.

    An unready quiz — published but with no questions, or with a question that
    has no correct answer — is treated as absent rather than as a locked door.
    """
    if completed_ids is None:
        completed_ids = _completed_lesson_ids(enrollment)

    lesson_ids = set(
        Lesson.objects.filter(section=section, is_published=True).values_list("id", flat=True)
    )
    if lesson_ids and not lesson_ids.issubset(completed_ids):
        return False

    quiz = Quiz.objects.filter(section=section, kind="section").first()
    if quiz and quiz.is_ready:
        return has_passed(enrollment.student, quiz)

    return True


def accessible_section_ids(enrollment) -> set:
    """Sections this student may open right now.

    In an open course that is all of them. In a sequential course it is every
    section up to and including the first unfinished one — so there is always
    exactly one place to be, and finishing it moves you forward.

    Sections the student has already completed stay open regardless, which is
    what makes it safe to switch a live course to sequential: nobody loses
    ground they already covered.
    """
    sections = list(
        Section.objects.filter(course=enrollment.course, is_published=True).order_by("order")
    )
    if enrollment.course.progression_mode != "sequential":
        return {section.id for section in sections}

    completed_ids = _completed_lesson_ids(enrollment)
    unlocked = set()
    for section in sections:
        unlocked.add(section.id)
        if not section_is_complete(enrollment, section, completed_ids=completed_ids):
            # This is the section they are on; nothing past it opens yet.
            break
    return unlocked


def course_sections_complete(enrollment) -> bool:
    completed_ids = _completed_lesson_ids(enrollment)
    sections = Section.objects.filter(course=enrollment.course, is_published=True)
    if not sections.exists():
        return False
    return all(
        section_is_complete(enrollment, section, completed_ids=completed_ids)
        for section in sections
    )


def final_assessment_for(course):
    """The course's final assessment, or None when it has none or it isn't ready."""
    quiz = Quiz.objects.filter(course=course, kind="final").first()
    return quiz if quiz and quiz.is_ready else None


def certificate_is_earned(enrollment) -> bool:
    """Whether this student has done everything the certificate requires.

    Every section complete, plus the final assessment if the course has one.
    A course without a final assessment issues on section completion alone.
    """
    if not course_sections_complete(enrollment):
        return False

    final = final_assessment_for(enrollment.course)
    if final:
        return has_passed(enrollment.student, final)
    return True


def progression_state(enrollment):
    """Everything the UI needs to explain where a student stands.

    One call rather than four, because the course page and the player both want
    the whole picture and asking piecemeal invites them to disagree.
    """
    final = final_assessment_for(enrollment.course)
    sections_done = course_sections_complete(enrollment)

    return {
        "mode": enrollment.course.progression_mode,
        "accessibleSectionIds": [str(sid) for sid in accessible_section_ids(enrollment)],
        "sectionsComplete": sections_done,
        "finalAssessmentId": str(final.id) if final else None,
        "finalAssessmentPassed": bool(final and has_passed(enrollment.student, final)),
        # Only offer the final once the material behind it is actually done.
        "finalAssessmentAvailable": bool(final and sections_done),
        "certificateEarned": certificate_is_earned(enrollment),
    }
