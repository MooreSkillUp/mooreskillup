from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/", include("apps.accounts.admin_urls")),
    path("api/", include("apps.categories.urls")),
    path("api/", include("apps.courses.urls")),
    path("api/", include("apps.enrollments.urls")),
    path("api/", include("apps.payments.urls")),
    path("api/", include("apps.notifications.urls")),
    path("api/", include("apps.progress.urls")),
    path("api/", include("apps.certificates.urls")),
    path("api/", include("apps.platform.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

