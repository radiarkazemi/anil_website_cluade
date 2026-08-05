"""Security headers + request ID for Anil API."""

from __future__ import annotations

import uuid


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
        # Mild CSP for API JSON (browsers ignore for XHR mostly; helps HTML error pages)
        if "Content-Security-Policy" not in response:
            response["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
        return response
