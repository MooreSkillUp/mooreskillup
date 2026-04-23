from django.urls import path

from .views import (
    AdminRegisterView,
    ChangePasswordView,
    LoginView,
    MeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RefreshView,
    RegisterView,
    health_check,
)

urlpatterns = [
    path("health/", health_check, name="health-check"),
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("admin-register/", AdminRegisterView.as_view(), name="auth-admin-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("change-password/", ChangePasswordView.as_view(), name="auth-change-password"),
    path("password-reset/request/", PasswordResetRequestView.as_view(), name="auth-password-reset-request"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="auth-password-reset-confirm"),
]
