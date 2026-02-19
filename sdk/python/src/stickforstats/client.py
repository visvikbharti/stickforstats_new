"""
Core client for the StickForStats API.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

import httpx

from stickforstats.exceptions import (
    APIError,
    AuthenticationError,
    StickForStatsError,
    TimeoutError,
    ValidationError,
)

# Submodule imports (lazy-friendly but we import eagerly for simplicity)
from stickforstats.stats import StatsModule
from stickforstats.power import PowerModule
from stickforstats.nonparametric import NonparametricModule
from stickforstats.categorical import CategoricalModule
from stickforstats.autonomous import AutonomousModule
from stickforstats.manuscript import ManuscriptModule
from stickforstats.platform import PlatformModule


class StickForStats:
    """
    Main client for the StickForStats API.

    Parameters
    ----------
    base_url : str
        Root URL of the API, including the ``/api/v1`` prefix.
    api_key : str, optional
        Token used for authentication.  Sent as ``Authorization: Token <key>``
        for user tokens or ``X-API-Key: <key>`` for platform keys.
    timeout : float
        Request timeout in seconds.
    platform_key : bool
        If *True*, the *api_key* is sent via the ``X-API-Key`` header instead
        of the ``Authorization`` header.

    Examples
    --------
    >>> client = StickForStats(api_key="tok_abc123")
    >>> result = client.stats.ttest(data={"a": [1, 2, 3], "b": [4, 5, 6]})

    Use as a context manager to ensure the underlying connection pool is closed::

        with StickForStats(api_key="tok_abc123") as sfs:
            result = sfs.stats.descriptive(data=[10, 20, 30])
    """

    def __init__(
        self,
        base_url: str = "http://localhost:8000/api/v1",
        api_key: Optional[str] = None,
        timeout: float = 60.0,
        platform_key: bool = False,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout
        self.platform_key = platform_key

        headers: Dict[str, str] = {
            "Accept": "application/json",
            "User-Agent": "stickforstats-python/0.1.0",
        }
        if api_key:
            if platform_key:
                headers["X-API-Key"] = api_key
            else:
                headers["Authorization"] = f"Token {api_key}"

        self._client = httpx.Client(
            base_url=self.base_url,
            headers=headers,
            timeout=httpx.Timeout(timeout),
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

    def __enter__(self) -> "StickForStats":
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
        json: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        files: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Send an HTTP request and return the parsed JSON body.

        Raises
        ------
        AuthenticationError
            If the server returns 401 or 403.
        ValidationError
            If the server returns 400 with validation errors.
        APIError
            For any other non-2xx status code.
        TimeoutError
            If the request exceeds the configured timeout.
        """
        url = f"/{path.lstrip('/')}"
        try:
            response = self._client.request(
                method,
                url,
                json=json,
                params=params,
                files=files,
                data=data,
            )
        except httpx.TimeoutException as exc:
            raise TimeoutError(f"Request to {path} timed out after {self.timeout}s") from exc
        except httpx.HTTPError as exc:
            raise StickForStatsError(f"HTTP error communicating with API: {exc}") from exc

        return self._handle_response(response)

    def _handle_response(self, response: httpx.Response) -> Dict[str, Any]:
        """Parse the response, raising typed exceptions for error status codes."""
        if response.status_code in (401, 403):
            body = self._safe_json(response)
            raise AuthenticationError(
                message=body.get("detail", "Authentication failed"),
                status_code=response.status_code,
                response_body=body,
            )

        if response.status_code == 400:
            body = self._safe_json(response)
            raise ValidationError(
                message=body.get("detail", body.get("error", "Validation error")),
                field_errors=body.get("errors", body),
            )

        if response.status_code >= 400:
            body = self._safe_json(response)
            raise APIError(
                message=body.get("detail", f"API error (HTTP {response.status_code})"),
                status_code=response.status_code,
                response_body=body,
            )

        # 2xx — parse JSON
        if response.status_code == 204:
            return {}
        return response.json()

    @staticmethod
    def _safe_json(response: httpx.Response) -> Dict[str, Any]:
        """Attempt to parse JSON; return empty dict on failure."""
        try:
            return response.json()
        except Exception:
            return {"detail": response.text}

    # ------------------------------------------------------------------
    # Convenience HTTP verbs
    # ------------------------------------------------------------------

    def get(self, path: str, **kwargs: Any) -> Dict[str, Any]:
        """Send a GET request."""
        return self._request("GET", path, **kwargs)

    def post(self, path: str, **kwargs: Any) -> Dict[str, Any]:
        """Send a POST request."""
        return self._request("POST", path, **kwargs)

    def put(self, path: str, **kwargs: Any) -> Dict[str, Any]:
        """Send a PUT request."""
        return self._request("PUT", path, **kwargs)

    def delete(self, path: str, **kwargs: Any) -> Dict[str, Any]:
        """Send a DELETE request."""
        return self._request("DELETE", path, **kwargs)

    # ------------------------------------------------------------------
    # Repr
    # ------------------------------------------------------------------

    def __repr__(self) -> str:
        masked_key = f"{self.api_key[:4]}...{self.api_key[-4:]}" if self.api_key else "None"
        return (
            f"StickForStats(base_url={self.base_url!r}, "
            f"api_key={masked_key!r}, timeout={self.timeout})"
        )
