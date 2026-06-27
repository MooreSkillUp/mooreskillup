from django.contrib import admin

from .models import PasswordResetToken, StudentProfile, TeacherProfile, User, UserSession

admin.site.register(User)
admin.site.register(TeacherProfile)
admin.site.register(StudentProfile)
admin.site.register(PasswordResetToken)
admin.site.register(UserSession)
