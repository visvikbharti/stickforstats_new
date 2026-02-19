"""
Platform module — wraps ``/api/v1/platform/*`` endpoints.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict, List

from stickforstats.models import TierInfo, UsageSummary

if TYPE_CHECKING:
    from stickforstats.client import StickForStats


class PlatformModule:
    """
    Platform usage and tier information.

    Accessed via ``client.platform``.
    """

    def __init__(self, client: "StickForStats") -> None:
        self._client = client

    def usage(self) -> UsageSummary:
        """
        Retrieve current usage statistics for the authenticated account.

        Returns
        -------
        UsageSummary
        """
        resp = self._client.get("platform/usage/")
        return UsageSummary.model_validate(resp)

    def tiers(self) -> List[TierInfo]:
        """
        List all available platform tiers and their features.

        Returns
        -------
        list of TierInfo
        """
        resp = self._client.get("platform/tiers/")
        # The API may return a list directly or wrap it in {"tiers": [...]}
        if isinstance(resp, list):
            items = resp
        else:
            items = resp.get("tiers", resp.get("results", []))
        return [TierInfo.model_validate(t) for t in items]
