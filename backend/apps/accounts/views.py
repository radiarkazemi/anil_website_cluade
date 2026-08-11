from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status, throttling
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializers import (
    AdminTokenObtainPairSerializer,
    ChangePasswordSerializer,
    ClientTokenObtainPairSerializer,
    CustomTokenObtainPairSerializer,
    OtpConfirmSerializer,
    RegisterSerializer,
    UserSerializer,
)
from .verification import (
    check_otp,
    generate_otp,
    send_email_otp,
    send_phone_otp,
    store_otp,
)

User = get_user_model()


class AuthThrottle(throttling.AnonRateThrottle):
    scope = "auth"


class LoginView(TokenObtainPairView):
    """Storefront / customer login."""

    serializer_class = ClientTokenObtainPairSerializer
    throttle_classes = [AuthThrottle]


class AdminLoginView(TokenObtainPairView):
    """Ops panel login (staff / admin only)."""

    serializer_class = AdminTokenObtainPairSerializer
    throttle_classes = [AuthThrottle]


class RefreshView(TokenRefreshView):
    throttle_classes = [AuthThrottle]


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        access = refresh.access_token
        access["role"] = user.role
        access["full_name"] = user.full_name
        access["phone"] = user.phone
        access["panel"] = False
        return Response(
            {
                "user": UserSerializer(user).data,
                "tokens": {
                    "access": str(access),
                    "refresh": str(refresh),
                },
                "next": "/account?tab=profile&complete=1",
                "detail": "ثبت‌نام موفق. برای خرید، موبایل و ایمیل را تأیید کنید.",
            },
            status=status.HTTP_201_CREATED,
        )


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save()
        return Response({"detail": "رمز عبور با موفقیت تغییر کرد."})


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            token = RefreshToken(request.data["refresh"])
            token.blacklist()
        except Exception:
            pass
        return Response({"detail": "خروج موفق."}, status=status.HTTP_200_OK)


class SendPhoneOtpView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AuthThrottle]

    def post(self, request):
        user = request.user
        if user.phone_verified:
            return Response({"detail": "موبایل قبلاً تأیید شده است.", "user": UserSerializer(user).data})
        code = generate_otp()
        store_otp("phone", str(user.id), code)
        payload = send_phone_otp(user, code)
        payload["user"] = UserSerializer(user).data
        return Response(payload)


class ConfirmPhoneOtpView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AuthThrottle]

    def post(self, request):
        ser = OtpConfirmSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = request.user
        if not check_otp("phone", str(user.id), ser.validated_data["code"]):
            return Response({"detail": "کد تأیید موبایل نادرست یا منقضی است."}, status=status.HTTP_400_BAD_REQUEST)
        user.phone_verified = True
        user.save(update_fields=["phone_verified", "updated_at"])
        return Response({"detail": "موبایل تأیید شد.", "user": UserSerializer(user).data})


class SendEmailOtpView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AuthThrottle]

    def post(self, request):
        user = request.user
        if not (user.email or "").strip():
            return Response({"detail": "ابتدا ایمیل را در پروفایل ذخیره کنید."}, status=status.HTTP_400_BAD_REQUEST)
        if user.email_verified:
            return Response({"detail": "ایمیل قبلاً تأیید شده است.", "user": UserSerializer(user).data})
        code = generate_otp()
        store_otp("email", str(user.id), code)
        payload = send_email_otp(user, code)
        payload["user"] = UserSerializer(user).data
        return Response(payload)


class ConfirmEmailOtpView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AuthThrottle]

    def post(self, request):
        ser = OtpConfirmSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = request.user
        if not check_otp("email", str(user.id), ser.validated_data["code"]):
            return Response({"detail": "کد تأیید ایمیل نادرست یا منقضی است."}, status=status.HTTP_400_BAD_REQUEST)
        user.email_verified = True
        user.save(update_fields=["email_verified", "updated_at"])
        return Response({"detail": "ایمیل تأیید شد.", "user": UserSerializer(user).data})


# Keep alias for any import of the old shared serializer name
__all__ = [
    "LoginView",
    "AdminLoginView",
    "RefreshView",
    "RegisterView",
    "ProfileView",
    "ChangePasswordView",
    "LogoutView",
    "SendPhoneOtpView",
    "ConfirmPhoneOtpView",
    "SendEmailOtpView",
    "ConfirmEmailOtpView",
    "CustomTokenObtainPairSerializer",
]
