#!/usr/bin/env python3
"""
Benchmark the StickForStats REST API.

Measures end-to-end latency for the four statistical tests cited in the PLOS
manuscript — t-test, one-way ANOVA, Pearson correlation, and linear
regression — in two modes:

  * standard: assumption checks (Guardian) and comparison-to-standard disabled
  * guardian: full high-precision + Guardian assumption validation pipeline

Produces a CSV at paper/replication/benchmark_results.csv and prints a
GitHub-flavored markdown table suitable for pasting into the manuscript.

Usage:
    # Start the Django dev server in DEBUG mode first
    DJANGO_DEBUG=True python manage.py runserver 0.0.0.0:8000
    # Then run this script
    python paper/replication/benchmark_api.py --iterations 100 --warmup 10

Reproducibility: data are generated with numpy under a fixed seed so
successive runs have identical inputs. Raw per-request timings are written
to the CSV for independent analysis.
"""
from __future__ import annotations

import argparse
import csv
import json
import statistics
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from urllib import error as urllib_error
from urllib import request as urllib_request

import numpy as np

DEFAULT_BASE = "http://localhost:8000"
TIMEOUT = 60.0


@dataclass(frozen=True)
class Endpoint:
    name: str
    path: str
    payload_builder: "callable"


def _payload_ttest(with_guardian: bool) -> dict:
    rng = np.random.default_rng(seed=42)
    data1 = rng.normal(loc=100.0, scale=15.0, size=50).tolist()
    data2 = rng.normal(loc=103.0, scale=15.0, size=50).tolist()
    return {
        "test_type": "two_sample",
        "data1": data1,
        "data2": data2,
        "parameters": {"equal_var": True, "confidence": 0.95},
        "options": {
            "check_assumptions": with_guardian,
            "validate_results": with_guardian,
            "compare_standard": False,
        },
    }


def _payload_anova(with_guardian: bool) -> dict:
    rng = np.random.default_rng(seed=43)
    groups = [
        rng.normal(loc=mu, scale=10.0, size=30).tolist()
        for mu in (50.0, 55.0, 52.0, 58.0)
    ]
    return {
        "groups": groups,
        "alpha": 0.05,
        "correction": "none",
        "options": {
            "check_assumptions": with_guardian,
            "validate_results": with_guardian,
        },
    }


def _payload_correlation(with_guardian: bool) -> dict:
    rng = np.random.default_rng(seed=44)
    x = rng.normal(loc=0.0, scale=1.0, size=100)
    y = 0.7 * x + rng.normal(loc=0.0, scale=0.5, size=100)
    return {
        "x": x.tolist(),
        "y": y.tolist(),
        "method": "pearson",
        "confidence_level": 0.95,
        "options": {
            "check_assumptions": with_guardian,
            "validate_results": with_guardian,
        },
    }


def _payload_regression(with_guardian: bool) -> dict:
    rng = np.random.default_rng(seed=45)
    n = 100
    x1 = rng.normal(size=n)
    x2 = rng.normal(size=n)
    y = 2.0 + 1.3 * x1 - 0.8 * x2 + rng.normal(scale=0.5, size=n)
    return {
        "type": "linear",
        "X": np.column_stack([x1, x2]).tolist(),
        "y": y.tolist(),
        "options": {
            "check_assumptions": with_guardian,
            "validate_results": with_guardian,
        },
    }


ENDPOINTS: list[Endpoint] = [
    Endpoint("t-test (independent)", "/api/v1/stats/ttest/", _payload_ttest),
    Endpoint("ANOVA (one-way)", "/api/v1/stats/anova/", _payload_anova),
    Endpoint("Pearson correlation", "/api/v1/stats/correlation/", _payload_correlation),
    Endpoint("Linear regression", "/api/v1/regression/linear/", _payload_regression),
]


def _post(base: str, path: str, payload: dict) -> tuple[int, float]:
    body = json.dumps(payload).encode("utf-8")
    req = urllib_request.Request(
        base + path,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    start = time.perf_counter()
    try:
        with urllib_request.urlopen(req, timeout=TIMEOUT) as resp:
            resp.read()
            elapsed_ms = (time.perf_counter() - start) * 1000.0
            return resp.status, elapsed_ms
    except urllib_error.HTTPError as e:
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        # Drain body so the connection is released; return status for diagnostic.
        try:
            e.read()
        except Exception:
            pass
        return e.code, elapsed_ms


def _bench_one(
    base: str,
    endpoint: Endpoint,
    mode_label: str,
    with_guardian: bool,
    iterations: int,
    warmup: int,
) -> tuple[list[float], int]:
    payload = endpoint.payload_builder(with_guardian)
    timings: list[float] = []
    last_status = 0
    for _ in range(warmup):
        last_status, _ = _post(base, endpoint.path, payload)
    for _ in range(iterations):
        status, elapsed_ms = _post(base, endpoint.path, payload)
        last_status = status
        if status == 200:
            timings.append(elapsed_ms)
    return timings, last_status


def _fmt(values: list[float]) -> tuple[float, float, float, float]:
    if not values:
        return (float("nan"), float("nan"), float("nan"), float("nan"))
    mean = statistics.fmean(values)
    stdev = statistics.stdev(values) if len(values) > 1 else 0.0
    return (mean, stdev, min(values), max(values))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default=DEFAULT_BASE, help="API base URL")
    parser.add_argument("--iterations", type=int, default=100, help="Measured iterations")
    parser.add_argument("--warmup", type=int, default=10, help="Warm-up iterations (discarded)")
    parser.add_argument(
        "--output",
        default="paper/replication/benchmark_results.csv",
        help="CSV output path",
    )
    args = parser.parse_args()

    try:
        health_status, _ = _post(args.base, "/api/v1/health/", {})
    except urllib_error.URLError as e:
        print(f"ERROR: backend unreachable at {args.base}: {e}", file=sys.stderr)
        return 2
    if health_status not in (200, 405):
        print(
            f"ERROR: /api/v1/health/ returned {health_status}; "
            f"start the server with DJANGO_DEBUG=True to disable SSL redirect.",
            file=sys.stderr,
        )
        return 2

    rows: list[dict] = []
    print(
        f"Benchmarking {args.base} — {args.iterations} iterations per cell "
        f"(warmup {args.warmup})\n",
        file=sys.stderr,
    )
    for endpoint in ENDPOINTS:
        for mode, with_guardian in (("standard", False), ("guardian", True)):
            print(f"  {endpoint.name:<24} [{mode}] …", end="", flush=True, file=sys.stderr)
            timings, last_status = _bench_one(
                args.base,
                endpoint,
                mode,
                with_guardian,
                args.iterations,
                args.warmup,
            )
            if not timings:
                print(f" FAILED (last status {last_status})", file=sys.stderr)
                continue
            mean, sd, lo, hi = _fmt(timings)
            print(
                f" mean={mean:7.2f}ms  sd={sd:5.2f}  n={len(timings)}",
                file=sys.stderr,
            )
            for t_ms in timings:
                rows.append(
                    {
                        "endpoint": endpoint.name,
                        "mode": mode,
                        "elapsed_ms": round(t_ms, 4),
                    }
                )

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["endpoint", "mode", "elapsed_ms"])
        writer.writeheader()
        writer.writerows(rows)
    print(f"\nRaw per-request timings → {out_path}", file=sys.stderr)

    _print_markdown(rows)
    return 0


def _print_markdown(rows: list[dict]) -> None:
    by_cell: dict[tuple[str, str], list[float]] = {}
    for row in rows:
        by_cell.setdefault((row["endpoint"], row["mode"]), []).append(row["elapsed_ms"])

    print()
    print("| Endpoint | Mode | Mean (ms) | SD (ms) | Min | Max | n |")
    print("|---|---|---:|---:|---:|---:|---:|")
    for endpoint in ENDPOINTS:
        for mode in ("standard", "guardian"):
            values = by_cell.get((endpoint.name, mode), [])
            mean, sd, lo, hi = _fmt(values)
            if not values:
                print(f"| {endpoint.name} | {mode} | — | — | — | — | 0 |")
                continue
            print(
                f"| {endpoint.name} | {mode} "
                f"| {mean:.2f} | {sd:.2f} | {lo:.2f} | {hi:.2f} | {len(values)} |"
            )


if __name__ == "__main__":
    sys.exit(main())
