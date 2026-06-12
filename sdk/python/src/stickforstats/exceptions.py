"""
Exception classes for the StickForStats SDK.

Hierarchy
---------
``StickForStatsError``                  base for everything the SDK raises
├── ``ConfigurationError``              invalid client configuration (e.g. bad base URL)
├── ``ConnectionError``                 could not reach the backend (DNS/refused/network)
├── ``TimeoutError``                    request exceeded the configured timeout
├── ``ValidationError``                 the server rejected the input (HTTP 400/422)
└── ``APIError``                        the server returned an error response (other 4xx/5xx)
    ├── ``AuthenticationError``         HTTP 401 / 403
    ├── ``NotFoundError``               HTTP 404
    ├── ``RateLimitError``              HTTP 429 (carries ``retry_after``)
    └── ``ServerError``                 HTTP 5xx

Every SDK error derives from :class:`StickForStatsError`, so a single
``except StickForStatsError`` catches anything the SDK can raise.
"""

from __future__ import annotations

from typing import Any


class StickForStatsError(Exception):
    """Base exception for all StickForStats SDK errors."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}


class ConfigurationError(StickForStatsError):
    """Raised when the client is misconfigured (e.g. an invalid base URL)."""


class ConnectionError(StickForStatsError):  # noqa: A001 - deliberately shadows builtin within this namespace
    """Raised when the SDK cannot reach the backend.

    Distinct from :class:`TimeoutError`: this means the connection itself failed
    (the host is unreachable, the port is closed, DNS failed, or the network is
    down) -- typically because the backend is not running or the base URL is wrong.
    """


class TimeoutError(StickForStatsError):  # noqa: A001 - deliberately shadows builtin within this namespace
    """Raised when a request exceeds the configured timeout."""


class ValidationError(StickForStatsError):
    """Raised when the API rejects the input data (HTTP 400/422)."""

    def __init__(
        self,
        message: str,
        field_errors: dict[str, Any] | None = None,
        status_code: int | None = None,
    ) -> None:
        super().__init__(message, details=field_errors)
        self.field_errors = field_errors or {}
        self.status_code = status_code


class APIError(StickForStatsError):
    """Raised when the API returns an error response (4xx/5xx)."""

    def __init__(
        self,
        message: str,
        status_code: int,
        response_body: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message, details=response_body)
        self.status_code = status_code
        self.response_body = response_body or {}

    def __str__(self) -> str:
        return f"[HTTP {self.status_code}] {self.message}"


class AuthenticationError(APIError):
    """Raised when authentication fails (HTTP 401/403)."""

    def __init__(
        self,
        message: str = "Authentication failed",
        status_code: int = 401,
        response_body: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message, status_code=status_code, response_body=response_body)


class NotFoundError(APIError):
    """Raised when the requested endpoint or resource does not exist (HTTP 404)."""

    def __init__(
        self,
        message: str = "Resource not found",
        status_code: int = 404,
        response_body: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message, status_code=status_code, response_body=response_body)


class RateLimitError(APIError):
    """Raised when the API rate limit is exceeded (HTTP 429).

    ``retry_after`` carries the server's suggested wait (seconds) when provided.
    """

    def __init__(
        self,
        message: str = "Rate limit exceeded",
        status_code: int = 429,
        response_body: dict[str, Any] | None = None,
        retry_after: float | None = None,
    ) -> None:
        super().__init__(message, status_code=status_code, response_body=response_body)
        self.retry_after = retry_after


class ServerError(APIError):
    """Raised when the API returns a server error (HTTP 5xx)."""

    def __init__(
        self,
        message: str = "Server error",
        status_code: int = 500,
        response_body: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message, status_code=status_code, response_body=response_body)


__all__ = [
    "StickForStatsError",
    "ConfigurationError",
    "ConnectionError",
    "TimeoutError",
    "ValidationError",
    "APIError",
    "AuthenticationError",
    "NotFoundError",
    "RateLimitError",
    "ServerError",
]
