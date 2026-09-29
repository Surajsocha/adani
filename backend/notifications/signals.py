"""
Signal handlers that create notifications whenever a logbook entry is
submitted / approved / rejected, or an event is recorded.
Also sends email notifications if SMTP is configured.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model
from .models import Notification

User = get_user_model()


def _notify(recipient, sender, ntype, priority, title, message, link=''):
    """Create an in-app notification and attempt email delivery."""
    notif = Notification.objects.create(
        recipient=recipient,
        sender=sender,
        notification_type=ntype,
        priority=priority,
        title=title,
        message=message,
        link=link,
    )
    # Attempt email
    try:
        if recipient.email and settings.EMAIL_HOST_USER:
            send_mail(
                subject=f'[ADTPS E-Logbook] {title}',
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient.email],
                fail_silently=True,
            )
            notif.is_email_sent = True
            notif.save(update_fields=['is_email_sent'])
    except Exception:
        pass
    return notif


def notify_supervisors(sender_user, ntype, priority, title, message, link=''):
    """Notify all supervisors, dept_admins, and superadmins."""
    supervisors = User.objects.filter(
        role__in=['supervisor', 'dept_admin', 'superadmin'],
        is_active=True
    ).exclude(id=sender_user.id)
    for sup in supervisors:
        _notify(sup, sender_user, ntype, priority, title, message, link)


def notify_user(recipient, sender_user, ntype, priority, title, message, link=''):
    """Notify a specific user."""
    _notify(recipient, sender_user, ntype, priority, title, message, link)
