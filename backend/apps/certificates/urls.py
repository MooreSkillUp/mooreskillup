from django.urls import path

from .views import CertificateGenerateView, CertificateListView

urlpatterns = [
    path("certificates/", CertificateListView.as_view(), name="certificates"),
    path("certificates/<uuid:course_id>/generate/", CertificateGenerateView.as_view(), name="certificate-generate"),
]
