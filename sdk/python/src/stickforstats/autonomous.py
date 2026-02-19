"""
Autonomous Intelligence module — wraps ``/api/v1/autonomous/*`` endpoints.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict, List, Optional, Union

from stickforstats.models import CascadeResult, ProfileResult, QueryResult, TranslateResult

if TYPE_CHECKING:
    from stickforstats.client import StickForStats


class AutonomousModule:
    """
    AI-powered autonomous analysis features (smart profiling, NLP queries,
    Guardian cascade, and plain-language translation).

    Accessed via ``client.autonomous``.
    """

    def __init__(self, client: "StickForStats") -> None:
        self._client = client

    def profile(
        self,
        data: Union[Dict[str, List[Any]], List[Dict[str, Any]]],
        **kwargs: Any,
    ) -> ProfileResult:
        """
        Smart profiling — automatically detect variable types, distributions,
        and recommended analyses.

        Parameters
        ----------
        data : dict or list of dict
            Column-oriented (``{col: [values]}``) or row-oriented
            (``[{col: val, ...}, ...]``) dataset.

        Returns
        -------
        ProfileResult
        """
        payload: Dict[str, Any] = {"data": data, **kwargs}
        resp = self._client.post("autonomous/profile/", json=payload)
        return ProfileResult.model_validate(resp)

    def query(
        self,
        question: str,
        data: Union[Dict[str, List[Any]], List[Dict[str, Any]]],
        *,
        alpha: float = 0.05,
        **kwargs: Any,
    ) -> QueryResult:
        """
        Natural-language query — ask a question about your data and get
        an automated analysis with narrative interpretation.

        Parameters
        ----------
        question : str
            Plain-English research question (e.g. "Is there a difference
            between treatment and control?").
        data : dict or list of dict
            The dataset.
        alpha : float
            Significance level for any tests that are run.

        Returns
        -------
        QueryResult
        """
        payload: Dict[str, Any] = {
            "question": question,
            "data": data,
            "alpha": alpha,
            **kwargs,
        }
        resp = self._client.post("autonomous/query/", json=payload)
        return QueryResult.model_validate(resp)

    def cascade(
        self,
        data: Union[Dict[str, List[Any]], List[Dict[str, Any]]],
        test: str,
        *,
        alpha: float = 0.05,
        **kwargs: Any,
    ) -> CascadeResult:
        """
        Guardian cascade — run assumption checks, and automatically fall back
        to a nonparametric alternative when violations are detected.

        Parameters
        ----------
        data : dict or list of dict
            The dataset.
        test : str
            Requested test (e.g. ``"ttest"``).  The Guardian will verify
            assumptions and may substitute a different test.
        alpha : float
            Significance level.

        Returns
        -------
        CascadeResult
        """
        payload: Dict[str, Any] = {
            "data": data,
            "test": test,
            "alpha": alpha,
            **kwargs,
        }
        resp = self._client.post("autonomous/cascade/", json=payload)
        return CascadeResult.model_validate(resp)

    def translate(
        self,
        results: Dict[str, Any],
        *,
        audience: str = "general",
        **kwargs: Any,
    ) -> TranslateResult:
        """
        Translate statistical results into plain language.

        Parameters
        ----------
        results : dict
            Raw statistical results (as returned by any test endpoint).
        audience : str
            Target audience: ``"general"``, ``"academic"``, or ``"technical"``.

        Returns
        -------
        TranslateResult
        """
        payload: Dict[str, Any] = {
            "results": results,
            "audience": audience,
            **kwargs,
        }
        resp = self._client.post("autonomous/translate/", json=payload)
        return TranslateResult.model_validate(resp)
