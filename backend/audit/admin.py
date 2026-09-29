from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'model_name', 'object_repr', 'ip_address', 'timestamp']
    list_filter = ['action', 'model_name', 'timestamp']
    search_fields = ['user__employee_id', 'object_repr', 'extra_info']
    readonly_fields = ['user', 'action', 'model_name', 'object_id', 'object_repr',
                       'old_values', 'new_values', 'ip_address', 'user_agent', 'timestamp']
    date_hierarchy = 'timestamp'
