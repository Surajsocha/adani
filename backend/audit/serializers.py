from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True, default='System')
    user_employee_id = serializers.CharField(source='user.employee_id', read_only=True, default=None)
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user_name', 'user_employee_id', 'action', 'action_display',
            'model_name', 'object_id', 'object_repr',
            'old_values', 'new_values', 'ip_address',
            'extra_info', 'timestamp',
        ]
