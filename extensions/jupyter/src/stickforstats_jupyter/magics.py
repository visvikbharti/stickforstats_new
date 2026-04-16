"""
Jupyter magic commands for StickForStats.

Usage in notebook::

    %load_ext stickforstats_jupyter

    %%sfs_analyze
    Run a t-test on columns A and B

    %sfs_describe df

    %sfs_guardian df
"""

from __future__ import annotations

try:
    from IPython.core.magic import Magics, cell_magic, line_magic, magics_class
    from IPython.display import HTML, display

    HAS_IPYTHON = True
except ImportError:
    HAS_IPYTHON = False


if HAS_IPYTHON:

    @magics_class
    class StickForStatsMagics(Magics):  # type: ignore[misc]
        """IPython magic commands for StickForStats."""

        def __init__(self, shell):  # type: ignore[no-untyped-def]
            super().__init__(shell)
            self._client = None

        def _get_client(self):  # type: ignore[no-untyped-def]
            if self._client is None:
                try:
                    from stickforstats import StickForStats
                except ImportError:
                    raise ImportError(
                        "stickforstats SDK not installed. "
                        "Install with: pip install stickforstats"
                    )
                import os

                self._client = StickForStats(
                    base_url=os.environ.get(
                        "STICKFORSTATS_URL",
                        "http://localhost:8000/api/v1",
                    )
                )
            return self._client

        @line_magic
        def sfs_describe(self, line):  # type: ignore[no-untyped-def]
            """Describe a DataFrame: ``%sfs_describe df_name``"""
            var_name = line.strip()
            df = self.shell.user_ns.get(var_name)
            if df is None:
                print(f"Variable '{var_name}' not found")
                return

            # Use pandas describe as baseline, enhance with shape info
            desc = df.describe()
            missing = df.isnull().sum()
            missing_html = ""
            cols_with_na = missing[missing > 0]
            if len(cols_with_na) > 0:
                items = ", ".join(
                    f"{col} ({n})" for col, n in cols_with_na.items()
                )
                missing_html = (
                    f"<p><b>Missing values:</b> {items}</p>"
                )

            display(HTML(
                f"<h3>StickForStats: Descriptive Statistics</h3>"
                f"<p><b>Shape:</b> {df.shape[0]} rows x "
                f"{df.shape[1]} columns</p>"
                f"<p><b>Numeric columns:</b> "
                f"{len(df.select_dtypes(include='number').columns)}"
                f" | <b>Categorical:</b> "
                f"{len(df.select_dtypes(include='object').columns)}</p>"
                f"{missing_html}"
                f"{desc.to_html()}"
            ))

        @line_magic
        def sfs_guardian(self, line):  # type: ignore[no-untyped-def]
            """Run Guardian checks on a DataFrame: ``%sfs_guardian df_name``"""
            var_name = line.strip()
            df = self.shell.user_ns.get(var_name)
            if df is None:
                print(f"Variable '{var_name}' not found")
                return

            numeric_cols = df.select_dtypes(include="number").columns
            html_parts = [
                "<h3>Guardian Assumption Check</h3>",
                f"<p>Checking {len(numeric_cols)} numeric column(s)...</p>",
                "<table style='border-collapse:collapse;width:100%'>",
                "<tr style='background:#f5f5f5'>"
                "<th style='padding:6px;text-align:left'>Column</th>"
                "<th style='padding:6px;text-align:left'>N</th>"
                "<th style='padding:6px;text-align:left'>Normality</th>"
                "<th style='padding:6px;text-align:left'>Shapiro p</th>"
                "</tr>",
            ]

            try:
                from scipy import stats as scipy_stats

                for col in numeric_cols:
                    data = df[col].dropna()
                    n = len(data)
                    if n < 3:
                        html_parts.append(
                            f"<tr><td style='padding:6px'>{col}</td>"
                            f"<td style='padding:6px'>{n}</td>"
                            f"<td style='padding:6px;color:#999'>"
                            f"Too few values</td>"
                            f"<td style='padding:6px'>-</td></tr>"
                        )
                        continue

                    # Shapiro-Wilk has a max of 5000 observations
                    test_data = data[:5000] if n > 5000 else data
                    _stat, p = scipy_stats.shapiro(test_data)
                    normal = p > 0.05
                    color = "#4caf50" if normal else "#ff9800"
                    label = "Normal" if normal else "Non-normal"
                    html_parts.append(
                        f"<tr><td style='padding:6px'><b>{col}</b></td>"
                        f"<td style='padding:6px'>{n}</td>"
                        f"<td style='padding:6px;color:{color}'>"
                        f"{label}</td>"
                        f"<td style='padding:6px'>{p:.4f}</td></tr>"
                    )
            except ImportError:
                html_parts.append(
                    "<tr><td colspan='4' style='padding:6px'>"
                    "<i>scipy not available for local checks. "
                    "Install with: pip install scipy</i>"
                    "</td></tr>"
                )

            html_parts.append("</table>")
            display(HTML("".join(html_parts)))

        @cell_magic
        def sfs_analyze(self, line, cell):  # type: ignore[no-untyped-def]
            """
            Natural language analysis::

                %%sfs_analyze
                Compare group A vs group B in my_dataframe
            """
            query = cell.strip()
            display(HTML(
                f"<h3>StickForStats Analysis</h3>"
                f"<p><i>Query: {query}</i></p>"
                f"<p>Sending to StickForStats server...</p>"
            ))

            try:
                client = self._get_client()
                # Look for a DataFrame in user namespace mentioned in query
                data = None
                for var_name, var_val in self.shell.user_ns.items():
                    if var_name.startswith("_"):
                        continue
                    try:
                        import pandas as pd

                        if isinstance(var_val, pd.DataFrame) and (
                            var_name in query
                        ):
                            data = {
                                col: var_val[col].dropna().tolist()
                                for col in var_val.columns
                            }
                            break
                    except ImportError:
                        break

                if data is not None:
                    result = client.autonomous.query(
                        question=query, data=data
                    )
                    display(HTML(
                        "<div style='background:#f5f5f5;"
                        "padding:16px;border-radius:8px'>"
                        f"<pre>{result}</pre></div>"
                    ))
                else:
                    display(HTML(
                        "<p style='color:#ff9800'>"
                        "No DataFrame found in query. "
                        "Mention the variable name in your query, e.g.:<br>"
                        "<code>%%sfs_analyze<br>"
                        "Compare columns A and B in my_df</code></p>"
                    ))
            except ImportError as exc:
                display(HTML(
                    f"<p style='color:red'>{exc}</p>"
                ))
            except Exception as exc:
                display(HTML(
                    f"<p style='color:red'>Error: {exc}</p>"
                    f"<p>Make sure the StickForStats server is running.</p>"
                ))

    def load_ipython_extension(ipython):  # type: ignore[no-untyped-def]
        """Register StickForStats magics with IPython."""
        ipython.register_magics(StickForStatsMagics)
