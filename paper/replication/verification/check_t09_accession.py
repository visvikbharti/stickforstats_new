#!/usr/bin/env python3
"""Correctness check for T09-ACCESSION (data_availability_extractor).
Created: 2026-06-24 IST. Pure module -> runs in any python3.
"""
from __future__ import annotations
import importlib
import sys
import types
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[3] / "backend"
for _n, _p in [("core", BACKEND / "core"), ("core.manuscript", BACKEND / "core" / "manuscript")]:
    if _n not in sys.modules:
        _m = types.ModuleType(_n); _m.__path__ = [str(_p)]; _m.__package__ = _n
        sys.modules[_n] = _m
da = importlib.import_module("core.manuscript.data_availability_extractor")

CASES = [
    ("GEO", "Raw data were deposited in the Gene Expression Omnibus under accession GSE271517.",
        "open_accession", "GEO", "GSE271517"),
    ("SRA+BioProject", "Reads are in the SRA (BioProject PRJNA508901; runs SRR8267871).",
        "open_accession", "BioProject", "PRJNA508901"),
    ("Dryad", "Data are available from the Dryad repository (https://doi.org/10.5061/dryad.q2bvq83kz).",
        "open_accession", "Dryad", "10.5061/dryad.q2bvq83kz"),
    ("Zenodo URL", "Code and data archived on Zenodo: https://zenodo.org/record/19225928.",
        "open_accession", "Zenodo", "19225928"),
    ("figshare", "The dataset is on figshare (https://doi.org/10.6084/m9.figshare.12345678).",
        "open_accession", "figshare", "10.6084/m9.figshare.12345678"),
    ("OSF", "All materials and data are available on the OSF (osf.io/x3f6g).",
        "open_accession", "OSF", "x3f6g"),
    ("on_request", "Data are available from the corresponding author upon reasonable request.",
        "on_request", None, None),
    ("in_paper_supp", "All data are contained within the article and its Supplementary Information files.",
        "in_paper_supp", None, None),
    ("none", "We thank the participants. This work was funded by a grant.",
        "none", None, None),
]


def main() -> int:
    ok = True
    print("=" * 70); print("T09-ACCESSION correctness check"); print("=" * 70)
    for name, text, exp_class, exp_repo, exp_acc in CASES:
        r = da.extract_data_availability(text)
        repos = {a.repository for a in r.accessions}
        accs = {a.accession for a in r.accessions}
        class_ok = r.availability_class == exp_class
        repo_ok = (exp_repo is None) or (exp_repo in repos)
        acc_ok = (exp_acc is None) or (exp_acc in accs)
        case_ok = class_ok and repo_ok and acc_ok
        ok = ok and case_ok
        print(f"  [{'PASS' if case_ok else 'FAIL'}] {name:16s} class={r.availability_class} "
              f"accessions={[a.repository + ':' + a.accession for a in r.accessions]}")
    # on_request must NOT be a verifiable candidate; GEO must be
    extra = [
        ("on_request not verifiable",
            not da.extract_data_availability(CASES[6][1]).is_verifiable_candidate),
        ("GEO is verifiable",
            da.extract_data_availability(CASES[0][1]).is_verifiable_candidate),
    ]
    for name, cond in extra:
        ok = ok and cond
        print(f"  [{'PASS' if cond else 'FAIL'}] {name}")
    print("=" * 70)
    print(f"T09 CHECK: {'PASS' if ok else 'FAIL'}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
