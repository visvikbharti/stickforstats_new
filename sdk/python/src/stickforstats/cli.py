"""
CLI interface for StickForStats.

Install with the ``cli`` extra::

    pip install stickforstats[cli]

Then invoke via::

    sfs --help
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

try:
    import click
    from rich.console import Console
    from rich.panel import Panel
    from rich.table import Table
except ImportError:
    _cli_available = False
else:
    _cli_available = True

CONFIG_DIR = Path.home() / ".stickforstats"
CONFIG_FILE = CONFIG_DIR / "config.json"


# ---------------------------------------------------------------------------
# Configuration helpers
# ---------------------------------------------------------------------------

def _load_config() -> dict[str, Any]:
    """Load saved configuration from disk."""
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE) as f:
            return json.load(f)
    return {}


def _save_config(cfg: dict[str, Any]) -> None:
    """Persist configuration to disk."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        json.dump(cfg, f, indent=2)


def _make_client(**overrides: Any) -> Any:
    """Create a StickForStats client using saved config + overrides."""
    from stickforstats.client import StickForStats

    cfg = _load_config()
    return StickForStats(
        base_url=overrides.get("base_url") or cfg.get("base_url", "http://localhost:8000/api/v1"),
        api_key=overrides.get("api_key") or cfg.get("api_key"),
        timeout=float(overrides.get("timeout") or cfg.get("timeout", 60)),
    )


def _read_data_file(file_path: str) -> dict[str, list[float]]:
    """
    Read a CSV or JSON file into a column-oriented dict.

    For CSV files, the first row is treated as headers and all subsequent
    values are parsed as floats (non-numeric values become NaN).
    """
    import csv

    path = Path(file_path)
    if not path.exists():
        raise click.ClickException(f"File not found: {file_path}")

    suffix = path.suffix.lower()

    if suffix == ".json":
        with open(path) as f:
            return json.load(f)

    if suffix in (".csv", ".tsv"):
        delimiter = "\t" if suffix == ".tsv" else ","
        with open(path, newline="") as f:
            reader = csv.reader(f, delimiter=delimiter)
            headers = next(reader)
            columns: dict[str, list[float]] = {h.strip(): [] for h in headers}
            for row in reader:
                for h, val in zip(headers, row):
                    h = h.strip()
                    try:
                        columns[h].append(float(val))
                    except (ValueError, TypeError):
                        columns[h].append(float("nan"))
        return columns

    raise click.ClickException(f"Unsupported file format: {suffix} (use .csv, .tsv, or .json)")


# ---------------------------------------------------------------------------
# CLI group
# ---------------------------------------------------------------------------

if _cli_available:

    console = Console()

    @click.group()
    @click.version_option(package_name="stickforstats")
    def main() -> None:
        """StickForStats CLI -- statistical analysis from the command line."""
        pass

    # ------------------------------------------------------------------
    # config
    # ------------------------------------------------------------------

    @main.command()
    @click.option("--api-key", default=None, help="API token for authentication.")
    @click.option("--base-url", default=None, help="Base URL of the StickForStats API.")
    @click.option("--timeout", default=None, type=float, help="Request timeout in seconds.")
    @click.option("--show", is_flag=True, help="Display current configuration.")
    def config(
        api_key: str | None,
        base_url: str | None,
        timeout: float | None,
        show: bool,
    ) -> None:
        """Configure API connection settings (saved to ~/.stickforstats/config.json)."""
        cfg = _load_config()

        if show:
            if not cfg:
                console.print("[dim]No configuration saved yet.[/dim]")
                return
            table = Table(title="StickForStats Configuration")
            table.add_column("Key", style="cyan")
            table.add_column("Value", style="green")
            for k, v in cfg.items():
                display = f"{v[:4]}...{v[-4:]}" if k == "api_key" and v else str(v)
                table.add_row(k, display)
            console.print(table)
            return

        if api_key is not None:
            cfg["api_key"] = api_key
        if base_url is not None:
            cfg["base_url"] = base_url
        if timeout is not None:
            cfg["timeout"] = timeout

        if not any([api_key, base_url, timeout]):
            console.print("[yellow]No settings provided. Use --help for options.[/yellow]")
            return

        _save_config(cfg)
        console.print("[green]Configuration saved.[/green]")

    # ------------------------------------------------------------------
    # analyze
    # ------------------------------------------------------------------

    @main.command()
    @click.option("--file", "-f", "file_path", required=True, help="Path to data file (CSV/JSON).")
    @click.option(
        "--test", "-t", "test_name", required=True,
        type=click.Choice(
            ["ttest", "anova", "correlation", "regression", "descriptive"],
            case_sensitive=False,
        ),
        help="Statistical test to run.",
    )
    @click.option("--alpha", default=0.05, type=float, help="Significance level.")
    @click.option("--groups", default=None, help="Comma-separated group column names.")
    @click.option("--method", default="pearson", help="Correlation method.")
    @click.option("--dependent", default=None, help="Dependent variable (regression).")
    @click.option(
        "--predictors", default=None,
        help="Comma-separated predictor names (regression).",
    )
    def analyze(
        file_path: str,
        test_name: str,
        alpha: float,
        groups: str | None,
        method: str,
        dependent: str | None,
        predictors: str | None,
    ) -> None:
        """Run a statistical test on a data file."""
        client = _make_client()
        data = _read_data_file(file_path)
        test_name = test_name.lower()

        try:
            if test_name == "ttest":
                group_list = [g.strip() for g in groups.split(",")] if groups else None
                result = client.stats.ttest(data=data, groups=group_list, alpha=alpha)
            elif test_name == "anova":
                result = client.stats.anova(data=data, alpha=alpha)
            elif test_name == "correlation":
                keys = list(data.keys())
                if len(keys) < 2:
                    raise click.ClickException("Correlation requires at least 2 columns.")
                result = client.stats.correlation(
                    x=data[keys[0]], y=data[keys[1]], method=method, alpha=alpha
                )
            elif test_name == "regression":
                if not dependent:
                    raise click.ClickException("--dependent is required for regression.")
                pred_list = (
                    [p.strip() for p in predictors.split(",")] if predictors
                    else [k for k in data.keys() if k != dependent]
                )
                result = client.stats.regression(
                    data=data, dependent=dependent, predictors=pred_list, alpha=alpha
                )
            elif test_name == "descriptive":
                result = client.stats.descriptive(data=data)
            else:
                raise click.ClickException(f"Unknown test: {test_name}")

            _display_result(result)

        except Exception as exc:
            console.print(f"[red]Error: {exc}[/red]")
            raise SystemExit(1)

    # ------------------------------------------------------------------
    # profile
    # ------------------------------------------------------------------

    @main.command()
    @click.option("--file", "-f", "file_path", required=True, help="Path to data file (CSV/JSON).")
    def profile(file_path: str) -> None:
        """Smart-profile a dataset using the Autonomous Intelligence Layer."""
        client = _make_client()
        data = _read_data_file(file_path)

        try:
            result = client.autonomous.profile(data=data)
            _display_result(result)
        except Exception as exc:
            console.print(f"[red]Error: {exc}[/red]")
            raise SystemExit(1)

    # ------------------------------------------------------------------
    # query
    # ------------------------------------------------------------------

    @main.command()
    @click.argument("question")
    @click.option("--file", "-f", "file_path", required=True, help="Path to data file (CSV/JSON).")
    @click.option("--alpha", default=0.05, type=float, help="Significance level.")
    def query(question: str, file_path: str, alpha: float) -> None:
        """Ask a natural-language question about your data."""
        client = _make_client()
        data = _read_data_file(file_path)

        try:
            result = client.autonomous.query(question=question, data=data, alpha=alpha)
            _display_result(result)
        except Exception as exc:
            console.print(f"[red]Error: {exc}[/red]")
            raise SystemExit(1)

    # ------------------------------------------------------------------
    # manuscript
    # ------------------------------------------------------------------

    @main.command()
    @click.option(
        "--file", "-f", "file_path", required=True,
        help="Path to manuscript (PDF/DOCX/TeX).",
    )
    @click.option("--field", default="general", help="Research field (e.g. psychology, medicine).")
    @click.option("--alpha", default=0.05, type=float, help="Significance level.")
    @click.option(
        "--mode", default="analyze",
        type=click.Choice(["analyze", "parse", "claims", "consistency"], case_sensitive=False),
        help="Analysis mode.",
    )
    def manuscript(file_path: str, field: str, alpha: float, mode: str) -> None:
        """Analyze a manuscript for statistical correctness."""
        client = _make_client()
        mode = mode.lower()

        try:
            if mode == "analyze":
                result = client.manuscript.analyze(file_path, field=field, alpha=alpha)
            elif mode == "parse":
                result = client.manuscript.parse(file_path)
            elif mode == "claims":
                result = client.manuscript.extract_claims(file_path)
            elif mode == "consistency":
                result = client.manuscript.check_consistency(file_path, alpha=alpha)
            else:
                raise click.ClickException(f"Unknown mode: {mode}")

            _display_result(result)

        except Exception as exc:
            console.print(f"[red]Error: {exc}[/red]")
            raise SystemExit(1)

    # ------------------------------------------------------------------
    # usage
    # ------------------------------------------------------------------

    @main.command()
    def usage() -> None:
        """Display current API usage statistics."""
        client = _make_client()

        try:
            summary = client.platform.usage()
            table = Table(title="API Usage")
            table.add_column("Metric", style="cyan")
            table.add_column("Value", style="green")
            table.add_row("Tier", summary.tier or "N/A")
            table.add_row("Total Requests", str(summary.total_requests))
            table.add_row("Requests Today", str(summary.requests_today))
            remaining = (
                str(summary.remaining_quota)
                if summary.remaining_quota is not None
                else "Unlimited"
            )
            table.add_row("Remaining Quota", remaining)
            if summary.period_start:
                table.add_row("Period", f"{summary.period_start} -- {summary.period_end}")
            console.print(table)

        except Exception as exc:
            console.print(f"[red]Error: {exc}[/red]")
            raise SystemExit(1)

    # ------------------------------------------------------------------
    # Result display helper
    # ------------------------------------------------------------------

    def _display_result(result: Any) -> None:
        """Pretty-print a Pydantic model using rich."""
        from pydantic import BaseModel

        if isinstance(result, BaseModel):
            data = result.model_dump(exclude_none=True)
        elif isinstance(result, dict):
            data = result
        else:
            console.print(result)
            return

        formatted = json.dumps(data, indent=2, default=str)
        console.print(Panel(formatted, title="Result", border_style="green"))

else:
    # CLI dependencies not installed
    def main() -> None:
        """Stub entry point when CLI extras are missing."""
        print(
            "CLI dependencies are not installed. "
            "Install them with: pip install stickforstats[cli]",
            file=sys.stderr,
        )
        sys.exit(1)
