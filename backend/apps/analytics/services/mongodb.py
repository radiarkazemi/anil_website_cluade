"""
MongoDB client — used for:
  • price_history  — time-series gold price snapshots
  • page_views     — product view analytics
  • audit_log      — admin action audit trail
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from django.conf import settings
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

logger = logging.getLogger(__name__)

_client: MongoClient | None = None


def get_db():
    global _client
    if _client is None:
        try:
            _client = MongoClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=3000,
                maxPoolSize=10,
            )
            _client.admin.command("ping")
        except ConnectionFailure:
            logger.warning("MongoDB connection failed — analytics features disabled")
            _client = None
            return None
    return _client[settings.MONGODB_NAME]


def log_price_snapshot(data: dict[str, Any]) -> None:
    db = get_db()
    if db is None:
        return
    db.price_history.insert_one(
        {
            **data,
            "ts": datetime.now(timezone.utc),
        }
    )


def get_price_history(limit: int = 100) -> list[dict]:
    db = get_db()
    if db is None:
        return []
    cursor = db.price_history.find(
        {},
        {"_id": 0},
    ).sort("ts", -1).limit(limit)
    return list(cursor)


def log_product_view(product_id: str, user_id: str | None = None, meta: dict | None = None) -> None:
    db = get_db()
    if db is None:
        return
    db.page_views.insert_one(
        {
            "product_id": product_id,
            "user_id": user_id,
            "ts": datetime.now(timezone.utc),
            **(meta or {}),
        }
    )


def get_popular_products(days: int = 30, limit: int = 10) -> list[dict]:
    db = get_db()
    if db is None:
        return []
    from datetime import timedelta

    since = datetime.now(timezone.utc) - timedelta(days=days)
    pipeline = [
        {"$match": {"ts": {"$gte": since}}},
        {"$group": {"_id": "$product_id", "views": {"$sum": 1}}},
        {"$sort": {"views": -1}},
        {"$limit": limit},
    ]
    return list(db.page_views.aggregate(pipeline))


def log_audit(action: str, user_id: str | None = None, detail: dict | None = None) -> None:
    db = get_db()
    if db is None:
        return
    db.audit_log.insert_one(
        {
            "action": action,
            "user_id": user_id,
            "detail": detail or {},
            "ts": datetime.now(timezone.utc),
        }
    )
