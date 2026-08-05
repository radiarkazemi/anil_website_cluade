from rest_framework.permissions import BasePermission

from .serializers import user_can_access_panel


class IsAdminRole(BasePermission):
    """Allow only staff / admin-role users (ops panel)."""

    def has_permission(self, request, view):
        return user_can_access_panel(request.user)
