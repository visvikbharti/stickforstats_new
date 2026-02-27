"""
Mixed Models API Views
=======================
Provides API endpoints for mixed effects models including ICC calculation,
linear mixed model fitting, random effects extraction, model comparison,
and diagnostics.

Author: StickForStats Development Team
Version: 1.0.0
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
import numpy as np
import pandas as pd
import logging
import traceback

from core.services.mixed_models import (
    calculate_icc,
    fit_linear_mixed_model,
    extract_random_effects,
    compare_models,
    full_diagnostics,
)

logger = logging.getLogger(__name__)


def sanitize_for_json(obj):
    """Recursively sanitize data to be JSON-safe."""
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(item) for item in obj]
    elif isinstance(obj, (np.ndarray, pd.Series)):
        return sanitize_for_json(obj.tolist())
    elif isinstance(obj, pd.DataFrame):
        return sanitize_for_json(obj.to_dict("records"))
    elif isinstance(obj, set):
        return sanitize_for_json(list(obj))
    elif isinstance(obj, float):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return obj
    elif isinstance(obj, (np.integer, np.floating)):
        val = obj.item()
        if isinstance(val, float) and (np.isnan(val) or np.isinf(val)):
            return None
        return val
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif hasattr(obj, "__dict__"):
        return sanitize_for_json(vars(obj))
    else:
        return obj


# ── ICC ─────────────────────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([AllowAny])
def calculate_icc_view(request):
    """Calculate Intraclass Correlation Coefficient."""
    try:
        data = request.data
        raw_data = data.get("data")
        icc_type = data.get("icc_type", "ICC(2,1)")

        if raw_data is None:
            return Response({"success": False, "error": "data is required"}, status=status.HTTP_400_BAD_REQUEST)

        df = pd.DataFrame(raw_data)

        kwargs = {
            "data": df,
            "icc_type": icc_type,
        }

        # Pass optional column names if provided
        if data.get("subjects_col"):
            kwargs["subjects_col"] = data["subjects_col"]
        if data.get("raters_col"):
            kwargs["raters_col"] = data["raters_col"]
        if data.get("values_col"):
            kwargs["values_col"] = data["values_col"]
        if data.get("confidence_level"):
            kwargs["confidence_level"] = data["confidence_level"]

        result = calculate_icc(**kwargs)

        logger.info(f"ICC calculated: type={icc_type}")

        return Response(
            {"success": True, "results": sanitize_for_json(result), "method": "icc"}, status=status.HTTP_200_OK
        )

    except ValueError as e:
        return Response(
            {"success": False, "error": str(e), "error_type": "validation_error"}, status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Error calculating ICC: {traceback.format_exc()}")
        return Response({"success": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ── Linear Mixed Model ──────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([AllowAny])
def fit_lmm(request):
    """Fit a linear mixed model."""
    try:
        data = request.data
        raw_data = data.get("data")
        outcome = data.get("outcome")
        fixed_effects = data.get("fixed_effects", [])
        random_effects = data.get("random_effects", [])
        grouping_var = data.get("grouping_var")
        method = data.get("method", "powell")
        data.get("reml", True)
        max_iterations = data.get("max_iterations", 200)

        if raw_data is None or not outcome or not fixed_effects or not grouping_var:
            return Response(
                {"success": False, "error": "data, outcome, fixed_effects, and grouping_var are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        df = pd.DataFrame(raw_data)

        # Build random slopes dict if provided
        random_slopes = None
        if random_effects:
            random_slopes = {re: grouping_var for re in random_effects}

        result = fit_linear_mixed_model(
            data=df,
            outcome=outcome,
            fixed_effects=fixed_effects,
            random_intercept_groups=grouping_var,
            random_slopes=random_slopes,
            method=method,
            maxiter=max_iterations,
        )

        logger.info(f"LMM fitted: {len(fixed_effects)} fixed effects, grouping={grouping_var}")

        return Response(
            {"success": True, "results": sanitize_for_json(result), "method": "linear_mixed_model"},
            status=status.HTTP_200_OK,
        )

    except ValueError as e:
        return Response(
            {"success": False, "error": str(e), "error_type": "validation_error"}, status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Error fitting LMM: {traceback.format_exc()}")
        return Response({"success": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ── Random Effects ───────────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([AllowAny])
def random_effects_view(request):
    """Extract random effects from a fitted LMM."""
    try:
        data = request.data
        raw_data = data.get("data")
        outcome = data.get("outcome")
        fixed_effects = data.get("fixed_effects", [])
        random_effects = data.get("random_effects", [])
        grouping_var = data.get("grouping_var")

        if raw_data is None or not outcome or not fixed_effects or not grouping_var:
            return Response(
                {"success": False, "error": "data, outcome, fixed_effects, and grouping_var are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        df = pd.DataFrame(raw_data)

        # Fit model first
        random_slopes = None
        if random_effects:
            random_slopes = {re: grouping_var for re in random_effects}

        lmm_result = fit_linear_mixed_model(
            data=df,
            outcome=outcome,
            fixed_effects=fixed_effects,
            random_intercept_groups=grouping_var,
            random_slopes=random_slopes,
        )

        # Extract random effects
        result = extract_random_effects(lmm_result)

        logger.info("Random effects extracted")

        return Response(
            {"success": True, "results": sanitize_for_json(result), "method": "random_effects"},
            status=status.HTTP_200_OK,
        )

    except ValueError as e:
        return Response(
            {"success": False, "error": str(e), "error_type": "validation_error"}, status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Error extracting random effects: {traceback.format_exc()}")
        return Response({"success": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ── Model Comparison ────────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([AllowAny])
def compare_models_view(request):
    """Compare two LMM models."""
    try:
        data = request.data
        raw_data = data.get("data")
        model1_spec = data.get("model1")
        model2_spec = data.get("model2")

        if raw_data is None or not model1_spec or not model2_spec:
            return Response(
                {"success": False, "error": "data, model1, and model2 are required"}, status=status.HTTP_400_BAD_REQUEST
            )

        df = pd.DataFrame(raw_data)

        # Fit model 1
        random_slopes_1 = None
        if model1_spec.get("random_effects"):
            random_slopes_1 = {re: model1_spec["grouping_var"] for re in model1_spec["random_effects"]}

        model1_result = fit_linear_mixed_model(
            data=df,
            outcome=model1_spec["outcome"],
            fixed_effects=model1_spec["fixed_effects"],
            random_intercept_groups=model1_spec["grouping_var"],
            random_slopes=random_slopes_1,
        )

        # Fit model 2
        random_slopes_2 = None
        if model2_spec.get("random_effects"):
            random_slopes_2 = {re: model2_spec["grouping_var"] for re in model2_spec["random_effects"]}

        model2_result = fit_linear_mixed_model(
            data=df,
            outcome=model2_spec["outcome"],
            fixed_effects=model2_spec["fixed_effects"],
            random_intercept_groups=model2_spec["grouping_var"],
            random_slopes=random_slopes_2,
        )

        # Compare
        result = compare_models(
            model1=model1_result,
            model2=model2_result,
            model1_name=model1_spec.get("name", "Model 1"),
            model2_name=model2_spec.get("name", "Model 2"),
        )

        logger.info("Model comparison completed")

        return Response(
            {"success": True, "results": sanitize_for_json(result), "method": "model_comparison"},
            status=status.HTTP_200_OK,
        )

    except ValueError as e:
        return Response(
            {"success": False, "error": str(e), "error_type": "validation_error"}, status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Error comparing models: {traceback.format_exc()}")
        return Response({"success": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ── Diagnostics ─────────────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([AllowAny])
def lmm_diagnostics(request):
    """Run full diagnostics on a fitted LMM."""
    try:
        data = request.data
        raw_data = data.get("data")
        outcome = data.get("outcome")
        fixed_effects = data.get("fixed_effects", [])
        random_effects = data.get("random_effects", [])
        grouping_var = data.get("grouping_var")

        if raw_data is None or not outcome or not fixed_effects or not grouping_var:
            return Response(
                {"success": False, "error": "data, outcome, fixed_effects, and grouping_var are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        df = pd.DataFrame(raw_data)

        # Fit model first
        random_slopes = None
        if random_effects:
            random_slopes = {re: grouping_var for re in random_effects}

        lmm_result = fit_linear_mixed_model(
            data=df,
            outcome=outcome,
            fixed_effects=fixed_effects,
            random_intercept_groups=grouping_var,
            random_slopes=random_slopes,
        )

        # Run diagnostics
        result = full_diagnostics(lmm_result, data=df, grouping_var=grouping_var)

        logger.info("LMM diagnostics completed")

        return Response(
            {"success": True, "results": sanitize_for_json(result), "method": "lmm_diagnostics"},
            status=status.HTTP_200_OK,
        )

    except ValueError as e:
        return Response(
            {"success": False, "error": str(e), "error_type": "validation_error"}, status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Error in LMM diagnostics: {traceback.format_exc()}")
        return Response({"success": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
