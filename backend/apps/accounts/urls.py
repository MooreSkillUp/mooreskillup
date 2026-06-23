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
    TwoFactorToggleView,
    TwoFactorVerifyView,
    VerifyRegisterView,
    ResendRegisterCodeView,
    CompleteOnboardingView,
    health_check,
)

urlpatterns = [
    path("health/", health_check, name="health-check"),
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("register/verify/", VerifyRegisterView.as_view(), name="auth-register-verify"),
    path("register/resend-code/", ResendRegisterCodeView.as_view(), name="auth-register-resend"),
    path("onboard/", CompleteOnboardingView.as_view(), name="auth-onboard"),
    path("admin-register/", AdminRegisterView.as_view(), name="auth-admin-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("login/verify-2fa/", TwoFactorVerifyView.as_view(), name="auth-2fa-verify"),
    path("two-factor/", TwoFactorToggleView.as_view(), name="auth-2fa-toggle"),
    path("refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("change-password/", ChangePasswordView.as_view(), name="auth-change-password"),
    path("password-reset/request/", PasswordResetRequestView.as_view(), name="auth-password-reset-request"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="auth-password-reset-confirm"),
]
