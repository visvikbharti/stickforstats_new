"""
Quick-start functions for StickForStats.

Usage::

    from stickforstats import quick
    result = quick.ttest({"a": [1,2,3,4,5], "b": [2,3,4,5,6]})
    print(result.p_value)
"""

from __future__ import annotations

import os
from typing import Any

from stickforstats.client import StickForStats

_default_client: StickForStats | None = None


def _get_client() -> StickForStats:
    """Get or create a module-level client from environment variables."""
    global _default_client
    if _default_client is None:
        base_url = os.environ.get(
            "STICKFORSTATS_URL", "http://localhost:8000/api/v1"
        )
        api_key = os.environ.get("STICKFORSTATS_API_KEY", "")
        _default_client = StickForStats(
            base_url=base_url,
            api_key=api_key or None,
        )
    return _default_client


def ttest(
    data: dict[str, list[float]],
    *,
    paired: bool = False,
    alternative: str = "two-sided",
    alpha: float = 0.05,
) -> Any:
    """Quick t-test between two groups.

    Parameters
    ----------
    data : dict
        Mapping of group names to numeric lists (exactly two keys).
    paired : bool
        Whether to run a paired-samples test.
    alternative : str
        ``"two-sided"``, ``"less"``, or ``"greater"``.
    alpha : float
        Significance level.

    Returns
    -------
    TTestResult
    """
    client = _get_client()
    return client.stats.ttest(
        data=data,
        paired=paired,
        alternative=alternative,
        alpha=alpha,
    )


def anova(
    data: dict[str, list[float]],
    *,
    alpha: float = 0.05,
    post_hoc: str = "tukey",
) -> Any:
    """Quick one-way ANOVA across groups.

    Parameters
    ----------
    data : dict
        Mapping of group names to numeric lists.
    alpha : float
        Significance level.
    post_hoc : str
        Post-hoc method.

    Returns
    -------
    ANOVAResult
    """
    client = _get_client()
    return client.stats.anova(data=data, alpha=alpha, post_hoc=post_hoc)


def correlate(
    x: list[float],
    y: list[float],
    *,
    method: str = "pearson",
    alpha: float = 0.05,
) -> Any:
    """Quick correlation between two variables.

    Parameters
    ----------
    x, y : list of float
        Paired numeric samples.
    method : str
        ``"pearson"``, ``"spearman"``, or ``"kendall"``.
    alpha : float
        Significance level.

    Returns
    -------
    CorrelationResult
    """
    client = _get_client()
    return client.stats.correlation(x=x, y=y, method=method, alpha=alpha)


def describe(
    data: list[float] | dict[str, list[float]],
) -> Any:
    """Quick descriptive statistics.

    Parameters
    ----------
    data : list of float or dict
        A flat list or column-oriented dict.

    Returns
    -------
    DescriptiveResult
    """
    client = _get_client()
    return client.stats.descriptive(data=data)
