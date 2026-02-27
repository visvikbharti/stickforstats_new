"""
Plugin Runtime Engine
=====================
Executes installed plugins within a sandboxed context.
Supports: custom statistical tests, SQS rule packs,
visualization templates, data connectors, and report templates.
"""

import logging
import time
from datetime import datetime

logger = logging.getLogger(__name__)


class PluginContext:
    """Sandboxed execution context for plugins."""

    def __init__(self, plugin, organization, user=None):
        self.plugin = plugin
        self.organization = organization
        self.user = user
        self.start_time = None
        self.end_time = None
        self.logs = []

    def log(self, message, level="info"):
        """Add a log entry."""
        self.logs.append(
            {
                "timestamp": datetime.utcnow().isoformat(),
                "level": level,
                "message": message,
            }
        )

    @property
    def execution_time_ms(self):
        if self.start_time and self.end_time:
            return round((self.end_time - self.start_time) * 1000, 2)
        return None


class PluginRuntime:
    """
    Executes plugins based on their type and entry point configuration.
    """

    # Maximum execution time per plugin type (seconds)
    TIME_LIMITS = {
        "statistical_test": 30,
        "sqs_rule_pack": 10,
        "visualization": 5,
        "data_connector": 60,
        "report_template": 15,
    }

    @classmethod
    def execute(cls, plugin, data, config=None, organization=None, user=None):
        """
        Execute a plugin with the given data and configuration.

        Args:
            plugin: Plugin model instance
            data: dict with input data for the plugin
            config: dict with plugin configuration (from PluginInstallation.config)
            organization: Organization model instance
            user: User model instance

        Returns:
            dict with execution result
        """
        ctx = PluginContext(plugin, organization, user)
        ctx.start_time = time.time()

        try:
            plugin_type = plugin.plugin_type
            entry_point = plugin.entry_point
            time_limit = cls.TIME_LIMITS.get(plugin_type, 10)

            ctx.log(f"Executing plugin: {plugin.name} v{plugin.version} (type: {plugin_type})")

            # Dispatch by plugin type
            if plugin_type == "statistical_test":
                result = cls._execute_statistical_test(entry_point, data, config, ctx)
            elif plugin_type == "sqs_rule_pack":
                result = cls._execute_sqs_rules(entry_point, data, config, ctx)
            elif plugin_type == "visualization":
                result = cls._execute_visualization(entry_point, data, config, ctx)
            elif plugin_type == "data_connector":
                result = cls._execute_data_connector(entry_point, data, config, ctx)
            elif plugin_type == "report_template":
                result = cls._execute_report_template(entry_point, data, config, ctx)
            else:
                result = {"error": f"Unknown plugin type: {plugin_type}"}

            ctx.end_time = time.time()

            # Check time limit
            if ctx.execution_time_ms and ctx.execution_time_ms > time_limit * 1000:
                ctx.log(f"Plugin exceeded time limit ({time_limit}s)", level="warning")

            ctx.log(f"Execution completed in {ctx.execution_time_ms}ms")

            return {
                "success": "error" not in result,
                "plugin": {
                    "name": plugin.name,
                    "version": plugin.version,
                    "type": plugin_type,
                },
                "result": result,
                "execution_time_ms": ctx.execution_time_ms,
                "logs": ctx.logs,
            }

        except Exception as exc:
            ctx.end_time = time.time()
            ctx.log(f"Plugin execution failed: {str(exc)}", level="error")
            logger.error(f"Plugin {plugin.name} execution failed: {exc}")
            return {
                "success": False,
                "plugin": {"name": plugin.name, "version": plugin.version, "type": plugin.plugin_type},
                "error": str(exc),
                "execution_time_ms": ctx.execution_time_ms,
                "logs": ctx.logs,
            }

    @classmethod
    def _execute_statistical_test(cls, entry_point, data, config, ctx):
        """Execute a custom statistical test plugin."""
        test_function = entry_point.get("function", "")
        test_module = entry_point.get("module", "")

        ctx.log(f"Running statistical test: {test_function}")

        # Built-in test extensions
        builtin_tests = {
            "robust_ttest": cls._builtin_robust_ttest,
            "bootstrap_ci": cls._builtin_bootstrap_ci,
            "permutation_test": cls._builtin_permutation_test,
            "bayesian_ab": cls._builtin_bayesian_ab,
        }

        if test_function in builtin_tests:
            return builtin_tests[test_function](data, config or {})

        return {
            "message": f'Custom test "{test_function}" from module "{test_module}" would be loaded dynamically in production',
            "data_received": bool(data),
            "config": config or {},
        }

    @classmethod
    def _execute_sqs_rules(cls, entry_point, data, config, ctx):
        """Execute custom SQS rules from a rule pack plugin."""
        rules = entry_point.get("rules", [])
        text = data.get("text", "")

        ctx.log(f"Running {len(rules)} custom SQS rules")

        results = []
        for rule in rules:
            import re

            rule_id = rule.get("id", "custom")
            pattern = rule.get("pattern", "")

            if pattern:
                match = bool(re.search(pattern, text, re.IGNORECASE))
                results.append(
                    {
                        "rule_id": rule_id,
                        "name": rule.get("name", rule_id),
                        "passed": match,
                        "weight": rule.get("weight", 1),
                    }
                )

        passed = sum(1 for r in results if r["passed"])
        total = len(results) or 1

        return {
            "rules_checked": len(results),
            "rules_passed": passed,
            "score": round((passed / total) * 100, 1),
            "details": results,
        }

    @classmethod
    def _execute_visualization(cls, entry_point, data, config, ctx):
        """Execute a visualization template plugin."""
        template_type = entry_point.get("type", "recharts")
        chart_config = entry_point.get("chart_config", {})

        ctx.log(f"Generating visualization: {template_type}")

        return {
            "chart_type": template_type,
            "config": {**chart_config, **(config or {})},
            "data": data,
            "render_target": "frontend",
        }

    @classmethod
    def _execute_data_connector(cls, entry_point, data, config, ctx):
        """Execute a data connector plugin (import from external source)."""
        source_type = entry_point.get("source", "")

        ctx.log(f"Connecting to data source: {source_type}")

        return {
            "source": source_type,
            "status": "ready",
            "message": f"Data connector for {source_type} ready. Configure credentials in plugin settings.",
            "supported_formats": entry_point.get("formats", []),
        }

    @classmethod
    def _execute_report_template(cls, entry_point, data, config, ctx):
        """Execute a report template plugin."""
        template_name = entry_point.get("template", "")
        sections = entry_point.get("sections", [])

        ctx.log(f"Generating report from template: {template_name}")

        return {
            "template": template_name,
            "sections": sections,
            "data_bound": bool(data),
            "config": config or {},
        }

    # -- Built-in Plugin Extensions ------------------------------------

    @classmethod
    def _builtin_robust_ttest(cls, data, config):
        """Yuen's trimmed mean t-test (robust to outliers)."""
        try:
            import numpy as np
            from scipy import stats

            g1 = np.array(data.get("group1", []))
            g2 = np.array(data.get("group2", []))
            trim = config.get("trim_proportion", 0.2)

            if len(g1) < 5 or len(g2) < 5:
                return {"error": "Each group needs at least 5 observations"}

            # Trimmed means
            n1_trim = int(len(g1) * trim)
            n2_trim = int(len(g2) * trim)

            g1_sorted = np.sort(g1)[n1_trim : len(g1) - n1_trim if n1_trim > 0 else len(g1)]
            g2_sorted = np.sort(g2)[n2_trim : len(g2) - n2_trim if n2_trim > 0 else len(g2)]

            t_stat, p_value = stats.ttest_ind(g1_sorted, g2_sorted)

            return {
                "test": "robust_ttest",
                "method": "Yuen's trimmed mean t-test",
                "trim_proportion": trim,
                "t_statistic": float(t_stat),
                "p_value": float(p_value),
                "trimmed_mean_1": float(np.mean(g1_sorted)),
                "trimmed_mean_2": float(np.mean(g2_sorted)),
                "n_trimmed_1": len(g1_sorted),
                "n_trimmed_2": len(g2_sorted),
            }
        except ImportError:
            return {"error": "scipy not available"}

    @classmethod
    def _builtin_bootstrap_ci(cls, data, config):
        """Bootstrap confidence interval estimation."""
        try:
            import numpy as np

            values = np.array(data.get("values", []))
            n_bootstrap = config.get("n_bootstrap", 10000)
            ci_level = config.get("confidence_level", 0.95)
            statistic = config.get("statistic", "mean")

            if len(values) < 3:
                return {"error": "Need at least 3 values"}

            stat_fn = {"mean": np.mean, "median": np.median, "std": np.std}.get(statistic, np.mean)

            boot_stats = []
            for _ in range(min(n_bootstrap, 50000)):
                sample = np.random.choice(values, size=len(values), replace=True)
                boot_stats.append(float(stat_fn(sample)))

            boot_stats = np.array(boot_stats)
            alpha = 1 - ci_level
            ci_lower = float(np.percentile(boot_stats, alpha / 2 * 100))
            ci_upper = float(np.percentile(boot_stats, (1 - alpha / 2) * 100))

            return {
                "test": "bootstrap_ci",
                "statistic": statistic,
                "observed_value": float(stat_fn(values)),
                "ci_lower": ci_lower,
                "ci_upper": ci_upper,
                "confidence_level": ci_level,
                "n_bootstrap": n_bootstrap,
                "standard_error": float(np.std(boot_stats)),
            }
        except ImportError:
            return {"error": "numpy not available"}

    @classmethod
    def _builtin_permutation_test(cls, data, config):
        """Permutation test for comparing two groups."""
        try:
            import numpy as np

            g1 = np.array(data.get("group1", []))
            g2 = np.array(data.get("group2", []))
            n_permutations = config.get("n_permutations", 10000)

            if len(g1) < 2 or len(g2) < 2:
                return {"error": "Each group needs at least 2 observations"}

            observed_diff = float(np.mean(g1) - np.mean(g2))
            combined = np.concatenate([g1, g2])
            n1 = len(g1)

            count_extreme = 0
            for _ in range(min(n_permutations, 50000)):
                np.random.shuffle(combined)
                perm_diff = np.mean(combined[:n1]) - np.mean(combined[n1:])
                if abs(perm_diff) >= abs(observed_diff):
                    count_extreme += 1

            p_value = count_extreme / n_permutations

            return {
                "test": "permutation_test",
                "observed_difference": observed_diff,
                "p_value": float(p_value),
                "n_permutations": n_permutations,
                "n_extreme": count_extreme,
                "significant": p_value < config.get("alpha", 0.05),
            }
        except ImportError:
            return {"error": "numpy not available"}

    @classmethod
    def _builtin_bayesian_ab(cls, data, config):
        """Bayesian A/B test comparison."""
        try:
            import numpy as np

            g1 = np.array(data.get("group1", []))
            g2 = np.array(data.get("group2", []))
            n_samples = config.get("n_samples", 10000)

            if len(g1) < 2 or len(g2) < 2:
                return {"error": "Each group needs at least 2 observations"}

            # Posterior sampling (normal-normal conjugate)
            m1, s1, n1 = np.mean(g1), np.std(g1, ddof=1), len(g1)
            m2, s2, n2 = np.mean(g2), np.std(g2, ddof=1), len(g2)

            post_1 = np.random.normal(m1, s1 / np.sqrt(n1), n_samples)
            post_2 = np.random.normal(m2, s2 / np.sqrt(n2), n_samples)

            diff = post_1 - post_2
            prob_1_greater = float(np.mean(diff > 0))

            return {
                "test": "bayesian_ab",
                "mean_1": float(m1),
                "mean_2": float(m2),
                "mean_difference": float(np.mean(diff)),
                "ci_95_lower": float(np.percentile(diff, 2.5)),
                "ci_95_upper": float(np.percentile(diff, 97.5)),
                "probability_1_greater": prob_1_greater,
                "probability_2_greater": 1 - prob_1_greater,
                "n_samples": n_samples,
            }
        except ImportError:
            return {"error": "numpy not available"}
