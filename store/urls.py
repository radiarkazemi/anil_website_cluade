from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.HealthView.as_view(), name="health"),
    path("gold-price/", views.GoldPriceView.as_view(), name="gold-price"),
    path("categories/", views.CategoryListView.as_view(), name="categories"),
    path("products/", views.ProductListView.as_view(), name="products"),
    path("products/<int:pk>/", views.ProductDetailView.as_view(), name="product-detail"),
    path("orders/", views.OrderCreateView.as_view(), name="orders"),
]
