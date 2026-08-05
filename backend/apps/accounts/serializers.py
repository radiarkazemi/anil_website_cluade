from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


def user_can_access_panel(user) -> bool:
    """Staff / admin / superuser may enter the ops panel."""
    if user is None:
        return False
    return bool(
        getattr(user, "is_admin", False)
        or getattr(user, "is_staff", False)
        or getattr(user, "is_superuser", False)
        or getattr(user, "role", None) in (User.Role.ADMIN, User.Role.STAFF)
    )


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Embeds user role + name into the JWT claims."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["full_name"] = user.full_name
        token["phone"] = user.phone
        token["panel"] = user_can_access_panel(user)
        return token


class ClientTokenObtainPairSerializer(CustomTokenObtainPairSerializer):
    """Storefront login — customers only."""

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        if user_can_access_panel(user):
            raise AuthenticationFailed(
                "این حساب مربوط به پنل مدیریت است. از صفحه ورود مدیریت استفاده کنید."
            )
        data["user"] = {
            "id": str(user.id),
            "phone": user.phone,
            "full_name": user.full_name,
            "role": user.role,
        }
        return data


class AdminTokenObtainPairSerializer(CustomTokenObtainPairSerializer):
    """Ops panel login — staff / admin only."""

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        if not user_can_access_panel(user):
            raise AuthenticationFailed("دسترسی به پنل مدیریت برای این حساب مجاز نیست.")
        data["user"] = {
            "id": str(user.id),
            "phone": user.phone,
            "full_name": user.full_name,
            "role": user.role,
        }
        return data


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "phone",
            "email",
            "full_name",
            "password",
            "password_confirm",
            "national_code",
            "address",
            "city",
            "postal_code",
        ]

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "رمز عبور مطابقت ندارد."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.role = User.Role.CUSTOMER
        user.is_staff = False
        user.is_superuser = False
        user.set_password(password)
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "phone",
            "email",
            "full_name",
            "role",
            "national_code",
            "address",
            "city",
            "postal_code",
            "avatar",
            "email_verified",
            "phone_verified",
            "created_at",
        ]
        read_only_fields = ["id", "role", "email_verified", "phone_verified", "created_at"]


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField()
    new_password = serializers.CharField(validators=[validate_password])

    def validate_old_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("رمز عبور فعلی نادرست است.")
        return value
