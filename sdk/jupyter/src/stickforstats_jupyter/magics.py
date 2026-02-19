"""
IPython magic commands for StickForStats.

Provides line and cell magics that wrap the StickForStats Python SDK,
pulling data from the user's IPython namespace and rendering rich HTML
output directly in Jupyter notebooks.
"""

from __future__ import annotations

import shlex
from typing import Any, Dict, Optional

from IPython.core.magic import Magics, line_magic, cell_magic, magics_class
from IPython.display import display, HTML

from stickforstats import StickForStats

from .display import (
    display_guardian_report,
    display_test_result,
    display_profile,
    display_manuscript_report,
)


def _df_to_dict(df: Any) -> Dict[str, Any]:
    """Convert a pandas DataFrame (or dict) to column-oriented dict."""
    if hasattr(df, "to_dict"):
        return df.to_dict(orient="list")
    if isinstance(df, dict):
        return df
    raise ValueError(
        f"Expected a pandas DataFrame or dict, got {type(df).__name__}. "
        "Pass a variable name that refers to a DataFrame in your notebook."
    )


@magics_class
class StickForStatsMagics(Magics):
    """
    StickForStats magic commands for Jupyter notebooks.

    Usage::

        %load_ext stickforstats_jupyter
        %sfs_config my_api_key http://localhost:8000/api/v1
        %sfs_profile df
        %sfs_guardian df ttest
        %%sfs_analyze ttest --alpha 0.05 --paired
        group1 group2
        %sfs_query "Is there a significant difference?" --data df
        %sfs_manuscript paper.pdf
    """

    _client: Optional[StickForStats] = None

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_client(self) -> StickForStats:
        """Return the configured client, or create a default localhost one."""
        if self._client is None:
            self._client = StickForStats(
                base_url="http://localhost:8000/api/v1",
            )
        return self._client

    def _resolve_variable(self, name: str) -> Any:
        """Fetch a variable from the IPython user namespace by name."""
        user_ns = self.shell.user_ns
        if name not in user_ns:
            raise NameError(
                f"Variable '{name}' not found in notebook namespace. "
                f"Available DataFrames: {[k for k, v in user_ns.items() if hasattr(v, 'to_dict') and not k.startswith('_')]}"
            )
        return user_ns[name]

    def _parse_kwargs(self, tokens: list[str]) -> Dict[str, Any]:
        """Parse --key value pairs from a token list into a dict."""
        kwargs: Dict[str, Any] = {}
        i = 0
        while i < len(tokens):
            token = tokens[i]
            if token.startswith("--"):
                key = token[2:].replace("-", "_")
                # Boolean flags (no following value or next token is also a flag)
                if i + 1 >= len(tokens) or tokens[i + 1].startswith("--"):
                    kwargs[key] = True
                    i += 1
                    continue
                value = tokens[i + 1]
                # Try numeric conversion
                try:
                    value = float(value)
                    if value == int(value):
                        value = int(value)
                except ValueError:
                    pass
                kwargs[key] = value
                i += 2
            else:
                i += 1
        return kwargs

    # ------------------------------------------------------------------
    # %sfs_config
    # ------------------------------------------------------------------

    @line_magic
    def sfs_config(self, line: str) -> None:
        """
        Configure the StickForStats API connection.

        Usage::

            %sfs_config API_KEY
            %sfs_config API_KEY BASE_URL

        Parameters
        ----------
        line : str
            Space-separated: ``api_key [base_url]``.
            base_url defaults to ``http://localhost:8000/api/v1``.
        """
        parts = shlex.split(line.strip())
        if not parts:
            display(HTML(
                '<div style="padding:10px; background:#fff3e0; border-left:4px solid #ff9800; '
                'font-family:monospace;">'
                '<b>Usage:</b> %sfs_config API_KEY [BASE_URL]<br>'
                'Example: %sfs_config tok_abc123 http://localhost:8000/api/v1'
                '</div>'
            ))
            return

        api_key = parts[0]
        base_url = parts[1] if len(parts) > 1 else "http://localhost:8000/api/v1"

        # Close existing client if any
        if self._client is not None:
            self._client.close()

        self._client = StickForStats(api_key=api_key, base_url=base_url)

        masked = f"{api_key[:4]}...{api_key[-4:]}" if len(api_key) > 8 else "****"
        display(HTML(
            f'<div style="padding:10px; background:#e8f5e9; border-left:4px solid #4caf50; '
            f'font-family:monospace;">'
            f'<b>StickForStats configured</b><br>'
            f'Server: {base_url}<br>'
            f'API Key: {masked}'
            f'</div>'
        ))

    # ------------------------------------------------------------------
    # %sfs_profile
    # ------------------------------------------------------------------

    @line_magic
    def sfs_profile(self, line: str) -> None:
        """
        Profile a DataFrame — detect variable types, distributions, and
        get analysis recommendations.

        Usage::

            %sfs_profile df
            %sfs_profile my_dataframe

        Parameters
        ----------
        line : str
            Name of a DataFrame variable in the notebook namespace.
        """
        parts = shlex.split(line.strip())
        if not parts:
            display(HTML(
                '<div style="padding:10px; background:#fff3e0; border-left:4px solid #ff9800; '
                'font-family:monospace;">'
                '<b>Usage:</b> %sfs_profile DATAFRAME_VARIABLE<br>'
                'Example: %sfs_profile df'
                '</div>'
            ))
            return

        var_name = parts[0]
        try:
            data = self._resolve_variable(var_name)
            data_dict = _df_to_dict(data)
            client = self._get_client()
            result = client.autonomous.profile(data=data_dict)
            html = display_profile(result, var_name)
            display(HTML(html))
        except Exception as exc:
            display(HTML(
                f'<div style="padding:10px; background:#ffebee; border-left:4px solid #f44336; '
                f'font-family:monospace;">'
                f'<b>Error profiling {var_name}:</b> {exc}'
                f'</div>'
            ))

    # ------------------------------------------------------------------
    # %%sfs_analyze (cell magic)
    # ------------------------------------------------------------------

    @cell_magic
    def sfs_analyze(self, line: str, cell: str) -> None:
        """
        Run a statistical analysis on data from the notebook namespace.

        The first line specifies the test type and options.  The cell body
        lists the variable names (column groups) to analyze.

        Usage::

            %%sfs_analyze ttest --alpha 0.05 --paired
            group1 group2

            %%sfs_analyze anova --post-hoc tukey
            control treatment_a treatment_b

            %%sfs_analyze correlation
            x_variable y_variable

            %%sfs_analyze regression --type linear
            dependent predictor1 predictor2

        Parameters
        ----------
        line : str
            Test type followed by optional ``--key value`` parameters.
        cell : str
            Space- or newline-separated variable/column names.
        """
        tokens = shlex.split(line.strip())
        if not tokens:
            display(HTML(
                '<div style="padding:10px; background:#fff3e0; border-left:4px solid #ff9800; '
                'font-family:monospace;">'
                '<b>Usage:</b><br>'
                '%%sfs_analyze TEST_TYPE [--alpha 0.05] [--paired]<br>'
                'var1 var2 [var3 ...]'
                '</div>'
            ))
            return

        test_type = tokens[0].lower()
        kwargs = self._parse_kwargs(tokens[1:])

        # Parse variable names from the cell body
        var_names = cell.strip().split()
        if not var_names:
            display(HTML(
                '<div style="padding:10px; background:#ffebee; border-left:4px solid #f44336; '
                'font-family:monospace;">'
                '<b>Error:</b> No variable names provided in the cell body.<br>'
                'List the DataFrame variable names to analyze, one per line or space-separated.'
                '</div>'
            ))
            return

        try:
            client = self._get_client()

            # Resolve variables — each name can be a DataFrame or a list
            resolved = {}
            for name in var_names:
                val = self._resolve_variable(name)
                if hasattr(val, "tolist"):
                    resolved[name] = val.tolist()
                elif isinstance(val, list):
                    resolved[name] = val
                elif hasattr(val, "to_dict"):
                    # Merge DataFrame columns into resolved
                    for col, values in val.to_dict(orient="list").items():
                        resolved[col] = values
                else:
                    resolved[name] = list(val)

            result = None
            alpha = kwargs.pop("alpha", 0.05)

            if test_type in ("ttest", "t-test", "t_test"):
                paired = kwargs.pop("paired", False)
                alternative = kwargs.pop("alternative", "two-sided")
                result = client.stats.ttest(
                    data=resolved,
                    paired=bool(paired),
                    alpha=float(alpha),
                    alternative=str(alternative),
                    **kwargs,
                )
            elif test_type == "anova":
                post_hoc = kwargs.pop("post_hoc", "tukey")
                anova_type = kwargs.pop("type", kwargs.pop("anova_type", "one-way"))
                result = client.stats.anova(
                    data=resolved,
                    alpha=float(alpha),
                    anova_type=str(anova_type),
                    post_hoc=str(post_hoc),
                    **kwargs,
                )
            elif test_type == "correlation":
                method = kwargs.pop("method", "pearson")
                keys = list(resolved.keys())
                if len(keys) < 2:
                    raise ValueError("Correlation requires exactly 2 variables.")
                result = client.stats.correlation(
                    x=resolved[keys[0]],
                    y=resolved[keys[1]],
                    method=str(method),
                    alpha=float(alpha),
                    **kwargs,
                )
            elif test_type == "regression":
                reg_type = kwargs.pop("type", kwargs.pop("regression_type", "linear"))
                keys = list(resolved.keys())
                if len(keys) < 2:
                    raise ValueError(
                        "Regression requires at least 2 variables "
                        "(first = dependent, rest = predictors)."
                    )
                result = client.stats.regression(
                    data=resolved,
                    dependent=keys[0],
                    predictors=keys[1:],
                    regression_type=str(reg_type),
                    alpha=float(alpha),
                    **kwargs,
                )
            elif test_type == "descriptive":
                result = client.stats.descriptive(data=resolved, **kwargs)
            else:
                # Try Guardian cascade for unknown test types
                result = client.autonomous.cascade(
                    data=resolved,
                    test=test_type,
                    alpha=float(alpha),
                    **kwargs,
                )

            if result is not None:
                html = display_test_result(result, test_type)
                display(HTML(html))

        except Exception as exc:
            display(HTML(
                f'<div style="padding:10px; background:#ffebee; border-left:4px solid #f44336; '
                f'font-family:monospace;">'
                f'<b>Analysis error:</b> {exc}'
                f'</div>'
            ))

    # ------------------------------------------------------------------
    # %sfs_guardian
    # ------------------------------------------------------------------

    @line_magic
    def sfs_guardian(self, line: str) -> None:
        """
        Check Guardian assumptions for a dataset and test type.

        Usage::

            %sfs_guardian df ttest
            %sfs_guardian my_data anova

        Parameters
        ----------
        line : str
            Space-separated: ``DATAFRAME_VARIABLE TEST_TYPE``.
        """
        parts = shlex.split(line.strip())
        if len(parts) < 2:
            display(HTML(
                '<div style="padding:10px; background:#fff3e0; border-left:4px solid #ff9800; '
                'font-family:monospace;">'
                '<b>Usage:</b> %sfs_guardian DATAFRAME_VARIABLE TEST_TYPE<br>'
                'Example: %sfs_guardian df ttest'
                '</div>'
            ))
            return

        var_name, test_type = parts[0], parts[1]
        kwargs = self._parse_kwargs(parts[2:])

        try:
            data = self._resolve_variable(var_name)
            data_dict = _df_to_dict(data)
            client = self._get_client()

            alpha = kwargs.pop("alpha", 0.05)
            result = client.autonomous.cascade(
                data=data_dict,
                test=test_type,
                alpha=float(alpha),
                **kwargs,
            )

            # Extract and display the Guardian report
            guardian = getattr(result, "guardian_report", None)
            if guardian is not None:
                html = display_guardian_report(guardian, test_type)
            else:
                # Build a summary from the cascade result
                html = display_guardian_report(result, test_type)
            display(HTML(html))

        except Exception as exc:
            display(HTML(
                f'<div style="padding:10px; background:#ffebee; border-left:4px solid #f44336; '
                f'font-family:monospace;">'
                f'<b>Guardian check error:</b> {exc}'
                f'</div>'
            ))

    # ------------------------------------------------------------------
    # %sfs_query
    # ------------------------------------------------------------------

    @line_magic
    def sfs_query(self, line: str) -> None:
        """
        Ask a natural-language question about your data.

        Usage::

            %sfs_query "Is there a significant difference between groups?" --data df
            %sfs_query "What predicts the outcome?" --data my_data --alpha 0.01

        Parameters
        ----------
        line : str
            Quoted question string, followed by ``--data VARIABLE`` and
            optional ``--alpha FLOAT``.
        """
        parts = shlex.split(line.strip())
        if not parts:
            display(HTML(
                '<div style="padding:10px; background:#fff3e0; border-left:4px solid #ff9800; '
                'font-family:monospace;">'
                '<b>Usage:</b> %sfs_query "your question" --data DATAFRAME_VAR<br>'
                'Example: %sfs_query "Is there a difference between groups?" --data df'
                '</div>'
            ))
            return

        # First token (possibly quoted) is the question
        question = parts[0]
        kwargs = self._parse_kwargs(parts[1:])

        data_var = kwargs.pop("data", None)
        if data_var is None:
            display(HTML(
                '<div style="padding:10px; background:#ffebee; border-left:4px solid #f44336; '
                'font-family:monospace;">'
                '<b>Error:</b> --data parameter is required.<br>'
                'Example: %sfs_query "your question" --data df'
                '</div>'
            ))
            return

        alpha = kwargs.pop("alpha", 0.05)

        try:
            data = self._resolve_variable(str(data_var))
            data_dict = _df_to_dict(data)
            client = self._get_client()

            result = client.autonomous.query(
                question=question,
                data=data_dict,
                alpha=float(alpha),
                **kwargs,
            )

            # Build rich HTML output
            html_parts = [
                '<div style="font-family:\'Segoe UI\',sans-serif; padding:16px; '
                'background:#f5f5f5; border-radius:8px; margin:8px 0;">',
                f'<h3 style="margin:0 0 12px 0; color:#1565c0;">Query: {question}</h3>',
            ]

            if result.narrative:
                html_parts.append(
                    f'<div style="padding:12px; background:#e3f2fd; border-radius:6px; '
                    f'margin-bottom:10px; line-height:1.6;">{result.narrative}</div>'
                )

            if result.test_used:
                html_parts.append(
                    f'<div style="padding:8px 12px; background:#e8eaf6; border-radius:4px; '
                    f'margin-bottom:10px;"><b>Test used:</b> {result.test_used}</div>'
                )

            if result.interpretation:
                html_parts.append(
                    f'<div style="padding:12px; background:#fff; border:1px solid #e0e0e0; '
                    f'border-radius:6px; margin-bottom:10px;">'
                    f'<b>Interpretation:</b><br>{result.interpretation}</div>'
                )

            if result.results:
                rows = "".join(
                    f"<tr><td style='padding:6px 12px; border-bottom:1px solid #eee;'>"
                    f"<b>{k}</b></td>"
                    f"<td style='padding:6px 12px; border-bottom:1px solid #eee;'>{v}</td></tr>"
                    for k, v in result.results.items()
                )
                html_parts.append(
                    f'<table style="border-collapse:collapse; width:100%; margin-top:8px;">'
                    f'<thead><tr><th style="text-align:left; padding:8px 12px; '
                    f'background:#e8eaf6; border-bottom:2px solid #c5cae9;">Metric</th>'
                    f'<th style="text-align:left; padding:8px 12px; background:#e8eaf6; '
                    f'border-bottom:2px solid #c5cae9;">Value</th></tr></thead>'
                    f'<tbody>{rows}</tbody></table>'
                )

            html_parts.append("</div>")
            display(HTML("".join(html_parts)))

        except Exception as exc:
            display(HTML(
                f'<div style="padding:10px; background:#ffebee; border-left:4px solid #f44336; '
                f'font-family:monospace;">'
                f'<b>Query error:</b> {exc}'
                f'</div>'
            ))

    # ------------------------------------------------------------------
    # %sfs_manuscript
    # ------------------------------------------------------------------

    @line_magic
    def sfs_manuscript(self, line: str) -> None:
        """
        Analyze a manuscript for statistical claim verification.

        Usage::

            %sfs_manuscript paper.pdf
            %sfs_manuscript /path/to/manuscript.docx --field psychology

        Parameters
        ----------
        line : str
            File path, optionally followed by ``--field FIELD`` and
            ``--alpha FLOAT``.
        """
        parts = shlex.split(line.strip())
        if not parts:
            display(HTML(
                '<div style="padding:10px; background:#fff3e0; border-left:4px solid #ff9800; '
                'font-family:monospace;">'
                '<b>Usage:</b> %sfs_manuscript FILE_PATH [--field FIELD]<br>'
                'Example: %sfs_manuscript paper.pdf --field psychology'
                '</div>'
            ))
            return

        file_path = parts[0]
        kwargs = self._parse_kwargs(parts[1:])
        field = kwargs.pop("field", "general")
        alpha = kwargs.pop("alpha", 0.05)

        try:
            client = self._get_client()
            result = client.manuscript.analyze(
                file_path=file_path,
                field=str(field),
                alpha=float(alpha),
                **kwargs,
            )
            html = display_manuscript_report(result, file_path)
            display(HTML(html))

        except Exception as exc:
            display(HTML(
                f'<div style="padding:10px; background:#ffebee; border-left:4px solid #f44336; '
                f'font-family:monospace;">'
                f'<b>Manuscript analysis error:</b> {exc}'
                f'</div>'
            ))
