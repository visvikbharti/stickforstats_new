#!/usr/bin/env python3
"""
Evidence script for Additional file 1 (BMC Bioinformatics submission).
======================================================================

Emits EVERY number that appears in
``paper/bmc_bioinformatics/additional_file_1.md`` sections S1.1, S1.3 and S1.4,
plus the environment provenance printed at the top of that document.

Nothing in this script is hard-coded from a document, a memo or a code comment.
The validator/test-type mapping in S1.1 is *reflected out of the running
``GuardianCore`` object*; the S1.3 results come from calling the real
``GuardianCore.check()``; the S1.4 counts come from the actual Django and Jest
test runners.

Sections NOT produced here
--------------------------
* **S1.2 (programmatic access)** requires a live backend and a separate
  virtualenv with the PyPI ``stickforstats`` package installed, so it is driven
  by shell commands quoted verbatim inside the document itself rather than by
  this script.
* **S1.5 (performance benchmarks)** is produced by
  ``paper/replication/benchmark_api.py``.

Usage
-----
    cd <repo root>
    DJANGO_SETTINGS_MODULE=stickforstats.settings \
      .venv-django/bin/python paper/replication/additional_file_1_evidence.py

    # skip the (slow) test-runner counts:
    ... additional_file_1_evidence.py --no-test-counts

Requires ``Rscript`` on PATH for section S1.3: the three datasets are exported
straight out of R's ``datasets`` package so their provenance is R itself, not a
hand-typed copy. Each exported dataset's SHA-256 is printed so a reader can
confirm they got the same bytes.

Author: generated for the BMC Bioinformatics submission, 2026-08-04.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import platform
import random
import re
import subprocess
import sys
import tempfile
from pathlib import Path

# ---------------------------------------------------------------------------
# Reproducibility preamble
# ---------------------------------------------------------------------------
SEED = 20260804

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND = REPO_ROOT / "backend"
FRONTEND = REPO_ROOT / "frontend"


def rule(title: str) -> None:
    print()
    print("=" * 78)
    print(title)
    print("=" * 78)


def sh(cmd: list[str], cwd: Path | None = None, env: dict | None = None) -> tuple[int, str]:
    """Run a command, echo it, return (exit code, combined output)."""
    print(f"$ {' '.join(cmd)}" + (f"    # cwd={cwd}" if cwd else ""))
    full_env = dict(os.environ)
    if env:
        full_env.update(env)
    proc = subprocess.run(
        cmd, cwd=str(cwd) if cwd else None, env=full_env,
        capture_output=True, text=True,
    )
    return proc.returncode, proc.stdout + proc.stderr


def preamble() -> None:
    rule("PROVENANCE  (everything below is reproducible from these inputs)")
    random.seed(SEED)
    print(f"random seed (declared even though S1.1/S1.3/S1.4 are deterministic): {SEED}")

    code, out = sh(["git", "rev-parse", "HEAD"], cwd=REPO_ROOT)
    head = out.strip() if code == 0 else "UNKNOWN"
    print(f"git rev-parse HEAD          = {head}")
    code, out = sh(["git", "status", "--porcelain"], cwd=REPO_ROOT)
    dirty = [ln for ln in out.splitlines() if ln.strip()]
    print(f"git working tree            = {'CLEAN' if not dirty else f'{len(dirty)} modified/untracked path(s)'}")

    import numpy
    import scipy
    import pandas
    import sklearn
    import statsmodels
    print(f"python                      = {sys.version.split()[0]} ({platform.platform()})")
    print(f"numpy                       = {numpy.__version__}")
    print(f"scipy                       = {scipy.__version__}")
    print(f"pandas                      = {pandas.__version__}")
    print(f"scikit-learn                = {sklearn.__version__}")
    print(f"statsmodels                 = {statsmodels.__version__}")

    code, out = sh(["Rscript", "-e", "cat(R.version.string)"])
    print(f"R                           = {out.strip() if code == 0 else 'Rscript NOT AVAILABLE'}")


# ---------------------------------------------------------------------------
# S1.1 — validator specifications and the test-type -> validator mapping
# ---------------------------------------------------------------------------
def s1_1() -> None:
    rule("S1.1  Guardian validators and the test-type -> validator mapping")
    print("Source of truth: the live GuardianCore instance "
          "(backend/core/guardian/guardian_core.py).")
    print("NOT read from the manuscript, Table 1, or any document.\n")

    sys.path.insert(0, str(BACKEND))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "stickforstats.settings")
    import django
    django.setup()
    from core.guardian.guardian_core import GuardianCore

    g = GuardianCore()

    print(f"len(GuardianCore().validators) = {len(g.validators)}")
    print("validator key -> implementing class:")
    for key, obj in g.validators.items():
        print(f"  {key:<22} -> {type(obj).__name__}")

    print(f"\nlen(GuardianCore().test_requirements) = {len(g.test_requirements)} "
          "test-type keys (incl. aliases)")

    validator_keys = list(g.validators.keys())
    focus = ["t_test", "anova", "pearson", "regression", "chi_square",
             "mann_whitney", "kruskal_wallis"]

    print(f"\n--- Mapping matrix for the {len(focus)} test types printed in "
          f"manuscript Table 1 ---")
    pad = max(len("test_type"), max(len(t) for t in focus)) + 2
    header = "test_type".ljust(pad) + "".join(k[:10].ljust(12) for k in validator_keys)
    print(header)
    for t in focus:
        reqs = g.test_requirements[t]
        row = t.ljust(pad)
        for k in validator_keys:
            row += ("X" if k in reqs else ".").ljust(12)
        print(row)

    print(f"\n--- Verbatim requirement lists for those {len(focus)} ---")
    for t in focus:
        print(f"  {t:<{pad}} = {g.test_requirements[t]}")

    print(f"\n--- Requirement names that are NOT one of the "
          f"{len(g.validators)} validators ---")
    extra: dict[str, list[str]] = {}
    for t, reqs in g.test_requirements.items():
        unknown = [r for r in reqs if r not in g.validators]
        if unknown:
            extra[t] = unknown
    for t, unknown in extra.items():
        print(f"  {t:<26} -> {unknown}   (no validator object; handled by a "
              "dedicated code path)")
    if not extra:
        print("  (none)")

    print("\n--- Full mapping, all test-type keys ---")
    for t in sorted(g.test_requirements):
        print(f"  {t:<26} {g.test_requirements[t]}")

    print("\n--- Which validators are never reachable through test_requirements? ---")
    used = {r for reqs in g.test_requirements.values() for r in reqs}
    print(f"  declared validators not referenced by any test type: "
          f"{sorted(set(g.validators) - used)}")

    print("\n--- Severity weights and the confidence formula, read from the code ---")
    import inspect
    src = inspect.getsource(g._calculate_confidence)
    print(src)

    print("--- Realised confidence values (executed, not asserted) ---")
    from core.guardian.guardian_core import AssumptionViolation

    def mk(sev: str) -> AssumptionViolation:
        return AssumptionViolation(
            assumption="dummy", test_name="dummy", severity=sev,
            p_value=0.01, statistic=1.0, message="", recommendation="",
        )

    for sev in ["minor", "warning", "critical"]:
        for n in [1, 2, 5, 100]:
            c = g._calculate_confidence([mk(sev)] * n)
            print(f"  {n:>4} x {sev:<9} -> confidence = {c:.6f}")
    print(f"  no violations       -> confidence = {g._calculate_confidence([]):.6f}")


# ---------------------------------------------------------------------------
# S1.3 — Guardian on three standard R datasets
# ---------------------------------------------------------------------------
R_EXPORT = r'''
outdir <- commandArgs(trailingOnly = TRUE)[1]
write.csv(mtcars,      file.path(outdir, "mtcars.csv"))
write.csv(ToothGrowth, file.path(outdir, "ToothGrowth.csv"))
write.csv(PlantGrowth, file.path(outdir, "PlantGrowth.csv"))
cat(R.version.string, "\n")
cat("nrow mtcars", nrow(mtcars), " nrow ToothGrowth", nrow(ToothGrowth),
    " nrow PlantGrowth", nrow(PlantGrowth), "\n")
'''


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_csv(path: Path) -> dict[str, list[str]]:
    with path.open() as fh:
        rows = list(csv.DictReader(fh))
    cols: dict[str, list[str]] = {k: [] for k in rows[0]}
    for r in rows:
        for k, v in r.items():
            cols[k].append(v)
    return cols


def describe_report(report, indent: str = "    ") -> None:
    print(f"{indent}test_type          = {report.test_type}")
    print(f"{indent}assumptions_checked= {report.assumptions_checked}")
    print(f"{indent}confidence_score   = {report.confidence_score!r}")
    print(f"{indent}can_proceed        = {report.can_proceed}")
    print(f"{indent}alternative_tests  = {report.alternative_tests}")
    print(f"{indent}n violations       = {len(report.violations)}")
    for v in report.violations:
        print(f"{indent}  - assumption={v.assumption} severity={v.severity} "
              f"test={v.test_name!r} statistic={v.statistic!r} p_value={v.p_value!r}")
        print(f"{indent}    message: {v.message}")
    print(f"{indent}data_summary       = "
          f"{json.dumps(report.data_summary, default=str, sort_keys=True)}")
    if report.audit_trail:
        print(f"{indent}audit_trail        =")
        for e in report.audit_trail:
            print(f"{indent}  {e.assumption:<22} result={e.result:<10} "
                  f"severity={e.severity:<8} test_performed={e.test_performed!r} "
                  f"p={e.p_value!r}")


def s1_3() -> None:
    rule("S1.3  Guardian on three standard R datasets (real GuardianCore.check)")
    print("NOTE: paper/replication/additional_real_data_analysis.py does NOT call")
    print("      GuardianCore -- it re-implements a few checks with bare SciPy on")
    print("      hand-typed copies of the data. The numbers below come from the")
    print("      real GuardianCore on data exported straight out of R.\n")

    tmp = Path(tempfile.mkdtemp(prefix="sfs_r_datasets_"))
    code, out = sh(["Rscript", "-e", R_EXPORT, str(tmp)])
    print(out.strip())
    if code != 0:
        print("Rscript failed -- S1.3 cannot be produced. ABORT.")
        sys.exit(2)

    for name in ["mtcars", "ToothGrowth", "PlantGrowth"]:
        p = tmp / f"{name}.csv"
        print(f"  {name}.csv  sha256={sha256(p)}  bytes={p.stat().st_size}")

    import numpy as np
    sys.path.insert(0, str(BACKEND))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "stickforstats.settings")
    import django
    try:
        django.setup()
    except Exception:
        pass
    from core.guardian.guardian_core import GuardianCore

    g = GuardianCore()

    # ---- mtcars: regression mpg ~ wt -----------------------------------
    print("\n### mtcars -- regression, mpg ~ wt")
    m = load_csv(tmp / "mtcars.csv")
    wt = np.array([float(x) for x in m["wt"]])
    mpg = np.array([float(x) for x in m["mpg"]])
    print(f"    n = {len(wt)};  wt mean={wt.mean():.6f} sd={wt.std(ddof=1):.6f};  "
          f"mpg mean={mpg.mean():.6f} sd={mpg.std(ddof=1):.6f}")
    rep = g.check(data={"wt": wt.tolist(), "mpg": mpg.tolist()}, test_type="regression")
    describe_report(rep)

    # ---- ToothGrowth: two-sample t-test OJ vs VC -----------------------
    print("\n### ToothGrowth -- two-sample t-test, len ~ supp (OJ vs VC)")
    t = load_csv(tmp / "ToothGrowth.csv")
    lens = [float(x) for x in t["len"]]
    supp = [s.strip('"') for s in t["supp"]]
    oj = [v for v, s in zip(lens, supp) if s == "OJ"]
    vc = [v for v, s in zip(lens, supp) if s == "VC"]
    print(f"    n_OJ = {len(oj)}  mean={np.mean(oj):.6f} sd={np.std(oj, ddof=1):.6f}")
    print(f"    n_VC = {len(vc)}  mean={np.mean(vc):.6f} sd={np.std(vc, ddof=1):.6f}")
    rep = g.check(data={"OJ": oj, "VC": vc}, test_type="t_test")
    describe_report(rep)

    # ---- PlantGrowth: one-way ANOVA ------------------------------------
    print("\n### PlantGrowth -- one-way ANOVA, weight ~ group")
    p = load_csv(tmp / "PlantGrowth.csv")
    w = [float(x) for x in p["weight"]]
    grp = [s.strip('"') for s in p["group"]]
    groups: dict[str, list[float]] = {}
    for value, gname in zip(w, grp):
        groups.setdefault(gname, []).append(value)
    for gname in sorted(groups):
        arr = np.array(groups[gname])
        print(f"    {gname:<6} n={len(arr)} mean={arr.mean():.6f} "
              f"sd={arr.std(ddof=1):.6f}")
    rep = g.check(data={k: groups[k] for k in sorted(groups)}, test_type="anova")
    describe_report(rep)

    # ---- the reference statistics the three tests would produce --------
    print("\n### Reference test statistics (SciPy), for context only")
    from scipy import stats as sps
    sl, ic, r, pv, se = sps.linregress(wt, mpg)
    print(f"    mtcars      linregress slope={sl:.10f} intercept={ic:.10f} "
          f"r2={r**2:.10f} p={pv:.6e}")
    tt = sps.ttest_ind(oj, vc)
    print(f"    ToothGrowth ttest_ind      t={tt.statistic:.10f} p={tt.pvalue:.10f}")
    fo = sps.f_oneway(*[groups[k] for k in sorted(groups)])
    print(f"    PlantGrowth f_oneway       F={fo.statistic:.10f} p={fo.pvalue:.10f}")


# ---------------------------------------------------------------------------
# S1.4 — test-suite counts, from the test runners
# ---------------------------------------------------------------------------
BACKEND_SUITES = [
    ("Guardian integration", "core.guardian.tests.test_guardian_integration"),
    ("Guardian middleware", "core.guardian.tests.test_guardian_middleware"),
    ("Guardian validator unit", "tests.test_guardian_validators"),
    ("Guardian math correctness", "core.tests.test_guardian_math_fixes"),
]

FRONTEND_SUITES = [
    ("Guardian components", "Guardian/__tests__/GuardianComponents"),
    ("useGuardianReport hook", "hooks/__tests__/useGuardianReport"),
]


def s1_4(run_totals: bool) -> None:
    rule("S1.4  Guardian test-suite counts, from the actual test runners")

    py = str(REPO_ROOT / ".venv-django" / "bin" / "python")
    env = {"DJANGO_SETTINGS_MODULE": "stickforstats.settings"}
    backend_counts: dict[str, int] = {}
    for label, module in BACKEND_SUITES:
        code, out = sh([py, "manage.py", "test", module], cwd=BACKEND, env=env)
        m = re.search(r"^Ran (\d+) tests?", out, re.M)
        ok = "OK" if re.search(r"^OK", out, re.M) else "NOT-OK"
        n = int(m.group(1)) if m else -1
        backend_counts[label] = n
        print(f"  -> {label:<28} Ran {n} tests   {ok}   ({module})")

    frontend_counts: dict[str, int] = {}
    for label, pattern in FRONTEND_SUITES:
        code, out = sh(
            ["npx", "react-scripts", "test", "--watchAll=false",
             f"--testPathPattern={pattern}"],
            cwd=FRONTEND, env={"CI": "true"},
        )
        m = re.search(r"^Tests:\s+(\d+) passed, (\d+) total", out, re.M)
        n = int(m.group(2)) if m else -1
        frontend_counts[label] = n
        print(f"  -> {label:<28} Tests: {n} total   ({pattern})")

    print(f"\n  backend Guardian subtotal  = {sum(backend_counts.values())} "
          f"({' + '.join(str(v) for v in backend_counts.values())})")
    print(f"  frontend Guardian subtotal = {sum(frontend_counts.values())} "
          f"({' + '.join(str(v) for v in frontend_counts.values())})")

    if not run_totals:
        print("\n  (--no-test-counts / --no-totals: whole-suite totals skipped)")
        return

    print("\n--- working-tree hygiene (a dirty tree changes the totals below) ---")
    code, out = sh(["git", "status", "--porcelain", "--", "backend"], cwd=REPO_ROOT)
    test_paths = [ln for ln in out.splitlines() if "test" in ln.lower()]
    if test_paths:
        print("  backend test files added/modified relative to HEAD:")
        for ln in test_paths:
            print(f"    {ln}")
        print("  -> the full-suite total below therefore includes uncommitted tests.")
    else:
        print("  no backend test files differ from HEAD; totals are the HEAD totals.")

    print("\n--- whole-suite totals, for the 'what fraction is this?' statement ---")
    code, out = sh([py, "manage.py", "test"], cwd=BACKEND, env=env)
    m = re.search(r"^Ran (\d+) tests? in ([\d.]+)s", out, re.M)
    b_total = int(m.group(1)) if m else -1
    b_ok = "OK" if re.search(r"^OK", out, re.M) else "NOT-OK"
    print(f"  backend  full suite: Ran {b_total} tests  {b_ok}")

    code, out = sh(["npx", "react-scripts", "test", "--watchAll=false"],
                   cwd=FRONTEND, env={"CI": "true"})
    m = re.search(r"^Tests:\s+(\d+) passed, (\d+) total", out, re.M)
    f_total = int(m.group(2)) if m else -1
    ms = re.search(r"^Test Suites:\s+(.*)$", out, re.M)
    print(f"  frontend full suite: Tests: {f_total} total   "
          f"Test Suites: {ms.group(1) if ms else '?'}")

    bg = sum(backend_counts.values())
    fg = sum(frontend_counts.values())
    if b_total > 0:
        print(f"  backend  Guardian fraction  = {bg}/{b_total} = "
              f"{100.0 * bg / b_total:.2f}%")
    if f_total > 0:
        print(f"  frontend Guardian fraction  = {fg}/{f_total} = "
              f"{100.0 * fg / f_total:.2f}%")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", choices=["s1_1", "s1_3", "s1_4"], default=None)
    ap.add_argument("--no-test-counts", action="store_true",
                    help="skip S1.4 entirely")
    ap.add_argument("--no-totals", action="store_true",
                    help="run S1.4 per-suite counts but skip the full-suite totals")
    args = ap.parse_args()

    preamble()
    if args.only in (None, "s1_1"):
        s1_1()
    if args.only in (None, "s1_3"):
        s1_3()
    if args.only in (None, "s1_4") and not args.no_test_counts:
        s1_4(run_totals=not args.no_totals)

    rule("DONE")


if __name__ == "__main__":
    main()
