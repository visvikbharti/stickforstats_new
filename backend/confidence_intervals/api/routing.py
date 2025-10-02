from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/confidence_intervals/simulation/(?P<project_id>[0-9a-f-]+)/$', consumers.SimulationConsumer.as_asgi()),
]