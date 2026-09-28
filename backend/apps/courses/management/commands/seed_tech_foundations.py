"""Put Tech Foundations on the platform, from the content in the repository.

Idempotent by design: run it again and it updates what changed rather than
making a second copy. That is what lets the course be corrected with a pull
request — fix a typo in the content, deploy, re-run, and the live lesson says
the new thing.

It will not touch a course a student has already started in a way that loses
their progress: lessons are matched by title within their section, so editing
the words of a lesson keeps the same row, and keeps every student's place in it.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import TeacherProfile, User
from apps.categories.models import Category, Subcategory
from apps.courses.content.tech_foundations import COURSE
from apps.courses.models import Course, Lesson, Project, Section
from apps.quizzes.models import Choice, Question, Quiz
from common.sanitize import clean_lesson_html


class Command(BaseCommand):
    help = "Create or update the Tech Foundations course from the content in the repository."

    def add_arguments(self, parser):
        parser.add_argument(
            "--teacher-email",
            default="",
            help=(
                "Credit the course to a teacher. Left out, it is an admin-owned course — "
                "one the platform itself owns, with no teacher attached, managed from "
                "Admin \u2192 Owned courses. That is what MooreSkillUp writing its own "
                "course actually is."
            ),
        )
        parser.add_argument(
            "--publish",
            action="store_true",
            help="Publish it. Without this it is created as a draft for review first.",
        )
        parser.add_argument(
            "--category",
            default="Tech Foundations",
            help="The programme it belongs to.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        teacher = self._teacher(options["teacher_email"])
        category, subcategory = self._category(options["category"])

        course, created = Course.objects.update_or_create(
            title=COURSE["title"],
            defaults={
                "teacher": teacher,
                "category": category,
                "subcategory": subcategory,
                "subtitle": COURSE["subtitle"],
                "overview": COURSE["overview"],
                "scheme_of_work": COURSE["scheme_of_work"],
                "price": COURSE["price"],
                "level": COURSE["level"],
                "learning_outcomes": COURSE["learning_outcomes"],
                "certificate_enabled": COURSE["certificate_enabled"],
                "progression_mode": COURSE["progression_mode"],
            },
        )
        self._tags(course)

        owner = teacher.user.display_name if teacher else "MooreSkillUp (admin-owned)"
        self.stdout.write(f"{'Created' if created else 'Updated'} {course.title} \u2014 {owner}")

        seen_sections = []
        for index, spec in enumerate(COURSE["sections"], start=1):
            section = self._section(course, spec, index)
            seen_sections.append(section.id)
            self._lessons(section, spec["lessons"])
            if spec.get("quiz"):
                self._quiz(course, section, spec["quiz"])

        # Sections removed from the content are removed from the course, so the
        # repository stays the single source of truth.
        stale = course.sections.exclude(id__in=seen_sections)
        if stale.exists():
            self.stdout.write(f"  removing {stale.count()} section(s) no longer in the content")
            stale.delete()

        if COURSE.get("project"):
            self._project(course, COURSE["project"])
        if COURSE.get("final_assessment"):
            self._final(course, COURSE["final_assessment"])

        if options["publish"]:
            course.status = "published"
            course.visibility = "visible"
            if not course.published_at:
                course.published_at = timezone.now()
            course.save(update_fields=["status", "visibility", "published_at", "updated_at"])
            self.stdout.write(self.style.SUCCESS(f"Published. {self._counts(course)}"))
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Saved as a draft. {self._counts(course)}\n"
                    "Review it in the studio, then re-run with --publish."
                )
            )

    # ------------------------------------------------------------------ pieces

    def _teacher(self, email):
        """Who the course belongs to, or nobody.

        With no email this returns None, and a course with no teacher is what
        the platform already calls an owned course: MooreSkillUp's own, managed
        from Admin \u2192 Owned courses, with no teacher earning a share of it.
        That is the honest description of a course the platform wrote itself,
        and it avoids putting a teacher profile on somebody's admin account
        purely to hang a course on.
        """
        if not email:
            return None

        user = User.objects.filter(email=email).first()
        if user is None:
            raise SystemExit(f"No user with the email {email}.")
        profile = TeacherProfile.objects.filter(user=user).first()
        if profile is None:
            raise SystemExit(
                f"{email} has no teacher profile. Create the teacher first, or leave "
                "--teacher-email out to make it an admin-owned course."
            )
        return profile

    def _category(self, name):
        category, _ = Category.objects.get_or_create(
            name=name,
            defaults={
                "description": "Where everyone starts, whichever path they take.",
                "display_order": 0,
            },
        )
        subcategory, _ = Subcategory.objects.get_or_create(
            category=category, name="Foundations", defaults={"description": "The free first course."}
        )
        return category, subcategory

    def _tags(self, course):
        from apps.courses.models import CourseTag

        tags = []
        for name in COURSE["tags"]:
            existing = CourseTag.objects.filter(name__iexact=name).first()
            tags.append(existing or CourseTag.objects.create(name=name))
        course.tags.set(tags)
        if hasattr(course, "tech_stack"):
            course.tech_stack = COURSE["tech_stack"]
            course.save(update_fields=["tech_stack", "updated_at"])

    def _section(self, course, spec, order):
        section, _ = Section.objects.update_or_create(
            course=course,
            title=spec["title"],
            defaults={
                "description": spec["description"],
                "order": order,
                "is_published": True,
                "access_type": spec.get("access_type", "free"),
            },
        )
        return section

    def _lessons(self, section, specs):
        """Matched by title, so editing a lesson's words keeps students' progress."""
        seen = []
        for order, spec in enumerate(specs, start=1):
            lesson, _ = Lesson.objects.update_or_create(
                section=section,
                title=spec["title"],
                defaults={
                    "content_type": spec.get("content_type", "text"),
                    # Through the same cleaner the API uses, so the
                    # allowlist is proved against real content and not
                    # only against attacks.
                    "text_content": clean_lesson_html(spec["html"].strip()),
                    "duration_minutes": spec.get("duration_minutes", 5),
                    "is_previewable": spec.get("is_previewable", False),
                    "is_published": True,
                    "order": order,
                },
            )
            seen.append(lesson.id)
        stale = section.lessons.exclude(id__in=seen)
        if stale.exists():
            self.stdout.write(f"    removing {stale.count()} lesson(s) no longer in the content")
            stale.delete()

    def _quiz(self, course, section, spec):
        quiz, _ = Quiz.objects.update_or_create(
            section=section,
            defaults={
                "course": course,
                "kind": "section",
                "title": spec["title"],
                "description": spec.get("description", ""),
                "pass_mark_percent": spec.get("pass_mark_percent", 70),
                "questions_per_attempt": spec.get(
                    "questions_per_attempt", len(spec["questions"])
                ),
                "is_published": True,
            },
        )
        # Questions are replaced wholesale. A question's wording, its choices and
        # which one is right move together, and matching them individually would
        # be guesswork that could leave a quiz with the wrong answer marked.
        quiz.questions.all().delete()
        for order, question_spec in enumerate(spec["questions"], start=1):
            question = Question.objects.create(
                quiz=quiz,
                text=question_spec["text"],
                explanation=question_spec.get("explanation", ""),
                order=order,
            )
            for choice_order, (text, is_correct) in enumerate(question_spec["choices"], start=1):
                Choice.objects.create(
                    question=question, text=text, is_correct=is_correct, order=choice_order
                )

    def _project(self, course, spec):
        """The one thing a student finishes and can show somebody."""
        section = course.sections.filter(title=spec["section"]).first()
        if section is None:
            self.stdout.write(f"  no section called {spec['section']!r} — project skipped")
            return
        Project.objects.update_or_create(
            section=section,
            title=spec["title"],
            defaults={
                "description": spec["description"],
                "how_to_submit": spec.get(
                    "how_to_submit",
                    "Paste the link to your public GitHub repository.",
                ),
                "order": 1,
                # Required, because the course is not finished without it.
                "is_required": True,
            },
        )

    def _final(self, course, spec):
        """Passing this is what issues the certificate."""
        quiz, _ = Quiz.objects.update_or_create(
            course=course,
            kind="final",
            defaults={
                "section": None,
                "title": spec["title"],
                "description": spec.get("description", ""),
                "pass_mark_percent": spec.get("pass_mark_percent", 75),
                "questions_per_attempt": spec.get(
                    "questions_per_attempt", len(spec["questions"])
                ),
                "is_published": True,
            },
        )
        quiz.questions.all().delete()
        for order, question_spec in enumerate(spec["questions"], start=1):
            question = Question.objects.create(
                quiz=quiz,
                text=question_spec["text"],
                explanation=question_spec.get("explanation", ""),
                order=order,
            )
            for choice_order, (text, is_correct) in enumerate(question_spec["choices"], start=1):
                Choice.objects.create(
                    question=question, text=text, is_correct=is_correct, order=choice_order
                )

    def _counts(self, course):
        sections = course.sections.count()
        lessons = Lesson.objects.filter(section__course=course).count()
        quizzes = Quiz.objects.filter(course=course).count()
        questions = Question.objects.filter(quiz__course=course).count()
        return (
            f"{sections} section(s), {lessons} lesson(s), "
            f"{quizzes} quiz(zes), {questions} question(s)."
        )
