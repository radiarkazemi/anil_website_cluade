"""
MongoDB client — used for:
  • price_history  — time-series gold price snapshots
  • page_views     — product + site visit analytics
  • audit_log      — admin action audit trail
"""

from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlparse

from django.conf import settings
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

logger = logging.getLogger(__name__)

_client: MongoClient | None = None

_BOT_UA = re.compile(
    r"bot|crawl|spider|slurp|facebookexternalhit|preview|wget|curl|python-requests",
    re.I,
)


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


def _normalize_path(path: str | None) -> str:
    raw = (path or "/").strip() or "/"
    if not raw.startswith("/"):
        raw = "/" + raw
    # Drop query/hash; keep pretty Persian slugs
    raw = raw.split("?", 1)[0].split("#", 1)[0]
    if len(raw) > 1 and raw.endswith("/"):
        raw = raw[:-1]
    return raw[:240] or "/"


def _referrer_host(referrer: str | None) -> str:
    if not referrer:
        return "direct"
    try:
        host = urlparse(referrer).netloc.lower()
        if host.startswith("www."):
            host = host[4:]
        return host[:120] or "direct"
    except Exception:
        return "direct"


def _device_from_ua(ua: str | None) -> str:
    text = ua or ""
    low = text.lower()
    if _BOT_UA.search(low):
        return "bot"
    if re.search(r"ipad|tablet|kindle", low):
        return "tablet"
    if re.search(r"mobi|iphone|android|webos|opera mini", low):
        return "mobile"
    return "desktop"


def log_product_view(product_id: str, user_id: str | None = None, meta: dict | None = None) -> None:
    db = get_db()
    if db is None:
        return
    payload = {
        "kind": "product",
        "product_id": product_id,
        "user_id": user_id,
        "path": f"/products/{product_id}",
        "ts": datetime.now(timezone.utc),
        **(meta or {}),
    }
    db.page_views.insert_one(payload)


def log_site_visit(
    *,
    path: str,
    title: str | None = None,
    referrer: str | None = None,
    session_id: str | None = None,
    user_id: str | None = None,
    user_agent: str | None = None,
    product_id: str | None = None,
    screen: str | None = None,
    language: str | None = None,
) -> None:
    """Record a storefront page view for traffic analytics."""
    db = get_db()
    if db is None:
        return
    ua = (user_agent or "")[:400]
    device = _device_from_ua(ua)
    if device == "bot":
        return
    doc = {
        "kind": "page" if not product_id else "product",
        "path": _normalize_path(path),
        "title": (title or "")[:200],
        "referrer": (referrer or "")[:400],
        "referrer_host": _referrer_host(referrer),
        "session_id": (session_id or "")[:80] or None,
        "user_id": user_id,
        "user_agent": ua,
        "device": device,
        "screen": (screen or "")[:40],
        "language": (language or "")[:24],
        "product_id": product_id,
        "ts": datetime.now(timezone.utc),
    }
    db.page_views.insert_one(doc)


def get_popular_products(days: int = 30, limit: int = 10) -> list[dict]:
    db = get_db()
    if db is None:
        return []
    since = datetime.now(timezone.utc) - timedelta(days=days)
    pipeline = [
        {
            "$match": {
                "ts": {"$gte": since},
                "product_id": {"$exists": True, "$nin": [None, ""]},
            }
        },
        {"$group": {"_id": "$product_id", "views": {"$sum": 1}}},
        {"$sort": {"views": -1}},
        {"$limit": limit},
    ]
    return list(db.page_views.aggregate(pipeline))


def get_traffic_summary(days: int = 14) -> dict[str, Any]:
    """Admin traffic dashboard payload (visits, viewers, pages, referrers)."""
    empty = {
        "days": days,
        "available": False,
        "totals": {
            "visits": 0,
            "unique_visitors": 0,
            "visits_today": 0,
            "unique_today": 0,
            "product_views": 0,
        },
        "series": [],
        "top_pages": [],
        "top_referrers": [],
        "top_products": [],
        "devices": [],
        "recent": [],
    }
    db = get_db()
    if db is None:
        return empty

    now = datetime.now(timezone.utc)
    since = now - timedelta(days=max(1, days))
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    match = {"ts": {"$gte": since}, "device": {"$ne": "bot"}}
    coll = db.page_views

    visits = coll.count_documents(match)
    visits_today = coll.count_documents({**match, "ts": {"$gte": today_start}})
    product_views = coll.count_documents(
        {**match, "product_id": {"$exists": True, "$nin": [None, ""]}}
    )

    def _unique(extra: dict | None = None) -> int:
        q = dict(match)
        if extra:
            q.update(extra)
        rows = list(
            coll.aggregate(
                [
                    {"$match": q},
                    {
                        "$group": {
                            "_id": {
                                "$ifNull": [
                                    "$session_id",
                                    {"$ifNull": ["$user_id", "anon"]},
                                ]
                            }
                        }
                    },
                    {"$count": "n"},
                ]
            )
        )
        return int(rows[0]["n"]) if rows else 0

    unique_visitors = _unique()
    unique_today = _unique({"ts": {"$gte": today_start}})

    # Daily series
    series_raw = list(
        coll.aggregate(
            [
                {"$match": match},
                {
                    "$group": {
                        "_id": {
                            "$dateToString": {"format": "%Y-%m-%d", "date": "$ts"}
                        },
                        "visits": {"$sum": 1},
                        "sessions": {"$addToSet": {"$ifNull": ["$session_id", "$user_id"]}},
                    }
                },
                {"$sort": {"_id": 1}},
            ]
        )
    )
    series_map = {
        row["_id"]: {
            "date": row["_id"],
            "visits": row["visits"],
            "unique_visitors": len([s for s in (row.get("sessions") or []) if s]),
        }
        for row in series_raw
    }
    series = []
    for i in range(days - 1, -1, -1):
        day = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        series.append(
            series_map.get(
                day,
                {"date": day, "visits": 0, "unique_visitors": 0},
            )
        )

    top_pages = list(
        coll.aggregate(
            [
                {"$match": match},
                {
                    "$group": {
                        "_id": {"$ifNull": ["$path", "/"]},
                        "views": {"$sum": 1},
                        "title": {"$last": "$title"},
                    }
                },
                {"$sort": {"views": -1}},
                {"$limit": 12},
            ]
        )
    )
    top_referrers = list(
        coll.aggregate(
            [
                {"$match": match},
                {
                    "$group": {
                        "_id": {"$ifNull": ["$referrer_host", "direct"]},
                        "views": {"$sum": 1},
                    }
                },
                {"$sort": {"views": -1}},
                {"$limit": 10},
            ]
        )
    )
    top_products = list(
        coll.aggregate(
            [
                {
                    "$match": {
                        **match,
                        "product_id": {"$exists": True, "$nin": [None, ""]},
                    }
                },
                {"$group": {"_id": "$product_id", "views": {"$sum": 1}}},
                {"$sort": {"views": -1}},
                {"$limit": 10},
            ]
        )
    )
    devices = list(
        coll.aggregate(
            [
                {"$match": match},
                {"$group": {"_id": {"$ifNull": ["$device", "unknown"]}, "views": {"$sum": 1}}},
                {"$sort": {"views": -1}},
            ]
        )
    )
    recent = list(
        coll.find(
            match,
            {
                "_id": 0,
                "path": 1,
                "title": 1,
                "referrer_host": 1,
                "device": 1,
                "session_id": 1,
                "product_id": 1,
                "ts": 1,
            },
        )
        .sort("ts", -1)
        .limit(25)
    )
    for row in recent:
        if isinstance(row.get("ts"), datetime):
            row["ts"] = row["ts"].isoformat()

    return {
        "days": days,
        "available": True,
        "totals": {
            "visits": visits,
            "unique_visitors": unique_visitors,
            "visits_today": visits_today,
            "unique_today": unique_today,
            "product_views": product_views,
        },
        "series": series,
        "top_pages": [
            {"path": r["_id"], "views": r["views"], "title": r.get("title") or r["_id"]}
            for r in top_pages
        ],
        "top_referrers": [
            {"host": r["_id"] or "direct", "views": r["views"]} for r in top_referrers
        ],
        "top_products": [
            {"product_id": r["_id"], "views": r["views"]} for r in top_products
        ],
        "devices": [{"device": r["_id"] or "unknown", "views": r["views"]} for r in devices],
        "recent": recent,
    }


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
