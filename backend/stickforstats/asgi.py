"""
ASGI config for StickForStats project.

Exposes the ASGI callable and routes WebSocket connections
to the appropriate consumers via Django Channels.
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "stickforstats.settings")

# Initialize Django ASGI application early to populate AppRegistry
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from channels.security.websocket import AllowedHostsOriginValidator  # noqa: E402
from core.websocket.middleware import JWTAuthMiddleware  # noqa: E402
from core.websocket.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AllowedHostsOriginValidator(
            JWTAuthMiddleware(URLRouter(websocket_urlpatterns))
        ),
    }
)
