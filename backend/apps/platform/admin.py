from django.contrib import admin

from .models import AuditLog, AuthenticationSettings, PlatformSettings


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "actor_email", "actor_role", "action", "resource_name", "status")
    list_filter = ("action", "status", "actor_role")
    search_fields = ("actor_email", "actor_name", "resource_name", "action")
    readonly_fields = [field.name for field in AuditLog._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(PlatformSettings)
class PlatformSettingsAdmin(admin.ModelAdmin):
    list_display = ("site_name", "maintenance_mode", "student_registration_open", "audit_retention_days")


@admin.register(AuthenticationSettings)
class AuthenticationSettingsAdmin(admin.ModelAdmin):
    list_display = ("max_student_devices", "max_teacher_devices", "max_admin_devices", "updated_at")
