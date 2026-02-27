"""
Statistics module — wraps ``/api/v1/stats/*`` endpoints.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from stickforstats.models import (
    ANOVAResult,
    CorrelationResult,
    DescriptiveResult,
    RegressionResult,
    TTestResult,
)

if TYPE_CHECKING:
    from stickforstats.client import StickForStats


class StatsModule:
    """
    Parametric statistical tests with Guardian protection.

    Accessed via ``client.stats``.
    """

    def __init__(self, client: StickForStats) -> None:
        self._client = client

    # ------------------------------------------------------------------
    # t-test
    # ------------------------------------------------------------------

    def ttest(
        self,
        data: dict[str, list[float]],
        *,
        groups: list[str] | None = None,
        paired: bool = False,
        alpha: float = 0.05,
        alternative: str = "two-sided",
        **kwargs: Any,
    ) -> TTestResult:
        """
        Perform an independent or paired-samples t-test.

        Parameters
        ----------
        data : dict
            Mapping of group names to numeric lists, e.g.
            ``{"control": [1.2, 3.4], "treatment": [5.6, 7.8]}``.
        groups : list of str, optional
            Explicit group names to compare.  Defaults to the first two keys
            of *data*.
        paired : bool
            Whether to run a paired-samples t-test.
        alpha : float
            Significance level.
        alternative : str
            ``"two-sided"``, ``"less"``, or ``"greater"``.

        Returns
        -------
        TTestResult
        """
        payload: dict[str, Any] = {
            "data": data,
            "paired": paired,
            "alpha": alpha,
            "alternative": alternative,
            **kwargs,
        }
        if groups is not None:
            payload["groups"] = groups

        resp = self._client.post("stats/ttest/", json=payload)
        return TTestResult.model_validate(resp)

    # ------------------------------------------------------------------
    # ANOVA
    # ------------------------------------------------------------------

    def anova(
        self,
        data: dict[str, list[float]],
        *,
        groups: list[str] | None = None,
        alpha: float = 0.05,
        anova_type: str = "one-way",
        post_hoc: str = "tukey",
        **kwargs: Any,
    ) -> ANOVAResult:
        """
        Perform a one-way (or repeated-measures / MANOVA) ANOVA.

        Parameters
        ----------
        data : dict
            Mapping of group names to numeric lists.
        groups : list of str, optional
            Subset of groups to compare.
        alpha : float
            Significance level.
        anova_type : str
            ``"one-way"``, ``"repeated-measures"``, or ``"manova"``.
        post_hoc : str
            Post-hoc method (``"tukey"``, ``"bonferroni"``, ``"scheffe"``).

        Returns
        -------
        ANOVAResult
        """
        payload: dict[str, Any] = {
            "data": data,
            "alpha": alpha,
            "anova_type": anova_type,
            "post_hoc": post_hoc,
            **kwargs,
        }
        if groups is not None:
            payload["groups"] = groups

        resp = self._client.post("stats/anova/", json=payload)
        return ANOVAResult.model_validate(resp)

    # ------------------------------------------------------------------
    # ANCOVA
    # ------------------------------------------------------------------

    def ancova(
        self,
        data: dict[str, Any],
        *,
        dependent: str,
        factor: str,
        covariates: list[str] | None = None,
        alpha: float = 0.05,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """
        Perform an Analysis of Covariance.

        Parameters
        ----------
        data : dict
            Column-oriented dataset.
        dependent : str
            Name of the dependent variable.
        factor : str
            Name of the grouping factor.
        covariates : list of str, optional
            Covariate column names.
        alpha : float
            Significance level.

        Returns
        -------
        dict
            Raw API response.
        """
        payload: dict[str, Any] = {
            "data": data,
            "dependent": dependent,
            "factor": factor,
            "alpha": alpha,
            **kwargs,
        }
        if covariates is not None:
            payload["covariates"] = covariates

        return self._client.post("stats/ancova/", json=payload)

    # ------------------------------------------------------------------
    # Correlation
    # ------------------------------------------------------------------

    def correlation(
        self,
        x: list[float],
        y: list[float],
        *,
        method: str = "pearson",
        alpha: float = 0.05,
        **kwargs: Any,
    ) -> CorrelationResult:
        """
        Compute a correlation coefficient with significance test.

        Parameters
        ----------
        x, y : list of float
            Paired numeric samples.
        method : str
            ``"pearson"``, ``"spearman"``, or ``"kendall"``.
        alpha : float
            Significance level for confidence interval.

        Returns
        -------
        CorrelationResult
        """
        payload: dict[str, Any] = {
            "x": x,
            "y": y,
            "method": method,
            "alpha": alpha,
            **kwargs,
        }
        resp = self._client.post("stats/correlation/", json=payload)
        return CorrelationResult.model_validate(resp)

    # ------------------------------------------------------------------
    # Regression
    # ------------------------------------------------------------------

    def regression(
        self,
        data: dict[str, list[float]],
        *,
        dependent: str,
        predictors: list[str],
        regression_type: str = "linear",
        alpha: float = 0.05,
        **kwargs: Any,
    ) -> RegressionResult:
        """
        Fit a regression model.

        Parameters
        ----------
        data : dict
            Column-oriented dataset.
        dependent : str
            Name of the dependent variable column.
        predictors : list of str
            Names of predictor columns.
        regression_type : str
            ``"linear"``, ``"multiple"``, ``"polynomial"``, ``"logistic"``,
            ``"ridge"``, or ``"lasso"``.
        alpha : float
            Significance level.

        Returns
        -------
        RegressionResult
        """
        payload: dict[str, Any] = {
            "data": data,
            "dependent": dependent,
            "predictors": predictors,
            "regression_type": regression_type,
            "alpha": alpha,
            **kwargs,
        }
        resp = self._client.post("stats/regression/", json=payload)
        return RegressionResult.model_validate(resp)

    # ------------------------------------------------------------------
    # Descriptive statistics
    # ------------------------------------------------------------------

    def descriptive(
        self,
        data: list[float] | dict[str, list[float]],
        **kwargs: Any,
    ) -> DescriptiveResult:
        """
        Compute descriptive statistics (mean, median, SD, etc.).

        Parameters
        ----------
        data : list of float or dict
            A flat list of numbers, or a column-oriented dict.

        Returns
        -------
        DescriptiveResult
        """
        payload: dict[str, Any] = {"data": data, **kwargs}
        resp = self._client.post("stats/descriptive/", json=payload)
        return DescriptiveResult.model_validate(resp)
