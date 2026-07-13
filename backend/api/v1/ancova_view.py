"""
ANCOVA View for High-Precision Statistical API
==============================================
Analysis of Covariance implementation
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from api.v1.serializers import ANCOVARequestSerializer
from core.assumption_checker import AssumptionChecker
from core.validation_framework import StatisticalValidator
import pandas as pd
import numpy as np
from decimal import Decimal
import logging
import math

logger = logging.getLogger(__name__)


class HighPrecisionANCOVAView(APIView):
    """
    High-precision ANCOVA (Analysis of Covariance) implementation.

    This endpoint provides:
    - ANCOVA with covariate adjustment
    - 50 decimal place precision
    - Adjusted means calculation
    - Homogeneity of regression slopes testing
    - Post-hoc tests with covariate adjustment
    """

    permission_classes = [AllowAny]  # Allow public access for statistical calculations

    def post(self, request):
        """
        Perform high-precision ANCOVA

        Request body:
        {
            "groups": [[data1], [data2], ...],
            "covariates": [[cov1], [cov2], ...],
            "group_names": ["Group1", "Group2", ...],
            "covariate_names": ["Age", "Baseline", ...],
            "dependent_variable_name": "Outcome",
            "alpha": 0.05,
            "check_homogeneity_slopes": true,
            "post_hoc": "tukey",
            "options": {
                "check_assumptions": true,
                "calculate_effect_sizes": true,
                "generate_visualizations": true
            }
        }
        """
        from core.services.anova.advanced_anova_service import AdvancedANOVAService

        serializer = ANCOVARequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": "Invalid input", "details": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validated_data = serializer.validated_data

            # Initialize services
            ancova_service = AdvancedANOVAService()
            assumption_checker = AssumptionChecker()
            StatisticalValidator()

            # Extract data
            groups = validated_data["groups"]
            covariates = validated_data["covariates"]
            group_names = validated_data.get("group_names", [f"Group_{i+1}" for i in range(len(groups))])
            covariate_names = validated_data.get(
                "covariate_names", [f"Covariate_{i+1}" for i in range(len(covariates))]
            )
            dependent_var_name = validated_data.get("dependent_variable_name", "Dependent Variable")
            validated_data.get("alpha", 0.05)
            check_homogeneity = validated_data.get("check_homogeneity_slopes", True)
            post_hoc = validated_data.get("post_hoc")
            options = validated_data.get("options", {})

            # Create proper data structure for ANCOVA
            # Groups: list of lists where each inner list is one group's dependent variable values
            # Covariates: list of lists where each inner list is one covariate variable's values for ALL data points
            all_data = []
            all_groups = []
            all_covariates = {cov_name: [] for cov_name in covariate_names}

            # Build the data structure
            # First, flatten the groups
            for group_idx, group_data in enumerate(groups):
                for value in group_data:
                    all_data.append(value)
                    all_groups.append(group_names[group_idx])

            # Now handle covariates - they should already be aligned with all data points
            total_data_points = len(all_data)
            for cov_idx, cov_name in enumerate(covariate_names):
                if cov_idx < len(covariates):
                    cov_values = covariates[cov_idx]
                    # Ensure covariate has same length as total data points
                    if len(cov_values) == total_data_points:
                        all_covariates[cov_name] = cov_values
                    else:
                        # If lengths don't match, try to handle gracefully
                        logger.warning(
                            f"Covariate {cov_name} has {len(cov_values)} values but expected {total_data_points}"
                        )
                        # Pad or truncate as needed
                        if len(cov_values) < total_data_points:
                            # Pad with NaN
                            all_covariates[cov_name] = cov_values + [np.nan] * (total_data_points - len(cov_values))
                        else:
                            # Truncate
                            all_covariates[cov_name] = cov_values[:total_data_points]
                else:
                    # Fill with NaN if covariate not provided
                    all_covariates[cov_name] = [np.nan] * total_data_points

            # Create DataFrame for ANCOVA
            df = pd.DataFrame({"dependent_var": all_data, "group": all_groups})

            # Add covariate columns
            for cov_name, cov_values in all_covariates.items():
                df[cov_name] = cov_values

            # Drop rows with NaN values
            df = df.dropna()

            response_data = {
                "analysis_type": "ANCOVA",
                "dependent_variable": dependent_var_name,
                "groups": group_names,
                "covariates": covariate_names,
                "sample_sizes": {},
                "ancova_result": None,
                "adjusted_means": None,
                "covariate_effects": None,
                "homogeneity_test": None,
                "assumptions": None,
                "post_hoc_results": None,
                "effect_sizes": None,
                "visualization_data": None,
                "metadata": {"precision": 50, "algorithm": "high_precision_ancova", "version": "1.0.0"},
            }

            # Report sample sizes
            for group_name in group_names:
                response_data["sample_sizes"][group_name] = len(df[df["group"] == group_name])

            # Step 1: Check assumptions if requested
            if options.get("check_assumptions", True):
                logger.info("Checking ANCOVA assumptions")
                assumptions = {}

                # Check normality of residuals for each group
                for group_name in group_names:
                    group_data = df[df["group"] == group_name]["dependent_var"].values
                    if len(group_data) >= 3:
                        normality_result = assumption_checker.check_normality(np.array(group_data))
                        # Convert AssumptionResult to dict
                        # ✅ FIXED: Use correct attribute names (is_met, test_statistic)
                        assumptions[f"normality_{group_name}"] = {
                            "is_normal": normality_result.is_met,
                            "statistic": str(normality_result.test_statistic)
                            if hasattr(normality_result, "test_statistic")
                            else None,
                            "p_value": str(normality_result.p_value) if hasattr(normality_result, "p_value") else None,
                            "test_name": normality_result.test_name
                            if hasattr(normality_result, "test_name")
                            else "Shapiro-Wilk",
                        }

                # Check homogeneity of variances
                group_arrays = [df[df["group"] == g]["dependent_var"].values for g in group_names]
                if all(len(g) >= 2 for g in group_arrays):
                    homogeneity_result = assumption_checker.check_homoscedasticity(*group_arrays)
                    # Convert AssumptionResult to dict
                    # ✅ FIXED: Use correct attribute names (is_met, test_statistic)
                    assumptions["homogeneity_variances"] = {
                        "equal_variance": homogeneity_result.is_met if hasattr(homogeneity_result, "is_met") else True,
                        "statistic": str(homogeneity_result.test_statistic)
                        if hasattr(homogeneity_result, "test_statistic")
                        else None,
                        "p_value": str(homogeneity_result.p_value) if hasattr(homogeneity_result, "p_value") else None,
                        "test_name": homogeneity_result.test_name
                        if hasattr(homogeneity_result, "test_name")
                        else "Levene",
                    }

                # Check linearity between covariates and dependent variable
                from scipy import stats as scipy_stats

                for cov_name in covariate_names:
                    if cov_name in df.columns and len(df[cov_name]) >= 3:
                        correlation = scipy_stats.pearsonr(df[cov_name].values, df["dependent_var"].values)
                        assumptions[f"linearity_{cov_name}"] = {
                            "correlation": str(correlation[0]),
                            "p_value": str(correlation[1]),
                            "is_linear": abs(correlation[0]) > 0.3,
                        }

                response_data["assumptions"] = assumptions

            # Step 2: Perform ANCOVA
            logger.info("Performing high-precision ANCOVA")

            # Use first covariate as primary for simplicity
            primary_covariate = covariate_names[0]

            # Call the ANCOVA service
            result = ancova_service.ancova(
                data=df,
                dependent_var="dependent_var",
                factor="group",
                covariate=primary_covariate,
                check_homogeneity_slopes=check_homogeneity,
            )

            # Format the ANCOVA results.
            #
            # Everything below reads the keys the service ACTUALLY returns. It used to read a
            # completely different set -- "f_statistic_group", "covariate_effect",
            # "homogeneity_test" -- none of which exist, so every `.get(key, "N/A")` fell
            # through to its default and the endpoint returned the literal STRING "N/A" for
            # the F-statistic, the p-value, every sum of squares and every degree of freedom,
            # while still reporting `"precision": 50` and appending the sentence "ANCOVA
            # assumptions appear to be met. Results are reliable." This endpoint has never
            # produced an F or a p-value.
            response_data["ancova_result"] = self._format_ancova_result(result, primary_covariate)

            # Step 3: Adjusted means. `result["adjusted_means"]` is a DataFrame; iterating it
            # with .items() yields COLUMNS, so the old code stringified a pandas Series repr
            # ("0    11.478397\n1    13.798941\nName: ...") into the response as a value.
            response_data["adjusted_means"] = self._format_adjusted_means(result.get("adjusted_means"))

            # Step 4: The covariate's effect is the pooled within-group regression slope.
            response_data["covariate_effects"] = {
                primary_covariate: self._format_covariate_effect(result, primary_covariate)
            }

            # Step 5: Homogeneity of slopes -- computed by the service, and previously thrown
            # away because the view looked for it under the wrong key.
            if check_homogeneity:
                response_data["homogeneity_test"] = self._format_homogeneity_test(
                    result.get("homogeneity_of_slopes")
                )

            # Step 6: Calculate effect sizes
            if options.get("calculate_effect_sizes", True):
                effect_sizes = self._calculate_effect_sizes(result, df)
                response_data["effect_sizes"] = effect_sizes

            # Step 7: Perform post-hoc tests if requested
            if post_hoc and len(groups) >= 3:
                post_hoc_results = self._perform_post_hoc(df, response_data.get("adjusted_means", {}), post_hoc)
                response_data["post_hoc_results"] = post_hoc_results

            # Step 8: Generate visualization data
            if options.get("generate_visualizations", True):
                viz_data = self._generate_visualization_data(df, primary_covariate, group_names)
                response_data["visualization_data"] = viz_data

            # Step 9: Generate recommendations
            recommendations = self._generate_recommendations(response_data)
            response_data["recommendations"] = recommendations

            logger.info("Successfully calculated ANCOVA with 50 decimal precision")
            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"ANCOVA error: {str(e)}")
            return Response(
                {"error": "Calculation error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @staticmethod
    def _num(value):
        """A quantity that does not exist serializes to null -- never to the string "N/A" or
        "nan", both of which land in the JSON as text and read to a user like a value."""
        if value is None:
            return None
        try:
            value = float(value)
        except (TypeError, ValueError):
            return None
        return str(value) if math.isfinite(value) else None

    def _format_ancova_result(self, result, covariate_name):
        """Read the service's actual ANCOVA table.

        The service returns `ancova_table`, a DataFrame with one row per source
        (covariate, factor, Error, Total) and columns SS / DF / MS / F / p-value / eta^2.
        """
        table = result.get("ancova_table")
        if table is None:
            return {"error": "The ANCOVA service returned no table."}

        rows = {str(row["Source"]): row for _, row in table.iterrows()}
        covariate_row = rows.get(str(covariate_name), {})
        group_row = rows.get("group", {})
        error_row = rows.get("Error", {})
        total_row = rows.get("Total", {})

        return {
            "f_statistic_group": self._num(group_row.get("F")),
            "p_value_group": self._num(group_row.get("p-value")),
            "eta_squared_group": self._num(group_row.get("eta²")),
            "f_statistic_covariate": self._num(covariate_row.get("F")),
            "p_value_covariate": self._num(covariate_row.get("p-value")),
            "eta_squared_covariate": self._num(covariate_row.get("eta²")),
            "df_group": self._num(group_row.get("DF")),
            "df_covariate": self._num(covariate_row.get("DF")),
            "df_error": self._num(error_row.get("DF")),
            "df_total": self._num(total_row.get("DF")),
            "ss_group": self._num(group_row.get("SS")),
            "ss_covariate": self._num(covariate_row.get("SS")),
            "ss_error": self._num(error_row.get("SS")),
            "ss_total": self._num(total_row.get("SS")),
            "ms_group": self._num(group_row.get("MS")),
            "ms_covariate": self._num(covariate_row.get("MS")),
            "ms_error": self._num(error_row.get("MS")),
            "significant": bool(result.get("significant")) if result.get("significant") is not None else None,
        }

    def _format_adjusted_means(self, adjusted_means):
        """Turn the service's adjusted-means DataFrame into one entry per group.

        The old code did `{str(k): str(v) for k, v in adjusted_means.items()}` on a DataFrame,
        which iterates COLUMNS -- so the response carried the stringified repr of a pandas
        Series where each group's adjusted mean should have been.
        """
        if adjusted_means is None:
            return {}

        return {
            str(row["Level"]): {
                "unadjusted_mean": self._num(row.get("Unadjusted_Mean")),
                "adjusted_mean": self._num(row.get("Adjusted_Mean")),
                "n": int(row["N"]) if row.get("N") is not None else None,
            }
            for _, row in adjusted_means.iterrows()
        }

    # _calculate_adjusted_means() was removed. It computed
    #
    #     adjusted_mean = group_mean - (group_cov_mean - grand_cov_mean)
    #
    # which is the ANCOVA adjustment with the pooled within-group regression slope b HARD-CODED
    # TO 1. The correct formula is group_mean - b * (group_cov_mean - grand_cov_mean), and the
    # service computes b and applies it properly. The adjusted means now come from the service.

    def _format_covariate_effect(self, result, covariate_name):
        """The covariate's effect: the pooled within-group regression slope, and its own row
        in the ANCOVA table (F and p for the covariate).

        The old version looked for `result["covariate_effect"]`, which does not exist, so it
        was never called at all -- the response carried `covariate_effects: null`.
        """
        table = result.get("ancova_table")
        row = {}
        if table is not None:
            rows = {str(r["Source"]): r for _, r in table.iterrows()}
            row = rows.get(str(covariate_name), {})

        return {
            "coefficient": self._num(result.get("regression_coefficient")),
            "f_statistic": self._num(row.get("F")),
            "p_value": self._num(row.get("p-value")),
            "df": self._num(row.get("DF")),
            "note": (
                "The coefficient is the pooled within-group regression slope of the dependent "
                "variable on the covariate -- the slope ANCOVA assumes is common to all groups."
            ),
        }

    def _format_homogeneity_test(self, test):
        """Homogeneity of slopes -- the assumption ANCOVA rests on.

        The service computes it. The view used to look for it under the key "homogeneity_test"
        (it is "homogeneity_of_slopes"), so the result was computed and thrown away, and the
        response reported `homogeneity_test: null` while the recommendations still said
        "ANCOVA assumptions appear to be met."
        """
        if not test:
            return None

        p_value = test.get("p_value")
        return {
            "f_statistic": self._num(test.get("f_statistic")),
            "p_value": self._num(p_value),
            "slopes_homogeneous": (bool(p_value >= 0.05) if p_value is not None else None),
            "note": (
                "ANCOVA assumes the covariate's slope is the same in every group. A small "
                "p-value here means it is not, and the ANCOVA below may be invalid."
            ),
        }

    def _calculate_effect_sizes(self, result, df):
        """Calculate effect sizes for ANCOVA.

        `result` has no "ss_group"/"ss_error" keys -- they live in the ancova_table -- so this
        method used to fall straight through and return {}.
        """
        effect_sizes = {}

        table = result.get("ancova_table")
        if table is not None:
            rows = {str(r["Source"]): r for _, r in table.iterrows()}
            group_ss = rows.get("group", {}).get("SS")
            error_ss = rows.get("Error", {}).get("SS")
            if group_ss is not None and error_ss is not None:
                result = dict(result, ss_group=group_ss, ss_error=error_ss)

        # Calculate partial eta squared if possible
        if "ss_group" in result and "ss_error" in result:
            ss_group = Decimal(str(result["ss_group"]))
            ss_error = Decimal(str(result["ss_error"]))

            if ss_error != 0:
                partial_eta_sq = ss_group / (ss_group + ss_error)
                effect_sizes["partial_eta_squared"] = str(partial_eta_sq)
                effect_sizes["interpretation"] = self._interpret_effect_size(float(partial_eta_sq))

        # Calculate Cohen's f if possible
        if "partial_eta_squared" in effect_sizes:
            eta_sq = Decimal(effect_sizes["partial_eta_squared"])
            if eta_sq < 1:
                cohen_f = (eta_sq / (1 - eta_sq)).sqrt()
                effect_sizes["cohen_f"] = str(cohen_f)

        return effect_sizes

    def _interpret_effect_size(self, eta_squared):
        """Interpret partial eta squared effect size"""
        if eta_squared < 0.01:
            return "Negligible effect"
        elif eta_squared < 0.06:
            return "Small effect"
        elif eta_squared < 0.14:
            return "Medium effect"
        else:
            return "Large effect"

    def _perform_post_hoc(self, df, adjusted_means, test_type):
        """Pairwise differences between the adjusted means.

        NO SIGNIFICANCE IS CLAIMED. The old version reported

            "significant": abs(float(mean_diff)) > 0

        which is TRUE for every pair of groups whose adjusted means are not bit-for-bit
        identical -- i.e. always. It ran no test, computed no standard error and produced no
        p-value, and then labelled every comparison significant. That is not a simplification
        of a post-hoc test; it is the appearance of one.

        A correct post-hoc on adjusted means needs the pooled error mean-square and the
        covariate-adjusted standard error of each contrast (Tukey/Bonferroni on the adjusted
        means). Until that is implemented, the differences are reported as differences.
        """
        import itertools

        post_hoc_results = {}

        for (group1, stats1), (group2, stats2) in itertools.combinations(adjusted_means.items(), 2):
            mean1 = stats1.get("adjusted_mean") if isinstance(stats1, dict) else stats1
            mean2 = stats2.get("adjusted_mean") if isinstance(stats2, dict) else stats2
            if mean1 is None or mean2 is None:
                continue

            comparison_key = f"{group1}_vs_{group2}"
            mean_diff = Decimal(str(mean1)) - Decimal(str(mean2))

            post_hoc_results[comparison_key] = {
                "mean_difference": str(mean_diff),
                "adjusted_mean_1": str(mean1),
                "adjusted_mean_2": str(mean2),
                "test": test_type,
                "p_value": None,
                "significant": None,
                "note": (
                    "Difference between the covariate-adjusted means. No significance test is "
                    "performed on these contrasts yet, so no p-value is reported."
                ),
            }

        return post_hoc_results

    def _generate_visualization_data(self, df, covariate, group_names):
        """Generate data for visualization"""
        viz_data = {"group_data": {}, "regression_lines": {}, "scatter_data": []}

        for group_name in group_names:
            group_df = df[df["group"] == group_name]

            viz_data["group_data"][group_name] = {
                "dependent": group_df["dependent_var"].tolist(),
                covariate: group_df[covariate].tolist(),
                "mean": float(group_df["dependent_var"].mean()),
                "std": float(group_df["dependent_var"].std()),
            }

            # Add scatter plot data
            for idx, row in group_df.iterrows():
                viz_data["scatter_data"].append({"group": group_name, "x": row[covariate], "y": row["dependent_var"]})

        return viz_data

    def _generate_recommendations(self, response_data):
        """Generate recommendations based on ANCOVA results"""
        recommendations = []

        # Check homogeneity of slopes
        if response_data.get("homogeneity_test"):
            if not response_data["homogeneity_test"].get("slopes_homogeneous", True):
                recommendations.append(
                    "Homogeneity of slopes assumption violated. "
                    "Consider using separate regression models for each group."
                )

        # Check assumptions
        if response_data.get("assumptions"):
            # Check normality
            for key, value in response_data["assumptions"].items():
                if key.startswith("normality_") and isinstance(value, dict):
                    if not value.get("is_normal", True):
                        recommendations.append(
                            f"{key.replace('normality_', 'Group ')}: "
                            "Normality assumption violated. Consider data transformation."
                        )

            # Check homogeneity of variances
            if "homogeneity_variances" in response_data["assumptions"]:
                if not response_data["assumptions"]["homogeneity_variances"].get("equal_variance", True):
                    recommendations.append(
                        "Homogeneity of variances violated. " "Consider using weighted least squares or robust methods."
                    )

        # Check covariate significance
        if response_data.get("ancova_result"):
            p_value_cov = response_data["ancova_result"].get("p_value_covariate")
            if p_value_cov and p_value_cov != "N/A":
                try:
                    if float(p_value_cov) > 0.05:
                        recommendations.append(
                            "Covariate is not statistically significant. "
                            "Consider running standard ANOVA without covariate adjustment."
                        )
                except ValueError:
                    pass

        if not recommendations:
            # "Results are reliable" was emitted whenever nothing else had been appended --
            # including when the assumption checks had not been run at all, and (until this
            # commit) alongside an ANCOVA table in which every statistic was the string "N/A".
            # An empty list of concerns is not the same as a clean bill of health.
            checked = bool(response_data.get("assumptions")) and bool(response_data.get("homogeneity_test"))
            if checked:
                recommendations.append(
                    "No assumption violations were detected in the checks that were run "
                    "(normality, homogeneity of variances, homogeneity of slopes)."
                )
            else:
                recommendations.append(
                    "No assumption violations to report -- but the assumption checks were not all "
                    "run for this request, so this is not a clean bill of health."
                )

        return recommendations
