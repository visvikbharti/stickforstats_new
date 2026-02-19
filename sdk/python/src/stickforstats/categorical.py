"""
Categorical tests module — wraps ``/api/v1/categorical/*`` endpoints.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict, List, Optional

from stickforstats.models import CategoricalResult

if TYPE_CHECKING:
    from stickforstats.client import StickForStats


class CategoricalModule:
    """
    Categorical / contingency-table tests with 50-digit precision.

    Accessed via ``client.categorical``.
    """

    def __init__(self, client: "StickForStats") -> None:
        self._client = client

    def chi_square_independence(
        self,
        observed: List[List[int]],
        *,
        alpha: float = 0.05,
        **kwargs: Any,
    ) -> CategoricalResult:
        """
        Chi-square test of independence.

        Parameters
        ----------
        observed : list of list of int
            Contingency table as a 2-D list.
        alpha : float
            Significance level.

        Returns
        -------
        CategoricalResult
        """
        payload: Dict[str, Any] = {"observed": observed, "alpha": alpha, **kwargs}
        resp = self._client.post("categorical/chi-square/independence/", json=payload)
        return CategoricalResult.model_validate(resp)

    def fishers_exact(
        self,
        table: List[List[int]],
        *,
        alternative: str = "two-sided",
        **kwargs: Any,
    ) -> CategoricalResult:
        """
        Fisher's exact test for a 2x2 contingency table.

        Parameters
        ----------
        table : list of list of int
            A 2x2 contingency table.
        alternative : str
            ``"two-sided"``, ``"less"``, or ``"greater"``.

        Returns
        -------
        CategoricalResult
        """
        payload: Dict[str, Any] = {"table": table, "alternative": alternative, **kwargs}
        resp = self._client.post("categorical/fishers/", json=payload)
        return CategoricalResult.model_validate(resp)

    def mcnemar(
        self,
        table: List[List[int]],
        *,
        correction: bool = True,
        **kwargs: Any,
    ) -> CategoricalResult:
        """
        McNemar's test for paired nominal data.

        Parameters
        ----------
        table : list of list of int
            A 2x2 contingency table of paired outcomes.
        correction : bool
            Apply continuity correction.

        Returns
        -------
        CategoricalResult
        """
        payload: Dict[str, Any] = {"table": table, "correction": correction, **kwargs}
        resp = self._client.post("categorical/mcnemar/", json=payload)
        return CategoricalResult.model_validate(resp)
