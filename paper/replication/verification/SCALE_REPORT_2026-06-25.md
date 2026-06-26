# Scale proof — genome-scale raw-data verification (real GSE271517)

_Generated 2026-06-25 by `scale_genomics_verify.py` (2000 random expressed genes)._

The verification tool, with the automatic genomics linker, re-verified gene-level claims
against the real GSE271517 RNA-seq matrix with no per-claim hand-wiring. The sample grouping
was obtained from the **GEO series matrix (auto-fetched)**.

## Results

- **Claims processed:** 2000 (419s)
- **Auto-link rate (gene+groups resolved):** 100.0% (measured on uniform synthetic phrasing — not prose robustness)
- **Verdict distribution:** `{'DISCREPANT': 285, 'ASSUMPTION_VIOLATED': 278, 'VERIFIED': 1437}`
- **Link-fidelity** (faithful claims not false-flagged DISCREPANT): **100.0%** (1666/1666); VERIFIED-only among faithful = 86.3%
- **Error detection by magnitude** (seeded errors not passed as VERIFIED; total wrongly VERIFIED = 0/334, overall 334/334): ×1.1=100%, ×1.3=100%, ×2.0=100%, ×10.0=100%
- **Assumption-violation prevalence:** **13.9%** (95% bootstrap CI [12.3%, 15.4%])

## Methodology & honest scope (read before quoting these numbers)

- **Round-trip caveat.** Each claim's t/p is computed FROM the data, then re-checked against
  the SAME data. So link-fidelity / VERIFIED confirm the recompute+compare path is faithful
  and not trigger-happy — they are NOT an independent audit of an author's arithmetic (that is
  the no-data consistency tier and the real-paper runs). The **independent** results are the
  graded error-detection (perturbations the verifier had no knowledge of) and the
  assumption-violation prevalence (a property of the data + test, not of how the claim was built).
- **Precedence.** A seeded error on an assumption-violated gene is reported ASSUMPTION_VIOLATED,
  not DISCREPANT — still flagged; the only true miss is a seeded error passed as VERIFIED.
- **Sample.** A RANDOM draw of expressed genes (counts>=10 in >=3 samples; fixed seed). The
  bootstrap CI assumes gene independence and therefore UNDERSTATES uncertainty under RNA-seq
  gene-gene correlation — read it as an optimistic bound, descriptive of this dataset.
- **Scope.** Auto-link is measured on uniform synthetic phrasing (not free-text prose), and
  the comparison is statistic-centric. 'Assumption-appropriate test' is the honest remedy
  framing (robustness check / suitable model), not a blanket 'use a rank or count test'.

## Interpretation

Fully automatically, at genome scale, on real data, the tool (a) links gene claims to the
fetched GEO grouping, (b) does not false-flag correct claims, (c) catches injected errors
(increasingly with magnitude), and (d) quantifies how often the naive per-gene t-test's
assumptions fail even when its number reproduces. INSUFFICIENT_DATA does not appear here
because the data ARE available and linkable; on the published literature at large it
dominates (see the 20-paper no-data census) — itself the meta-research finding.
