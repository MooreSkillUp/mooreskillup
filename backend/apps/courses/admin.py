from django.contrib import admin

from .models import Course, CourseTag, Lesson, Section, Task

admin.site.register(Course)
admin.site.register(CourseTag)
admin.site.register(Section)
admin.site.register(Lesson)
admin.site.register(Task)
