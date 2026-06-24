#!/usr/bin/env python3
"""
Run the whole manuscript-verification suite — one command, one green/red.
=========================================================================

Created: 2026-06-24 IST. Reproducibility capstone for the verification module.

Runs every check (pass/fail exit codes) + the demos/benchmark (informational) using the
dedicated venv, and reports a summary. Exit 0 iff all pass/fail checks pass.

    .venv-verify/bin/python paper/replication/verification/run_all.py
(or `python run_all.py` — it locates .venv-verify itself.)
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
PY = ROOT / ".venv-verify" / "bin" / "python"
if not PY.exists():
    PY = Path(sys.executable)

# (script, is_passfail) — pass/fail checks gate the exit code; demos/benchmark are informational
SUITE = [
    ("poc_a4_cascade.py", True),
    ("check_t04_t06.py", True),
    ("check_t09_accession.py", True),
    ("check_t12_t13_t19.py", True),
    ("check_verify_pipeline.py", True),
    ("eval_vs_statcheck.py", False),
    ("demo_tabular_end_to_end.py", False),
    ("demo_genomics_end_to_end.py", False),
    ("census_consistency.py", False),
]

KEYLINE = {  # a one-line result excerpt to surface per script
    "poc_a4_cascade.py": "T05-A4POC:",
    "check_t04_t06.py": "T04 + T06 CHECK:",
    "check_t09_accession.py": "T09 CHECK:",
    "check_t12_t13_t19.py": "CONTROL SUITE:",
    "check_verify_pipeline.py": "VERIFY-PIPELINE CHECK:",
    "eval_vs_statcheck.py": "RECALL (of statcheck):",
    "census_consistency.py": "internally-inconsistent",
    "demo_genomics_end_to_end.py": "ASSUMPTION_VIOLATED",
    "demo_tabular_end_to_end.py": "VERDICT: DISCREPANT",
}


def run(script: str) -> tuple[int, str]:
    p = subprocess.run([str(PY), str(HERE / script)], capture_output=True, text=True)
    out = p.stdout + p.stderr
    key = KEYLINE.get(script, "")
    excerpt = next((ln.strip() for ln in out.splitlines() if key and key in ln), "")
    return p.returncode, excerpt


def main() -> int:
    print("=" * 78)
    print(f"MANUSCRIPT-VERIFICATION SUITE  (python: {PY})")
    print("=" * 78)
    failures = 0
    for script, passfail in SUITE:
        rc, excerpt = run(script)
        ok = rc == 0
        tag = "PASS" if ok else "FAIL"
        if not passfail:
            tag = "ran " if ok else "ERR "
        if passfail and not ok:
            failures += 1
        print(f"  [{tag}] {script:32s} {excerpt[:60]}")
    print("-" * 78)
    print(f"{'ALL CHECKS PASS' if failures == 0 else f'{failures} CHECK(S) FAILED'}")
    print("=" * 78)
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
