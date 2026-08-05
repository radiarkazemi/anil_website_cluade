from django.urls import path

from . import views

app_name = "orders"

urlpatterns = [
    path("orders/", views.OrderCreateView.as_view(), name="order-create"),
    path("orders/mine/", views.OrderListView.as_view(), name="order-list"),
    path("orders/track/", views.OrderTrackView.as_view(), name="order-track"),
    path("orders/<str:order_number>/", views.OrderDetailView.as_view(), name="order-detail"),
    path("orders/<str:order_number>/pay/", views.OrderPayView.as_view(), name="order-pay"),
    path(
        "orders/<str:order_number>/pay/sandbox-confirm/",
        views.PaymentSandboxConfirmView.as_view(),
        name="order-pay-sandbox",
    ),
    path("payments/gateways/", views.GatewayListView.as_view(), name="payment-gateways"),
    path(
        "payments/callback/<str:gateway>/",
        views.PaymentCallbackView.as_view(),
        name="payment-callback",
    ),
]
