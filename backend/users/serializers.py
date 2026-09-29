from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Department

User = get_user_model()


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'code', 'name', 'description', 'is_active']


class UserSerializer(serializers.ModelSerializer):
    departments = DepartmentSerializer(many=True, read_only=True)
    department_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Department.objects.all(),
        source='departments', write_only=True, required=False
    )
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = [
            'id', 'employee_id', 'email', 'first_name', 'last_name',
            'phone', 'role', 'departments', 'department_ids', 'is_active',
            'is_2fa_enabled', 'full_name', 'profile_picture',
            'created_at', 'updated_at', 'last_login_ip'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_login_ip']


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    department_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Department.objects.all(),
        source='departments', write_only=True, required=False
    )

    class Meta:
        model = User
        fields = [
            'employee_id', 'email', 'first_name', 'last_name',
            'phone', 'role', 'department_ids', 'password', 'is_2fa_enabled'
        ]

    def create(self, validated_data):
        departments = validated_data.pop('departments', [])
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        if departments:
            user.departments.set(departments)
        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Incorrect current password.')
        return value


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'profile_picture', 'is_2fa_enabled']
