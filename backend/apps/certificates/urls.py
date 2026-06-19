from django.urls import path

from .views import (
    AdminCertificateListView,
    AdminCertificateRevokeView,
    AdminCertificateTemplateView,
    CertificateGenerateView,
    CertificateListView,
    CertificateVerifyView,
    PublicCertificateTemplateView,
)

urlpatterns = [
    path("certificates/", CertificateListView.as_view(), name="certificates"),
    path("certificates/template/", PublicCertificateTemplateView.as_view(), name="certificate-template-public"),
    path("certificates/verify/<str:code>/", CertificateVerifyView.as_view(), name="certificate-verify"),
    path("certificates/<uuid:course_id>/generate/", CertificateGenerateView.as_view(), name="certificate-generate"),
    path("admin/certificates/", AdminCertificateListView.as_view(), name="admin-certificates"),
    path("admin/certificates/template/", AdminCertificateTemplateView.as_view(), name="admin-certificate-template"),
    path("admin/certificates/<uuid:certificate_id>/revoke/", AdminCertificateRevokeView.as_view(), name="admin-certificate-revoke"),
]
