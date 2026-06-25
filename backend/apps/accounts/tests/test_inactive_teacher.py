import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import TeacherProfile, User
from common.rbac import SUPER_ADMIN


def _client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def test_inactive_teacher_cannot_login(db):
    user = User.objects.create_user(
        email="inactive@teacher.com",
        username="inactive",
        password="pass12345",
        display_name="Inactive Teacher",
        role="teacher",
    )
    TeacherProfile.objects.create(user=user, program="Web Dev", track="React", status="inactive")

    response = APIClient().post(
        "/api/auth/login/",
        {"email": user.email, "password": "pass12345"},
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_inactive_teacher_cannot_access_teacher_api(db):
    user = User.objects.create_user(
        email="blocked@teacher.com",
        username="blocked",
        password="pass12345",
        display_name="Blocked Teacher",
        role="teacher",
    )
    TeacherProfile.objects.create(user=user, program="Web Dev", track="React", status="inactive")

    response = _client_for(user).get("/api/dashboard/teacher/")
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_deactivating_teacher_sets_user_inactive():
    admin = User.objects.create_user(
        email="admin@test.com",
        username="admin",
        password="pass12345",
        display_name="Admin",
        role="admin",
        admin_role=SUPER_ADMIN,
        is_staff=True,
    )
    teacher_user = User.objects.create_user(
        email="teacher@test.com",
        username="teacher",
        password="pass12345",
        display_name="Teacher",
        role="teacher",
    )
    teacher = TeacherProfile.objects.create(user=teacher_user, program="Web Dev", track="React", status="active")

    response = _client_for(admin).patch(
        f"/api/admin/teachers/{teacher.id}/",
        {"status": "inactive"},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK

    teacher_user.refresh_from_db()
    assert teacher_user.is_active is False
