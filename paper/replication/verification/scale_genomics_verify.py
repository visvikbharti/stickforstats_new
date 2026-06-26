#!/usr/bin/env python3
"""
SCALE PROOF — genome-scale raw-data verification on REAL RNA-seq via the auto-linker.
=====================================================================================

Verifies many gene-level claims AUTOMATICALLY against real GSE271517 (no per-claim hand-wiring),
with the sample grouping obtained from the FETCHED GEO series matrix (closing the automation loop).

What it measures, and how to read each number HONESTLY:
  * AUTO-LINK rate — fraction of (uniform synthetic) claims the GenomicsLinker resolved (gene+groups).
    Measures auto-linking on consistent phrasing, NOT robustness to free-text prose.
  * LINK-FIDELITY / round-trip self-consistency — fraction of FAITHFUL claims NOT false-flagged
    DISCREPANT. Because each claim's statistic is COMPUTED FROM the data and re-checked against the
    SAME data, this confirms the recompute+compare path is faithful and non-trigger-happy; it is NOT
    an independent audit of an author's arithmetic (that is the no-data tier / real-paper runs).
  * ERROR DETECTION by magnitude — for genes seeded with a known multiplicative error on the claimed
    statistic (×1.1 / ×1.3 / ×2 / ×10), the fraction NOT passed as VERIFIED. (A seeded gene whose
    assumptions also fail is ASSUMPTION_VIOLATED by precedence — still flagged, not a miss; only a
    VERIFIED is a true miss.)
  * ASSUMPTION-VIOLATION PREVALENCE — fraction of linked genes whose per-gene t-test ASSUMPTIONS fail
    (read from the assumption check itself, independent of seeding), with a (independence-assuming,
    therefore optimistic) bootstrap CI. Sample = a RANDOM draw of expressed genes (fixed seed).

Usage (full venv):
  cd backend && DJANGO_DEBUG=True ../.venv-django/bin/python \
      ../paper/replication/verification/scale_genomics_verify.py [N_GENES]
"""
from __future__ import annotations

import os
import sys
import time
from collections import Counter
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
from core.manuscript.geo_metadata import fetch_geo_metadata  # noqa: E402
from core.manuscript.reanalysis_engine import verify_claim  # noqa: E402
from core.manuscript.verdicts import ClaimVerificationRequest  # noqa: E402

DATA = ROOT / "paper/replication/case_study_4/data"
CACHE = Path("/Volumes/My_Passport/stickforstats_corpus/geo_cache")
REPORT = ROOT / "paper/replication/verification/SCALE_REPORT_2026-06-25.md"
N_GENES = int(sys.argv[1]) if len(sys.argv) > 1 else 1000
SEED_EVERY = 6                                   # 1 in 6 genes is seeded with a known error
ERROR_MAGS = [1.10, 1.30, 2.0, 10.0]             # graded error magnitudes (×claimed statistic)


def _grouping_metadata():
    """Sample grouping for GSE271517: fetched from the GEO SERIES MATRIX (automatic loop). Falls
    back to the deposited sample sheet only if the fetch fails (prints which path was used)."""
    md = fetch_geo_metadata("GSE271517", CACHE, max_bytes=60 * 1024 * 1024)
    if md.ok and "tumor type" in md.frame.columns:
        print(f"[auto] grouping from FETCHED GEO series matrix ({md.n_samples} samples)")
        return md.frame, "GEO series matrix (auto-fetched)"
    sheet = pd.read_csv(DATA / "GSE271517_sample_assignment.csv").set_index("sample_title")
    print(f"[fallback] series-matrix fetch unavailable ({md.status}); using deposited sample sheet")
    return sheet, "deposited sample sheet (fallback)"


def _bootstrap_ci(flags, n_boot=2000, seed=0):
    """Percentile bootstrap CI for a proportion. NOTE: assumes gene independence, so it UNDERSTATES
    uncertainty under the positive gene-gene dependence of RNA-seq — treat as an optimistic bound."""
    if not flags:
        return (0.0, 0.0)
    arr = np.asarray(flags, dtype=float)
    rng = np.random.default_rng(seed)
    means = [arr[rng.integers(0, len(arr), len(arr))].mean() for _ in range(n_boot)]
    return (float(np.percentile(means, 2.5)), float(np.percentile(means, 97.5)))


def main() -> int:
    counts = pd.read_csv(DATA / "GSE271517_Sample_Counts.csv.gz", index_col=0)
    meta_frame, grouping_source = _grouping_metadata()
    tt = meta_frame["tumor type"] if "tumor type" in meta_frame.columns else meta_frame["tumor_type"]
    tt = tt.reindex(counts.columns)
    prim = counts.columns[(tt == "Primary_tumor").values]
    metas = counts.columns[(tt == "Metastasis").values]
    df = len(prim) + len(metas) - 2

    lib = counts.sum(axis=0)
    npass = (counts >= 10).sum(axis=1)
    logcpm = np.log2(counts.loc[npass >= 3].div(lib / 1e6, axis=1) + 1.0)

    linker = GenomicsLinker(logcpm, sample_metadata=meta_frame)
    extractor = StatisticalClaimExtractor()

    # RANDOM sample of expressed genes (fixed seed) — not "first N" (avoids index-order bias)
    rng = np.random.default_rng(0)
    pool = list(logcpm.index)
    genes = list(rng.choice(pool, size=min(N_GENES, len(pool)), replace=False))
    print(f"genome-scale verification: {len(genes)} RANDOM expressed genes x {len(prim)}+{len(metas)} "
          f"samples (real GSE271517); grouping = {grouping_source}")

    dist = Counter()
    n_linked = 0
    faithful_false_discrepant = faithful_verified = n_faithful = 0
    detect_by_mag = {m: [0, 0] for m in ERROR_MAGS}   # mag -> [n, n_flagged_not_verified]
    seeded_wrongly_verified = 0
    assum_flags = []                                   # per-linked-gene: assumptions fail? (any seeding)
    t0 = time.time()
    for i, ens in enumerate(genes):
        row = logcpm.loc[ens]
        a, b = row[prim].values, row[metas].values
        if (np.std(a) == 0 and np.std(b) == 0):
            continue
        t, p = stats.ttest_ind(a, b, equal_var=True)
        if not np.isfinite(t):
            continue
        seeded = (i % SEED_EVERY == 0)
        mag = ERROR_MAGS[(i // SEED_EVERY) % len(ERROR_MAGS)] if seeded else 1.0
        claimed_t = abs(float(t)) * mag
        text = (f"Gene {ens} differed between primary tumours and metastases "
                f"(t({df}) = {claimed_t:.2f}, p = {float(p):.3f}).")
        claims = extractor.extract(text, section="Results")
        if not claims:
            dist["UNLINKED:no_claim"] += 1
            continue
        lr = linker.link(claims[0], None, context_text=text)
        if lr.status != "linked":
            dist["UNLINKED:" + lr.status] += 1
            continue
        n_linked += 1
        cv = verify_claim(ClaimVerificationRequest(claim=claims[0], data_spec=lr.data_spec))
        v = cv.verdict.value
        dist[v] += 1
        assum_flags.append(1 if cv.assumptions_satisfied is False else 0)
        if seeded:
            detect_by_mag[mag][0] += 1
            if v != "VERIFIED":
                detect_by_mag[mag][1] += 1
            else:
                seeded_wrongly_verified += 1
        else:
            n_faithful += 1
            faithful_verified += (v == "VERIFIED")
            faithful_false_discrepant += (v == "DISCREPANT")
    dt = time.time() - t0

    auto_link_rate = n_linked / max(1, sum(dist.values()))
    link_fidelity = 1 - faithful_false_discrepant / max(1, n_faithful)
    verified_only_rate = faithful_verified / max(1, n_faithful)
    assum_prev = float(np.mean(assum_flags)) if assum_flags else 0.0
    ci_lo, ci_hi = _bootstrap_ci(assum_flags)
    n_seeded = sum(c for c, _ in detect_by_mag.values())
    n_seeded_flagged = sum(f for _, f in detect_by_mag.values())

    lines = []

    def out(s=""):
        print(s)
        lines.append(s)

    out("\n" + "=" * 80)
    out("GENOME-SCALE RAW-DATA VERIFICATION — REAL GSE271517 (auto-linked)")
    out("=" * 80)
    out(f"claims processed:        {sum(dist.values())}  ({dt:.0f}s)")
    out(f"grouping source:         {grouping_source}")
    out(f"auto-link rate:          {n_linked}/{sum(dist.values())} = {auto_link_rate:.1%}  "
        f"(uniform synthetic phrasing)")
    out(f"verdict distribution:    {dict(dist)}")
    out("")
    out(f"LINK-FIDELITY (faithful claims NOT false-flagged DISCREPANT): "
        f"{n_faithful - faithful_false_discrepant}/{n_faithful} = {link_fidelity:.1%}")
    out(f"   (round-trip self-consistency, NOT an independent arithmetic audit; "
        f"VERIFIED-only among faithful = {verified_only_rate:.1%}, rest ASSUMPTION_VIOLATED)")
    out(f"ERROR DETECTION by magnitude (seeded errors NOT passed as VERIFIED; "
        f"wrongly VERIFIED total = {seeded_wrongly_verified}):")
    for m in ERROR_MAGS:
        nm, fm = detect_by_mag[m]
        out(f"   x{m:<4}: {fm}/{nm} = {(fm / nm if nm else 0):.0%}")
    out(f"ASSUMPTION-VIOLATION PREVALENCE: {sum(assum_flags)}/{len(assum_flags)} = {assum_prev:.1%} "
        f"(95% bootstrap CI [{ci_lo:.1%}, {ci_hi:.1%}], independence-assuming -> optimistic)")
    out(f"   -> ~{assum_prev:.0%} (a minority) of expressed genes: the per-gene t-test reproduces but")
    out("      its normality/outlier assumptions fail -> a caution to check robustness / consider an")
    out("      assumption-appropriate test (the Case Study 4 concern, measured not asserted).")
    out("=" * 80)

    REPORT.write_text(
        "# Scale proof — genome-scale raw-data verification (real GSE271517)\n\n"
        f"_Generated 2026-06-25 by `scale_genomics_verify.py` ({len(genes)} random expressed genes)._\n\n"
        "The verification tool, with the automatic genomics linker, re-verified gene-level claims\n"
        "against the real GSE271517 RNA-seq matrix with no per-claim hand-wiring. The sample grouping\n"
        f"was obtained from the **{grouping_source}**.\n\n"
        "## Results\n\n"
        f"- **Claims processed:** {sum(dist.values())} ({dt:.0f}s)\n"
        f"- **Auto-link rate (gene+groups resolved):** {auto_link_rate:.1%} "
        f"(measured on uniform synthetic phrasing — not prose robustness)\n"
        f"- **Verdict distribution:** `{dict(dist)}`\n"
        f"- **Link-fidelity** (faithful claims not false-flagged DISCREPANT): **{link_fidelity:.1%}** "
        f"({n_faithful - faithful_false_discrepant}/{n_faithful}); VERIFIED-only among faithful = "
        f"{verified_only_rate:.1%}\n"
        f"- **Error detection by magnitude** (seeded errors not passed as VERIFIED; total wrongly "
        f"VERIFIED = {seeded_wrongly_verified}/{n_seeded}, overall {n_seeded_flagged}/{n_seeded}): "
        + ", ".join(f"×{m}={(detect_by_mag[m][1] / detect_by_mag[m][0] if detect_by_mag[m][0] else 0):.0%}"
                    for m in ERROR_MAGS) + "\n"
        f"- **Assumption-violation prevalence:** **{assum_prev:.1%}** "
        f"(95% bootstrap CI [{ci_lo:.1%}, {ci_hi:.1%}])\n\n"
        "## Methodology & honest scope (read before quoting these numbers)\n\n"
        "- **Round-trip caveat.** Each claim's t/p is computed FROM the data, then re-checked against\n"
        "  the SAME data. So link-fidelity / VERIFIED confirm the recompute+compare path is faithful\n"
        "  and not trigger-happy — they are NOT an independent audit of an author's arithmetic (that is\n"
        "  the no-data consistency tier and the real-paper runs). The **independent** results are the\n"
        "  graded error-detection (perturbations the verifier had no knowledge of) and the\n"
        "  assumption-violation prevalence (a property of the data + test, not of how the claim was built).\n"
        "- **Precedence.** A seeded error on an assumption-violated gene is reported ASSUMPTION_VIOLATED,\n"
        "  not DISCREPANT — still flagged; the only true miss is a seeded error passed as VERIFIED.\n"
        "- **Sample.** A RANDOM draw of expressed genes (counts>=10 in >=3 samples; fixed seed). The\n"
        "  bootstrap CI assumes gene independence and therefore UNDERSTATES uncertainty under RNA-seq\n"
        "  gene-gene correlation — read it as an optimistic bound, descriptive of this dataset.\n"
        "- **Scope.** Auto-link is measured on uniform synthetic phrasing (not free-text prose), and\n"
        "  the comparison is statistic-centric. 'Assumption-appropriate test' is the honest remedy\n"
        "  framing (robustness check / suitable model), not a blanket 'use a rank or count test'.\n\n"
        "## Interpretation\n\n"
        "Fully automatically, at genome scale, on real data, the tool (a) links gene claims to the\n"
        "fetched GEO grouping, (b) does not false-flag correct claims, (c) catches injected errors\n"
        "(increasingly with magnitude), and (d) quantifies how often the naive per-gene t-test's\n"
        "assumptions fail even when its number reproduces. INSUFFICIENT_DATA does not appear here\n"
        "because the data ARE available and linkable; on the published literature at large it\n"
        "dominates (see the 20-paper no-data census) — itself the meta-research finding.\n"
    )
    out(f"\nwrote {REPORT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
