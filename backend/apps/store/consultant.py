"""
Inventory consultant — match customer prefs (weight, fee/اجرت, shape/category)
against active products. Works offline (rule-based). Optional OpenAI polish if
OPENAI_API_KEY is set.
"""

from __future__ import annotations

import os
import re
from decimal import Decimal
from typing import Any

from apps.store.models import Category, GoldPrice, Product

_FA_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")

SHAPE_ALIASES = {
    "النگو": ["النگو", "الن گو", "بالنگو", "bangle", "alango"],
    "انگشتر": ["انگشتر", "حلقه", "ring"],
    "دستبند": ["دستبند", "bracelet"],
    "گردنبند": ["گردنبند", "پلاک", "آویز", "گردنی", "necklace", "pendant"],
    "گوشواره": ["گوشواره", "گوش واره", "earring"],
    "سرویس": ["سرویس", "نیم ست", "نیمست", "set"],
    "زنجیر": ["زنجیر", "chain"],
    "مدال": ["مدال", "مدالیون"],
}

JEWELRY_CUES = (
    "طلا",
    "زیور",
    "جواهر",
    "عیار",
    "وزن",
    "گرم",
    "اجرت",
    "بودجه",
    "قیمت",
    "نرخ",
    "خرید",
    "فروش",
    "گالری",
    "ویترین",
    "هدیه",
    "نامزدی",
    "عروس",
    "سرمایه",
    "شمش",
    "سکه",
    "فاکتور",
    "مالیات",
    "karat",
    "gold",
    "jewelry",
    "jewellery",
    "ring",
    "necklace",
    "bracelet",
    "bangle",
    "earring",
    "fee",
    "weight",
    "budget",
    "price",
)

OFFTOPIC_REPLY = (
    "من مشاور موجودی گالری طلا آنیل هستم و فقط درباره انتخاب زیورآلات طلا کمک می‌کنم.\n"
    "لطفاً یکی از این‌ها را بگویید تا از ویترین پیشنهاد بدهم:\n"
    "• شکل قطعه (انگشتر، گردنی، دستبند، النگو، نیم‌ست…)\n"
    "• وزن تقریبی به گرم\n"
    "• سقف اجرت به درصد\n"
    "• یا بودجه تقریبی به تومان\n"
    "مثال: «انگشتر حدود ۳ گرم کم‌اجرت» یا «گردنی تا ۸۰ میلیون»."
)


def is_jewelry_related(
    message: str = "",
    *,
    weight: float | None = None,
    weight_min: float | None = None,
    weight_max: float | None = None,
    fee_max_pct: float | None = None,
    fee_min_pct: float | None = None,
    category: str | None = None,
    budget_toman: float | None = None,
) -> bool:
    """True when the request is about jewelry / gold shopping filters."""
    if any(
        v is not None
        for v in (weight, weight_min, weight_max, fee_max_pct, fee_min_pct, budget_toman)
    ):
        return True
    if category and str(category).strip():
        return True

    text = _norm(message)
    if not text:
        return False

    for cue in JEWELRY_CUES:
        if _norm(cue) in text:
            return True
    for aliases in SHAPE_ALIASES.values():
        if any(_norm(a) in text for a in aliases if len(_norm(a)) >= 3):
            return True
    # digits + گرم / میلیون often mean a shopping ask even without other words
    if re.search(r"\d", text) and re.search(r"(گرم|میلیون|ملیون|تومان|٪|%)", text):
        return True
    return False


def _norm(text: str) -> str:
    t = (text or "").translate(_FA_DIGITS).strip().lower()
    t = t.replace("ي", "ی").replace("ك", "ک")
    return t


def _num(token: str) -> float | None:
    token = _norm(token).replace(",", ".")
    m = re.search(r"(\d+(?:\.\d+)?)", token)
    if not m:
        return None
    try:
        return float(m.group(1))
    except ValueError:
        return None


def parse_request(
    message: str = "",
    *,
    weight_min: float | None = None,
    weight_max: float | None = None,
    weight: float | None = None,
    fee_max_pct: float | None = None,
    fee_min_pct: float | None = None,
    category: str | None = None,
    budget_toman: float | None = None,
) -> dict[str, Any]:
    """Merge structured filters with free-text Persian/English cues."""
    text = _norm(message)
    out: dict[str, Any] = {
        "weight_min": weight_min,
        "weight_max": weight_max,
        "fee_min": (fee_min_pct / 100.0) if fee_min_pct is not None else None,
        "fee_max": (fee_max_pct / 100.0) if fee_max_pct is not None else None,
        "category_slugs": [],
        "category_names": [],
        "budget": budget_toman,
        "keywords": [],
        "raw": message or "",
    }

    if weight is not None:
        # ±15% band around target
        out["weight_min"] = weight * 0.85
        out["weight_max"] = weight * 1.15

    # weight phrases: "۳ گرم", "بین 2 تا 5", "حدود 4g", "weight 3"
    if out["weight_min"] is None and out["weight_max"] is None:
        m = re.search(r"بین\s*(\d+(?:\.\d+)?)\s*تا\s*(\d+(?:\.\d+)?)", text)
        if m:
            a, b = float(m.group(1)), float(m.group(2))
            out["weight_min"], out["weight_max"] = min(a, b), max(a, b)
        else:
            m = re.search(r"(?:حدود|حدودا|وزن|weight|گرم|g)\s*[:=]?\s*(\d+(?:\.\d+)?)", text)
            if not m:
                m = re.search(r"(\d+(?:\.\d+)?)\s*(?:گرم|g)\b", text)
            if m:
                w = float(m.group(1))
                out["weight_min"], out["weight_max"] = w * 0.85, w * 1.15

    # fee / اجرت
    if out["fee_max"] is None:
        m = re.search(r"(?:اجرت|اجره|fee)\s*(?:زیر|کمتر از|max|تا)?\s*(\d+(?:\.\d+)?)\s*%?", text)
        if m:
            out["fee_max"] = float(m.group(1)) / 100.0
        elif re.search(r"کم\s*اجرت|اجرت\s*کم|low\s*fee", text):
            out["fee_max"] = 0.08

    # budget
    if out["budget"] is None:
        m = re.search(r"(?:بودجه|تا سقف|max)\s*(\d+(?:\.\d+)?)\s*(میلیون|ملیون|m)?", text)
        if m:
            val = float(m.group(1))
            if m.group(2):
                val *= 1_000_000
            out["budget"] = val

    # shape / category
    cats = list(Category.objects.filter(is_active=True))
    for cat in cats:
        names = [_norm(cat.name), _norm(cat.slug)]
        for alias_key, aliases in SHAPE_ALIASES.items():
            if _norm(alias_key) in names or any(_norm(a) in names for a in aliases):
                names.extend(_norm(a) for a in aliases)
        if category and (_norm(category) in names or _norm(category) == _norm(cat.slug)):
            out["category_slugs"].append(cat.slug)
            out["category_names"].append(cat.name)
            continue
        if text and any(a and a in text for a in names if len(a) >= 3):
            out["category_slugs"].append(cat.slug)
            out["category_names"].append(cat.name)

    # free keywords from message (simple tokens)
    for tok in re.findall(r"[\u0600-\u06ffA-Za-z]{3,}", text):
        if tok not in {"گرم", "اجرت", "طلا", "میخوام", "میخواهم", "لطفا", "برای", "weight"}:
            out["keywords"].append(tok)

    return out


def _score_product(p: Product, prefs: dict[str, Any], gp: float) -> tuple[float, list[str]]:
    score = 0.0
    reasons: list[str] = []
    w = float(p.weight_g) if p.weight_g is not None else None
    fee = float(p.fee_ratio or 0)

    if prefs["category_slugs"]:
        if p.category.slug in prefs["category_slugs"]:
            score += 40
            reasons.append(f"در دسته «{p.category.name}»")
        else:
            score -= 25

    if w is not None and prefs["weight_min"] is not None and prefs["weight_max"] is not None:
        lo, hi = prefs["weight_min"], prefs["weight_max"]
        if lo <= w <= hi:
            mid = (lo + hi) / 2
            closeness = 1 - abs(w - mid) / max(mid, 0.1)
            score += 35 * max(closeness, 0)
            reasons.append(f"وزن {w:g} گرم نزدیک درخواست شماست")
        else:
            # soft distance penalty
            dist = min(abs(w - lo), abs(w - hi))
            score -= min(20, dist * 4)
    elif w is None:
        score -= 5
        reasons.append("وزن پس از تأیید موجودی اعلام می‌شود")

    if prefs["fee_max"] is not None:
        if fee <= prefs["fee_max"] + 1e-9:
            score += 25
            reasons.append(f"اجرت مناسب ({fee * 100:.1f}٪)")
        else:
            score -= 15

    if prefs["fee_min"] is not None and fee >= prefs["fee_min"]:
        score += 8

    if prefs["budget"] and w is not None and gp:
        total = p.price_breakdown(gp)["total"] or 0
        if total and total <= prefs["budget"]:
            score += 20
            reasons.append("در محدوده بودجه")
        elif total:
            score -= 10

    name_l = _norm(p.name + " " + (p.description or ""))
    for kw in prefs["keywords"][:8]:
        if kw in name_l:
            score += 6
            reasons.append(f"هم‌خوان با «{kw}»")

    if p.is_featured:
        score += 3
    if p.stock and p.stock > 0:
        score += 5
    else:
        score -= 30

    if not reasons:
        reasons.append("از موجودی فعال گالری")

    return score, reasons


def suggest_products(
    *,
    message: str = "",
    weight_min: float | None = None,
    weight_max: float | None = None,
    weight: float | None = None,
    fee_max_pct: float | None = None,
    fee_min_pct: float | None = None,
    category: str | None = None,
    budget_toman: float | None = None,
    limit: int = 6,
) -> dict[str, Any]:
    if not is_jewelry_related(
        message,
        weight=weight,
        weight_min=weight_min,
        weight_max=weight_max,
        fee_max_pct=fee_max_pct,
        fee_min_pct=fee_min_pct,
        category=category,
        budget_toman=budget_toman,
    ):
        return {
            "reply": OFFTOPIC_REPLY,
            "prefs": {
                "weight_min": None,
                "weight_max": None,
                "fee_max_pct": None,
                "categories": [],
                "budget": None,
            },
            "suggestions": [],
            "count": 0,
            "offtopic": True,
        }

    prefs = parse_request(
        message,
        weight_min=weight_min,
        weight_max=weight_max,
        weight=weight,
        fee_max_pct=fee_max_pct,
        fee_min_pct=fee_min_pct,
        category=category,
        budget_toman=budget_toman,
    )

    qs = (
        Product.objects.filter(is_active=True, stock__gt=0)
        .select_related("category")
        .prefetch_related("images")
    )

    # Hard filters when explicit
    if prefs["category_slugs"]:
        qs = qs.filter(category__slug__in=prefs["category_slugs"])
    if prefs["weight_min"] is not None and prefs["weight_max"] is not None:
        # include null weights as soft candidates only if few matches
        band = qs.filter(weight_g__gte=Decimal(str(prefs["weight_min"])), weight_g__lte=Decimal(str(prefs["weight_max"])))
        if band.exists():
            qs = band
    if prefs["fee_max"] is not None:
        qs = qs.filter(fee_ratio__lte=Decimal(str(prefs["fee_max"])))

    gold = GoldPrice.current()
    gp = float(gold.price_18k_per_gram) if gold else 0.0

    ranked: list[tuple[float, Product, list[str]]] = []
    for p in qs[:240]:
        s, reasons = _score_product(p, prefs, gp)
        ranked.append((s, p, reasons))
    ranked.sort(key=lambda x: x[0], reverse=True)
    top = ranked[: max(1, min(limit, 12))]

    def serialize(p: Product, reasons: list[str], score: float) -> dict[str, Any]:
        img = p.images.filter(is_primary=True).first() or p.images.first()
        bd = p.price_breakdown(gp)
        return {
            "id": str(p.id),
            "name": p.name,
            "slug": p.slug,
            "category_name": p.category.name if p.category_id else "",
            "category_slug": p.category.slug if p.category_id else "",
            "weight_g": str(p.weight_g) if p.weight_g is not None else None,
            "has_weight": p.has_weight,
            "karat": p.karat,
            "fee_ratio": str(p.fee_ratio),
            "fee_pct": round(float(p.fee_ratio) * 100, 2),
            "price": bd["total"],
            "primary_image": img.image.url if img and img.image else None,
            "reasons": reasons[:3],
            "score": round(score, 2),
            "description": (p.description or "")[:220],
        }

    suggestions = [serialize(p, reasons, score) for score, p, reasons in top]

    reply = _compose_reply(prefs, suggestions)
    reply = _maybe_llm_polish(message, reply, suggestions) or reply

    return {
        "reply": reply,
        "prefs": {
            "weight_min": prefs["weight_min"],
            "weight_max": prefs["weight_max"],
            "fee_max_pct": (prefs["fee_max"] * 100) if prefs["fee_max"] is not None else None,
            "categories": prefs["category_names"],
            "budget": prefs["budget"],
        },
        "suggestions": suggestions,
        "count": len(suggestions),
    }


def _compose_reply(prefs: dict[str, Any], suggestions: list[dict[str, Any]]) -> str:
    if not suggestions:
        return (
            "موردی با این شرایط در ویترین فعال پیدا نشد. "
            "وزن، اجرت یا شکل را کمی بازتر بگویید تا دوباره پیشنهاد بدهم."
        )
    parts = ["بر اساس موجودی گالری آنیل، این گزینه‌ها مناسب‌ترند:"]
    for i, s in enumerate(suggestions[:5], 1):
        w = f"{s['weight_g']} گرم" if s.get("weight_g") else "وزن پس از تأیید"
        fee = f"اجرت {s['fee_pct']}٪"
        why = "؛ ".join(s.get("reasons") or [])
        parts.append(f"{i}) {s['name']} — {w} · {fee}" + (f" · {why}" if why else ""))
    hint = []
    if prefs.get("weight_min") is not None:
        hint.append(f"وزن حدود {prefs['weight_min']:.2g}–{prefs['weight_max']:.2g} گرم")
    if prefs.get("fee_max") is not None:
        hint.append(f"اجرت تا {prefs['fee_max'] * 100:.1f}٪")
    if prefs.get("category_names"):
        hint.append(" / ".join(prefs["category_names"]))
    if hint:
        parts.append("فیلتر اعمال‌شده: " + "، ".join(hint))
    parts.append("برای دیدن جزئیات روی هر پیشنهاد بزنید یا شرایط را دقیق‌تر بگویید.")
    return "\n".join(parts)


def _maybe_llm_polish(message: str, reply: str, suggestions: list[dict[str, Any]]) -> str | None:
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key or not message:
        return None
    try:
        import json
        import urllib.request

        catalog = [
            {"name": s["name"], "weight_g": s.get("weight_g"), "fee_pct": s.get("fee_pct"), "reasons": s.get("reasons")}
            for s in suggestions[:5]
        ]
        payload = {
            "model": os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "تو مشاور فروش گالری طلا آنیل هستی. فقط فارسی، کوتاه و مودب. "
                        "فقط درباره زیورآلات طلا، وزن، اجرت، بودجه و موجودی گالری حرف بزن. "
                        "اگر موضوع نامرتبط بود، مؤدبانه بگو فقط مشاور طلا هستی و از مشتری وزن/اجرت/شکل بخواه. "
                        "فقط از روی پیشنهادهای داده‌شده حرف بزن؛ محصول جدید نساز."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"درخواست مشتری:\n{message}\n\n"
                        f"پیشنهادهای موجودی:\n{json.dumps(catalog, ensure_ascii=False)}\n\n"
                        f"پاسخ اولیه سیستم:\n{reply}\n\n"
                        "یک پاسخ مشاوره‌ای کوتاه (حداکثر ۸ خط) بنویس."
                    ),
                },
            ],
            "temperature": 0.4,
            "max_tokens": 400,
        }
        req = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        text = data["choices"][0]["message"]["content"].strip()
        return text or None
    except Exception:
        return None
