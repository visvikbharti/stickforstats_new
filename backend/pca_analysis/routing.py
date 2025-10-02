"""
WebSocket routing for PCA Analysis.
"""

from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(
        r'ws/pca_analysis/(?P<user_id>[^/]+)/(?P<project_id>[^/]+)/$',
        consumers.PCAAnalysisConsumer.as_asgi()
    ),
]