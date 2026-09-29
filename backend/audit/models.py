from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class AuditLog(models.Model):
    """Complete audit trail for all significant actions in the system."""
    ACTION_CHOICES = [
        ('create', 'Created'),
        ('update', 'Updated'),
        ('delete', 'Deleted'),
        ('submit', 'Submitted'),
        ('approve', 'Approved'),
        ('reject', 'Rejected'),
        ('login', 'Logged In'),
        ('logout', 'Logged Out'),
        ('password_change', 'Password Changed'),
        ('export', 'Data Exported'),
        ('handover', 'Shift Handover'),
    ]

    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs'
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=100, blank=True, help_text='e.g. AHPDryLogEntry')
    object_id = models.CharField(max_length=50, blank=True)
    object_repr = models.CharField(max_length=300, blank=True, help_text='String representation of object')
    old_values = models.JSONField(null=True, blank=True, help_text='Previous field values')
    new_values = models.JSONField(null=True, blank=True, help_text='Updated field values')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    extra_info = models.TextField(blank=True, help_text='Additional context or remarks')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['model_name', 'object_id']),
            models.Index(fields=['action', '-timestamp']),
        ]

    def __str__(self):
        return f'{self.user} → {self.action} {self.model_name}#{self.object_id} @ {self.timestamp}'
