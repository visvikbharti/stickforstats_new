"""Tests for the core HTTP client: request/response, error mapping, retries,
connection/timeout handling, configuration, and headers."""

from __future__ import annotations

import httpx
import pytest

from stickforstats import StickForStats
from stickforstats._version import __version__
from stickforstats.exceptions import (
    APIError,
    AuthenticationError,
    ConfigurationError,
    ConnectionError,
    NotFoundError,
    RateLimitError,
    ServerError,
    StickForStatsError,
    TimeoutError,
    ValidationError,
)

# --------------------------------------------------------------------------- #
# Happy path
# --------------------------------------------------------------------------- #

def test_get_parses_json(client_factory):
    client = client_factory(
        lambda req: httpx.Response(200, json={"value": 42, "path": req.url.path})
    )
    body = client.get("stats/descriptive")
    assert body["value"] == 42
    assert body["path"] == "/api/v1/stats/descriptive"


def test_post_sends_json_body(client_factory):
    seen = {}

    def handler(req: httpx.Request) -> httpx.Response:
        seen["content"] = req.content
        return httpx.Response(200, json={"ok": True})

    client = client_factory(handler)
    client.post("stats/ttest", json={"a": [1, 2, 3]})
    assert b'"a"' in seen["content"]


def test_204_and_empty_body_return_empty_dict(client_factory):
    assert client_factory(lambda req: httpx.Response(204)).get("x") == {}
    assert client_factory(lambda req: httpx.Response(200, content=b"")).get("x") == {}


def test_path_normalisation(client_factory):
    seen = {}
    client = client_factory(
        lambda req: seen.update(path=req.url.path) or httpx.Response(200, json={})
    )
    client.get("/stats/ttest")   # leading slash
    assert seen["path"] == "/api/v1/stats/ttest"
    client.get("stats/ttest")    # no leading slash
    assert seen["path"] == "/api/v1/stats/ttest"


# --------------------------------------------------------------------------- #
# Error mapping
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize(
    "status,exc",
    [
        (400, ValidationError),
        (422, ValidationError),
        (401, AuthenticationError),
        (403, AuthenticationError),
        (404, NotFoundError),
        (429, RateLimitError),
        (500, ServerError),
        (503, ServerError),
        (418, APIError),  # other 4xx -> generic APIError
    ],
)
def test_status_maps_to_exception(client_factory, status, exc):
    # max_retries=0 so 429/503 surface as their exception instead of retrying.
    client = client_factory(
        lambda req: httpx.Response(status, json={"detail": "boom"}), max_retries=0
    )
    with pytest.raises(exc) as ei:
        client.get("x")
    assert "boom" in str(ei.value)
    assert isinstance(ei.value, StickForStatsError)  # everything derives from the base


def test_authentication_error_is_clean_not_typeerror(client_factory):
    """Regression: AuthenticationError used to re-pass status_code via **kwargs and
    raise TypeError, masking every 401/403. It must now raise cleanly."""
    client = client_factory(
        lambda req: httpx.Response(401, json={"detail": "bad token"}), max_retries=0
    )
    with pytest.raises(AuthenticationError) as ei:
        client.get("x")
    assert ei.value.status_code == 401
    assert "bad token" in ei.value.message


def test_validation_error_carries_field_errors(client_factory):
    payload = {"detail": "invalid", "errors": {"alpha": ["must be < 1"]}}
    client = client_factory(lambda req: httpx.Response(400, json=payload))
    with pytest.raises(ValidationError) as ei:
        client.post("stats/ttest", json={})
    assert ei.value.field_errors == {"alpha": ["must be < 1"]}
    assert ei.value.status_code == 400


def test_rate_limit_error_captures_retry_after(client_factory):
    def handler(req: httpx.Request) -> httpx.Response:
        return httpx.Response(429, json={"detail": "slow"}, headers={"Retry-After": "7"})

    client = client_factory(handler, max_retries=0)
    with pytest.raises(RateLimitError) as ei:
        client.get("x")
    assert ei.value.retry_after == 7.0


def test_non_json_error_body_is_handled(client_factory):
    client = client_factory(
        lambda req: httpx.Response(500, text="<html>boom</html>"), max_retries=0
    )
    with pytest.raises(ServerError) as ei:
        client.get("x")
    assert "boom" in str(ei.value)


def test_exception_subclassing():
    assert issubclass(AuthenticationError, APIError)
    assert issubclass(NotFoundError, APIError)
    assert issubclass(RateLimitError, APIError)
    assert issubclass(ServerError, APIError)
    for e in (APIError, ValidationError, ConnectionError, TimeoutError, ConfigurationError):
        assert issubclass(e, StickForStatsError)


# --------------------------------------------------------------------------- #
# Retries
# --------------------------------------------------------------------------- #

def test_retries_transient_status_then_succeeds(client_factory):
    calls = {"n": 0}

    def handler(req: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if calls["n"] < 3:
            return httpx.Response(503, json={"detail": "warming up"})
        return httpx.Response(200, json={"ok": True})

    client = client_factory(handler, max_retries=3)
    assert client.get("x") == {"ok": True}
    assert calls["n"] == 3  # two failures + one success


def test_retries_exhausted_raises(client_factory):
    calls = {"n": 0}

    def handler(req: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        return httpx.Response(503, json={"detail": "down"})

    client = client_factory(handler, max_retries=2)
    with pytest.raises(ServerError):
        client.get("x")
    assert calls["n"] == 3  # initial + 2 retries


def test_max_retries_zero_disables_retry(client_factory):
    calls = {"n": 0}

    def handler(req: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        return httpx.Response(503, json={})

    client = client_factory(handler, max_retries=0)
    with pytest.raises(ServerError):
        client.get("x")
    assert calls["n"] == 1


def test_uploads_are_not_retried(client_factory):
    """Multipart uploads consume their stream and must not be replayed."""
    calls = {"n": 0}

    def handler(req: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        return httpx.Response(503, json={})

    client = client_factory(handler, max_retries=3)
    with pytest.raises(ServerError):
        client.post("manuscript/analyze", files={"file": ("a.txt", b"data")})
    assert calls["n"] == 1  # no retry despite max_retries=3


# --------------------------------------------------------------------------- #
# Connection / timeout
# --------------------------------------------------------------------------- #

def test_connect_error_maps_to_connection_error(client_factory):
    def handler(req: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused")

    client = client_factory(handler, max_retries=1)
    with pytest.raises(ConnectionError) as ei:
        client.get("x")
    assert "Could not connect" in str(ei.value)
    assert "testserver" in str(ei.value)


def test_timeout_maps_to_timeout_error(client_factory):
    def handler(req: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("too slow")

    client = client_factory(handler, max_retries=1)
    with pytest.raises(TimeoutError):
        client.get("x")


def test_connect_error_is_retried_before_failing(client_factory):
    calls = {"n": 0}

    def handler(req: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if calls["n"] < 2:
            raise httpx.ConnectError("refused")
        return httpx.Response(200, json={"ok": True})

    client = client_factory(handler, max_retries=2)
    assert client.get("x") == {"ok": True}
    assert calls["n"] == 2


# --------------------------------------------------------------------------- #
# Configuration, headers, env vars, repr
# --------------------------------------------------------------------------- #

def test_invalid_base_url_raises_configuration_error():
    with pytest.raises(ConfigurationError):
        StickForStats(base_url="localhost:8000")  # no scheme


def test_base_url_trailing_slash_stripped():
    c = StickForStats(base_url="http://h:8000/api/v1/")
    assert c.base_url == "http://h:8000/api/v1"


def test_user_agent_carries_version(client_factory):
    seen = {}

    def handler(req: httpx.Request) -> httpx.Response:
        seen["ua"] = req.headers.get("user-agent", "")
        return httpx.Response(200, json={})

    client_factory(handler).get("x")
    assert seen["ua"] == f"stickforstats-python/{__version__}"


def _capture_auth_handler(seen: dict):
    def handler(req: httpx.Request) -> httpx.Response:
        seen["auth"] = req.headers.get("authorization")
        seen["xkey"] = req.headers.get("x-api-key")
        return httpx.Response(200, json={})

    return handler


def test_token_auth_header(client_factory):
    seen: dict = {}
    client = client_factory(_capture_auth_handler(seen), api_key="tok_123")
    client.get("x")
    assert seen["auth"] == "Token tok_123"
    assert seen["xkey"] is None


def test_platform_key_header(client_factory):
    seen: dict = {}
    client = client_factory(_capture_auth_handler(seen), api_key="plat_123", platform_key=True)
    client.get("x")
    assert seen["xkey"] == "plat_123"
    assert seen["auth"] is None


def test_env_vars_configure_client(monkeypatch):
    monkeypatch.setenv("STICKFORSTATS_BASE_URL", "http://env-host:9000/api/v1")
    monkeypatch.setenv("STICKFORSTATS_API_KEY", "env_key")
    monkeypatch.setenv("STICKFORSTATS_TIMEOUT", "12.5")
    c = StickForStats()
    assert c.base_url == "http://env-host:9000/api/v1"
    assert c.api_key == "env_key"
    assert c.timeout == 12.5


def test_explicit_args_override_env(monkeypatch):
    monkeypatch.setenv("STICKFORSTATS_BASE_URL", "http://env-host/api/v1")
    monkeypatch.setenv("STICKFORSTATS_API_KEY", "env_key")
    c = StickForStats(base_url="http://explicit/api/v1", api_key="explicit_key")
    assert c.base_url == "http://explicit/api/v1"
    assert c.api_key == "explicit_key"


def test_repr_masks_api_key():
    assert "None" in repr(StickForStats(base_url="http://h/api/v1"))
    assert "***" in repr(StickForStats(base_url="http://h/api/v1", api_key="short"))
    masked = repr(StickForStats(base_url="http://h/api/v1", api_key="tok_abcdefgh_1234"))
    assert "tok_" in masked and "1234" in masked and "abcdefgh" not in masked


def test_context_manager_closes(client_factory):
    with client_factory(lambda req: httpx.Response(200, json={})) as c:
        assert c.get("x") == {}
    assert c._client.is_closed
