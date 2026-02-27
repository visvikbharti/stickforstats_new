"""
Power analysis module — wraps ``/api/v1/power/*`` endpoints.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict, List, Optional

from stickforstats.models import PowerReport, PowerResult

if TYPE_CHECKING:
    from stickforstats.client import StickForStats


class PowerModule:
    """
    Statistical power analysis with 50-digit precision.

    Accessed via ``client.power``.
    """

    def __init__(self, client: StickForStats) -> None:
        self._client = client

    # ------------------------------------------------------------------
    # t-test power
    # ------------------------------------------------------------------

    def ttest(
        self,
        *,
        effect_size: Optional[float] = None,
        n: Optional[int] = None,
        alpha: float = 0.05,
        power: Optional[float] = None,
        alternative: str = "two-sided",
        **kwargs: Any,
    ) -> PowerResult:
        """
        Power analysis for t-tests.

        Provide three of the four parameters (effect_size, n, alpha, power)
        and the fourth will be solved for.

        Returns
        -------
        PowerResult
        """
        payload: Dict[str, Any] = {
            "alpha": alpha,
            "alternative": alternative,
            **kwargs,
        }
        if effect_size is not None:
            payload["effect_size"] = effect_size
        if n is not None:
            payload["n"] = n
        if power is not None:
            payload["power"] = power

        resp = self._client.post("power/t-test/", json=payload)
        return PowerResult.model_validate(resp)

    # ------------------------------------------------------------------
    # ANOVA power
    # ------------------------------------------------------------------

    def anova(
        self,
        *,
        effect_size: Optional[float] = None,
        k: Optional[int] = None,
        n: Optional[int] = None,
        alpha: float = 0.05,
        power: Optional[float] = None,
        **kwargs: Any,
    ) -> PowerResult:
        """
        Power analysis for one-way ANOVA.

        Parameters
        ----------
        effect_size : float, optional
            Cohen's f.
        k : int, optional
            Number of groups.
        n : int, optional
            Sample size per group.
        alpha : float
            Significance level.
        power : float, optional
            Target power.

        Returns
        -------
        PowerResult
        """
        payload: Dict[str, Any] = {"alpha": alpha, **kwargs}
        if effect_size is not None:
            payload["effect_size"] = effect_size
        if k is not None:
            payload["k"] = k
        if n is not None:
            payload["n"] = n
        if power is not None:
            payload["power"] = power

        resp = self._client.post("power/anova/", json=payload)
        return PowerResult.model_validate(resp)

    # ------------------------------------------------------------------
    # Correlation power
    # ------------------------------------------------------------------

    def correlation(
        self,
        *,
        r: Optional[float] = None,
        n: Optional[int] = None,
        alpha: float = 0.05,
        power: Optional[float] = None,
        **kwargs: Any,
    ) -> PowerResult:
        """
        Power analysis for correlation tests.

        Returns
        -------
        PowerResult
        """
        payload: Dict[str, Any] = {"alpha": alpha, **kwargs}
        if r is not None:
            payload["r"] = r
        if n is not None:
            payload["n"] = n
        if power is not None:
            payload["power"] = power

        resp = self._client.post("power/correlation/", json=payload)
        return PowerResult.model_validate(resp)

    # ------------------------------------------------------------------
    # Chi-square power
    # ------------------------------------------------------------------

    def chi_square(
        self,
        *,
        effect_size: Optional[float] = None,
        n: Optional[int] = None,
        df: Optional[int] = None,
        alpha: float = 0.05,
        power: Optional[float] = None,
        **kwargs: Any,
    ) -> PowerResult:
        """
        Power analysis for chi-square tests.

        Returns
        -------
        PowerResult
        """
        payload: Dict[str, Any] = {"alpha": alpha, **kwargs}
        if effect_size is not None:
            payload["effect_size"] = effect_size
        if n is not None:
            payload["n"] = n
        if df is not None:
            payload["df"] = df
        if power is not None:
            payload["power"] = power

        resp = self._client.post("power/chi-square/", json=payload)
        return PowerResult.model_validate(resp)

    # ------------------------------------------------------------------
    # Comprehensive report
    # ------------------------------------------------------------------

    def report(
        self,
        *,
        data: Optional[Dict[str, Any]] = None,
        tests: Optional[List[str]] = None,
        alpha: float = 0.05,
        **kwargs: Any,
    ) -> PowerReport:
        """
        Generate a comprehensive power report across multiple tests.

        Parameters
        ----------
        data : dict, optional
            Dataset to base the analysis on.
        tests : list of str, optional
            Which tests to include (e.g. ``["ttest", "anova"]``).
        alpha : float
            Significance level.

        Returns
        -------
        PowerReport
        """
        payload: Dict[str, Any] = {"alpha": alpha, **kwargs}
        if data is not None:
            payload["data"] = data
        if tests is not None:
            payload["tests"] = tests

        resp = self._client.post("power/report/", json=payload)
        return PowerReport.model_validate(resp)
