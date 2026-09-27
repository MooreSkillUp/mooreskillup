from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .revenue_views import (
    CostEntryViewSet,
    RevenuePeriodListView,
    RevenueSplitView,
    SplitPolicyViewSet,
)
from .views import CourseEarningTermListView, TeacherTermsView

router = DefaultRouter()
router.register("admin/costs", CostEntryViewSet, basename="admin-costs")
router.register("admin/split-policies", SplitPolicyViewSet, basename="admin-split-policies")

urlpatterns = [
    path("", include(router.urls)),
    path("admin/teachers/<uuid:teacher_id>/terms/", TeacherTermsView.as_view(), name="admin-teacher-terms"),
    path(
        "admin/course-earning-terms/",
        CourseEarningTermListView.as_view(),
        name="admin-course-earning-terms",
    ),
    path("admin/revenue-split/", RevenueSplitView.as_view(), name="admin-revenue-split"),
    path("admin/revenue-periods/", RevenuePeriodListView.as_view(), name="admin-revenue-periods"),
]
