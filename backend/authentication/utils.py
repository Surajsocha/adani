import random
import string
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model
from users.models import OTPToken

User = get_user_model()


def generate_otp():
    return ''.join(random.choices(string.digits, k=6))


def create_and_send_otp(user, purpose='login'):
    # Invalidate old OTPs
    OTPToken.objects.filter(user=user, purpose=purpose, is_used=False).update(is_used=True)

    otp = generate_otp()
    expires_at = timezone.now() + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)

    OTPToken.objects.create(
        user=user,
        otp=otp,
        purpose=purpose,
        expires_at=expires_at
    )

    subject_map = {
        'login': 'Your Login OTP – Adani E-Logbook',
        'password_reset': 'Password Reset OTP – Adani E-Logbook',
    }
    body = f"""Dear {user.first_name},

Your One-Time Password (OTP) for {'login' if purpose == 'login' else 'password reset'} is:

    {otp}

This OTP is valid for {settings.OTP_EXPIRY_MINUTES} minutes.

If you did not request this, please contact your administrator immediately.

Regards,
Adani Dahanu Thermal Power Station
E-Logbook System
"""
    send_mail(
        subject=subject_map.get(purpose, 'OTP Verification'),
        message=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
    return otp


def verify_otp(user, otp, purpose='login'):
    token = OTPToken.objects.filter(
        user=user,
        otp=otp,
        purpose=purpose,
        is_used=False,
        expires_at__gt=timezone.now()
    ).first()

    if not token:
        return False

    token.is_used = True
    token.save()
    return True
