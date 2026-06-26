#!/usr/bin/env python3
"""
Control suite for the genomics auto-linker (genomics_linker.GenomicsLinker) on REAL GSE271517.
==============================================================================================

Proves AUTOMATIC gene-level linking (no per-claim hand-wiring): an Ensembl-id claim and a
symbol claim both link + verify; a claim that names no groups is ambiguous; a non-gene claim is
unlinkable; and an inflated statistic is DISCREPANT. Run under the full venv:
  cd backend && DJANGO_DEBUG=True ../.venv-django/bin/python \
      ../paper/replication/verification/check_genomics_linker.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "stickforstats.settings")
os.environ.setdefault("DJANGO_DEBUG", "True")
import django  # noqa: E402

django.setup()

import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
from scipy import stats  # noqa: E402

from core.manuscript.claim_extractor import StatisticalClaimExtractor  # noqa: E402
from core.manuscript.genomics_linker import GenomicsLinker  # noqa: E402
from core.manuscript.geo_metadata import align_samples  # noqa: E402
from core.manuscript.reanalysis_engine import verify_claim  # noqa: E402
from core.manuscript.verdicts import ClaimVerificationRequest  # noqa: E402

DATA = ROOT / "paper/replication/case_study_4/data"


def load():
    counts = pd.read_csv(DATA / "GSE271517_Sample_Counts.csv.gz", index_col=0)
    meta = pd.read_csv(DATA / "GSE271517_sample_assignment.csv").set_index("sample_title")
    meta = meta.loc[[s for s in counts.columns if s in meta.index]]
    lib = counts.sum(axis=0)
    logcpm = np.log2(counts.div(lib / 1e6, axis=1) + 1.0)
    markers = pd.read_csv(DATA / "marker_gene_ensembl_ids.csv")
    sym2ens = {r.symbol: r.ensembl_id for r in markers.itertuples()}
    return logcpm, meta, sym2ens


def verdict_for(linker, text):
    claim = StatisticalClaimExtractor().extract(text, section="Results")[0]
    lr = linker.link(claim, None, context_text=text)
    if lr.status != "linked":
        return lr.status, None
    cv = verify_claim(ClaimVerificationRequest(claim=claim, data_spec=lr.data_spec))
    return lr.status, cv


def main() -> int:
    logcpm, meta, sym2ens = load()
    linker = GenomicsLinker(logcpm, sample_metadata=meta[["tumor_type", "histology", "fusion_gene"]],
                            symbol_map=sym2ens)
    n = int(((meta["tumor_type"] == "Primary_tumor") | (meta["tumor_type"] == "Metastasis")).sum())
    df = n - 2

    # faithful values for two real genes (one by Ensembl id, one by symbol)
    def t_for(ens):
        row = logcpm.loc[ens]
        a = row[meta.index[meta["tumor_type"] == "Primary_tumor"]].values
        b = row[meta.index[meta["tumor_type"] == "Metastasis"]].values
        t, p = stats.ttest_ind(a, b, equal_var=True)
        return abs(float(t)), float(p)

    t_mki, p_mki = t_for("ENSG00000148773")  # MKI67
    t_top, p_top = t_for("ENSG00000131747")  # TOP2A

    checks = []

    # 1. Ensembl-id claim -> linked + VERIFIED
    s, cv = verdict_for(linker, f"Gene ENSG00000148773 differed between primary tumours and "
                                f"metastases (t({df}) = {t_mki:.2f}, p = {p_mki:.3f}).")
    checks.append(("ensembl-id claim auto-links + VERIFIED", s == "linked" and cv and cv.verdict.value == "VERIFIED"))

    # 2. symbol claim (via symbol_map) -> linked + VERIFIED
    s, cv = verdict_for(linker, f"TOP2A was higher in primary tumours than metastases "
                                f"(t({df}) = {t_top:.2f}, p = {p_top:.3f}).")
    checks.append(("symbol claim auto-links + VERIFIED", s == "linked" and cv and cv.verdict.value == "VERIFIED"))

    # 3. inflated statistic on a real gene -> DISCREPANT
    s, cv = verdict_for(linker, f"MKI67 differed between primary tumours and metastases "
                                f"(t({df}) = 88.80, p = 0.001).")
    checks.append(("inflated statistic -> DISCREPANT", s == "linked" and cv and cv.verdict.value == "DISCREPANT"))

    # 4. gene present but NO groups named -> ambiguous (never fabricate a grouping)
    s, _ = verdict_for(linker, "MKI67 was strongly expressed across the cohort (t(89) = 2.0, p = 0.05).")
    checks.append(("no groups named -> ambiguous (not fabricated)", s == "ambiguous"))

    # 5. no recognizable gene -> unlinkable
    s, _ = verdict_for(linker, "Age differed between primary tumours and metastases (t(89) = 2.0, p = 0.05).")
    checks.append(("no gene -> unlinkable", s == "unlinkable"))

    # --- regression checks for adversarial-review bugs (synthetic, deterministic) ---
    cols = [f"C{i}" for i in range(4)] + [f"T{i}" for i in range(4)]
    cond = pd.DataFrame({"condition": ["control"] * 4 + ["treatment"] * 4}, index=cols)

    # 6. duplicate gene symbol must NOT crash -> ambiguous (symbol collision)
    dup = pd.DataFrame(np.random.default_rng(1).normal(size=(3, 8)), index=["ACTB", "ACTB", "GAPDH"], columns=cols)
    dl = GenomicsLinker(dup, sample_metadata=cond)
    txt = "ACTB differed between control and treatment (t(6) = 2.0, p = 0.04)."
    try:
        c = StatisticalClaimExtractor().extract(txt, section="Results")[0]
        passed = dl.link(c, None, context_text=txt).status == "ambiguous"
    except Exception:
        passed = False
    checks.append(("duplicate gene symbol -> ambiguous (no crash)", passed))

    # 7. subset absorption: when only ONE group is named, do NOT fabricate a 2-group link
    rmeta = pd.DataFrame({"response": ["Responder"] * 4 + ["Non-responder"] * 4}, index=cols)
    rl = GenomicsLinker(dup.iloc[[2]], sample_metadata=rmeta)  # GAPDH only (unique)
    txt = "GAPDH was elevated among non-responders in the cohort (t(6) = 2.1, p = 0.04)."
    c = StatisticalClaimExtractor().extract(txt, section="Results")[0]
    checks.append(("only one group named -> not fabricated",
                   rl.link(c, None, context_text=txt).status == "ambiguous"))

    # 8. single-character column prefixes must not fabricate a grouping from arbitrary words
    cl = GenomicsLinker(dup.iloc[[2]])  # no metadata; prefixes 'c'/'t' are len<2 -> dropped
    txt = "GAPDH expression was measured across the cohort (t(6) = 2.0, p = 0.05)."
    c = StatisticalClaimExtractor().extract(txt, section="Results")[0]
    checks.append(("single-char prefixes -> not fabricated",
                   cl.link(c, None, context_text=txt).status in ("ambiguous", "unlinkable")))

    # 9. sample-id alignment heuristic: matrix cols S41.. align to titles "IL-2 41".. by numeric suffix
    sm = pd.DataFrame({"treatment": ["IL-2", "IL-2", "Ctrl", "Ctrl"], "gsm": ["GSM1", "GSM2", "GSM3", "GSM4"]},
                      index=["IL-2 41", "IL-2 42", "Ctrl 45", "Ctrl 46"])
    aligned, cov, method = align_samples(sm, ["S41", "S42", "S45", "S46"])
    checks.append(("align_samples: numeric-suffix alignment (S41<->'IL-2 41')",
                   aligned is not None and cov == 1.0 and list(aligned.index) == ["S41", "S42", "S45", "S46"]))

    print("GENOMICS AUTO-LINKER CONTROL SUITE (real GSE271517)")
    print("=" * 70)
    ok = 0
    for name, passed in checks:
        print(f"  [{'PASS' if passed else 'FAIL'}] {name}")
        ok += bool(passed)
    print("=" * 70)
    print(f"{ok}/{len(checks)} PASS")
    return 0 if ok == len(checks) else 1


if __name__ == "__main__":
    raise SystemExit(main())
