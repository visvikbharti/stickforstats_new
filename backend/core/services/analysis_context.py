"""
Analysis Context Service
========================

Maintains conversation-like context for multi-turn analysis sessions.
Allows follow-up queries like "Now try without outliers" or
"What if we use a non-parametric test instead?"

Uses Django cache for session storage (no new models needed).
"""

import logging
from datetime import datetime, timezone
from django.core.cache import cache

logger = logging.getLogger(__name__)

# 2-hour session TTL
SESSION_TTL = 7200


class AnalysisContext:
    """Stores analysis session state for multi-turn conversations."""

    def __init__(self, session_id):
        self.session_id = session_id
        self._cache_key = f"analysis_context:{session_id}"

    def get_state(self):
        """Get current session state from cache."""
        return cache.get(self._cache_key, {
            "session_id": self.session_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "history": [],
            "current_data": None,
            "current_columns": [],
            "last_test": None,
            "last_results": None,
            "excluded_rows": [],
            "transformations": [],
        })

    def save_state(self, state):
        """Persist state to cache."""
        cache.set(self._cache_key, state, timeout=SESSION_TTL)

    def record_analysis(self, query, test_type, results, data_summary):
        """Record an analysis in the session history."""
        state = self.get_state()
        state["history"].append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "query": query,
            "test_type": test_type,
            "result_summary": self._summarize_results(results),
        })
        state["last_test"] = test_type
        state["last_results"] = results
        if data_summary:
            state["current_data"] = data_summary
        self.save_state(state)
        return state

    def set_data(self, columns, n_rows, dtypes):
        """Record the current dataset metadata."""
        state = self.get_state()
        state["current_columns"] = columns
        state["current_data"] = {
            "n_rows": n_rows,
            "n_cols": len(columns),
            "columns": columns,
            "dtypes": dtypes,
        }
        self.save_state(state)

    def add_exclusion(self, rows_or_condition):
        """Record excluded rows/conditions."""
        state = self.get_state()
        state["excluded_rows"].append(rows_or_condition)
        self.save_state(state)

    def add_transformation(self, transform_type, columns, params=None):
        """Record a data transformation."""
        state = self.get_state()
        state["transformations"].append({
            "type": transform_type,
            "columns": columns,
            "params": params or {},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        self.save_state(state)

    def get_context_for_query(self):
        """Build context string for query understanding."""
        state = self.get_state()
        parts = []

        if state["current_data"]:
            data = state["current_data"]
            parts.append(
                f"Dataset: {data.get('n_rows', '?')} rows, "
                f"{data.get('n_cols', '?')} columns "
                f"({', '.join(data.get('columns', [])[:5])})"
            )

        if state["history"]:
            last = state["history"][-1]
            parts.append(
                f"Previous analysis: {last['test_type']} "
                f"({last.get('result_summary', 'no summary')})"
            )

        if state["excluded_rows"]:
            parts.append(
                f"Exclusions applied: {len(state['excluded_rows'])}"
            )

        if state["transformations"]:
            parts.append(
                f"Transformations: "
                f"{', '.join(t['type'] for t in state['transformations'])}"
            )

        return "; ".join(parts) if parts else "No prior context"

    def clear(self):
        """Clear the session."""
        cache.delete(self._cache_key)

    @staticmethod
    def _summarize_results(results):
        """Extract a brief summary from analysis results."""
        if not results or not isinstance(results, dict):
            return "completed"

        parts = []
        if "p_value" in results:
            p = results["p_value"]
            sig = "significant" if p < 0.05 else "not significant"
            parts.append(f"p={p:.4f} ({sig})")
        if "test_statistic" in results:
            parts.append(f"stat={results['test_statistic']:.4f}")
        if "effect_size" in results:
            parts.append(f"effect={results['effect_size']:.4f}")

        return ", ".join(parts) if parts else "completed"
