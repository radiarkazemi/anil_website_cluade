from django.urls import path

from . import views

app_name = "analytics"

urlpatterns = [
    path("analytics/price-history/", views.PriceHistoryView.as_view(), name="price-history"),
    path("analytics/product-view/", views.ProductViewLogView.as_view(), name="product-view"),
    path("analytics/site-visit/", views.SiteVisitLogView.as_view(), name="site-visit"),
    path("analytics/popular/", views.PopularProductsView.as_view(), name="popular-products"),
    path("admin/traffic/", views.AdminTrafficView.as_view(), name="admin-traffic"),
    path("admin/traffic/blog/", views.AdminBlogTrafficView.as_view(), name="admin-blog-traffic"),
    path(
        "admin/traffic/blog/<uuid:page_id>/",
        views.AdminBlogPostTrafficView.as_view(),
        name="admin-blog-post-traffic",
    ),
    path("admin/traffic/export/", views.AdminTrafficExportView.as_view(), name="admin-traffic-export"),
]
