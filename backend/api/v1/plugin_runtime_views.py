"""
Plugin Runtime Views
====================
Execute installed plugins and manage plugin configuration.
"""

import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

logger = logging.getLogger(__name__)


class PluginExecuteView(APIView):
    """
    POST /api/v1/marketplace/plugins/<slug>/execute/
    Execute an installed plugin with provided data.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, plugin_slug):
        org = getattr(request, "organization", None)
        if not org:
            return Response({"error": "Organization context required"}, status=400)

        from core.models import Plugin, PluginInstallation

        try:
            plugin = Plugin.objects.get(slug=plugin_slug, is_published=True)
        except Plugin.DoesNotExist:
            return Response({"error": "Plugin not found"}, status=404)

        # Check if installed
        try:
            installation = PluginInstallation.objects.get(plugin=plugin, organization=org, is_active=True)
        except PluginInstallation.DoesNotExist:
            return Response({"error": "Plugin not installed for this organization"}, status=403)

        from core.services.plugin_runtime import PluginRuntime

        result = PluginRuntime.execute(
            plugin=plugin,
            data=request.data.get("data", {}),
            config={**installation.config, **request.data.get("config", {})},
            organization=org,
            user=request.user,
        )

        return Response(result)


class PluginConfigUpdateView(APIView):
    """
    PATCH /api/v1/marketplace/plugins/<slug>/config/
    Update plugin configuration for the current organization.
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request, plugin_slug):
        org = getattr(request, "organization", None)
        if not org:
            return Response({"error": "Organization context required"}, status=400)

        from core.models import PluginInstallation

        try:
            installation = PluginInstallation.objects.get(plugin__slug=plugin_slug, organization=org, is_active=True)
        except PluginInstallation.DoesNotExist:
            return Response({"error": "Plugin not installed"}, status=404)

        new_config = request.data.get("config", {})
        if not isinstance(new_config, dict):
            return Response({"error": "config must be a JSON object"}, status=400)

        installation.config.update(new_config)
        installation.save(update_fields=["config"])

        return Response(
            {
                "status": "updated",
                "plugin": installation.plugin.name,
                "config": installation.config,
            }
        )
