import pytest
from django.core import mail
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import PendingRegistration, User, StudentProfile
from apps.platform.models import PlatformSettings

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def setup_platform_settings(db):
    settings = PlatformSettings.get_solo()
    settings.student_registration_open = True
    settings.save()
    return settings

def test_registration_initiates_pending_registration_and_sends_email(db, api_client, setup_platform_settings):
    payload = {
        "email": "student@test.dev",
        "username": "teststudent",
        "password": "password123",
        "confirm": "password123",
        "selectedInterest": "Backend Development",
        "selectedTrack": "Backend with Python",
        "selectedTracks": ["Backend with Python"],
        "plan": "free"
    }
    
    response = api_client.post("/api/auth/register/", payload, format="json")
    
    assert response.status_code == status.HTTP_200_OK
    assert "pendingId" in response.data
    assert response.data["email"] == "student@test.dev"
    
    # Verify PendingRegistration created
    pending = PendingRegistration.objects.filter(email="student@test.dev").first()
    assert pending is not None
    assert pending.username == "teststudent"
    assert pending.selected_interest == "Backend Development"
    assert pending.selected_track == "Backend with Python"
    
    # Verify email sent
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ["student@test.dev"]
    assert pending.code in mail.outbox[0].body

def test_successful_verification_creates_user_and_deletes_pending(db, api_client):
    pending = PendingRegistration.objects.create(
        email="verify@test.dev",
        username="verifyuser",
        display_name="Verify User",
        password="pbkdf2_sha256$870000$somehashedpassword",
        role="student",
        selected_interest="Backend Development",
        selected_track="Backend with Python",
        selected_tracks=["Backend with Python"],
        plan="free",
        code="123456",
        expires_at=timezone.now() + timedelta(minutes=10)
    )
    
    payload = {
        "pendingId": str(pending.id),
        "code": "123456"
    }
    
    response = api_client.post("/api/auth/register/verify/", payload, format="json")
    
    assert response.status_code == status.HTTP_201_CREATED
    assert "access" in response.data
    # Refresh token may or may not be present depending on auth config
    assert response.data["user"]["email"] == "verify@test.dev"
    
    # Verify User and StudentProfile created
    user = User.objects.filter(email="verify@test.dev").first()
    assert user is not None
    assert user.username == "verifyuser"
    assert user.password == "pbkdf2_sha256$870000$somehashedpassword"
    
    profile = StudentProfile.objects.filter(user=user).first()
    assert profile is not None
    assert profile.onboarded is False
    
    # Verify PendingRegistration deleted
    assert not PendingRegistration.objects.filter(id=pending.id).exists()

def test_verification_with_invalid_code_fails(db, api_client):
    pending = PendingRegistration.objects.create(
        email="verify@test.dev",
        username="verifyuser",
        display_name="Verify User",
        password="pbkdf2_sha256$870000$somehashedpassword",
        role="student",
        code="123456",
        expires_at=timezone.now() + timedelta(minutes=10)
    )
    
    payload = {
        "pendingId": str(pending.id),
        "code": "654321"  # Wrong code
    }
    
    response = api_client.post("/api/auth/register/verify/", payload, format="json")
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["detail"] == "Invalid verification code."
    
    # Verify user was not created, pending registration still exists
    assert not User.objects.filter(email="verify@test.dev").exists()
    assert PendingRegistration.objects.filter(id=pending.id).exists()

def test_verification_with_expired_code_fails(db, api_client):
    pending = PendingRegistration.objects.create(
        email="verify@test.dev",
        username="verifyuser",
        display_name="Verify User",
        password="pbkdf2_sha256$870000$somehashedpassword",
        role="student",
        code="123456",
        expires_at=timezone.now() - timedelta(minutes=1)  # Expired
    )
    
    payload = {
        "pendingId": str(pending.id),
        "code": "123456"
    }
    
    response = api_client.post("/api/auth/register/verify/", payload, format="json")
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "expired" in response.data["detail"].lower()
    
    # Verify user was not created, pending registration was cleaned up (deleted)
    assert not User.objects.filter(email="verify@test.dev").exists()
    assert not PendingRegistration.objects.filter(id=pending.id).exists()

def test_resend_code_updates_pending_and_sends_new_email(db, api_client):
    pending = PendingRegistration.objects.create(
        email="resend@test.dev",
        username="resenduser",
        display_name="Resend User",
        password="pbkdf2_sha256$870000$somehashedpassword",
        role="student",
        code="111111",
        expires_at=timezone.now() + timedelta(minutes=5)
    )
    
    mail.outbox.clear()
    
    payload = {
        "pendingId": str(pending.id)
    }
    
    response = api_client.post("/api/auth/register/resend-code/", payload, format="json")
    
    assert response.status_code == status.HTTP_200_OK
    
    # Verify code updated
    pending.refresh_from_db()
    assert pending.code != "111111"
    assert pending.expires_at > timezone.now() + timedelta(minutes=9)
    
    # Verify email sent
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ["resend@test.dev"]
    assert pending.code in mail.outbox[0].body

def test_complete_onboarding_updates_profile(db, api_client):
    user = User.objects.create_user(
        email="student@test.dev",
        username="student",
        display_name="Student User",
        password="password123",
        role="student"
    )
    profile = StudentProfile.objects.create(
        user=user,
        selected_interest="Backend Development",
        selected_track="Backend with Python",
        selected_tracks=["Backend with Python"],
        onboarded=False
    )
    
    api_client.force_authenticate(user=user)
    
    response = api_client.post("/api/auth/onboard/", format="json")
    
    assert response.status_code == status.HTTP_200_OK
    
    profile.refresh_from_db()
    assert profile.onboarded is True
