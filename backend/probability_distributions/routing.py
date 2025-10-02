from django.urls import re_path

from .api.consumers import DistributionConsumer

websocket_urlpatterns = [
    re_path(r'ws/distributions/(?P<distribution_id>[^/]+)/$', DistributionConsumer.as_asgi()),
]