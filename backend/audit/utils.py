"""
Utility to log audit entries from views.
Usage:
    from audit.utils import log_audit
    log_audit(request, 'create', 'AHPDryLogEntry', entry.id, str(entry))
"""
from .models import AuditLog


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0]
    return request.META.get('REMOTE_ADDR')


def log_audit(request, action, model_name='', object_id='', object_repr='',
              old_values=None, new_values=None, extra_info=''):
    """Create an audit log entry."""
    return AuditLog.objects.create(
        user=request.user if request and request.user.is_authenticated else None,
        action=action,
        model_name=model_name,
        object_id=str(object_id),
        object_repr=object_repr[:300],
        old_values=old_values,
        new_values=new_values,
        ip_address=get_client_ip(request) if request else None,
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500] if request else '',
        extra_info=extra_info,
    )
