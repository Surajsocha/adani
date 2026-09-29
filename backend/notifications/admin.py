from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['recipient', 'notification_type', 'title', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read', 'priority']
    search_fields = ['title', 'message', 'recipient__employee_id']
    readonly_fields = ['created_at', 'read_at']
