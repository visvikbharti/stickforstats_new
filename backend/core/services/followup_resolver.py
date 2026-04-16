"""
Follow-Up Query Resolver
=========================

Resolves user intent from follow-up queries by pattern matching.
Handles common patterns like:
- "Try without outliers" -> re-run with outlier exclusion
- "Use a non-parametric test" -> force non-parametric alternative
- "What about group X vs Y?" -> subset analysis
- "Show me the effect size" -> extract from previous results
- "Is this significant?" -> interpret previous p-value
"""

import re
import logging

logger = logging.getLogger(__name__)


class FollowUpResolver:
    """Resolve follow-up query intent from context."""

    # Pattern -> (action_type, extractor_function)
    PATTERNS = [
        # Outlier removal
        (
            r"(?:try|run|do|redo).*(?:without|excluding|removing).*outlier",
            "remove_outliers",
        ),
        # Non-parametric switch
        (
            r"(?:use|try|switch to).*(?:non-?parametric|rank|mann.?whitney|kruskal|wilcoxon)",
            "force_nonparametric",
        ),
        # Parametric switch
        (
            r"(?:use|try|switch to).*(?:parametric|t.?test|anova|pearson)",
            "force_parametric",
        ),
        # Subset analysis
        (
            r"(?:only|just|compare|subset).*(?:group|category|level|where)",
            "subset_data",
        ),
        # Effect size query
        (
            r"(?:effect size|cohen|eta|omega|practical significance)",
            "show_effect_size",
        ),
        # Significance interpretation
        (
            r"(?:is (?:this|it) significant|what does.*mean|interpret|explain)",
            "interpret_results",
        ),
        # Transform data
        (
            r"(?:log|sqrt|transform|normalize|standardize).*(?:data|variable|column)",
            "transform_data",
        ),
        # Different test
        (
            r"(?:what (?:about|if)|try|run|can we do).*(?:test|analysis|regression|correlation)",
            "different_test",
        ),
        # Post-hoc
        (
            r"(?:post.?hoc|pairwise|which groups|tukey|bonferroni|dunn)",
            "post_hoc",
        ),
        # Assumption check
        (
            r"(?:check|test|verify).*(?:assumption|normality|variance|independence)",
            "check_assumptions",
        ),
    ]

    def resolve(self, query, context_state):
        """
        Resolve a follow-up query into an action.

        Returns:
            dict with keys:
            - action: str (action type)
            - original_query: str
            - context: dict (relevant context from session)
            - params: dict (extracted parameters)
        """
        query_lower = query.lower().strip()

        for pattern, action in self.PATTERNS:
            if re.search(pattern, query_lower):
                return {
                    "action": action,
                    "original_query": query,
                    "context": {
                        "last_test": context_state.get("last_test"),
                        "last_results": context_state.get("last_results"),
                        "current_data": context_state.get("current_data"),
                    },
                    "params": self._extract_params(
                        action, query_lower, context_state
                    ),
                    "is_followup": True,
                }

        # No pattern matched -- treat as new query
        return {
            "action": "new_query",
            "original_query": query,
            "context": {
                "last_test": context_state.get("last_test"),
                "current_data": context_state.get("current_data"),
            },
            "params": {},
            "is_followup": False,
        }

    def _extract_params(self, action, query, context):
        """Extract action-specific parameters from the query."""
        params = {}

        if action == "subset_data":
            # Try to extract column/value mentions
            columns = context.get("current_data", {}) or {}
            columns = columns.get("columns", [])
            for col in columns:
                if col.lower() in query:
                    params["target_column"] = col
                    break

        elif action == "transform_data":
            if "log" in query:
                params["transform"] = "log"
            elif "sqrt" in query:
                params["transform"] = "sqrt"
            elif "standardiz" in query:
                params["transform"] = "standardize"
            elif "normaliz" in query:
                params["transform"] = "normalize"

        elif action == "force_nonparametric":
            # Map common test names
            if "mann" in query or "whitney" in query:
                params["force_test"] = "mann_whitney"
            elif "kruskal" in query:
                params["force_test"] = "kruskal_wallis"
            elif "wilcoxon" in query:
                params["force_test"] = "wilcoxon_signed_rank"

        return params
