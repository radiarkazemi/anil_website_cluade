from django.urls import path

from . import views

app_name = "store"

urlpatterns = [
    path("gold-price/", views.GoldPriceView.as_view(), name="gold-price"),
    path("categories/", views.CategoryListView.as_view(), name="categories"),
    path("products/", views.ProductListView.as_view(), name="products"),
    path("products/<str:slug>/", views.ProductDetailView.as_view(), name="product-detail"),
    path("wishlist/", views.WishlistListCreateView.as_view(), name="wishlist"),
    path("wishlist/<uuid:pk>/", views.WishlistDeleteView.as_view(), name="wishlist-delete"),
]
