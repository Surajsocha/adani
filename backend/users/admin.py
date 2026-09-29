from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Department, OTPToken

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ['employee_id', 'email', 'full_name', 'role', 'is_active']
    list_filter = ['role', 'is_active', 'departments']
    search_fields = ['employee_id', 'email', 'first_name', 'last_name']
    ordering = ['employee_id']
    filter_horizontal = ['departments', 'groups', 'user_permissions']
    fieldsets = (
        (None, {'fields': ('employee_id', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'email', 'phone', 'profile_picture')}),
        ('Permissions', {'fields': ('role', 'departments', 'is_active', 'is_staff', 'is_superuser', 'is_2fa_enabled', 'groups', 'user_permissions')}),
        ('Security', {'fields': ('failed_login_attempts', 'locked_until', 'last_login_ip')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('employee_id', 'email', 'first_name', 'last_name', 'role', 'password1', 'password2'),
        }),
    )

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'is_active']

@admin.register(OTPToken)
class OTPTokenAdmin(admin.ModelAdmin):
    list_display = ['user', 'purpose', 'created_at', 'expires_at', 'is_used']
