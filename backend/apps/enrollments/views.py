from rest_framework import permissions, response, status, views
from rest_framework.generics import ListAPIView

from common.permissions import IsStudentUserRole
from apps.courses.models import Course

from .models import Enrollment, Watchlist
from .serializers import EnrollmentSerializer, WatchlistSerializer


class MyCoursesView(ListAPIView):
    serializer_class = EnrollmentSerializer
    permission_classes = [IsStudentUserRole]

    def get_queryset(self):
        return Enrollment.objects.filter(student=self.request.user.student_profile).select_related(
            "course__teacher__user", "course__category", "course__subcategory", "last_lesson"
        )


class WatchlistView(views.APIView):
    permission_classes = [IsStudentUserRole]

    def get(self, request):
        queryset = Watchlist.objects.filter(student=request.user.student_profile).select_related(
            "course__teacher__user", "course__category", "course__subcategory"
        )
        return response.Response(WatchlistSerializer(queryset, many=True, context={"request": request}).data)

    def post(self, request):
        course = Course.objects.get(id=request.data["course_id"])
        entry, _ = Watchlist.objects.get_or_create(student=request.user.student_profile, course=course)
        return response.Response(WatchlistSerializer(entry, context={"request": request}).data, status=status.HTTP_201_CREATED)


class WatchlistDeleteView(views.APIView):
    permission_classes = [IsStudentUserRole]

    def delete(self, request, course_id):
        Watchlist.objects.filter(student=request.user.student_profile, course_id=course_id).delete()
        return response.Response(status=status.HTTP_204_NO_CONTENT)
