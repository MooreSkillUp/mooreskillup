"""Create a verifiable test certificate so you can try the /verify flow.

Run:  python manage.py seed_test_certificate
It prints a certificate ID you can paste into the /verify page.
"""

from django.core.management.base import BaseCommand

from apps.accounts.models import StudentProfile, TeacherProfile, User
from apps.categories.models import Category, Subcategory
from apps.certificates.models import Certificate
from apps.courses.models import Course
from apps.enrollments.models import Enrollment

TEST_CODE = "MSU-TEST1234"


class Command(BaseCommand):
    help = "Seed a verifiable test certificate (code MSU-TEST1234)."

    def handle(self, *args, **options):
        existing = Certificate.objects.filter(certificate_code=TEST_CODE).select_related(
            "student__user", "course"
        ).first()
        if existing:
            self._report(existing)
            return

        category, _ = Category.objects.get_or_create(name="Sample Category")
        subcategory, _ = Subcategory.objects.get_or_create(category=category, name="Sample Track")

        teacher_user, _ = User.objects.get_or_create(
            email="sample.teacher@mooreskillup.test",
            defaults={"username": "sample-teacher", "display_name": "Sample Teacher", "role": "teacher"},
        )
        teacher, _ = TeacherProfile.objects.get_or_create(
            user=teacher_user, defaults={"program": "Sample Category", "track": "Sample Track"}
        )

        student_user, created = User.objects.get_or_create(
            email="sample.student@mooreskillup.test",
            defaults={"username": "sample-student", "display_name": "Ada Verified", "role": "student"},
        )
        if created:
            student_user.set_password("sample12345")
            student_user.save()
        student, _ = StudentProfile.objects.get_or_create(
            user=student_user, defaults={"selected_interest": "Sample Category", "selected_track": "Sample Track"}
        )

        course, _ = Course.objects.get_or_create(
            title="Sample Certified Course",
            defaults={
                "teacher": teacher,
                "category": category,
                "subcategory": subcategory,
                "subtitle": "A sample course for certificate testing",
                "overview": "Sample overview.",
                "scheme_of_work": "Sample scheme.",
                "status": "published",
                "visibility": "visible",
                "certificate_enabled": True,
            },
        )

        enrollment, _ = Enrollment.objects.get_or_create(
            student=student, course=course, defaults={"access_source": "admin_grant", "status": "completed"}
        )

        from django.conf import settings

        frontend = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
        certificate = Certificate.objects.create(
            student=student,
            course=course,
            enrollment=enrollment,
            certificate_code=TEST_CODE,
            verification_url=f"{frontend}/verify/{TEST_CODE}",
        )
        self._report(certificate)

    def _report(self, certificate):
        self.stdout.write(self.style.SUCCESS("\nTest certificate ready ✔"))
        self.stdout.write(f"  Certificate ID : {certificate.certificate_code}")
        self.stdout.write(f"  Issued to      : {certificate.student.user.display_name}")
        self.stdout.write(f"  Course         : {certificate.course.title}")
        self.stdout.write(f"  Verify URL     : {certificate.verification_url}")
        self.stdout.write(
            "\nPaste "
            + self.style.WARNING(certificate.certificate_code)
            + " into the /verify page to test it.\n"
        )
