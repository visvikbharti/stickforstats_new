"""
Statistical Suggestions Engine
================================

Recommends follow-up analyses based on completed results.
Uses domain knowledge to suggest meaningful next steps.
"""

import logging

logger = logging.getLogger(__name__)


def _is_t_test(r):
    """Check if the result is from a t-test."""
    return r.get("test_type") in ("t_test", "independent_t_test")


def _is_anova(r):
    """Check if the result is from an ANOVA."""
    return r.get("test_type") in ("anova", "one_way_anova")


def _is_correlation(r):
    """Check if the result is from a correlation test."""
    return r.get("test_type") in ("pearson", "correlation", "spearman")


def _is_significant(r):
    """Check if the result has a significant p-value."""
    return r.get("p_value") is not None and r["p_value"] < 0.05


def _is_not_significant(r):
    """Check if the result has a non-significant p-value."""
    return r.get("p_value") is not None and r["p_value"] >= 0.05


def _has_guardian_violations(r):
    """Check if Guardian flagged violations."""
    return r.get("guardian_violations", 0) > 0


class SuggestionsEngine:
    """Generate context-aware analysis suggestions."""

    # Rules: (condition_check, suggestions_list)
    RULES = [
        # After t-test
        {
            "condition": _is_t_test,
            "suggestions": [
                {
                    "text": "Check effect size to assess practical significance",
                    "action": "show_effect_size",
                    "priority": "high",
                },
                {
                    "text": (
                        "Run a power analysis to check if your "
                        "sample size was adequate"
                    ),
                    "action": "power_analysis",
                    "priority": "medium",
                },
                {
                    "text": (
                        "Create a visualization (boxplot or violin plot) "
                        "to see the distribution"
                    ),
                    "action": "visualize",
                    "priority": "medium",
                },
            ],
        },
        # After ANOVA
        {
            "condition": _is_anova,
            "suggestions": [
                {
                    "text": (
                        "Run post-hoc pairwise comparisons to find "
                        "which groups differ"
                    ),
                    "action": "post_hoc",
                    "priority": "high",
                },
                {
                    "text": "Check effect size (eta-squared or omega-squared)",
                    "action": "show_effect_size",
                    "priority": "high",
                },
                {
                    "text": "Visualize group means with confidence intervals",
                    "action": "visualize",
                    "priority": "medium",
                },
            ],
        },
        # After correlation
        {
            "condition": _is_correlation,
            "suggestions": [
                {
                    "text": (
                        "Fit a regression model to quantify "
                        "the relationship"
                    ),
                    "action": "regression",
                    "priority": "high",
                },
                {
                    "text": "Create a scatter plot with regression line",
                    "action": "visualize",
                    "priority": "medium",
                },
                {
                    "text": (
                        "Check for influential outliers that may be "
                        "driving the correlation"
                    ),
                    "action": "check_outliers",
                    "priority": "medium",
                },
            ],
        },
        # Significant result
        {
            "condition": _is_significant,
            "suggestions": [
                {
                    "text": (
                        "Report the effect size alongside p-value "
                        "(APA recommends this)"
                    ),
                    "action": "show_effect_size",
                    "priority": "high",
                },
                {
                    "text": (
                        "Consider bootstrapped confidence intervals "
                        "for robustness"
                    ),
                    "action": "bootstrap_ci",
                    "priority": "low",
                },
            ],
        },
        # Non-significant result
        {
            "condition": _is_not_significant,
            "suggestions": [
                {
                    "text": (
                        "Run a power analysis -- you may lack statistical "
                        "power to detect the effect"
                    ),
                    "action": "power_analysis",
                    "priority": "high",
                },
                {
                    "text": (
                        "Consider equivalence testing (TOST) to test "
                        "for practical equivalence"
                    ),
                    "action": "equivalence_test",
                    "priority": "medium",
                },
                {
                    "text": (
                        "Check if a Bayesian analysis provides evidence "
                        "for the null hypothesis"
                    ),
                    "action": "bayesian_analysis",
                    "priority": "medium",
                },
            ],
        },
        # Guardian violations detected
        {
            "condition": _has_guardian_violations,
            "suggestions": [
                {
                    "text": "Review Guardian's recommended alternative tests",
                    "action": "view_alternatives",
                    "priority": "high",
                },
                {
                    "text": (
                        "Try a robust version of the test that's less "
                        "sensitive to assumption violations"
                    ),
                    "action": "robust_test",
                    "priority": "high",
                },
            ],
        },
    ]

    def get_suggestions(self, results, max_suggestions=5):
        """
        Generate suggestions based on analysis results.

        Args:
            results: dict with keys like test_type, p_value,
                     effect_size, etc.
            max_suggestions: max number to return

        Returns:
            List of suggestion dicts sorted by priority.
        """
        suggestions = []
        seen_actions = set()

        for rule in self.RULES:
            try:
                if rule["condition"](results):
                    for s in rule["suggestions"]:
                        if s["action"] not in seen_actions:
                            suggestions.append(s)
                            seen_actions.add(s["action"])
            except (KeyError, TypeError):
                continue

        # Sort by priority
        priority_order = {"high": 0, "medium": 1, "low": 2}
        suggestions.sort(
            key=lambda s: priority_order.get(
                s.get("priority", "low"), 3
            )
        )

        return suggestions[:max_suggestions]
