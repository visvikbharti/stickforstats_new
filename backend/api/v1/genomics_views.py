"""
Genomics Analysis API Views
=============================

Provides API endpoints for genomics workflows including differential
expression analysis with Guardian assumption validation and BH-FDR correction.

Endpoints:
    POST /api/v1/genomics/differential-expression/
    POST /api/v1/genomics/volcano-plot/

Author: StickForStats Development Team
Date: April 2026
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
import numpy as np
import logging

from core.services.genomics.differential_expression import (
    DifferentialExpressionService,
)

logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([AllowAny])
def differential_expression(request):
    """
    Perform differential expression analysis with Guardian validation.

    Request body:
    {
        "expression_matrix": [[...], [...]],  // genes x samples
        "gene_names": ["GENE_001", ...],
        "sample_groups": ["control", "treatment", ...],
        "group1_name": "control",       // optional, default "control"
        "group2_name": "treatment",     // optional, default "treatment"
        "alpha": 0.05,                  // optional, FDR threshold
        "input_scale": "linear",        // optional, "linear" (counts/CPM/TPM) or "log2"
                                        //   (matrix already log2-transformed). Decides how
                                        //   the fold change is computed; echoed back under
                                        //   "summary" so the assumption is never silent.
        "csv_data": "gene,s1,s2,...\\n..."  // alternative: raw CSV string
    }

    Returns:
    {
        "summary": {
            "n_genes": 100,
            "n_significant": 15,
            "n_cascaded": 23,
            ...
        },
        "gene_results": [...],
        "volcano_data": [...],
        "guardian_summary": {...}
    }
    """
    try:
        data = request.data
        alpha = float(data.get("alpha", 0.05))
        log2fc_threshold_raw = data.get("log2fc_threshold")
        log2fc_threshold = float(log2fc_threshold_raw) if log2fc_threshold_raw is not None else None
        group1_name = data.get("group1_name", "control")
        group2_name = data.get("group2_name", "treatment")

        # The scale the caller's matrix is already on. The service has no default for this
        # because the fold change is a RATIO on a linear scale and a DIFFERENCE on a log2
        # scale, and getting it wrong returns a plausible number that is not a fold change.
        # The HTTP API keeps "linear" as its default so existing clients uploading counts are
        # unaffected -- but it validates the value and echoes it back in the response, so the
        # assumption is visible to whoever reads the result.
        input_scale = data.get("input_scale", "linear")
        if input_scale not in DifferentialExpressionService.VALID_INPUT_SCALES:
            return Response(
                {
                    "error": f"input_scale must be one of "
                    f"{list(DifferentialExpressionService.VALID_INPUT_SCALES)}, "
                    f"got {input_scale!r}."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # log2fc_threshold used to be parsed, echoed back under "thresholds", drawn on the
        # volcano plot as two vertical lines -- and never passed to the service. Significance
        # was decided on the adjusted p-value alone, so genes the user had explicitly excluded
        # by fold change were still coloured and counted as significant.
        service = DifferentialExpressionService(
            input_scale=input_scale, alpha=alpha, log2fc_threshold=log2fc_threshold
        )

        # Parse input: either matrix + metadata or CSV
        if "csv_data" in data:
            matrix, gene_names, sample_names = service.parse_expression_matrix(
                data["csv_data"]
            )
            sample_groups = data.get("sample_groups", [])
            if not sample_groups:
                return Response(
                    {"error": "sample_groups required when using csv_data"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif "expression_matrix" in data:
            matrix = np.array(data["expression_matrix"], dtype=float)
            gene_names = data.get("gene_names", [f"Gene_{i+1}" for i in range(len(matrix))])
            sample_groups = data["sample_groups"]
        else:
            return Response(
                {"error": "Provide either 'expression_matrix' or 'csv_data'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(sample_groups) != matrix.shape[1]:
            return Response(
                {
                    "error": f"sample_groups length ({len(sample_groups)}) must match "
                    f"number of samples ({matrix.shape[1]})"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = service.analyze(
            expression_matrix=matrix,
            gene_names=gene_names,
            group_labels=sample_groups,
            group1_name=group1_name,
            group2_name=group2_name,
        )

        return Response(result.to_dict(), status=status.HTTP_200_OK)

    except ValueError as e:
        logger.warning(f"Validation error in differential expression: {e}")
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error in differential expression: {e}", exc_info=True)
        return Response(
            {"error": f"Analysis failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def volcano_plot_data(request):
    """
    Generate volcano plot data from differential expression results.

    Accepts the same input as differential_expression but returns
    only the volcano plot data (lighter response).

    Returns:
    {
        "volcano_data": [
            {"gene": "GENE_001", "log2fc": 1.5, "neg_log10_padj": 3.2, "significant": true},
            ...
        ],
        "thresholds": {
            "log2fc_threshold": 1.0,
            "padj_threshold": 0.05
        }
    }
    """
    try:
        data = request.data
        alpha = float(data.get("alpha", 0.05))
        log2fc_threshold = float(data.get("log2fc_threshold", 1.0))

        # Same contract as /differential-expression/: the caller declares the scale its
        # matrix is on, because the x-axis of a volcano plot IS the fold change and it is a
        # ratio on a linear scale and a difference on a log2 one.
        input_scale = data.get("input_scale", "linear")
        if input_scale not in DifferentialExpressionService.VALID_INPUT_SCALES:
            return Response(
                {
                    "error": f"input_scale must be one of "
                    f"{list(DifferentialExpressionService.VALID_INPUT_SCALES)}, "
                    f"got {input_scale!r}."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        service = DifferentialExpressionService(input_scale=input_scale, alpha=alpha)

        if "csv_data" in data:
            matrix, gene_names, _ = service.parse_expression_matrix(data["csv_data"])
            sample_groups = data["sample_groups"]
        elif "expression_matrix" in data:
            matrix = np.array(data["expression_matrix"], dtype=float)
            gene_names = data.get("gene_names", [f"Gene_{i+1}" for i in range(len(matrix))])
            sample_groups = data["sample_groups"]
        else:
            return Response(
                {"error": "Provide either 'expression_matrix' or 'csv_data'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = service.analyze(
            expression_matrix=matrix,
            gene_names=gene_names,
            group_labels=sample_groups,
            group1_name=data.get("group1_name", "control"),
            group2_name=data.get("group2_name", "treatment"),
        )

        return Response(
            {
                "volcano_data": result.volcano_data,
                "thresholds": {
                    "log2fc_threshold": log2fc_threshold,
                    "padj_threshold": alpha,
                },
                "summary": {
                    "n_genes": result.n_genes,
                    "n_significant": result.n_significant,
                    "n_cascaded": result.n_cascaded,
                },
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.error(f"Error generating volcano plot data: {e}", exc_info=True)
        return Response(
            {"error": f"Analysis failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
