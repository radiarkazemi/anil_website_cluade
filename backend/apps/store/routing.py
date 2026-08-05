from django.urls import re_path

from apps.store.consumers import GoldPriceConsumer

websocket_urlpatterns = [
    re_path(r"^ws/gold/?$", GoldPriceConsumer.as_asgi()),
    re_path(r"^ws/gold-price/?$", GoldPriceConsumer.as_asgi()),
]
