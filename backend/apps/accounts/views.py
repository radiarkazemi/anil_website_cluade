from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializers import (
    AdminTokenObtainPairSerializer,
    ChangePasswordSerializer,
    ClientTokenObtainPairSerializer,
    CustomTokenObtainPairSerializer,
    RegisterSerializer,
    UserSerializer,
)

User = get_user_model()


class LoginView(TokenObtainPairView):
    """Storefront / customer login."""

    serializer_class = ClientTokenObtainPairSerializer


class AdminLoginView(TokenObtainPairView):
    """Ops panel login (staff / admin only)."""

    serializer_class = AdminTokenObtainPairSerializer


class RefreshView(TokenRefreshView):
    pass


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

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


# Keep alias for any import of the old shared serializer name
__all__ = [
    "LoginView",
    "AdminLoginView",
    "RefreshView",
    "RegisterView",
    "ProfileView",
    "ChangePasswordView",
    "LogoutView",
    "CustomTokenObtainPairSerializer",
]
