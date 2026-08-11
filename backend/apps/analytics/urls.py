from django.urls import path

from . import views

app_name = "analytics"

urlpatterns = [
    path("analytics/price-history/", views.PriceHistoryView.as_view(), name="price-history"),
    path("analytics/product-view/", views.ProductViewLogView.as_view(), name="product-view"),
    path("analytics/popular/", views.PopularProductsView.as_view(), name="popular-products"),
]
