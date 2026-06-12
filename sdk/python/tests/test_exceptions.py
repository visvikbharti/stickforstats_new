"""Direct unit tests for the exception hierarchy and constructors."""

from __future__ import annotations

from stickforstats.exceptions import (
    APIError,
    AuthenticationError,
    NotFoundError,
    RateLimitError,
    ServerError,
    StickForStatsError,
    ValidationError,
)


def test_authentication_error_constructs_cleanly():
    # Regression: this exact call (as the client makes it) used to raise TypeError
    # because status_code was passed both explicitly and via **kwargs.
    err = AuthenticationError(message="nope", status_code=403, response_body={"detail": "nope"})
    assert err.status_code == 403
    assert err.response_body == {"detail": "nope"}
    assert str(err) == "[HTTP 403] nope"


def test_authentication_error_defaults():
    assert AuthenticationError().status_code == 401


def test_not_found_and_server_error_defaults():
    assert NotFoundError().status_code == 404
    assert ServerError().status_code == 500


def test_rate_limit_error_carries_retry_after():
    err = RateLimitError(retry_after=5.0)
    assert err.status_code == 429
    assert err.retry_after == 5.0


def test_validation_error_fields_and_optional_status():
    err = ValidationError("bad", field_errors={"x": ["required"]})
    assert err.field_errors == {"x": ["required"]}
    assert err.status_code is None
    assert isinstance(err, StickForStatsError)


def test_api_subclasses():
    for cls in (AuthenticationError, NotFoundError, RateLimitError, ServerError):
        assert issubclass(cls, APIError)
        assert issubclass(cls, StickForStatsError)
