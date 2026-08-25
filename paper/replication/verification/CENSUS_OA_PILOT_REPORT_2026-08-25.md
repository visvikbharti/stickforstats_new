# Independent-frame pilot, re-scored: general PMC Open-Access

_Generated 2026-08-25. Supersedes `CENSUS_OA_PILOT_REPORT_2026-06-26.md`, which is left unedited as
a dated snapshot. Same corpus, same sampling, **corrected p-reader** (`f979b89`)._

This is the INDEPENDENT external replication of the census inconsistency rate — a uniform-ish sample
of the *general* PMC OA population via `oa.fcgi`, with the design-query enrichment dropped entirely.
It is not the same-population robustness result; that is the IPW re-estimate.

## Why this needed re-running

Every other census number was re-scored on the corrected p-reader on 2026-08-21/24. This arm was not,
because it is the only one that needs the corpus drive, and the drive was unmounted. Until today the
manuscript and Fig 6 carried its 5.6% as a hardcoded constant with its provenance noted. It is now
derived, from `paper/census_paper/data/oa_pilot_2026-08-25.json` (tracked, ~1 KB) when the drive is
absent and from the ledger itself when it is present.

## Control — the uncorrected reader reproduces the published numbers exactly

Before re-scoring, the pre-fix reader (`uncorrected (f979b89^ checked out into the tree, then restored)`) was run over the same corpus from a moved-aside
ledger, so the scoring actually re-executed rather than being read back:

| | control (uncorrected) | published 2026-06-26 |
|---|---|---|
| papers with ≥1 checkable | 5/230 | 5/230 |
| checkable claims | 108 | 108 |
| inconsistent | 6 (**5.6%**) | 6 (**5.6%**) |
| decision-changing | 0 | 0 |

**Reproduced exactly.** The stored 2026-06-26 ledger aggregates to the same values independently.

## Result on the corrected reader

| | corrected (2026-08-25) | published (2026-06-26) |
|---|---|---|
| XML files / parsed / readable body | 246 / 246 / 230 | 246 / 246 / 230 |
| recomputable-in-text paper rate | **2.2%** (5/230) | 2.2% (5/230) |
| extracted test claims | 354 | 354 |
| checkable claims | 108 | 108 |
| **inconsistent (of checkable)** | **6.5%** (7/108) | 5.6% (6/108) |
| decision-changing | 0 (0.0%) | 0 (0.0%) |
| papers with ≥1 inconsistency | 4/5 | 3/5 |

**One claim flipped, consistent → inconsistent, in `PMC10791030`.** That is the same direction as
every one of the 22 flips in the main corpus: the correction removes an amnesty at small p, so it can
only ever add flags. The denominator, the extraction and the decision-changing count are unchanged —
this arm's re-score touches the numerator alone.

## How to read it

Unchanged from the original report, and worth repeating because the number moved: the 108
checkable claims come from only **5 papers**, so they are heavily clustered
and the interval on 6.5% is very wide. **Treat it as a sign-check, not as an estimate**,
which is how the manuscript reports it. It still sits below the raw 11.81% and below the IPW 11.32%,
and it is now inside the paper-clustered interval for the genuine rate, [6.95%, 11.49%], rather than
below it.

The recomputable-paper rate (2.2%) remains lower than the design-query census's
3.38%, as expected: this frame has no quantitative-design enrichment.

## Provenance

- corpus: `/Volumes/My_Passport/stickforstats_corpus/oa_pilot_2026-06-26` (246 XML)
- ledger: `/Volumes/My_Passport/stickforstats_corpus/census_2026-06-25/census_oa_pilot_2026-06-26.jsonl`
- ledger sha256: `f9d57b304cc5a79f…`
- tracked summary: `paper/census_paper/data/oa_pilot_2026-08-25.json`
- scored with: corrected p-reader (f979b89 present)
- the pre-correction ledger is kept beside it as `…jsonl.ORIGINAL_2026-06-26` so this control can be
  re-run without re-fetching.
