"""
API Views for StickForStats Core
Handles HTTP requests and responses for frontend-backend communication
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.core.cache import cache
import logging
import pandas as pd
import numpy as np
import uuid
import io
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

# Import our core modules
from .test_recommender import TestRecommendationEngine as TestRecommender
from .assumption_checker import AssumptionChecker
from .multiplicity import MultiplicityCorrector
from .power_analysis import PowerAnalyzer
from .effect_sizes import EffectSizeCalculator

# Guardian integration for Design Contract compliance
# "No statistical result may exist without an explicit, traceable assumption context."
from .guardian import GuardianServiceWrapper, resolve_test_type

# Import serializers
from .serializers import (
    DataUploadSerializer,
    DataSummarySerializer,
    AssumptionCheckRequestSerializer,
    TestRecommendationRequestSerializer,
    TestExecutionRequestSerializer,
    MultiplicityCorrectionRequestSerializer,
    PowerCalculationRequestSerializer,
)


class DataUploadView(APIView):
    """Handle data file uploads and return summary"""

    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        serializer = DataUploadSerializer(data=request.data)

        if not serializer.is_valid():
            return Response({"error": "Invalid data", "details": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Get the uploaded file
            uploaded_file = serializer.validated_data["file"]
            file_type = serializer.validated_data.get("file_type", "csv")

            # Read the file into a pandas DataFrame
            if file_type == "csv":
                delimiter = serializer.validated_data.get("delimiter", ",")
                has_header = serializer.validated_data.get("has_header", True)
                df = pd.read_csv(
                    io.BytesIO(uploaded_file.read()), delimiter=delimiter, header=0 if has_header else None
                )
            elif file_type in ["excel", "xlsx", "xls"]:
                df = pd.read_excel(io.BytesIO(uploaded_file.read()))
            else:
                return Response({"error": f"Unsupported file type: {file_type}"}, status=status.HTTP_400_BAD_REQUEST)

            # Generate unique data ID
            data_id = str(uuid.uuid4())

            # Store DataFrame in cache (for demo purposes)
            # In production, use proper storage (database, Redis, etc.)
            cache.set(f"data_{data_id}", df.to_json(), timeout=3600)  # 1 hour timeout

            # Prepare variable information
            variables = []
            for col in df.columns:
                var_info = {
                    "name": str(col),
                    "dtype": str(df[col].dtype),
                    "missing_count": int(df[col].isna().sum()),
                    "unique_count": int(df[col].nunique()),
                    "sample_values": df[col].dropna().head(5).tolist(),
                }

                # Determine variable type
                if pd.api.types.is_numeric_dtype(df[col]):
                    if df[col].nunique() == 2:
                        var_info["type"] = "binary"
                    elif df[col].nunique() < 10:
                        var_info["type"] = "ordinal"
                    else:
                        var_info["type"] = "continuous"
                else:
                    var_info["type"] = "nominal"

                variables.append(var_info)

            # Prepare summary
            summary_data = {
                "data_id": data_id,
                "n_rows": len(df),
                "n_cols": len(df.columns),
                "variables": variables,
                "missing_summary": {
                    "total_missing": int(df.isna().sum().sum()),
                    "complete_rows": int(df.dropna().shape[0]),
                    "complete_cols": int(df.dropna(axis=1).shape[1]),
                },
                "data_types": {
                    "numeric": sum(pd.api.types.is_numeric_dtype(df[col]) for col in df.columns),
                    "categorical": sum(pd.api.types.is_object_dtype(df[col]) for col in df.columns),
                },
                "preview": df.head(5).to_dict("records"),
            }

            response_serializer = DataSummarySerializer(data=summary_data)
            if response_serializer.is_valid():
                return Response(response_serializer.data, status=status.HTTP_200_OK)
            else:
                return Response(
                    {"error": "Failed to serialize response", "details": response_serializer.errors},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        except Exception as e:
            return Response(
                {"error": f"Failed to process file: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AssumptionCheckView(APIView):
    """Check statistical assumptions for the data"""

    parser_classes = (JSONParser,)

    def post(self, request):
        serializer = AssumptionCheckRequestSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {"error": "Invalid request", "details": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Retrieve data from cache
            data_id = serializer.validated_data["data_id"]
            df_json = cache.get(f"data_{data_id}")

            if not df_json:
                return Response(
                    {"error": "Data not found. Please upload data first."}, status=status.HTTP_404_NOT_FOUND
                )

            df = pd.read_json(df_json)

            # Get test parameters
            test_type = serializer.validated_data.get("test_type", "normality")
            variables = serializer.validated_data.get("variables", df.columns.tolist())
            alpha = serializer.validated_data.get("alpha", 0.05)

            # Initialize assumption checker
            checker = AssumptionChecker(df)

            # Run appropriate tests
            results = []

            if test_type == "normality":
                for var in variables:
                    if pd.api.types.is_numeric_dtype(df[var]):
                        result = checker.check_normality(var, alpha=alpha)
                        results.append(result)

            elif test_type == "homogeneity":
                if len(variables) >= 2:
                    result = checker.check_homogeneity_of_variance(
                        variables[0], variables[1] if len(variables) > 1 else None, alpha=alpha
                    )
                    results.append(result)

            elif test_type == "independence":
                result = checker.check_independence(variables[0] if variables else None)
                results.append(result)

            elif test_type == "outliers":
                for var in variables:
                    if pd.api.types.is_numeric_dtype(df[var]):
                        result = checker.detect_outliers(var)
                        results.append(result)

            # Format results
            formatted_results = []
            for result in results:
                formatted_result = {
                    "test_name": result.get("test", test_type),
                    "statistic": float(result.get("statistic", 0)),
                    "p_value": float(result.get("p_value", 1)),
                    "passed": result.get("passed", False),
                    "interpretation": result.get("interpretation", ""),
                    "recommendations": result.get("recommendations", []),
                }
                formatted_results.append(formatted_result)

            return Response(formatted_results, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Assumption check failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TestRecommendationView(APIView):
    """Recommend appropriate statistical tests based on data"""

    parser_classes = (JSONParser,)

    def post(self, request):
        serializer = TestRecommendationRequestSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {"error": "Invalid request", "details": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Retrieve data from cache
            data_id = serializer.validated_data["data_id"]
            df_json = cache.get(f"data_{data_id}")

            if not df_json:
                return Response(
                    {"error": "Data not found. Please upload data first."}, status=status.HTTP_404_NOT_FOUND
                )

            df = pd.read_json(df_json)

            # Get recommendation parameters
            dependent_var = serializer.validated_data["dependent_var"]
            independent_vars = serializer.validated_data["independent_vars"]
            hypothesis_type = serializer.validated_data.get("hypothesis_type", "difference")
            is_paired = serializer.validated_data.get("is_paired", False)
            alpha = serializer.validated_data.get("alpha", 0.05)

            # Initialize test recommender
            recommender = TestRecommender(df)

            # Get recommendations
            recommendations = recommender.recommend_test(
                dependent_var=dependent_var,
                independent_vars=independent_vars,
                hypothesis_type=hypothesis_type,
                is_paired=is_paired,
                alpha=alpha,
            )

            # Format recommendations
            formatted_recommendations = []
            for rec in recommendations:
                formatted_rec = {
                    "test_name": rec["test_name"],
                    "test_type": rec["test_type"],
                    "suitability_score": float(rec.get("score", 0.5)),
                    "reasons": rec.get("reasons", []),
                    "assumptions_met": rec.get("assumptions_met", []),
                    "assumptions_violated": rec.get("assumptions_violated", []),
                    "power_estimate": float(rec.get("power", 0.8)),
                    "sample_size_adequate": rec.get("sample_size_adequate", True),
                    "alternatives": rec.get("alternatives", []),
                }
                formatted_recommendations.append(formatted_rec)

            return Response(formatted_recommendations, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Test recommendation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TestExecutionView(APIView):
    """
    Execute a specific statistical test with Guardian protection.

    DESIGN CONTRACT COMPLIANCE:
    - All statistical results include Guardian assumption context
    - Guardian check runs BEFORE statistical computation
    - Response always includes: guardian_report, assumptions_checked,
      violations, confidence_score, alternative_tests
    - Supports expert_mode to proceed despite critical violations

    "No statistical result may exist without an explicit, traceable assumption context."
    """

    parser_classes = (JSONParser,)

    def post(self, request):
        serializer = TestExecutionRequestSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {"error": "Invalid request", "details": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Retrieve data from cache
            data_id = serializer.validated_data["data_id"]
            df_json = cache.get(f"data_{data_id}")

            if not df_json:
                return Response(
                    {"error": "Data not found. Please upload data first."}, status=status.HTTP_404_NOT_FOUND
                )

            df = pd.read_json(df_json)

            # Get test parameters
            test_type = serializer.validated_data["test_type"]
            dependent_var = serializer.validated_data["dependent_var"]
            independent_vars = serializer.validated_data.get("independent_vars", [])
            parameters = serializer.validated_data.get("parameters", {})
            options = serializer.validated_data.get("options", {})

            # Guardian integration parameters
            expert_mode = options.get("expert_mode", False)
            alpha = parameters.get("alpha", 0.05)

            # Initialize Guardian wrapper for assumption checking
            guardian_wrapper = GuardianServiceWrapper()

            # Prepare data for Guardian based on test type
            guardian_data = self._prepare_guardian_data(df, test_type, dependent_var, independent_vars)

            # Resolve test type to Guardian's registry key
            guardian_test_type = resolve_test_type(test_type)

            # Define the computation function
            def compute_test(data):
                recommender = TestRecommender(df)
                result = recommender.run_test(
                    test_type=test_type, dependent_var=dependent_var, independent_vars=independent_vars, **parameters
                )

                # Calculate effect size if not included
                if "effect_size" not in result:
                    effect_calc = EffectSizeCalculator()
                    effect_size = effect_calc.calculate(
                        data=df, dependent_var=dependent_var, independent_vars=independent_vars, test_type=test_type
                    )
                    result["effect_size"] = effect_size

                return result

            # Execute with Guardian protection (DESIGN CONTRACT REQUIREMENT)
            enriched_result = guardian_wrapper.execute_with_guardian(
                test_type=guardian_test_type,
                data=guardian_data,
                compute_function=compute_test,
                alpha=alpha,
                expert_mode=expert_mode,
            )

            # Format the complete response with Guardian context
            if enriched_result.can_proceed or expert_mode:
                # Test was executed - include full results
                stat_results = enriched_result.statistical_results
                formatted_result = {
                    # Statistical results
                    "test_name": stat_results.get("test_name", test_type),
                    "statistic": float(stat_results.get("statistic", 0)),
                    "p_value": float(stat_results.get("p_value", 1)),
                    "degrees_of_freedom": float(stat_results.get("df", 0)) if "df" in stat_results else None,
                    "effect_size": stat_results.get("effect_size", {}),
                    "confidence_interval": stat_results.get("confidence_interval", []),
                    "summary_statistics": stat_results.get("summary_stats", {}),
                    "interpretation": stat_results.get("interpretation", ""),
                    "apa_format": stat_results.get("apa_format", ""),
                    "post_hoc": stat_results.get("post_hoc", None),
                    "visualizations": [],
                    # GUARDIAN CONTEXT (DESIGN CONTRACT REQUIREMENT)
                    "guardian_report": enriched_result.guardian_report,
                    "assumptions_checked": enriched_result.assumptions_checked,
                    "violations": enriched_result.violations,
                    "confidence_score": enriched_result.confidence_score,
                    "can_proceed": enriched_result.can_proceed,
                    "alternative_tests": enriched_result.alternative_tests,
                    "expert_mode_override": enriched_result.expert_mode_override,
                    # Contract compliance flags
                    "_guardian_context": True,
                    "_contract_compliant": True,
                }
            else:
                # Test blocked due to critical violations - return Guardian report only
                formatted_result = {
                    "blocked": True,
                    "reason": "Critical assumption violations detected",
                    "message": "Enable expert_mode in options to proceed despite violations",
                    # GUARDIAN CONTEXT (always included even when blocked)
                    "guardian_report": enriched_result.guardian_report,
                    "assumptions_checked": enriched_result.assumptions_checked,
                    "violations": enriched_result.violations,
                    "confidence_score": enriched_result.confidence_score,
                    "can_proceed": False,
                    "alternative_tests": enriched_result.alternative_tests,
                    "expert_mode_override": False,
                    # Contract compliance flags
                    "_guardian_context": True,
                    "_contract_compliant": True,
                }

            return Response(formatted_result, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Test execution failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _prepare_guardian_data(
        self, df: pd.DataFrame, test_type: str, dependent_var: str, independent_vars: List[str]
    ) -> Any:
        """
        Prepare data arrays for Guardian validation.

        Guardian expects data as list of numpy arrays for most tests.
        This method extracts relevant data based on test type.
        """
        test_type_lower = test_type.lower()

        # Two-group comparisons (t-tests, Mann-Whitney)
        if any(t in test_type_lower for t in ["t_test", "ttest", "mann_whitney", "welch"]):
            if independent_vars and len(independent_vars) > 0:
                group_var = independent_vars[0]
                unique_groups = df[group_var].unique()
                if len(unique_groups) >= 2:
                    return [
                        df[df[group_var] == unique_groups[0]][dependent_var].dropna().values,
                        df[df[group_var] == unique_groups[1]][dependent_var].dropna().values,
                    ]

        # Paired comparisons
        elif "paired" in test_type_lower or "wilcoxon" in test_type_lower:
            if independent_vars and len(independent_vars) > 0:
                return [df[dependent_var].dropna().values, df[independent_vars[0]].dropna().values]

        # ANOVA / Kruskal-Wallis (multiple groups)
        elif any(t in test_type_lower for t in ["anova", "kruskal"]):
            if independent_vars and len(independent_vars) > 0:
                group_var = independent_vars[0]
                return [
                    df[df[group_var] == g][dependent_var].dropna().values
                    for g in df[group_var].unique()
                    if len(df[df[group_var] == g][dependent_var].dropna()) > 0
                ]

        # Correlation
        elif any(t in test_type_lower for t in ["correlation", "pearson", "spearman"]):
            if independent_vars and len(independent_vars) > 0:
                mask = ~(df[dependent_var].isna() | df[independent_vars[0]].isna())
                return [df.loc[mask, dependent_var].values, df.loc[mask, independent_vars[0]].values]

        # Chi-square
        elif "chi" in test_type_lower:
            if independent_vars and len(independent_vars) > 0:
                return {"var1": df[dependent_var].values, "var2": df[independent_vars[0]].values}

        # Default: return dependent variable as single array
        return [df[dependent_var].dropna().values]


class MultiplicityCorrectionView(APIView):
    """Apply multiplicity correction to p-values"""

    # Every statistics endpoint under api/v1/ is explicitly AllowAny; this module sets no
    # permission_classes at all and so inherits the project default of IsAuthenticated, which
    # 401s the (unauthenticated) multiplicity panel. This view is a pure function over
    # p-values the user typed in: no data access, no side effects, no stored state -- the same
    # risk profile as /api/v1/stats/ttest/, which is already AllowAny. Scoped to this view
    # deliberately; the rest of this module keeps the authenticated default.
    permission_classes = [AllowAny]
    parser_classes = (JSONParser,)

    def post(self, request):
        serializer = MultiplicityCorrectionRequestSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {"error": "Invalid request", "details": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Get correction parameters
            p_values = serializer.validated_data["p_values"]
            method = serializer.validated_data["method"]
            alpha = serializer.validated_data.get("alpha", 0.05)
            hypothesis_names = serializer.validated_data.get("hypothesis_names", None)

            # Initialize corrector
            corrector = MultiplicityCorrector()

            # Apply correction
            result = corrector.correct(p_values=p_values, method=method, alpha=alpha)

            # `correct()` returns a CorrectionResult DATACLASS. This used to call
            # result.get("adjusted_p_values", p_values) on it -- a dataclass has no .get(),
            # so every single request raised AttributeError and came back as a 500. The
            # endpoint had never once worked, which is presumably why the frontend grew its
            # own JavaScript reimplementation of the corrections (and got Holm and
            # Benjamini-Hochberg wrong).
            rejected = [bool(flag) for flag in result.rejected]
            adjusted = [float(value) for value in result.adjusted_pvalues]

            formatted_result = {
                "method": method,
                "alpha_original": alpha,
                "alpha": alpha,
                "p_values_original": list(p_values),
                "p_values_adjusted": adjusted,
                "adjusted_p_values": adjusted,  # both spellings; callers use each
                "rejected": rejected,
                "n_significant": int(sum(rejected)),
                "n_tests": int(result.n_tests),
                "error_rate_type": result.error_rate_type.value,
                "threshold": float(result.threshold) if result.threshold is not None else None,
                "estimated_fdr": (
                    float(result.estimated_fdr) if result.estimated_fdr is not None else None
                ),
                "warnings": list(result.warnings),
                "summary": result.summary(),
            }
            if hypothesis_names:
                formatted_result["hypothesis_names"] = list(hypothesis_names)

            return Response(formatted_result, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response(
                {"error": f"Multiplicity correction failed: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.exception("Multiplicity correction failed")
            return Response(
                {"error": f"Multiplicity correction failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PowerAnalysisView(APIView):
    """Calculate statistical power or required sample size"""

    parser_classes = (JSONParser,)

    def post(self, request):
        serializer = PowerCalculationRequestSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {"error": "Invalid request", "details": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Get power analysis parameters
            test_type = serializer.validated_data["test_type"]
            effect_size = serializer.validated_data["effect_size"]
            alpha = serializer.validated_data.get("alpha", 0.05)
            n_groups = serializer.validated_data.get("n_groups", 2)
            alternative = serializer.validated_data.get("alternative", "two-sided")

            # Initialize power analyzer
            analyzer = PowerAnalyzer()

            # Calculate power or sample size
            if "sample_size" in serializer.validated_data:
                # Calculate power
                sample_size = serializer.validated_data["sample_size"]
                result = analyzer.calculate_power(
                    test_type=test_type,
                    effect_size=effect_size,
                    sample_size=sample_size,
                    alpha=alpha,
                    n_groups=n_groups,
                    alternative=alternative,
                )
            else:
                # Calculate required sample size
                power = serializer.validated_data["power"]
                result = analyzer.calculate_sample_size(
                    test_type=test_type,
                    effect_size=effect_size,
                    power=power,
                    alpha=alpha,
                    n_groups=n_groups,
                    alternative=alternative,
                )

            # Format result
            formatted_result = {
                "power": result.get("power", None),
                "sample_size": result.get("sample_size", None),
                "effect_size": effect_size,
                "alpha": alpha,
                "test_type": test_type,
                "n_groups": n_groups,
                "critical_value": result.get("critical_value", 0),
                "noncentrality": result.get("ncp", 0),
                "interpretation": result.get("interpretation", ""),
                "power_curve": result.get("power_curve", []),
                "recommendations": result.get("recommendations", []),
            }

            return Response(formatted_result, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Power analysis failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ===============================
# Bayesian Statistics Views
# ===============================
# DESIGN CONTRACT: All Bayesian views include Guardian assumption context
# "No statistical result may exist without an explicit, traceable assumption context."


def _create_guardian_enriched_response(
    statistical_result: Dict, guardian_data: Any, test_type: str, expert_mode: bool = False
) -> Dict[str, Any]:
    """
    Helper function to create Guardian-enriched response for Bayesian tests.

    This ensures Design Contract compliance by adding assumption context
    to all statistical results.
    """
    guardian_wrapper = GuardianServiceWrapper()

    # Run Guardian check on the data
    guardian_report = guardian_wrapper.guardian.check(guardian_data, test_type, 0.05)

    # Create enriched response
    return {
        # Statistical results
        **statistical_result,
        # GUARDIAN CONTEXT (DESIGN CONTRACT REQUIREMENT)
        "guardian_report": {
            "test_type": guardian_report.test_type,
            "data_summary": guardian_report.data_summary,
            "assumptions_checked": guardian_report.assumptions_checked,
            "violations": [
                {
                    "assumption": v.assumption,
                    "test_name": v.test_name,
                    "severity": v.severity,
                    "p_value": v.p_value,
                    "statistic": v.statistic,
                    "message": v.message,
                    "recommendation": v.recommendation,
                }
                for v in guardian_report.violations
            ],
            "can_proceed": guardian_report.can_proceed,
            "alternative_tests": guardian_report.alternative_tests,
            "confidence_score": guardian_report.confidence_score,
        },
        "assumptions_checked": guardian_report.assumptions_checked,
        "violations": [
            {
                "assumption": v.assumption,
                "severity": v.severity,
                "message": v.message,
                "recommendation": v.recommendation,
            }
            for v in guardian_report.violations
        ],
        "confidence_score": guardian_report.confidence_score,
        "can_proceed": guardian_report.can_proceed,
        "alternative_tests": guardian_report.alternative_tests,
        "expert_mode_override": expert_mode and not guardian_report.can_proceed,
        # Contract compliance flags
        "_guardian_context": True,
        "_contract_compliant": True,
    }


class BayesianTTestView(APIView):
    """
    Perform Bayesian t-tests (one-sample, two-sample, or paired).

    Uses JZS (Jeffreys-Zellner-Siow) priors for effect sizes.
    Returns Bayes Factor, posterior distribution, ROPE analysis, and more.

    DESIGN CONTRACT COMPLIANCE:
    - All results include Guardian assumption context
    - Supports expert_mode to proceed despite violations
    """

    parser_classes = (JSONParser,)

    def post(self, request):
        from .serializers import BayesianTTestRequestSerializer
        from .services.bayesian import bayesian_one_sample_ttest, bayesian_two_sample_ttest, bayesian_paired_ttest

        serializer = BayesianTTestRequestSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {"error": "Invalid request", "details": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            data = serializer.validated_data
            test_type = data["test_type"]
            expert_mode = data.get("expert_mode", False)

            # Convert prior scale to float if numeric string
            prior_scale = data.get("prior_scale", "medium")
            try:
                prior_scale = float(prior_scale)
            except ValueError:
                pass  # Keep as string for named scales

            # Prepare data for Guardian based on test type
            if test_type == "one_sample":
                guardian_data = [np.array(data["data"])]
                result = bayesian_one_sample_ttest(
                    data=np.array(data["data"]),
                    mu=data.get("mu", 0),
                    prior_scale=prior_scale,
                    rope_low=data.get("rope_low", -0.1),
                    rope_high=data.get("rope_high", 0.1),
                    credible_mass=data.get("credible_mass", 0.95),
                    robustness_check=data.get("robustness_check", True),
                )
            elif test_type == "two_sample":
                if "data2" not in data:
                    return Response(
                        {"error": "data2 is required for two-sample test"}, status=status.HTTP_400_BAD_REQUEST
                    )
                guardian_data = [np.array(data["data"]), np.array(data["data2"])]
                result = bayesian_two_sample_ttest(
                    group1=np.array(data["data"]),
                    group2=np.array(data["data2"]),
                    prior_scale=prior_scale,
                    rope_low=data.get("rope_low", -0.1),
                    rope_high=data.get("rope_high", 0.1),
                    credible_mass=data.get("credible_mass", 0.95),
                    robustness_check=data.get("robustness_check", True),
                )
            elif test_type == "paired":
                if "data2" not in data:
                    return Response({"error": "data2 is required for paired test"}, status=status.HTTP_400_BAD_REQUEST)
                guardian_data = [np.array(data["data"]), np.array(data["data2"])]
                result = bayesian_paired_ttest(
                    data1=np.array(data["data"]),
                    data2=np.array(data["data2"]),
                    prior_scale=prior_scale,
                    rope_low=data.get("rope_low", -0.1),
                    rope_high=data.get("rope_high", 0.1),
                    credible_mass=data.get("credible_mass", 0.95),
                    robustness_check=data.get("robustness_check", True),
                )
            else:
                return Response({"error": f"Unknown test type: {test_type}"}, status=status.HTTP_400_BAD_REQUEST)

            # Create Guardian-enriched response (DESIGN CONTRACT COMPLIANCE)
            enriched_response = _create_guardian_enriched_response(
                statistical_result=result.to_dict(),
                guardian_data=guardian_data,
                test_type="bayesian_t_test",
                expert_mode=expert_mode,
            )

            return Response(enriched_response, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Bayesian t-test failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class BayesianAnovaView(APIView):
    """
    Perform Bayesian one-way ANOVA.

    Compares multiple group means using JZS approach.
    Returns Bayes Factor, effect sizes, and optional pairwise comparisons.

    DESIGN CONTRACT COMPLIANCE:
    - All results include Guardian assumption context
    - Supports expert_mode to proceed despite violations
    """

    parser_classes = (JSONParser,)

    def post(self, request):
        from .serializers import BayesianAnovaRequestSerializer
        from .services.bayesian import bayesian_one_way_anova

        serializer = BayesianAnovaRequestSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {"error": "Invalid request", "details": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            data = serializer.validated_data
            groups = [np.array(g) for g in data["groups"]]
            expert_mode = data.get("expert_mode", False)

            # Convert prior scale
            prior_scale = data.get("prior_scale", "medium")
            try:
                prior_scale = float(prior_scale)
            except ValueError:
                pass

            result = bayesian_one_way_anova(
                *groups,
                group_names=data.get("group_names"),
                prior_scale=prior_scale,
                compute_pairwise=data.get("compute_pairwise", True),
                robustness_check=data.get("robustness_check", True),
            )

            # Create Guardian-enriched response (DESIGN CONTRACT COMPLIANCE)
            enriched_response = _create_guardian_enriched_response(
                statistical_result=result.to_dict(),
                guardian_data=groups,  # List of arrays for ANOVA
                test_type="bayesian_anova",
                expert_mode=expert_mode,
            )

            return Response(enriched_response, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Bayesian ANOVA failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BayesianCorrelationView(APIView):
    """
    Perform Bayesian correlation analysis.

    Tests H0: rho = 0 vs H1: rho != 0 using stretched beta prior.
    Returns Bayes Factor, posterior distribution, and credible interval.

    DESIGN CONTRACT COMPLIANCE:
    - All results include Guardian assumption context
    - Supports expert_mode to proceed despite violations
    """

    parser_classes = (JSONParser,)

    def post(self, request):
        from .serializers import BayesianCorrelationRequestSerializer
        from .services.bayesian import bayesian_correlation

        serializer = BayesianCorrelationRequestSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {"error": "Invalid request", "details": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            data = serializer.validated_data
            expert_mode = data.get("expert_mode", False)

            if len(data["x"]) != len(data["y"]):
                return Response({"error": "x and y must have the same length"}, status=status.HTTP_400_BAD_REQUEST)

            x_array = np.array(data["x"])
            y_array = np.array(data["y"])

            result = bayesian_correlation(
                x=x_array,
                y=y_array,
                kappa=data.get("kappa", 1.0),
                credible_mass=data.get("credible_mass", 0.95),
                robustness_check=data.get("robustness_check", True),
            )

            # Create Guardian-enriched response (DESIGN CONTRACT COMPLIANCE)
            enriched_response = _create_guardian_enriched_response(
                statistical_result=result.to_dict(),
                guardian_data=[x_array, y_array],  # Two arrays for correlation
                test_type="bayesian_correlation",
                expert_mode=expert_mode,
            )

            return Response(enriched_response, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Bayesian correlation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class BayesFactorInterpretView(APIView):
    """
    Interpret a Bayes Factor value using Jeffreys' scale.

    Useful for understanding the strength of evidence.
    """

    parser_classes = (JSONParser,)

    def post(self, request):
        from .services.bayesian import interpret_bayes_factor, bayes_factor_to_probability

        bf = request.data.get("bf10")

        if bf is None:
            return Response({"error": "bf10 is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            bf = float(bf)
            interpretation = interpret_bayes_factor(bf)
            probs = bayes_factor_to_probability(bf)

            result = {
                "bf10": bf,
                "bf01": 1 / bf if bf > 0 else float("inf"),
                "level": interpretation.level,
                "label": interpretation.label,
                "favors": interpretation.favors,
                "strength": interpretation.strength,
                "color": interpretation.color,
                "posterior_probability_h1": probs["p_h1"],
                "posterior_probability_h0": probs["p_h0"],
            }

            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Interpretation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PriorScalesView(APIView):
    """
    Get available prior scales and their descriptions.

    Provides information about default prior choices for Bayesian tests.
    """

    def get(self, request):
        from .services.bayesian import PRIOR_SCALES

        scales = {}
        for name, info in PRIOR_SCALES.items():
            scales[name] = {
                "r": float(info["r"]),
                "label": info["label"],
                "description": info["description"],
                "typical_use": info["typical_use"],
            }

        return Response(
            {
                "scales": scales,
                "default": "medium",
                "info": "Prior scales determine the expected effect size magnitude. "
                "The medium scale (r = sqrt(2)/2 ≈ 0.707) is recommended for most analyses.",
            },
            status=status.HTTP_200_OK,
        )


# ===============================
# Pre-Registration Views
# ===============================


class PreRegistrationTemplatesView(APIView):
    """
    Get available pre-registration templates.

    Returns information about OSF, AsPredicted, and JARS templates.
    """

    def get(self, request):
        from .services.preregistration import get_template_names, get_template

        templates = []
        for name in get_template_names():
            template = get_template(name)
            templates.append(
                {
                    "id": name,
                    "name": template.name,
                    "version": template.version,
                    "description": template.description,
                    "url": template.url,
                    "field_count": len(template.fields),
                    "required_field_count": len(template.get_required_fields()),
                    "sections": [s.value for s in template.sections],
                }
            )

        return Response({"templates": templates}, status=status.HTTP_200_OK)


class PreRegistrationTemplateFieldsView(APIView):
    """
    Get fields for a specific pre-registration template.
    """

    def get(self, request, template_name):
        from .services.preregistration import get_template

        try:
            template = get_template(template_name)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        fields = []
        for f in template.fields:
            fields.append(
                {
                    "id": f.id,
                    "label": f.label,
                    "description": f.description,
                    "required": f.required,
                    "field_type": f.field_type,
                    "options": f.options,
                    "placeholder": f.placeholder,
                    "help_text": f.help_text,
                    "section": f.section.value,
                    "max_length": f.max_length,
                }
            )

        return Response({"template": template_name, "fields": fields}, status=status.HTTP_200_OK)


class PreRegistrationCreateView(APIView):
    """
    Create a new pre-registration document.
    """

    parser_classes = (JSONParser,)

    def post(self, request):
        from .serializers import PreRegistrationRequestSerializer
        from .services.preregistration import PreRegistrationBuilder

        serializer = PreRegistrationRequestSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {"error": "Invalid request", "details": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            data = serializer.validated_data
            builder = PreRegistrationBuilder(data.get("template", "osf"))

            builder.set_title(data["title"])

            if data.get("authors"):
                builder.set_authors(data["authors"], data.get("affiliations", []))

            if data.get("template_data"):
                for key, value in data["template_data"].items():
                    builder.set_field(key, value)

            prereg = builder.build()

            return Response(
                {
                    "id": prereg.id,
                    "title": prereg.title,
                    "template": prereg.template_name,
                    "created_at": prereg.created_at.isoformat(),
                    "completion_percentage": prereg.get_completion_percentage(),
                    "validation": prereg.validate(),
                },
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            return Response(
                {"error": f"Failed to create pre-registration: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class HypothesisFormulatorView(APIView):
    """
    Create a hypothesis with guided formulation.
    """

    parser_classes = (JSONParser,)

    def post(self, request):
        from .serializers import HypothesisRequestSerializer
        from .services.preregistration import HypothesisFormulator

        serializer = HypothesisRequestSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {"error": "Invalid request", "details": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            data = serializer.validated_data
            formulator = HypothesisFormulator()

            hypothesis = formulator.create_hypothesis(
                description=data["description"],
                iv_name=data["iv_name"],
                iv_operationalization=data["iv_operationalization"],
                iv_measurement=data["iv_measurement"],
                iv_levels=data.get("iv_levels"),
                dv_name=data["dv_name"],
                dv_operationalization=data["dv_operationalization"],
                dv_measurement=data["dv_measurement"],
                direction=data.get("direction", "different"),
                hypothesis_type=data.get("hypothesis_type", "non_directional"),
                effect_size=data.get("effect_size"),
                effect_size_type=data.get("effect_size_type"),
                alpha=data.get("alpha", 0.05),
                rationale=data.get("rationale", ""),
            )

            return Response(
                {
                    "hypothesis": hypothesis.to_dict(),
                    "formal_statement": hypothesis.to_formal_statement(),
                    "warnings": formulator.validate_hypotheses(),
                    "suggestions": formulator.suggest_improvements(hypothesis.id),
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"error": f"Failed to create hypothesis: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SampleSizeJustificationView(APIView):
    """
    Create sample size justification.
    """

    parser_classes = (JSONParser,)

    def post(self, request):
        from .serializers import SampleSizeJustificationRequestSerializer
        from .services.preregistration import create_sample_size_justification

        serializer = SampleSizeJustificationRequestSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {"error": "Invalid request", "details": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            data = serializer.validated_data

            justification = create_sample_size_justification(
                target_n=data["target_n"],
                strategy=data["strategy"],
                rationale=data["rationale"],
                effect_size=data.get("effect_size"),
                effect_size_type=data.get("effect_size_type"),
                alpha=data.get("alpha", 0.05),
                power=data.get("power", 0.80),
                test_type=data.get("test_type", "t-test"),
                effect_size_rationale=data.get("effect_size_rationale", ""),
            )

            return Response(
                {"justification": justification.to_dict(), "formatted_text": justification.generate_text()},
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"error": f"Failed to create justification: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ===============================
# P-Curve Analysis Views
# ===============================


class PCurveAnalysisView(APIView):
    """
    Perform p-curve analysis on a set of studies.

    P-curve analysis assesses the evidential value of a set of findings
    by examining the distribution of significant p-values.
    """

    parser_classes = (JSONParser,)

    def post(self, request):
        from .serializers import PCurveInputSerializer
        from .services.pcurve import compute_pcurve, parse_multiple_studies

        serializer = PCurveInputSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {"error": "Invalid request", "details": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            data = serializer.validated_data

            # Collect p-values AND per-study test statistics. The df-aware flat
            # test and average-power estimate need each study's test statistic
            # (df), so we forward full study records, not just bare p-values.
            p_values = []
            study_records = []

            for pv in data.get("p_values") or []:
                p_values.append(pv)
                study_records.append({"p_value": pv, "test_type": "p"})

            for source in ("studies", "detailed_inputs"):
                if data.get(source):
                    parsed, _errors = parse_multiple_studies(data[source])
                    for s in parsed:
                        if s.p_value is not None:
                            p_values.append(s.p_value)
                            study_records.append({
                                "p_value": s.p_value,
                                "test_type": s.test_type,
                                "df1": s.df1,
                                "df2": s.df2,
                                "n": s.n,
                            })

            if not study_records:
                return Response(
                    {"error": "No valid p-values could be extracted from input"}, status=status.HTTP_400_BAD_REQUEST
                )

            # Perform p-curve analysis (df-aware when test statistics are present)
            result = compute_pcurve(p_values, studies=study_records)

            return Response(result.to_dict(), status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"P-curve analysis failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PCurveParseView(APIView):
    """
    Parse a test statistic string and convert to p-value.

    Supports formats like:
    - t(24) = 2.45
    - F(2, 45) = 4.56
    - chi2(3) = 12.5
    - r(30) = 0.45
    - p = 0.023
    """

    parser_classes = (JSONParser,)

    def post(self, request):
        from .serializers import TestStatisticParseRequestSerializer
        from .services.pcurve import parse_test_statistic

        serializer = TestStatisticParseRequestSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {"error": "Invalid request", "details": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            data = serializer.validated_data
            result = parse_test_statistic(data["input_string"], data.get("study_id", ""))

            return Response(result.to_dict(), status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Parsing failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PCurveVisualizationView(APIView):
    """
    Get visualization data for p-curve analysis.
    """

    parser_classes = (JSONParser,)

    def post(self, request):
        from .services.pcurve import compute_pcurve, generate_pcurve_plot_data, generate_comparison_data

        p_values = request.data.get("p_values", [])

        if not p_values:
            return Response({"error": "p_values array is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = compute_pcurve(p_values)
            plot_data = generate_pcurve_plot_data(result)
            comparison_data = generate_comparison_data(result)

            return Response({"plot_data": plot_data, "comparison_data": comparison_data}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Visualization generation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ===============================
# ===============================
# Mixed Effects Models Views
# ===============================
# DESIGN CONTRACT: All Mixed Models views include Guardian assumption context
# "No statistical result may exist without an explicit, traceable assumption context."


class ICCCalculationView(APIView):
    """
    Calculate Intraclass Correlation Coefficient (ICC).

    ICC measures the proportion of variance at different levels
    in hierarchical/nested data structures.

    DESIGN CONTRACT COMPLIANCE:
    - All results include Guardian assumption context
    - Supports expert_mode to proceed despite violations
    """

    parser_classes = (JSONParser,)

    def post(self, request):
        from .services.mixed_models import calculate_icc, icc_for_multilevel_decision, calculate_design_effect
        import numpy as np
        import pandas as pd

        data = request.data.get("data")
        icc_type = request.data.get("icc_type", "ICC(2,1)")
        confidence_level = request.data.get("confidence_level", 0.95)
        expert_mode = request.data.get("expert_mode", False)

        # For long format data
        grouping_var = request.data.get("grouping_var")
        values_var = request.data.get("values_var")

        if data is None:
            return Response({"error": "data is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Handle different input formats
            if isinstance(data, list):
                if grouping_var and values_var:
                    # Long format with grouping variable
                    df = pd.DataFrame(data)
                    guardian_data = [df[values_var].values]
                    result_dict = icc_for_multilevel_decision(df[values_var].values, df[grouping_var].values)
                    # Add Guardian context to long-format result
                    enriched_response = _create_guardian_enriched_response(
                        statistical_result=result_dict,
                        guardian_data=guardian_data,
                        test_type="mixed_model",
                        expert_mode=expert_mode,
                    )
                    return Response(enriched_response, status=status.HTTP_200_OK)
                else:
                    # Matrix format (subjects x raters)
                    data_array = np.array(data)
            else:
                return Response(
                    {"error": "data must be a 2D array (subjects x raters) or list of observations"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            result = calculate_icc(data=data_array, icc_type=icc_type, confidence_level=confidence_level)

            response_data = result.to_dict()

            # Add design effect calculation
            design_effect = calculate_design_effect(result.icc_value, result.n_raters)
            response_data["design_effect_analysis"] = design_effect

            # Add Guardian context (DESIGN CONTRACT COMPLIANCE)
            guardian_data = [data_array.flatten()]  # Flatten for Guardian validation
            enriched_response = _create_guardian_enriched_response(
                statistical_result=response_data,
                guardian_data=guardian_data,
                test_type="mixed_model",
                expert_mode=expert_mode,
            )

            return Response(enriched_response, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"ICC calculation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LMMFitView(APIView):
    """
    Fit a Linear Mixed Model.

    Supports random intercepts and random slopes for hierarchical data.

    DESIGN CONTRACT COMPLIANCE:
    - All results include Guardian assumption context
    - Validates LMM assumptions (normality, independence, etc.)
    - Supports expert_mode to proceed despite violations
    """

    parser_classes = (JSONParser,)

    def post(self, request):
        from .services.mixed_models import fit_linear_mixed_model, calculate_variance_partition, generate_model_equation
        import pandas as pd

        data = request.data.get("data")
        outcome = request.data.get("outcome")
        fixed_effects = request.data.get("fixed_effects", [])
        grouping_var = request.data.get("grouping_var")
        random_slope_var = request.data.get("random_slope_var")
        expert_mode = request.data.get("expert_mode", False)

        if not data or not outcome or not grouping_var:
            return Response(
                {"error": "data, outcome, and grouping_var are required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            df = pd.DataFrame(data)

            # Build random slopes dict if provided
            random_slopes = None
            if random_slope_var:
                random_slopes = {grouping_var: random_slope_var}

            result = fit_linear_mixed_model(
                data=df,
                outcome=outcome,
                fixed_effects=fixed_effects,
                random_intercept_groups=grouping_var,
                random_slopes=random_slopes,
            )

            response_data = result.to_dict()

            # Add variance partition
            response_data["variance_partition"] = calculate_variance_partition(result)

            # Add model equation
            response_data["model_equation"] = generate_model_equation(
                outcome=outcome, fixed_effects=fixed_effects, grouping_var=grouping_var, random_slope=random_slope_var
            )

            # Add Guardian context (DESIGN CONTRACT COMPLIANCE)
            # Prepare outcome data for Guardian validation
            guardian_data = [df[outcome].dropna().values]
            enriched_response = _create_guardian_enriched_response(
                statistical_result=response_data, guardian_data=guardian_data, test_type="lmm", expert_mode=expert_mode
            )

            return Response(enriched_response, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Model fitting failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LMMCompareView(APIView):
    """
    Compare two nested Linear Mixed Models using LRT.

    DESIGN CONTRACT COMPLIANCE:
    - All results include Guardian assumption context
    """

    parser_classes = (JSONParser,)

    def post(self, request):
        from .services.mixed_models import fit_linear_mixed_model, likelihood_ratio_test
        import pandas as pd

        data = request.data.get("data")
        outcome = request.data.get("outcome")
        grouping_var = request.data.get("grouping_var")
        expert_mode = request.data.get("expert_mode", False)

        # Model specifications
        model1_fixed = request.data.get("model1_fixed_effects", [])
        model2_fixed = request.data.get("model2_fixed_effects", [])
        model1_random_slope = request.data.get("model1_random_slope")
        model2_random_slope = request.data.get("model2_random_slope")

        if not data or not outcome or not grouping_var:
            return Response(
                {"error": "data, outcome, and grouping_var are required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            df = pd.DataFrame(data)

            # Fit model 1 (simpler/null)
            random_slopes1 = {grouping_var: model1_random_slope} if model1_random_slope else None
            model1 = fit_linear_mixed_model(
                data=df,
                outcome=outcome,
                fixed_effects=model1_fixed,
                random_intercept_groups=grouping_var,
                random_slopes=random_slopes1,
            )

            # Fit model 2 (more complex/alternative)
            random_slopes2 = {grouping_var: model2_random_slope} if model2_random_slope else None
            model2 = fit_linear_mixed_model(
                data=df,
                outcome=outcome,
                fixed_effects=model2_fixed,
                random_intercept_groups=grouping_var,
                random_slopes=random_slopes2,
            )

            # Perform LRT
            lrt_result = likelihood_ratio_test(model1, model2)

            # Add Guardian context (DESIGN CONTRACT COMPLIANCE)
            guardian_data = [df[outcome].dropna().values]
            enriched_response = _create_guardian_enriched_response(
                statistical_result={"model1": model1.to_dict(), "model2": model2.to_dict(), "comparison": lrt_result},
                guardian_data=guardian_data,
                test_type="lmm",
                expert_mode=expert_mode,
            )

            return Response(enriched_response, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Model comparison failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LMMDiagnosticsView(APIView):
    """
    Get diagnostics for a fitted Linear Mixed Model.

    DESIGN CONTRACT COMPLIANCE:
    - All results include Guardian assumption context
    - Diagnostics complement Guardian's assumption validation
    """

    parser_classes = (JSONParser,)

    def post(self, request):
        from .services.mixed_models import fit_linear_mixed_model, full_diagnostics
        import pandas as pd

        data = request.data.get("data")
        outcome = request.data.get("outcome")
        fixed_effects = request.data.get("fixed_effects", [])
        grouping_var = request.data.get("grouping_var")
        random_slope_var = request.data.get("random_slope_var")
        expert_mode = request.data.get("expert_mode", False)

        if not data or not outcome or not grouping_var:
            return Response(
                {"error": "data, outcome, and grouping_var are required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            df = pd.DataFrame(data)

            # Fit model
            random_slopes = {grouping_var: random_slope_var} if random_slope_var else None
            result = fit_linear_mixed_model(
                data=df,
                outcome=outcome,
                fixed_effects=fixed_effects,
                random_intercept_groups=grouping_var,
                random_slopes=random_slopes,
            )

            # Get diagnostics
            diagnostics = full_diagnostics(result, df, grouping_var)

            # Add Guardian context (DESIGN CONTRACT COMPLIANCE)
            guardian_data = [df[outcome].dropna().values]
            enriched_response = _create_guardian_enriched_response(
                statistical_result={"model_summary": result.to_dict(), "diagnostics": diagnostics.to_dict()},
                guardian_data=guardian_data,
                test_type="lmm",
                expert_mode=expert_mode,
            )

            return Response(enriched_response, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Diagnostics failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LMMRandomEffectsView(APIView):
    """
    Get random effects (BLUPs) and visualization data.

    DESIGN CONTRACT COMPLIANCE:
    - All results include Guardian assumption context
    """

    parser_classes = (JSONParser,)

    def post(self, request):
        from .services.mixed_models import (
            fit_linear_mixed_model,
            extract_random_effects,
            caterpillar_plot_data,
            random_effects_variance,
        )
        import pandas as pd

        data = request.data.get("data")
        outcome = request.data.get("outcome")
        fixed_effects = request.data.get("fixed_effects", [])
        grouping_var = request.data.get("grouping_var")
        random_slope_var = request.data.get("random_slope_var")
        expert_mode = request.data.get("expert_mode", False)

        if not data or not outcome or not grouping_var:
            return Response(
                {"error": "data, outcome, and grouping_var are required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            df = pd.DataFrame(data)

            # Fit model
            random_slopes = {grouping_var: random_slope_var} if random_slope_var else None
            result = fit_linear_mixed_model(
                data=df,
                outcome=outcome,
                fixed_effects=fixed_effects,
                random_intercept_groups=grouping_var,
                random_slopes=random_slopes,
            )

            # Extract random effects
            re_result = extract_random_effects(result)

            # Generate caterpillar plot data
            caterpillar = caterpillar_plot_data(result, effect="intercept")

            # Variance partition
            variance = random_effects_variance(result)

            # Add Guardian context (DESIGN CONTRACT COMPLIANCE)
            guardian_data = [df[outcome].dropna().values]
            enriched_response = _create_guardian_enriched_response(
                statistical_result={
                    "random_effects": re_result.to_dict(),
                    "caterpillar_plot": caterpillar,
                    "variance_components": variance,
                },
                guardian_data=guardian_data,
                test_type="lmm",
                expert_mode=expert_mode,
            )

            return Response(enriched_response, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Random effects extraction failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================================================
# CAUSAL INFERENCE VIEWS
# ============================================================================
# DESIGN CONTRACT: Statistical causal inference views include Guardian context
# DAG structural views (DAGCreateView, DAGAnalyzeView) are logical/structural
# analysis and don't require Guardian statistical assumption validation.
# Statistical views (Propensity, Matching, Effects, Mediation, DiD) DO require it.


class DAGCreateView(APIView):
    """Create and analyze a causal DAG."""

    parser_classes = [JSONParser]

    def post(self, request):
        """
        Create a causal DAG from edges.

        Request body:
        {
            "edges": [["Z", "X"], ["Z", "Y"], ["X", "Y"]],
            "exposure": "X",
            "outcome": "Y",
            "name": "my_dag" (optional)
        }
        """
        from .services.causal.dag import create_dag_from_edges

        edges = request.data.get("edges", [])
        exposure = request.data.get("exposure")
        outcome = request.data.get("outcome")
        name = request.data.get("name", "causal_dag")

        if not edges:
            return Response({"error": "edges are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Convert edges to tuples
            edge_tuples = [tuple(e) for e in edges]

            dag = create_dag_from_edges(edges=edge_tuples, exposure=exposure, outcome=outcome, name=name)

            # Analyze structure if exposure and outcome provided
            analysis = {}
            if exposure and outcome:
                analysis = {
                    "confounders": list(dag.identify_confounders(exposure, outcome)),
                    "mediators": list(dag.identify_mediators(exposure, outcome)),
                    "instruments": list(dag.identify_instruments(exposure, outcome)),
                    "is_acyclic": dag.is_acyclic(),
                }

            return Response(
                {
                    "dag": dag.to_dict(),
                    "analysis": analysis,
                    "message": f"DAG created with {len(dag.nodes)} nodes and {len(dag.edges)} edges",
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response({"error": f"DAG creation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DAGAnalyzeView(APIView):
    """Analyze a DAG for d-separation and adjustment sets."""

    parser_classes = [JSONParser]

    def post(self, request):
        """
        Analyze DAG structure.

        Request body:
        {
            "dag": { ... dag dict from DAGCreateView ... },
            "exposure": "X",
            "outcome": "Y"
        }
        """
        from .services.causal.dag import CausalDAG
        from .services.causal.d_separation import is_d_separated, identify_conditional_independencies
        from .services.causal.adjustment_sets import find_adjustment_sets

        dag_data = request.data.get("dag")
        exposure = request.data.get("exposure")
        outcome = request.data.get("outcome")

        if not dag_data or not exposure or not outcome:
            return Response({"error": "dag, exposure, and outcome are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Reconstruct DAG
            dag = CausalDAG.from_dict(dag_data)

            # D-separation analysis
            d_sep_empty = is_d_separated(dag, exposure, outcome, set())

            # Find adjustment sets
            adj_result = find_adjustment_sets(dag, exposure, outcome)

            # Find conditional independencies (limited)
            independencies = identify_conditional_independencies(dag, max_conditioning_size=2)

            return Response(
                {
                    "d_separation": {"unconditional": d_sep_empty.to_dict()},
                    "adjustment_sets": adj_result.to_dict(),
                    "conditional_independencies": independencies[:10],  # Limit for API
                    "identifiable": adj_result.identifiable,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response({"error": f"DAG analysis failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdjustmentSetView(APIView):
    """Calculate adjustment sets for causal effect identification."""

    parser_classes = [JSONParser]

    def post(self, request):
        """
        Find adjustment sets.

        Request body:
        {
            "dag": { ... dag dict ... },
            "exposure": "X",
            "outcome": "Y",
            "required_nodes": [],  (optional)
            "forbidden_nodes": []  (optional)
        }
        """
        from .services.causal.dag import CausalDAG
        from .services.causal.adjustment_sets import find_adjustment_sets

        dag_data = request.data.get("dag")
        exposure = request.data.get("exposure")
        outcome = request.data.get("outcome")
        required_nodes = set(request.data.get("required_nodes", []))
        forbidden_nodes = set(request.data.get("forbidden_nodes", []))

        if not dag_data or not exposure or not outcome:
            return Response({"error": "dag, exposure, and outcome are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            dag = CausalDAG.from_dict(dag_data)

            result = find_adjustment_sets(
                dag,
                exposure,
                outcome,
                required_nodes=required_nodes if required_nodes else None,
                forbidden_nodes=forbidden_nodes if forbidden_nodes else None,
            )

            return Response(result.to_dict(), status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Adjustment set calculation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PropensityScoreView(APIView):
    """
    Estimate propensity scores.

    DESIGN CONTRACT COMPLIANCE:
    - All results include Guardian assumption context
    """

    parser_classes = [JSONParser]

    def post(self, request):
        """
        Estimate propensity scores.

        Request body:
        {
            "data": [...],
            "treatment": "treatment_var",
            "covariates": ["cov1", "cov2"],
            "regularization": 0.0  (optional),
            "expert_mode": false (optional)
        }
        """
        from .services.causal.propensity import estimate_propensity_scores

        data = request.data.get("data")
        treatment = request.data.get("treatment")
        covariates = request.data.get("covariates", [])
        regularization = request.data.get("regularization", 0.0)
        expert_mode = request.data.get("expert_mode", False)

        if not data or not treatment or not covariates:
            return Response(
                {"error": "data, treatment, and covariates are required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            df = pd.DataFrame(data)

            result = estimate_propensity_scores(
                data=df, treatment=treatment, covariates=covariates, regularization=regularization
            )

            response_data = result.to_dict()
            # Limit scores array for API response
            if len(response_data["scores"]) > 100:
                response_data["scores_summary"] = {
                    "mean": float(np.mean(result.scores)),
                    "std": float(np.std(result.scores, ddof=1)),
                    "min": float(np.min(result.scores)),
                    "max": float(np.max(result.scores)),
                    "n": len(result.scores),
                }
                response_data["scores"] = response_data["scores"][:100]  # First 100

            # Add Guardian context (DESIGN CONTRACT COMPLIANCE)
            guardian_data = [df[treatment].values]
            enriched_response = _create_guardian_enriched_response(
                statistical_result=response_data,
                guardian_data=guardian_data,
                test_type="propensity_score",
                expert_mode=expert_mode,
            )

            return Response(enriched_response, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Propensity score estimation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MatchingView(APIView):
    """
    Perform propensity score matching.

    DESIGN CONTRACT COMPLIANCE:
    - All results include Guardian assumption context
    """

    parser_classes = [JSONParser]

    def post(self, request):
        """
        Perform propensity score matching.

        Request body:
        {
            "data": [...],
            "treatment": "treatment_var",
            "covariates": ["cov1", "cov2"],
            "outcome": "outcome_var" (optional),
            "method": "nearest" (or "optimal"),
            "ratio": 1,
            "caliper": null (optional),
            "expert_mode": false (optional)
        }
        """
        from .services.causal.propensity import estimate_propensity_scores
        from .services.causal.matching import propensity_score_matching, estimate_effect_matched

        data = request.data.get("data")
        treatment = request.data.get("treatment")
        covariates = request.data.get("covariates", [])
        outcome = request.data.get("outcome")
        method = request.data.get("method", "nearest")
        ratio = request.data.get("ratio", 1)
        caliper = request.data.get("caliper")
        expert_mode = request.data.get("expert_mode", False)

        if not data or not treatment or not covariates:
            return Response(
                {"error": "data, treatment, and covariates are required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            df = pd.DataFrame(data)

            # Estimate propensity scores
            ps_result = estimate_propensity_scores(df, treatment, covariates)

            # Perform matching
            match_result = propensity_score_matching(
                data=df,
                treatment=treatment,
                propensity_scores=ps_result.scores,
                outcome=outcome,
                method=method,
                ratio=ratio,
                caliper=caliper,
                covariates=covariates,
            )

            response = match_result.to_dict()
            response["propensity_scores"] = {"auc": ps_result.auc, "overlap": ps_result.overlap}

            # Estimate effect if outcome provided
            if outcome:
                effect = estimate_effect_matched(match_result.matched_data, treatment, outcome)
                response["treatment_effect"] = effect

            # Add Guardian context (DESIGN CONTRACT COMPLIANCE)
            guardian_data = [df[treatment].values]
            if outcome:
                guardian_data.append(df[outcome].dropna().values)
            enriched_response = _create_guardian_enriched_response(
                statistical_result=response,
                guardian_data=guardian_data,
                test_type="propensity_score",
                expert_mode=expert_mode,
            )

            return Response(enriched_response, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Matching failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TreatmentEffectView(APIView):
    """
    Estimate causal treatment effects.

    DESIGN CONTRACT COMPLIANCE:
    - All results include Guardian assumption context
    """

    parser_classes = [JSONParser]

    def post(self, request):
        """
        Estimate treatment effects.

        Request body:
        {
            "data": [...],
            "treatment": "treatment_var",
            "outcome": "outcome_var",
            "covariates": ["cov1", "cov2"],
            "estimand": "ate" (or "att"),
            "method": "doubly_robust" (or "regression", "ipw", "unadjusted"),
            "expert_mode": false (optional)
        }
        """
        from .services.causal.effects import estimate_ate, estimate_att, doubly_robust_estimator

        data = request.data.get("data")
        treatment = request.data.get("treatment")
        outcome = request.data.get("outcome")
        covariates = request.data.get("covariates", [])
        estimand = request.data.get("estimand", "ate")
        method = request.data.get("method", "doubly_robust")
        expert_mode = request.data.get("expert_mode", False)

        if not data or not treatment or not outcome:
            return Response({"error": "data, treatment, and outcome are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            df = pd.DataFrame(data)

            if method == "doubly_robust" and covariates:
                result = doubly_robust_estimator(df, treatment, outcome, covariates, estimand)
            elif estimand == "ate":
                result = estimate_ate(df, treatment, outcome, covariates, method)
            else:
                result = estimate_att(df, treatment, outcome, covariates, method)

            # Add Guardian context (DESIGN CONTRACT COMPLIANCE)
            guardian_data = [df[outcome].dropna().values]
            enriched_response = _create_guardian_enriched_response(
                statistical_result=result.to_dict(),
                guardian_data=guardian_data,
                test_type="difference_in_differences",  # Use DiD type for treatment effects
                expert_mode=expert_mode,
            )

            return Response(enriched_response, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Treatment effect estimation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SensitivityAnalysisView(APIView):
    """Perform sensitivity analysis for unmeasured confounding."""

    parser_classes = [JSONParser]

    def post(self, request):
        """
        Perform sensitivity analysis.

        Request body:
        {
            "data": [...],
            "treatment": "treatment_var",
            "outcome": "outcome_var",
            "covariates": ["cov1", "cov2"],
            "gamma_range": [1.0, 2.0] (optional)
        }
        """
        from .services.causal.effects import sensitivity_analysis

        data = request.data.get("data")
        treatment = request.data.get("treatment")
        outcome = request.data.get("outcome")
        covariates = request.data.get("covariates", [])
        gamma_range = request.data.get("gamma_range", [1.0, 2.0])

        if not data or not treatment or not outcome or not covariates:
            return Response(
                {"error": "data, treatment, outcome, and covariates are required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            df = pd.DataFrame(data)

            result = sensitivity_analysis(df, treatment, outcome, covariates, gamma_range=tuple(gamma_range))

            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Sensitivity analysis failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================================================
# MEDIATION ANALYSIS VIEWS
# ============================================================================


class MediationBaronKennyView(APIView):
    """
    Perform Baron-Kenny mediation analysis.

    DESIGN CONTRACT COMPLIANCE:
    - All results include Guardian assumption context
    """

    parser_classes = [JSONParser]

    def post(self, request):
        """
        Perform Baron-Kenny 4-step mediation analysis.

        Request body:
        {
            "data": [...],
            "treatment": "X",
            "mediator": "M",
            "outcome": "Y",
            "covariates": ["cov1", "cov2"] (optional),
            "bootstrap": true,
            "n_bootstrap": 5000,
            "expert_mode": false (optional)
        }
        """
        from .services.causal.mediation import baron_kenny_mediation

        data = request.data.get("data")
        treatment = request.data.get("treatment")
        mediator = request.data.get("mediator")
        outcome = request.data.get("outcome")
        covariates = request.data.get("covariates")
        bootstrap = request.data.get("bootstrap", True)
        n_bootstrap = request.data.get("n_bootstrap", 5000)
        expert_mode = request.data.get("expert_mode", False)

        if not data or not treatment or not mediator or not outcome:
            return Response(
                {"error": "data, treatment, mediator, and outcome are required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            df = pd.DataFrame(data)

            result = baron_kenny_mediation(
                data=df,
                treatment=treatment,
                mediator=mediator,
                outcome=outcome,
                covariates=covariates,
                bootstrap=bootstrap,
                n_bootstrap=n_bootstrap,
            )

            # Add Guardian context (DESIGN CONTRACT COMPLIANCE)
            guardian_data = [df[outcome].dropna().values]
            enriched_response = _create_guardian_enriched_response(
                statistical_result=result.to_dict(),
                guardian_data=guardian_data,
                test_type="mediation",
                expert_mode=expert_mode,
            )

            return Response(enriched_response, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Mediation analysis failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CausalMediationView(APIView):
    """Perform causal mediation analysis (Imai et al.)."""

    parser_classes = [JSONParser]

    def post(self, request):
        """
        Perform causal mediation analysis.

        Request body:
        {
            "data": [...],
            "treatment": "X",
            "mediator": "M",
            "outcome": "Y",
            "covariates": ["cov1"] (optional),
            "n_simulations": 1000,
            "treatment_model": "logistic" (for binary treatment)
        }
        """
        from .services.causal.mediation import causal_mediation_analysis

        data = request.data.get("data")
        treatment = request.data.get("treatment")
        mediator = request.data.get("mediator")
        outcome = request.data.get("outcome")
        covariates = request.data.get("covariates")
        n_simulations = request.data.get("n_simulations", 1000)
        treatment_model = request.data.get("treatment_model", "linear")

        if not data or not treatment or not mediator or not outcome:
            return Response(
                {"error": "data, treatment, mediator, and outcome are required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            df = pd.DataFrame(data)

            result = causal_mediation_analysis(
                data=df,
                treatment=treatment,
                mediator=mediator,
                outcome=outcome,
                covariates=covariates,
                n_simulations=n_simulations,
                treatment_model=treatment_model,
            )

            return Response(result.to_dict(), status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Causal mediation analysis failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MediationSensitivityView(APIView):
    """Perform sensitivity analysis for mediation."""

    parser_classes = [JSONParser]

    def post(self, request):
        """
        Sensitivity analysis for unmeasured confounding in mediation.

        Request body:
        {
            "data": [...],
            "treatment": "X",
            "mediator": "M",
            "outcome": "Y",
            "covariates": [],
            "rho_range": [-0.9, 0.9]
        }
        """
        from .services.causal.mediation import mediation_sensitivity_analysis

        data = request.data.get("data")
        treatment = request.data.get("treatment")
        mediator = request.data.get("mediator")
        outcome = request.data.get("outcome")
        covariates = request.data.get("covariates")
        rho_range = request.data.get("rho_range", (-0.9, 0.9))

        if not data or not treatment or not mediator or not outcome:
            return Response(
                {"error": "data, treatment, mediator, and outcome are required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            df = pd.DataFrame(data)

            result = mediation_sensitivity_analysis(
                data=df,
                treatment=treatment,
                mediator=mediator,
                outcome=outcome,
                covariates=covariates,
                rho_range=tuple(rho_range),
            )

            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Sensitivity analysis failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MultipleMediatorsView(APIView):
    """Analyze multiple mediators."""

    parser_classes = [JSONParser]

    def post(self, request):
        """
        Analyze multiple parallel mediators.

        Request body:
        {
            "data": [...],
            "treatment": "X",
            "mediators": ["M1", "M2", "M3"],
            "outcome": "Y",
            "covariates": []
        }
        """
        from .services.causal.mediation import multiple_mediator_analysis

        data = request.data.get("data")
        treatment = request.data.get("treatment")
        mediators = request.data.get("mediators")
        outcome = request.data.get("outcome")
        covariates = request.data.get("covariates")

        if not data or not treatment or not mediators or not outcome:
            return Response(
                {"error": "data, treatment, mediators, and outcome are required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            df = pd.DataFrame(data)

            result = multiple_mediator_analysis(
                data=df, treatment=treatment, mediators=mediators, outcome=outcome, covariates=covariates
            )

            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Multiple mediator analysis failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================================================
# DIFFERENCE-IN-DIFFERENCES VIEWS
# ============================================================================


class DiDView(APIView):
    """
    Perform Difference-in-Differences analysis.

    DESIGN CONTRACT COMPLIANCE:
    - All results include Guardian assumption context
    """

    parser_classes = [JSONParser]

    def post(self, request):
        """
        Perform basic 2x2 DiD analysis.

        Request body:
        {
            "data": [...],
            "outcome": "Y",
            "treatment_group": "treated",
            "post_period": "post",
            "covariates": [],
            "cluster_var": "unit_id" (optional),
            "expert_mode": false (optional)
        }
        """
        from .services.causal.did import difference_in_differences

        data = request.data.get("data")
        outcome = request.data.get("outcome")
        treatment_group = request.data.get("treatment_group")
        post_period = request.data.get("post_period")
        covariates = request.data.get("covariates")
        cluster_var = request.data.get("cluster_var")
        expert_mode = request.data.get("expert_mode", False)

        if not data or not outcome or not treatment_group or not post_period:
            return Response(
                {"error": "data, outcome, treatment_group, and post_period are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            df = pd.DataFrame(data)

            result = difference_in_differences(
                data=df,
                outcome=outcome,
                treatment_group=treatment_group,
                post_period=post_period,
                covariates=covariates,
                cluster_var=cluster_var,
            )

            # Add Guardian context (DESIGN CONTRACT COMPLIANCE)
            guardian_data = [df[outcome].dropna().values]
            enriched_response = _create_guardian_enriched_response(
                statistical_result=result.to_dict(),
                guardian_data=guardian_data,
                test_type="difference_in_differences",
                expert_mode=expert_mode,
            )

            return Response(enriched_response, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"DiD analysis failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class EventStudyView(APIView):
    """Perform event study analysis."""

    parser_classes = [JSONParser]

    def post(self, request):
        """
        Perform event study with dynamic treatment effects.

        Request body:
        {
            "data": [...],
            "outcome": "Y",
            "treatment_group": "treated",
            "time_var": "year",
            "treatment_time": 2020,
            "unit_var": "state" (optional),
            "pre_periods": 4,
            "post_periods": 4
        }
        """
        from .services.causal.did import event_study

        data = request.data.get("data")
        outcome = request.data.get("outcome")
        treatment_group = request.data.get("treatment_group")
        time_var = request.data.get("time_var")
        treatment_time = request.data.get("treatment_time")
        unit_var = request.data.get("unit_var")
        pre_periods = request.data.get("pre_periods", 4)
        post_periods = request.data.get("post_periods", 4)

        if not data or not outcome or not treatment_group or not time_var:
            return Response(
                {"error": "data, outcome, treatment_group, and time_var are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            df = pd.DataFrame(data)

            result = event_study(
                data=df,
                outcome=outcome,
                treatment_group=treatment_group,
                time_var=time_var,
                treatment_time=treatment_time,
                unit_var=unit_var,
                pre_periods=pre_periods,
                post_periods=post_periods,
            )

            return Response(result.to_dict(), status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Event study failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ParallelTrendsTestView(APIView):
    """Test parallel trends assumption."""

    parser_classes = [JSONParser]

    def post(self, request):
        """
        Test parallel trends assumption for DiD.

        Request body:
        {
            "data": [...],
            "outcome": "Y",
            "treatment_group": "treated",
            "post_period": "post",
            "time_var": "year" (optional)
        }
        """
        from .services.causal.did import test_parallel_trends_simple

        data = request.data.get("data")
        outcome = request.data.get("outcome")
        treatment_group = request.data.get("treatment_group")
        post_period = request.data.get("post_period")
        time_var = request.data.get("time_var")

        if not data or not outcome or not treatment_group or not post_period:
            return Response(
                {"error": "data, outcome, treatment_group, and post_period are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            df = pd.DataFrame(data)

            result = test_parallel_trends_simple(
                data=df, outcome=outcome, treatment_group=treatment_group, post_period=post_period, time_var=time_var
            )

            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Parallel trends test failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class StaggeredDiDView(APIView):
    """Perform staggered DiD (Callaway & Sant'Anna approach)."""

    parser_classes = [JSONParser]

    def post(self, request):
        """
        Staggered adoption DiD.

        Request body:
        {
            "data": [...],
            "outcome": "Y",
            "unit_var": "unit_id",
            "time_var": "year",
            "treatment_time_var": "adoption_year",
            "control_group": "never_treated"
        }
        """
        from .services.causal.did import staggered_did

        data = request.data.get("data")
        outcome = request.data.get("outcome")
        unit_var = request.data.get("unit_var")
        time_var = request.data.get("time_var")
        treatment_time_var = request.data.get("treatment_time_var")
        control_group = request.data.get("control_group", "never_treated")

        if not data or not outcome or not unit_var or not time_var or not treatment_time_var:
            return Response(
                {"error": "data, outcome, unit_var, time_var, and treatment_time_var are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            df = pd.DataFrame(data)

            result = staggered_did(
                data=df,
                outcome=outcome,
                unit_var=unit_var,
                time_var=time_var,
                treatment_time_var=treatment_time_var,
                control_group=control_group,
            )

            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Staggered DiD failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
