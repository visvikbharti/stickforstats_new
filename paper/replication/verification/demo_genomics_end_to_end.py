#!/usr/bin/env python3
"""
END-TO-END demo (genomics): a gene-level manuscript claim verified against the real GEO
count matrix it cites. Chains the whole module:

  data-availability text -> T09 accession -> T11 GEO fetch -> (genomics link) -> T13 verdict

Ties back to Case Study 4 (the count-GLM work): the verifier re-runs the AUTHORS' per-gene
test on real RNA-seq and lets Guardian flag the assumption issue. Honest: whatever verdict
the data yields is reported.

Created: 2026-06-24 IST. Run in .venv-verify (needs scipy). Uses the GEO cache on the
external drive + the local GSE271517 sample grouping (in production this comes from the GEO
series-matrix metadata).
"""
from __future__ import annotations

import importlib
import sys
import types
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BACKEND = ROOT / "backend"
for _n, _p in [("core", BACKEND / "core"), ("core.services", BACKEND / "core" / "services"),
               ("core.manuscript", BACKEND / "core" / "manuscript")]:
    if _n not in sys.modules:
        _m = types.ModuleType(_n); _m.__path__ = [str(_p)]; _m.__package__ = _n
        sys.modules[_n] = _m

import numpy as np
import pandas as pd
from scipy import stats

ce = importlib.import_module("core.manuscript.claim_extractor")
da = importlib.import_module("core.manuscript.data_availability_extractor")
fetcher = importlib.import_module("core.manuscript.data_fetcher")
dis = importlib.import_module("core.services.data_import_service")
engmod = importlib.import_module("core.manuscript.reanalysis_engine")
vd = importlib.import_module("core.manuscript.verdicts")

CACHE = Path("/Volumes/My_Passport/stickforstats_corpus/geo_cache")
SAMPLE_META = ROOT / "paper/replication/case_study_4/data/GSE271517_sample_assignment.csv"
GENES = {"MKI67": "ENSG00000148773", "TOP2A": "ENSG00000131747"}


def main() -> int:
    das = ("Raw RNA-seq read counts for all tumours are available in the NCBI Gene Expression "
           "Omnibus under accession GSE271517.")
    print("=" * 80)
    print("END-TO-END (genomics): DAS text -> accession -> GEO fetch -> link -> verdict")
    print("=" * 80)
    print("data-availability statement:", das)

    # 1. T09 — accession from the data-availability statement
    avail = da.extract_data_availability(das)
    acc = avail.accessions[0]
    print(f"\n[T09] accession: {acc.repository}:{acc.accession}  ({avail.availability_class})")

    # 2. T11 — fetch + ingest the GEO supplementary count matrix
    res = fetcher.fetch_geo(acc.accession, CACHE, max_bytes=60 * 1024 * 1024,
                            import_service=dis.DataImportService())
    print(f"[T11] fetch: {res.status}; {res.file_name} -> {res.n_rows}x{res.n_cols}")
    counts = pd.read_csv(res.local_path, index_col=0)

    # 3. sample grouping (production: GEO series-matrix; here: the local sample assignment)
    meta = pd.read_csv(SAMPLE_META).set_index("sample_title").loc[counts.columns]
    grp = meta["tumor_type"]
    print(f"[meta] groups: {grp.value_counts().to_dict()}")

    # log2(CPM+1) — the per-gene scale the authors' t-test runs on (Case Study 4)
    lib = counts.sum(axis=0)
    logcpm = np.log2(counts.div(lib / 1e6, axis=1) + 1.0)
    prim_mask = (grp == "Primary_tumor").values
    meta_mask = (grp == "Metastasis").values
    n = int(prim_mask.sum() + meta_mask.sum())

    print("\nVerifying gene-level claims (authors' principle: t-test for normal, else Mann-Whitney):")
    for symbol, ens in GENES.items():
        if ens not in logcpm.index:
            print(f"  {symbol}: not in matrix"); continue
        row = logcpm.loc[ens].values
        primary = list(row[prim_mask]); metastasis = list(row[meta_mask])
        t_obs, p_obs = stats.ttest_ind(primary, metastasis, equal_var=True)
        # a FAITHFUL manuscript claim built from the data (so we test VERIFY vs ASSUMPTION_VIOLATED)
        text = (f"{symbol} was differentially expressed between primary tumours and metastases "
                f"(t({n - 2}) = {abs(float(t_obs)):.2f}, p = {float(p_obs):.3f}).")
        claim = ce.StatisticalClaimExtractor().extract(text, section="Results")[0]
        spec = vd.ClaimDataSpec(intended_test="independent_t", design_type="two_group",
                                groups=[primary, metastasis], variable_names=[symbol, "tumor_type"],
                                n=n, auto_linked=True, linked_dataset_id="GSE271517")
        cv = engmod.verify_claim(vd.ClaimVerificationRequest(claim=claim, data_spec=spec))
        print(f"\n  {symbol} ({ens}) — \"{text}\"")
        print(f"    VERDICT: {cv.verdict.value}  | recomputed t={cv.recomputed_statistic:.3f} "
              f"vs claimed {cv.claimed_statistic} (match={cv.statistic_match}); "
              f"assumptions_ok={cv.assumptions_satisfied}")
        if cv.assumption_violations:
            print(f"    assumption flags: {cv.assumption_violations[0][:88]}")
        if cv.notes:
            print(f"    note: {cv.notes[-1][:96]}")

    # ---- and a gene where the verifier flags the assumption issue (Case Study 4 thesis) ----
    print("\nScanning for a gene whose per-gene t-test assumptions the verifier flags ...")
    npass = (counts >= 10).sum(axis=1)
    filtered = counts.loc[npass >= 3]
    flog = np.log2(filtered.div(lib / 1e6, axis=1) + 1.0)
    found = 0
    for ens in flog.index[:1500]:
        row = flog.loc[ens].values
        primary = list(row[prim_mask]); metastasis = list(row[meta_mask])
        if np.std(primary) == 0 and np.std(metastasis) == 0:
            continue
        t_obs, p_obs = stats.ttest_ind(primary, metastasis, equal_var=True)
        if not np.isfinite(t_obs):
            continue
        text = (f"Gene {ens} differed between primary and metastasis "
                f"(t({n - 2}) = {abs(float(t_obs)):.2f}, p = {float(p_obs):.3f}).")
        claim = ce.StatisticalClaimExtractor().extract(text, section="Results")[0]
        spec = vd.ClaimDataSpec(intended_test="independent_t", design_type="two_group",
                                groups=[primary, metastasis], n=n, auto_linked=True,
                                linked_dataset_id="GSE271517")
        cv = engmod.verify_claim(vd.ClaimVerificationRequest(claim=claim, data_spec=spec))
        if cv.verdict.value == "ASSUMPTION_VIOLATED":
            print(f"  {ens}: ASSUMPTION_VIOLATED — t reproduces (recomputed {cv.recomputed_statistic:.2f}, "
                  f"match={cv.statistic_match}) BUT the t-test's assumptions fail on this gene:")
            print(f"     {cv.assumption_violations[0][:96]}")
            print("     -> the per-gene t-test is inappropriate here; an appropriate (rank-based / count)")
            print("        test should be used. This is the Case Study 4 thesis, as a verification verdict.")
            found += 1
            break
    if not found:
        print("  (no assumption-violated gene in the scanned window)")
    print("\n" + "=" * 80)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
