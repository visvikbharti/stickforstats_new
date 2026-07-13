"""
Normality tests.
================

This endpoint exists because the frontend did not have one, and invented the test instead.

`frontend/src/components/statistical-analysis/utils/statisticalUtils.js` shipped a
`shapiroWilkTest()` written in JavaScript whose W coefficients were not Royston's, whose
normalizing transform ignored the sample size entirely (Royston's mu and sigma both depend
on n), and whose p-value was hard-floored:

    pValue = Math.max(0.001, Math.min(1, pValue * 2))

so no sample, however non-normal, could ever report p < 0.001. That test decided whether the
`/statistical-analysis-tools` page told a user their data were normal -- and it disagreed
with the Guardian's real Shapiro-Wilk running on the same data on the same screen.

There is no such thing as an approximate normality verdict that is "close enough". This
endpoint runs the real tests, in scipy, on the server, and reports every one of them.
"""

import logging
from typing import Any, Dict, List

import numpy as np
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from scipy import stats

from core.utils.anderson_darling import anderson_pvalue_continuous

logger = logging.getLogger(__name__)

# Above this n, scipy.stats.shapiro's p-value is unreliable and scipy itself warns.
SHAPIRO_MAX_N = 5000


class NormalityTestView(APIView):
    """POST /api/v1/stats/normality/

    Body: {"data": [...], "alpha": 0.05}

    Returns every applicable normality test with its real statistic and p-value, plus the
    shape statistics. Nothing is floored, clamped or substituted: a test that cannot run on
    this sample is reported as not run, with the reason.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        raw = request.data.get("data")
        if not isinstance(raw, list):
            return Response(
                {"error": "`data` must be a list of numbers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            values = np.asarray([float(v) for v in raw], dtype=float)
        except (TypeError, ValueError):
            return Response(
                {"error": "`data` must contain only numbers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        values = values[np.isfinite(values)]
        n = int(values.size)

        if n < 3:
            return Response(
                {"error": f"At least 3 finite observations are needed to test normality (got {n})."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            alpha = float(request.data.get("alpha", 0.05))
        except (TypeError, ValueError):
            return Response({"error": "`alpha` must be a number."}, status=status.HTTP_400_BAD_REQUEST)
        if not 0 < alpha < 1:
            return Response({"error": "`alpha` must be between 0 and 1."}, status=status.HTTP_400_BAD_REQUEST)

        # Constant data: every normality test is degenerate here (zero variance). Say so
        # rather than returning a statistic computed from a division by zero.
        if np.allclose(values, values[0]):
            return Response(
                {
                    "n": n,
                    "alpha": alpha,
                    "tests": [],
                    "descriptives": {"mean": float(values[0]), "std": 0.0, "skewness": None, "kurtosis": None},
                    "is_normal": None,
                    "summary": (
                        "Every observation is identical, so the sample has zero variance. Normality is "
                        "undefined for a constant: there is no distribution to compare against."
                    ),
                },
                status=status.HTTP_200_OK,
            )

        tests: List[Dict[str, Any]] = []

        # --- Shapiro-Wilk (the reference test for n <= 5000) ---
        if n <= SHAPIRO_MAX_N:
            w, p = stats.shapiro(values)
            tests.append(
                {
                    "name": "Shapiro-Wilk",
                    "statistic": float(w),
                    "statistic_label": "W",
                    "p_value": float(p),
                    "normal": bool(p > alpha),
                    "note": "The most powerful general test of normality for small to moderate samples.",
                }
            )
        else:
            tests.append(
                {
                    "name": "Shapiro-Wilk",
                    "statistic": None,
                    "statistic_label": "W",
                    "p_value": None,
                    "normal": None,
                    "note": (
                        f"Not run: Shapiro-Wilk's p-value is unreliable above n = {SHAPIRO_MAX_N} "
                        f"(this sample has n = {n}). Use Anderson-Darling below."
                    ),
                }
            )

        # --- Anderson-Darling, with a real p-value ---
        anderson = stats.anderson(values, dist="norm")
        anderson_p = anderson_pvalue_continuous(float(anderson.statistic), n)
        tests.append(
            {
                "name": "Anderson-Darling",
                "statistic": float(anderson.statistic),
                "statistic_label": "A²",
                "p_value": float(anderson_p),
                "normal": bool(anderson_p > alpha),
                "critical_values": {
                    f"{level}%": float(cv)
                    for level, cv in zip(anderson.significance_level, anderson.critical_values)
                },
                "note": "Sensitive to departures in the tails. Valid at any sample size.",
            }
        )

        # --- D'Agostino-Pearson K^2 (needs n >= 20 to be meaningful) ---
        if n >= 20:
            k2, k2_p = stats.normaltest(values)
            tests.append(
                {
                    "name": "D'Agostino-Pearson",
                    "statistic": float(k2),
                    "statistic_label": "K²",
                    "p_value": float(k2_p),
                    "normal": bool(k2_p > alpha),
                    "note": "Combines skewness and kurtosis. Requires n >= 20.",
                }
            )
        else:
            tests.append(
                {
                    "name": "D'Agostino-Pearson",
                    "statistic": None,
                    "statistic_label": "K²",
                    "p_value": None,
                    "normal": None,
                    "note": f"Not run: needs n >= 20 (this sample has n = {n}).",
                }
            )

        # --- Jarque-Bera (asymptotic; only meaningful for large n) ---
        if n >= 30:
            jb, jb_p = stats.jarque_bera(values)
            tests.append(
                {
                    "name": "Jarque-Bera",
                    "statistic": float(jb),
                    "statistic_label": "JB",
                    "p_value": float(jb_p),
                    "normal": bool(jb_p > alpha),
                    "note": "Asymptotic test based on skewness and kurtosis. Requires a large sample.",
                }
            )

        skewness = float(stats.skew(values))
        kurtosis = float(stats.kurtosis(values))  # excess kurtosis (0 = normal)

        # The verdict comes from the test that is actually authoritative for this n, and the
        # response says which one that was. It is not a vote, and it is not the most
        # convenient of the four.
        primary = tests[0] if (n <= SHAPIRO_MAX_N) else tests[1]
        is_normal = primary["normal"]

        return Response(
            {
                "n": n,
                "alpha": alpha,
                "tests": tests,
                "primary_test": primary["name"],
                "is_normal": is_normal,
                "descriptives": {
                    "mean": float(np.mean(values)),
                    "std": float(np.std(values, ddof=1)),
                    "skewness": skewness,
                    "kurtosis": kurtosis,
                },
                "summary": (
                    f"{primary['name']} (the appropriate test at n = {n}) gives "
                    f"p = {primary['p_value']:.4g}, so at alpha = {alpha} the data are "
                    f"{'consistent with' if is_normal else 'NOT consistent with'} a normal distribution."
                ),
            },
            status=status.HTTP_200_OK,
        )
