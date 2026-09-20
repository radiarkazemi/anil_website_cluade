"""Security headers + request ID for Anil API."""

from __future__ import annotations

import uuid

# SPA HTML pages (SEO shells) need scripts/styles/fonts/websocket.
_SPA_CSP = (
    "default-src 'self'; "
    "base-uri 'self'; "
    "object-src 'none'; "
    "script-src 'self' 'unsafe-inline'; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: blob: https:; "
    "font-src 'self' data:; "
    "connect-src 'self' https: wss: ws:; "
    "media-src 'self' blob:; "
    "worker-src 'self' blob:; "
    "frame-ancestors 'none'"
)
_API_CSP = "default-src 'none'; frame-ancestors 'none'"


class SecurityHeadersMiddleware:
    """Harden responses even in DEBUG; stronger rules apply when not DEBUG."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not getattr(request, "request_id", None):
            request.request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
        response = self.get_response(request)
        response["X-Request-ID"] = request.request_id
        response["X-Content-Type-Options"] = "nosniff"
        response["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response["X-Frame-Options"] = response.get("X-Frame-Options", "DENY")
        if "Content-Security-Policy" not in response:
            content_type = (response.get("Content-Type") or "").lower()
            if "text/html" in content_type:
                # Crawlable SPA shells must be allowed to load assets
                response["Content-Security-Policy"] = _SPA_CSP
            else:
                # Mild CSP for API JSON (helps accidental HTML error pages)
                response["Content-Security-Policy"] = _API_CSP
        return response
