"""
APA Report Generator

Generates publication-ready statistical reports following APA 7th edition guidelines.

Features:
- Methods section generation
- Results section with proper statistical notation
- Table formatting
- AI-enhanced writing
- Multiple export formats

Author: StickForStats Team
Created: December 27, 2025

References:
    American Psychological Association. (2020). Publication manual of the
    American Psychological Association (7th ed.).
"""

import logging
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class ReportSection(Enum):
    """Types of report sections."""

    METHODS = "methods"
    RESULTS = "results"
    DISCUSSION = "discussion"
    ABSTRACT = "abstract"
    TABLE = "table"
    FIGURE_CAPTION = "figure_caption"


class StatisticalTest(Enum):
    """Supported statistical tests for reporting."""

    T_TEST_INDEPENDENT = "independent_t_test"
    T_TEST_PAIRED = "paired_t_test"
    T_TEST_ONE_SAMPLE = "one_sample_t_test"
    ANOVA_ONE_WAY = "one_way_anova"
    ANOVA_TWO_WAY = "two_way_anova"
    ANOVA_REPEATED = "repeated_measures_anova"
    CORRELATION_PEARSON = "pearson_correlation"
    CORRELATION_SPEARMAN = "spearman_correlation"
    REGRESSION_LINEAR = "linear_regression"
    REGRESSION_LOGISTIC = "logistic_regression"
    CHI_SQUARE = "chi_square"
    MANN_WHITNEY = "mann_whitney"
    WILCOXON = "wilcoxon"
    KRUSKAL_WALLIS = "kruskal_wallis"
    MIXED_MODEL = "mixed_model"
    MEDIATION = "mediation"
    DID = "difference_in_differences"


@dataclass
class StatisticalResult:
    """Represents a statistical result for reporting."""

    test_type: StatisticalTest
    test_statistic: float
    test_statistic_name: str  # e.g., "t", "F", "r", "χ²"
    df: Optional[Union[int, float, tuple]] = None
    p_value: float = None
    effect_size: Optional[float] = None
    effect_size_name: Optional[str] = None  # e.g., "d", "η²", "r²"
    effect_size_ci: Optional[tuple] = None
    mean_1: Optional[float] = None
    mean_2: Optional[float] = None
    sd_1: Optional[float] = None
    sd_2: Optional[float] = None
    n_1: Optional[int] = None
    n_2: Optional[int] = None
    n_total: Optional[int] = None
    ci_lower: Optional[float] = None
    ci_upper: Optional[float] = None
    additional_stats: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ReportContent:
    """Generated report content."""

    section_type: ReportSection
    content: str
    raw_stats: Optional[Dict[str, Any]] = None
    formatting_notes: List[str] = field(default_factory=list)
    latex_version: Optional[str] = None
    word_version: Optional[str] = None


class APAReportGenerator:
    """
    Generate APA 7th edition compliant statistical reports.

    Features:
    - Proper statistical notation with italics
    - Effect size reporting
    - Confidence interval inclusion
    - Methods and Results sections
    - Table generation
    """

    # APA formatting templates
    TEMPLATES = {
        StatisticalTest.T_TEST_INDEPENDENT: {
            "notation": "t({df}) = {t:.2f}, p {p_symbol} {p:.3f}",
            "with_effect": "t({df}) = {t:.2f}, p {p_symbol} {p:.3f}, d = {d:.2f}",
            "full": "t({df}) = {t:.2f}, p {p_symbol} {p:.3f}, d = {d:.2f}, 95% CI [{ci_l:.2f}, {ci_u:.2f}]",
        },
        StatisticalTest.T_TEST_PAIRED: {
            "notation": "t({df}) = {t:.2f}, p {p_symbol} {p:.3f}",
            "with_effect": "t({df}) = {t:.2f}, p {p_symbol} {p:.3f}, d = {d:.2f}",
            "full": "t({df}) = {t:.2f}, p {p_symbol} {p:.3f}, d = {d:.2f}, 95% CI [{ci_l:.2f}, {ci_u:.2f}]",
        },
        StatisticalTest.ANOVA_ONE_WAY: {
            "notation": "F({df1}, {df2}) = {F:.2f}, p {p_symbol} {p:.3f}",
            "with_effect": "F({df1}, {df2}) = {F:.2f}, p {p_symbol} {p:.3f}, η² = {eta:.2f}",
            "full": "F({df1}, {df2}) = {F:.2f}, p {p_symbol} {p:.3f}, η² = {eta:.2f}, 95% CI [{ci_l:.2f}, {ci_u:.2f}]",
        },
        StatisticalTest.CORRELATION_PEARSON: {
            "notation": "r({df}) = {r:.2f}, p {p_symbol} {p:.3f}",
            "with_effect": "r({df}) = {r:.2f}, p {p_symbol} {p:.3f}",
            "full": "r({df}) = {r:.2f}, p {p_symbol} {p:.3f}, 95% CI [{ci_l:.2f}, {ci_u:.2f}]",
        },
        StatisticalTest.REGRESSION_LINEAR: {
            "notation": "β = {beta:.2f}, t({df}) = {t:.2f}, p {p_symbol} {p:.3f}",
            "model": "R² = {r2:.2f}, F({df1}, {df2}) = {F:.2f}, p {p_symbol} {p:.3f}",
            "full": "β = {beta:.2f}, t({df}) = {t:.2f}, p {p_symbol} {p:.3f}, 95% CI [{ci_l:.2f}, {ci_u:.2f}]",
        },
        StatisticalTest.CHI_SQUARE: {
            "notation": "χ²({df}) = {chi2:.2f}, p {p_symbol} {p:.3f}",
            "with_effect": "χ²({df}) = {chi2:.2f}, p {p_symbol} {p:.3f}, V = {V:.2f}",
            "full": "χ²({df}) = {chi2:.2f}, p {p_symbol} {p:.3f}, V = {V:.2f}",
        },
        StatisticalTest.MANN_WHITNEY: {
            "notation": "U = {U:.0f}, p {p_symbol} {p:.3f}",
            "with_effect": "U = {U:.0f}, p {p_symbol} {p:.3f}, r = {r:.2f}",
            "full": "U = {U:.0f}, p {p_symbol} {p:.3f}, r = {r:.2f}",
        },
        StatisticalTest.MEDIATION: {
            "indirect": "indirect effect = {indirect:.3f}, 95% CI [{ci_l:.3f}, {ci_u:.3f}]",
            "sobel": "Sobel z = {z:.2f}, p {p_symbol} {p:.3f}",
            "full": "a = {a:.3f}, b = {b:.3f}, c' = {c_prime:.3f}, indirect = {indirect:.3f}, 95% CI [{ci_l:.3f}, {ci_u:.3f}]",
        },
        StatisticalTest.DID: {
            "notation": "DiD = {did:.3f}, SE = {se:.3f}, t = {t:.2f}, p {p_symbol} {p:.3f}",
            "full": "DiD = {did:.3f}, SE = {se:.3f}, t = {t:.2f}, p {p_symbol} {p:.3f}, 95% CI [{ci_l:.3f}, {ci_u:.3f}]",
        },
    }

    # Effect size interpretation benchmarks (Cohen, 1988)
    EFFECT_SIZE_BENCHMARKS = {
        "d": {"small": 0.2, "medium": 0.5, "large": 0.8},
        "r": {"small": 0.1, "medium": 0.3, "large": 0.5},
        "eta_squared": {"small": 0.01, "medium": 0.06, "large": 0.14},
        "omega_squared": {"small": 0.01, "medium": 0.06, "large": 0.14},
        "V": {"small": 0.1, "medium": 0.3, "large": 0.5},
    }

    def __init__(self):
        """Initialize the APA report generator."""

    def format_statistic(
        self, result: StatisticalResult, include_effect_size: bool = True, include_ci: bool = True
    ) -> str:
        """
        Format a statistical result in APA style.

        Args:
            result: The statistical result to format
            include_effect_size: Whether to include effect size
            include_ci: Whether to include confidence intervals

        Returns:
            APA-formatted string
        """
        template_set = self.TEMPLATES.get(result.test_type, {})

        if not template_set:
            return self._format_generic(result, include_effect_size, include_ci)

        # Determine p-value symbol
        p_symbol = self._get_p_symbol(result.p_value)

        # Build format parameters
        params = {"p": result.p_value if result.p_value >= 0.001 else 0.001, "p_symbol": p_symbol}

        # Add test-specific parameters
        if result.test_type in [StatisticalTest.T_TEST_INDEPENDENT, StatisticalTest.T_TEST_PAIRED]:
            params["t"] = result.test_statistic
            params["df"] = result.df
            if result.effect_size:
                params["d"] = result.effect_size
            if result.ci_lower is not None:
                params["ci_l"] = result.ci_lower
                params["ci_u"] = result.ci_upper

        elif result.test_type in [StatisticalTest.ANOVA_ONE_WAY, StatisticalTest.ANOVA_TWO_WAY]:
            params["F"] = result.test_statistic
            if isinstance(result.df, tuple):
                params["df1"] = result.df[0]
                params["df2"] = result.df[1]
            else:
                params["df1"] = result.df
                params["df2"] = result.additional_stats.get("df_error", "")
            if result.effect_size:
                params["eta"] = result.effect_size
            if result.ci_lower is not None:
                params["ci_l"] = result.ci_lower
                params["ci_u"] = result.ci_upper

        elif result.test_type == StatisticalTest.CORRELATION_PEARSON:
            params["r"] = result.test_statistic
            params["df"] = result.df
            if result.ci_lower is not None:
                params["ci_l"] = result.ci_lower
                params["ci_u"] = result.ci_upper

        elif result.test_type == StatisticalTest.CHI_SQUARE:
            params["chi2"] = result.test_statistic
            params["df"] = result.df
            if result.effect_size:
                params["V"] = result.effect_size

        elif result.test_type == StatisticalTest.MANN_WHITNEY:
            params["U"] = result.test_statistic
            if result.effect_size:
                params["r"] = result.effect_size

        elif result.test_type == StatisticalTest.MEDIATION:
            params.update(result.additional_stats)
            params["indirect"] = result.test_statistic
            if result.ci_lower is not None:
                params["ci_l"] = result.ci_lower
                params["ci_u"] = result.ci_upper

        elif result.test_type == StatisticalTest.DID:
            params["did"] = result.test_statistic
            params["se"] = result.additional_stats.get("se", 0)
            params["t"] = result.additional_stats.get("t", 0)
            if result.ci_lower is not None:
                params["ci_l"] = result.ci_lower
                params["ci_u"] = result.ci_upper

        # Select appropriate template
        if include_ci and include_effect_size and "full" in template_set:
            template = template_set["full"]
        elif include_effect_size and "with_effect" in template_set:
            template = template_set["with_effect"]
        else:
            template = template_set.get("notation", "")

        try:
            return template.format(**params)
        except (KeyError, ValueError) as e:
            logger.warning(f"Template formatting failed: {e}")
            return self._format_generic(result, include_effect_size, include_ci)

    def _format_generic(self, result: StatisticalResult, include_effect_size: bool, include_ci: bool) -> str:
        """Generic formatting for unrecognized test types."""
        parts = []

        # Test statistic
        if result.test_statistic_name and result.test_statistic is not None:
            if result.df:
                parts.append(f"{result.test_statistic_name}({result.df}) = {result.test_statistic:.2f}")
            else:
                parts.append(f"{result.test_statistic_name} = {result.test_statistic:.2f}")

        # P-value
        if result.p_value is not None:
            p_symbol = self._get_p_symbol(result.p_value)
            p_val = result.p_value if result.p_value >= 0.001 else 0.001
            parts.append(f"p {p_symbol} {p_val:.3f}")

        # Effect size
        if include_effect_size and result.effect_size is not None:
            es_name = result.effect_size_name or "d"
            parts.append(f"{es_name} = {result.effect_size:.2f}")

        # Confidence interval
        if include_ci and result.ci_lower is not None:
            parts.append(f"95% CI [{result.ci_lower:.2f}, {result.ci_upper:.2f}]")

        return ", ".join(parts)

    def _get_p_symbol(self, p_value: float) -> str:
        """Get the appropriate p-value symbol."""
        if p_value < 0.001:
            return "<"
        elif p_value == 1.0:
            return "="
        else:
            return "="

    def interpret_effect_size(self, effect_size: float, effect_type: str = "d") -> str:
        """
        Interpret effect size magnitude.

        Args:
            effect_size: The effect size value
            effect_type: Type of effect size (d, r, eta_squared, etc.)

        Returns:
            Interpretation string
        """
        benchmarks = self.EFFECT_SIZE_BENCHMARKS.get(effect_type, self.EFFECT_SIZE_BENCHMARKS["d"])

        abs_effect = abs(effect_size)

        if abs_effect < benchmarks["small"]:
            return "negligible"
        elif abs_effect < benchmarks["medium"]:
            return "small"
        elif abs_effect < benchmarks["large"]:
            return "medium"
        else:
            return "large"

    def generate_methods_section(
        self,
        test_type: StatisticalTest,
        sample_info: Dict[str, Any],
        variables: Dict[str, str],
        assumptions_checked: List[str],
        alpha: float = 0.05,
    ) -> ReportContent:
        """
        Generate a Methods section paragraph.

        Args:
            test_type: The statistical test used
            sample_info: Sample size and demographic info
            variables: Variable names and roles
            assumptions_checked: List of assumptions that were checked
            alpha: Significance level

        Returns:
            ReportContent with Methods section
        """
        content_parts = []

        # Participants/Sample
        n = sample_info.get("n", sample_info.get("n_total", ""))
        content_parts.append(f"The sample consisted of {n} participants.")

        if sample_info.get("groups"):
            groups = sample_info["groups"]
            group_desc = ", ".join([f"{k} (n = {v})" for k, v in groups.items()])
            content_parts.append(f"Participants were assigned to groups: {group_desc}.")

        # Variables
        dv = variables.get("dependent", variables.get("outcome", ""))
        iv = variables.get("independent", variables.get("predictor", variables.get("grouping", "")))

        if dv and iv:
            content_parts.append(f"The dependent variable was {dv}, and the independent variable was {iv}.")
        elif dv:
            content_parts.append(f"The outcome variable was {dv}.")

        # Analysis approach
        test_descriptions = {
            StatisticalTest.T_TEST_INDEPENDENT: "An independent samples t-test was conducted",
            StatisticalTest.T_TEST_PAIRED: "A paired samples t-test was conducted",
            StatisticalTest.ANOVA_ONE_WAY: "A one-way analysis of variance (ANOVA) was conducted",
            StatisticalTest.ANOVA_TWO_WAY: "A two-way analysis of variance (ANOVA) was conducted",
            StatisticalTest.CORRELATION_PEARSON: "A Pearson correlation analysis was conducted",
            StatisticalTest.REGRESSION_LINEAR: "A linear regression analysis was conducted",
            StatisticalTest.CHI_SQUARE: "A chi-square test of independence was conducted",
            StatisticalTest.MANN_WHITNEY: "A Mann-Whitney U test was conducted",
            StatisticalTest.MIXED_MODEL: "A linear mixed-effects model was estimated",
            StatisticalTest.MEDIATION: "A mediation analysis was conducted",
            StatisticalTest.DID: "A difference-in-differences analysis was conducted",
        }

        test_desc = test_descriptions.get(test_type, "Statistical analysis was performed")
        content_parts.append(f"{test_desc} to examine the relationship between the variables.")

        # Assumptions
        if assumptions_checked:
            assumptions_str = ", ".join(assumptions_checked[:-1])
            if len(assumptions_checked) > 1:
                assumptions_str += f", and {assumptions_checked[-1]}"
            else:
                assumptions_str = assumptions_checked[0]
            content_parts.append(f"Assumptions of {assumptions_str} were evaluated prior to analysis.")

        # Alpha level
        content_parts.append(f"Statistical significance was set at α = {alpha}.")

        # Effect size mention
        content_parts.append("Effect sizes are reported to assess practical significance.")

        return ReportContent(
            section_type=ReportSection.METHODS,
            content=" ".join(content_parts),
            formatting_notes=[
                "Use italics for statistical symbols (t, F, p, etc.)",
                "Report exact p-values to three decimal places",
                "Include effect sizes with confidence intervals",
            ],
        )

    def generate_results_section(
        self, result: StatisticalResult, descriptives: Optional[Dict[str, Any]] = None, hypothesis: Optional[str] = None
    ) -> ReportContent:
        """
        Generate a Results section paragraph.

        Args:
            result: The statistical result
            descriptives: Descriptive statistics (means, SDs)
            hypothesis: The hypothesis being tested

        Returns:
            ReportContent with Results section
        """
        content_parts = []

        # Descriptive statistics
        if descriptives:
            if "group_1" in descriptives and "group_2" in descriptives:
                g1 = descriptives["group_1"]
                g2 = descriptives["group_2"]
                content_parts.append(
                    f"The {g1.get('name', 'first group')} (M = {g1.get('mean', 0):.2f}, "
                    f"SD = {g1.get('sd', 0):.2f}) was compared to the "
                    f"{g2.get('name', 'second group')} (M = {g2.get('mean', 0):.2f}, "
                    f"SD = {g2.get('sd', 0):.2f})."
                )
            elif result.mean_1 is not None and result.mean_2 is not None:
                content_parts.append(
                    f"Group 1 (M = {result.mean_1:.2f}, SD = {result.sd_1:.2f}) was compared to "
                    f"Group 2 (M = {result.mean_2:.2f}, SD = {result.sd_2:.2f})."
                )

        # Main result
        stat_string = self.format_statistic(result, include_effect_size=True, include_ci=True)

        # Significance interpretation
        if result.p_value < 0.05:
            sig_phrase = "Results indicated a statistically significant"
        else:
            sig_phrase = "Results did not indicate a statistically significant"

        # Effect size interpretation
        if result.effect_size:
            effect_interp = self.interpret_effect_size(result.effect_size, result.effect_size_name or "d")
            effect_phrase = f", with a {effect_interp} effect size"
        else:
            effect_phrase = ""

        # Build the main sentence based on test type
        if result.test_type in [StatisticalTest.T_TEST_INDEPENDENT, StatisticalTest.T_TEST_PAIRED]:
            content_parts.append(f"{sig_phrase} difference between the groups{effect_phrase}, {stat_string}.")
        elif result.test_type == StatisticalTest.CORRELATION_PEARSON:
            if result.p_value < 0.05:
                direction = "positive" if result.test_statistic > 0 else "negative"
                strength = self.interpret_effect_size(abs(result.test_statistic), "r")
                content_parts.append(
                    f"There was a statistically significant {strength} {direction} correlation, {stat_string}."
                )
            else:
                content_parts.append(f"The correlation was not statistically significant, {stat_string}.")
        elif result.test_type in [StatisticalTest.ANOVA_ONE_WAY, StatisticalTest.ANOVA_TWO_WAY]:
            content_parts.append(f"{sig_phrase} effect{effect_phrase}, {stat_string}.")
        elif result.test_type == StatisticalTest.MEDIATION:
            indirect = result.test_statistic
            if result.ci_lower is not None and result.ci_upper is not None:
                if result.ci_lower * result.ci_upper > 0:  # CI doesn't include zero
                    content_parts.append(
                        f"The indirect effect was statistically significant (indirect effect = {indirect:.3f}, "
                        f"95% CI [{result.ci_lower:.3f}, {result.ci_upper:.3f}]), "
                        "indicating significant mediation."
                    )
                else:
                    content_parts.append(
                        f"The indirect effect was not statistically significant (indirect effect = {indirect:.3f}, "
                        f"95% CI [{result.ci_lower:.3f}, {result.ci_upper:.3f}]), "
                        "indicating no significant mediation."
                    )
        elif result.test_type == StatisticalTest.DID:
            content_parts.append(
                f"The difference-in-differences estimate was {stat_string}, "
                f"{'indicating a significant treatment effect' if result.p_value < 0.05 else 'indicating no significant treatment effect'}."
            )
        else:
            content_parts.append(f"The analysis yielded: {stat_string}.")

        return ReportContent(
            section_type=ReportSection.RESULTS,
            content=" ".join(content_parts),
            raw_stats={
                "test_type": result.test_type.value,
                "statistic": result.test_statistic,
                "p_value": result.p_value,
                "effect_size": result.effect_size,
            },
            formatting_notes=[
                "Italicize statistical symbols",
                "Report means and SDs in parentheses",
                "Include exact p-values (p < .001 for very small values)",
            ],
        )

    def generate_table(self, data: List[Dict[str, Any]], title: str, note: Optional[str] = None) -> ReportContent:
        """
        Generate an APA-formatted table.

        Args:
            data: List of dictionaries with row data
            title: Table title
            note: Optional table note

        Returns:
            ReportContent with table
        """
        if not data:
            return ReportContent(
                section_type=ReportSection.TABLE, content="No data provided for table.", formatting_notes=[]
            )

        # Get column headers
        headers = list(data[0].keys())

        # Build table
        lines = []
        lines.append("Table X")
        lines.append(f"{title}")
        lines.append("")

        # Header row
        header_row = "  ".join(h.center(12) for h in headers)
        lines.append(header_row)
        lines.append("-" * len(header_row))

        # Data rows
        for row in data:
            values = []
            for h in headers:
                val = row.get(h, "")
                if isinstance(val, float):
                    values.append(f"{val:.2f}".center(12))
                else:
                    values.append(str(val).center(12))
            lines.append("  ".join(values))

        lines.append("-" * len(header_row))

        # Note
        if note:
            lines.append(f"Note. {note}")

        return ReportContent(
            section_type=ReportSection.TABLE,
            content="\n".join(lines),
            formatting_notes=[
                "Use horizontal lines only at top, below header, and at bottom",
                "Italicize statistical symbols in headers",
                "Left-align text, right-align numbers",
            ],
        )

    def generate_full_report(
        self,
        results: List[StatisticalResult],
        sample_info: Dict[str, Any],
        variables: Dict[str, str],
        assumptions_checked: List[str],
        descriptives: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, ReportContent]:
        """
        Generate a complete report with Methods and Results sections.

        Args:
            results: List of statistical results
            sample_info: Sample information
            variables: Variable names and roles
            assumptions_checked: Assumptions that were checked
            descriptives: Descriptive statistics

        Returns:
            Dictionary with Methods and Results sections
        """
        report = {}

        # Methods section (based on first result type)
        main_test = results[0].test_type if results else StatisticalTest.T_TEST_INDEPENDENT
        report["methods"] = self.generate_methods_section(
            test_type=main_test, sample_info=sample_info, variables=variables, assumptions_checked=assumptions_checked
        )

        # Results sections
        results_content = []
        for i, result in enumerate(results):
            result_section = self.generate_results_section(result, descriptives)
            results_content.append(result_section.content)

        report["results"] = ReportContent(
            section_type=ReportSection.RESULTS,
            content="\n\n".join(results_content),
            formatting_notes=[
                "Each analysis should be a separate paragraph",
                "Maintain consistent formatting throughout",
            ],
        )

        return report


# Singleton instance
_generator_instance = None


def get_report_generator() -> APAReportGenerator:
    """Get the singleton APAReportGenerator instance."""
    global _generator_instance
    if _generator_instance is None:
        _generator_instance = APAReportGenerator()
    return _generator_instance
