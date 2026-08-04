from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from store.views import storefront

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("store.urls")),
    path("", storefront, name="storefront"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
