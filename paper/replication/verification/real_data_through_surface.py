#!/usr/bin/env python3
"""
REAL DATA through the NEW Django service + persistence layer (T22/T10/T24).
===========================================================================

The unit test (backend/core/tests/test_verify_api.py) proves the web/DB plumbing with a tiny
synthetic table on purpose (tests must be deterministic + hermetic). This script proves the
SAME new layer on REAL data, end to end, and reads the verdicts back OUT of the database:

  PART 1 (raw-data tier)  — real GEO RNA-seq (GSE271517) -> run_verification() -> persisted
                            per-gene verdicts (VERIFIED / DISCREPANT / ASSUMPTION_VIOLATED).
  PART 2 (no-data tier)   — 20 REAL published papers -> verify_manuscript() -> the honest
                            verdict mix (INSUFFICIENT_DATA dominates) + real statcheck-style
                            INCONSISTENT_REPORTING hits, quoted from the actual paper text.

Run under the FULL Django venv (persistence is real):
  cd backend && DJANGO_DEBUG=True ../.venv-django/bin/python \
      ../paper/replication/verification/real_data_through_surface.py

Created: 2026-06-25 IST.
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

from core.manuscript.verification_service import run_verification  # noqa: E402
from core.manuscript.verify_pipeline import verify_manuscript  # noqa: E402
from core.manuscript.claim_data_linker import LinkResult  # noqa: E402
from core.manuscript.verdicts import ClaimDataSpec  # noqa: E402
from core.models import VerificationRun, ClaimVerdictRecord  # noqa: E402

COUNTS = ROOT / "paper/replication/case_study_4/data/GSE271517_Sample_Counts.csv.gz"
SAMPLE_META = ROOT / "paper/replication/case_study_4/data/GSE271517_sample_assignment.csv"
MARKERS = ROOT / "paper/replication/case_study_4/data/marker_gene_ensembl_ids.csv"
CORPUS = ROOT / "paper/replication/manuscript_validation/corpus"

BAR = "=" * 84


# --------------------------------------------------------------------------------------------
# PART 1 — raw-data tier on REAL RNA-seq through the persisting service
# --------------------------------------------------------------------------------------------
def make_genomics_linker(logcpm, prim_mask, meta_mask, symbol_to_ens):
    """A claim->data linker for gene-level claims: find the gene named in the claim's sentence,
    pull its expression row, split by the real tumour-type groups. (Production T21 follow-on will
    read the grouping from the GEO series-matrix; here it comes from the deposited sample sheet.)"""
    n = int(prim_mask.sum() + meta_mask.sum())

    def link(claim, dataframe, context_text=""):
        ctx = (context_text or getattr(claim, "raw_text", "") or "").upper()
        for sym, ens in symbol_to_ens.items():
            if (sym.upper() in ctx or ens.upper() in ctx) and ens in logcpm.index:
                row = logcpm.loc[ens].values
                spec = ClaimDataSpec(
                    intended_test="independent_t", design_type="two_group",
                    groups=[list(row[prim_mask]), list(row[meta_mask])],
                    variable_names=[sym, "tumor_type"], n=n,
                    auto_linked=True, linked_dataset_id="GSE271517",
                )
                return LinkResult("linked", spec, 0.95, f"gene {sym} ({ens}) x tumor_type")
        return LinkResult("unlinkable", reason="no recognized gene in claim sentence")

    return link


def part1_raw_data():
    print(BAR)
    print("PART 1 — RAW-DATA TIER on REAL RNA-seq (GEO GSE271517) through run_verification()")
    print(BAR)

    counts = pd.read_csv(COUNTS, index_col=0)
    meta = pd.read_csv(SAMPLE_META).set_index("sample_title").loc[counts.columns]
    grp = meta["tumor_type"]
    print(f"real matrix: {counts.shape[0]:,} genes x {counts.shape[1]} samples; "
          f"groups = {grp.value_counts().to_dict()}")

    lib = counts.sum(axis=0)
    logcpm = np.log2(counts.div(lib / 1e6, axis=1) + 1.0)
    prim_mask = (grp == "Primary_tumor").values
    meta_mask = (grp == "Metastasis").values
    n = int(prim_mask.sum() + meta_mask.sum())

    markers = pd.read_csv(MARKERS)
    sym2ens = {r.symbol: r.ensembl_id for r in markers.itertuples() if r.ensembl_id in logcpm.index}

    # Build a real "paper": one faithful sentence per marker gene (numbers computed FROM the data,
    # so a correct claim must VERIFY), plus one deliberately inflated claim (must be DISCREPANT).
    sentences, expect = [], {}
    for sym, ens in sym2ens.items():
        row = logcpm.loc[ens].values
        t, p = stats.ttest_ind(row[prim_mask], row[meta_mask], equal_var=True)
        if not np.isfinite(t):
            continue
        sentences.append(f"{sym} was differentially expressed between primary tumours and "
                         f"metastases (t({n - 2}) = {abs(float(t)):.2f}, p = {float(p):.3f}).")
        expect[sym] = "VERIFIED-or-ASSUMPTION_VIOLATED"
    # an inflated claim about the first marker (same gene, wrong statistic)
    if sym2ens:
        first = next(iter(sym2ens))
        sentences.append(f"In a re-analysis, {first} again differed by tumour type "
                         f"(t({n - 2}) = 99.90, p = 0.001).")
        expect[first + " (inflated)"] = "DISCREPANT"

    paper = "Results. " + " ".join(sentences)
    print(f"\nconstructed {len(sentences)} real-data claims across {len(sym2ens)} marker genes "
          f"(numbers computed from the matrix; one deliberately inflated).")

    linker = make_genomics_linker(logcpm, prim_mask, meta_mask, sym2ens)
    result = run_verification(
        paper, dataframe=logcpm, linker=linker,
        file_name="GSE271517_marker_genes_realdemo", title="GSE271517 marker-gene verification",
        data_source="geo:GSE271517",
        linked_datasets=[{"source_type": "geo", "accession": "GSE271517",
                          "n_rows": int(logcpm.shape[0]), "n_cols": int(logcpm.shape[1]),
                          "link_status": "linked"}],
        persist=True,
    )
    prof = result.profile
    print(f"\nVerificationProfile: {prof.n_claims} claims | verdicts = {prof.verdict_distribution} "
          f"| verifiability_rate = {prof.verifiability_rate}")
    print(f"persisted run_id = {result.run_id}")

    # read the verdicts back OUT of the database (proves persistence on real data)
    if result.run_id:
        run = VerificationRun.objects.get(id=result.run_id)
        print(f"\n[DB read-back] VerificationRun {run.id}  data_source={run.data_source}  "
              f"n_claims={run.n_claims}")
        for rec in run.claim_verdicts.all():
            claimed = rec.claimed_statistic
            recomp = rec.recomputed_statistic
            line = (f"  - {rec.verdict:24s} t_claimed={claimed!s:>7} t_recomputed="
                    f"{(round(recomp, 3) if recomp is not None else None)!s:>8}")
            d = rec.detail or {}
            viol = (d.get("assumptions", {}) or {}).get("violations") or []
            if viol:
                line += f"  | assumption: {viol[0][:60]}"
            print(line)
            print(f"        claim: {rec.claim_text[:96]}")

    # ---- 1b: find a gene where the per-gene t-test REPRODUCES but its ASSUMPTIONS FAIL ----
    # (the Case Study 4 thesis, now landing as a persisted verdict through the new service)
    print("\n[1b] scanning the low-expression tail for an ASSUMPTION_VIOLATED gene ...")
    npass = (counts >= 10).sum(axis=1)
    flog = np.log2(counts.loc[npass >= 3].div(lib / 1e6, axis=1) + 1.0)
    for ens in flog.index[:2000]:
        row = flog.loc[ens].values
        if np.std(row[prim_mask]) == 0 and np.std(row[meta_mask]) == 0:
            continue
        t, p = stats.ttest_ind(row[prim_mask], row[meta_mask], equal_var=True)
        if not np.isfinite(t):
            continue
        text = (f"Results. Gene {ens} differed between primary tumours and metastases "
                f"(t({n - 2}) = {abs(float(t)):.2f}, p = {float(p):.3f}).")
        gene_linker = make_genomics_linker(flog, prim_mask, meta_mask, {ens: ens})
        probe = run_verification(text, dataframe=flog, linker=gene_linker, persist=False)
        cv = probe.profile.claim_verdicts[0] if probe.profile.claim_verdicts else None
        if cv and cv.verdict.value == "ASSUMPTION_VIOLATED":
            # only NOW persist the winner (probing stays in-memory)
            r = run_verification(text, dataframe=flog, linker=gene_linker,
                                 file_name=f"GSE271517_{ens}", title=f"GSE271517 {ens}",
                                 data_source="geo:GSE271517", persist=True)
            cv = r.profile.claim_verdicts[0]
            print(f"  {ens}: ASSUMPTION_VIOLATED (persisted run {r.run_id})")
            print(f"     t reproduces (recomputed {cv.recomputed_statistic:.2f}, "
                  f"match={cv.statistic_match}) BUT the t-test's assumptions fail:")
            print(f"     -> {cv.assumption_violations[0][:96] if cv.assumption_violations else '(n/a)'}")
            print("     i.e. the verifier says 'the number is right but the test is wrong here' — "
                  "an appropriate (rank/count) test is needed.")
            break
    return result.run_id


# --------------------------------------------------------------------------------------------
# PART 2 — no-data tier on 20 REAL published papers
# --------------------------------------------------------------------------------------------
def part2_real_papers():
    print("\n" + BAR)
    print("PART 2 — NO-DATA TIER on 20 REAL published papers through verify_manuscript()")
    print(BAR)
    files = sorted(CORPUS.glob("*.txt"))
    if not files:
        print("  (corpus not found)")
        return
    from collections import Counter
    dist = Counter()
    inconsistent_examples = []
    total_claims = 0
    for f in files:
        text = f.read_text(errors="ignore")
        prof = verify_manuscript(text, full_text=text)  # no data -> consistency tier only
        total_claims += prof.n_claims
        dist.update(prof.verdict_distribution)
        for cv in prof.claim_verdicts:
            for note in cv.notes:
                if "INCONSISTENT" in note.upper():
                    inconsistent_examples.append((f.stem, cv.claim_text.strip()[:100], note))

    print(f"\n{len(files)} real papers | {total_claims} statistical-test claims")
    print(f"verdict mix across all real claims: {dict(dist)}")
    print(f"internally-inconsistent (statcheck-style) reporting flags: {len(inconsistent_examples)}")
    print("\nReal mis-reported statistics found in real papers (first 5):")
    for paper_id, claim, note in inconsistent_examples[:5]:
        print(f"  - [{paper_id}] {claim}")
        print(f"      -> {note[:104]}")

    # persist ONE real paper through the full service to show the no-data path also persists
    demo = files[0]
    r = run_verification(demo.read_text(errors="ignore"), file_name=demo.name,
                         title=f"real paper {demo.stem}", data_source="none", persist=True)
    print(f"\n[persist demo] {demo.stem}: run_id={r.run_id}, "
          f"verdicts={r.profile.verdict_distribution}")


def main() -> int:
    rid = part1_raw_data()
    part2_real_papers()
    print("\n" + BAR)
    print("SUMMARY: the NEW service + DB layer just ran on REAL RNA-seq and REAL papers.")
    print(f"  - raw-data tier: real GSE271517 -> persisted verdicts (run {rid})")
    print(f"  - total VerificationRun rows now in the dev DB: {VerificationRun.objects.count()}")
    print(f"  - total ClaimVerdictRecord rows: {ClaimVerdictRecord.objects.count()}")
    print(BAR)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
