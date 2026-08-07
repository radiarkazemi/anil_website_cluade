from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .validators import (
    PROFILE_FIELD_LABELS,
    is_profile_ready,
    normalize_iran_mobile,
    profile_missing_fields,
    validate_iran_national_code,
    validate_iran_postal_code,
)

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
        data["user"] = UserSerializer(user).data
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
    email = serializers.EmailField(required=True)
    full_name = serializers.CharField(required=True, max_length=150)
    national_code = serializers.CharField(required=True, max_length=10)
    address = serializers.CharField(required=True)
    city = serializers.CharField(required=True, max_length=80)
    postal_code = serializers.CharField(required=True, max_length=10)

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

    def validate_phone(self, value):
        phone = normalize_iran_mobile(value)
        if User.objects.filter(phone=phone).exists():
            raise serializers.ValidationError("این شماره موبایل قبلاً ثبت شده است.")
        return phone

    def validate_email(self, value):
        email = (value or "").strip().lower()
        if not email:
            raise serializers.ValidationError("ایمیل الزامی است.")
        if User.objects.filter(email__iexact=email).exclude(email="").exists():
            raise serializers.ValidationError("این ایمیل قبلاً ثبت شده است.")
        return email

    def validate_national_code(self, value):
        code = validate_iran_national_code(value)
        if User.objects.filter(national_code=code).exclude(national_code="").exists():
            raise serializers.ValidationError("این کد ملی قبلاً ثبت شده است.")
        return code

    def validate_postal_code(self, value):
        return validate_iran_postal_code(value)

    def validate_full_name(self, value):
        name = (value or "").strip()
        if len(name) < 3:
            raise serializers.ValidationError("نام و نام خانوادگی را کامل وارد کنید.")
        return name

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
        user.email_verified = False
        user.phone_verified = False
        user.set_password(password)
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    profile_complete = serializers.SerializerMethodField()
    missing_fields = serializers.SerializerMethodField()
    missing_field_labels = serializers.SerializerMethodField()

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
            "profile_complete",
            "missing_fields",
            "missing_field_labels",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "role",
            "email_verified",
            "phone_verified",
            "profile_complete",
            "missing_fields",
            "missing_field_labels",
            "created_at",
        ]

    def get_profile_complete(self, obj):
        return is_profile_ready(obj)

    def get_missing_fields(self, obj):
        return profile_missing_fields(obj)

    def get_missing_field_labels(self, obj):
        return [PROFILE_FIELD_LABELS.get(k, k) for k in profile_missing_fields(obj)]

    def validate_phone(self, value):
        phone = normalize_iran_mobile(value)
        qs = User.objects.filter(phone=phone)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("این شماره موبایل قبلاً ثبت شده است.")
        return phone

    def validate_email(self, value):
        email = (value or "").strip().lower()
        if not email:
            raise serializers.ValidationError("ایمیل الزامی است.")
        qs = User.objects.filter(email__iexact=email).exclude(email="")
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("این ایمیل قبلاً ثبت شده است.")
        return email

    def validate_national_code(self, value):
        if value in (None, ""):
            return ""
        code = validate_iran_national_code(value)
        qs = User.objects.filter(national_code=code).exclude(national_code="")
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("این کد ملی قبلاً ثبت شده است.")
        return code

    def validate_postal_code(self, value):
        if value in (None, ""):
            return ""
        return validate_iran_postal_code(value)

    def update(self, instance, validated_data):
        # Changing phone/email resets verification
        if "phone" in validated_data and validated_data["phone"] != instance.phone:
            instance.phone_verified = False
        if "email" in validated_data and validated_data["email"] != instance.email:
            instance.email_verified = False
        return super().update(instance, validated_data)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField()
    new_password = serializers.CharField(validators=[validate_password])

    def validate_old_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("رمز عبور فعلی نادرست است.")
        return value


class OtpConfirmSerializer(serializers.Serializer):
    code = serializers.CharField(min_length=4, max_length=8)
