from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/doe/analysis/(?P<user_id>[^/]+)/(?P<experiment_id>[^/]+)/$', consumers.DOEAnalysisConsumer.as_asgi()),
    re_path(r'ws/doe/optimization/(?P<user_id>[^/]+)/(?P<analysis_id>[^/]+)/$', consumers.DOEOptimizationConsumer.as_asgi()),
]