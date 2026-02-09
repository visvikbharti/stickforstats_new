"""
WebSocket routing for PCA Analysis.

NOTE: These WebSocket routes are currently inactive.
ASGI/Channels is not configured in this deployment.
To enable WebSocket support, configure Django Channels with ASGI.
"""

from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(
        r'ws/pca_analysis/(?P<user_id>[^/]+)/(?P<project_id>[^/]+)/$',
        consumers.PCAAnalysisConsumer.as_asgi()
    ),
]