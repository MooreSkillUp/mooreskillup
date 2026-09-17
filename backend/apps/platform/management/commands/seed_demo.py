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
import secrets
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
from apps.quizzes.models import Choice, Question, Quiz
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
        parser.add_argument(
            "--seed-a-live-site-before-launch",
            action="store_true",
            dest="allow_live",
            help=(
                "Seed a deployed site that has no real users yet, so a team can test it. "
                "Refuses outright once any real student, teacher or payment exists, and "
                "never uses the shared password."
            ),
        )
        parser.add_argument(
            "--password",
            default="",
            help="Password for every demo account. Generated when seeding a live site.",
        )

    def handle(self, *args, **options):
        self.allow_live = options["allow_live"]
        if self.allow_live:
            self._refuse_if_anyone_real_is_here()
        else:
            self._refuse_if_production(force=options["force"])

        if options["wipe"]:
            self._wipe()
            return

        # The shared password is published in a public repository, so it can
        # never be the way into a site that is reachable from the internet.
        self.password = options["password"].strip() or (
            secrets.token_urlsafe(9) if self.allow_live else DEMO_PASSWORD
        )

        with transaction.atomic():
            categories = self._seed_taxonomy()
            teacher = self._seed_teacher()
            self._seed_admins()
            courses = self._seed_courses(categories, teacher)
            students = self._seed_students()
            self._seed_enrolments(students, courses)
            self._seed_events(teacher, courses)
            self._seed_review_queue(categories, teacher)

        self._report(students)

    def _seed_review_queue(self, categories, teacher):
        """Three courses in the states the admin review queue exists to handle.

        Every seeded course used to be published, so the review screen was empty
        and could not be exercised at all. These cover what a reviewer actually
        meets: a fresh submission, a resubmission that still has a gap in it (so
        the checklist has something to catch), and a course out with its teacher.

        Each course's content agrees with its reviewer note — demo data that
        contradicts itself teaches the wrong lesson about the product. State is
        reset on every run, so approving one while testing and reseeding puts the
        queue back as it was.
        """
        now = timezone.now()
        moderator = User.objects.filter(email=f"moderator@{DEMO_DOMAIN}").first()
        super_admin = User.objects.filter(email=f"admin@{DEMO_DOMAIN}").first()

        specs = [
            {
                "title": "TypeScript for React Developers",
                "category": "Web Development",
                "track": "React and Modern UI",
                "subtitle": "Types that catch bugs before your users do",
                "sections": 3,
                "state": {
                    "status": "review",
                    "submitted_at": now - timedelta(days=3),
                    "decline_reason": "",
                    "reviewed_at": None,
                    "reviewed_by": None,
                },
            },
            {
                "title": "APIs with FastAPI",
                "category": "Backend Development",
                "track": "Backend with Python",
                "subtitle": "Fast, typed Python APIs from first route to deployment",
                "sections": 3,
                # Resubmitted having fixed the overview but not the videos.
                "empty_videos_in_section": 1,
                "state": {
                    "status": "review",
                    "submitted_at": now - timedelta(days=1),
                    "decline_reason": (
                        "Section 2's video lessons have no video yet, and the overview doesn't "
                        "say who the course is for. Please add both and resubmit."
                    ),
                    "reviewed_at": now - timedelta(days=5),
                    "reviewed_by": moderator,
                },
            },
            {
                "title": "Intro to Machine Learning",
                "category": "AI and Data",
                "track": "Data Analysis",
                "subtitle": "The ideas behind the models, without the hype",
                "sections": 2,
                "clear_durations": True,
                "state": {
                    "status": "declined",
                    "submitted_at": now - timedelta(days=4),
                    "decline_reason": (
                        "No lesson has a length set, so students can't plan their time. "
                        "Please add a length to every lesson, then resubmit."
                    ),
                    "reviewed_at": now - timedelta(days=2),
                    "reviewed_by": super_admin,
                },
            },
        ]

        for spec in specs:
            category = categories[spec["category"]]
            subcategory = Subcategory.objects.get(category=category, name=spec["track"])
            course, created = Course.objects.update_or_create(
                title=spec["title"],
                defaults={
                    "teacher": teacher,
                    "category": category,
                    "subcategory": subcategory,
                    "subtitle": spec["subtitle"],
                    "overview": (
                        f"{spec['subtitle']}. For developers who know the basics and want to "
                        "build something real, section by section."
                    ),
                    "scheme_of_work": "Week by week, building toward a finished project.",
                    "level": "intermediate",
                    "price": Decimal(22000),
                    "visibility": "hidden",
                    "certificate_enabled": True,
                    **spec["state"],
                },
            )
            if created:
                self._seed_sections(course, spec["sections"])
                self._seed_quizzes(course)

            if "empty_videos_in_section" in spec:
                section = course.sections.order_by("order")[spec["empty_videos_in_section"]]
                section.lessons.filter(content_type="video").update(video_url="")
            if spec.get("clear_durations"):
                Lesson.objects.filter(section__course=course).update(duration_minutes=None)

        self.stdout.write(f"  review queue: {len(specs)} courses")

    # -- guards ---------------------------------------------------------------

    def _refuse_if_anyone_real_is_here(self):
        """The one condition under which seeding a deployed site is defensible.

        Before launch a live site is just an empty shop: nothing to damage, and
        a team cannot test a platform with no courses in it. After launch the
        same command would drop fake students and fake progress in among real
        ones, which is very hard to undo and impossible to explain.

        So the test is not "which environment is this" — it is "is anybody
        here". Admin accounts are ignored: the owner of the platform is exactly
        who runs this.
        """
        from apps.payments.models import Payment

        real_people = (
            User.objects.exclude(email__endswith=f"@{DEMO_DOMAIN}")
            .exclude(role="admin")
            .count()
        )
        payments = Payment.objects.count()
        if real_people or payments:
            raise CommandError(
                f"Refusing to seed: this database already has {real_people} real "
                f"student/teacher account(s) and {payments} payment(s). Demo data belongs "
                "only on a site nobody is using yet."
            )

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

        # Courses must go first and explicitly. Course.teacher is SET_NULL, not
        # CASCADE, so deleting the teacher leaves every demo course behind with
        # no owner — and the next seed then finds them by title, skips its
        # defaults, and quietly produces stale data.
        #
        # Matched by owner as well as by title, so a course the seeder gains
        # later (the review-queue courses, for one) is removed without anyone
        # remembering to extend a title list. The title match still sweeps up
        # courses an older wipe had already orphaned.
        from django.db.models import Q

        course_count, _ = Course.objects.filter(
            Q(teacher__user__email__endswith=f"@{DEMO_DOMAIN}")
            | Q(title__in=[spec[2] for spec in COURSES])
        ).delete()

        users.delete()
        Category.objects.filter(
            name__in=[c["name"] for c in CATEGORIES], courses__isnull=True
        ).delete()
        self.stdout.write(
            self.style.SUCCESS(
                f"Removed {count} demo accounts and {course_count} related course records."
            )
        )

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
            user.set_password(self.password)
            user.save()
        profile, _ = TeacherProfile.objects.get_or_create(
            user=user, defaults={"program": "Web Development", "track": "Frontend Development"}
        )
        return profile

    def _seed_admins(self):
        """One admin per permission tier.

        Without these the demo data could not sign you into the admin side at
        all — you could seed a whole platform and then have no way to approve
        the courses it created. Two tiers rather than one because the RBAC
        matrix is the thing most worth testing: a moderator can approve a course
        and must not be able to touch payments or other admins.
        """
        specs = [
            ("admin", "super_admin", "Eric Moore", "demo_super_admin"),
            ("moderator", "moderator", "Chidi Okeke", "demo_moderator"),
        ]
        created = []
        for handle, admin_role, display_name, username in specs:
            first, last = display_name.split(" ", 1)
            user, is_new = User.objects.get_or_create(
                email=f"{handle}@{DEMO_DOMAIN}",
                defaults={
                    "username": username,
                    "display_name": display_name,
                    "first_name": first,
                    "last_name": last,
                    "role": "admin",
                    "admin_role": admin_role,
                    "is_staff": True,
                },
            )
            if is_new:
                user.set_password(self.password)
            # Demo admins skip the first-login password prompt: it is a real
            # flow worth testing, but not on every reseed of a throwaway box.
            user.must_change_password = False
            user.admin_role = admin_role
            user.is_staff = True
            user.save()
            created.append((handle, admin_role))
        self.stdout.write(f"  admins: {len(created)}")
        return created

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
                    "learning_outcomes": [
                        f"Understand the fundamentals of {track.lower()}",
                        "Build a real project from scratch, start to finish",
                        "Debug confidently when something breaks",
                        "Follow the practices working teams actually use",
                    ],
                },
            )
            if created:
                self._seed_sections(course, section_count)
                self._seed_quizzes(course)
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
                order=index + 1,
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
                    order=lesson_index + 1,
                    # One free preview on the opening section, so a signed-out
                    # or unenrolled student can see what they would be buying.
                    is_previewable=index == 0 and lesson_index == 0,
                    is_published=True,
                )

    def _seed_quizzes(self, course):
        """A quiz on the opening section, plus a final where there's a certificate.

        Enough to exercise both gates: the section quiz that opens the next
        section in a sequential course, and the final that earns the
        certificate. Six questions per quiz with four served, so the pool
        behaviour is visible rather than theoretical.
        """
        bank = [
            ("Which of these is a valid approach?", ["The documented one"], ["A guess", "Neither"]),
            ("What should you do when something breaks?", ["Read the error"], ["Retry blindly", "Give up"]),
            ("Why write tests?", ["To catch regressions"], ["To slow down", "For decoration"]),
            ("What makes code readable?", ["Clear naming"], ["Cleverness", "Brevity above all"]),
            ("When should you refactor?", ["When it earns its keep"], ["Never", "Constantly"]),
            ("What belongs in a commit message?", ["Why the change was made"], ["The diff", "Nothing"]),
        ]

        def build(quiz, pairs):
            for index, (text, correct, wrong) in enumerate(pairs):
                question = Question.objects.create(
                    quiz=quiz,
                    text=text,
                    explanation="Worth remembering as you go.",
                    order=index,
                )
                options = [(c, True) for c in correct] + [(w, False) for w in wrong]
                random.shuffle(options)
                for choice_index, (label, is_correct) in enumerate(options):
                    Choice.objects.create(
                        question=question, text=label, is_correct=is_correct, order=choice_index
                    )

        first_section = course.sections.order_by("order").first()
        if first_section:
            section_quiz = Quiz.objects.create(
                course=course,
                section=first_section,
                kind="section",
                title=f"{first_section.title} check",
                description="A short check before the next section opens.",
                questions_per_attempt=4,
                is_published=True,
            )
            build(section_quiz, bank)

        if course.certificate_enabled:
            final = Quiz.objects.create(
                course=course,
                kind="final",
                title=f"{course.title}: final assessment",
                description="Pass this to earn your certificate.",
                pass_mark_percent=70,
                questions_per_attempt=4,
                is_published=True,
            )
            build(final, bank)

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
                user.set_password(self.password)
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
        # (courses enrolled, how far through them, how many finished outright)
        # The advanced student finishes one course outright so there is always a
        # real certificate to look at — a percentage that merely approaches 100
        # never issues one, and the certificate screens are then untestable.
        pace_map = {
            "advanced": (4, 0.85, 1),
            "midway": (3, 0.45, 0),
            "starting": (2, 0.1, 0),
            "empty": (0, 0, 0),
        }

        for profile, pace, _ in students:
            course_count, completion, finish_outright = pace_map[pace]
            intended = courses[:course_count]

            # Drop enrolments this persona is no longer meant to have. Running
            # the seeder twice used to leave the "first-run" student holding a
            # finished course from an earlier version of this table, so the one
            # persona that exists to test empty states was never empty.
            stale = Enrollment.objects.filter(student=profile).exclude(
                course__in=[course.id for course in intended]
            )
            if stale.exists():
                stale.delete()
            if not intended:
                DailyActivity.objects.filter(student=profile).delete()

            for course_index, course in enumerate(intended):
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

                # The first `finish_outright` courses are completed in full.
                fraction = 1.0 if course_index < finish_outright else completion
                finish_count = int(len(lessons) * fraction)
                # update_or_create, not get_or_create: a row may already exist
                # from an earlier seed or from opening the lesson, and defaults
                # are ignored when one is found — which left the opening lesson
                # of a nearly-finished course marked incomplete, so the dashboard
                # correctly but confusingly pointed at lesson one.
                for lesson in lessons[:finish_count]:
                    LessonProgress.objects.update_or_create(
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

                # A seeded enrolment that has completed lessons but was never
                # "last accessed" produced a teacher dashboard reporting a 20%
                # completion rate beside 0 engaged learners. Demo data that
                # contradicts itself teaches the wrong lesson about the product.
                if finish_count:
                    enrollment.last_accessed_at = timezone.now() - timedelta(days=1)
                    enrollment.save(update_fields=["last_accessed_at", "updated_at"])

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
            # update_or_create, so re-seeding moves the dates forward. With
            # get_or_create the defaults were skipped for a row that already
            # existed, and the demo schedule slid into the past a day at a time
            # until every "upcoming" session had already happened.
            Event.objects.update_or_create(
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
        self.stdout.write(
            f"  {'admin':<9} {f'admin@{DEMO_DOMAIN}':<34} super admin — every permission"
        )
        self.stdout.write(
            f"  {'admin':<9} {f'moderator@{DEMO_DOMAIN}':<34} moderator — approvals and support only"
        )
        self.stdout.write(f"  {'teacher':<9} {f'teacher@{DEMO_DOMAIN}':<34} owns every demo course")
        self.stdout.write(
            f"  {'':<9} {'':<34} + 2 courses awaiting review, 1 sent back"
        )
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
        self.stdout.write(f"  Password for all of them: {self.password}")
        if self.allow_live:
            self.stdout.write("")
            self.stdout.write(
                self.style.WARNING(
                    "That password is shown once and exists nowhere else — keep it somewhere "
                    "your testers can reach.\n"
                    "These accounts are reachable from the internet. Remove them before real "
                    "students arrive:\n"
                    "  python manage.py seed_demo --wipe --seed-a-live-site-before-launch"
                )
            )
        self.stdout.write("")
        self.stdout.write("  Remove it all again with:  python manage.py seed_demo --wipe")
