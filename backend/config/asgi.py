import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

django_asgi_app = get_asgi_application()

from apps.store.routing import websocket_urlpatterns  # noqa: E402

ws_app = AuthMiddlewareStack(URLRouter(websocket_urlpatterns))

# Origin check is strict; skip in DEBUG so Vite (localhost:5180) can connect.
if os.environ.get("DEBUG", "True").lower() in ("1", "true", "yes"):
    websocket_application = ws_app
else:
    websocket_application = AllowedHostsOriginValidator(ws_app)

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": websocket_application,
    }
)
