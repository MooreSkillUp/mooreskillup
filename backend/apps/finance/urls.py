from django.urls import path

from .views import CourseEarningTermListView, TeacherTermsView

urlpatterns = [
    path("admin/teachers/<uuid:teacher_id>/terms/", TeacherTermsView.as_view(), name="admin-teacher-terms"),
    path("admin/course-earning-terms/", CourseEarningTermListView.as_view(), name="admin-course-earning-terms"),
]
