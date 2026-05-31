#!/usr/bin/env python3
"""
MASTER VERIFICATION SCRIPT FOR JSS PAPER
=========================================
This script runs ALL verifications and confirms scientific integrity.

Run this to verify all claims in the paper are reproducible.

Author: Vishal Bharti / Claude Code
Date: 2026-01-27
"""

import subprocess
import sys
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

print("=" * 70)
print("JSS PAPER - MASTER VERIFICATION")
print("Scientific Integrity Certification")
print("=" * 70)
print(f"\nDate: 2026-01-27")
print("Running all verification scripts...\n")

scripts = [
    ("run_all_validations.py", "SciPy Statistical Validation"),
    ("case_study_1_crispr.py", "Case Study 1 — CRISPR TOPSIS (ANOVA -> Guardian -> Kruskal-Wallis)"),
    ("verify_case_studies_FINAL.py", "Case Studies Verification (Iris, Wine)"),
    ("verify_meta_analysis_real.py", "Real Meta-Analysis (IV Magnesium / Egger 1997)"),
    ("additional_real_data_analysis.py", "Additional Datasets Validation"),
    ("case_study_4_genomics.py", "Case Study 4 — Real RNA-seq with Guardian (GSE271517 / Chen 2024)"),
]

all_passed = True

for script, description in scripts:
    print("\n" + "-" * 70)
    print(f"Running: {description}")
    print(f"Script: {script}")
    print("-" * 70)

    try:
        result = subprocess.run(
            [sys.executable, script],
            capture_output=True,
            text=True,
            timeout=300  # case_study_4 needs ~20s + GEO download time
        )

        # Authoritative pass/fail signal is the subprocess exit code.
        # Scripts MUST exit 0 on success and non-zero on failure.
        # Stdout substring matching was previously used here and produced
        # false-PASS verdicts whenever a script printed both "PASS" and "FAIL"
        # — see CRITICAL_REVIEW_2026-05-06.md §P0-7.
        output = result.stdout + result.stderr

        if result.returncode == 0:
            # Surface any explicit PASS/VERIFIED lines for the human reviewer
            lines = output.split('\n')
            shown = 0
            for line in lines:
                if ('PASS' in line or 'VERIFIED' in line or '✓' in line) and shown < 10:
                    print(f"  {line.strip()}")
                    shown += 1
            print(f"STATUS: PASSED (exit 0)")
        else:
            print(f"STATUS: FAILED (exit {result.returncode})")
            print(output[-1000:] if len(output) > 1000 else output)
            all_passed = False

    except subprocess.TimeoutExpired:
        print(f"STATUS: TIMEOUT")
        all_passed = False
    except Exception as e:
        print(f"STATUS: ERROR - {e}")
        all_passed = False

print("\n" + "=" * 70)
print("FINAL VERIFICATION STATUS")
print("=" * 70)

if all_passed:
    print("""
    ╔══════════════════════════════════════════════════════════════════╗
    ║                                                                  ║
    ║   ✓ ALL VERIFICATIONS PASSED                                    ║
    ║                                                                  ║
    ║   The JSS paper claims are SCIENTIFICALLY SOUND:                ║
    ║                                                                  ║
    ║   • SciPy validation: All statistical tests match               ║
    ║   • Case Study 1 (CRISPR TOPSIS): Real CRISPRArchitect v3       ║
    ║     scores, ANOVA + Kruskal-Wallis reproduced & asserted        ║
    ║   • Case Study 2 (Iris/Wine): Real data, verified results       ║
    ║   • Case Study 3 (IV Magnesium): Real Egger 1997 data,          ║
    ║     cross-validated against R metafor 4.8.0                     ║
    ║   • Additional datasets: Real R data, verified results          ║
    ║   • Case Study 4 (Synovial sarcoma RNA-seq): GSE271517 /        ║
    ║     Chen 2024, Guardian-augmented vs naive t-test pipeline      ║
    ║                                                                  ║
    ║   CERTIFICATION: Paper is ready for submission                  ║
    ║                                                                  ║
    ╚══════════════════════════════════════════════════════════════════╝
    """)
else:
    print("""
    ╔══════════════════════════════════════════════════════════════════╗
    ║                                                                  ║
    ║   ✗ SOME VERIFICATIONS FAILED                                   ║
    ║                                                                  ║
    ║   Please check the output above for details.                    ║
    ║   DO NOT submit paper until all verifications pass.             ║
    ║                                                                  ║
    ╚══════════════════════════════════════════════════════════════════╝
    """)
    sys.exit(1)

print("""
DATA SOURCES:
=============
All datasets are real, public, peer-reviewed:
1. Iris (Fisher 1936), Wine (Cortez 2009 / UCI), mtcars (Motor Trend 1974),
   ToothGrowth (Crampton 1947), PlantGrowth (Dobson 1983) — all standard
   reference datasets in sklearn / R.
2. IV Magnesium meta-analysis (Egger 1997 BMJ; Sterne 2001 J Clin Epi) —
   classic published example for funnel-plot asymmetry, cross-validated
   against R metafor 4.8.0 to 4+ decimal places.
3. Synovial sarcoma RNA-seq (Chen Y et al. 2024 Adv Sci, PMID 39257029,
   GSE271517) — 91 tumors from 55 patients; Guardian's per-gene
   normality cascade demonstrated on 27,221 genes.

No fabrication. No simulated data. No false claims. Scientific integrity maintained.
""")
