from django.apps import AppConfig


class StoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.store"
    verbose_name = "فروشگاه"

    def ready(self):
        # Start Faraz → WebSocket poller (no-op under migrate/test)
        try:
            from apps.store.services.streamer import start_streamer

            start_streamer()
        except Exception:
            pass
