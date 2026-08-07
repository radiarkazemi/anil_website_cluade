from django.urls import path

from . import views

app_name = "accounts"

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("admin/login/", views.AdminLoginView.as_view(), name="admin-login"),
    path("token/refresh/", views.RefreshView.as_view(), name="token-refresh"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("profile/", views.ProfileView.as_view(), name="profile"),
    path("change-password/", views.ChangePasswordView.as_view(), name="change-password"),
    path("verify/phone/send/", views.SendPhoneOtpView.as_view(), name="verify-phone-send"),
    path("verify/phone/confirm/", views.ConfirmPhoneOtpView.as_view(), name="verify-phone-confirm"),
    path("verify/email/send/", views.SendEmailOtpView.as_view(), name="verify-email-send"),
    path("verify/email/confirm/", views.ConfirmEmailOtpView.as_view(), name="verify-email-confirm"),
]
