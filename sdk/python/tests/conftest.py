"""Shared pytest fixtures for the StickForStats SDK test suite.

All tests run against an in-memory ``httpx.MockTransport`` (injected via the
client's ``transport`` parameter), so the suite never touches the network and
needs no running backend.
"""

from __future__ import annotations

from typing import Any, Callable

import httpx
import pytest

from stickforstats import StickForStats


@pytest.fixture
def client_factory() -> Callable[..., StickForStats]:
    """Return a factory that builds a client wired to a mock request handler.

    Usage::

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json={"ok": True})

        client = client_factory(handler)
    """

    def _factory(
        handler: Callable[[httpx.Request], httpx.Response], **kwargs: Any
    ) -> StickForStats:
        kwargs.setdefault("base_url", "http://testserver/api/v1")
        kwargs.setdefault("backoff_factor", 0.0)  # no real sleeping during tests
        return StickForStats(transport=httpx.MockTransport(handler), **kwargs)

    return _factory
