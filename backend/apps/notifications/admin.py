from django.contrib import admin

from .models import BroadcastNotification, Notification

admin.site.register(Notification)
admin.site.register(BroadcastNotification)
