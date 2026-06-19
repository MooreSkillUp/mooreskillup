"""Phase 5: transactional emails + student support tickets + reply notifications."""

import pytest
from django.core import mail
from rest_framework.test import APIClient

from apps.accounts.models import StudentProfile, TeacherProfile, User
from apps.categories.models import Category, Subcategory
from apps.courses.models import Course
from apps.notifications.models import Notification, SupportTicket
from common.rbac import SUPER_ADMIN


def make_student(email="s@t.dev"):
    user = User.objects.create_user(
        email=email, username=email.split("@")[0], display_name="Stu", password="pass12345", role="student"
    )
    return StudentProfile.objects.create(user=user, selected_interest="Web", selected_track="React")


def make_admin(email="super@t.dev"):
    return User.objects.create_user(
        email=email, username=email.split("@")[0], display_name="A", password="pass12345",
        role="admin", admin_role=SUPER_ADMIN,
    )


def make_course():
    teacher_user = User.objects.create_user(
        email="t@t.dev", username="t", display_name="T", password="pass12345", role="teacher"
    )
    teacher = TeacherProfile.objects.create(user=teacher_user, program="Web", track="React")
    category = Category.objects.create(name="Web")
    subcategory = Subcategory.objects.create(category=category, name="React")
    return Course.objects.create(
        teacher=teacher, category=category, subcategory=subcategory, title="Free Course", subtitle="s",
        overview="o", scheme_of_work="w", status="published", visibility="visible", price=0,
    )


def client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


class TestEmails:
    def test_free_enrollment_sends_email(self, db):
        course = make_course()
        student = make_student()
        client_for(student.user).post(f"/api/courses/{course.id}/enroll/")
        assert len(mail.outbox) == 1
        assert "enrolled" in mail.outbox[0].subject.lower()
        assert mail.outbox[0].to == [student.user.email]


class TestStudentSupport:
    def test_student_creates_and_lists_ticket(self, db):
        student = make_student()
        res = client_for(student.user).post(
            "/api/student/support-tickets/",
            {"category": "technical", "title": "Cannot play video", "description": "Lesson 3 won't load."},
            format="json",
        )
        assert res.status_code == 201
        listing = client_for(student.user).get("/api/student/support-tickets/")
        assert len(listing.json()) == 1
        assert listing.json()[0]["title"] == "Cannot play video"

    def test_admin_reply_notifies_and_emails_student(self, db):
        student = make_student()
        ticket = SupportTicket.objects.create(
            created_by=student.user, category="technical", title="Help", description="x", status="open"
        )
        admin = make_admin()
        mail.outbox.clear()
        res = client_for(admin).patch(
            f"/api/admin/support-tickets/{ticket.id}/",
            {"status": "resolved", "admin_notes": "Fixed — please refresh."},
            format="json",
        )
        assert res.status_code == 200
        # In-app notification to the student
        assert Notification.objects.filter(user=student.user, title__icontains="support ticket").exists()
        # Email to the student
        assert any(student.user.email in m.to for m in mail.outbox)

    def test_students_only_see_own_tickets(self, db):
        a = make_student("a@t.dev")
        b = make_student("b@t.dev")
        SupportTicket.objects.create(created_by=a.user, category="other", title="A ticket", description="x")
        res = client_for(b.user).get("/api/student/support-tickets/")
        assert res.json() == []
