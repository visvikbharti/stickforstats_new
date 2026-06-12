"""
Core client for the StickForStats API.
"""

from __future__ import annotations

import os
import time
from typing import Any

import httpx

from stickforstats._version import __version__
from stickforstats.autonomous import AutonomousModule
from stickforstats.categorical import CategoricalModule
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
from stickforstats.manuscript import ManuscriptModule
from stickforstats.nonparametric import NonparametricModule
from stickforstats.platform import PlatformModule
from stickforstats.power import PowerModule
from stickforstats.stats import StatsModule

_DEFAULT_BASE_URL = "http://localhost:8000/api/v1"
_DEFAULT_TIMEOUT = 60.0
# Transient HTTP statuses that are safe to retry (server-side / throttling).
_RETRY_STATUSES = frozenset({429, 502, 503, 504})


class StickForStats:
    """
    Main client for the StickForStats API.

    Parameters
    ----------
    base_url : str, optional
        Root URL of the API, including the ``/api/v1`` prefix. Falls back to the
        ``STICKFORSTATS_BASE_URL`` environment variable, then to
        ``http://localhost:8000/api/v1``.
    api_key : str, optional
        Token used for authentication. Falls back to the ``STICKFORSTATS_API_KEY``
        environment variable. Sent as ``Authorization: Token <key>`` for user
        tokens, or ``X-API-Key: <key>`` when ``platform_key=True``.
    timeout : float, optional
        Per-request timeout in seconds. Falls back to ``STICKFORSTATS_TIMEOUT``,
        then to ``60``.
    platform_key : bool
        If *True*, the *api_key* is sent via the ``X-API-Key`` header.
    max_retries : int
        Number of automatic retries for transient failures (connection errors,
        timeouts, and HTTP 429/502/503/504), using exponential backoff. Set to 0
        to disable. File uploads are never retried (the body stream is consumed).
    backoff_factor : float
        Base delay (seconds) for exponential backoff: the wait before retry *n*
        is ``backoff_factor * 2**n`` (capped, and overridden by a ``Retry-After``
        header when the server supplies one).
    transport : httpx.BaseTransport, optional
        Custom transport for the underlying ``httpx.Client`` (mainly for testing
        with a mock transport, or for advanced connection customisation).

    Examples
    --------
    >>> client = StickForStats(api_key="tok_abc123")
    >>> result = client.stats.ttest(data={"a": [1, 2, 3], "b": [4, 5, 6]})

    Use as a context manager to ensure the connection pool is closed::

        with StickForStats(api_key="tok_abc123") as sfs:
            result = sfs.stats.descriptive(data=[10, 20, 30])
    """

    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        timeout: float | None = None,
        platform_key: bool = False,
        max_retries: int = 2,
        backoff_factor: float = 0.5,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        resolved_base = base_url or os.environ.get("STICKFORSTATS_BASE_URL") or _DEFAULT_BASE_URL
        self.base_url = resolved_base.rstrip("/")
        if "://" not in self.base_url:
            raise ConfigurationError(
                f"Invalid base_url {self.base_url!r}: it must include a scheme, "
                "e.g. 'http://localhost:8000/api/v1'."
            )

        self.api_key = api_key or os.environ.get("STICKFORSTATS_API_KEY")
        if timeout is None:
            env_timeout = os.environ.get("STICKFORSTATS_TIMEOUT")
            timeout = float(env_timeout) if env_timeout else _DEFAULT_TIMEOUT
        self.timeout = float(timeout)
        self.platform_key = platform_key
        self.max_retries = max(0, int(max_retries))
        self.backoff_factor = max(0.0, float(backoff_factor))

        headers: dict[str, str] = {
            "Accept": "application/json",
            "User-Agent": f"stickforstats-python/{__version__}",
        }
        if self.api_key:
            if platform_key:
                headers["X-API-Key"] = self.api_key
            else:
                headers["Authorization"] = f"Token {self.api_key}"

        self._client = httpx.Client(
            base_url=self.base_url,
            headers=headers,
            timeout=httpx.Timeout(self.timeout),
            transport=transport,
        )

        # Attach sub-modules
        self.stats = StatsModule(self)
        self.power = PowerModule(self)
        self.nonparametric = NonparametricModule(self)
        self.categorical = CategoricalModule(self)
        self.autonomous = AutonomousModule(self)
        self.manuscript = ManuscriptModule(self)
        self.platform = PlatformModule(self)

    # ------------------------------------------------------------------
    # Context manager
    # ------------------------------------------------------------------

    def __enter__(self) -> StickForStats:
        return self

    def __exit__(self, *exc: Any) -> None:
        self.close()

    def close(self) -> None:
        """Close the underlying HTTP connection pool."""
        self._client.close()

    # ------------------------------------------------------------------
    # Low-level request helpers
    # ------------------------------------------------------------------

    def _request(
        self,
        method: str,
        path: str,
        *,
        json: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
        files: dict[str, Any] | None = None,
        data: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Send an HTTP request and return the parsed JSON body, retrying transient
        failures with exponential backoff.

        Raises
        ------
        AuthenticationError   on HTTP 401/403.
        ValidationError       on HTTP 400/422.
        NotFoundError         on HTTP 404.
        RateLimitError        on HTTP 429 (after retries are exhausted).
        ServerError           on HTTP 5xx (after retries are exhausted).
        APIError              on any other non-2xx status.
        ConnectionError       if the backend cannot be reached (after retries).
        TimeoutError          if the request times out (after retries).
        """
        url = f"/{path.lstrip('/')}"
        # A multipart upload consumes its body stream, so it cannot be safely replayed.
        retryable = files is None
        attempt = 0

        while True:
            try:
                response = self._client.request(
                    method, url, json=json, params=params, files=files, data=data
                )
            except httpx.TimeoutException as exc:
                if retryable and attempt < self.max_retries:
                    self._backoff(attempt)
                    attempt += 1
                    continue
                raise TimeoutError(
                    f"Request to {path} timed out after {self.timeout}s "
                    f"({attempt + 1} attempt(s))."
                ) from exc
            except httpx.ConnectError as exc:
                if retryable and attempt < self.max_retries:
                    self._backoff(attempt)
                    attempt += 1
                    continue
                raise ConnectionError(
                    f"Could not connect to the StickForStats API at {self.base_url!r}. "
                    "Is the backend running and is the base URL correct? "
                    f"(original error: {exc})"
                ) from exc
            except httpx.HTTPError as exc:
                raise StickForStatsError(f"HTTP error communicating with API: {exc}") from exc

            transient = response.status_code in _RETRY_STATUSES
            if transient and retryable and attempt < self.max_retries:
                self._backoff(attempt, response)
                attempt += 1
                continue

            return self._handle_response(response)

    def _backoff(self, attempt: int, response: httpx.Response | None = None) -> None:
        """Sleep before the next retry, honouring ``Retry-After`` when present."""
        delay = self.backoff_factor * (2 ** attempt)
        if response is not None:
            retry_after = response.headers.get("Retry-After")
            if retry_after:
                try:
                    delay = max(delay, float(retry_after))
                except (TypeError, ValueError):
                    pass
        # Cap so a hostile/odd Retry-After can't stall the client indefinitely.
        delay = min(delay, 30.0)
        if delay > 0:
            time.sleep(delay)

    def _handle_response(self, response: httpx.Response) -> dict[str, Any]:
        """Parse the response, raising a typed exception for error status codes."""
        code = response.status_code

        if code < 400:
            if code == 204 or not response.content:
                return {}
            try:
                return response.json()
            except Exception as exc:  # malformed 2xx body
                raise StickForStatsError(
                    f"API returned a non-JSON success response (HTTP {code})."
                ) from exc

        body = self._safe_json(response)
        detail = body.get("detail") or body.get("error") or body.get("message")

        if code in (401, 403):
            raise AuthenticationError(
                message=detail or "Authentication failed",
                status_code=code,
                response_body=body,
            )
        if code in (400, 422):
            raise ValidationError(
                message=detail or "Validation error",
                field_errors=body.get("errors", body),
                status_code=code,
            )
        if code == 404:
            raise NotFoundError(message=detail or "Resource not found", response_body=body)
        if code == 429:
            retry_after = response.headers.get("Retry-After")
            try:
                retry_after_f = float(retry_after) if retry_after else None
            except (TypeError, ValueError):
                retry_after_f = None
            raise RateLimitError(
                message=detail or "Rate limit exceeded",
                response_body=body,
                retry_after=retry_after_f,
            )
        if code >= 500:
            raise ServerError(
                message=detail or f"Server error (HTTP {code})",
                status_code=code,
                response_body=body,
            )
        raise APIError(
            message=detail or f"API error (HTTP {code})",
            status_code=code,
            response_body=body,
        )

    @staticmethod
    def _safe_json(response: httpx.Response) -> dict[str, Any]:
        """Parse JSON defensively; never raise. Always return a dict."""
        try:
            parsed = response.json()
        except Exception:
            return {"detail": (response.text or "").strip()}
        if isinstance(parsed, dict):
            return parsed
        return {"detail": parsed}

    # ------------------------------------------------------------------
    # Convenience HTTP verbs
    # ------------------------------------------------------------------

    def get(self, path: str, **kwargs: Any) -> dict[str, Any]:
        """Send a GET request."""
        return self._request("GET", path, **kwargs)

    def post(self, path: str, **kwargs: Any) -> dict[str, Any]:
        """Send a POST request."""
        return self._request("POST", path, **kwargs)

    def put(self, path: str, **kwargs: Any) -> dict[str, Any]:
        """Send a PUT request."""
        return self._request("PUT", path, **kwargs)

    def delete(self, path: str, **kwargs: Any) -> dict[str, Any]:
        """Send a DELETE request."""
        return self._request("DELETE", path, **kwargs)

    # ------------------------------------------------------------------
    # Repr
    # ------------------------------------------------------------------

    @staticmethod
    def _mask_key(key: str | None) -> str:
        if not key:
            return "None"
        if len(key) <= 8:
            return "'***'"
        return f"'{key[:4]}...{key[-4:]}'"

    def __repr__(self) -> str:
        return (
            f"StickForStats(base_url={self.base_url!r}, "
            f"api_key={self._mask_key(self.api_key)}, timeout={self.timeout})"
        )
