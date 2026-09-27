"""What a teacher signed, and what each of their courses therefore earns.

Founding teachers take 25% on their first two courses and 20% after that;
teachers who join later start at 20%. The rate is decided once, when a course
is published, and frozen onto that course — so a teacher's third course sits at
20% while their first two stay at 25%, and a statement sent in December still
says the same thing in March.

The case that matters most here is the one nobody plans for: a course published
before anyone recorded what its teacher signed. It gets the standard rate and a
flag, because assuming 20% for someone who signed at 25% is only discovered
when they query the payment that was short.
"""

from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import TeacherProfile, User
from apps.categories.models import Category, Subcategory
from apps.courses.models import Course
from apps.finance.models import FOUNDING, STANDARD, CourseEarningTerm, TeacherTerms, add_months
from common.rbac import ADMIN, SUPER_ADMIN


def admin_user(role=SUPER_ADMIN, email=None):
    email = email or f"{role}@finance.dev"
    return User.objects.create_user(
        email=email,
        username=email.split("@")[0],
        display_name=role.replace("_", " ").title(),
        password="x",
        role="admin",
        admin_role=role,
    )


def client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def make_teacher(email="teach@finance.dev", name="Ada Teacher"):
    user = User.objects.create_user(
        email=email,
        username=email.split("@")[0],
        display_name=name,
        password="x",
        role="teacher",
    )
    return TeacherProfile.objects.create(user=user, program="Tech", track="Python")


def make_course(teacher, title, status="draft"):
    category, _ = Category.objects.get_or_create(name="Programming")
    subcategory, _ = Subcategory.objects.get_or_create(category=category, name="Python")
    return Course.objects.create(
        teacher=teacher,
        category=category,
        subcategory=subcategory,
        title=title,
        subtitle="s",
        overview="o",
        scheme_of_work="w",
        price=Decimal("25000"),
        status=status,
    )


def publish(teacher, title, when=None):
    """A course going live, which is the moment its terms are fixed."""
    course = make_course(teacher, title)
    course.status = "published"
    course.visibility = "visible"
    course.published_at = when or timezone.now()
    course.save()
    return course


@pytest.fixture
def boss(db):
    return client_for(admin_user(SUPER_ADMIN))


class TestFoundingTiers:
    def test_the_first_two_courses_earn_the_higher_rate(self, db):
        teacher = make_teacher()
        TeacherTerms.objects.create(teacher=teacher, **TeacherTerms.defaults_for(FOUNDING))

        first = publish(teacher, "Course One")
        second = publish(teacher, "Course Two")
        third = publish(teacher, "Course Three")

        assert first.earning_term.share_percent == Decimal("25.00")
        assert second.earning_term.share_percent == Decimal("25.00")
        assert third.earning_term.share_percent == Decimal("20.00")
        assert [t.course_number for t in (first, second, third) for t in [t.earning_term]] == [1, 2, 3]

    def test_a_teacher_joining_later_starts_at_the_standard_rate(self, db):
        teacher = make_teacher()
        TeacherTerms.objects.create(teacher=teacher, **TeacherTerms.defaults_for(STANDARD))

        course = publish(teacher, "Only Course")

        assert course.earning_term.share_percent == Decimal("20.00")

    def test_the_number_of_premium_courses_is_configurable(self, db):
        """Eric asked whether the higher rate should cover one course or two.
        It is a number on the record, so it can be either without a deploy."""
        teacher = make_teacher()
        TeacherTerms.objects.create(
            teacher=teacher,
            agreement_type=FOUNDING,
            premium_share_percent=Decimal("25.00"),
            premium_course_count=1,
            standard_share_percent=Decimal("20.00"),
        )

        first = publish(teacher, "One")
        second = publish(teacher, "Two")

        assert first.earning_term.share_percent == Decimal("25.00")
        assert second.earning_term.share_percent == Decimal("20.00")

    def test_two_teachers_count_their_courses_separately(self, db):
        one = make_teacher("a@finance.dev", "One")
        two = make_teacher("b@finance.dev", "Two")
        for teacher in (one, two):
            TeacherTerms.objects.create(teacher=teacher, **TeacherTerms.defaults_for(FOUNDING))

        publish(one, "A1")
        publish(one, "A2")
        first_of_two = publish(two, "B1")

        assert first_of_two.earning_term.course_number == 1
        assert first_of_two.earning_term.share_percent == Decimal("25.00")


class TestFreezing:
    def test_changing_the_agreement_does_not_move_a_published_course(self, db):
        """The whole reason the rate is copied onto the course."""
        teacher = make_teacher()
        terms = TeacherTerms.objects.create(teacher=teacher, **TeacherTerms.defaults_for(FOUNDING))
        course = publish(teacher, "Published Early")
        assert course.earning_term.share_percent == Decimal("25.00")

        terms.premium_course_count = 0
        terms.standard_share_percent = Decimal("10.00")
        terms.save()
        course.earning_term.refresh_from_db()

        assert course.earning_term.share_percent == Decimal("25.00")

    def test_republishing_does_not_restart_the_twelve_months(self, db):
        teacher = make_teacher()
        TeacherTerms.objects.create(teacher=teacher, **TeacherTerms.defaults_for(FOUNDING))
        course = publish(teacher, "Republished", when=timezone.now() - timedelta(days=100))
        original_start = course.earning_term.starts_at

        course.status = "draft"
        course.save()
        course.status = "published"
        course.save()
        course.earning_term.refresh_from_db()

        assert course.earning_term.starts_at == original_start
        assert CourseEarningTerm.objects.filter(course=course).count() == 1

    def test_a_draft_course_has_no_terms(self, db):
        make_course(make_teacher(), "Still a draft")
        assert CourseEarningTerm.objects.count() == 0

    def test_the_period_is_twelve_calendar_months_not_365_days(self, db):
        """A leap year is why this is not timedelta(days=365)."""
        teacher = make_teacher()
        TeacherTerms.objects.create(teacher=teacher, **TeacherTerms.defaults_for(FOUNDING))
        published = timezone.now().replace(year=2027, month=2, day=28, microsecond=0)

        course = publish(teacher, "Leap", when=published)

        assert course.earning_term.ends_at.year == 2028
        assert course.earning_term.ends_at.month == 2
        assert course.earning_term.ends_at.day == 28

    def test_a_month_end_start_clamps_to_a_real_date(self):
        moment = timezone.now().replace(year=2026, month=8, day=31, microsecond=0)
        assert add_months(moment, 6).day == 28
        assert add_months(moment, 6).month == 2


class TestUnrecordedAgreements:
    def test_a_course_published_with_no_recorded_terms_is_flagged(self, db):
        """Assuming 20% for someone who signed at 25% is only ever found when
        they query the payment that was short."""
        teacher = make_teacher()

        course = publish(teacher, "No Paperwork")

        term = course.earning_term
        assert term.share_percent == Decimal("20.00")
        assert term.needs_review is True

    def test_recorded_terms_are_not_flagged(self, db):
        teacher = make_teacher()
        TeacherTerms.objects.create(teacher=teacher, **TeacherTerms.defaults_for(FOUNDING))

        course = publish(teacher, "Signed First")

        assert course.earning_term.needs_review is False

    def test_the_ones_needing_a_look_can_be_listed(self, boss, db):
        signed = make_teacher("s@finance.dev", "Signed")
        TeacherTerms.objects.create(teacher=signed, **TeacherTerms.defaults_for(FOUNDING))
        publish(signed, "Fine")
        publish(make_teacher("u@finance.dev", "Unsigned"), "Needs a look")

        res = boss.get("/api/admin/course-earning-terms/?needsReview=true")

        assert res.status_code == 200
        assert res.data["needsReview"] == 1
        assert [t["courseTitle"] for t in res.data["results"]] == ["Needs a look"]


class TestEarningWindow:
    def test_a_sale_inside_the_window_earns(self, db):
        teacher = make_teacher()
        TeacherTerms.objects.create(teacher=teacher, **TeacherTerms.defaults_for(FOUNDING))
        course = publish(teacher, "Running", when=timezone.now() - timedelta(days=30))

        assert course.earning_term.earns_on(timezone.now()) is True
        assert course.earning_term.is_running is True

    def test_a_sale_after_twelve_months_earns_nothing(self, db):
        teacher = make_teacher()
        TeacherTerms.objects.create(teacher=teacher, **TeacherTerms.defaults_for(FOUNDING))
        course = publish(teacher, "Expired", when=timezone.now() - timedelta(days=400))

        assert course.earning_term.earns_on(timezone.now()) is False

    def test_stopping_for_cause_ends_it_that_day(self, db):
        """Clause 13.3: leave by notice and the period runs out; removed for
        serious breach and it stops the day it ends."""
        teacher = make_teacher()
        TeacherTerms.objects.create(teacher=teacher, **TeacherTerms.defaults_for(FOUNDING))
        course = publish(teacher, "Stopped", when=timezone.now() - timedelta(days=30))
        term = course.earning_term

        term.stopped_at = timezone.now() - timedelta(days=1)
        term.stopped_reason = "Agreement ended for cause"
        term.save()

        assert term.earns_on(timezone.now()) is False
        assert term.earns_on(timezone.now() - timedelta(days=10)) is True


class TestTheAdminEndpoints:
    def test_a_teacher_with_nothing_recorded_still_returns_figures(self, boss, db):
        """An empty form gives the admin nothing to correct."""
        teacher = make_teacher()

        res = boss.get(f"/api/admin/teachers/{teacher.id}/terms/")

        assert res.status_code == 200
        assert res.data["recorded"] is False
        assert res.data["terms"]["standardSharePercent"] == "20.00"

    def test_setting_the_terms_records_them(self, boss, db):
        teacher = make_teacher()

        res = boss.put(
            f"/api/admin/teachers/{teacher.id}/terms/",
            {
                "agreementType": "founding",
                "premiumSharePercent": "25.00",
                "premiumCourseCount": 2,
                "standardSharePercent": "20.00",
                "agreementVersion": "v1.0",
                "signedOn": "2026-10-15",
            },
            format="json",
        )

        assert res.status_code == 200
        saved = TeacherTerms.objects.get(teacher=teacher)
        assert saved.agreement_type == "founding"
        assert saved.premium_course_count == 2
        assert str(saved.signed_on) == "2026-10-15"

    def test_it_says_what_the_next_course_would_earn(self, boss, db):
        teacher = make_teacher()
        TeacherTerms.objects.create(teacher=teacher, **TeacherTerms.defaults_for(FOUNDING))
        publish(teacher, "First")

        res = boss.get(f"/api/admin/teachers/{teacher.id}/terms/")

        assert res.data["terms"]["nextCourseShare"] == "25.00"
        assert res.data["terms"]["premiumCoursesLeft"] == 1

        publish(teacher, "Second")
        res = boss.get(f"/api/admin/teachers/{teacher.id}/terms/")
        assert res.data["terms"]["nextCourseShare"] == "20.00"
        assert res.data["terms"]["premiumCoursesLeft"] == 0

    def test_a_higher_rate_below_the_standard_one_is_refused(self, boss, db):
        teacher = make_teacher()

        res = boss.put(
            f"/api/admin/teachers/{teacher.id}/terms/",
            {
                "agreementType": "custom",
                "premiumSharePercent": "10.00",
                "premiumCourseCount": 2,
                "standardSharePercent": "20.00",
            },
            format="json",
        )

        assert res.status_code == 400
        assert "below the standard" in str(res.data)

    def test_the_terms_list_a_teacher_s_courses(self, boss, db):
        teacher = make_teacher()
        TeacherTerms.objects.create(teacher=teacher, **TeacherTerms.defaults_for(FOUNDING))
        publish(teacher, "Alpha")

        res = boss.get(f"/api/admin/teachers/{teacher.id}/terms/")

        assert [c["courseTitle"] for c in res.data["courses"]] == ["Alpha"]
        assert res.data["courses"][0]["sharePercent"] == "25.00"

    def test_a_moderator_cannot_change_what_someone_is_paid(self, db):
        teacher = make_teacher()
        moderator = client_for(admin_user("moderator", "mod@finance.dev"))

        res = moderator.put(
            f"/api/admin/teachers/{teacher.id}/terms/",
            {"agreementType": "founding"},
            format="json",
        )

        assert res.status_code == 403

    def test_an_admin_may_read_the_terms(self, db):
        teacher = make_teacher()
        ops = client_for(admin_user(ADMIN, "ops@finance.dev"))

        assert ops.get(f"/api/admin/teachers/{teacher.id}/terms/").status_code == 200


class TestCreatingATeacherWithTerms:
    ENDPOINT = "/api/admin/teachers/"

    def test_the_agreement_is_recorded_as_the_teacher_is_created(self, boss, db):
        res = boss.post(
            self.ENDPOINT,
            {
                "displayName": "Founding Teacher",
                "email": "founding@finance.dev",
                "program": "Tech",
                "tracks": ["Python"],
                "agreementType": "founding",
                "agreementVersion": "v1.0",
                "signedOn": "2026-10-20",
            },
            format="json",
        )

        assert res.status_code in (200, 201), res.data
        terms = TeacherTerms.objects.get(teacher__user__email="founding@finance.dev")
        assert terms.agreement_type == "founding"
        assert terms.premium_share_percent == Decimal("25.00")
        assert terms.premium_course_count == 2
        assert terms.standard_share_percent == Decimal("20.00")

    def test_a_teacher_can_still_be_created_before_the_paperwork_is_back(self, boss, db):
        res = boss.post(
            self.ENDPOINT,
            {
                "displayName": "No Paperwork Yet",
                "email": "later@finance.dev",
                "program": "Tech",
                "tracks": ["Python"],
            },
            format="json",
        )

        assert res.status_code in (200, 201), res.data
        assert TeacherTerms.objects.filter(teacher__user__email="later@finance.dev").count() == 0

    def test_a_custom_percentage_overrides_the_type_default(self, boss, db):
        """The band is 20 to 25. A particular course may be worth the top of it."""
        res = boss.post(
            self.ENDPOINT,
            {
                "displayName": "Negotiated",
                "email": "negotiated@finance.dev",
                "program": "Tech",
                "tracks": ["Python"],
                "agreementType": "standard",
                "standardSharePercent": "23.50",
            },
            format="json",
        )

        assert res.status_code in (200, 201), res.data
        terms = TeacherTerms.objects.get(teacher__user__email="negotiated@finance.dev")
        assert terms.standard_share_percent == Decimal("23.50")
