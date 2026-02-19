"""
RBAC Service
=============
Role-Based Access Control for organization resources.
Enforces permission checks based on membership roles.

Role hierarchy: owner > admin > member > viewer
"""

import logging
import functools
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


# Permission definitions per role
ROLE_PERMISSIONS = {
    'owner': {
        'org.read', 'org.update', 'org.delete', 'org.manage_billing',
        'member.read', 'member.invite', 'member.remove', 'member.change_role',
        'project.read', 'project.create', 'project.update', 'project.delete', 'project.archive',
        'analysis.read', 'analysis.create', 'analysis.delete', 'analysis.export',
        'apikey.read', 'apikey.create', 'apikey.revoke',
        'settings.read', 'settings.update',
        'audit.read',
    },
    'admin': {
        'org.read', 'org.update',
        'member.read', 'member.invite', 'member.remove',
        'project.read', 'project.create', 'project.update', 'project.delete', 'project.archive',
        'analysis.read', 'analysis.create', 'analysis.delete', 'analysis.export',
        'apikey.read', 'apikey.create', 'apikey.revoke',
        'settings.read', 'settings.update',
        'audit.read',
    },
    'member': {
        'org.read',
        'member.read',
        'project.read', 'project.create', 'project.update',
        'analysis.read', 'analysis.create', 'analysis.export',
        'apikey.read',
        'settings.read',
    },
    'viewer': {
        'org.read',
        'member.read',
        'project.read',
        'analysis.read',
        'settings.read',
    },
}


class RBACService:
    """Permission checking for organization resources."""

    @staticmethod
    def get_user_role(user, organization):
        """Get the user's role in an organization."""
        if not user or not user.is_authenticated:
            return None

        from core.models import OrganizationMembership
        try:
            membership = OrganizationMembership.objects.get(
                user=user,
                organization=organization,
                is_active=True
            )
            return membership.role
        except OrganizationMembership.DoesNotExist:
            return None

    @staticmethod
    def has_permission(user, organization, permission):
        """Check if user has a specific permission in an organization."""
        role = RBACService.get_user_role(user, organization)
        if role is None:
            return False
        return permission in ROLE_PERMISSIONS.get(role, set())

    @staticmethod
    def get_user_permissions(user, organization):
        """Get all permissions for a user in an organization."""
        role = RBACService.get_user_role(user, organization)
        if role is None:
            return set()
        return ROLE_PERMISSIONS.get(role, set())

    @staticmethod
    def check_permission(user, organization, permission):
        """Check permission and return error response if denied."""
        if not RBACService.has_permission(user, organization, permission):
            role = RBACService.get_user_role(user, organization)
            return Response({
                'error': 'Permission denied',
                'required_permission': permission,
                'current_role': role or 'none',
                'message': f'Your role ({role or "none"}) does not have the "{permission}" permission.',
            }, status=status.HTTP_403_FORBIDDEN)
        return None

    @staticmethod
    def can_change_role(actor_role, target_current_role, target_new_role):
        """Check if actor can change target's role."""
        hierarchy = {'owner': 4, 'admin': 3, 'member': 2, 'viewer': 1}
        actor_level = hierarchy.get(actor_role, 0)
        target_current_level = hierarchy.get(target_current_role, 0)
        target_new_level = hierarchy.get(target_new_role, 0)

        # Can only change roles of people below you
        # Cannot promote above your own level
        return (
            actor_level > target_current_level and
            actor_level > target_new_level
        )


def require_permission(permission):
    """
    Decorator for DRF views that checks organization permission.
    Expects request.organization to be set by TenantContextMiddleware.
    """
    def decorator(view_func):
        @functools.wraps(view_func)
        def wrapper(self_or_request, request=None, *args, **kwargs):
            # Handle both function views and class-based views
            if request is None:
                request = self_or_request
                view_self = None
            else:
                view_self = self_or_request

            org = getattr(request, 'organization', None)
            if not org:
                return Response(
                    {'error': 'Organization context required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            denied = RBACService.check_permission(request.user, org, permission)
            if denied:
                return denied

            if view_self is not None:
                return view_func(view_self, request, *args, **kwargs)
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator
