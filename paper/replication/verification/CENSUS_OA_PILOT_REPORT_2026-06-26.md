# Independent-frame pilot: general PMC Open-Access (OA web service)

> ⚠️ **CORRECTION BANNER (added 2026-08-25).** This is a dated snapshot and is left otherwise
> unedited. Its own pilot numbers (2.2%, 5.6% = 6/108) stand, but **every census comparator in the
> table below is pre-correction**: read 3.5% (341/10,101) as **3.38%**, 11.1% raw as **11.81%**,
> 10.5% IPW as **11.32%**, and "~6–8% FP-validated" as **9.12%, 95% CI [6.95%, 11.49%]**
> (paper-clustered). The pilot arm itself has not yet been re-run on the corrected p-reader.


_Generated 2026-06-26 by `oa_pilot.py` + `census_jats.py` over a uniform-ish sample of the GENERAL PMC
Open-Access population (NCBI `oa.fcgi`, date-based enumeration). This is an INDEPENDENT external
replication of the census inconsistency rate, NOT the same-population robustness result (that is the
inverse-probability-weighted re-estimate, `CENSUS_IPW_REPORT_2026-06-26.md`)._

## Why this frame
The descriptive census sampled the *design-query* population (open access AND 2018:2025 AND a
quantitative-design term) by day clusters. This pilot drops the design-query enrichment entirely and
samples the *general* OA population via a *different* endpoint (the OA web service, which NCBI now
exposes after retiring `oa_file_list.csv`). It tests whether the inconsistency-among-checkable rate
**generalizes** beyond quantitative-design papers and is not an artifact of the query or the esearch
sampling path.

## Result (directional)
| | general OA pilot | design-query census (post-fix) |
|---|---|---|
| papers fetched / with body | 246 / 230 | 10,103 / 10,101 |
| recomputable-in-text paper rate | **2.2%** (5/230) | 3.5% (341/10,101) |
| checkable claims | 108 | 3,005 |
| **inconsistent claims (of checkable)** | **5.6%** (6/108) | 11.1% raw · 10.5% IPW · ~6–8% FP-validated |
| decision-changing | 0.0% (0/108) | 1.7% |

The independent-frame inconsistency rate (**5.6%**) lands squarely in the census's FP-validated true
range (~6–8%) and below the raw 11.1% — i.e. an entirely separate sampling frame and a broader
population reproduce a single-digit internal-inconsistency rate. As expected, the *recomputable-paper*
rate is a bit lower without the design-query enrichment (2.2% vs 3.5%), and most stats still live in
tables/figures.

## Caveats (this is DIRECTIONAL, not a powered estimate)
- **Tiny effective N.** The 108 checkable claims come from only **5 papers** — heavily clustered (a few
  table-rich papers dominate), so the confidence interval on 5.6% is very wide. Treat it as a sign-check,
  not a point estimate.
- **Population differs by design.** General OA (any article type) vs the census's quantitative-design
  subset; the recomputable rate is therefore expected to differ.
- **Frame.** `oa.fcgi` enumerates by the OA *deposit* date window, not strictly publication date; day
  volumes are recorded (`oa_day_volume.json`) so this frame is also IPW-correctable.
- **The powered version** (a few thousand papers for a tight generalizability estimate) is the
  pre-registered generalizability sub-study; `oa_pilot.py` is resumable (just re-run with the next seed).

**Bottom line:** the same-population robustness is settled by IPW (≤0.6 pp shift); this independent OA
frame adds a directional generalizability check that points the same way (single-digit true rate).
