from django.urls import path

from . import views

app_name = "orders"

urlpatterns = [
    path("orders/", views.OrderCreateView.as_view(), name="order-create"),
    path("orders/mine/", views.OrderListView.as_view(), name="order-list"),
    path("orders/<str:order_number>/", views.OrderDetailView.as_view(), name="order-detail"),
]
