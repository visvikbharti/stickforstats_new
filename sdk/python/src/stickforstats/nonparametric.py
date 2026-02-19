"""
Nonparametric tests module — wraps ``/api/v1/nonparametric/*`` endpoints.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict, List, Optional

from stickforstats.models import NonparametricResult

if TYPE_CHECKING:
    from stickforstats.client import StickForStats


class NonparametricModule:
    """
    Distribution-free statistical tests with Guardian protection.

    Accessed via ``client.nonparametric``.
    """

    def __init__(self, client: "StickForStats") -> None:
        self._client = client

    def mann_whitney(
        self,
        group1: List[float],
        group2: List[float],
        *,
        alternative: str = "two-sided",
        alpha: float = 0.05,
        **kwargs: Any,
    ) -> NonparametricResult:
        """
        Mann-Whitney U test for two independent samples.

        Parameters
        ----------
        group1, group2 : list of float
            Two independent samples.
        alternative : str
            ``"two-sided"``, ``"less"``, or ``"greater"``.
        alpha : float
            Significance level.

        Returns
        -------
        NonparametricResult
        """
        payload: Dict[str, Any] = {
            "group1": group1,
            "group2": group2,
            "alternative": alternative,
            "alpha": alpha,
            **kwargs,
        }
        resp = self._client.post("nonparametric/mann-whitney/", json=payload)
        return NonparametricResult.model_validate(resp)

    def wilcoxon(
        self,
        x: List[float],
        y: Optional[List[float]] = None,
        *,
        alternative: str = "two-sided",
        alpha: float = 0.05,
        **kwargs: Any,
    ) -> NonparametricResult:
        """
        Wilcoxon signed-rank test for paired samples or a single sample.

        Parameters
        ----------
        x : list of float
            First sample (or differences if *y* is None).
        y : list of float, optional
            Second sample for paired comparison.
        alternative : str
            ``"two-sided"``, ``"less"``, or ``"greater"``.
        alpha : float
            Significance level.

        Returns
        -------
        NonparametricResult
        """
        payload: Dict[str, Any] = {
            "x": x,
            "alternative": alternative,
            "alpha": alpha,
            **kwargs,
        }
        if y is not None:
            payload["y"] = y

        resp = self._client.post("nonparametric/wilcoxon/", json=payload)
        return NonparametricResult.model_validate(resp)

    def kruskal_wallis(
        self,
        data: Dict[str, List[float]],
        *,
        alpha: float = 0.05,
        **kwargs: Any,
    ) -> NonparametricResult:
        """
        Kruskal-Wallis H test for multiple independent samples.

        Parameters
        ----------
        data : dict
            Mapping of group names to numeric lists.
        alpha : float
            Significance level.

        Returns
        -------
        NonparametricResult
        """
        payload: Dict[str, Any] = {"data": data, "alpha": alpha, **kwargs}
        resp = self._client.post("nonparametric/kruskal-wallis/", json=payload)
        return NonparametricResult.model_validate(resp)

    def friedman(
        self,
        data: Dict[str, List[float]],
        *,
        alpha: float = 0.05,
        **kwargs: Any,
    ) -> NonparametricResult:
        """
        Friedman test for repeated measures on ranked data.

        Parameters
        ----------
        data : dict
            Mapping of condition names to numeric lists (equal length).
        alpha : float
            Significance level.

        Returns
        -------
        NonparametricResult
        """
        payload: Dict[str, Any] = {"data": data, "alpha": alpha, **kwargs}
        resp = self._client.post("nonparametric/friedman/", json=payload)
        return NonparametricResult.model_validate(resp)
