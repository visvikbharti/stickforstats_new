"""
Interactive ipywidgets for StickForStats in Jupyter notebooks.

Provides reusable widget classes for test selection, data profiling,
and real-time Guardian assumption monitoring.
"""

from __future__ import annotations

from typing import Any, Callable, Dict, List, Optional

import ipywidgets as widgets
from IPython.display import display, HTML

from stickforstats import StickForStats

from .display import display_guardian_report, display_profile, display_test_result


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

TEST_TYPES = [
    ("Independent t-test", "ttest"),
    ("Paired t-test", "ttest_paired"),
    ("One-way ANOVA", "anova"),
    ("Repeated-measures ANOVA", "anova_rm"),
    ("Pearson Correlation", "correlation_pearson"),
    ("Spearman Correlation", "correlation_spearman"),
    ("Linear Regression", "regression_linear"),
    ("Multiple Regression", "regression_multiple"),
    ("Logistic Regression", "regression_logistic"),
    ("Chi-squared Test", "chi_squared"),
    ("Fisher's Exact Test", "fisher"),
    ("Mann-Whitney U", "mann_whitney"),
    ("Wilcoxon Signed-Rank", "wilcoxon"),
    ("Kruskal-Wallis", "kruskal_wallis"),
    ("Descriptive Statistics", "descriptive"),
]

ALTERNATIVE_OPTIONS = ["two-sided", "less", "greater"]

POST_HOC_METHODS = ["tukey", "bonferroni", "scheffe", "holm"]


# ---------------------------------------------------------------------------
# TestSelectorWidget
# ---------------------------------------------------------------------------

class TestSelectorWidget:
    """
    Interactive widget for selecting a statistical test and configuring
    its parameters (alpha, alternative hypothesis, post-hoc method, etc.).

    Parameters
    ----------
    client : StickForStats, optional
        An already-configured SDK client.  If None, the widget creates
        a default localhost connection.
    on_run : callable, optional
        Callback invoked with ``(test_type: str, params: dict)`` when
        the user clicks "Run Analysis".

    Examples
    --------
    In a Jupyter cell::

        from stickforstats_jupyter.widgets import TestSelectorWidget
        w = TestSelectorWidget()
        w.show()
    """

    def __init__(
        self,
        client: Optional[StickForStats] = None,
        on_run: Optional[Callable[[str, Dict[str, Any]], None]] = None,
    ) -> None:
        self._client = client or StickForStats()
        self._on_run = on_run
        self._build_ui()

    def _build_ui(self) -> None:
        """Construct the widget tree."""
        # Test type dropdown
        self._test_dropdown = widgets.Dropdown(
            options=[(label, value) for label, value in TEST_TYPES],
            value="ttest",
            description="Test:",
            style={"description_width": "80px"},
            layout=widgets.Layout(width="350px"),
        )

        # Alpha slider
        self._alpha_slider = widgets.FloatSlider(
            value=0.05,
            min=0.001,
            max=0.20,
            step=0.001,
            description="Alpha:",
            readout_format=".3f",
            style={"description_width": "80px"},
            layout=widgets.Layout(width="350px"),
        )

        # Alternative hypothesis
        self._alternative = widgets.Dropdown(
            options=ALTERNATIVE_OPTIONS,
            value="two-sided",
            description="Alternative:",
            style={"description_width": "80px"},
            layout=widgets.Layout(width="350px"),
        )

        # Post-hoc method
        self._post_hoc = widgets.Dropdown(
            options=POST_HOC_METHODS,
            value="tukey",
            description="Post-hoc:",
            style={"description_width": "80px"},
            layout=widgets.Layout(width="350px"),
        )

        # Checkboxes
        self._paired = widgets.Checkbox(
            value=False,
            description="Paired samples",
            indent=False,
        )
        self._expert_mode = widgets.Checkbox(
            value=False,
            description="Expert mode (skip Guardian)",
            indent=False,
        )

        # Run button
        self._run_btn = widgets.Button(
            description="Run Analysis",
            button_style="primary",
            icon="play",
            layout=widgets.Layout(width="180px", height="36px"),
        )
        self._run_btn.on_click(self._on_run_click)

        # Output area
        self._output = widgets.Output()

        # Visibility toggles based on test type
        self._test_dropdown.observe(self._on_test_change, names="value")
        self._update_visibility()

        # Layout
        self._box = widgets.VBox([
            widgets.HTML(
                '<h3 style="margin:0 0 8px 0; color:#1565c0; '
                'font-family:Segoe UI,sans-serif;">Test Configuration</h3>'
            ),
            self._test_dropdown,
            self._alpha_slider,
            self._alternative,
            self._post_hoc,
            widgets.HBox([self._paired, self._expert_mode]),
            self._run_btn,
            self._output,
        ], layout=widgets.Layout(
            padding="12px",
            border="1px solid #e0e0e0",
            border_radius="8px",
        ))

    def _update_visibility(self) -> None:
        """Show/hide controls based on the selected test type."""
        test = self._test_dropdown.value
        # Show paired checkbox only for t-test variants
        self._paired.layout.display = "flex" if "ttest" in test else "none"
        # Show alternative only for tests that support it
        supports_alt = any(t in test for t in ("ttest", "correlation", "mann_whitney", "wilcoxon"))
        self._alternative.layout.display = "flex" if supports_alt else "none"
        # Show post-hoc only for ANOVA
        self._post_hoc.layout.display = "flex" if "anova" in test else "none"

    def _on_test_change(self, change: Dict[str, Any]) -> None:
        self._update_visibility()

    def _on_run_click(self, btn: Any) -> None:
        """Handle the Run button click."""
        params = self.get_params()
        test_type = params.pop("test_type")

        self._output.clear_output()
        with self._output:
            if self._on_run:
                self._on_run(test_type, params)
            else:
                display(HTML(
                    f'<div style="padding:10px; background:#e3f2fd; border-radius:6px; '
                    f'font-family:monospace;">'
                    f'<b>Selected:</b> {test_type}<br>'
                    f'<b>Parameters:</b> {params}<br>'
                    f'<i>Provide an on_run callback or data to execute the analysis.</i>'
                    f'</div>'
                ))

    def get_params(self) -> Dict[str, Any]:
        """
        Return the current widget parameter values as a dict.

        Returns
        -------
        dict
            Keys: test_type, alpha, alternative, post_hoc, paired, expert_mode.
        """
        return {
            "test_type": self._test_dropdown.value,
            "alpha": self._alpha_slider.value,
            "alternative": self._alternative.value,
            "post_hoc": self._post_hoc.value,
            "paired": self._paired.value,
            "expert_mode": self._expert_mode.value,
        }

    def show(self) -> None:
        """Display the widget in the current notebook cell."""
        display(self._box)


# ---------------------------------------------------------------------------
# DataProfileWidget
# ---------------------------------------------------------------------------

class DataProfileWidget:
    """
    Interactive data profiling widget with editable variable type overrides.

    Parameters
    ----------
    client : StickForStats, optional
        An already-configured SDK client.
    data : dict or DataFrame, optional
        Initial data to profile.  Can also be set later via ``set_data()``.

    Examples
    --------
    ::

        from stickforstats_jupyter.widgets import DataProfileWidget
        w = DataProfileWidget(data=df)
        w.show()
    """

    def __init__(
        self,
        client: Optional[StickForStats] = None,
        data: Optional[Any] = None,
    ) -> None:
        self._client = client or StickForStats()
        self._data = data
        self._type_overrides: Dict[str, str] = {}
        self._profile_result = None
        self._build_ui()

        if data is not None:
            self._run_profile()

    def _build_ui(self) -> None:
        """Construct the widget tree."""
        self._refresh_btn = widgets.Button(
            description="Profile Data",
            button_style="primary",
            icon="search",
            layout=widgets.Layout(width="160px", height="36px"),
        )
        self._refresh_btn.on_click(self._on_refresh)

        self._types_box = widgets.VBox()
        self._output = widgets.Output()

        self._box = widgets.VBox([
            widgets.HTML(
                '<h3 style="margin:0 0 8px 0; color:#1565c0; '
                'font-family:Segoe UI,sans-serif;">Data Profile</h3>'
            ),
            self._refresh_btn,
            self._types_box,
            self._output,
        ], layout=widgets.Layout(
            padding="12px",
            border="1px solid #e0e0e0",
            border_radius="8px",
        ))

    def set_data(self, data: Any) -> None:
        """
        Set or replace the data and re-profile.

        Parameters
        ----------
        data : dict or DataFrame
            The dataset to profile.
        """
        self._data = data
        self._run_profile()

    def _to_dict(self) -> Dict[str, Any]:
        if self._data is None:
            raise ValueError("No data set. Call set_data() first.")
        if hasattr(self._data, "to_dict"):
            return self._data.to_dict(orient="list")
        if isinstance(self._data, dict):
            return self._data
        raise ValueError(f"Unsupported data type: {type(self._data).__name__}")

    def _run_profile(self) -> None:
        """Execute the profiling request and update the display."""
        self._output.clear_output()
        self._types_box.children = []

        try:
            data_dict = self._to_dict()
            result = self._client.autonomous.profile(data=data_dict)
            self._profile_result = result

            # Build type editor dropdowns
            var_types = getattr(result, "variable_types", None) or {}
            type_options = [
                "numeric", "continuous", "categorical", "ordinal",
                "binary", "datetime", "text", "id",
            ]

            type_widgets_list = []
            for var_name, detected_type in var_types.items():
                dd = widgets.Dropdown(
                    options=type_options,
                    value=detected_type if detected_type in type_options else "numeric",
                    description=f"{var_name}:",
                    style={"description_width": "initial"},
                    layout=widgets.Layout(width="300px"),
                )
                # Capture var_name in closure
                dd.observe(
                    lambda change, vn=var_name: self._on_type_override(vn, change),
                    names="value",
                )
                type_widgets_list.append(dd)

            if type_widgets_list:
                self._types_box.children = [
                    widgets.HTML(
                        '<div style="font-weight:600; color:#424242; margin:8px 0 4px 0;">'
                        'Variable Types (editable):</div>'
                    ),
                    *type_widgets_list,
                ]

            # Display the profile
            with self._output:
                html = display_profile(result, "data")
                display(HTML(html))

        except Exception as exc:
            with self._output:
                display(HTML(
                    f'<div style="padding:10px; background:#ffebee; '
                    f'border-left:4px solid #f44336; font-family:monospace;">'
                    f'<b>Profile error:</b> {exc}</div>'
                ))

    def _on_type_override(self, var_name: str, change: Dict[str, Any]) -> None:
        """Record a user type override."""
        self._type_overrides[var_name] = change["new"]

    def _on_refresh(self, btn: Any) -> None:
        self._run_profile()

    def get_type_overrides(self) -> Dict[str, str]:
        """Return the user's variable type overrides."""
        return dict(self._type_overrides)

    def show(self) -> None:
        """Display the widget in the current notebook cell."""
        display(self._box)


# ---------------------------------------------------------------------------
# GuardianDashboardWidget
# ---------------------------------------------------------------------------

class GuardianDashboardWidget:
    """
    Real-time Guardian assumption checking that updates as the user
    changes test type and data parameters.

    Parameters
    ----------
    client : StickForStats, optional
        An already-configured SDK client.
    data : dict or DataFrame, optional
        Initial dataset.  Can be set later via ``set_data()``.

    Examples
    --------
    ::

        from stickforstats_jupyter.widgets import GuardianDashboardWidget
        gd = GuardianDashboardWidget(data=df)
        gd.show()
    """

    def __init__(
        self,
        client: Optional[StickForStats] = None,
        data: Optional[Any] = None,
    ) -> None:
        self._client = client or StickForStats()
        self._data = data
        self._build_ui()

    def _build_ui(self) -> None:
        """Construct the widget tree."""
        self._test_dropdown = widgets.Dropdown(
            options=[(label, value) for label, value in TEST_TYPES],
            value="ttest",
            description="Test:",
            style={"description_width": "60px"},
            layout=widgets.Layout(width="300px"),
        )

        self._alpha_slider = widgets.FloatSlider(
            value=0.05,
            min=0.001,
            max=0.20,
            step=0.001,
            description="Alpha:",
            readout_format=".3f",
            style={"description_width": "60px"},
            layout=widgets.Layout(width="300px"),
        )

        self._auto_check = widgets.Checkbox(
            value=True,
            description="Auto-check on change",
            indent=False,
        )

        self._check_btn = widgets.Button(
            description="Check Assumptions",
            button_style="warning",
            icon="shield",
            layout=widgets.Layout(width="200px", height="36px"),
        )
        self._check_btn.on_click(self._on_check)

        # Status indicator
        self._status = widgets.HTML(
            '<div style="padding:8px; color:#9e9e9e; font-style:italic;">'
            'Click "Check Assumptions" or enable auto-check.</div>'
        )

        self._output = widgets.Output()

        # Wire up auto-check observers
        self._test_dropdown.observe(self._on_param_change, names="value")
        self._alpha_slider.observe(self._on_param_change, names="value")

        self._box = widgets.VBox([
            widgets.HTML(
                '<h3 style="margin:0 0 8px 0; color:#ff9800; '
                'font-family:Segoe UI,sans-serif;">Guardian Dashboard</h3>'
            ),
            widgets.HBox([self._test_dropdown, self._alpha_slider]),
            widgets.HBox([self._auto_check, self._check_btn]),
            self._status,
            self._output,
        ], layout=widgets.Layout(
            padding="12px",
            border="2px solid #ff9800",
            border_radius="8px",
        ))

    def set_data(self, data: Any) -> None:
        """
        Set or replace the data and optionally trigger an auto-check.

        Parameters
        ----------
        data : dict or DataFrame
            The dataset to check.
        """
        self._data = data
        if self._auto_check.value:
            self._run_check()

    def _to_dict(self) -> Dict[str, Any]:
        if self._data is None:
            raise ValueError("No data set. Call set_data() or pass data to the constructor.")
        if hasattr(self._data, "to_dict"):
            return self._data.to_dict(orient="list")
        if isinstance(self._data, dict):
            return self._data
        raise ValueError(f"Unsupported data type: {type(self._data).__name__}")

    def _on_param_change(self, change: Dict[str, Any]) -> None:
        """Trigger auto-check if enabled and data is available."""
        if self._auto_check.value and self._data is not None:
            self._run_check()

    def _on_check(self, btn: Any) -> None:
        self._run_check()

    def _run_check(self) -> None:
        """Execute a Guardian cascade check and display results."""
        self._output.clear_output()

        # Map compound test values to the SDK's expected test names
        test_value = self._test_dropdown.value
        test_name_map = {
            "ttest": "ttest",
            "ttest_paired": "ttest",
            "anova": "anova",
            "anova_rm": "anova",
            "correlation_pearson": "correlation",
            "correlation_spearman": "correlation",
            "regression_linear": "regression",
            "regression_multiple": "regression",
            "regression_logistic": "regression",
            "chi_squared": "chi_squared",
            "fisher": "fisher",
            "mann_whitney": "mann_whitney",
            "wilcoxon": "wilcoxon",
            "kruskal_wallis": "kruskal_wallis",
            "descriptive": "descriptive",
        }
        test_for_api = test_name_map.get(test_value, test_value)

        self._status.value = (
            '<div style="padding:8px; color:#ff9800;">'
            'Checking assumptions...</div>'
        )

        try:
            data_dict = self._to_dict()
            result = self._client.autonomous.cascade(
                data=data_dict,
                test=test_for_api,
                alpha=self._alpha_slider.value,
            )

            # Extract Guardian report
            guardian = getattr(result, "guardian_report", None)
            report_obj = guardian if guardian is not None else result

            # Update status
            violations = getattr(report_obj, "violations", [])
            passed = getattr(report_obj, "passed", None)

            if passed is True or not violations:
                self._status.value = (
                    '<div style="padding:8px; color:#4caf50; font-weight:600;">'
                    'All assumptions passed.</div>'
                )
            else:
                crit = sum(
                    1 for v in violations
                    if getattr(v, "severity", "").lower() == "critical"
                )
                warn = len(violations) - crit
                parts = []
                if crit:
                    parts.append(f'<span style="color:#f44336;">{crit} critical</span>')
                if warn:
                    parts.append(f'<span style="color:#ff9800;">{warn} warning(s)</span>')
                self._status.value = (
                    f'<div style="padding:8px; font-weight:600;">'
                    f'Violations: {", ".join(parts)}</div>'
                )

            # Display full report
            with self._output:
                test_label = self._test_dropdown.label if hasattr(self._test_dropdown, "label") else test_for_api
                html = display_guardian_report(report_obj, test_for_api)
                display(HTML(html))

        except Exception as exc:
            self._status.value = (
                f'<div style="padding:8px; color:#f44336;">'
                f'Error: {exc}</div>'
            )
            with self._output:
                display(HTML(
                    f'<div style="padding:10px; background:#ffebee; '
                    f'border-left:4px solid #f44336; font-family:monospace;">'
                    f'<b>Guardian check error:</b> {exc}</div>'
                ))

    def show(self) -> None:
        """Display the widget in the current notebook cell."""
        display(self._box)
