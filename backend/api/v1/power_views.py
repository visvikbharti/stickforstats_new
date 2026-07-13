"""
Power Analysis API Views
========================
API endpoints for high-precision power analysis with 50 decimal places.

This module provides REST API endpoints for:
- Power calculations for various tests
- Sample size determination
- Effect size detection
- Power curves generation
- Optimal allocation
- Sensitivity analysis

Author: StickForStats Development Team
Date: September 2025
Version: 1.0.0
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.views.decorators.cache import cache_page
import logging
from typing import Dict, Any

# Import the high-precision power analysis module
from core.hp_power_analysis_comprehensive import HighPrecisionPowerAnalysis
from .parameter_adapter import parameter_adapter

logger = logging.getLogger(__name__)

# Initialize the calculator
power_calculator = HighPrecisionPowerAnalysis()


class InvalidPowerParameter(ValueError):
    """A power request carried a parameter we cannot interpret.

    Raised rather than defaulted: guessing a value the caller did not send (e.g. quietly
    assuming a two-tailed test when `tails` is unparseable) returns a number that answers
    a different question than the one asked, and the caller has no way to tell.
    """


def adapt_power_params(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Adapt various parameter formats to expected format.
    Handles backward compatibility for all parameter variations.
    """
    # Use the universal adapter
    adapted = parameter_adapter.adapt_parameters("power", data)

    # Additional specific adaptations for power analysis
    # Map effect to effect_size
    if "effect" in adapted and "effect_size" not in adapted:
        adapted["effect_size"] = adapted["effect"]
    if "d" in adapted and "effect_size" not in adapted:
        adapted["effect_size"] = adapted["d"]

    # Map n to sample_size
    if "n" in adapted and "sample_size" not in adapted:
        adapted["sample_size"] = adapted["n"]
    if "size" in adapted and "sample_size" not in adapted:
        adapted["sample_size"] = adapted["size"]

    # For ANOVA - map sample_size to n_per_group
    if "sample_size" in adapted and "n_per_group" not in adapted:
        adapted["n_per_group"] = adapted["sample_size"]
    if "n" in adapted and "n_per_group" not in adapted:
        adapted["n_per_group"] = adapted["n"]

    # Map sig_level to alpha
    if "sig_level" in adapted and "alpha" not in adapted:
        adapted["alpha"] = adapted["sig_level"]
    if "significance" in adapted and "alpha" not in adapted:
        adapted["alpha"] = adapted["significance"]

    # Map `tails` -> `alternative`.
    #
    # The power UI speaks in tails (1 or 2); the t-test and correlation endpoints below read
    # `alternative` (the F and chi-square endpoints are inherently upper-tailed and ignore it).
    # Nothing bridged the two, so `tails` was silently discarded and EVERY one-tailed power
    # calculation -- t-test, ANOVA, correlation, in all three modes (power, sample size,
    # effect size) -- was computed two-tailed. A one-tailed design needs a smaller n than a
    # two-tailed one for the same power, so the tool was systematically over-prescribing
    # sample sizes and under-reporting power for anyone who selected one tail.
    #
    # A one-sided power calculation is conventionally computed in the hypothesised direction,
    # which is "greater". An explicit `alternative` always wins over `tails`.
    if "alternative" not in adapted and "tails" in adapted:
        try:
            tails = int(adapted["tails"])
        except (TypeError, ValueError):
            raise InvalidPowerParameter(
                f"`tails` must be 1 or 2, got {adapted['tails']!r}."
            )
        if tails not in (1, 2):
            raise InvalidPowerParameter(f"`tails` must be 1 or 2, got {tails}.")
        adapted["alternative"] = "greater" if tails == 1 else "two-sided"

    return adapted


# `adapt_power_params` is shared by every power endpoint, and `test_type` does not mean the same
# thing in all of them: for /power/t-test/ it names the VARIANT ("independent" / "paired" /
# "one-sample"), while for /power/curves/ it names the TEST ("t-test" / "anova" / "correlation").
# So this validation belongs to the t-test endpoints, not to the shared adapter.
T_TEST_TYPES = {
    "independent": "independent",
    "two_sample": "independent",
    "two_sample_t": "independent",
    "twosample": "independent",
    "unpaired": "independent",
    "ind": "independent",
    "paired": "paired",
    "dependent": "paired",
    "repeated": "paired",
    "one_sample": "one-sample",
    "onesample": "one-sample",
    "single_sample": "one-sample",
    "one_sample_t": "one-sample",
}


ALTERNATIVES = {
    "two_sided": "two-sided",
    "twosided": "two-sided",
    "two.sided": "two-sided",
    "both": "two-sided",
    "not_equal": "two-sided",
    "ne": "two-sided",
    "!=": "two-sided",
    "2_sided": "two-sided",
    # A one-sided power analysis is conventionally computed in the HYPOTHESISED direction, which is
    # "greater". "one-sided" on its own does not name a tail, so it must resolve to that -- never to
    # "less", which is the tail AWAY from the effect.
    "one_sided": "greater",
    "onesided": "greater",
    "one.sided": "greater",
    "1_sided": "greater",
    "greater": "greater",
    "larger": "greater",
    "gt": "greater",
    ">": "greater",
    "less": "less",
    "smaller": "less",
    "lt": "less",
    "<": "less",
}


def canonical_alternative(value):
    """
    Canonicalize `alternative`, and REJECT anything unrecognized.

    This is the same bug as `canonical_t_test_type` below, on a different parameter, and it was
    still live after that one was fixed.

    calculate_power_t_test branches:

        if alternative == "two-sided":  ...
        elif alternative == "greater":  ...
        else:  # less                   <-- everything unrecognized lands HERE

    and the Effect Size & Power tab's own menu offered the literal string "one-sided". That string
    is in no mapping, so it fell into the `else` and was computed as a LEFT-tailed test -- the tail
    pointing away from the effect. For d = 0.5, n = 64, alpha = 0.05:

        two-sided:   power = 0.8015
        greater:     power = 0.8787   <- what the user asked for
        "one-sided": power = 0.0000041   <- what they were shown

    The screen reported "0.0% power, Underpowered" for a design with 88% power.

    Worse, it was not only a wrong number. A left-tailed test against a positive effect LOSES power
    as n grows (6.2e-38 at n = 1000), so the sample-size solver's search for "the smallest n that
    reaches 80%" could never terminate -- roughly fifteen hours of CPU on one request. That search
    is now bracketed, but the real fix is here: a value we do not understand is a 400, not a guess.
    """
    if value is None:
        return "two-sided"

    canonical = ALTERNATIVES.get(str(value).strip().lower().replace("-", "_"))
    if canonical is None:
        raise InvalidPowerParameter(
            f"Unrecognized alternative {value!r}. Use 'two-sided', 'greater', or 'less'. An "
            f"unrecognized value used to be silently treated as a LEFT-tailed test, which reports a "
            f"power near zero for an effect in the opposite direction."
        )
    return canonical


def canonical_t_test_type(value):
    """
    Canonicalize the t-test variant, and REJECT anything unrecognized.

    HighPrecisionPowerAnalysis.calculate_power_t_test branches:

        if test_type == "independent":   nc = d * sqrt(n / 2);  df = 2n - 2
        elif test_type == "paired":      nc = d * sqrt(n);      df = n - 1
        else:  # one-sample              nc = d * sqrt(n);      df = n - 1

    That `else` swallowed everything. "two_sample" and "two-sample" -- the two most natural names
    for the test, and the ones an SDK or curl user reaches for first -- fell into it, and so did
    every typo. The caller asked for a two-sample power calculation and was handed a ONE-SAMPLE
    one, labelled as the test they asked for.

    The difference is not academic. For d = 0.5, n = 64, alpha = 0.05, two-sided:

        independent (correct):  power = 0.8015   <- matches statsmodels and G*Power
        the `else` branch:      power = 0.9761

    and in sample-size mode it returned n = 34 where the answer is 64 per group. A researcher
    planning a study on those numbers runs it at half the size they need, and the study comes out
    under-powered -- which is precisely the failure this platform exists to prevent.
    """
    if value is None:
        return "independent"

    canonical = T_TEST_TYPES.get(str(value).strip().lower().replace("-", "_"))
    if canonical is None:
        raise InvalidPowerParameter(
            f"Unrecognized test_type {value!r}. Use one of: 'independent' (two-sample), "
            f"'paired', or 'one-sample'. An unrecognized value used to be silently treated as a "
            f"one-sample test, which reports a materially different power and a required sample "
            f"size roughly half what is needed."
        )
    return canonical


@api_view(["POST"])
@permission_classes([AllowAny])
def calculate_power_t_test(request):
    """
    Calculate statistical power for t-tests with 50 decimal precision.

    Expected JSON payload:
    {
        "effect_size": 0.5,
        "sample_size": 64,
        "alpha": 0.05,
        "alternative": "two-sided",
        "test_type": "independent"
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_power_params(request.data)

        # Validate required parameters
        required = ["effect_size", "sample_size"]
        for param in required:
            if param not in data:
                return Response({"error": f"Missing required parameter: {param}"}, status=status.HTTP_400_BAD_REQUEST)

        # Calculate power
        result = power_calculator.calculate_power_t_test(
            effect_size=data["effect_size"],
            sample_size=data["sample_size"],
            sample_size2=data.get("sample_size2"),
            alpha=data.get("alpha", 0.05),
            alternative=canonical_alternative(data.get("alternative")),
            test_type=canonical_t_test_type(data.get("test_type")),
        )

        # Log the analysis
        logger.info(f"T-test power calculation completed for user {request.user.id}")

        return Response(
            {"success": True, "results": result, "precision": "50 decimal places"}, status=status.HTTP_200_OK
        )

    except (InvalidPowerParameter, ValueError) as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"Error in t-test power calculation: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([AllowAny])
def calculate_sample_size_t_test(request):
    """
    Calculate required sample size for t-tests with 50 decimal precision.

    Expected JSON payload:
    {
        "effect_size": 0.5,
        "power": 0.8,
        "alpha": 0.05,
        "alternative": "two-sided",
        "test_type": "independent"
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_power_params(request.data)

        # Validate required parameters
        required = ["effect_size"]
        for param in required:
            if param not in data:
                return Response({"error": f"Missing required parameter: {param}"}, status=status.HTTP_400_BAD_REQUEST)

        # Calculate sample size
        result = power_calculator.calculate_sample_size_t_test(
            effect_size=data["effect_size"],
            power=data.get("power", 0.8),
            alpha=data.get("alpha", 0.05),
            alternative=canonical_alternative(data.get("alternative")),
            test_type=canonical_t_test_type(data.get("test_type")),
        )

        logger.info(f"Sample size calculation completed for user {request.user.id}")

        return Response(
            {"success": True, "results": result, "precision": "50 decimal places"}, status=status.HTTP_200_OK
        )

    except (InvalidPowerParameter, ValueError) as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"Error in sample size calculation: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([AllowAny])
def calculate_effect_size_t_test(request):
    """
    Calculate detectable effect size for t-tests with 50 decimal precision.

    Expected JSON payload:
    {
        "sample_size": 64,
        "power": 0.8,
        "alpha": 0.05,
        "alternative": "two-sided",
        "test_type": "independent"
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_power_params(request.data)

        # Validate required parameters
        required = ["sample_size"]
        for param in required:
            if param not in data:
                return Response({"error": f"Missing required parameter: {param}"}, status=status.HTTP_400_BAD_REQUEST)

        # Calculate effect size
        result = power_calculator.calculate_effect_size_t_test(
            sample_size=data["sample_size"],
            power=data.get("power", 0.8),
            alpha=data.get("alpha", 0.05),
            alternative=canonical_alternative(data.get("alternative")),
            test_type=canonical_t_test_type(data.get("test_type")),
        )

        logger.info(f"Effect size calculation completed for user {request.user.id}")

        return Response(
            {"success": True, "results": result, "precision": "50 decimal places"}, status=status.HTTP_200_OK
        )

    except (InvalidPowerParameter, ValueError) as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"Error in effect size calculation: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([AllowAny])
def calculate_sample_size_chi_square(request):
    """
    Required total N for a chi-square test, solved against the exact non-central chi-square.

    Expected JSON payload: {"effect_size": 0.3, "df": 2, "power": 0.8, "alpha": 0.05}
    """
    try:
        data = adapt_power_params(request.data)

        for param in ("effect_size", "df"):
            if param not in data:
                return Response({"error": f"Missing required parameter: {param}"}, status=status.HTTP_400_BAD_REQUEST)

        result = power_calculator.calculate_sample_size_chi_square(
            effect_size=data["effect_size"],
            df=data["df"],
            power=data.get("power", 0.8),
            alpha=data.get("alpha", 0.05),
        )
        return Response(
            {"success": True, "results": result, "precision": "50 decimal places"}, status=status.HTTP_200_OK
        )

    except (InvalidPowerParameter, ValueError) as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"Error in chi-square sample size calculation: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([AllowAny])
def calculate_power_nonparametric(request):
    """
    Power of a rank test (Mann-Whitney, Wilcoxon, Kruskal-Wallis).

    There is no distribution-free closed form, so this uses Pitman's asymptotic relative
    efficiency against the parametric counterpart FOR A STATED PARENT DISTRIBUTION. The response
    carries the ARE used, the parent distribution assumed, and a note saying so -- because the
    answer is meaningless without them, and the browser used to omit all three.

    Expected JSON payload:
    {
        "test": "mann-whitney" | "wilcoxon" | "kruskal-wallis",
        "effect_size": 0.5, "sample_size": 64, "alpha": 0.05,
        "groups": 3,                              // kruskal-wallis only
        "parent_distribution": "normal" | "uniform" | "logistic" | "laplace" | "exponential"
    }
    """
    try:
        data = adapt_power_params(request.data)

        for param in ("test", "effect_size", "sample_size"):
            if param not in data:
                return Response({"error": f"Missing required parameter: {param}"}, status=status.HTTP_400_BAD_REQUEST)

        result = power_calculator.calculate_power_nonparametric(
            test=data["test"],
            effect_size=data["effect_size"],
            sample_size=data["sample_size"],
            alpha=data.get("alpha", 0.05),
            groups=data.get("groups", 2),
            parent_distribution=data.get("parent_distribution", "normal"),
            alternative=canonical_alternative(data.get("alternative")),
        )
        return Response({"success": True, "results": result}, status=status.HTTP_200_OK)

    except (InvalidPowerParameter, ValueError) as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"Error in non-parametric power calculation: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([AllowAny])
def calculate_sample_size_nonparametric(request):
    """
    Required n for a rank test. Same ARE method, same stated assumption, as the power endpoint.
    """
    try:
        data = adapt_power_params(request.data)

        for param in ("test", "effect_size"):
            if param not in data:
                return Response({"error": f"Missing required parameter: {param}"}, status=status.HTTP_400_BAD_REQUEST)

        result = power_calculator.calculate_sample_size_nonparametric(
            test=data["test"],
            effect_size=data["effect_size"],
            power=data.get("power", 0.8),
            alpha=data.get("alpha", 0.05),
            groups=data.get("groups", 2),
            parent_distribution=data.get("parent_distribution", "normal"),
            alternative=canonical_alternative(data.get("alternative")),
        )
        return Response({"success": True, "results": result}, status=status.HTTP_200_OK)

    except (InvalidPowerParameter, ValueError) as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"Error in non-parametric sample size calculation: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([AllowAny])
def minimum_detectable_effect(request):
    """
    The smallest effect a design can detect at a given power -- what to report instead of
    observed (post-hoc) power, which is just a re-expression of the p-value.

    Expected JSON payload:
    {
        "test_type": "t-test" | "anova" | "correlation",
        "sample_size": 30, "power": 0.8, "alpha": 0.05,
        "groups": 3,                                    // anova only
        "t_test_type": "independent" | "paired" | "one-sample"
    }
    """
    try:
        data = adapt_power_params(request.data)

        if "sample_size" not in data:
            return Response({"error": "Missing required parameter: sample_size"}, status=status.HTTP_400_BAD_REQUEST)

        result = power_calculator.calculate_minimum_detectable_effect(
            test_type=data.get("test_type", "t-test"),
            sample_size=data["sample_size"],
            power=data.get("power", 0.8),
            alpha=data.get("alpha", 0.05),
            groups=data.get("groups", 2),
            alternative=canonical_alternative(data.get("alternative")),
            t_test_type=canonical_t_test_type(data.get("t_test_type")),
        )
        # No "50 decimal places" claim here: this is bisected on the float64 non-central
        # distribution (see the engine). It is the same distribution, agreeing with the 50-digit
        # path to 4.4e-16 -- but it is not fifty digits, and saying so would be the same kind of
        # overclaim this work exists to remove.
        return Response({"success": True, "results": result}, status=status.HTTP_200_OK)

    except (InvalidPowerParameter, ValueError) as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"Error in minimum detectable effect calculation: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([AllowAny])
def power_curve(request):
    """
    Power as a function of sample size, as a plain series the client can plot.

    The existing /power/curves/ endpoint returns a rendered Plotly figure; this returns the
    numbers, because the client draws its own chart and was otherwise computing this series
    itself with a normal approximation to the non-central F that was wrong by up to 0.21.

    Expected JSON payload:
    {
        "test_type": "t-test" | "anova" | "correlation",
        "effect_size": 0.5,
        "alpha": 0.05,
        "groups": 4,               // anova only
        "alternative": "two-sided",
        "n_min": 5, "n_max": 200, "step": 5
    }
    """
    try:
        data = adapt_power_params(request.data)

        if "effect_size" not in data:
            return Response({"error": "Missing required parameter: effect_size"}, status=status.HTTP_400_BAD_REQUEST)

        result = power_calculator.power_curve(
            test_type=data.get("test_type", "t-test"),
            effect_size=data["effect_size"],
            alpha=data.get("alpha", 0.05),
            groups=data.get("groups", 2),
            alternative=canonical_alternative(data.get("alternative")),
            n_min=data.get("n_min", 5),
            n_max=data.get("n_max", 200),
            step=data.get("step", 5),
            t_test_type=canonical_t_test_type(data.get("t_test_type")),
        )

        return Response({"success": True, "results": result}, status=status.HTTP_200_OK)

    except (InvalidPowerParameter, ValueError) as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"Error generating power curve: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([AllowAny])
def calculate_sample_size_anova(request):
    """
    Required sample size PER GROUP for a one-way ANOVA, with 50 decimal precision.

    Solved against the exact non-central F power, not the normal approximation. The browser used
    to compute this itself and rounded the wrong way at the boundary, which under-powers a study
    by one subject per group without saying so.

    Expected JSON payload:
    {
        "effect_size": 0.25,
        "groups": 4,
        "power": 0.8,
        "alpha": 0.05
    }
    """
    try:
        data = adapt_power_params(request.data)

        required = ["effect_size", "groups"]
        for param in required:
            if param not in data:
                return Response({"error": f"Missing required parameter: {param}"}, status=status.HTTP_400_BAD_REQUEST)

        result = power_calculator.calculate_sample_size_anova(
            effect_size=data["effect_size"],
            groups=data["groups"],
            power=data.get("power", 0.8),
            alpha=data.get("alpha", 0.05),
        )

        logger.info(f"ANOVA sample size calculation completed for user {request.user.id}")

        return Response(
            {"success": True, "results": result, "precision": "50 decimal places"}, status=status.HTTP_200_OK
        )

    except (InvalidPowerParameter, ValueError) as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"Error in ANOVA sample size calculation: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([AllowAny])
def calculate_sample_size_correlation(request):
    """
    Required sample size for a correlation test, with 50 decimal precision.

    Expected JSON payload:
    {
        "effect_size": 0.3,
        "power": 0.8,
        "alpha": 0.05,
        "alternative": "two-sided"
    }
    """
    try:
        data = adapt_power_params(request.data)

        if "effect_size" not in data:
            return Response({"error": "Missing required parameter: effect_size"}, status=status.HTTP_400_BAD_REQUEST)

        result = power_calculator.calculate_sample_size_correlation(
            effect_size=data["effect_size"],
            power=data.get("power", 0.8),
            alpha=data.get("alpha", 0.05),
            alternative=canonical_alternative(data.get("alternative")),
        )

        logger.info(f"Correlation sample size calculation completed for user {request.user.id}")

        return Response(
            {"success": True, "results": result, "precision": "50 decimal places"}, status=status.HTTP_200_OK
        )

    except (InvalidPowerParameter, ValueError) as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"Error in correlation sample size calculation: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([AllowAny])
def calculate_power_anova(request):
    """
    Calculate statistical power for ANOVA with 50 decimal precision.

    Expected JSON payload:
    {
        "effect_size": 0.25,
        "groups": 3,
        "n_per_group": 20,
        "alpha": 0.05
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_power_params(request.data)

        # Validate required parameters
        required = ["effect_size", "groups", "n_per_group"]
        for param in required:
            if param not in data:
                return Response({"error": f"Missing required parameter: {param}"}, status=status.HTTP_400_BAD_REQUEST)

        # Calculate power
        result = power_calculator.calculate_power_anova(
            effect_size=data["effect_size"],
            groups=data["groups"],
            n_per_group=data["n_per_group"],
            alpha=data.get("alpha", 0.05),
        )

        logger.info(f"ANOVA power calculation completed for user {request.user.id}")

        return Response(
            {"success": True, "results": result, "precision": "50 decimal places"}, status=status.HTTP_200_OK
        )

    except (InvalidPowerParameter, ValueError) as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"Error in ANOVA power calculation: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([AllowAny])
def calculate_power_correlation(request):
    """
    Calculate statistical power for correlation tests with 50 decimal precision.

    Expected JSON payload:
    {
        "effect_size": 0.3,
        "sample_size": 100,
        "alpha": 0.05,
        "alternative": "two-sided"
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_power_params(request.data)

        # Validate required parameters
        required = ["effect_size", "sample_size"]
        for param in required:
            if param not in data:
                return Response({"error": f"Missing required parameter: {param}"}, status=status.HTTP_400_BAD_REQUEST)

        # Calculate power
        result = power_calculator.calculate_power_correlation(
            effect_size=data["effect_size"],
            sample_size=data["sample_size"],
            alpha=data.get("alpha", 0.05),
            alternative=canonical_alternative(data.get("alternative")),
        )

        logger.info(f"Correlation power calculation completed for user {request.user.id}")

        return Response(
            {"success": True, "results": result, "precision": "50 decimal places"}, status=status.HTTP_200_OK
        )

    except (InvalidPowerParameter, ValueError) as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"Error in correlation power calculation: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([AllowAny])
def calculate_power_chi_square(request):
    """
    Calculate statistical power for chi-square tests with 50 decimal precision.

    Expected JSON payload:
    {
        "effect_size": 0.3,
        "df": 4,
        "sample_size": 100,
        "alpha": 0.05
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_power_params(request.data)

        # Validate required parameters
        required = ["effect_size", "df", "sample_size"]
        for param in required:
            if param not in data:
                return Response({"error": f"Missing required parameter: {param}"}, status=status.HTTP_400_BAD_REQUEST)

        # Calculate power
        result = power_calculator.calculate_power_chi_square(
            effect_size=data["effect_size"],
            df=data["df"],
            sample_size=data["sample_size"],
            alpha=data.get("alpha", 0.05),
        )

        logger.info(f"Chi-square power calculation completed for user {request.user.id}")

        return Response(
            {"success": True, "results": result, "precision": "50 decimal places"}, status=status.HTTP_200_OK
        )

    except (InvalidPowerParameter, ValueError) as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"Error in chi-square power calculation: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([AllowAny])
@cache_page(60 * 15)  # Cache for 15 minutes
def create_power_curves(request):
    """
    Create power curves for visualization.

    Expected JSON payload:
    {
        "test_type": "t-test",
        "effect_sizes": [0.1, 0.2, 0.3, ...],
        "sample_sizes": [10, 20, 30, ...],
        "alpha": 0.05,
        "additional_params": {}
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_power_params(request.data)

        # Generate power curves
        result = power_calculator.create_power_curves(
            test_type=data.get("test_type", "t-test"),
            effect_sizes=data.get("effect_sizes"),
            sample_sizes=data.get("sample_sizes"),
            alpha=data.get("alpha", 0.05),
            **data.get("additional_params", {}),
        )

        logger.info(f"Power curves generated for user {request.user.id}")

        return Response(
            {
                "success": True,
                "results": {
                    "figure": result["figure"],
                    "effect_sizes": result["effect_sizes"],
                    "sample_sizes": result["sample_sizes"],
                    "test_type": result["test_type"],
                    "alpha": result["alpha"],
                    "description": result["description"],
                },
                "precision": "50 decimal places",
            },
            status=status.HTTP_200_OK,
        )

    except (InvalidPowerParameter, ValueError) as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"Error generating power curves: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([AllowAny])
def optimal_allocation(request):
    """
    Calculate optimal sample size allocation across groups.

    Expected JSON payload:
    {
        "total_sample_size": 200,
        "group_costs": [1.0, 1.5, 2.0],
        "group_variances": [1.0, 1.2, 0.8],
        "n_groups": 3
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_power_params(request.data)

        # Validate required parameters
        if "total_sample_size" not in data:
            return Response(
                {"error": "Missing required parameter: total_sample_size"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Calculate optimal allocation
        result = power_calculator.optimal_allocation(
            total_sample_size=data["total_sample_size"],
            group_costs=data.get("group_costs"),
            group_variances=data.get("group_variances"),
            n_groups=data.get("n_groups", 2),
        )

        logger.info(f"Optimal allocation calculated for user {request.user.id}")

        return Response(
            {"success": True, "results": result, "precision": "50 decimal places"}, status=status.HTTP_200_OK
        )

    except (InvalidPowerParameter, ValueError) as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"Error in optimal allocation: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([AllowAny])
def sensitivity_analysis(request):
    """
    Perform sensitivity analysis on power calculations.

    Expected JSON payload:
    {
        "test_type": "t-test",
        "base_params": {
            "effect_size": 0.5,
            "sample_size": 64,
            "alpha": 0.05
        },
        "vary_param": "effect_size",
        "vary_range": [0.1, 1.0],
        "n_points": 20
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_power_params(request.data)

        # Validate required parameters
        required = ["test_type", "base_params", "vary_param", "vary_range"]
        for param in required:
            if param not in data:
                return Response({"error": f"Missing required parameter: {param}"}, status=status.HTTP_400_BAD_REQUEST)

        # Perform sensitivity analysis
        result = power_calculator.sensitivity_analysis(
            test_type=data["test_type"],
            base_params=data["base_params"],
            vary_param=data["vary_param"],
            vary_range=tuple(data["vary_range"]),
            n_points=data.get("n_points", 20),
        )

        logger.info(f"Sensitivity analysis completed for user {request.user.id}")

        return Response(
            {
                "success": True,
                "results": {
                    "results": result["results"],
                    "figure": result["figure"],
                    "vary_parameter": result["vary_parameter"],
                    "vary_range": result["vary_range"],
                    "value_for_80_power": result["value_for_80_power"],
                    "test_type": result["test_type"],
                    "base_parameters": result["base_parameters"],
                },
                "precision": "50 decimal places",
            },
            status=status.HTTP_200_OK,
        )

    except (InvalidPowerParameter, ValueError) as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"Error in sensitivity analysis: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([AllowAny])
def comprehensive_power_report(request):
    """
    Generate comprehensive power analysis report.

    Expected JSON payload:
    {
        "test_type": "t-test",
        "params": {
            "effect_size": 0.5,
            "sample_size": 64,
            "alpha": 0.05,
            "alternative": "two-sided",
            "test_type": "independent"
        }
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_power_params(request.data)

        # Validate required parameters
        if "test_type" not in data or "params" not in data:
            return Response(
                {"error": "Missing required parameters: test_type and params"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Generate comprehensive report
        result = power_calculator.comprehensive_power_report(test_type=data["test_type"], **data["params"])

        logger.info(f"Comprehensive power report generated for user {request.user.id}")

        return Response(
            {"success": True, "report": result, "precision": "50 decimal places"}, status=status.HTTP_200_OK
        )

    except (InvalidPowerParameter, ValueError) as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"Error generating comprehensive report: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([AllowAny])
def power_analysis_info(request):
    """
    Get information about available power analysis methods.
    """
    info = {
        "description": "High-precision power analysis with 50 decimal places",
        "precision": "50 decimal places",
        "available_tests": [
            {
                "name": "t-test",
                "endpoints": [
                    "/api/v1/power/t-test/",
                    "/api/v1/power/sample-size/t-test/",
                    "/api/v1/power/effect-size/t-test/",
                ],
                "test_types": ["independent", "paired", "one-sample"],
                "alternatives": ["two-sided", "greater", "less"],
            },
            {"name": "anova", "endpoints": ["/api/v1/power/anova/"], "description": "One-way ANOVA power analysis"},
            {
                "name": "correlation",
                "endpoints": ["/api/v1/power/correlation/"],
                "alternatives": ["two-sided", "greater", "less"],
            },
            {
                "name": "chi-square",
                "endpoints": ["/api/v1/power/chi-square/"],
                "description": "Chi-square test power analysis",
            },
        ],
        "utility_endpoints": [
            {
                "name": "Power Curves",
                "endpoint": "/api/v1/power/curves/",
                "description": "Generate power curves for visualization",
            },
            {
                "name": "Optimal Allocation",
                "endpoint": "/api/v1/power/allocation/",
                "description": "Calculate optimal sample allocation",
            },
            {
                "name": "Sensitivity Analysis",
                "endpoint": "/api/v1/power/sensitivity/",
                "description": "Perform sensitivity analysis",
            },
            {
                "name": "Comprehensive Report",
                "endpoint": "/api/v1/power/report/",
                "description": "Generate full power analysis report",
            },
        ],
        "effect_size_guidelines": {
            "t-test": {"small": 0.2, "medium": 0.5, "large": 0.8},
            "anova": {"small": 0.1, "medium": 0.25, "large": 0.4},
            "correlation": {"small": 0.1, "medium": 0.3, "large": 0.5},
            "chi-square": {"small": 0.1, "medium": 0.3, "large": 0.5},
        },
    }

    return Response(info, status=status.HTTP_200_OK)


# URL patterns for inclusion in urls.py
urlpatterns = [
    ("power/t-test/", calculate_power_t_test),
    ("power/sample-size/t-test/", calculate_sample_size_t_test),
    ("power/effect-size/t-test/", calculate_effect_size_t_test),
    ("power/anova/", calculate_power_anova),
    ("power/correlation/", calculate_power_correlation),
    ("power/chi-square/", calculate_power_chi_square),
    ("power/curves/", create_power_curves),
    ("power/allocation/", optimal_allocation),
    ("power/sensitivity/", sensitivity_analysis),
    ("power/report/", comprehensive_power_report),
    ("power/info/", power_analysis_info),
]
