#!/usr/bin/env python3
"""
Benchmark the StickForStats REST API — end-to-end latency, uncached.

Measures four statistical endpoints (independent t-test, one-way ANOVA, Pearson
correlation, multiple linear regression) under FOUR independent conditions so
that the cost of the assumption-check stage is attributable on its own, plus the
standalone Guardian pre-flight endpoint ``/api/guardian/check/`` as a fifth row
(a separate request the client makes; it has no conditions to contrast):

  standard  — assumption checks off, result validation off
  guardian  — assumption checks ON,  result validation off
  validate  — assumption checks off, result validation ON
  both      — assumption checks ON,  result validation ON

WHY THIS SCRIPT WAS REWRITTEN (2026-08-04)
------------------------------------------
The previous version built ONE seeded payload per cell and re-POSTed it 110
times.  Three of its four endpoints wrap ``post()`` in
``@cache_statistical_result`` (``api/v1/cache_utils.py``), whose key is a SHA-256
of the request body, so the 10 warm-up requests populated the cache and every
one of the 100 measured requests was served from it (``_cache_hit: true``).  The
"median Guardian overhead of 0.2 ms" it produced was the cost of a cache lookup,
not the cost of the Guardian pipeline.  Measured against this same server, an
identical t-test payload costs 230.60 ms on the first request and 2.97 / 2.52 /
2.10 ms on the next three, all three flagged ``_cache_hit: true``.

This version therefore:
  1. draws a FRESH random data set for every single request, so no request body
     repeats and the response cache can never be hit;
  2. verifies that empirically — it reads ``_cache_hit`` out of every response
     and aborts with a non-zero exit status if any measured request was a hit;
  3. treats any non-200 response as a hard failure and prints the body, instead
     of silently dropping the timing (the old ``if status == 200`` filter hid
     the fact that the regression row had started returning HTTP 400);
  4. separates the ``check_assumptions`` and ``validate_results`` flags, which
     the old script tied to a single boolean, so their costs do not merge.

WHICH FLAG EACH ENDPOINT ACTUALLY HONOURS (verified in the backend source)
-------------------------------------------------------------------------
  t-test      backend/api/v1/views.py:98   ``options["check_assumptions"]``
              backend/api/v1/views.py:254  ``options["validate_results"]``
              backend/api/v1/views.py:205  ``options["compare_standard"]``
  ANOVA       backend/api/v1/views.py:546  ``options["check_assumptions"]``
              backend/api/v1/views.py:686  ``options["compare_standard"]``
              (no ``validate_results`` branch exists)
  correlation backend/api/v1/correlation_views.py:116 ``check_assumptions``
              (no ``validate_results`` branch exists)
  regression  backend/api/v1/regression_views.py:274 ``include_diagnostics``
              (VIF / Breusch-Pagan / Durbin-Watson / Jarque-Bera — the
              assumption-diagnostic stage, used here as the "guardian" flag)
              backend/api/v1/regression_views.py:332 ``compare_with_standard``
              (no ``validate_results`` branch exists)

So the ``validate`` and ``both`` conditions are expected to be no-ops for ANOVA,
correlation and regression.  The script measures them anyway and prints the
result rather than assuming it: a flag believed inert that turns out to cost
something is exactly the kind of thing this benchmark exists to catch.

``compare_standard`` / ``compare_with_standard`` is held OFF in every condition,
and ANOVA's ``generate_visualizations`` is held OFF, so that the only thing that
varies between conditions is the flag under test.

MEASUREMENT DESIGN
------------------
The four conditions of an endpoint are INTERLEAVED, not measured as four
consecutive blocks: at each iteration all four are issued back to back in a
seeded, per-iteration randomised order, on the same data.  Differences are then
reported as the median of the paired per-iteration differences with a bootstrap
95% CI, so a few-millisecond effect is not confounded with drift over the run.

Reproducibility: every payload is drawn from
``numpy.random.default_rng([seed, endpoint_index, request_index])``, printed
below, so a re-run draws byte-identical inputs.  Data are shared across the four
conditions at a given request index, which makes the condition differences
paired.  Warm-up requests use request indices offset by ``WARMUP_INDEX_OFFSET``
so they cannot pre-populate the cache entry of any measured request.

Because the data ARE reproducible, a second run with the same ``--seed`` would
re-hit the cache entries the first run wrote (observed on 2026-08-04: exactly 3
of every 100 measured requests came back ``_cache_hit: true`` for this reason,
and the run aborted, as designed).  Each request therefore also carries a
``_benchmark_nonce`` field that is unique per (run, endpoint, condition,
iteration).  It is not declared on any serializer, so DRF discards it and the
statistics are unaffected — verified by sending the same data with and without
the nonce to all four endpoints and comparing the 50-digit results, which were
identical — but it does enter ``dict(request.data)``, which is what the cache key
is hashed from, so no request body can ever repeat.

Usage:
    cd backend && DJANGO_SETTINGS_MODULE=stickforstats.settings \
        DJANGO_DEBUG=True ../.venv-django/bin/python manage.py runserver 8000
    ../.venv-django/bin/python paper/replication/benchmark_api.py \
        --iterations 100 --warmup 10

Exit status: 0 only if every request returned HTTP 200 and no measured request
was served from cache.
"""
from __future__ import annotations

import argparse
import csv
import json
import platform
import statistics
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from urllib import error as urllib_error
from urllib import request as urllib_request

import numpy as np

DEFAULT_BASE = "http://localhost:8000"
TIMEOUT = 300.0
DEFAULT_SEED = 20260804
BOOTSTRAP_RESAMPLES = 10000
BOOTSTRAP_SEED = 987654321
WARMUP_INDEX_OFFSET = 1_000_000  # keeps warm-up payloads disjoint from measured ones

CONDITIONS = ("standard", "guardian", "validate", "both")


class BenchmarkError(RuntimeError):
    """Raised on any non-200 response or any cache hit — never swallowed."""


@dataclass(frozen=True)
class Endpoint:
    name: str
    path: str
    data_builder: "callable"   # (rng) -> dict of request fields excluding "options"
    options_builder: "callable"  # (condition) -> dict for "options", or None to omit it
    cached: bool  # True if the view is wrapped in @cache_statistical_result
    conditions: tuple = CONDITIONS  # ("preflight",) for the standalone Guardian endpoint


# --------------------------------------------------------------------------- #
# Payload data — a fresh draw per request, so no two request bodies are equal
# --------------------------------------------------------------------------- #

def _data_ttest(rng: np.random.Generator) -> dict:
    return {
        "test_type": "two_sample",
        "data1": rng.normal(loc=100.0, scale=15.0, size=50).tolist(),
        "data2": rng.normal(loc=103.0, scale=15.0, size=50).tolist(),
        "parameters": {"equal_var": True, "confidence": 0.95},
    }


def _data_anova(rng: np.random.Generator) -> dict:
    return {
        "groups": [
            rng.normal(loc=mu, scale=10.0, size=30).tolist()
            for mu in (50.0, 55.0, 52.0, 58.0)
        ],
        "alpha": 0.05,
        "correction": "none",
    }


def _data_correlation(rng: np.random.Generator) -> dict:
    x = rng.normal(loc=0.0, scale=1.0, size=100)
    y = 0.7 * x + rng.normal(loc=0.0, scale=0.5, size=100)
    return {"x": x.tolist(), "y": y.tolist(), "method": "pearson", "confidence_level": 0.95}


def _data_regression(rng: np.random.Generator) -> dict:
    n = 100
    x1 = rng.normal(size=n)
    x2 = rng.normal(size=n)
    y = 2.0 + 1.3 * x1 - 0.8 * x2 + rng.normal(scale=0.5, size=n)
    # "type": the serializer's ChoiceField (backend/api/v1/serializers.py:551,
    # RegressionRequestSerializer.REGRESSION_TYPES) accepts
    # simple_linear / multiple_linear / polynomial / logistic / ridge / lasso /
    # robust / quantile / stepwise.  It does NOT accept "linear", which is what
    # this script used to send: that request returns
    #   HTTP 400 {"type": ["\"linear\" is not a valid choice."]}
    # and the old `if status == 200` filter dropped the row silently.  Two
    # predictors in a 2-D X is "multiple_linear"; "simple_linear" would require a
    # flat 1-D X (serializers.py:568).
    return {"type": "multiple_linear", "X": np.column_stack([x1, x2]).tolist(), "y": y.tolist()}


def _data_guardian_check(rng: np.random.Generator) -> dict:
    """Payload for the standalone Guardian pre-flight endpoint.

    This is the endpoint the manuscript means by "the Guardian": ``GuardianCore``
    exposed at ``/api/guardian/check/`` (``backend/core/guardian/urls.py``,
    prefixed at ``backend/core/api_urls.py:59``), which is what the front end
    calls before running a test.  It is a different code path from the
    ``check_assumptions`` flag inside the statistical endpoints, which invokes
    ``core.assumption_checker.AssumptionChecker``.  The same two groups of 50 as
    the t-test row, so the two are comparable.
    """
    return {
        "data": {
            "group1": rng.normal(loc=100.0, scale=15.0, size=50).tolist(),
            "group2": rng.normal(loc=103.0, scale=15.0, size=50).tolist(),
        },
        "test_type": "t_test",
        "alpha": 0.05,
    }


# --------------------------------------------------------------------------- #
# Options — the two flags under test, held independent
# --------------------------------------------------------------------------- #

def _flags(condition: str) -> tuple[bool, bool]:
    """(check_assumptions, validate_results) for a condition name."""
    return {
        "standard": (False, False),
        "guardian": (True, False),
        "validate": (False, True),
        "both": (True, True),
        # The standalone Guardian endpoint has no flags: the request IS the
        # assumption check, and it performs no result validation.
        "preflight": (True, False),
    }[condition]


def _options_ttest(condition: str) -> dict:
    check, validate = _flags(condition)
    return {
        "check_assumptions": check,
        "validate_results": validate,
        "compare_standard": False,
    }


def _options_anova(condition: str) -> dict:
    check, validate = _flags(condition)
    return {
        "check_assumptions": check,
        "validate_results": validate,   # no branch reads this (see module docstring)
        "compare_standard": False,
        "calculate_effect_sizes": True,
        "generate_visualizations": False,
    }


def _options_correlation(condition: str) -> dict:
    check, validate = _flags(condition)
    return {
        "check_assumptions": check,
        "validate_results": validate,   # no branch reads this
        "auto_select": False,
    }


def _options_regression(condition: str) -> dict:
    check, validate = _flags(condition)
    return {
        # include_diagnostics is the regression endpoint's assumption-diagnostic
        # stage; it is the closest analogue of check_assumptions on this view.
        "include_diagnostics": check,
        "validate_results": validate,   # no branch reads this
        "include_visualization": False,
        "compare_with_standard": False,
    }


ENDPOINTS: list[Endpoint] = [
    Endpoint("t-test (independent)", "/api/v1/stats/ttest/", _data_ttest, _options_ttest, cached=True),
    Endpoint("ANOVA (one-way)", "/api/v1/stats/anova/", _data_anova, _options_anova, cached=True),
    Endpoint(
        "Pearson correlation",
        "/api/v1/stats/correlation/",
        _data_correlation,
        _options_correlation,
        cached=False,  # HighPrecisionCorrelationView carries no cache decorator
    ),
    Endpoint(
        "Multiple linear regression",
        "/api/v1/regression/linear/",
        _data_regression,
        _options_regression,
        cached=True,
    ),
    Endpoint(
        "Guardian pre-flight (/api/guardian/check/)",
        "/api/guardian/check/",
        _data_guardian_check,
        lambda condition: None,  # no options block; Guardian IS the whole request
        cached=False,            # GuardianCheckView carries no cache decorator
        conditions=("preflight",),
    ),
]


# --------------------------------------------------------------------------- #
# HTTP
# --------------------------------------------------------------------------- #

EXTRA_HEADERS: dict[str, str] = {}  # filled from --header; see main()


def _post(base: str, path: str, payload: dict) -> tuple[int, float, bytes]:
    body = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json", **EXTRA_HEADERS}
    req = urllib_request.Request(
        base + path,
        data=body,
        headers=headers,
        method="POST",
    )
    start = time.perf_counter()
    try:
        with urllib_request.urlopen(req, timeout=TIMEOUT) as resp:
            raw = resp.read()
            elapsed_ms = (time.perf_counter() - start) * 1000.0
            return resp.status, elapsed_ms, raw
    except urllib_error.HTTPError as e:
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        try:
            raw = e.read()
        except Exception:
            raw = b""
        return e.code, elapsed_ms, raw


def _cache_flag(raw: bytes) -> "bool | None":
    """``_cache_hit`` from the response body, or None if the key is absent."""
    try:
        parsed = json.loads(raw.decode("utf-8"))
    except Exception:
        return None
    if isinstance(parsed, dict) and "_cache_hit" in parsed:
        return bool(parsed["_cache_hit"])
    return None


def _request(base: str, endpoint: Endpoint, payload: dict, label: str) -> tuple[float, "bool | None"]:
    status, elapsed_ms, raw = _post(base, endpoint.path, payload)
    if status != 200:
        raise BenchmarkError(
            f"{endpoint.name} [{label}] POST {endpoint.path} returned HTTP {status}.\n"
            f"  response body: {raw[:800].decode('utf-8', 'replace')}\n"
            f"  request keys : {sorted(payload)}\n"
            "Non-200 responses are a hard failure: a dropped row would silently "
            "shrink the benchmark instead of reporting a broken endpoint."
        )
    return elapsed_ms, _cache_flag(raw)


# --------------------------------------------------------------------------- #
# Measurement
# --------------------------------------------------------------------------- #

def _payload(endpoint: Endpoint, endpoint_index: int, request_index: int,
             condition: str, seed: int, nonce: str) -> dict:
    """Deterministic, unique-per-request payload.

    The data depend on (seed, endpoint_index, request_index) but NOT on the
    condition, so the four conditions see identical data at a given request
    index and their differences are paired.  The ``options`` block differs by
    condition, and ``_benchmark_nonce`` (an undeclared field that every
    serializer discards) makes the body unique across runs as well, so the
    response cache can never serve any of these requests.
    """
    rng = np.random.default_rng([seed, endpoint_index, request_index])
    payload = endpoint.data_builder(rng)
    options = endpoint.options_builder(condition)
    if options is not None:
        payload["options"] = options
    payload["_benchmark_nonce"] = f"{nonce}:{endpoint_index}:{condition}:{request_index}"
    return payload


def _bench_endpoint(base: str, endpoint: Endpoint, endpoint_index: int,
                    iterations: int, warmup: int, seed: int,
                    nonce: str) -> tuple[dict, dict]:
    """Measure all four conditions of one endpoint, INTERLEAVED.

    The four conditions are not measured as four consecutive blocks: at each
    iteration all four are issued back to back in a per-iteration randomised
    order (seeded, so the order sequence is reproducible).  Blocked measurement
    confounds the condition with elapsed time — the first version of this run,
    measured in blocks, reported the regression endpoint's ``guardian`` cost as
    +5.95 ms and its ``both`` cost as -0.39 ms, which cannot both be true since
    ``both`` is a superset of ``guardian``.  Interleaving removes that drift from
    the paired differences.
    """
    order_rng = np.random.default_rng([seed, endpoint_index, 424242])

    for w in range(warmup):
        for condition in endpoint.conditions:
            payload = _payload(endpoint, endpoint_index, WARMUP_INDEX_OFFSET + w,
                               condition, seed, nonce)
            _request(base, endpoint, payload, f"{condition}/warmup{w}")

    timings: dict[str, list[float]] = {c: [] for c in endpoint.conditions}
    counts: dict[str, dict] = {
        c: {"cache_hit": 0, "cache_miss": 0, "cache_field_absent": 0}
        for c in endpoint.conditions
    }
    for i in range(iterations):
        order = list(endpoint.conditions)
        order_rng.shuffle(order)
        for condition in order:
            payload = _payload(endpoint, endpoint_index, i, condition, seed, nonce)
            elapsed_ms, cache_hit = _request(base, endpoint, payload, f"{condition}/iter{i}")
            timings[condition].append(elapsed_ms)
            if cache_hit is True:
                counts[condition]["cache_hit"] += 1
            elif cache_hit is False:
                counts[condition]["cache_miss"] += 1
            else:
                counts[condition]["cache_field_absent"] += 1
    return timings, counts


def _summarise(values: list[float]) -> dict:
    arr = np.asarray(values, dtype=float)
    return {
        "n": int(arr.size),
        "mean_ms": float(arr.mean()),
        "sd_ms": float(statistics.stdev(values)) if arr.size > 1 else 0.0,
        "median_ms": float(np.median(arr)),
        "p95_ms": float(np.percentile(arr, 95, method="linear")),
        "p99_ms": float(np.percentile(arr, 99, method="linear")),
        "min_ms": float(arr.min()),
        "max_ms": float(arr.max()),
    }


def _paired_delta(treatment: list[float], baseline: list[float]) -> dict:
    """Median paired difference (treatment - baseline) with a bootstrap 95% CI."""
    n = min(len(treatment), len(baseline))
    diffs = np.asarray(treatment[:n], dtype=float) - np.asarray(baseline[:n], dtype=float)
    rng = np.random.default_rng(BOOTSTRAP_SEED)
    boot = np.median(
        diffs[rng.integers(0, n, size=(BOOTSTRAP_RESAMPLES, n))], axis=1
    )
    lo, hi = np.percentile(boot, [2.5, 97.5])
    return {
        "median_paired_delta_ms": float(np.median(diffs)),
        "ci95_lo_ms": float(lo),
        "ci95_hi_ms": float(hi),
        "delta_of_medians_ms": float(np.median(treatment) - np.median(baseline)),
    }


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #

def main() -> int:
    parser = argparse.ArgumentParser(description="Uncached API latency benchmark")
    parser.add_argument("--base", default=DEFAULT_BASE, help="API base URL")
    parser.add_argument("--iterations", type=int, default=100, help="Measured iterations per cell")
    parser.add_argument("--warmup", type=int, default=10, help="Warm-up iterations (discarded)")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED, help="Master RNG seed")
    parser.add_argument(
        "--run-nonce",
        default=None,
        help="String making this run's request bodies unique (default: the run's "
             "UTC start time). Data are unaffected; see module docstring.",
    )
    parser.add_argument(
        "--output",
        default="paper/replication/benchmark_results.csv",
        help="Summary CSV output path (one row per endpoint x condition)",
    )
    parser.add_argument(
        "--only",
        default=None,
        help="Substring: measure only endpoints whose name contains it (case-insensitive). "
             "Use to re-measure one endpoint in isolation, e.g. to check that a result is "
             "not an artefact of its position in the run. Does NOT overwrite the full CSV "
             "unless --output is given explicitly.",
    )
    parser.add_argument(
        "--config-note",
        default="",
        help="Free-text provenance recorded in every CSV row (e.g. the server "
             "configuration: 'manage.py runserver, DEBUG=False, LocMemCache').",
    )
    parser.add_argument(
        "--header",
        action="append",
        default=[],
        metavar="NAME: VALUE",
        help="Extra request header, repeatable. Needed to benchmark a DEBUG=False "
             "server, which sets SECURE_SSL_REDIRECT and 301-redirects plain HTTP "
             "unless X-Forwarded-Proto: https is present "
             "(backend/stickforstats/settings.py:411-415).",
    )
    parser.add_argument(
        "--raw-output",
        default=None,
        help="Optional path for per-request raw timings (not written unless given)",
    )
    args = parser.parse_args()

    for raw_header in args.header:
        if ":" not in raw_header:
            print(f"ERROR: --header must be 'Name: Value', got {raw_header!r}", file=sys.stderr)
            return 2
        name, value = raw_header.split(":", 1)
        EXTRA_HEADERS[name.strip()] = value.strip()

    global ENDPOINTS
    if args.only:
        ENDPOINTS = [e for e in ENDPOINTS if args.only.lower() in e.name.lower()]
        if not ENDPOINTS:
            print(f"ERROR: --only {args.only!r} matched no endpoint", file=sys.stderr)
            return 2

    started = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    nonce = args.run_nonce or datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S.%fZ")
    print("StickForStats API latency benchmark")
    print(f"  started (UTC)      : {started}")
    print(f"  base URL           : {args.base}")
    print(f"  iterations / cell  : {args.iterations}   warm-up: {args.warmup}")
    print(f"  master seed        : {args.seed}"
          f"   (per-request RNG = default_rng([seed, endpoint_index, request_index]))")
    print(f"  run nonce          : {nonce}   (makes every request body unique; discarded by DRF)")
    print(f"  bootstrap          : {BOOTSTRAP_RESAMPLES} resamples, seed {BOOTSTRAP_SEED}")
    print(f"  python             : {platform.python_version()} ({platform.platform()})")
    print(f"  numpy              : {np.__version__}")
    print("  percentiles        : numpy.percentile(method='linear')")
    print(f"  extra headers      : {EXTRA_HEADERS or '(none)'}")

    try:
        health_req = urllib_request.Request(args.base + "/api/v1/health/", headers=EXTRA_HEADERS)
        with urllib_request.urlopen(health_req, timeout=TIMEOUT) as resp:
            health = resp.read().decode("utf-8", "replace")
            print(f"  server /api/v1/health/: HTTP {resp.status} {health.strip()[:200]}")
    except urllib_error.URLError as e:
        print(f"ERROR: backend unreachable at {args.base}: {e}", file=sys.stderr)
        return 2
    print()

    timings_by_cell: dict[tuple[str, str], list[float]] = {}
    counts_by_cell: dict[tuple[str, str], dict] = {}

    try:
        for endpoint_index, endpoint in enumerate(ENDPOINTS):
            print(f"  {endpoint.name:<42} "
                  f"{len(endpoint.conditions)} condition(s) interleaved …", flush=True)
            timings, counts = _bench_endpoint(
                args.base, endpoint, endpoint_index,
                args.iterations, args.warmup, args.seed, nonce,
            )
            for condition in endpoint.conditions:
                timings_by_cell[(endpoint.name, condition)] = timings[condition]
                counts_by_cell[(endpoint.name, condition)] = counts[condition]
                s = _summarise(timings[condition])
                print(
                    f"    [{condition:<8}] median={s['median_ms']:8.2f}ms  "
                    f"p95={s['p95_ms']:8.2f}  n={s['n']}  "
                    f"cache_hits={counts[condition]['cache_hit']}"
                )
    except BenchmarkError as e:
        print(f"\nFAILED\n{e}", file=sys.stderr)
        return 1

    # ---- cache assertion: the whole point of the rewrite -------------------- #
    total_hits = sum(c["cache_hit"] for c in counts_by_cell.values())
    total_requests = sum(c["n"] for c in (_summarise(v) for v in timings_by_cell.values()))
    print(f"\nCache check: {total_hits} cache hits across {total_requests} measured requests")
    for endpoint in ENDPOINTS:
        for condition in endpoint.conditions:
            c = counts_by_cell[(endpoint.name, condition)]
            expected_absent = 0 if endpoint.cached else args.iterations
            print(
                f"  {endpoint.name:<42} [{condition:<9}] "
                f"hit={c['cache_hit']} miss={c['cache_miss']} "
                f"no_cache_field={c['cache_field_absent']} "
                f"(view cached={endpoint.cached}, expected no_cache_field={expected_absent})"
            )
            if endpoint.cached and c["cache_field_absent"]:
                print(
                    f"ERROR: {endpoint.name} [{condition}] is wrapped in "
                    "@cache_statistical_result but returned responses without a "
                    "_cache_hit field, so cache behaviour cannot be verified.",
                    file=sys.stderr,
                )
                return 1
    if total_hits:
        print(
            f"ERROR: {total_hits} measured request(s) were served from the response "
            "cache. These timings measure a cache lookup, not the statistical "
            "pipeline. Aborting rather than publishing a cache artifact.",
            file=sys.stderr,
        )
        return 1

    # ---- derived overheads -------------------------------------------------- #
    deltas: dict[tuple[str, str], dict] = {}
    for endpoint in ENDPOINTS:
        if "standard" not in endpoint.conditions:
            continue  # single-condition endpoint: nothing to contrast against
        baseline = timings_by_cell[(endpoint.name, "standard")]
        for condition in ("guardian", "validate", "both"):
            deltas[(endpoint.name, condition)] = _paired_delta(
                timings_by_cell[(endpoint.name, condition)], baseline
            )

    # ---- CSV ---------------------------------------------------------------- #
    fields = [
        "endpoint", "condition", "check_assumptions", "validate_results",
        "n", "median_ms", "mean_ms", "sd_ms", "p95_ms", "p99_ms", "min_ms", "max_ms",
        "cache_hits", "cache_misses", "cache_field_absent",
        "median_paired_delta_vs_standard_ms", "delta_ci95_lo_ms", "delta_ci95_hi_ms",
        "seed", "run_nonce", "base_url", "iterations", "warmup", "timestamp_utc",
        "python_version", "numpy_version", "extra_headers", "config_note",
    ]
    rows: list[dict] = []
    for endpoint in ENDPOINTS:
        for condition in endpoint.conditions:
            s = _summarise(timings_by_cell[(endpoint.name, condition)])
            c = counts_by_cell[(endpoint.name, condition)]
            check, validate = _flags(condition)
            d = deltas.get((endpoint.name, condition))
            rows.append({
                "endpoint": endpoint.name,
                "condition": condition,
                "check_assumptions": check,
                "validate_results": validate,
                "n": s["n"],
                "median_ms": round(s["median_ms"], 3),
                "mean_ms": round(s["mean_ms"], 3),
                "sd_ms": round(s["sd_ms"], 3),
                "p95_ms": round(s["p95_ms"], 3),
                "p99_ms": round(s["p99_ms"], 3),
                "min_ms": round(s["min_ms"], 3),
                "max_ms": round(s["max_ms"], 3),
                "cache_hits": c["cache_hit"],
                "cache_misses": c["cache_miss"],
                "cache_field_absent": c["cache_field_absent"],
                "median_paired_delta_vs_standard_ms": "" if d is None else round(d["median_paired_delta_ms"], 3),
                "delta_ci95_lo_ms": "" if d is None else round(d["ci95_lo_ms"], 3),
                "delta_ci95_hi_ms": "" if d is None else round(d["ci95_hi_ms"], 3),
                "seed": args.seed,
                "run_nonce": nonce,
                "base_url": args.base,
                "iterations": args.iterations,
                "warmup": args.warmup,
                "timestamp_utc": started,
                "python_version": platform.python_version(),
                "numpy_version": np.__version__,
                "extra_headers": json.dumps(EXTRA_HEADERS, sort_keys=True),
                "config_note": args.config_note,
            })

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    print(f"\nSummary CSV → {out_path}")

    if args.raw_output:
        raw_path = Path(args.raw_output)
        raw_path.parent.mkdir(parents=True, exist_ok=True)
        with raw_path.open("w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=["endpoint", "condition", "iteration", "elapsed_ms"])
            w.writeheader()
            for (name, condition), values in timings_by_cell.items():
                for i, v in enumerate(values):
                    w.writerow({
                        "endpoint": name, "condition": condition,
                        "iteration": i, "elapsed_ms": round(v, 4),
                    })
        print(f"Raw per-request timings → {raw_path}")

    _print_markdown(timings_by_cell, deltas)
    return 0


def _print_markdown(timings_by_cell: dict, deltas: dict) -> None:
    print()
    print("| Endpoint | Condition | n | Median (ms) | Mean ± SD (ms) | p95 (ms) | p99 (ms) |")
    print("|---|---|---:|---:|---:|---:|---:|")
    for endpoint in ENDPOINTS:
        for condition in endpoint.conditions:
            s = _summarise(timings_by_cell[(endpoint.name, condition)])
            print(
                f"| {endpoint.name} | {condition} | {s['n']} | {s['median_ms']:.2f} "
                f"| {s['mean_ms']:.2f} ± {s['sd_ms']:.2f} | {s['p95_ms']:.2f} | {s['p99_ms']:.2f} |"
            )

    print()
    print("Derived overhead vs. the standard condition "
          "(median of paired per-iteration differences, 95% bootstrap CI):")
    print()
    print("| Endpoint | Condition | Median Δ (ms) | 95% CI (ms) | Δ of medians (ms) |")
    print("|---|---|---:|---:|---:|")
    for endpoint in ENDPOINTS:
        for condition in ("guardian", "validate", "both"):
            d = deltas.get((endpoint.name, condition))
            if d is None:
                continue
            print(
                f"| {endpoint.name} | {condition} − standard "
                f"| {d['median_paired_delta_ms']:+.2f} "
                f"| [{d['ci95_lo_ms']:+.2f}, {d['ci95_hi_ms']:+.2f}] "
                f"| {d['delta_of_medians_ms']:+.2f} |"
            )

    guardian_deltas = [
        deltas[(e.name, "guardian")]["median_paired_delta_ms"]
        for e in ENDPOINTS if (e.name, "guardian") in deltas
    ]
    print()
    if guardian_deltas:
        print(f"In-endpoint assumption-check overhead across {len(guardian_deltas)} endpoints, "
              f"median of the per-endpoint medians: {statistics.median(guardian_deltas):+.2f} ms "
              f"(range {min(guardian_deltas):+.2f} to {max(guardian_deltas):+.2f} ms)")
    for e in ENDPOINTS:
        if e.conditions == ("preflight",):
            s = _summarise(timings_by_cell[(e.name, "preflight")])
            print(f"Standalone Guardian endpoint {e.path}: median "
                  f"{s['median_ms']:.2f} ms, p95 {s['p95_ms']:.2f} ms, "
                  f"p99 {s['p99_ms']:.2f} ms (n={s['n']}) — this is a separate "
                  "request the client makes, not an increment on a test call.")


if __name__ == "__main__":
    sys.exit(main())
