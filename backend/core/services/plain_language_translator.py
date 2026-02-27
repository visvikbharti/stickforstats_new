"""
Plain Language Translator — Deterministic Result Translation
=============================================================
Translates statistical results into plain English, researcher language,
or APA format. Template-based with no AI dependency.

Author: StickForStats Development Team
Created: February 2026
Version: 2.0.0
"""

from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class OutputMode:
    PLAIN_ENGLISH = "plain_english"
    RESEARCHER = "researcher"
    APA_FORMAT = "apa_format"


# Effect size analogies by domain (real-world comparisons)
EFFECT_SIZE_ANALOGIES = {
    "negligible": {
        "range": (0, 0.2),
        "label": "Negligible",
        "analogy": "Like the difference between a glass of water at 20.0°C vs 20.1°C — practically undetectable.",
    },
    "small": {
        "range": (0.2, 0.5),
        "label": "Small",
        "analogy": "Like the height difference between 15-year-old and 16-year-old girls — real but subtle.",
    },
    "medium": {
        "range": (0.5, 0.8),
        "label": "Medium",
        "analogy": "Like the height difference between 14-year-old and 18-year-old girls — clearly noticeable.",
    },
    "large": {
        "range": (0.8, 1.2),
        "label": "Large",
        "analogy": "Like the height difference between 13-year-old and 18-year-old girls — obvious to anyone.",
    },
    "very_large": {
        "range": (1.2, float("inf")),
        "label": "Very Large",
        "analogy": "Like the height difference between a 5-year-old and an adult — impossible to miss.",
    },
}


def _classify_effect_size(d: float) -> Dict[str, Any]:
    """Classify an effect size (Cohen's d scale) into a category."""
    abs_d = abs(d)
    for key, info in EFFECT_SIZE_ANALOGIES.items():
        low, high = info["range"]
        if low <= abs_d < high:
            return {"category": key, "label": info["label"], "analogy": info["analogy"]}
    return {"category": "large", "label": "Large", "analogy": EFFECT_SIZE_ANALOGIES["large"]["analogy"]}


def _significance_phrase(p: float, alpha: float = 0.05) -> str:
    """Generate a significance phrase."""
    if p < 0.001:
        return "strong statistical evidence (p < .001)"
    elif p < 0.01:
        return f"strong statistical evidence (p = {p:.3f})"
    elif p < alpha:
        return f"statistical evidence (p = {p:.3f})"
    else:
        return f"no statistical evidence (p = {p:.3f})"


class PlainLanguageTranslator:
    """
    Translates statistical test results into readable language.

    Supports 3 output modes:
    - plain_english: For non-statisticians, uses everyday language
    - researcher: For researchers, includes technical details
    - apa_format: APA 7th edition formatted results
    """

    def translate(
        self,
        test_type: str,
        results: Dict[str, Any],
        mode: str = OutputMode.PLAIN_ENGLISH,
        alpha: float = 0.05,
    ) -> Dict[str, Any]:
        """
        Translate test results into the requested format.

        Args:
            test_type: Name of the statistical test
            results: Dict with statistic, p_value, effect_size, etc.
            mode: Output mode (plain_english, researcher, apa_format)
            alpha: Significance level

        Returns:
            Dict with 'summary', 'details', 'effect_size_interpretation', 'recommendation'
        """
        translator = self._get_translator(test_type)
        if not translator:
            return self._generic_translation(test_type, results, mode, alpha)

        return translator(results, mode, alpha)

    def _get_translator(self, test_type: str):
        """Get the translator function for a test type."""
        translators = {
            "independent_t": self._translate_independent_t,
            "welch_t": self._translate_independent_t,
            "Independent Samples t-test": self._translate_independent_t,
            "Welch's t-test": self._translate_independent_t,
            "paired_t": self._translate_paired_t,
            "Paired Samples t-test": self._translate_paired_t,
            "one_sample_t": self._translate_one_sample_t,
            "One-Sample t-test": self._translate_one_sample_t,
            "mann_whitney_u": self._translate_mann_whitney,
            "Mann-Whitney U test": self._translate_mann_whitney,
            "wilcoxon_signed_rank": self._translate_wilcoxon,
            "Wilcoxon Signed-Rank test": self._translate_wilcoxon,
            "one_way_anova": self._translate_anova,
            "One-Way ANOVA": self._translate_anova,
            "kruskal_wallis": self._translate_kruskal_wallis,
            "Kruskal-Wallis H test": self._translate_kruskal_wallis,
            "pearson": self._translate_pearson,
            "Pearson Correlation": self._translate_pearson,
            "spearman": self._translate_spearman,
            "Spearman Rank Correlation": self._translate_spearman,
            "kendall": self._translate_kendall,
            "Kendall's Tau": self._translate_kendall,
            "chi_square_independence": self._translate_chi_square,
            "Chi-Square Test of Independence": self._translate_chi_square,
            "fisher_exact": self._translate_fisher_exact,
            "Fisher's Exact Test": self._translate_fisher_exact,
            "linear_regression": self._translate_regression,
            "Simple Linear Regression": self._translate_regression,
        }
        return translators.get(test_type)

    # --- Individual Translators ---

    def _translate_independent_t(self, r: Dict, mode: str, alpha: float) -> Dict[str, Any]:
        p = r.get("p_value", 1.0)
        stat = r.get("statistic", 0)
        d = r.get("effect_size", 0)
        sig = p < alpha
        es = _classify_effect_size(d)

        if mode == OutputMode.PLAIN_ENGLISH:
            if sig:
                summary = (
                    f"The two groups ARE significantly different. "
                    f"The difference is {es['label'].lower()} in practical terms."
                )
            else:
                summary = "The two groups are NOT significantly different. Any difference found could be due to chance."
            details = es["analogy"]
        elif mode == OutputMode.RESEARCHER:
            summary = (
                f"An independent-samples t-test revealed {_significance_phrase(p, alpha)} "
                f"for a difference between the two groups, t = {stat:.3f}, p = {p:.4f}, "
                f"Cohen's d = {d:.3f} ({es['label'].lower()} effect)."
            )
            details = f"Effect size interpretation: {es['analogy']}"
        else:  # APA
            df = r.get("degrees_of_freedom", "")
            summary = f"t({df:.0f}) = {stat:.2f}, p = {p:.3f}, d = {d:.2f}"
            details = (
                f"An independent-samples t-test was conducted. "
                f"Results indicated {'a statistically significant' if sig else 'no statistically significant'} "
                f"difference, {summary}."
            )

        return {
            "summary": summary,
            "details": details,
            "effect_size_interpretation": es,
            "is_significant": sig,
            "recommendation": self._significance_recommendation(sig, "groups"),
        }

    def _translate_paired_t(self, r: Dict, mode: str, alpha: float) -> Dict[str, Any]:
        p = r.get("p_value", 1.0)
        stat = r.get("statistic", 0)
        d = r.get("effect_size", 0)
        sig = p < alpha
        es = _classify_effect_size(d)

        if mode == OutputMode.PLAIN_ENGLISH:
            if sig:
                summary = (
                    f"There IS a significant change between the two measurements. The change is {es['label'].lower()}."
                )
            else:
                summary = "There is NO significant change between the two measurements."
            details = es["analogy"]
        elif mode == OutputMode.RESEARCHER:
            summary = (
                f"A paired-samples t-test showed {_significance_phrase(p, alpha)} "
                f"for a difference, t = {stat:.3f}, p = {p:.4f}, d = {d:.3f}."
            )
            details = f"Effect size: {es['label']} — {es['analogy']}"
        else:
            df = r.get("degrees_of_freedom", "")
            summary = f"t({df:.0f}) = {stat:.2f}, p = {p:.3f}, d = {d:.2f}"
            details = (
                f"A paired-samples t-test indicated {'a significant' if sig else 'no significant'} "
                f"difference, {summary}."
            )

        return {
            "summary": summary,
            "details": details,
            "effect_size_interpretation": es,
            "is_significant": sig,
            "recommendation": self._significance_recommendation(sig, "measurements"),
        }

    def _translate_one_sample_t(self, r: Dict, mode: str, alpha: float) -> Dict[str, Any]:
        p = r.get("p_value", 1.0)
        sig = p < alpha
        d = r.get("effect_size", 0)
        es = _classify_effect_size(d)

        if mode == OutputMode.PLAIN_ENGLISH:
            if sig:
                summary = f"The sample mean IS significantly different from the reference value. Effect: {es['label'].lower()}."
            else:
                summary = "The sample mean is NOT significantly different from the reference value."
            details = es["analogy"]
        else:
            summary = f"One-sample t-test: t = {r.get('statistic', 0):.3f}, p = {p:.4f}, d = {d:.3f}"
            details = f"Effect size: {es['label']}"

        return {
            "summary": summary,
            "details": details,
            "effect_size_interpretation": es,
            "is_significant": sig,
            "recommendation": self._significance_recommendation(sig, "sample vs reference"),
        }

    def _translate_mann_whitney(self, r: Dict, mode: str, alpha: float) -> Dict[str, Any]:
        p = r.get("p_value", 1.0)
        sig = p < alpha
        es_val = abs(r.get("effect_size", 0))

        if mode == OutputMode.PLAIN_ENGLISH:
            if sig:
                summary = "The two groups ARE significantly different (using a distribution-free test)."
            else:
                summary = "The two groups are NOT significantly different."
            details = "This non-parametric test doesn't assume normal distributions, making it robust."
        elif mode == OutputMode.RESEARCHER:
            summary = (
                f"A Mann-Whitney U test revealed {_significance_phrase(p, alpha)}, "
                f"U = {r.get('statistic', 0):.1f}, p = {p:.4f}, r = {es_val:.3f}."
            )
            details = "Rank-biserial correlation used as effect size."
        else:
            summary = f"U = {r.get('statistic', 0):.1f}, p = {p:.3f}, r = {es_val:.2f}"
            details = f"A Mann-Whitney U test {'was' if sig else 'was not'} significant, {summary}."

        return {
            "summary": summary,
            "details": details,
            "effect_size_interpretation": _classify_effect_size(es_val),
            "is_significant": sig,
            "recommendation": self._significance_recommendation(sig, "groups"),
        }

    def _translate_wilcoxon(self, r: Dict, mode: str, alpha: float) -> Dict[str, Any]:
        p = r.get("p_value", 1.0)
        sig = p < alpha
        if mode == OutputMode.PLAIN_ENGLISH:
            summary = f"There {'IS' if sig else 'is NO'} significant change between paired measurements (distribution-free test)."
        else:
            summary = f"Wilcoxon signed-rank: W = {r.get('statistic', 0):.1f}, p = {p:.4f}"
        return {
            "summary": summary,
            "details": "",
            "is_significant": sig,
            "effect_size_interpretation": _classify_effect_size(r.get("effect_size", 0)),
            "recommendation": self._significance_recommendation(sig, "measurements"),
        }

    def _translate_anova(self, r: Dict, mode: str, alpha: float) -> Dict[str, Any]:
        p = r.get("p_value", 1.0)
        sig = p < alpha
        eta_sq = r.get("effect_size", 0)
        # Eta-squared thresholds: 0.01 small, 0.06 medium, 0.14 large
        if eta_sq < 0.01:
            es_label = "negligible"
        elif eta_sq < 0.06:
            es_label = "small"
        elif eta_sq < 0.14:
            es_label = "medium"
        else:
            es_label = "large"

        n_groups = r.get("additional", {}).get("n_groups", "?")

        if mode == OutputMode.PLAIN_ENGLISH:
            if sig:
                summary = (
                    f"At least one of the {n_groups} groups is significantly different from the others. "
                    f"The overall effect is {es_label}."
                )
                details = "You should run post-hoc tests (e.g., Tukey HSD) to find out which specific groups differ."
            else:
                summary = f"The {n_groups} groups are NOT significantly different from each other."
                details = "No further post-hoc comparisons are needed."
        elif mode == OutputMode.RESEARCHER:
            df_b = r.get("additional", {}).get("df_between", "?")
            df_w = r.get("additional", {}).get("df_within", "?")
            summary = (
                f"One-way ANOVA: F({df_b}, {df_w}) = {r.get('statistic', 0):.3f}, "
                f"p = {p:.4f}, eta² = {eta_sq:.3f} ({es_label} effect)."
            )
            details = "Post-hoc tests recommended if significant."
        else:
            df_b = r.get("additional", {}).get("df_between", "?")
            df_w = r.get("additional", {}).get("df_within", "?")
            summary = f"F({df_b}, {df_w}) = {r.get('statistic', 0):.2f}, p = {p:.3f}, eta² = {eta_sq:.2f}"
            details = f"A one-way ANOVA revealed {'a significant' if sig else 'no significant'} effect, {summary}."

        return {
            "summary": summary,
            "details": details,
            "is_significant": sig,
            "effect_size_interpretation": {"category": es_label, "label": es_label.capitalize()},
            "recommendation": "Run post-hoc tests to identify specific group differences."
            if sig
            else "No further group comparisons needed.",
        }

    def _translate_kruskal_wallis(self, r: Dict, mode: str, alpha: float) -> Dict[str, Any]:
        p = r.get("p_value", 1.0)
        sig = p < alpha
        if mode == OutputMode.PLAIN_ENGLISH:
            summary = (
                "At least one group IS different (non-parametric test)."
                if sig
                else "The groups are NOT significantly different."
            )
        else:
            summary = f"Kruskal-Wallis: H = {r.get('statistic', 0):.3f}, p = {p:.4f}"
        return {
            "summary": summary,
            "details": "",
            "is_significant": sig,
            "effect_size_interpretation": _classify_effect_size(r.get("effect_size", 0)),
            "recommendation": "Run Dunn post-hoc tests." if sig else "",
        }

    def _translate_pearson(self, r: Dict, mode: str, alpha: float) -> Dict[str, Any]:
        p = r.get("p_value", 1.0)
        sig = p < alpha
        corr = r.get("additional", {}).get("r", r.get("statistic", 0))
        abs_r = abs(corr)

        if abs_r < 0.1:
            strength = "negligible"
        elif abs_r < 0.3:
            strength = "weak"
        elif abs_r < 0.5:
            strength = "moderate"
        elif abs_r < 0.7:
            strength = "strong"
        else:
            strength = "very strong"

        direction = "positive" if corr > 0 else "negative"

        if mode == OutputMode.PLAIN_ENGLISH:
            if sig:
                summary = (
                    f"There IS a {strength} {direction} relationship between the variables. "
                    f"As one goes up, the other tends to go {'up' if corr > 0 else 'down'}."
                )
            else:
                summary = "There is NO significant linear relationship between the variables."
            details = f"The correlation explains {r.get('effect_size', 0) * 100:.1f}% of the variation."
        elif mode == OutputMode.RESEARCHER:
            summary = f"Pearson correlation: r = {corr:.3f}, p = {p:.4f} — " f"{strength} {direction} relationship."
            details = f"R² = {r.get('effect_size', 0):.3f}"
        else:
            df = r.get("degrees_of_freedom", "")
            summary = f"r({df:.0f}) = {corr:.2f}, p = {p:.3f}"
            details = f"A Pearson correlation revealed a {strength} {direction} correlation, {summary}."

        return {
            "summary": summary,
            "details": details,
            "is_significant": sig,
            "effect_size_interpretation": {"category": strength, "label": strength.capitalize()},
            "recommendation": "",
        }

    def _translate_spearman(self, r: Dict, mode: str, alpha: float) -> Dict[str, Any]:
        p = r.get("p_value", 1.0)
        sig = p < alpha
        rho = r.get("additional", {}).get("rho", r.get("statistic", 0))
        if mode == OutputMode.PLAIN_ENGLISH:
            summary = f"There {'IS' if sig else 'is NO'} significant monotonic relationship (rho = {rho:.3f})."
        else:
            summary = f"Spearman: rho = {rho:.3f}, p = {p:.4f}"
        return {
            "summary": summary,
            "details": "",
            "is_significant": sig,
            "effect_size_interpretation": _classify_effect_size(abs(rho)),
            "recommendation": "",
        }

    def _translate_kendall(self, r: Dict, mode: str, alpha: float) -> Dict[str, Any]:
        p = r.get("p_value", 1.0)
        sig = p < alpha
        tau = r.get("statistic", 0)
        if mode == OutputMode.PLAIN_ENGLISH:
            summary = f"There {'IS' if sig else 'is NO'} significant association (tau = {tau:.3f})."
        else:
            summary = f"Kendall's tau = {tau:.3f}, p = {p:.4f}"
        return {
            "summary": summary,
            "details": "",
            "is_significant": sig,
            "effect_size_interpretation": _classify_effect_size(abs(tau)),
            "recommendation": "",
        }

    def _translate_chi_square(self, r: Dict, mode: str, alpha: float) -> Dict[str, Any]:
        p = r.get("p_value", 1.0)
        sig = p < alpha
        v = r.get("effect_size", 0)

        if mode == OutputMode.PLAIN_ENGLISH:
            if sig:
                summary = f"There IS a significant association between the two categories (Cramer's V = {v:.2f})."
            else:
                summary = "There is NO significant association between the two categories."
            details = "The categories are related — knowing one helps predict the other." if sig else ""
        elif mode == OutputMode.RESEARCHER:
            summary = f"Chi-square test: chi2 = {r.get('statistic', 0):.3f}, " f"p = {p:.4f}, Cramer's V = {v:.3f}."
            details = ""
        else:
            df = r.get("degrees_of_freedom", "")
            summary = f"chi2({df:.0f}) = {r.get('statistic', 0):.2f}, p = {p:.3f}, V = {v:.2f}"
            details = f"A chi-square test of independence {'was' if sig else 'was not'} significant, {summary}."

        return {
            "summary": summary,
            "details": details,
            "is_significant": sig,
            "effect_size_interpretation": _classify_effect_size(v),
            "recommendation": "Examine the contingency table for specific patterns." if sig else "",
        }

    def _translate_fisher_exact(self, r: Dict, mode: str, alpha: float) -> Dict[str, Any]:
        p = r.get("p_value", 1.0)
        sig = p < alpha
        odds = r.get("effect_size", 1.0)
        if mode == OutputMode.PLAIN_ENGLISH:
            if sig:
                summary = f"There IS a significant association (odds ratio = {odds:.2f})."
            else:
                summary = "There is NO significant association."
        else:
            summary = f"Fisher's exact test: OR = {odds:.3f}, p = {p:.4f}"
        return {
            "summary": summary,
            "details": "",
            "is_significant": sig,
            "effect_size_interpretation": {"category": "odds_ratio", "label": f"OR = {odds:.2f}"},
            "recommendation": "",
        }

    def _translate_regression(self, r: Dict, mode: str, alpha: float) -> Dict[str, Any]:
        p = r.get("p_value", 1.0)
        sig = p < alpha
        r_sq = r.get("effect_size", 0)
        slope = r.get("additional", {}).get("slope", 0)
        intercept = r.get("additional", {}).get("intercept", 0)

        if mode == OutputMode.PLAIN_ENGLISH:
            if sig:
                summary = (
                    f"The predictor DOES significantly predict the outcome. "
                    f"It explains {r_sq * 100:.1f}% of the variation."
                )
                details = f"For every 1-unit increase in the predictor, the outcome changes by {slope:.3f} units."
            else:
                summary = "The predictor does NOT significantly predict the outcome."
                details = ""
        elif mode == OutputMode.RESEARCHER:
            summary = f"Linear regression: b = {slope:.4f}, p = {p:.4f}, R² = {r_sq:.3f}."
            details = f"Y = {intercept:.4f} + {slope:.4f}X"
        else:
            summary = f"b = {slope:.2f}, p = {p:.3f}, R² = {r_sq:.2f}"
            details = f"A simple linear regression was {'significant' if sig else 'not significant'}, {summary}."

        return {
            "summary": summary,
            "details": details,
            "is_significant": sig,
            "effect_size_interpretation": {"category": "r_squared", "label": f"R² = {r_sq:.3f}"},
            "recommendation": "Check residuals for regression assumptions." if sig else "",
        }

    def _generic_translation(self, test_type: str, r: Dict, mode: str, alpha: float) -> Dict[str, Any]:
        """Fallback translation for unknown test types."""
        p = r.get("p_value", 1.0)
        sig = p < alpha

        if mode == OutputMode.PLAIN_ENGLISH:
            summary = (
                f"The test {'found significant results' if sig else 'did not find significant results'} (p = {p:.4f})."
            )
        else:
            summary = f"{test_type}: statistic = {r.get('statistic', 'N/A')}, p = {p:.4f}"

        return {
            "summary": summary,
            "details": "",
            "is_significant": sig,
            "effect_size_interpretation": _classify_effect_size(r.get("effect_size", 0)),
            "recommendation": "",
        }

    def _significance_recommendation(self, significant: bool, context: str) -> str:
        """Generate a recommendation based on significance."""
        if significant:
            return f"The difference between {context} is statistically significant. Consider the effect size to judge practical importance."
        return f"No significant difference found between {context}. This could mean no real difference exists, or the sample may be too small to detect it."
