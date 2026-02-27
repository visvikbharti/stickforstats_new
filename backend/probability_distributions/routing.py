"""
NOTE: These WebSocket routes are currently inactive.
ASGI/Channels is not configured in this deployment.
To enable WebSocket support, configure Django Channels with ASGI.
"""

from django.urls import re_path

from .api.consumers import DistributionConsumer

websocket_urlpatterns = [
    re_path(r"ws/distributions/(?P<distribution_id>[^/]+)/$", DistributionConsumer.as_asgi()),
]
