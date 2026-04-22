from django.contrib import admin

from .models import PasswordResetToken, StudentProfile, TeacherProfile, User

admin.site.register(User)
admin.site.register(TeacherProfile)
admin.site.register(StudentProfile)
admin.site.register(PasswordResetToken)
