from rest_framework.permissions import BasePermission


def is_active_teacher(user) -> bool:
    if not user or not user.is_authenticated or user.role != "teacher":
        return False
    if not user.is_active:
        return False
    try:
        profile = user.teacher_profile
    except Exception:
        return False
    return profile.status == "active"


class IsAdminUserRole(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "admin")


class IsTeacherUserRole(BasePermission):
    def has_permission(self, request, view):
        return is_active_teacher(request.user)


class IsStudentUserRole(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "student")
