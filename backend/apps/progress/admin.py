from django.contrib import admin

from .models import CourseProgress, LessonProgress

admin.site.register(LessonProgress)
admin.site.register(CourseProgress)
