"""Request logging middleware with correlation IDs."""

import logging
import threading
import time
import uuid

logger = logging.getLogger("stickforstats")

_thread_local = threading.local()


def get_request_id():
    """Get the current request ID from thread-local storage."""
    return getattr(_thread_local, "request_id", None)


class RequestLoggingMiddleware:
    """
    Middleware that:
    1. Extracts or generates a request correlation ID
    2. Logs request start/end with timing
    3. Makes request_id available to all loggers via thread-local
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Extract or generate request ID
        request_id = request.META.get(
            "HTTP_X_REQUEST_ID", str(uuid.uuid4())[:8]
        )
        _thread_local.request_id = request_id
        request.request_id = request_id

        start_time = time.time()

        response = self.get_response(request)

        duration_ms = (time.time() - start_time) * 1000

        # Log the request (skip static/media)
        if not request.path.startswith(
            ("/static/", "/media/", "/admin/jsi18n/")
        ):
            logger.info(
                "%s %s %s %.0fms",
                request.method,
                request.path,
                response.status_code,
                duration_ms,
                extra={
                    "request_id": request_id,
                    "user_id": (
                        getattr(request.user, "id", None)
                        if hasattr(request, "user")
                        else None
                    ),
                    "duration_ms": round(duration_ms, 1),
                },
            )

        # Add request ID to response headers
        response["X-Request-ID"] = request_id

        # Clean up thread-local
        _thread_local.request_id = None

        return response
