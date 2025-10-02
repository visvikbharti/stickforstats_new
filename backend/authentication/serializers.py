from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    confirmPassword = serializers.CharField(write_only=True, required=True, source='password2')
    email = serializers.EmailField(required=True)
    firstName = serializers.CharField(required=True, source='first_name')
    lastName = serializers.CharField(required=True, source='last_name')
    organization = serializers.CharField(required=False, allow_blank=True)
    role = serializers.CharField(required=False, allow_blank=True)
    acceptTerms = serializers.BooleanField(required=False)

    class Meta:
        model = User
        fields = ('email', 'password', 'confirmPassword', 'firstName', 'lastName', 'organization', 'role', 'acceptTerms')

    def validate(self, attrs):
        if attrs['password'] != attrs.get('password2'):
            raise serializers.ValidationError({"confirmPassword": "Password fields didn't match."})
        if not attrs.get('acceptTerms', False):
            raise serializers.ValidationError({"acceptTerms": "You must accept the terms and conditions."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2', None)
        validated_data.pop('organization', None)
        validated_data.pop('role', None)
        validated_data.pop('acceptTerms', None)
        user = User.objects.create_user(
            username=validated_data['email'],  # Use email as username
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        return user

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()
