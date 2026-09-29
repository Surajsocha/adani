from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import AuditLog
from .serializers import AuditLogSerializer
from users.permissions import IsDeptAdminOrHigher


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only audit trail. Only dept_admin and superadmin can view."""
    queryset = AuditLog.objects.select_related('user').all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsDeptAdminOrHigher]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['action', 'model_name', 'user__employee_id']
    search_fields = ['object_repr', 'extra_info', 'user__first_name', 'user__last_name']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']
