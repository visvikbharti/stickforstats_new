"""
Plugin Marketplace Views
========================
Browse, install, and manage plugins for organizations.
"""

import logging
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

logger = logging.getLogger(__name__)


class MarketplaceListView(APIView):
    """
    GET /api/v1/marketplace/plugins/
    Browse available plugins with filtering and sorting.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from core.models import Plugin

        plugins = Plugin.objects.filter(is_published=True)

        # Filter by type
        plugin_type = request.query_params.get('type')
        if plugin_type:
            plugins = plugins.filter(plugin_type=plugin_type)

        # Filter by official/verified
        if request.query_params.get('official') == 'true':
            plugins = plugins.filter(is_official=True)
        if request.query_params.get('verified') == 'true':
            plugins = plugins.filter(is_verified=True)

        # Search
        search = request.query_params.get('search', '').strip()
        if search:
            plugins = plugins.filter(name__icontains=search)

        # Sort
        sort = request.query_params.get('sort', 'popular')
        if sort == 'popular':
            plugins = plugins.order_by('-downloads')
        elif sort == 'newest':
            plugins = plugins.order_by('-created_at')
        elif sort == 'rating':
            plugins = plugins.order_by('-rating_sum')
        elif sort == 'name':
            plugins = plugins.order_by('name')

        # Check installed status for current org
        org = getattr(request, 'organization', None)
        installed_ids = set()
        if org:
            from core.models import PluginInstallation
            installed_ids = set(
                PluginInstallation.objects.filter(
                    organization=org, is_active=True
                ).values_list('plugin_id', flat=True)
            )

        return Response({
            'plugins': [
                {
                    'id': str(p.id),
                    'name': p.name,
                    'slug': p.slug,
                    'type': p.plugin_type,
                    'description': p.description,
                    'version': p.version,
                    'author_name': p.author_name,
                    'icon_url': p.icon_url,
                    'is_official': p.is_official,
                    'is_verified': p.is_verified,
                    'downloads': p.downloads,
                    'rating': p.average_rating,
                    'rating_count': p.rating_count,
                    'is_installed': p.id in installed_ids,
                }
                for p in plugins[:50]
            ],
            'total': plugins.count(),
            'types': [
                {'value': 'statistical_test', 'label': 'Statistical Tests'},
                {'value': 'sqs_rule_pack', 'label': 'SQS Rule Packs'},
                {'value': 'visualization', 'label': 'Visualizations'},
                {'value': 'data_connector', 'label': 'Data Connectors'},
                {'value': 'report_template', 'label': 'Report Templates'},
            ],
        })


class PluginDetailView(APIView):
    """
    GET /api/v1/marketplace/plugins/<slug>/
    Get full plugin details including reviews.
    """
    permission_classes = [AllowAny]

    def get(self, request, plugin_slug):
        from core.models import Plugin

        try:
            p = Plugin.objects.get(slug=plugin_slug, is_published=True)
        except Plugin.DoesNotExist:
            return Response({'error': 'Plugin not found'}, status=404)

        # Get reviews
        reviews = p.reviews.select_related('user')[:20]

        # Check install status
        org = getattr(request, 'organization', None)
        is_installed = False
        if org:
            from core.models import PluginInstallation
            is_installed = PluginInstallation.objects.filter(
                plugin=p, organization=org, is_active=True
            ).exists()

        return Response({
            'id': str(p.id),
            'name': p.name,
            'slug': p.slug,
            'type': p.plugin_type,
            'description': p.description,
            'version': p.version,
            'author_name': p.author_name,
            'author_email': p.author_email,
            'homepage_url': p.homepage_url,
            'repository_url': p.repository_url,
            'icon_url': p.icon_url,
            'config_schema': p.config_schema,
            'entry_point': p.entry_point,
            'dependencies': p.dependencies,
            'is_official': p.is_official,
            'is_verified': p.is_verified,
            'downloads': p.downloads,
            'rating': p.average_rating,
            'rating_count': p.rating_count,
            'is_installed': is_installed,
            'created_at': p.created_at.isoformat(),
            'updated_at': p.updated_at.isoformat(),
            'reviews': [
                {
                    'rating': r.rating,
                    'title': r.title,
                    'body': r.body,
                    'user': r.user.username,
                    'created_at': r.created_at.isoformat(),
                }
                for r in reviews
            ],
        })


class PluginInstallView(APIView):
    """
    POST /api/v1/marketplace/plugins/<slug>/install/
    Install a plugin for the current organization.

    DELETE /api/v1/marketplace/plugins/<slug>/install/
    Uninstall a plugin.
    """
    permission_classes = [AllowAny]

    def post(self, request, plugin_slug):
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=401)

        org = getattr(request, 'organization', None)
        if not org:
            return Response({'error': 'Organization context required'}, status=400)

        from core.models import Plugin, PluginInstallation

        try:
            plugin = Plugin.objects.get(slug=plugin_slug, is_published=True)
        except Plugin.DoesNotExist:
            return Response({'error': 'Plugin not found'}, status=404)

        installation, created = PluginInstallation.objects.get_or_create(
            plugin=plugin,
            organization=org,
            defaults={
                'installed_by': request.user,
                'config': request.data.get('config', {}),
            }
        )

        if not created:
            if installation.is_active:
                return Response({'message': 'Plugin already installed'})
            installation.is_active = True
            installation.installed_by = request.user
            installation.installed_at = timezone.now()
            installation.save()

        # Increment download counter
        Plugin.objects.filter(id=plugin.id).update(downloads=plugin.downloads + 1)

        return Response({
            'status': 'installed',
            'plugin': plugin.name,
            'organization': org.name,
        }, status=201)

    def delete(self, request, plugin_slug):
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=401)

        org = getattr(request, 'organization', None)
        if not org:
            return Response({'error': 'Organization context required'}, status=400)

        from core.models import PluginInstallation

        try:
            installation = PluginInstallation.objects.get(
                plugin__slug=plugin_slug,
                organization=org,
                is_active=True,
            )
        except PluginInstallation.DoesNotExist:
            return Response({'error': 'Plugin not installed'}, status=404)

        installation.is_active = False
        installation.save()

        return Response({'status': 'uninstalled'})


class PluginReviewView(APIView):
    """
    POST /api/v1/marketplace/plugins/<slug>/review/
    Submit a review for a plugin.
    """
    permission_classes = [AllowAny]

    def post(self, request, plugin_slug):
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=401)

        from core.models import Plugin, PluginReview

        try:
            plugin = Plugin.objects.get(slug=plugin_slug, is_published=True)
        except Plugin.DoesNotExist:
            return Response({'error': 'Plugin not found'}, status=404)

        rating = request.data.get('rating')
        if not rating or not (1 <= int(rating) <= 5):
            return Response({'error': 'Rating must be 1-5'}, status=400)

        rating = int(rating)
        title = request.data.get('title', '').strip()
        if not title:
            return Response({'error': 'Review title is required'}, status=400)

        review, created = PluginReview.objects.update_or_create(
            plugin=plugin,
            user=request.user,
            defaults={
                'rating': rating,
                'title': title,
                'body': request.data.get('body', ''),
            }
        )

        # Recalculate plugin rating
        from django.db.models import Sum, Count
        agg = plugin.reviews.aggregate(total=Sum('rating'), count=Count('id'))
        plugin.rating_sum = agg['total'] or 0
        plugin.rating_count = agg['count'] or 0
        plugin.save(update_fields=['rating_sum', 'rating_count'])

        return Response({
            'status': 'created' if created else 'updated',
            'rating': rating,
        }, status=201 if created else 200)


class InstalledPluginsView(APIView):
    """
    GET /api/v1/marketplace/installed/
    List plugins installed for current organization.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        org = getattr(request, 'organization', None)
        if not org:
            return Response({'plugins': [], 'message': 'No organization context'})

        from core.models import PluginInstallation

        installations = PluginInstallation.objects.filter(
            organization=org, is_active=True
        ).select_related('plugin', 'installed_by')

        return Response({
            'plugins': [
                {
                    'id': str(inst.plugin.id),
                    'name': inst.plugin.name,
                    'slug': inst.plugin.slug,
                    'type': inst.plugin.plugin_type,
                    'version': inst.plugin.version,
                    'is_official': inst.plugin.is_official,
                    'config': inst.config,
                    'installed_by': inst.installed_by.username if inst.installed_by else None,
                    'installed_at': inst.installed_at.isoformat(),
                }
                for inst in installations
            ],
            'total': installations.count(),
        })
