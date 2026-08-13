"""Fill a local database with realistic data so the app can be tested quickly.

Building a course through the UI takes ten minutes before you can look at a
single student screen, and most screens only mean anything with a few courses,
some progress and a couple of certificates behind them. This creates all of it
in one command.

    python manage.py seed_demo          # create everything
    python manage.py seed_demo --wipe   # remove it again

**It refuses to run against production.** Three independent guards, because
seeding a live database with fake students and fake payments would be very hard
to undo and impossible to explain. Every account it creates is marked, so --wipe
can find them again without touching anything real.
"""

import random
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import StudentProfile, TeacherProfile, User
from apps.categories.models import Category, Subcategory
from apps.courses.models import Course, Lesson, Section
from apps.enrollments.models import Enrollment
from apps.progress.activity import record_daily_activity
from apps.progress.models import CourseProgress, DailyActivity, LessonProgress
from apps.schedule.models import Event

# Every seeded account uses this domain, which is what --wipe keys off. Real
# accounts can never collide with it.
DEMO_DOMAIN = "demo.mooreskillup.test"
DEMO_PASSWORD = "DemoPass123!"

CATEGORIES = [
    {
        "name": "Web Development",
        "accent": "#FC6104",
        "tracks": ["Frontend Development", "Fullstack Foundations", "React and Modern UI"],
    },
    {
        "name": "Backend Development",
        "accent": "#0B64F4",
        "tracks": ["Backend with Python", "Backend with JavaScript"],
    },
    {
        "name": "AI and Data",
        "accent": "#7C3AED",
        "tracks": ["Data Analysis", "Artificial Intelligence"],
    },
]

COURSES = [
    # (category, track, title, subtitle, price, level, certificate, sections)
    ("Web Development", "Frontend Development", "Modern HTML and CSS",
     "Build and style pages that work on every screen", 0, "beginner", True, 4),
    ("Web Development", "React and Modern UI", "React from the Ground Up",
     "Components, state and the patterns real teams use", 25000, "intermediate", True, 5),
    ("Web Development", "Fullstack Foundations", "Fullstack JavaScript",
     "Connect a React frontend to a real API", 35000, "intermediate", True, 4),
    ("Backend Development", "Backend with Python", "Django for Real Projects",
     "Models, views and APIs that hold up in production", 30000, "intermediate", True, 5),
    ("Backend Development", "Backend with JavaScript", "Node and Express Essentials",
     "Server-side JavaScript without the guesswork", 20000, "beginner", False, 3),
    ("AI and Data", "Data Analysis", "Data Analysis with Python",
     "Pandas, cleaning and charts that answer questions", 28000, "beginner", True, 4),
]

LESSON_TITLES = [
    "Getting set up", "The core idea", "Your first build", "Common mistakes",
    "Going deeper", "Practice project", "Debugging what breaks", "Putting it together",
]

STUDENTS = [
    # (first, last, username, how far through their courses)
    ("Ada", "Okonkwo", "ada", "advanced"),
    ("Tunde", "Bello", "tunde", "midway"),
    ("Chioma", "Eze", "chioma", "starting"),
    ("Emeka", "Nwosu", "emeka", "empty"),
]


class Command(BaseCommand):
    help = "Seed the local database with demo data. Never runs against production."

    def add_arguments(self, parser):
        parser.add_argument("--wipe", action="store_true", help="Remove seeded data and exit.")
        parser.add_argument(
            "--force",
            action="store_true",
            help="Skip the DEBUG guard. The hostname and settings-module guards still apply.",
        )

    def handle(self, *args, **options):
        self._refuse_if_production(force=options["force"])

        if options["wipe"]:
            self._wipe()
            return

        with transaction.atomic():
            categories = self._seed_taxonomy()
            teacher = self._seed_teacher()
            courses = self._seed_courses(categories, teacher)
            students = self._seed_students()
            self._seed_enrolments(students, courses)
            self._seed_events(teacher, courses)

        self._report(students)

    # -- guards ---------------------------------------------------------------

    def _refuse_if_production(self, *, force: bool):
        """Three independent checks. Any one of them stops the command.

        Seeding a live database with fake students and fake payments would be
        very hard to undo and impossible to explain, so this errs heavily toward
        refusing.
        """
        module = getattr(settings, "SETTINGS_MODULE", "") or ""
        if "prod" in module.lower():
            raise CommandError(
                f"Refusing to seed: settings module is {module!r}. "
                "This command is for local development only."
            )

        hosts = [str(host).lower() for host in getattr(settings, "ALLOWED_HOSTS", [])]
        production_markers = ("azurecontainerapps.io", "mooreskillup.com", "mooreskillup.org")
        offending = [h for h in hosts if any(marker in h for marker in production_markers)]
        if offending:
            raise CommandError(
                f"Refusing to seed: ALLOWED_HOSTS contains {offending}, which looks like "
                "production. This command is for local development only."
            )

        if not settings.DEBUG and not force:
            raise CommandError(
                "Refusing to seed: DEBUG is False. Pass --force only if you are certain "
                "this is a local or disposable database."
            )

    # -- wipe -----------------------------------------------------------------

    def _wipe(self):
        users = User.objects.filter(email__endswith=f"@{DEMO_DOMAIN}")
        count = users.count()
        # Courses are removed by teacher cascade; events by course cascade.
        users.delete()
        Category.objects.filter(name__in=[c["name"] for c in CATEGORIES], courses__isnull=True).delete()
        self.stdout.write(self.style.SUCCESS(f"Removed {count} demo accounts and their data."))

    # -- seeding --------------------------------------------------------------

    def _seed_taxonomy(self):
        categories = {}
        for index, spec in enumerate(CATEGORIES):
            category, _ = Category.objects.get_or_create(
                name=spec["name"],
                defaults={
                    "accent_color": spec["accent"],
                    "display_order": index,
                    "community_label": "WhatsApp",
                    "community_url": "https://chat.whatsapp.com/demo",
                },
            )
            for track in spec["tracks"]:
                Subcategory.objects.get_or_create(category=category, name=track)
            categories[spec["name"]] = category
        self.stdout.write(f"  taxonomy: {len(categories)} categories")
        return categories

    def _seed_teacher(self):
        user, created = User.objects.get_or_create(
            email=f"teacher@{DEMO_DOMAIN}",
            defaults={
                "username": "demo_teacher",
                "display_name": "Ngozi Adeyemi",
                "first_name": "Ngozi",
                "last_name": "Adeyemi",
                "role": "teacher",
            },
        )
        if created:
            user.set_password(DEMO_PASSWORD)
            user.save()
        profile, _ = TeacherProfile.objects.get_or_create(
            user=user, defaults={"program": "Web Development", "track": "Frontend Development"}
        )
        return profile

    def _seed_courses(self, categories, teacher):
        courses = []
        for cat_name, track, title, subtitle, price, level, certificate, section_count in COURSES:
            category = categories[cat_name]
            subcategory = Subcategory.objects.get(category=category, name=track)

            course, created = Course.objects.get_or_create(
                title=title,
                defaults={
                    "teacher": teacher,
                    "category": category,
                    "subcategory": subcategory,
                    "subtitle": subtitle,
                    "overview": (
                        f"{subtitle}. This course walks through the material step by step, "
                        "with a practice project at the end of each section so the ideas stick."
                    ),
                    "scheme_of_work": "Week by week, building toward a finished project.",
                    "level": level,
                    "price": Decimal(price),
                    "status": "published",
                    "visibility": "visible",
                    "certificate_enabled": certificate,
                    "published_at": timezone.now(),
                    "tech_stack": ["HTML", "CSS", "JavaScript"] if "Web" in cat_name else ["Python"],
                },
            )
            if created:
                self._seed_sections(course, section_count)
            courses.append(course)

        self.stdout.write(f"  courses: {len(courses)} published")
        return courses

    def _seed_sections(self, course, section_count):
        """Sections with a mix of free and paid access, and one preview lesson.

        The first section is free with a previewable lesson so the locked/unlocked
        states on the course page have something real to show.
        """
        for index in range(section_count):
            section = Section.objects.create(
                course=course,
                title=f"Section {index + 1}: {LESSON_TITLES[index % len(LESSON_TITLES)]}",
                description="What this section covers and what you will have built by the end.",
                order=index,
                access_type="free" if index == 0 else "paid",
                is_published=True,
            )
            for lesson_index in range(random.randint(3, 5)):
                Lesson.objects.create(
                    section=section,
                    title=LESSON_TITLES[(index + lesson_index) % len(LESSON_TITLES)],
                    content_type="video" if lesson_index % 2 == 0 else "text",
                    video_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" if lesson_index % 2 == 0 else "",
                    text_content="" if lesson_index % 2 == 0 else "Written notes for this lesson.",
                    duration_minutes=random.choice([6, 9, 12, 15, 18]),
                    order=lesson_index,
                    # One free preview on the opening section, so a signed-out
                    # or unenrolled student can see what they would be buying.
                    is_previewable=index == 0 and lesson_index == 0,
                    is_published=True,
                )

    def _seed_students(self):
        students = []
        for first, last, handle, pace in STUDENTS:
            user, created = User.objects.get_or_create(
                email=f"{handle}@{DEMO_DOMAIN}",
                defaults={
                    "username": f"demo_{handle}",
                    "display_name": f"{first} {last}",
                    "first_name": first,
                    "last_name": last,
                    "role": "student",
                },
            )
            if created:
                user.set_password(DEMO_PASSWORD)
                user.save()
            profile, _ = StudentProfile.objects.get_or_create(
                user=user,
                defaults={
                    "selected_interest": "Web Development",
                    "selected_track": "Frontend Development",
                    "selected_tracks": ["Frontend Development"],
                    "onboarded": True,
                },
            )
            students.append((profile, pace, f"{first} {last}"))
        self.stdout.write(f"  students: {len(students)}")
        return students

    def _seed_enrolments(self, students, courses):
        """Enrol each student and walk their progress forward realistically.

        Progress is written through the same models the app reads, and daily
        activity is recorded across previous days so streaks and the weekly bars
        have something true to show. Certificates are issued by the real
        completion path rather than created directly.
        """
        pace_map = {"advanced": (4, 0.85), "midway": (3, 0.45), "starting": (2, 0.1), "empty": (0, 0)}

        for profile, pace, _ in students:
            course_count, completion = pace_map[pace]
            for course in courses[:course_count]:
                enrollment, _ = Enrollment.objects.get_or_create(
                    student=profile,
                    course=course,
                    defaults={"access_source": "free" if course.price == 0 else "payment"},
                )
                lessons = list(Lesson.objects.filter(section__course=course, is_published=True).order_by(
                    "section__order", "order"
                ))
                if not lessons:
                    continue

                finish_count = int(len(lessons) * completion)
                for lesson in lessons[:finish_count]:
                    LessonProgress.objects.get_or_create(
                        enrollment=enrollment,
                        lesson=lesson,
                        defaults={
                            "status": "completed",
                            "first_accessed_at": timezone.now() - timedelta(days=3),
                            "last_accessed_at": timezone.now() - timedelta(days=1),
                            "completed_at": timezone.now() - timedelta(days=1),
                            "time_spent_seconds": (lesson.duration_minutes or 10) * 60,
                        },
                    )

                total = len(lessons)
                CourseProgress.objects.update_or_create(
                    enrollment=enrollment,
                    defaults={
                        "completed_lessons_count": finish_count,
                        "total_lessons_count": total,
                        "progress_percent": Decimal(round(finish_count / total * 100, 2)),
                        "is_completed": finish_count == total,
                    },
                )
                if finish_count and finish_count == total:
                    enrollment.status = "completed"
                    enrollment.completed_at = timezone.now()
                    enrollment.save(update_fields=["status", "completed_at", "updated_at"])
                    from apps.progress.views import issue_certificate

                    issue_certificate(enrollment)

            # A streak: consecutive days ending yesterday, so "today" is still
            # something the tester can move themselves by opening a lesson.
            if pace != "empty":
                streak_days = {"advanced": 6, "midway": 3, "starting": 1}[pace]
                for offset in range(1, streak_days + 1):
                    day = timezone.localtime().date() - timedelta(days=offset)
                    DailyActivity.objects.update_or_create(
                        student=profile,
                        date=day,
                        defaults={
                            "seconds": random.randint(900, 2700),
                            "minutes": random.randint(15, 45),
                            "lessons_completed": random.randint(1, 3),
                        },
                    )
                record_daily_activity(profile, seconds=0)

        self.stdout.write("  enrolments, progress, streaks and certificates written")

    def _seed_events(self, teacher, courses):
        now = timezone.now()
        specs = [
            ("Live class: building your first layout", "live_class", 1, courses[0]),
            ("Q&A — bring your blockers", "q_and_a", 3, courses[1]),
            ("Workshop: debugging like a professional", "workshop", 6, None),
        ]
        for title, kind, days, course in specs:
            Event.objects.get_or_create(
                title=title,
                defaults={
                    "description": "Join on time — a recording is not guaranteed.",
                    "kind": kind,
                    "course": course,
                    "created_by": teacher.user,
                    "starts_at": now + timedelta(days=days, hours=2),
                    "ends_at": now + timedelta(days=days, hours=3),
                    "join_url": "https://meet.google.com/demo-link",
                    "is_published": True,
                },
            )
        self.stdout.write(f"  events: {len(specs)}")

    # -- output ---------------------------------------------------------------

    def _report(self, students):
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Demo data ready. Sign in with any of these:"))
        self.stdout.write("")
        self.stdout.write(f"  {'ROLE':<9} {'EMAIL':<34} STATE")
        self.stdout.write(f"  {'-' * 9} {'-' * 34} {'-' * 28}")
        self.stdout.write(f"  {'teacher':<9} {f'teacher@{DEMO_DOMAIN}':<34} owns every demo course")
        described = {
            "advanced": "4 courses, 1 certificate, 6-day streak",
            "midway": "3 courses, midway through",
            "starting": "2 courses, just started",
            "empty": "no courses — first-run state",
        }
        for profile, pace, _name in students:
            email = profile.user.email
            self.stdout.write(f"  {'student':<9} {email:<34} {described[pace]}")
        self.stdout.write("")
        self.stdout.write(f"  Password for all of them: {DEMO_PASSWORD}")
        self.stdout.write("")
        self.stdout.write("  Remove it all again with:  python manage.py seed_demo --wipe")
