"""
Exception classes for the StickForStats SDK.
"""

from __future__ import annotations

from typing import Any, Dict, Optional


class StickForStatsError(Exception):
    """Base exception for all StickForStats SDK errors."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}


class APIError(StickForStatsError):
    """Raised when the API returns an error response (4xx/5xx)."""

    def __init__(
        self,
        message: str,
        status_code: int,
        response_body: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(message, details=response_body)
        self.status_code = status_code
        self.response_body = response_body or {}

    def __str__(self) -> str:
        return f"[HTTP {self.status_code}] {self.message}"


class AuthenticationError(APIError):
    """Raised when authentication fails (401/403)."""

    def __init__(self, message: str = "Authentication failed", **kwargs: Any) -> None:
        super().__init__(message, status_code=kwargs.get("status_code", 401), **kwargs)


class ValidationError(StickForStatsError):
    """Raised when the API rejects input data (400 with validation errors)."""

    def __init__(self, message: str, field_errors: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(message, details=field_errors)
        self.field_errors = field_errors or {}


class TimeoutError(StickForStatsError):
    """Raised when a request exceeds the configured timeout."""

    pass
