from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import get_user_model
from django.utils import timezone
from .serializers import (
    LoginSerializer, OTPVerifySerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer
)
from .utils import create_and_send_otp, verify_otp
from users.serializers import UserSerializer

User = get_user_model()


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0]
    return request.META.get('REMOTE_ADDR')


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        employee_id = serializer.validated_data['employee_id']
        password = serializer.validated_data['password']

        try:
            user = User.objects.get(employee_id=employee_id)
        except User.DoesNotExist:
            return Response({'error': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

        # Check account lock
        if user.locked_until and user.locked_until > timezone.now():
            minutes_left = int((user.locked_until - timezone.now()).total_seconds() / 60) + 1
            return Response(
                {'error': f'Account locked. Try again in {minutes_left} minute(s).'},
                status=status.HTTP_403_FORBIDDEN
            )

        if not user.check_password(password):
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.locked_until = timezone.now() + timezone.timedelta(minutes=30)
                user.failed_login_attempts = 0
            user.save()
            return Response({'error': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({'error': 'Account is deactivated.'}, status=status.HTTP_403_FORBIDDEN)

        # Reset failed attempts on success
        user.failed_login_attempts = 0
        user.locked_until = None
        user.save()

        if user.is_2fa_enabled:
            try:
                create_and_send_otp(user, purpose='login')
            except Exception:
                pass  # Don't fail if email is misconfigured in demo
            return Response({
                'requires_otp': True,
                'employee_id': employee_id,
                'message': f'OTP sent to {user.email[:3]}***@{user.email.split("@")[1]}'
            }, status=status.HTTP_200_OK)

        # No 2FA — issue tokens directly
        refresh = RefreshToken.for_user(user)
        user.last_login_ip = get_client_ip(request)
        user.save(update_fields=['last_login_ip'])
        return Response({
            'requires_otp': False,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        })


class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        employee_id = serializer.validated_data['employee_id']
        otp = serializer.validated_data['otp']

        try:
            user = User.objects.get(employee_id=employee_id)
        except User.DoesNotExist:
            return Response({'error': 'Invalid request.'}, status=status.HTTP_400_BAD_REQUEST)

        if not verify_otp(user, otp, purpose='login'):
            return Response({'error': 'Invalid or expired OTP.'}, status=status.HTTP_400_BAD_REQUEST)

        refresh = RefreshToken.for_user(user)
        user.last_login_ip = get_client_ip(request)
        user.save(update_fields=['last_login_ip'])
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        })


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({'message': 'Logged out successfully.'})
        except TokenError:
            return Response({'error': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)


class ResendOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        employee_id = request.data.get('employee_id')
        try:
            user = User.objects.get(employee_id=employee_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            create_and_send_otp(user, purpose='login')
        except Exception:
            pass
        return Response({'message': 'OTP resent.'})


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        try:
            user = User.objects.get(email=email)
            create_and_send_otp(user, purpose='password_reset')
        except User.DoesNotExist:
            pass  # Don't reveal if email exists
        return Response({'message': 'If this email is registered, you will receive an OTP.'})


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        otp = serializer.validated_data['otp']
        new_password = serializer.validated_data['new_password']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'Invalid request.'}, status=status.HTTP_400_BAD_REQUEST)

        if not verify_otp(user, otp, purpose='password_reset'):
            return Response({'error': 'Invalid or expired OTP.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password reset successfully.'})
