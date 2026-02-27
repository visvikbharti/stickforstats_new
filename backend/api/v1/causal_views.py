"""
Causal Inference API Views
===========================
Provides API endpoints for causal inference including DAG analysis,
propensity scores, matching, treatment effects, mediation, and
difference-in-differences.

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

from core.services.causal import (
    create_dag_from_edges,
    find_adjustment_sets,
    estimate_propensity_scores,
    propensity_score_matching,
    estimate_ate,
    estimate_att,
    doubly_robust_estimator,
    baron_kenny_mediation,
    causal_mediation_analysis,
    mediation_sensitivity_analysis,
    multiple_mediator_analysis,
    difference_in_differences,
    event_study,
    test_parallel_trends_simple,
    staggered_did,
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


# ── DAG Analysis ────────────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([AllowAny])
def dag_create(request):
    """Create a DAG from edges."""
    try:
        data = request.data
        edges = data.get("edges", [])
        treatment = data.get("treatment")
        outcome = data.get("outcome")

        if not edges:
            return Response(
                {"success": False, "error": "edges parameter is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        dag = create_dag_from_edges(edges=[(e[0], e[1]) for e in edges], exposure=treatment, outcome=outcome)

        result = dag.to_dict()
        logger.info(f"DAG created with {len(edges)} edges")

        return Response(
            {"success": True, "results": sanitize_for_json(result), "method": "dag_create"}, status=status.HTTP_200_OK
        )

    except Exception as e:
        logger.error(f"Error creating DAG: {traceback.format_exc()}")
        return Response({"success": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([AllowAny])
def dag_analyze(request):
    """Analyze a DAG: identify confounders, mediators, adjustment sets."""
    try:
        data = request.data
        edges = data.get("edges", [])
        treatment = data.get("treatment")
        outcome = data.get("outcome")

        if not edges or not treatment or not outcome:
            return Response(
                {"success": False, "error": "edges, treatment, and outcome are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        dag = create_dag_from_edges(edges=[(e[0], e[1]) for e in edges], exposure=treatment, outcome=outcome)

        # Get adjustment sets
        adj_result = find_adjustment_sets(dag, treatment, outcome)

        # Get confounders and mediators
        confounders = dag.identify_confounders(exposure=treatment, outcome=outcome)
        mediators = dag.identify_mediators(exposure=treatment, outcome=outcome)
        instruments = dag.identify_instruments(exposure=treatment, outcome=outcome)
        backdoor_paths = dag.backdoor_paths(treatment, outcome)

        result = {
            "dag": dag.to_dict(),
            "adjustment_sets": sanitize_for_json(adj_result),
            "confounders": list(confounders),
            "mediators": list(mediators),
            "instruments": list(instruments),
            "backdoor_paths": backdoor_paths,
            "is_identifiable": len(adj_result.adjustment_sets) > 0 if hasattr(adj_result, "adjustment_sets") else False,
        }

        logger.info(f"DAG analysis completed: {len(confounders)} confounders found")

        return Response(
            {"success": True, "results": sanitize_for_json(result), "method": "dag_analyze"}, status=status.HTTP_200_OK
        )

    except Exception as e:
        logger.error(f"Error in DAG analysis: {traceback.format_exc()}")
        return Response({"success": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([AllowAny])
def adjustment_sets(request):
    """Find adjustment sets for a DAG."""
    try:
        data = request.data
        edges = data.get("edges", [])
        treatment = data.get("treatment")
        outcome = data.get("outcome")

        if not edges or not treatment or not outcome:
            return Response(
                {"success": False, "error": "edges, treatment, and outcome are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        dag = create_dag_from_edges(edges=[(e[0], e[1]) for e in edges], exposure=treatment, outcome=outcome)

        result = find_adjustment_sets(dag, treatment, outcome)
        logger.info("Adjustment sets computed")

        return Response(
            {"success": True, "results": sanitize_for_json(result), "method": "adjustment_sets"},
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.error(f"Error finding adjustment sets: {traceback.format_exc()}")
        return Response({"success": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ── Propensity Scores ───────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([AllowAny])
def propensity_scores(request):
    """Estimate propensity scores."""
    try:
        data = request.data
        raw_data = data.get("data")
        treatment = data.get("treatment")
        covariates = data.get("covariates", [])
        method = data.get("method", "logistic")

        if raw_data is None or not treatment or not covariates:
            return Response(
                {"success": False, "error": "data, treatment, and covariates are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        df = pd.DataFrame(raw_data)
        result = estimate_propensity_scores(data=df, treatment=treatment, covariates=covariates, method=method)

        logger.info(f"Propensity scores estimated for {len(df)} observations")

        return Response(
            {"success": True, "results": sanitize_for_json(result), "method": "propensity_scores"},
            status=status.HTTP_200_OK,
        )

    except ValueError as e:
        return Response(
            {"success": False, "error": str(e), "error_type": "validation_error"}, status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Error estimating propensity scores: {traceback.format_exc()}")
        return Response({"success": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ── Matching ────────────────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([AllowAny])
def matching(request):
    """Perform propensity score matching."""
    try:
        data = request.data
        raw_data = data.get("data")
        treatment = data.get("treatment")
        covariates = data.get("covariates", [])
        method = data.get("method", "nearest")
        caliper = data.get("caliper")
        ratio = data.get("ratio", 1)
        replacement = data.get("replacement", False)

        if raw_data is None or not treatment or not covariates:
            return Response(
                {"success": False, "error": "data, treatment, and covariates are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        df = pd.DataFrame(raw_data)

        # First estimate propensity scores
        ps_result = estimate_propensity_scores(data=df, treatment=treatment, covariates=covariates)

        # Then perform matching
        result = propensity_score_matching(
            data=df,
            treatment=treatment,
            propensity_scores=ps_result.scores,
            method=method,
            ratio=ratio,
            caliper=caliper,
            replacement=replacement,
            covariates=covariates,
        )

        logger.info(f"Matching completed for {len(df)} observations")

        return Response(
            {"success": True, "results": sanitize_for_json(result), "method": "propensity_score_matching"},
            status=status.HTTP_200_OK,
        )

    except ValueError as e:
        return Response(
            {"success": False, "error": str(e), "error_type": "validation_error"}, status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Error in matching: {traceback.format_exc()}")
        return Response({"success": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ── Treatment Effects ───────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([AllowAny])
def treatment_effects(request):
    """Estimate treatment effects (ATE/ATT)."""
    try:
        data = request.data
        raw_data = data.get("data")
        treatment = data.get("treatment")
        outcome = data.get("outcome")
        covariates = data.get("covariates", [])
        method = data.get("method", "doubly_robust")

        if raw_data is None or not treatment or not outcome:
            return Response(
                {"success": False, "error": "data, treatment, and outcome are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        df = pd.DataFrame(raw_data)

        if method == "doubly_robust" and covariates:
            result = doubly_robust_estimator(data=df, treatment=treatment, outcome=outcome, covariates=covariates)
        else:
            ate_result = estimate_ate(
                data=df,
                treatment=treatment,
                outcome=outcome,
                covariates=covariates if covariates else None,
                method="regression",
            )
            att_result = estimate_att(
                data=df,
                treatment=treatment,
                outcome=outcome,
                covariates=covariates if covariates else None,
                method="regression",
            )
            result = {"ate": sanitize_for_json(ate_result), "att": sanitize_for_json(att_result)}

        logger.info(f"Treatment effects estimated for {len(df)} observations")

        return Response(
            {"success": True, "results": sanitize_for_json(result), "method": method}, status=status.HTTP_200_OK
        )

    except ValueError as e:
        return Response(
            {"success": False, "error": str(e), "error_type": "validation_error"}, status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Error estimating treatment effects: {traceback.format_exc()}")
        return Response({"success": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ── Sensitivity Analysis ────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([AllowAny])
def sensitivity_analysis_view(request):
    """Sensitivity analysis for treatment effects."""
    try:
        from core.services.causal.effects import sensitivity_analysis as run_sensitivity

        data = request.data
        raw_data = data.get("data")
        treatment = data.get("treatment")
        outcome = data.get("outcome")
        covariates = data.get("covariates", [])
        gamma_values = data.get("gamma_values")

        if raw_data is None or not treatment or not outcome:
            return Response(
                {"success": False, "error": "data, treatment, and outcome are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        df = pd.DataFrame(raw_data)

        kwargs = {
            "data": df,
            "treatment": treatment,
            "outcome": outcome,
            "covariates": covariates,
        }
        if gamma_values:
            kwargs["gamma_range"] = (min(gamma_values), max(gamma_values))

        result = run_sensitivity(**kwargs)

        logger.info("Sensitivity analysis completed")

        return Response(
            {"success": True, "results": sanitize_for_json(result), "method": "sensitivity_analysis"},
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.error(f"Error in sensitivity analysis: {traceback.format_exc()}")
        return Response({"success": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ── Mediation Analysis ──────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([AllowAny])
def mediation_baron_kenny(request):
    """Baron-Kenny mediation analysis."""
    try:
        data = request.data
        raw_data = data.get("data")
        treatment = data.get("treatment")
        mediator = data.get("mediator")
        outcome = data.get("outcome")
        covariates = data.get("covariates")
        n_bootstrap = data.get("n_bootstrap", 5000)

        if raw_data is None or not treatment or not mediator or not outcome:
            return Response(
                {"success": False, "error": "data, treatment, mediator, and outcome are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        df = pd.DataFrame(raw_data)
        result = baron_kenny_mediation(
            data=df,
            treatment=treatment,
            mediator=mediator,
            outcome=outcome,
            covariates=covariates,
            n_bootstrap=n_bootstrap,
        )

        logger.info("Baron-Kenny mediation analysis completed")

        return Response(
            {"success": True, "results": sanitize_for_json(result), "method": "baron_kenny_mediation"},
            status=status.HTTP_200_OK,
        )

    except ValueError as e:
        return Response(
            {"success": False, "error": str(e), "error_type": "validation_error"}, status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Error in Baron-Kenny mediation: {traceback.format_exc()}")
        return Response({"success": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([AllowAny])
def mediation_causal(request):
    """Causal mediation analysis."""
    try:
        data = request.data
        raw_data = data.get("data")
        treatment = data.get("treatment")
        mediator = data.get("mediator")
        outcome = data.get("outcome")
        covariates = data.get("covariates")
        n_simulations = data.get("n_simulations", 1000)

        if raw_data is None or not treatment or not mediator or not outcome:
            return Response(
                {"success": False, "error": "data, treatment, mediator, and outcome are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        df = pd.DataFrame(raw_data)
        result = causal_mediation_analysis(
            data=df,
            treatment=treatment,
            mediator=mediator,
            outcome=outcome,
            covariates=covariates,
            n_simulations=n_simulations,
        )

        logger.info("Causal mediation analysis completed")

        return Response(
            {"success": True, "results": sanitize_for_json(result), "method": "causal_mediation"},
            status=status.HTTP_200_OK,
        )

    except ValueError as e:
        return Response(
            {"success": False, "error": str(e), "error_type": "validation_error"}, status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Error in causal mediation: {traceback.format_exc()}")
        return Response({"success": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([AllowAny])
def mediation_sensitivity(request):
    """Mediation sensitivity analysis."""
    try:
        data = request.data
        raw_data = data.get("data")
        treatment = data.get("treatment")
        mediator = data.get("mediator")
        outcome = data.get("outcome")
        rho_values = data.get("rho_values")

        if raw_data is None or not treatment or not mediator or not outcome:
            return Response(
                {"success": False, "error": "data, treatment, mediator, and outcome are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        df = pd.DataFrame(raw_data)
        kwargs = {
            "data": df,
            "treatment": treatment,
            "mediator": mediator,
            "outcome": outcome,
        }
        if rho_values:
            kwargs["rho_range"] = (min(rho_values), max(rho_values))

        result = mediation_sensitivity_analysis(**kwargs)

        logger.info("Mediation sensitivity analysis completed")

        return Response(
            {"success": True, "results": sanitize_for_json(result), "method": "mediation_sensitivity"},
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.error(f"Error in mediation sensitivity: {traceback.format_exc()}")
        return Response({"success": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([AllowAny])
def mediation_multiple(request):
    """Multiple mediator analysis."""
    try:
        data = request.data
        raw_data = data.get("data")
        treatment = data.get("treatment")
        mediators = data.get("mediators", [])
        outcome = data.get("outcome")
        covariates = data.get("covariates")

        if raw_data is None or not treatment or not mediators or not outcome:
            return Response(
                {"success": False, "error": "data, treatment, mediators, and outcome are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        df = pd.DataFrame(raw_data)
        result = multiple_mediator_analysis(
            data=df, treatment=treatment, mediators=mediators, outcome=outcome, covariates=covariates
        )

        logger.info(f"Multiple mediator analysis completed with {len(mediators)} mediators")

        return Response(
            {"success": True, "results": sanitize_for_json(result), "method": "multiple_mediator"},
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.error(f"Error in multiple mediator analysis: {traceback.format_exc()}")
        return Response({"success": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ── Difference-in-Differences ───────────────────────────────────────────


@api_view(["POST"])
@permission_classes([AllowAny])
def did_analysis(request):
    """Difference-in-differences analysis."""
    try:
        data = request.data
        raw_data = data.get("data")
        outcome = data.get("outcome")
        treatment = data.get("treatment")
        post = data.get("post")
        covariates = data.get("covariates")

        if raw_data is None or not outcome or not treatment or not post:
            return Response(
                {"success": False, "error": "data, outcome, treatment, and post are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        df = pd.DataFrame(raw_data)
        result = difference_in_differences(
            data=df, outcome=outcome, treatment_group=treatment, post_period=post, covariates=covariates
        )

        logger.info(f"DiD analysis completed for {len(df)} observations")

        return Response(
            {"success": True, "results": sanitize_for_json(result), "method": "difference_in_differences"},
            status=status.HTTP_200_OK,
        )

    except ValueError as e:
        return Response(
            {"success": False, "error": str(e), "error_type": "validation_error"}, status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Error in DiD analysis: {traceback.format_exc()}")
        return Response({"success": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([AllowAny])
def did_event_study(request):
    """Event study design for DiD."""
    try:
        data = request.data
        raw_data = data.get("data")
        outcome = data.get("outcome")
        unit = data.get("unit")
        time = data.get("time")
        event_time = data.get("event_time")
        covariates = data.get("covariates")

        if raw_data is None or not outcome or not unit or not time or not event_time:
            return Response(
                {"success": False, "error": "data, outcome, unit, time, and event_time are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        df = pd.DataFrame(raw_data)
        result = event_study(
            data=df,
            outcome=outcome,
            treatment_group=unit,
            time_var=time,
            treatment_time=event_time,
            covariates=covariates,
        )

        logger.info("Event study analysis completed")

        return Response(
            {"success": True, "results": sanitize_for_json(result), "method": "event_study"}, status=status.HTTP_200_OK
        )

    except Exception as e:
        logger.error(f"Error in event study: {traceback.format_exc()}")
        return Response({"success": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([AllowAny])
def did_parallel_trends(request):
    """Test parallel trends assumption."""
    try:
        data = request.data
        raw_data = data.get("data")
        outcome = data.get("outcome")
        treatment = data.get("treatment")
        time = data.get("time")
        treatment_time = data.get("treatment_time")

        if raw_data is None or not outcome or not treatment:
            return Response(
                {"success": False, "error": "data, outcome, and treatment are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        df = pd.DataFrame(raw_data)
        result = test_parallel_trends_simple(
            data=df, outcome=outcome, treatment_group=treatment, post_period=treatment_time or time, time_var=time
        )

        logger.info("Parallel trends test completed")

        return Response(
            {"success": True, "results": sanitize_for_json(result), "method": "parallel_trends_test"},
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.error(f"Error in parallel trends test: {traceback.format_exc()}")
        return Response({"success": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([AllowAny])
def did_staggered(request):
    """Staggered DiD analysis."""
    try:
        data = request.data
        raw_data = data.get("data")
        outcome = data.get("outcome")
        unit = data.get("unit")
        time = data.get("time")
        treatment_time = data.get("treatment_time")
        covariates = data.get("covariates")

        if raw_data is None or not outcome or not unit or not time or not treatment_time:
            return Response(
                {"success": False, "error": "data, outcome, unit, time, and treatment_time are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        df = pd.DataFrame(raw_data)
        result = staggered_did(
            data=df,
            outcome=outcome,
            unit_var=unit,
            time_var=time,
            treatment_time_var=treatment_time,
            covariates=covariates,
        )

        logger.info("Staggered DiD analysis completed")

        return Response(
            {"success": True, "results": sanitize_for_json(result), "method": "staggered_did"},
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.error(f"Error in staggered DiD: {traceback.format_exc()}")
        return Response({"success": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
