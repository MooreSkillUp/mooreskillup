from django.urls import path

from .views import MyCoursesView, WatchlistDeleteView, WatchlistView

urlpatterns = [
    path("my-courses/", MyCoursesView.as_view(), name="my-courses"),
    path("watchlist/", WatchlistView.as_view(), name="watchlist"),
    path("watchlist/<uuid:course_id>/", WatchlistDeleteView.as_view(), name="watchlist-delete"),
]
