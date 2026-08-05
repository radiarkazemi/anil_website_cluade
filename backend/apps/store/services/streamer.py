"""Background Faraz poller → channel-layer broadcast + occasional DB persist."""

from __future__ import annotations

import logging
import os
import threading
import time
from typing import Any

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone

from apps.store.services import price_cache
from apps.store.services.faraz import fetch_from_faraz
from apps.store.services.gold import _db_kwargs, refresh_gold_price

logger = logging.getLogger(__name__)

GOLD_GROUP = "gold_prices"
_started = False
_thread: threading.Thread | None = None
_last_persist_sig: tuple | None = None
_last_persist_at = 0.0


def _poll_seconds() -> float:
    return max(1.0, float(os.environ.get("GOLD_POLL_SECONDS", "3")))


def _persist_seconds() -> float:
    return max(15.0, float(os.environ.get("GOLD_PERSIST_SECONDS", "60")))


def broadcast_quote(quote: dict[str, Any]) -> None:
    layer = get_channel_layer()
    if layer is None:
        return
    try:
        async_to_sync(layer.group_send)(
            GOLD_GROUP,
            {"type": "gold.price", "data": quote},
        )
    except Exception as exc:
        logger.debug("gold broadcast skipped: %s", exc)


def _maybe_persist(payload: dict[str, Any], source: str) -> None:
    global _last_persist_sig, _last_persist_at
    sig = price_cache.signature(payload)
    now = time.time()
    changed = sig != _last_persist_sig
    due = _last_persist_at <= 0 or (now - _last_persist_at) >= _persist_seconds()
    # Persist on meaningful quote change, or periodically for audit trail
    if not changed and not due:
        return
    if not changed and due and _last_persist_sig is not None:
        # periodic snapshot even if flat
        pass
    try:
        from apps.store.models import GoldPrice

        row = GoldPrice.objects.create(
            source=source,
            created_at=timezone.now(),
            **_db_kwargs(payload),
        )
        _last_persist_sig = sig
        _last_persist_at = now
        logger.info("persisted faraz snapshot id=%s g18=%s", row.id, row.price_18k_per_gram)
    except Exception as exc:
        logger.warning("persist gold snapshot failed: %s", exc)


def tick_once() -> dict[str, Any] | None:
    payload, source = fetch_from_faraz()
    if not payload:
        # Keep streaming last known cache; try full refresh path once
        try:
            row = refresh_gold_price(force_live=True, allow_jitter=False)
            quote = price_cache.get_latest()
            if quote:
                broadcast_quote(quote)
            return quote
        except Exception:
            quote = price_cache.get_latest()
            if quote:
                broadcast_quote(quote)
            return quote

    quote = price_cache.public_quote(payload, source=source or "faraz")
    price_cache.set_latest(quote)
    broadcast_quote(quote)
    _maybe_persist(payload, source or "faraz")
    return quote


def _loop() -> None:
    logger.info("gold streamer started poll=%ss", _poll_seconds())
    # Warm cache immediately
    try:
        tick_once()
    except Exception as exc:
        logger.warning("gold streamer warm-up failed: %s", exc)
    while True:
        time.sleep(_poll_seconds())
        try:
            tick_once()
        except Exception as exc:
            logger.warning("gold streamer tick failed: %s", exc)


def start_streamer() -> None:
    """Start daemon poller once per process (skip under migrate/tests)."""
    global _started, _thread
    import sys

    if _started:
        return
    if os.environ.get("GOLD_STREAM", "1").strip().lower() in ("0", "false", "no"):
        return
    # Avoid double-start under Django autoreload parent
    if "runserver" in sys.argv and os.environ.get("RUN_MAIN") != "true":
        return

    if any(cmd in sys.argv for cmd in ("migrate", "makemigrations", "test", "shell", "collectstatic")):
        return

    _started = True
    _thread = threading.Thread(target=_loop, name="anil-gold-streamer", daemon=True)
    _thread.start()
