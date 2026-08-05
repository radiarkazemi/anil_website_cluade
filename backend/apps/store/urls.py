from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import admin_api, views

app_name = "store"

router = DefaultRouter()
router.register(r"admin/products", admin_api.AdminProductViewSet, basename="admin-products")
router.register(r"admin/categories", admin_api.AdminCategoryViewSet, basename="admin-categories")
router.register(r"admin/orders", admin_api.AdminOrderViewSet, basename="admin-orders")
router.register(r"admin/users", admin_api.AdminUserViewSet, basename="admin-users")
router.register(r"admin/pages", admin_api.AdminContentPageViewSet, basename="admin-pages")

urlpatterns = [
    path("gold-price/", views.GoldPriceView.as_view(), name="gold-price"),
    path("gold-price/live/", views.GoldPriceLiveView.as_view(), name="gold-price-live"),
    path("categories/", views.CategoryListView.as_view(), name="categories"),
    path("site-settings/", views.SiteSettingsView.as_view(), name="site-settings"),
    path("pages/", views.ContentPageListView.as_view(), name="pages"),
    path("pages/<str:slug>/", views.ContentPageDetailView.as_view(), name="page-detail"),
    path("products/", views.ProductListView.as_view(), name="products"),
    path("products/<str:slug>/", views.ProductDetailView.as_view(), name="product-detail"),
    path("wishlist/", views.WishlistListCreateView.as_view(), name="wishlist"),
    path("wishlist/<uuid:pk>/", views.WishlistDeleteView.as_view(), name="wishlist-delete"),
    # Admin panel API
    path("admin/dashboard/", admin_api.DashboardView.as_view(), name="admin-dashboard"),
    path("admin/gold-price/", admin_api.AdminGoldPriceListCreateView.as_view(), name="admin-gold"),
    path("admin/gold-price/refresh/", admin_api.AdminGoldRefreshView.as_view(), name="admin-gold-refresh"),
    path(
        "admin/products/<uuid:product_id>/images/",
        admin_api.AdminProductImageUploadView.as_view(),
        name="admin-product-images",
    ),
    path("admin/site-settings/", admin_api.AdminSiteSettingsView.as_view(), name="admin-site-settings"),
    path(
        "admin/categories/<uuid:category_id>/image/",
        admin_api.AdminCategoryImageUploadView.as_view(),
        name="admin-category-image",
    ),
    path("", include(router.urls)),
]
