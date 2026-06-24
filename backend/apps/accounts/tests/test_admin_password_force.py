import pytest
from rest_framework import status
from django.contrib.auth import get_user_model
from common.rbac import SUPER_ADMIN, ADMIN, MODERATOR
from apps.accounts.models import PasswordResetToken

User = get_user_model()

def make_user(role, admin_role=None, email=None):
    email = email or f"{role}_{admin_role or ''}@test.dev"
    return User.objects.create_user(
        email=email,
        username=email.split("@")[0],
        display_name=role.capitalize(),
        role=role,
        admin_role=admin_role,
        is_staff=(role == "admin"),
    )

def client_for(user):
    from rest_framework.test import APIClient
    client = APIClient()
    client.force_authenticate(user=user)
    return client

@pytest.mark.django_db
class TestAdminPasswordForceFlow:

    def test_super_admin_create_admin_sets_must_change_password(self):
        super_admin = make_user("admin", SUPER_ADMIN)
        payload = {
            "displayName": "New Admin User",
            "email": "newadmin@test.dev",
            "adminRole": "admin",
            "password": "initialTemporaryPassword123"
        }
        res = client_for(super_admin).post("/api/admin/admins/", payload, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        new_admin = User.objects.get(email="newadmin@test.dev")
        assert new_admin.must_change_password is True

    def test_resend_credentials_sets_must_change_password(self):
        super_admin = make_user("admin", SUPER_ADMIN)
        admin = make_user("admin", ADMIN)
        admin.must_change_password = False
        admin.save()

        res = client_for(super_admin).post(f"/api/admin/admins/{admin.id}/resend-credentials/")
        assert res.status_code == status.HTTP_200_OK
        admin.refresh_from_db()
        assert admin.must_change_password is True

    def test_admin_change_password_clears_must_change_password(self):
        admin = make_user("admin", ADMIN)
        admin.must_change_password = True
        admin.save()

        payload = {
            "new_password": "NewSecurePassword123"
        }
        # Admins needing to change password don't need current_password
        res = client_for(admin).post("/api/auth/change-password/", payload, format="json")
        assert res.status_code == status.HTTP_200_OK
        admin.refresh_from_db()
        assert admin.must_change_password is False

    def test_admin_cannot_use_forgot_password(self):
        admin = make_user("admin", ADMIN)
        payload = {
            "email": admin.email
        }
        from rest_framework.test import APIClient
        client = APIClient()
        res = client.post("/api/auth/password-reset/request/", payload, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "Administrator accounts cannot reset passwords publicly" in res.data["detail"]
        assert PasswordResetToken.objects.filter(user=admin).exists() is False

    def test_student_can_still_use_forgot_password(self):
        student = make_user("student")
        payload = {
            "email": student.email
        }
        from rest_framework.test import APIClient
        client = APIClient()
        res = client.post("/api/auth/password-reset/request/", payload, format="json")
        assert res.status_code == status.HTTP_200_OK
