"""
Project Workspace Views
========================
CRUD endpoints for project workspaces within organizations.
Projects organize analyses and datasets.
"""

import re
import logging
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status

logger = logging.getLogger(__name__)


class ProjectListCreateView(APIView):
    """
    GET /api/v1/platform/projects/
    List projects for the current organization.

    POST /api/v1/platform/projects/
    Create a new project.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        org = getattr(request, 'organization', None)
        if not org:
            from core.models import Organization
            org_slug = request.query_params.get('org')
            if org_slug:
                try:
                    org = Organization.objects.get(slug=org_slug, is_active=True)
                except Organization.DoesNotExist:
                    pass

        if not org:
            return Response({'projects': [], 'message': 'No organization context'})

        from core.models import Project
        projects = Project.objects.filter(
            organization=org,
            is_archived=False
        ).select_related('created_by')

        # Filter by visibility based on user role
        if not request.user.is_authenticated:
            projects = projects.filter(visibility='public')

        return Response({
            'projects': [
                {
                    'id': str(p.id),
                    'name': p.name,
                    'slug': p.slug,
                    'description': p.description,
                    'visibility': p.visibility,
                    'created_by': p.created_by.username if p.created_by else None,
                    'created_at': p.created_at.isoformat(),
                    'updated_at': p.updated_at.isoformat(),
                }
                for p in projects
            ],
            'total': projects.count(),
        })

    def post(self, request):
        org = getattr(request, 'organization', None)
        if not org:
            return Response({'error': 'Organization required'}, status=400)

        # Check tier limit
        if org.tier and org.tier.max_projects > 0:
            current_count = org.projects.filter(is_archived=False).count()
            if current_count >= org.tier.max_projects:
                return Response({
                    'error': 'Project limit reached for your tier',
                    'limit': org.tier.max_projects,
                }, status=429)

        name = request.data.get('name', '').strip()
        if not name:
            return Response({'error': 'Project name is required'}, status=400)

        slug = re.sub(r'[^a-z0-9-]', '-', name.lower()).strip('-')[:100]

        from core.models import Project
        if Project.objects.filter(organization=org, slug=slug).exists():
            slug = f"{slug}-{timezone.now().strftime('%H%M%S')}"

        project = Project.objects.create(
            organization=org,
            name=name,
            slug=slug,
            description=request.data.get('description', ''),
            visibility=request.data.get('visibility', 'team'),
            created_by=request.user if request.user.is_authenticated else None,
        )

        return Response({
            'id': str(project.id),
            'name': project.name,
            'slug': project.slug,
            'visibility': project.visibility,
        }, status=201)


class ProjectDetailView(APIView):
    """
    GET/PATCH/DELETE /api/v1/platform/projects/<slug>/
    """
    permission_classes = [AllowAny]

    def get(self, request, project_slug):
        org = getattr(request, 'organization', None)
        if not org:
            from core.models import Organization
            org_slug = request.query_params.get('org')
            if org_slug:
                try:
                    org = Organization.objects.get(slug=org_slug, is_active=True)
                except Organization.DoesNotExist:
                    return Response({'error': 'Organization not found'}, status=404)

        if not org:
            return Response({'error': 'Organization required'}, status=400)

        from core.models import Project
        try:
            project = Project.objects.select_related('created_by').get(
                organization=org, slug=project_slug, is_archived=False
            )
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=404)

        return Response({
            'id': str(project.id),
            'name': project.name,
            'slug': project.slug,
            'description': project.description,
            'visibility': project.visibility,
            'settings': project.settings,
            'created_by': project.created_by.username if project.created_by else None,
            'created_at': project.created_at.isoformat(),
            'updated_at': project.updated_at.isoformat(),
        })

    def patch(self, request, project_slug):
        org = getattr(request, 'organization', None)
        if not org:
            return Response({'error': 'Organization required'}, status=400)

        from core.models import Project
        try:
            project = Project.objects.get(
                organization=org, slug=project_slug, is_archived=False
            )
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=404)

        for field in ('name', 'description', 'visibility'):
            if field in request.data:
                setattr(project, field, request.data[field])

        if 'settings' in request.data and isinstance(request.data['settings'], dict):
            project.settings.update(request.data['settings'])

        project.save()
        return Response({'status': 'updated', 'slug': project.slug})

    def delete(self, request, project_slug):
        org = getattr(request, 'organization', None)
        if not org:
            return Response({'error': 'Organization required'}, status=400)

        from core.models import Project
        try:
            project = Project.objects.get(
                organization=org, slug=project_slug, is_archived=False
            )
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=404)

        # Soft delete (archive)
        project.is_archived = True
        project.save()
        return Response({'status': 'archived', 'slug': project.slug})


class RBACPermissionsView(APIView):
    """
    GET /api/v1/platform/permissions/
    Get current user's permissions for the active organization.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        org = getattr(request, 'organization', None)
        if not org:
            from core.models import Organization
            org_slug = request.query_params.get('org')
            if org_slug:
                try:
                    org = Organization.objects.get(slug=org_slug, is_active=True)
                except Organization.DoesNotExist:
                    pass

        if not org or not request.user.is_authenticated:
            return Response({
                'role': None,
                'permissions': [],
                'message': 'Not authenticated or no organization context',
            })

        from core.services.rbac_service import RBACService
        role = RBACService.get_user_role(request.user, org)
        permissions = RBACService.get_user_permissions(request.user, org)

        return Response({
            'organization': org.slug,
            'role': role,
            'permissions': sorted(permissions),
        })


class MemberRoleUpdateView(APIView):
    """
    PATCH /api/v1/platform/organizations/<slug>/members/<member_id>/role/
    Change a member's role. Enforces role hierarchy.
    """
    permission_classes = [AllowAny]

    def patch(self, request, org_slug, member_id):
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=401)

        from core.models import Organization, OrganizationMembership
        from core.services.rbac_service import RBACService

        try:
            org = Organization.objects.get(slug=org_slug, is_active=True)
        except Organization.DoesNotExist:
            return Response({'error': 'Organization not found'}, status=404)

        # Check permission
        denied = RBACService.check_permission(request.user, org, 'member.change_role')
        if denied:
            return denied

        new_role = request.data.get('role')
        if new_role not in ('admin', 'member', 'viewer'):
            return Response({'error': 'Invalid role'}, status=400)

        try:
            target = OrganizationMembership.objects.get(id=member_id, organization=org, is_active=True)
        except OrganizationMembership.DoesNotExist:
            return Response({'error': 'Member not found'}, status=404)

        actor_role = RBACService.get_user_role(request.user, org)
        if not RBACService.can_change_role(actor_role, target.role, new_role):
            return Response({
                'error': 'Cannot change this role',
                'message': f'As {actor_role}, you cannot change {target.role} to {new_role}',
            }, status=403)

        target.role = new_role
        target.save()

        return Response({
            'status': 'updated',
            'member_id': str(member_id),
            'new_role': new_role,
        })
