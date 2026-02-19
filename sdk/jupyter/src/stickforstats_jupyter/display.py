"""
Rich HTML display functions for StickForStats Jupyter output.

All functions return HTML strings with inline CSS (no external stylesheets)
suitable for rendering inside Jupyter notebook cells.  The color scheme uses:

- Green (#4caf50) for pass / success
- Orange (#ff9800) for warnings
- Red (#f44336) for violations / errors
"""

from __future__ import annotations

import html as html_module
from typing import Any, Dict, Optional


# ---------------------------------------------------------------------------
# Color constants
# ---------------------------------------------------------------------------

COLOR_PASS = "#4caf50"
COLOR_WARN = "#ff9800"
COLOR_FAIL = "#f44336"
COLOR_INFO = "#1565c0"

BG_PASS = "#e8f5e9"
BG_WARN = "#fff3e0"
BG_FAIL = "#ffebee"
BG_INFO = "#e3f2fd"
BG_CARD = "#f5f5f5"

FONT_FAMILY = "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _esc(text: Any) -> str:
    """HTML-escape arbitrary text."""
    return html_module.escape(str(text))


def _severity_color(severity: str) -> str:
    """Map a severity string to a color hex code."""
    s = severity.lower()
    if s in ("critical", "error", "fail"):
        return COLOR_FAIL
    if s in ("warning", "warn"):
        return COLOR_WARN
    return COLOR_PASS


def _severity_bg(severity: str) -> str:
    """Map a severity string to a background color."""
    s = severity.lower()
    if s in ("critical", "error", "fail"):
        return BG_FAIL
    if s in ("warning", "warn"):
        return BG_WARN
    return BG_PASS


def _badge(label: str, color: str) -> str:
    """Render an inline badge span."""
    return (
        f'<span style="display:inline-block; padding:2px 8px; border-radius:10px; '
        f'font-size:11px; font-weight:600; color:#fff; background:{color}; '
        f'text-transform:uppercase; letter-spacing:0.5px;">{_esc(label)}</span>'
    )


def _card_open(title: str, subtitle: str = "", border_color: str = COLOR_INFO) -> str:
    """Opening markup for a styled card container."""
    sub = f'<div style="color:#757575; font-size:13px; margin-top:4px;">{_esc(subtitle)}</div>' if subtitle else ""
    return (
        f'<div style="font-family:{FONT_FAMILY}; padding:16px; background:{BG_CARD}; '
        f'border-left:5px solid {border_color}; border-radius:8px; margin:8px 0; '
        f'box-shadow:0 1px 3px rgba(0,0,0,0.08);">'
        f'<h3 style="margin:0 0 4px 0; color:#212121;">{_esc(title)}</h3>'
        f'{sub}'
    )


def _card_close() -> str:
    return "</div>"


def _section(title: str, content: str, collapsed: bool = False) -> str:
    """Render an expandable <details> section or an open div."""
    if collapsed:
        return (
            f'<details style="margin:10px 0;">'
            f'<summary style="cursor:pointer; font-weight:600; color:{COLOR_INFO}; '
            f'padding:6px 0;">{_esc(title)}</summary>'
            f'<div style="padding:8px 0;">{content}</div>'
            f'</details>'
        )
    return (
        f'<div style="margin:10px 0;">'
        f'<div style="font-weight:600; color:{COLOR_INFO}; padding:6px 0; '
        f'border-bottom:1px solid #e0e0e0; margin-bottom:6px;">{_esc(title)}</div>'
        f'{content}'
        f'</div>'
    )


def _key_value_table(data: Dict[str, Any], highlight_keys: Optional[set] = None) -> str:
    """Render a two-column key/value table."""
    if not data:
        return '<div style="color:#9e9e9e; font-style:italic;">No data</div>'

    highlight_keys = highlight_keys or set()
    rows = []
    for key, value in data.items():
        val_style = ""
        if key in highlight_keys:
            val_style = "font-weight:600; color:#1565c0;"
        rows.append(
            f'<tr>'
            f'<td style="padding:6px 12px; border-bottom:1px solid #eee; '
            f'color:#616161; white-space:nowrap;"><b>{_esc(key)}</b></td>'
            f'<td style="padding:6px 12px; border-bottom:1px solid #eee; {val_style}">'
            f'{_esc(value)}</td>'
            f'</tr>'
        )

    return (
        f'<table style="border-collapse:collapse; width:100%;">'
        f'<tbody>{"".join(rows)}</tbody>'
        f'</table>'
    )


def _format_number(value: Any, decimals: int = 4) -> str:
    """Format a number for display, or return the string as-is."""
    if value is None:
        return "N/A"
    try:
        f = float(value)
        if abs(f) < 0.001 and f != 0:
            return f"{f:.2e}"
        return f"{f:.{decimals}f}"
    except (TypeError, ValueError):
        return str(value)


# ---------------------------------------------------------------------------
# Public display functions
# ---------------------------------------------------------------------------

def display_guardian_report(report: Any, test_type: str = "") -> str:
    """
    Render a Guardian Statistical Protection report as rich HTML.

    Parameters
    ----------
    report : GuardianReport or CascadeResult
        The Guardian report object from the SDK.
    test_type : str
        Name of the statistical test being checked.

    Returns
    -------
    str
        HTML string for display in a Jupyter cell.
    """
    # Handle both GuardianReport and CascadeResult objects
    confidence = getattr(report, "confidence", None)
    violations = getattr(report, "violations", [])
    passed = getattr(report, "passed", None)
    recommendation = getattr(report, "recommendation", None)
    fallback_used = getattr(report, "fallback_used", False)
    original_test = getattr(report, "original_test", None)
    executed_test = getattr(report, "executed_test", None)

    # If this is a CascadeResult, try to extract the nested guardian_report
    guardian_report = getattr(report, "guardian_report", None)
    if guardian_report is not None:
        confidence = getattr(guardian_report, "confidence", confidence)
        violations = getattr(guardian_report, "violations", violations)
        passed = getattr(guardian_report, "passed", passed)
        recommendation = getattr(guardian_report, "recommendation", recommendation)

    # Determine overall status
    if passed is True or (not violations and passed is None):
        status_color = COLOR_PASS
        status_label = "PASSED"
    elif any(getattr(v, "severity", "").lower() == "critical" for v in violations):
        status_color = COLOR_FAIL
        status_label = "VIOLATIONS FOUND"
    else:
        status_color = COLOR_WARN
        status_label = "WARNINGS"

    parts = []
    title = f"Guardian Report{' — ' + test_type.upper() if test_type else ''}"
    parts.append(_card_open(title, border_color=status_color))

    # Status bar
    conf_display = f"{confidence:.1%}" if confidence is not None else "N/A"
    parts.append(
        f'<div style="display:flex; align-items:center; gap:12px; margin:12px 0; '
        f'padding:10px; background:#fff; border-radius:6px; border:1px solid #e0e0e0;">'
        f'{_badge(status_label, status_color)}'
        f'<div style="flex:1;">'
        f'<div style="font-size:13px; color:#757575;">Confidence Score</div>'
        f'<div style="font-size:22px; font-weight:700; color:{status_color};">{conf_display}</div>'
        f'</div>'
    )

    # Confidence bar
    conf_pct = (confidence or 0) * 100
    parts.append(
        f'<div style="flex:2; padding-top:6px;">'
        f'<div style="background:#e0e0e0; border-radius:4px; height:12px; overflow:hidden;">'
        f'<div style="background:{status_color}; height:100%; width:{conf_pct:.0f}%; '
        f'border-radius:4px; transition:width 0.3s;"></div>'
        f'</div></div></div>'
    )

    # Fallback notice
    if fallback_used and original_test and executed_test:
        parts.append(
            f'<div style="padding:10px; background:#fff3e0; border-radius:6px; margin:8px 0; '
            f'border-left:3px solid {COLOR_WARN};">'
            f'<b>Cascade fallback:</b> {_esc(original_test)} &rarr; {_esc(executed_test)}'
            f'</div>'
        )

    # Violations
    if violations:
        parts.append(
            f'<div style="margin-top:12px; font-weight:600; font-size:14px; color:#424242;">'
            f'Violations ({len(violations)})</div>'
        )
        for v in violations:
            sev = getattr(v, "severity", "info")
            code = getattr(v, "code", "")
            msg = getattr(v, "message", "")
            suggestion = getattr(v, "suggestion", None)

            parts.append(
                f'<div style="margin:6px 0; padding:10px 12px; background:#fff; '
                f'border-radius:6px; border-left:4px solid {_severity_color(sev)};">'
                f'{_badge(sev, _severity_color(sev))} '
                f'<code style="font-size:12px; color:#757575; margin-left:6px;">{_esc(code)}</code>'
                f'<div style="margin-top:6px; color:#424242;">{_esc(msg)}</div>'
            )
            if suggestion:
                parts.append(
                    f'<div style="margin-top:4px; font-size:13px; color:#1565c0;">'
                    f'Suggestion: {_esc(suggestion)}</div>'
                )
            parts.append("</div>")
    else:
        parts.append(
            f'<div style="margin-top:12px; padding:10px; background:{BG_PASS}; '
            f'border-radius:6px; color:{COLOR_PASS}; font-weight:600;">'
            f'All assumption checks passed.</div>'
        )

    # Recommendation
    if recommendation:
        parts.append(
            f'<div style="margin-top:10px; padding:10px; background:{BG_INFO}; '
            f'border-radius:6px; font-size:13px;">'
            f'<b>Recommendation:</b> {_esc(recommendation)}</div>'
        )

    parts.append(_card_close())
    return "".join(parts)


def display_test_result(result: Any, test_type: str = "") -> str:
    """
    Render a statistical test result as rich HTML.

    Parameters
    ----------
    result : TTestResult, ANOVAResult, CorrelationResult, etc.
        The result object from the SDK.
    test_type : str
        Name of the test for the title.

    Returns
    -------
    str
        HTML string for display in a Jupyter cell.
    """
    parts = []
    title = f"Analysis Result — {test_type.upper()}" if test_type else "Analysis Result"

    # Determine significance from p-value
    p_val = getattr(result, "p_value", None)
    if p_val is not None:
        sig = p_val < 0.05
        border_color = COLOR_PASS if sig else COLOR_WARN
        sig_badge = _badge("Significant" if sig else "Not Significant", border_color)
    else:
        border_color = COLOR_INFO
        sig_badge = ""

    parts.append(_card_open(title, border_color=border_color))

    if sig_badge:
        parts.append(f'<div style="margin:8px 0;">{sig_badge}</div>')

    # Collect primary statistics
    stats_dict: Dict[str, str] = {}

    # Common fields across test types
    field_map = [
        ("t_statistic", "t-statistic"),
        ("f_statistic", "F-statistic"),
        ("statistic", "Test statistic"),
        ("correlation", "Correlation (r)"),
        ("r_squared", "R-squared"),
        ("adjusted_r_squared", "Adjusted R-squared"),
        ("p_value", "p-value"),
        ("degrees_of_freedom", "Degrees of freedom"),
        ("degrees_of_freedom_between", "df (between)"),
        ("degrees_of_freedom_within", "df (within)"),
        ("effect_size", "Effect size"),
        ("eta_squared", "Eta-squared"),
        ("method", "Method"),
        ("test_type", "Test type"),
        ("test_name", "Test name"),
        ("sample_size", "Sample size"),
        ("count", "N"),
        ("mean", "Mean"),
        ("median", "Median"),
        ("std_dev", "Std. deviation"),
        ("variance", "Variance"),
        ("skewness", "Skewness"),
        ("kurtosis", "Kurtosis"),
        ("power", "Power"),
        ("regression_type", "Regression type"),
        ("residual_std_error", "Residual std. error"),
    ]

    for attr, label in field_map:
        val = getattr(result, attr, None)
        if val is not None:
            stats_dict[label] = _format_number(val)

    # Confidence interval
    ci = getattr(result, "confidence_interval", None)
    if ci and isinstance(ci, dict):
        lower = ci.get("lower", ci.get("low", "?"))
        upper = ci.get("upper", ci.get("high", "?"))
        stats_dict["95% CI"] = f"[{_format_number(lower)}, {_format_number(upper)}]"

    # Means
    means = getattr(result, "means", None)
    if means and isinstance(means, dict):
        for group, mean_val in means.items():
            stats_dict[f"Mean ({group})"] = _format_number(mean_val)

    # Quartiles
    quartiles = getattr(result, "quartiles", None)
    if quartiles and isinstance(quartiles, dict):
        for q, val in quartiles.items():
            stats_dict[f"Q{q}"] = _format_number(val)

    # Primary statistics table
    highlight = {"p-value", "Effect size", "Correlation (r)", "R-squared"}
    parts.append(_section("Results", _key_value_table(stats_dict, highlight)))

    # Regression coefficients
    coefficients = getattr(result, "coefficients", None)
    if coefficients:
        coeff_rows = []
        coeff_rows.append(
            '<tr style="background:#e8eaf6;">'
            '<th style="padding:8px; text-align:left;">Variable</th>'
            '<th style="padding:8px; text-align:right;">Coefficient</th>'
            '<th style="padding:8px; text-align:right;">Std. Error</th>'
            '<th style="padding:8px; text-align:right;">t</th>'
            '<th style="padding:8px; text-align:right;">p-value</th></tr>'
        )
        for c in coefficients:
            p = getattr(c, "p_value", None)
            row_bg = BG_PASS if (p is not None and p < 0.05) else ""
            coeff_rows.append(
                f'<tr style="background:{row_bg};">'
                f'<td style="padding:6px 8px;">{_esc(getattr(c, "variable", ""))}</td>'
                f'<td style="padding:6px 8px; text-align:right;">{_format_number(getattr(c, "coefficient", None))}</td>'
                f'<td style="padding:6px 8px; text-align:right;">{_format_number(getattr(c, "std_error", None))}</td>'
                f'<td style="padding:6px 8px; text-align:right;">{_format_number(getattr(c, "t_statistic", None))}</td>'
                f'<td style="padding:6px 8px; text-align:right;">{_format_number(p)}</td>'
                f'</tr>'
            )
        coeff_html = f'<table style="border-collapse:collapse; width:100%;">{"".join(coeff_rows)}</table>'
        parts.append(_section("Coefficients", coeff_html))

    # Post-hoc results
    post_hoc = getattr(result, "post_hoc", None)
    if post_hoc and isinstance(post_hoc, dict):
        ph_rows = "".join(
            f"<tr><td style='padding:6px 8px; border-bottom:1px solid #eee;'><b>{_esc(k)}</b></td>"
            f"<td style='padding:6px 8px; border-bottom:1px solid #eee;'>{_esc(v)}</td></tr>"
            for k, v in post_hoc.items()
        )
        ph_html = f'<table style="border-collapse:collapse; width:100%;">{ph_rows}</table>'
        parts.append(_section("Post-hoc Comparisons", ph_html, collapsed=True))

    # Cascade info
    fallback = getattr(result, "fallback_used", False)
    if fallback:
        orig = getattr(result, "original_test", "?")
        exec_test = getattr(result, "executed_test", "?")
        parts.append(
            f'<div style="padding:10px; background:{BG_WARN}; border-radius:6px; margin:8px 0;">'
            f'<b>Guardian cascade:</b> Assumptions violated for <b>{_esc(orig)}</b>, '
            f'fell back to <b>{_esc(exec_test)}</b>.</div>'
        )

    # Guardian report
    guardian = getattr(result, "guardian", None)
    if guardian is not None:
        guardian_html = display_guardian_report(guardian, test_type)
        parts.append(_section("Guardian Report", guardian_html, collapsed=True))

    # Plain-language interpretation (from translate endpoint)
    narrative = getattr(result, "narrative", None)
    if narrative:
        parts.append(
            f'<div style="margin-top:10px; padding:12px; background:{BG_INFO}; '
            f'border-radius:6px; line-height:1.6;">'
            f'<b>Plain English:</b> {_esc(narrative)}</div>'
        )

    parts.append(_card_close())
    return "".join(parts)


def display_profile(profile: Any, variable_name: str = "data") -> str:
    """
    Render a data profile as a rich HTML health card.

    Parameters
    ----------
    profile : ProfileResult
        The profiling result from the SDK.
    variable_name : str
        Name of the variable in the user's namespace.

    Returns
    -------
    str
        HTML string for display in a Jupyter cell.
    """
    parts = []
    parts.append(_card_open(
        f"Data Profile: {variable_name}",
        subtitle="Autonomous variable detection and distribution analysis",
        border_color=COLOR_INFO,
    ))

    # Summary stats
    summary = getattr(profile, "summary", None)
    if summary and isinstance(summary, dict):
        parts.append(_section("Summary", _key_value_table(summary)))

    # Variable types
    var_types = getattr(profile, "variable_types", None)
    if var_types and isinstance(var_types, dict):
        type_badges = {
            "numeric": "#1565c0",
            "continuous": "#1565c0",
            "categorical": "#6a1b9a",
            "ordinal": "#00695c",
            "binary": "#e65100",
            "datetime": "#37474f",
            "text": "#4e342e",
        }

        rows = []
        for var_name_item, var_type in var_types.items():
            badge_color = type_badges.get(var_type.lower(), "#757575")
            rows.append(
                f'<tr>'
                f'<td style="padding:6px 12px; border-bottom:1px solid #eee;">'
                f'<code>{_esc(var_name_item)}</code></td>'
                f'<td style="padding:6px 12px; border-bottom:1px solid #eee;">'
                f'{_badge(var_type, badge_color)}</td>'
                f'</tr>'
            )

        types_html = (
            f'<table style="border-collapse:collapse; width:100%;">'
            f'<thead><tr>'
            f'<th style="text-align:left; padding:8px 12px; background:#e8eaf6; '
            f'border-bottom:2px solid #c5cae9;">Variable</th>'
            f'<th style="text-align:left; padding:8px 12px; background:#e8eaf6; '
            f'border-bottom:2px solid #c5cae9;">Detected Type</th>'
            f'</tr></thead>'
            f'<tbody>{"".join(rows)}</tbody></table>'
        )
        parts.append(_section("Variable Types", types_html))

    # Distributions
    distributions = getattr(profile, "distributions", None)
    if distributions and isinstance(distributions, dict):
        dist_items = []
        for var_name_item, dist_info in distributions.items():
            if isinstance(dist_info, dict):
                info_parts = ", ".join(f"{k}: {_format_number(v)}" for k, v in dist_info.items())
            else:
                info_parts = str(dist_info)
            dist_items.append(
                f'<div style="padding:8px 12px; margin:4px 0; background:#fff; '
                f'border-radius:4px; border:1px solid #e0e0e0;">'
                f'<code style="color:{COLOR_INFO};">{_esc(var_name_item)}</code>: '
                f'<span style="color:#616161;">{_esc(info_parts)}</span></div>'
            )
        parts.append(_section("Distributions", "".join(dist_items), collapsed=True))

    # Recommendations
    recommendations = getattr(profile, "recommendations", [])
    if recommendations:
        rec_items = "".join(
            f'<li style="margin:4px 0; line-height:1.5;">{_esc(r)}</li>'
            for r in recommendations
        )
        parts.append(_section(
            "Recommended Analyses",
            f'<ul style="margin:4px 0; padding-left:20px;">{rec_items}</ul>',
        ))

    # Warnings
    warnings = getattr(profile, "warnings", [])
    if warnings:
        warn_items = "".join(
            f'<div style="padding:6px 10px; margin:4px 0; background:{BG_WARN}; '
            f'border-radius:4px; border-left:3px solid {COLOR_WARN};">{_esc(w)}</div>'
            for w in warnings
        )
        parts.append(_section("Warnings", warn_items))

    parts.append(_card_close())
    return "".join(parts)


def display_manuscript_report(report: Any, file_path: str = "") -> str:
    """
    Render a manuscript analysis report with expandable sections.

    Parameters
    ----------
    report : ManuscriptReport
        The manuscript analysis result from the SDK.
    file_path : str
        Path to the analyzed file (for display purposes).

    Returns
    -------
    str
        HTML string for display in a Jupyter cell.
    """
    import os

    filename = os.path.basename(file_path) if file_path else "manuscript"
    overall_score = getattr(report, "overall_score", None)
    claims = getattr(report, "claims", [])
    issues = getattr(report, "issues", [])
    summary = getattr(report, "summary", None)
    field = getattr(report, "field", "")

    # Determine border color from score
    if overall_score is not None:
        if overall_score >= 0.8:
            border_color = COLOR_PASS
        elif overall_score >= 0.5:
            border_color = COLOR_WARN
        else:
            border_color = COLOR_FAIL
    else:
        border_color = COLOR_INFO

    parts = []
    parts.append(_card_open(
        f"Manuscript Review: {filename}",
        subtitle=f"Field: {field}" if field else "",
        border_color=border_color,
    ))

    # Score display
    if overall_score is not None:
        score_pct = overall_score * 100
        parts.append(
            f'<div style="display:flex; align-items:center; gap:16px; margin:12px 0; '
            f'padding:12px; background:#fff; border-radius:6px; border:1px solid #e0e0e0;">'
            f'<div>'
            f'<div style="font-size:13px; color:#757575;">Overall Score</div>'
            f'<div style="font-size:28px; font-weight:700; color:{border_color};">'
            f'{score_pct:.0f}/100</div></div>'
            f'<div style="flex:1;">'
            f'<div style="background:#e0e0e0; border-radius:4px; height:14px; overflow:hidden;">'
            f'<div style="background:{border_color}; height:100%; width:{score_pct:.0f}%; '
            f'border-radius:4px;"></div></div></div></div>'
        )

    # Summary
    if summary:
        parts.append(
            f'<div style="padding:12px; background:{BG_INFO}; border-radius:6px; '
            f'margin:10px 0; line-height:1.6;">{_esc(summary)}</div>'
        )

    # Statistical claims
    if claims:
        claims_rows = []
        for i, claim in enumerate(claims, 1):
            text = getattr(claim, "text", "")
            test_type = getattr(claim, "test_type", None)
            reported_stat = getattr(claim, "reported_statistic", None)
            reported_p = getattr(claim, "reported_p_value", None)
            verified = getattr(claim, "verified", None)
            issue = getattr(claim, "issue", None)

            if verified is True:
                status = _badge("Verified", COLOR_PASS)
            elif verified is False:
                status = _badge("Issue", COLOR_FAIL)
            else:
                status = _badge("Unchecked", "#9e9e9e")

            detail_parts = []
            if test_type:
                detail_parts.append(f"Test: {test_type}")
            if reported_stat:
                detail_parts.append(f"Statistic: {reported_stat}")
            if reported_p is not None:
                detail_parts.append(f"p = {_format_number(reported_p)}")
            details = " | ".join(detail_parts)

            issue_html = ""
            if issue:
                issue_html = (
                    f'<div style="margin-top:4px; padding:6px 8px; background:{BG_FAIL}; '
                    f'border-radius:4px; font-size:12px; color:{COLOR_FAIL};">{_esc(issue)}</div>'
                )

            claims_rows.append(
                f'<div style="padding:10px 12px; margin:4px 0; background:#fff; '
                f'border-radius:6px; border:1px solid #e0e0e0;">'
                f'<div style="display:flex; justify-content:space-between; align-items:flex-start;">'
                f'<div style="flex:1;"><b>Claim {i}:</b> {_esc(text)}</div>'
                f'<div style="margin-left:8px;">{status}</div></div>'
                f'<div style="font-size:12px; color:#757575; margin-top:4px;">{_esc(details)}</div>'
                f'{issue_html}</div>'
            )

        verified_count = sum(1 for c in claims if getattr(c, "verified", None) is True)
        claims_title = f"Statistical Claims ({verified_count}/{len(claims)} verified)"
        parts.append(_section(claims_title, "".join(claims_rows)))

    # Issues
    if issues:
        issue_items = []
        for iss in issues:
            if isinstance(iss, dict):
                sev = iss.get("severity", "info")
                msg = iss.get("message", iss.get("description", str(iss)))
                loc = iss.get("location", "")
                loc_html = f' <span style="color:#9e9e9e;">[{_esc(loc)}]</span>' if loc else ""
                issue_items.append(
                    f'<div style="padding:8px 12px; margin:4px 0; background:{_severity_bg(sev)}; '
                    f'border-radius:4px; border-left:3px solid {_severity_color(sev)};">'
                    f'{_badge(sev, _severity_color(sev))} '
                    f'{_esc(msg)}{loc_html}</div>'
                )
            else:
                issue_items.append(
                    f'<div style="padding:8px 12px; margin:4px 0; background:{BG_WARN}; '
                    f'border-radius:4px;">{_esc(iss)}</div>'
                )

        parts.append(_section(
            f"Issues ({len(issues)})",
            "".join(issue_items),
            collapsed=len(issues) > 5,
        ))

    parts.append(_card_close())
    return "".join(parts)
