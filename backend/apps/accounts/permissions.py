from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    """Allow only staff / admin-role users."""

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (getattr(user, "is_admin", False) or user.is_staff or user.is_superuser)
        )
