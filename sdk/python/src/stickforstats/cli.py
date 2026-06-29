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
    """Load saved configuration from disk, tolerating a missing or corrupt file."""
    if not CONFIG_FILE.exists():
        return {}
    try:
        with open(CONFIG_FILE) as f:
            cfg = json.load(f)
        return cfg if isinstance(cfg, dict) else {}
    except (json.JSONDecodeError, OSError):
        # A corrupt config must not crash the CLI; fall back to defaults/env vars.
        return {}


def _save_config(cfg: dict[str, Any]) -> None:
    """Persist configuration to disk."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        json.dump(cfg, f, indent=2)


def _make_client(**overrides: Any) -> Any:
    """Create a StickForStats client from overrides > saved config > env vars/defaults.

    Passing ``None`` for base_url/api_key/timeout lets the client itself apply its
    environment-variable and built-in defaults.
    """
    from stickforstats.client import StickForStats

    cfg = _load_config()
    timeout = overrides.get("timeout") or cfg.get("timeout")
    return StickForStats(
        base_url=overrides.get("base_url") or cfg.get("base_url"),
        api_key=overrides.get("api_key") or cfg.get("api_key"),
        timeout=float(timeout) if timeout else None,
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
                if k == "api_key" and v:
                    display = f"{v[:4]}...{v[-4:]}" if len(str(v)) > 8 else "***"
                else:
                    display = str(v)
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
    # verify (raw-data re-analysis)
    # ------------------------------------------------------------------

    @main.command()
    @click.option(
        "--file", "-f", "file_paths", multiple=True, required=True,
        help="File to verify — manuscript, data table, or figure. Repeat -f for a bundle.",
    )
    @click.option("--alpha", default=0.05, type=float, help="Significance level.")
    @click.option("--title", default=None, help="Manuscript title (optional).")
    def verify(file_paths: tuple[str, ...], alpha: float, title: str | None) -> None:
        """Re-run a manuscript's reported statistics on its raw data.

        Upload the manuscript plus any data tables / figures (repeat -f) and get
        per-claim verdicts and citation-content conflicts. Without data, claims
        resolve to INSUFFICIENT_DATA (the honest default).
        """
        client = _make_client()
        try:
            result = client.verify.bundle(list(file_paths), alpha=alpha, title=title)

            summary = Table(title="Verification Summary")
            summary.add_column("Metric", style="cyan")
            summary.add_column("Value", style="green")
            summary.add_row("Claims checked", str(result.n_claims))
            rate = result.verifiability_rate
            summary.add_row(
                "Verifiability rate", f"{rate * 100:.1f}%" if rate is not None else "N/A"
            )
            cov = result.coverage
            summary.add_row("Coverage", f"{cov * 100:.1f}%" if cov is not None else "N/A")
            summary.add_row("Citation-content conflicts", str(result.n_citation_conflicts))
            summary.add_row("Run ID", result.run_id or "(not persisted)")
            console.print(summary)

            dist = result.verdict_distribution or {}
            if dist:
                vt = Table(title="Verdict distribution")
                vt.add_column("Verdict", style="cyan")
                vt.add_column("Count", style="green", justify="right")
                for verdict, count in dist.items():
                    vt.add_row(verdict, str(count))
                console.print(vt)

            conflicts = result.conflicts
            if conflicts:
                console.print("[red bold]Citation-content conflicts:[/red bold]")
                for claim in conflicts:
                    console.print(f"  [red]- {claim.claim_id}[/red]: {claim.claim_text}")

            if result.certify_note:
                console.print(
                    Panel(result.certify_note, title="What this does / does NOT certify")
                )

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
