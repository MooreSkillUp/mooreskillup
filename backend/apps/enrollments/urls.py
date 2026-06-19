from django.urls import path

from .views import EnrollFreeView, MyCoursesView, WatchlistDeleteView, WatchlistView

urlpatterns = [
    path("my-courses/", MyCoursesView.as_view(), name="my-courses"),
    path("courses/<uuid:course_id>/enroll/", EnrollFreeView.as_view(), name="enroll-free"),
    path("watchlist/", WatchlistView.as_view(), name="watchlist"),
    path("watchlist/<uuid:course_id>/", WatchlistDeleteView.as_view(), name="watchlist-delete"),
]
