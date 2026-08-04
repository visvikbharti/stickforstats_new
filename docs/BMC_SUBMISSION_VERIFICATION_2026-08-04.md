# BMC Bioinformatics submission — independent verification ledger

**Date:** 2026-08-04
**Manuscript audited:** `paper/bmc_bioinformatics/manuscript.md` (identical on `main`, on
`docs/plos-compbio-submission`, and in the working tree — verified by `git diff`; there is exactly one
canonical BMC manuscript file)
**Target:** *BMC Bioinformatics*, **Software** article type

---

## Why this document exists

Every number below was **re-executed from raw data or read out of the shipping code**. Nothing was
accepted because a previous handoff document, memo, commit message, `*_results.json`, or code comment in
this repository asserted it. That rule exists because this project has a documented history of a
plausible inference being written down once and then re-cited as established fact.

**Status vocabulary used throughout:**

| Status | Meaning |
|---|---|
| `VERIFIED` | Recomputed from the raw artifact; matches the manuscript to the digits printed |
| `MISMATCH` | Recomputed and **does not** match |
| `MISLEADING` | Number is arithmetically right but the sentence around it claims something the artifact does not support |
| `UNVERIFIABLE` | Cannot be checked from what ships in the repo — a reproducibility gap in its own right |

---

## SUBMISSION STATUS — updated 2026-08-04, end of session

### Done and verified

| Item | Status |
|---|---|
| `log2_fold_change` bug | **FIXED** (`input_scale` now required; one rule, one place). 10 new tests, mutation-checked (5/10 failed with the bug reinstated). Backend suite **1,352 OK** |
| Case Study 4 | **RE-RUN.** All counts identical; fold changes corrected. Service agrees with clean-room to 8.9e-15 |
| Case Study 4 numbers in the manuscript | **CORRECTED** — +0.97, +0.94, 0.54/3%, 0.61/11%, 89.60% rank-test share |
| Fig 6 (was Fig 5) | **REGENERATED** from corrected data, 511 dpi; "Guardian rejected" label removed; occluded annotation and epsilon-era axis ranges fixed |
| Stale Phase D artifacts | **REGENERATED** (they were two bug-fixes behind the code) |
| BMC section structure | **CONVERTED.** Abstract → Background → Implementation → Results → Discussion → Conclusions → Availability and requirements → List of abbreviations → Declarations → References → Additional files |
| `Declarations` block | **ADDED** with all seven subsections in BMC's order, including the required **Availability of data and materials** |
| `Conclusions`, `List of abbreviations` | **WRITTEN** (both were absent) |
| PLOS residue | **REMOVED** — Author summary deleted, `S1 Text` → `Additional file 1`, `figures_plos/` → `figures/`, duplicate "Figure legends" section deleted (fuller wording kept inline) |
| Figure numbering | **RENUMBERED** to first-mention order (old 1,2,7,3,4,5,8,6 → new 1–8), files renamed on disk. Fig. 8 was then **dropped** as a duplicate of Tables 3 and 4, leaving **1–7**; all 7 paths resolve |
| `Fig N` → `Fig. N` | **DONE** (21 sites) |
| Author-affiliation superscripts | **FIXED** — were unpaired, rendering literally as `^1*` |
| Reference 5 | **CORRECTED** to the real 1987;55(3):171-174 record; the ">15%" claim replaced with the paper's own measured 0.100 |
| Tomczak & Tomczak | **ADDED** as ref 41 (was a dangling in-text citation) |
| Ref 40 page range | **CORRECTED** 57-61 → 92-96 |
| Test/CI/version claims | **CORRECTED** — 1,342/1,031 tests, 51 validator tests, eleven CI jobs, Recharts 3.2, R 4.4.1, lint ratchet disclosed |
| "all methods control the FDR" | **QUALIFIED** with the DESeq2 0.062 exceedance |
| Example-datasets cross-reference | **CORRECTED** — five datasets, **four** vignettes, none for dose-response |
| **Submittable `.docx`** | **BUILT** — `paper/bmc_bioinformatics/manuscript.docx` via `paper/build_bmc_docx.sh`: **7** figures embedded, 8 tables, continuous line numbers, double spacing (the script derives both counts from the manuscript, so the Fig. 8 drop is reflected automatically). The stale PLOS-era PDF render was **deleted rather than archived** — the tag is what Zenodo archives and the manuscript cites, and a 2.3 MB PDF of superseded statistics inside a citable artifact is a hazard, not a safeguard |
| Verification | **3 full passes, all clean** — section order, Declarations order, abstract 323 w / no refs, 8 keywords, figure order 1–8, no caption before its mention, all image paths resolve, 41 citations ↔ 41 entries, no stale numbers, all carets paired |

### Second remediation pass — closed later the same day

| Blocker | Status |
|---|---|
| **#11 Guardian-evaluation trio unsourced** | **CLOSED.** `paper/replication/guardian_validator_evidence.py` (seed 20260804) now emits every value. The published 0.886 / 8.92 / 45% were **not reproducible at any defensible design and were not chased by seed-tuning**; the paragraph now reports what the code returns — W = 0.8130, Levene F = 7.9495, R² improvement 0.894 — each with its severity, confidence score, and a 10-seed range. I re-ran the script myself and confirmed all three point values and all three ranges (W 0.768–0.891, F 7.95–18.19, R² 0.816–0.914) |
| "exact SciPy agreement" | **CUT.** The normality and variance validators delegate to SciPy, so agreement is an identity by construction. The paragraph now says so rather than presenting it as a validation result |
| Edge-case claims | **CORRECTED and now honest about three limits**: empty input raises, 10³⁰⁸ emits overflow warnings, and — the one that would have embarrassed the paper — **a NaN p-value is recorded as a satisfied assumption**, so 50 identical values currently receive `confidence_score = 1.0` and `can_proceed = True`. n = 10⁶ verified at 3.59–3.67 s |
| **#15 Table 4's "Exact (N digits)"** | **CLOSED.** `paper/replication/reference_agreement.py` posts fixed datasets to the **production endpoints** and measures agreement in float64 ULP. Table 4 rebuilt: every cell measured. Two audit claims **corrected** — Spearman and chi-square are *not* SciPy passthroughs; their statistics are computed in-house in Decimal. Shapiro-Wilk *is* a passthrough and now says so instead of quoting "10 digits" |
| Linear-regression row | **Now a stronger claim, properly adjudicated.** 440 ULP from statsmodels — but against the **exact rational OLS solution** StickForStats is correct to **47.1 significant digits** and statsmodels to **13.1**. I verified this myself |
| Table 4 vs Methods contradiction | **RESOLVED** in Methods' favour: pooled log OR agrees with `metafor::rma(method="DL")` to **13 decimal places**, heterogeneity statistics to ≥ 11. Both the old "3 decimal places" and the vague "four-plus" are gone |
| **#3 Fig. 4 "regex + LLM hybrid"** | **CLOSED.** Regenerated: box 2 now reads "deterministic regex pattern library", box 4 says **seven** validators, the side panel lists each once, the invented tool names are gone, no text overflows a border, 320 dpi at 170 mm. I viewed the image to confirm |
| Fig. 7 (calibration) presentation | **CLOSED.** Legend moved out of the axes so the S2 bar at **0.100** is fully visible; the 130-word baked-in prose note replaced by a proper key; **463.8 dpi** (was 293, the only figure under BMC's minimum); fonts raised to ≥ 7 pt at print width. All 18 panel-A bars re-measured against the JSON, agreeing to ≤ 0.0003 — **no plotted value changed** |
| Fig. 8 (platform comparison) | **DROPPED**, on the recommendation and my agreement: it was a graphical restatement of Tables 3 and 4 that contradicted 3 of Table 4's rows and mismatched Table 3's row set. The paper now has **seven** figures, first-mention order 1–7 |
| **#9 Additional file 1 did not exist** | **WRITTEN** — `paper/bmc_bioinformatics/additional_file_1.md` (34 KB) with S1.1–S1.5, every number emitted by `paper/replication/additional_file_1_evidence.py`, and the validator mapping derived from the code rather than from Table 1 |
| Fig. 3's four "N/A" fields | **FIXED, and it was not a display bug.** The endpoint never returned a confidence interval or Cohen's d. Both are now computed **server-side**, reusing the verified high-precision Student-t quantile from the power module and the existing `EffectSizeCalculator` — not recomputed, and deliberately not in the browser. Verified against SciPy: CI to **3.6e-15**, Cohen's d **exactly**. 6 new tests, mutation-checked. Suite now **1,358 passing** |
| Fig. 3's two worst defects | **ALREADY FIXED IN CODE** — I confirmed the current backend returns `equal_variance.is_met = True` at p = 0.7907 (so the panel renders "Met"), and its 50-digit t-statistic now agrees with the exact value to **all 50 digits**. Fig. 3 needs only re-shooting from the current build |
| **#7 Abstract's Hoekstra premise** | **CLOSED with better sources.** Verified from the papers themselves: Hoekstra observed **30 psychology PhD students on fictitious data**, with rates of 12% and **23%**. Replaced with two genuinely biomedical surveys — Jafari & Azuaje (293 gene-expression papers, **3.5%** stated the variance assumption) and Jones et al. (95 health papers, **none** checked all four regression assumptions) |
| Table 3 unfair to jamovi/JASP | **REWRITTEN.** Verified that jamovi *does* ship an Assumption Checks panel and JASP has had R Syntax Mode since 0.17. The table no longer marks them "--"; it draws the narrow, defensible distinction — **all four tools have the checks; only StickForStats runs them by default**. Versions corrected to the current releases (jamovi **2.7.30**, JASP **0.98.1**, via the GitHub release API) |
| Reference list not in Vancouver order | **FIXED** — a pre-existing defect, not from the restructure. All **43** references renumbered into first-appearance order, verified by 10 semantic spot-checks that each number still points at the right paper |
| **#6 verifier section from a superseded engine** | **CLOSED.** Re-derived at the current engine and **verified by my own run**: `1104 claims / 459 with a statistic / 353 recomputable → 320 consistent (90.7%), 29 discrepancy + 4 gross = 33 flagged`, replacing 980/468/295 → 276 (93.6%) / 19 |
| Table 7 taxonomy | **REBUILT** on the new 33-flag set, each flag read back against its source article: 11 sphericity + 7 multiplicity-adjusted + 2 mixed-effects REML + 2 bound-printed-as-point + 4 printed-precision near-miss + 7 genuine = **33** (arithmetic verified, and the 29 + 4 severity partition also sums to 33) |
| The sample-size-critical-value limitation | **DELETED** — the `Z = 1.96` false positive is no longer demonstrable at the released engine; the extractor fix removed it. Replaced with the mixed-effects (REML) limitation, which is |
| **#11c "5 vs 2 decision errors"** | **RETRACTED, and this is the most consequential honesty fix in the section.** Under the same taxonomy applied to our own flags it becomes **4 vs 2, and none of the four is a confirmed conclusion-altering error** — including the one the first audit called "the one unambiguous case" (`F(1,16) = 8.66, p = 0.20`), which turns out to be a multiplicity-adjusted post-hoc p. The paper's claimed advantage over statcheck on this metric **does not exist**, and the section now says so |
| **#11d Table 8 not a fair comparison** | **FIXED.** statcheck's 47 flags are now **adjudicated with the same six-class taxonomy** (11 sphericity + 7 multiplicity + 3 bound-style + 3 printed-precision + …), which closes the asymmetry. Row 1 split so the two coverage constructs are no longer fused; both denominators printed; the words "precision" and "recall" removed; and the genuinely comparable quantity added — **flag-set overlap: 27 flagged by both, 6 by us only, 20 by statcheck only** |
| The "p > 0.001" mechanism | **CORRECTED** from "because the significance decision is unchanged" to the real cause: a flat ±0.005 tolerance in the inequality branch, which makes any `p > x` claim with x ≤ 0.005 unflaggable **regardless of the decision** |
| **#10 Tables 7–8 not reproducible** | **CLOSED and verified.** `fetch_corpus.py` now efetches the manifest's 20 **pinned PMCIDs** — no `esearch`, no dependence on a growing index. I ran `--verify-only`: **20 of 20 match, 0 differ, 0 missing** |
| **#10 S1.5 performance numbers** | **CLOSED, and the truth is more nuanced than either the old claim or the audit.** The benchmark now draws fresh data per request (**0 cache hits across 1,700 measured requests**, asserted), interleaves conditions on identical data, and fails loudly on non-200. Measured: the **in-endpoint assumption check costs 1.0–2.4 ms** — so the spirit of "cheap" was right — but **"all latencies below 10 ms at p99" is badly false** (p99 spans 2.79–479 ms), the **standalone `/api/guardian/check/` call costs ~356 ms median**, and the optional R-based result validation adds **+108 ms**. The manuscript and Additional file 1 now state all of this |
| Benchmark's broken regression row | **FIXED** — `type: "linear"` was rejected; `multiple_linear` returns 200. Non-200 now raises instead of silently shrinking n |
| **#4 all three confidence scores** | **CLOSED.** `W_max` is now defined as the code defines it (`3.0 × |V|`, over violations *raised*, not validators run), the four attainable anchors are stated (1.0 / 0.722 / 0.444 / 0.167), and the score is described as an ordinal display summary that **gates nothing** — quoting the implementation's own docstring. Case Studies 1 and 2 now report the executed **0.444**; Case Study 3 states plainly that the meta-analysis path is not a Guardian test type, so no score is produced |
| Case Study 1's phantom sample-size warning | **DELETED** — ANOVA never invokes `SampleSizeValidator`, so the warning could not have been raised |
| **#5 Table 2** | **REBUILT, and it was worse than the audit found.** Now four columns including the exact condition under which each violation is graded critical, and the test the engine *actually executes*. Four targets have no executor (Yuen's trimmed t, Welch's ANOVA, robust SE, GLS) and say so in footnotes; t-test + Variance ends at **Mann-Whitney, not Welch**, because `cascade_engine.py:76` maps `"welch_t" → "t_test"`; t-test + Normality **does not re-route at all** unless the violation is critical, which needs p < α/10 *and* min n < 30 |
| **"runs the validators in parallel"** | **FALSE, and removed** from the Results prose, the Fig. 2 legend **and the Fig. 2 PNG itself**. I verified: zero hits for ThreadPool / asyncio / concurrent.futures / threading / joblib anywhere in `core/guardian/`, and the validators run in a plain `for req in requirements:` loop (`guardian_core.py:511`). The same false claim was in Fig. 4 and is removed there too |
| **Fig. 2's PNG contained "Score ≥ 0.7?"** | **REGENERATED.** The decision diamond now reads "Any critical violation?" with the branches correctly inverted, step 2 no longer claims parallelism, and step 3 is labelled "Report Confidence Score (**not a gate**)". I viewed the result |
| **#9 Case Study 3's "attenuates substantially"** | **CORRECTED with executed numbers.** Dropping the four smallest trials moves OR only 0.483 → 0.526 (they carry 12.6% of the weight), and under two other readings of "smallest" the effect gets *stronger* (OR 0.482). The honest finding is at the other end: the four **largest** trials alone give OR 0.896, CI [0.646, 1.243], p = 0.51. All six figures re-derived by me from the shipped CSV |
| **#12 CRISPRArchitect 404** | **RESOLVED — it is a private, unpublished repository, not a missing one.** The citation no longer points at a URL a reviewer cannot open; it is restated as unpublished in-house software, with Case Study 1 stating explicitly that the tool is not publicly released and that the 40 scored strategies analysed are deposited with the article |
| **A defect neither audit found: `similar_shapes` was reported as checked but never checked** | **FIXED — was disclosed in the manuscript, now implemented and the disclosure deleted.** Mann-Whitney and Kruskal-Wallis declared a `similar_shapes` requirement that appeared in `assumptions_checked` but was **not a registered validator and had no implementing method**. Measured before the fix: normal-vs-exponential, a 100× spread difference, strong bimodality and extreme skew **all returned zero violations and confidence 1.0**. Now implemented as `SimilarShapesValidator` — two-sample Kolmogorov–Smirnov on median-centred groups, Bonferroni-corrected across pairs for k > 2. Verified by execution: the 100× spread case now returns D=0.500, p=1.0e-11, warning, confidence 0.444; bimodality D=0.500; three-group Kruskal-Wallis correctly names the offending pair. Controls hold — a pure location shift and identical distributions are **not** flagged. *The chi-square expected-frequency requirement is genuinely implemented; this corrected one of the fix streams, which had claimed otherwise.* |

### Guardian hardening — the two live defects, fixed

| Defect | Behaviour now (verified by execution) |
|---|---|
| **D4 empty input crashed with an uncaught `IndexError`** | Raises a structured `GuardianInputError` with an actionable message: *"Guardian cannot validate data: group_1 has 0 finite numeric value(s), but at least 2 are required."* No traceback, and — the point of the fix — no confident-looking report built on data that could not be validated |
| **D2 unmapped `test_type` silently passed with confidence 1.0 and zero checks** | Resolved in two directions, which is better than blanket raising. Legitimate aliases now **work**: `correlation`, `CORRELATION`, `pearson_correlation` and `spearman` all resolve to the Pearson requirements and genuinely run `['normality','linearity','outliers']`. Genuine typos now **fail loudly**: `banana`, `t_tset`, `pearson_corelation`, `''` and `None` all raise `UnknownTestTypeError`, and the message lists the valid values |

The distinction matters: the original bug was not that unknown strings were accepted, but that they produced
a *maximum-confidence report with an empty checked-list*. Both halves are now impossible — an alias runs the
real checks, and anything unrecognised stops the analysis.

### The directory reorganisation (2026-08-04)

The BMC package now lives in **`paper/bmc_bioinformatics/`** — one directory, no duplicates, `manuscript.md`
as the source and `manuscript.docx` as a build artifact. `paper/submission_package/` keeps only
venue-neutral and superseded material (bioRxiv packet, generic cover letter, venue research) behind a
redirect README, because a dozen dated documents under `docs/` cite paths inside it and those records are
deliberately left unedited. `build_bmc_docx.sh`, `render_pdfs.sh` and
`additional_file_1_evidence.py` were repointed; `render_pdfs.sh`'s output is now named
`manuscript_reading_copy.pdf` so it cannot be mistaken for the submission file. Verified after the move:
the docx rebuilds, all seven figure paths resolve from the new location, and every manuscript check passes.

### Still blocking — as first written, now largely superseded

**Read the closure tables above first.** This list is the state of play when the audit was
written. Eight of its eleven items were subsequently closed and are marked as such in those
tables; it is kept unedited-in-substance because a record that quietly rewrites itself is the
thing this whole audit exists to prevent. Struck items are closed.

1. **The v1.1.0 archived artifact.** Ten defect classes were executed *out of the published
   Zenodo zip*, and five manuscript sentences are false of it. Needs a **v1.2.0** re-cut.
   → *In progress: v1.2.0 is being tagged. The Zenodo **version** DOI cannot be known until
   the release is created, so it is the one value still outstanding.*
2. **Fig 3 (was Fig 7) is a screenshot of a broken build** showing "Equal Variance: Violated"
   above p = 0.7907. → **STILL OPEN.** It must be re-shot from the current build; a screenshot
   cannot be regenerated by a script.
3. ~~Fig 4 has "regex + LLM hybrid" baked into the PNG~~ → **CLOSED.** Regenerated.
4. ~~The three Guardian confidence scores (0.72 / 0.58 / 0.42) do not reproduce~~ →
   **CLOSED.** Corrected against the executed values; my own algebra for the formula was wrong
   first and the correction is recorded rather than silently applied.
5. ~~Table 2: 4 of 9 cascade targets have no executor~~ → **CLOSED.** Restated.
6. ~~The verifier section (Tables 7–8) is from a superseded engine~~ → **CLOSED.** Re-derived
   at the current engine and the corpus made reproducible (`fetch_corpus.py --verify-only`).
7. ~~The abstract's Hoekstra premise misreads its only source~~ → **CLOSED.** Replaced with two
   verified biomedical surveys.
8. **The 401 on stickforstats.com** → **STILL OPEN** (author action; the closed-beta gate).
   The CRISPRArchitect 404 is **CLOSED** — it is a private, unpublished repository, and the
   citation now says so.
9. ~~Additional file 1 does not exist~~ → **CLOSED.** Written; `paper/bmc_bioinformatics/additional_file_1.md`.
10. ~~S1.5 performance numbers are cache artifacts~~ → **CLOSED.** `benchmark_api.py` fixed and
    re-run; the real figures are ~1.0–2.4 ms in-endpoint, not 0.2 ms.
11. ~~The Guardian-evaluation trio (W = 0.886, F = 8.92, 45%) has no reproducible source~~ →
    **CLOSED.** Re-derived or removed.

**What genuinely remains before upload**, none of which is a code change:

| # | Item | Why it needs you |
|---|---|---|
| 1 | The Zenodo **version** DOI for v1.2.0 | Minted by Zenodo when you create the GitHub release. `build_bmc_docx.sh` refuses to build while the placeholder is present, so it cannot be forgotten |
| 2 | Re-shoot **Fig. 3** from the current build | A screenshot; no script can regenerate it |
| 3 | The **401** on stickforstats.com | Reviewers need anonymous access, or the credentials in the cover letter |
| 4 | Three blank **reviewer emails** | Author knowledge |
| 5 | Cover-letter date and the **APC** paragraph | India tier = 25%, ~£572 — confirm before stating it |
| 6 | Case Study 4 **Group A/B framing** | An interpretive choice now that the separation is 1.13x, not 2.36x |

---

## The verdict

**Do not submit yet.** The paper is not far from submittable, and its foundations are much better than a
one-year-old project has any right to expect — but there are defects that would be found by a competent
reviewer and that change what the paper claims.

The single most important thing to understand: **almost every number in this manuscript was genuinely
executed.** Nothing was invented from thin air. The failures are of a different and more insidious kind:

1. **Numbers taken from the right script but the wrong block of its output** (Case Study 2: three values belong to the combined red+white set, not the 1,599 red wines).
2. **Numbers computed by a formula that does not compute what its name says** (Case Study 4: every `|log2FC|` is `log2` of a ratio of log-scale means).
3. **Numbers that were true of the software on the day they were run, and are no longer true of the released version** (the verifier corpus: correct at commit `d41ee20`, superseded by `v1.1.0`).
4. **Prose describing behaviour the code does not have** (Guardian "detects ordinality"; "CRITICAL" where the code emits `warning`; "PASS on linearity" where the code returns `critical`).

That is the anatomy of the failure mode you were worried about, and it is worth naming precisely: **a number
being executed is not the same as a number being *right*.** Every one of these would pass a "did we run it?"
check. None survives "did we run *the thing we say we ran*?"

### Ranked by what a reviewer would do with it

**Tier 1 — changes a scientific claim, or shows the software doing the wrong thing. Must be fixed.**

| # | Issue | Where |
|---|---|---|
| 1 | **Fig 7 shows Guardian declaring "Equal Variance: Violated" above "p = 0.7907".** The verdict is inverted; it is a screenshot of a since-fixed broken build, and the legend endorses it as intended behaviour. Its "50-decimal" statistic is also wrong past digit 16, and four result fields read N/A | Ch. 13a |
| 2 | Every `\|log2FC\|` in Case Study 4 and Fig 5 is not a fold change. Group A vs Group B separation collapses from 2.3× to 1.1×, dissolving the "two qualitatively different groups" narrative | Ch. 9c |
| 3 | **Table 2 is substantially fictional**: 4 of 9 cascade targets have no executor, and 2 more resolve to a different test than printed. Table 1 disagrees with the code in 3 of 5 rows | Ch. 6 |
| 4 | **All three reported Guardian confidence scores fail to reproduce** (0.72 → 0.444, 0.58 → 0.444, 0.42 → not a Guardian path), because the manuscript never defines `W_max` and the code counts *violations*, not validators. Case Study 1 also reports a sample-size warning the code never raises for ANOVA | Ch. 1, Ch. 4 |
| 4b | Three Case Study 2 values are from the combined 6,497-wine set, not the 1,599 red wines; and Guardian's reported severities and verdicts contradict the shipped code | Ch. 2 |
| 5 | The verifier section's every aggregate is from a superseded engine; at v1.1.0 it is 90.7% / 33 flags / 4 decision errors, not 93.6% / 19 / 5 | Ch. 11a |
| 6 | **Reference 5 does not exist**, and the ">15% Type I inflation" claim resting on it is contradicted by the paper's own Fig 8 (which measures 0.100) | Ch. 12a–b |
| 7 | **The abstract's motivating premise misreads its only source.** Hoekstra et al. observed 30 psychology PhD students on fictitious data, not "published biomedical studies"; one of its two rates is 23%, above the claimed "fewer than 20%" | Ch. 12c |
| 8 | **Fig 3 has "regex + LLM hybrid" baked into the PNG**, contradicting the manuscript's thrice-stated "no language model is used in extraction" — and a generative LLM *is* an undisclosed runtime component | Ch. 13b, AI section |
| 9 | The confidence score is a 4-valued statistic presented as continuous; its published bands are unreachable; the routing rule is stated four incompatible ways and **Case Study 4 contradicts Fig 2's version** | Ch. 4, Ch. 6 |
| 10 | **S1.5's 0.2 ms Guardian overhead is a cache artifact** — the real figure is ~109 ms end-to-end (Guardian itself ~4.8 ms), a ~550× error | Ch. 6 |
| 11 | "5 vs 2 decision errors" reverses the real quality picture — 4 of our 5 are not conclusion-altering, and statcheck catches the one that is | Ch. 11c |
| 12 | The Guardian-evaluation numbers (W = 0.886, F = 8.92, 45%) have **no reproducible source anywhere** and no stated n or seed; W on exponential data ranges 0.501–0.961 across seeds | Ch. 6 |
| 13 | Naive baseline is equal-variance Student's t, not Welch; and 90.6% did not cascade "to a rank-based test" — 89.60% did, with 257 genes going to Welch | Ch. 9a–b |
| 14 | **"Correct handling of empty arrays" is false** — Guardian raises an uncaught `IndexError`. A two-second reviewer refutation | Ch. 6 |
| 15 | Table 4's "Exact (N digits)" column is unsourced and conceptually unsound; three of its rows are SciPy passthroughs whose "agreement" is tautological | Ch. 6 |
| 16 | "re-pooling without the smallest 25% attenuates substantially" — it moves OR 0.483 → 0.526, and under two other readings the effect gets *stronger* | Ch. 3 |

**Tier 2 — a reviewer cannot check the work.**

| # | Issue | Where |
|---|---|---|
| 17 | Tables 7–8 are not reproducible by anyone: the corpus is gitignored and `fetch_corpus.py` cannot re-derive it | Ch. 11b |
| 18 | `https://stickforstats.com` returns **HTTP 401**; BMC requires the software be testable by reviewers *anonymously* | Ch. 5c, 7b |
| 19 | `github.com/visvikbharti/CRISPRArchitect` returns **HTTP 404**, with no public artifact anywhere — reference [31] and Case Study 1's sole data provenance | Ch. 7c, 12d |
| 20 | The designated archived artifact (Zenodo v1.1.0) predates 104 commits of statistical-correctness fixes — **and demonstrably yields different numbers** | Ch. 7a |
| 21 | **The S1 Text / Additional file 1 document does not exist.** There is nothing to upload | Ch. 7 |

**Tier 3 — mechanical, will fail the portal's technical check.**

| # | Issue | Where |
|---|---|---|
| 22 | **The only manuscript artifact is a PDF. BMC requires Word or LaTeX+zip**, with double spacing and line numbers, none of which the current 22-page Chrome-printed PDF has | Ch. 5a |
| 23 | Body is still PLOS-structured: no Background/Implementation/Conclusions/List of abbreviations/`Declarations` heading, no `Availability of data and materials`, plus a PLOS-only "Author summary" | Ch. 5b |
| 24 | **Figures are not in first-mention order** (1,2,3,4,5,8,6,7) and must be uploaded separately, not embedded | Ch. 13d |
| 25 | **Every figure legend is printed twice, in two substantively different versions**; Fig 1's caption is missing from the PDF entirely | Ch. 13 |
| 26 | Text in six figures prints at 3.7–5 pt at BMC's page width; Fig 8 is 293 ppi, under the 300 minimum | Ch. 13 |
| 27 | Three of six suggested reviewers have no email; BMC rejects submissions with unverifiable reviewer details | Ch. 5 |
| 28 | Reference style: seven "et al." entries violate BMC Vancouver (four may not use it at all); all 40 titles need sentence case; nine are truncated mid-title | Ch. 12 |

**Tier 4 — accuracy fixes that cost minutes each.** Test counts (1,342 not 860; 1,031 not 654), 51 not 46
validator tests, 11 not 8 CI jobs, "Zero lint errors" against a 1,064-warning ratchet, Recharts 2.8 vs
3.2.1, R 4.3.2 vs 4.4.1, "SciPy ≥ 1.11" vs the pinned 1.10.1, the abstract's 90.6% (it is 90.5%), Table 4
vs Fig 6A, Table 3 vs Fig 6B, the undefined "BLOCKED" state, Tomczak & Tomczak's missing reference entry,
the "§4" pointer into Chen et al., Table 3's unfair jamovi/JASP cells, DESeq2/edgeR uncited, and the pandoc
`^…^` superscripts.

### What is solid — do not let a cleanup pass break these

- **Case Study 1's statistics reproduce exactly** — every value in Table 5 plus the ANOVA, Shapiro, Kruskal-Wallis and η²_H. Table 5's SDs must stay `ddof=1`. *(Its Guardian paragraph does not reproduce — see Tier 1 item 4.)*
- **Case Study 3's statistics all reproduce**, and its data provenance is genuine — the seed-search episode was correctly retired and documented, and the shipped log-ORs regenerate from the real event counts.
- **Case Study 4's provenance is the strongest in the paper**: the counts file is byte-identical to live GEO, the sample assignment rebuilds from the GEO series matrix with zero disagreements, and every *count* (27,221 / 24,391 / 2,394 / 24,648 / 1,411 / 553 / 479 / 74 / 932) and every *q-value* is exact.
- **The Chen et al. quotation is word-for-word correct** and reference [34]'s every field matches PubMed.
- **The statcheck half of the head-to-head reproduces perfectly** (266 / 47 / 2, and both the 34 and the 16).
- **Exactly 45 SQS rules across 6 categories; exactly 7 manuscript validators matching the named list; 22 integration + 16 middleware + 12 math tests.**
- Zenodo, the MIT licence, `CITATION.cff`, the ORCIDs, the corresponding-author email and the 110025 postcode all check out; `main` is fully pushed and the `v1.1.0` tag is on origin.

### Ordered remediation plan

The order matters — several steps invalidate later ones if done out of sequence.

**Phase A — fix the code, because two results depend on it.**
1. Fix `log2_fold_change` (D1) to use the difference of means on log-scale input. Re-run Case Study 4. Regenerate Fig 5. **Re-examine whether the Group A / Group B narrative still holds** — at 0.54 vs 0.61 it probably needs rewriting rather than renumbering.
2. Fix D2 (unmapped `test_type` must raise), D3 (`welch_t` → `t_test` mapping), D4 (empty-array crash). Add regression tests for each — and mutation-check them.
3. Decide what Table 2 should say: either implement the four missing cascade targets or restate the table as what the engine actually does.
4. Fix `benchmark_api.py` (D9): randomise payloads, separate the `guardian` and `validate_results` flags, fail loudly on non-200, and re-run. Restate S1.5 with the real ~4.8 ms Guardian overhead.

**Phase B — re-derive the results that are stale or wrong.**
5. Re-run `validate_corpus` against the release you will actually cite, re-adjudicate the new flag set, and rewrite Tables 7–8 and the Limitations text to match. Rewrite the "5 vs 2" sentence.
6. Pin `fetch_corpus.py` to the manifest's PMCIDs (D11) so Tables 7–8 become reproducible.
7. Re-shoot Fig 7 from the production screen on the fixed build. Regenerate Fig 3 (seven validators, no "LLM hybrid"). Reconcile Fig 6A with Table 4 — or drop Fig 6.
8. Fix Fig 8's occluded legend, remove its baked-in note panel, and submit the existing vector PDF.
9. Rewrite Case Study 2's Guardian paragraph from executed output, using red-only values throughout.
10. Fix the Case Study 3 sensitivity sentence and the Case Study 4 "Welch"/"rank-based" wording.

**Phase C — cut and archive the version you are actually describing.**
11. Tag and release **v1.2.0**, deposit to Zenodo, and update the version sentence, both DOIs, `CITATION.cff` and the cover letter. Re-verify that the numbers in the paper reproduce **at that tag**.

**Phase D — fix the citations.**
12. Correct reference 5 (or remove it) and replace the ">15%" claim with the paper's own Fig 8 S2 result.
13. Rewrite the abstract's opening premise to say what Hoekstra actually measured.
14. Add Tomczak & Tomczak to the reference list; add DESeq2, edgeR and the five uncited multiple-testing methods; fix ref 40's pages and ref 22 (Tukey, not Grubbs); expand the "et al." entries; convert titles to sentence case; add dataset citations with DOIs for GSE271517, UCI Wine Quality and Zenodo.
15. Correct Table 3's jamovi/JASP cells and update both version numbers.

**Phase E — restructure for BMC and build a submittable file.**
16. Delete "Author summary". Rename Introduction → **Background**; Materials and methods → **Implementation**, moved to sit before Results. Add a **Conclusions** section. Move "Availability and requirements" to a body section after it. Add **List of abbreviations**. Add a **Declarations** heading with, in order: Ethics approval and consent to participate, Consent for publication, **Availability of data and materials** (new — write it), Competing interests, Funding, Authors' contributions, Acknowledgements. Move the AI paragraph into Implementation and **extend it to disclose the runtime LLM**.
17. Renumber figures into first-mention order; delete the eight inline captions and keep one legend set; global `Fig N` → `Fig. N`.
18. Rename `Supporting information` → `Additional files`, and **actually write the Additional file 1 document**, which does not currently exist.
19. Build a **.docx or LaTeX** manuscript with double spacing, continuous line numbers and page numbers. Upload figures separately as vector PDFs. Attach a source archive as an Additional file.
20. Delete the `figures_plos` symlink; de-hardcode `render_pdfs.sh` and add its figure-count assertion.

**Phase F — access and submission mechanics.**
21. Resolve the 401: open a public demo, or print shared reviewer credentials, and correct the availability statement and "restrictions: None".
22. Publish CRISPRArchitect or restate Case Study 1's provenance honestly.
23. Fill in the three missing reviewer emails from institutional pages. Re-date the cover letter, fix its "10–16 decimal places" and bioRxiv-v2 sentences, and correct the APC paragraph for India's 25% tier.

### Honest scale of the remaining work

This is not a typo pass. Tier 1 items 1 and 5 require **re-deriving results and regenerating a figure**, and
item 1 requires **fixing a production bug first**. Tier 3 item 14 requires **building a Word or LaTeX
manuscript that does not currently exist**. A realistic sequence is: fix the `log2_fold_change` bug and
re-run Case Study 4 → re-derive the verifier section against a pinned engine version → cut and archive a
`v1.2.0` → rewrite Case Study 2's Guardian paragraph from executed output → restructure to BMC sections and
build the `.docx` → open or credential the demo instance.

---

## Checkpoint 0 — Verification method (so this can be repeated)

```bash
# Python: MUST use .venv-django (bare python/pytest fail — Django settings unconfigured)
.venv-django/bin/python            # 3.11.11
# Installed: numpy 2.4.6, scipy 1.17.1, statsmodels 0.14.6, pandas 2.3.3, pingouin 0.5.5
# NOTE: these are FAR newer than the versions the manuscript claims (NumPy 1.25 / SciPy 1.11).
#       See Checkpoint 8.

# Backend suite as CI runs it (NOT pytest — pytest's failures are pre-existing and CI-invisible)
cd backend && DJANGO_SETTINGS_MODULE=stickforstats.settings ../.venv-django/bin/python manage.py test

# Frontend suite as CI runs it (bare `npx jest` fails — no babel)
cd frontend && CI=true npx react-scripts test --watchAll=false
```

Scratch scripts used for the independent recomputations in Checkpoints 1–3 are in the session
scratchpad, and each is small enough to re-derive from the numbers quoted here.

---

## Checkpoint 1 — Case Study 1 (CRISPR TOPSIS): **every statistic reproduces; the Guardian paragraph does not**

Recomputed independently from `paper/replication/data/crispr_topsis_scores.json` (40 records = 10 genes ×
4 modalities), with scipy, without running the project's own script first.

| Claim | Manuscript | Recomputed | Status |
|---|---|---|---|
| Genes (10, named) | HBB, LMNA, COL7A1, CFTR, DMD, PCSK9, SCN1A, PAH, NF1, TP53 | exactly those 10 | `VERIFIED` |
| ABE mean / SD / min / max | 0.587 / 0.024 / 0.561 / 0.615 | 0.5869 / 0.0238 (ddof=1) / 0.5612 / 0.6153 | `VERIFIED` |
| PE | 0.433 / 0.011 / 0.415 / 0.449 | 0.4330 / 0.0112 / 0.4151 / 0.4487 | `VERIFIED` |
| HDR (ssODN) | 0.283 / 0.019 / 0.255 / 0.307 | 0.2826 / 0.0194 / 0.2545 / 0.3067 | `VERIFIED` |
| HDR (cssDNA) | 0.123 / 0.019 / 0.095 / 0.160 | 0.1232 / 0.0185 / 0.0954 / 0.1602 | `VERIFIED` |
| One-way ANOVA | F = 1122.10, p = 1.34e-35 | F = 1122.0979, p = 1.343816e-35 | `VERIFIED` |
| Shapiro-Wilk, ABE group | W = 0.793, p = 0.012 | W = 0.793142, p = 0.011966 | `VERIFIED` |
| Kruskal-Wallis | H = 36.59, p = 5.62e-08 | H = 36.5888, p = 5.621793e-08 | `VERIFIED` |
| η²_H, "unbiased form" | 0.93 | (H−k+1)/(n−k) = **0.9330** | `VERIFIED` — the cited unbiased form is the one that yields 0.93 |
| 6 pairwise Mann-Whitney, BH-adjusted | all adj. p < 0.001 | all raw p = 1.82e-04 → all BH adj = 1.827e-04 | `VERIFIED` |

Table 5's SDs are sample SDs (`ddof=1`); `ddof=0` would print 0.023 / 0.011 / 0.018 / 0.018 and break two
cells, so **do not let anyone "tidy" that to a population SD.**

### But the Guardian half of the paragraph does not reproduce

I ran the real `GuardianCore().check(data=<4 modality arrays>, test_type='anova', alpha=0.05)` myself:

```
confidence_score   : 0.444          <-- manuscript says 0.72
can_proceed        : True
assumptions_checked: ['normality', 'variance_homogeneity', 'independence', 'outliers']
violations         : 1  -> normality | severity='warning' | p=0.011965585868625466
```

| Claim | Manuscript | Executed | Status |
|---|---|---|---|
| Confidence score | **0.72 (CAUTION)** | **0.444** | `MISMATCH` |
| "a sample size WARNING (n = 10 per group)" | a second warning | **`sample_size` is not checked for ANOVA at all** — it is not in `assumptions_checked`. Only **one** violation is raised | `MISMATCH` |
| "violations were warning-level rather than critical", so Guardian executed the ANOVA | executed with a report | `can_proceed = True`, severity `warning` | `VERIFIED` |

So Case Study 1 reports **two** warnings where the code raises **one**, and a confidence score the code
cannot produce for this analysis. Under the real formula (below), 0.72 corresponds to an **all-minor**
violation set — which is not what the paragraph describes.

**This corrects the first version of this checkpoint, which called Case Study 1 "clean".** Its *statistics*
are clean — every value in the table above still stands. Its *Guardian* paragraph is not.

### Two structural observations a reviewer may raise

- **All six pairwise comparisons return U = 100.0** — complete separation of all four modalities. Every p-value therefore sits exactly at the n=10-vs-10 exact-test floor (1.082509e-05), and because all six raw p are identical, BH leaves them unchanged. The claim holds under exact, normal-approximation and continuity-corrected methods alike, so it is robust — but it would be stronger stated as "all adjusted p = 1.1e-05 (exact)" than as the vaguer "< 0.001", and the method should be named.
- **The ANOVA's significance is partly guaranteed by construction.** Three of the six TOPSIS input dimensions (safety, risk, confidence) are *constant within each modality* in the shipped JSON. An F of 1122 across modalities is therefore substantially baked into the scoring design rather than being an empirical finding about the variants. This does not invalidate the case study — the point is that Guardian flags an assumption violation regardless of effect magnitude — but the paper should not let the reader infer that F = 1122 is a discovery.

**Open item (not a numeric error):** the JSON carries **no provenance** — no CRISPRArchitect version, seed,
or timestamp — and `https://github.com/visvikbharti/CRISPRArchitect` returns **HTTP 404**. A reviewer
therefore cannot confirm these scores came from CRISPRArchitect v3. See Checkpoint 7.

*Minor, for honesty:* the six pairwise p-values are all at scipy's **normal-approximation** floor for
n = 10 vs 10 (complete separation). The exact conditional p would be 1.08e-05. Both are < 0.001, so the
claim holds, but a rank-test reviewer may ask which was used.

---

## Checkpoint 2 — Case Study 2 (Wine Quality): **BLOCKED — three numbers belong to the wrong dataset**

This is the most serious *numerical* finding, and it is a textbook instance of the failure mode this
project keeps hitting: `paper/replication/validate_wine_quality_REAL.py` prints **combined red+white**
Guardian findings a few lines away from **red-only** correlation values, and the manuscript paragraph was
assembled from both halves of that output.

| Claim | Manuscript | Recomputed (1,599 red wines) | Status |
|---|---|---|---|
| n | 1,599 red wines | 1,599 | `VERIFIED` |
| Pearson r, p | 0.476, 2.83e-91 | 0.476166, 2.831477e-91 | `VERIFIED` |
| Spearman ρ | 0.479, p < 0.001 | 0.478532, p = 2.73e-92 | `VERIFIED` |
| Shipped CSV = UCI file | same file | **byte-identical**, sha256 `4a402cf0…cf05e` | `VERIFIED` |
| **Shapiro-Wilk on quality** | **W = 0.885** | **W = 0.857590** (red-only). 0.885 is the *combined* 6,497-wine value, and from a **seed-42 5,000-row subsample** | **`MISMATCH`** |
| **Quadratic R² improvement** | **"only 1.0%"** | red-only: R² 0.226734 → 0.227955 = **0.12 pp absolute / 0.54% relative**. 1.0% is the *combined* set's **relative** figure | **`MISMATCH`** |
| **Quality scale** | **"ordinal scale 3–9"** | red wine quality = **3–8**. Quality 9 exists only in the *white* wine file | **`MISMATCH`** |
| **Confidence Score** | **0.58** | Guardian actually returns **0.444**. Worse: **0.58 is mathematically unreachable** for a Pearson check — only 3 validators run, so the attainable set is {0.722, 0.630, 0.537, 0.444, 0.352, 0.259, 0.167} | **`MISMATCH`** |
| **"CRITICAL normality violation"** | CRITICAL | Guardian emits **`warning`**. `ContextualSeverityAdjuster` (`guardian_core.py:195–232`) downgrades normality critical→warning whenever min n ≥ 30 for t-test/ANOVA/Pearson. n = 1,599 | **`MISMATCH`** |
| **"a PASS on linearity"** | PASS | Guardian returns linearity **VIOLATED, severity = critical** (residual runs test, p = 6.4e-10). Only the R²-improvement sub-criterion passes; the critical linearity violation is what sets `can_proceed = False` | **`MISMATCH`** |
| **"quality is ordinal, not continuous normal"** — i.e. Guardian is ordinality-aware | Guardian detects ordinality | `grep -ri ordinal backend/core/guardian/` → **zero hits**. The ordinality reasoning is a **hard-coded print statement in the replication script** (lines 154–162), not a Guardian output | **`MISLEADING`** |
| Guardian recommends Spearman | Spearman's ρ | `alternative_tests = ['spearman','kendall','distance_correlation']` | `VERIFIED` — the recommendation is real; only the stated *reason* is wrong |

Three independent symptoms (W, 1.0%, the 3–9 range) all point at the same red/combined conflation, which
is what makes this diagnosis solid rather than a rounding quibble.

### Every one of these survived an adversarial refutation attempt

Each finding above was handed to a second agent instructed to **refute** it, defaulting to "refuted" unless
it could independently reproduce the problem. All were **CONFIRMED**, and three came back *worse* than first
reported:

- An exhaustive search for **any** defensible red-only reading of W = 0.885 found none: Shapiro on all 12 red columns and both residual vectors yields nothing rounding to 0.885 (quality 0.8576, alcohol 0.9288, total SO₂ 0.8732, residuals 0.9758 / 0.9612). White-only is 0.889. And `0.885` appears **nowhere in the repo** outside the three manuscript copies — no artifact supports it.
- W = 0.885 is **not even a stable statistic**: 10 independent 5,000-row draws from the combined set give W ∈ [0.8824, 0.8863].
- The whole **18-revision history** of `guardian_core.py` was replayed against this data. **No version ever returns 0.58** on the raw-order data (history: 0.095, 0.424, 0.338, 0.352 ×5, 0.444 ×10 including HEAD).

### Why 0.58 and "PASS on linearity" appear together — and why that is worse, not better

The adjudicator found the one configuration that *does* produce both: **shuffle the row order.**

| Row order | Linearity verdict | Confidence |
|---|---|---|
| raw CSV order | **violated / CRITICAL** (runs test p = 6.40e-10) | 0.444 |
| shuffled | **PASS** | **0.583 → prints "0.58"** |

So the manuscript's two contested Guardian outputs are jointly reproducible **only under a shuffled row
order whose seed is not recorded anywhere.** They are order-dependent artifacts, not stable results.

The root cause is a **software defect**: the linearity validator applies a Wald-Wolfowitz **runs test to the
residuals with no `observation_order` gate**. This is precisely the arrangement-dependence the manuscript
carefully carves out for the *independence* validator ("informative only when the rows are a meaningful
sequence… referred to study design"). The same reasoning applies verbatim to the linearity runs test and is
not applied. For a cross-sectional dataset like wine quality, a validator whose verdict flips on row
permutation cannot be reported as a finding about the data.

### Three live code defects found in passing (independent of the manuscript)

1. **Mismatched W/p pair.** `NormalityValidator` (`guardian_core.py:1099–1102`) returns `statistic` from `data_arrays[0]` but `p_value` as the **min across all arrays** — so Guardian reports W = 0.9288 (alcohol) paired with p = 9.5e-36 (quality). Anyone re-running Guardian and trying to match a W to its p hits a mismatched pair.
2. **Order-dependent linearity verdict** (above) — the runs test needs the same `observation_order` gate the independence validator already has.
3. **Unmapped test types silently pass with a clean bill of health.** `test_type="correlation"` and `test_type="pearson_correlation"` return `assumptions_checked = []`, **zero violations, and confidence = 1.0**. For a platform whose entire thesis is "validation is the default, not an opt-in", a plausible-looking `test_type` string that silently skips all checks and reports maximum confidence is the most damaging possible bug. A reviewer who tries `correlation` instead of `pearson` will find it in one call. **Fix: unknown test types must raise, not pass.**

---

## Checkpoint 3 — Case Study 3 (IV magnesium meta-analysis): **data genuine, statistics clean, one unsupported adjective**

**The provenance question is settled, and the answer is good.** `paper/replication/_pedagogical_seed_search/`
does contain scripts that once swept random seeds for a "pedagogically interesting" Egger p-value — but
they are explicitly **archived with a README explaining the failure mode and the correction**, and the
dataset now shipped is real: 16 named trials with the canonical event counts (Morton 1984 … ISIS-4 1995).
I regenerated `log_or` and `variance` from the raw event counts and they reproduce to **4.7e-07**
(0.5 continuity correction where a zero cell occurs, in the Bertschat 1989 row).

| Claim | Manuscript | Recomputed | Status |
|---|---|---|---|
| k | 16 trials | 16 | `VERIFIED` |
| LIMIT-2 n | 2,316 | 1159 + 1157 = 2,316 | `VERIFIED` |
| ISIS-4 n | 58,050 | 29011 + 29039 = 58,050 | `VERIFIED` |
| RE pooled OR, 95% CI | 0.483 [0.329, 0.710] | 0.4831 [0.3288, 0.7098] | `VERIFIED` |
| I² | 68.1% | 68.13% | `VERIFIED` |
| Q, df, p | 47.06, df 15, p < 0.001 | 47.0597, df 15, p = 3.60e-05 | `VERIFIED` |
| Egger intercept, t, df, p | −1.60, t = −5.78, df 14, p < 0.001 | −1.5991, t = −5.7847, df 14, p = 4.73e-05 | `VERIFIED` |
| ISIS-4 log OR | 0.06 | 0.0576 | `VERIFIED` |
| **"re-pooling without the smallest 25% of studies attenuates the effect substantially"** | substantial attenuation | Dropping the 4 smallest trials (n = 43, 48, 54, 56) moves OR **0.483 → 0.526**, CI [0.351, 0.787] — **still a ~47% mortality reduction, CI still excludes 1** | **`MISMATCH`** — an 0.04 shift in OR is not "substantial" |

The honest version of that sentence is the one the manuscript already makes next to it: the *largest*
trial (ISIS-4) shows essentially no effect. Drop the "smallest 25%" claim or replace it with the actual
numbers.

*Methods transparency:* the 0.5 continuity correction for the zero-event Bertschat arm is not stated
anywhere in the manuscript. A meta-analysis reviewer will look for it.

---

## Checkpoint 4 — Manuscript-internal arithmetic

Recomputed with a calculator, independent of any agent report.

| Check | Result |
|---|---|
| 24,648 / 27,221 | 90.5477% → **90.55%** (Results) ✓, and **90.6%** (Abstract) ✓ — consistent, just different precision |
| 932 + 479 = 1,411 (Guardian hits) | ✓ |
| 932 + 74 = 1,006 (naive hits) | ✓ |
| 479 + 74 = 553 (flipped) | ✓ |
| 276 / 295 = 93.6% ; 276 + 19 = 295 | ✓ |
| 9 + 5 + 4 + 1 = 19 (Table 7) | ✓ |
| 47 / 266 = 17.67% → 17.7% ; 19 / 295 = 6.44% → 6.4% | ✓ |
| 860 + 654 = 1,514, described as "more than 1,500" | ✓ arithmetically (but see Checkpoint 6 — the *inputs* are the problem) |
| 24,391 normality + 2,394 variance vs 24,648 cascaded | implies an overlap of 2,137 genes failing both — plausible as a union, **must be confirmed against the code** |

### The confidence-score formula does not reproduce the reported scores

**None of the three reported scores reproduces.** And the reason is that the manuscript never defines
`W_max`, so the formula as printed is not the formula in the code.

The manuscript states `C = max(0, 1 − Σw / (W_max × 1.2))` with critical = 3, warning = 2, minor = 1. A
reader naturally takes `W_max` to be the maximum over **the validators that ran**. The code
(`guardian_core.py`, `_calculate_confidence`) uses:

```python
total_penalty        = sum(SEVERITY_WEIGHTS[v.severity] for v in violations)
max_possible_penalty = len(violations) * SEVERITY_WEIGHTS["critical"]   # <-- violations, not validators
confidence           = max(0, 1 - total_penalty / (max_possible_penalty * 1.2))
```

Because the count cancels, **the score is a pure function of mean violation severity** and can only take
these values for uniform severity: **1.0** (none), **0.722** (all minor), **0.444** (all warning),
**0.167** (all critical). The function's own docstring says exactly this, and adds: *"This is an internal
heuristic, not a named statistic; calibrate any thresholds against these real values."*

| Case study | Violations the code raises | Executed C | Manuscript | Status |
|---|---|---|---|---|
| CS1 (ANOVA) | 1 × `warning` (normality) | **0.444** | 0.72 | `MISMATCH` |
| CS2 (Pearson) | `warning` + `critical` + `minor` | **0.444** | 0.58 | `MISMATCH` |
| CS3 (meta-analysis) | not a Guardian test path at all | — | 0.42 | `MISMATCH` |

**I got this wrong in the first draft of this document.** I worked `W_max` backwards as *validators × 3* and
concluded CS1's 0.72 was consistent with the published formula. It is not: running the real Guardian on the
CRISPR data returns **0.444**. The lesson is the one this whole audit is about — I reasoned from the printed
formula instead of executing the code, and the printed formula is under-specified.

Either the formula in the paper needs `W_max` defined as the code defines it (and then all three reported
scores must be replaced with executed values), or the scores are wrong. This has to be resolved before
submission, because the confidence score is the paper's central novel construct.

### Two threshold rule-sets contradict each other

- Validator-suite section: "Scores above 0.8 indicate high confidence; 0.6–0.8 signals caution; below 0.6 triggers review."
- Fig 2 legend and the Guardian section: "executing with a report (Score ≥ 0.7) or recommending a nonparametric alternative (Score < 0.7)."

These cannot both be the routing rule. CS3 additionally reports a state called **"(BLOCKED)"** that is
defined nowhere in the manuscript — the paper describes Protected Mode / Expert Mode, not BLOCKED.

### Table ↔ figure count contradictions

- Table 4 lists **10** validation rows; the Fig 6A legend says **"9 test categories"**.
- Table 3 lists **12** features; the Fig 6B legend says **"10 capabilities"**.

### One naive baseline, two names — and it resolves in the paper's favour

Case Study 4 says its naive baseline is a **per-gene Welch t-test**; the calibration section says it is "an
equal-variance **Student's** t-test applied to every gene" and calls it "the cascade's own parametric branch
with the gate switched off".

**Resolved from the code, and the good news:** there is exactly one baseline function, and it runs
`equal_var=True`. So the two sections compute **the same test**, and the Fig 8 ablation *is* the correct
comparator for Case Study 4's 1,006-gene number. The ablation framing is sound — verified against
`calibration_partA_continuous.py:209` (`equal_var=True` for `naive_student`) and against the production
service's parametric branch (`differential_expression.py:404`, also `equal_var=True`, tagged `t_test`, with
Welch a separate branch at line 408).

**The defect is purely a prose mislabel in Case Study 4**, and it must still be fixed — because as written
the two sections read as flatly contradictory, and a reviewer who notices that the benchmark ranks
always-Welch as the best-calibrated arm *everywhere* would reasonably conclude the ablation is irrelevant to
Case Study 4. That conclusion would be exactly backwards.

---

## Checkpoint 4b — Prose that outruns the evidence

A hostile close-reading of the manuscript's own claims against its own results. These are not numeric
errors; they are places where the paper asserts more than it shows, and each is the kind of sentence a
reviewer quotes back.

| Sentence | Problem |
|---|---|
| *"cascaded **90.6%** … to a rank-based test"* (Abstract) | Double-rounded: 24,648/27,221 = 90.5477%, which is **90.5%** at 1 dp. The Results' 90.55% is a correct 2-dp rounding; 90.6% is a rounding of the rounding. And only 89.60% went to a rank test |
| *"**All** computations are validated against SciPy and R"* (Abstract) | The Methods concede that G\*Power cross-validation is "planned but not yet wired" and that the power row is **omitted** from Table 4. An unqualified "all" the paper itself contradicts |
| *"Pearson r = 0.476 **corrected** to Spearman ρ = 0.479"* (Abstract) | "Corrected" implies the r was wrong. It was *inappropriate*, not wrong — and the two values differ by **0.003**. The abstract oversells a case study whose numbers barely move |
| *"**materially** changing the gene list a biologist would act on"* (Abstract) | The paper shows the list *changes*; no biologist was asked, and no downstream consequence is demonstrated. Both marker genes it highlights were significant in **both** pipelines |
| *"the safety net **changes which findings are flagged as reliable**"* (Author summary) | It shows they change; whether they become *more* reliable rests entirely on Fig 8, which is a **mixed** result the abstract and author summary do not reflect |
| *"StickForStats targets a tractable, under-served contributor to irreproducibility"* (Conclusions) | No evidence anywhere in the paper that assumption-checking contributes materially to irreproducibility. This is the central Conclusions claim |
| *"The Paper Parser enables pre-submission quality checking, **catching reporting errors** before peer review"* (Discussion) | The paper's own evidence is 19 flags of which **15 are explainable artifacts** and the remaining 4 are, in its own Limitations, "not confirmed errors". Precision on candidate errors is 4/19 ≈ 21%, yield 0.2 per article. The Discussion contradicts the Limitations |
| *"Beyond Guardian, the **AI Statistical Advisor**…"* (Discussion) | A component that appears **nowhere in the Results** — not in the architecture paragraph, not in "Additional analysis modules", not in Table 3, not in the Introduction's capability list. And it is an undisclosed runtime LLM (see below) |
| *"a 45-rule Statistical Quality Score … that scores **any** analysis or manuscript"* | Absolute quantifier |
| *"**Zero lint errors** across all codebases"* | Literally true, but omits 1,064 warnings passing under a ratchet and a non-gating `black --check \|\| true` |
| *"at time of writing **all required CI checks are green**"* | Undated and unverifiable by any reader, in a permanent record |
| Table 6's Impact column | Asserts consequences ("Unreliable ANOVA", "Inflated pooled effect") that line 226 immediately says did not occur — "the first three cases **preserved** the primary conclusion under the corrected method" |
| *"Confidence Score = 0.42 **(BLOCKED)**"* | "BLOCKED" is never defined in the manuscript, which describes Protected/Expert Mode. *(It does exist in code — `report_generator.py:244` renders `'PROCEED' if can_proceed else 'BLOCKED'` — so the term is real, just undefined for the reader.)* Case Study 3 also invokes a publication-bias validator that is **not one of the eight** |
| *"Optional validation tools, available for **over 25 years**…"* | Uncited quantitative claim |
| "Additional analysis modules" (line 115) | Survival analysis, causal inference, SmartProfiler, 15+ effect sizes, Bayesian suite and code export are all asserted with **no validation anywhere** in the paper. In a Software article this invites "these are untested claims" |

### Presentation mechanics to fix in one pass

- **Pandoc superscript markup** `^-35^`, `^-6^`, `^6^`, `^308^` (lines 174, 238, 311) may render literally.
- **Mixed ASCII/Unicode maths**: `ρ` and `I²` and `≥` and `±` appear alongside `rho`, `I-squared`, `>=`, `+/-`.
- **`-ise`/`-ize` mixing**: `operationalises` and `re-analysed`/`tumours` alongside `generalizes`, `summarizes`, `randomization`.
- **`Fig N`** (26 occurrences) → BMC's `Fig. N`.
- **Author affiliation superscripts render literally as `^1*`** on the title page of the PDF.

---

## Checkpoint 5 — Journal compliance: **the submission artifact is the wrong file type**

Verified against the live *BMC Bioinformatics* pages (the journal has migrated:
`bmcbioinformatics.biomedcentral.com` now 301-redirects to `link.springer.com/journal/12859`, which
carries the banner *"BMC journals have moved to Springer Nature Link"*) and against the actual submission
portal at `submission.springernature.com/new-submission/12859`.

### Blocker 5a — BMC will not accept a PDF as the manuscript

The portal states: *"Upload your manuscript in an editable format for peer review (maximum 2GB). This will
be either: a Word document with figures and tables placed in the body of the text where they are
referenced; LaTeX documents with figures and tables compressed into a .zip format."*

The only artifact in `paper/submission_package/` is **`manuscript_rendered.pdf`** (produced by
`render_pdfs.sh`: Markdown → HTML → Chrome headless → PDF). **There is no `.docx` and no LaTeX source for
the BMC version.** A PDF upload fails the technical check. This needs a real Word or LaTeX build with
figures and tables placed inline at their callouts.

### Blocker 5b — the body is still structured for PLOS

BMC's Software-article section order is: **Background → Implementation → Results → Discussion (if
appropriate) → Conclusions → Availability and requirements → List of abbreviations → Declarations**.

What the manuscript actually has (`grep '^## '`):

```
Abstract · Author summary · Introduction · Results · Discussion ·
Materials and methods · Acknowledgments · References ·
Supporting information · Figure legends
```

| Required | Present? |
|---|---|
| Background | ✗ — called "Introduction" |
| Implementation | ✗ — absent; the material is spread across "Platform architecture" and "Materials and methods" |
| Results | ✓ |
| Conclusions | ✗ — **absent as a body section** (only the abstract has one) |
| Availability and requirements | ✓ (content matches BMC's required field list) |
| List of abbreviations | ✗ — **absent** |
| `Declarations` parent heading | ✗ — **absent**; the sub-declarations float as `###` under Methods |
| **Availability of data and materials** | ✗ — **absent under that required title.** We have "Availability and reproducibility", which is not it |

Also PLOS-only and must go or be renamed: **"Author summary"** (187 words), **"Supporting information" /
"S1 Text"** (BMC uses **"Additional file 1"**), and the separate **"Figure legends"** section. Figures are
cited as **"Fig 1"**; BMC style is **"Fig. 1"** (26 occurrences to change). Figure paths are literally
`figures_plos/`, via a **committed symlink** `figures_plos -> figures` — which will not survive every clone
or archive extraction.

Declarations also need reordering to BMC's order: Ethics approval and consent to participate → Consent for
publication → Availability of data and materials → Competing interests → Funding → Authors' contributions →
Acknowledgements.

### Verified as already compliant

| Requirement | Status |
|---|---|
| Abstract ≤ 350 words | **319 words** ✓ |
| Abstract cites no references | ✓ (zero `[n]` markers) |
| Abstract has Background / Results / Conclusions | ✓ |
| 3–10 keywords | **8** ✓ |
| Software article type exists in the portal | ✓ (Research, Editorial, Comment, Matters Arising, Database, Review, **Software**) |
| Availability-and-requirements fields | ✓ all seven present |

### Blocker 5c — the software is not available to reviewers anonymously

BMC's Software-article criteria: *"The software application/tool described in the manuscript must be
available for testing by reviewers **in a way that preserves their anonymity**. If published, software
applications/tools must be freely available to any researcher wishing to use them for non-commercial
purposes, without restrictions."*

`https://stickforstats.com` returns:

```
HTTP/2 401
www-authenticate: Basic realm="StickForStats closed beta"
```

The manuscript lists it as the "hosted evaluation instance" and declares *"Any restrictions to use by
non-academics: **None**"*, and the cover letter says *"a hosted instance is available for evaluation at
https://stickforstats.com"* **with no credentials given**. As it stands a reviewer hits a password prompt
and must email the authors — which destroys their anonymity.

Two acceptable fixes: (a) open the instance publicly for the review period, or (b) put a **single shared
reviewer credential in the cover letter** (this preserves anonymity, since no reviewer has to contact
anyone) and reword the availability statement to say the hosted demo is a closed beta whose credentials are
supplied for review, while the software itself is MIT-licensed and self-hostable via Docker. BMC also
*"strongly recommends that all software applications/tools are included with the submitted manuscript as
additional files"* — attach a source archive as an Additional file.

### Other portal-level items

- **Transparent peer review**: BMC Bioinformatics publishes the reviewer reports alongside the article. Expect the review to be public.
- **Data citations**: BMC asks that publicly available data be cited **in the reference list with a persistent identifier**. GSE271517 and the Zenodo deposit are currently mentioned in prose only.
- **LLM disclosure placement**: BMC requires LLM use to be documented **in the Methods section** (or a suitable alternative part). Our "Use of AI-assisted technologies" section sits under Methods, which satisfies this — but it must survive the restructure into Implementation.
- **Suggested reviewers**: BMC warns that *"Intentionally falsifying information, for example, suggesting reviewers with a false name or email address, will result in rejection."* `BMC_SUGGESTED_REVIEWERS.md` leaves **three of six emails blank** (Nuijten, Konietschke, Lüdecke — "grab the current email from the linked profile page"). Those must be filled from institutional pages before submission.
- **Cover letter** is dated **8 July 2026** and needs re-dating. It also claims cross-validation *"to 10–16 decimal places"*, which overstates the manuscript's own Table 4 (the meta-analysis row is **3 decimal places**). And it says an updated bioRxiv version *"is being posted"* — per project notes the bioRxiv v2 is blocked, so that sentence may be false on the day of submission.

---

## Checkpoint 6 — Test-suite, CI and platform claims

### The suites were executed, and they pass

```
backend : Ran 1342 tests in 166.461s — OK          (exit 0, zero failures)
frontend: Test Suites 58 passed / Tests 1031 passed, 1031 total   (36.8 s, exit 0)
flake8  : 0        ruff (sdk/python): All checks passed!        eslint: 0 errors
```

So **"all required CI checks are green on the main branch" is `VERIFIED`**, and **"more than 1,500
automated tests" is true and conservative** — the real total is **2,373**. (`e2e` and `sdk-test` carry
`continue-on-error: true`, so they are not "required" checks anyway.)

But the *specific* figures are wrong in every case, always in the safe direction:

| Claim | Manuscript | Executed | Status |
|---|---|---|---|
| Backend tests | ≈860 | **1,342** (+56%) | `MISMATCH` |
| Frontend tests | 654 | **1,031** (+58%) | `MISMATCH` |
| `test_guardian_validators.py` | 46 | **51** | `MISMATCH` |
| `ci.yml` jobs | 8 | **11** (omits `beta-gate`, `e2e`, `staging-deploy` — and `beta-gate` *is* required, `docker-build` lists it in `needs`) | `MISMATCH` |

Each of the first two appears **twice** (lines 119 and 261), and the manuscript **names the exact file** for
the 46 — a one-command check for any reviewer. These are credibility fixes, not overclaims, but leaving them
wrong invites a reviewer to distrust every other number in the paper.

### Tables 1 and 2 do not match the code — and Table 2 is substantially fictional

**Table 1** (assumption requirements) disagrees in **3 of 5 rows**:

| Row | Problem |
|---|---|
| t-test | Table marks **Size**; `test_requirements['t_test']` has no `sample_size` — remove the X |
| ANOVA | **Two cells wrong in opposite directions**: the code *does* check outliers (with a justifying source comment) so Outl should be X; it does *not* check sample_size so Size should be blank |
| Chi-square | The second check is `expected_frequencies`, which is **not one of the eight validators** and has no column; filing it under "Size" conflates it with `SampleSizeValidator` |
| Pearson r, Regression | **Match the code exactly** ✓ |

**Table 2** (alternative recommendations) is worse — **4 of 9 rows are not implemented at all**, and 2 more
resolve to a different test than printed:

| Row | Reality |
|---|---|
| t-test + Outliers → Yuen's trimmed t | **Not implemented** — only a trimmed-mean CI method in `robust_estimators.py` |
| ANOVA + Variance → Welch's ANOVA | **No executor** — recommendation strings only |
| Regression + Homoscedasticity → Robust SE | **Not implemented** |
| Regression + Independence → GLS | **Not implemented** — regression instead routes to Spearman/Kendall, which **cannot return coefficients** |
| t-test + Normality → Mann-Whitney | **Does not re-route at all.** Normality is graded `warning`, so `can_proceed = True` and the t-test runs (executed and confirmed) |
| t-test + Variance → Welch's t | Ends at **Mann-Whitney U**, not Welch. **A real implementation bug**: `GUARDIAN_TEST_MAP` maps `"welch_t"` → `"t_test"` |
| ANOVA+Normality → Kruskal-Wallis; Pearson+Normality → Spearman; Pearson+Linearity → Spearman | **Match** ✓ |

Table 2 describes the AutonomousCascadeEngine — the paper's central mechanism. As printed, most of it is
aspirational. This is the finding most likely to be caught by a reviewer who installs the software.

### The confidence score has *four* incompatible rule-sets, and none of them gates anything

Because the violation count cancels between numerator and denominator, the score depends only on **mean
violation severity**: 1.0 (no violations), 0.722 (all minor), 0.444 (all warning), 0.167 (all critical) —
**independent of how many violations there are.** With ≥1 violation it can never exceed **0.722**.

So `">0.8 = high confidence"` is reachable **only at exactly 1.0**, and `"0.6–0.8 = caution"` only in
(0.6, 0.722]. Case Study 4 confirms this empirically: **27,221 genes produced exactly two distinct
non-unity values, 0.7222 and 0.4444.** `guardian_core.py`'s own docstring says so and warns *"This is an
internal heuristic, not a named statistic; calibrate any thresholds against these real values."* The
manuscript prints uncalibrated thresholds.

Meanwhile the manuscript states the routing rule three different ways (0.8/0.6 bands; Fig 2's 0.7 cut;
Case Study 1's severity-based description), and the **only thresholds that exist in code are 0.618/0.382**
in `frontend/…/GuardianWarning.jsx:220` — a fourth set.

**And none of them gate anything.** Routing is decided by violation *severity* via `can_proceed`
(`guardian_core.py:626`: `can_proceed = len(critical_violations) == 0`). Exponential data scoring 0.583
still returned `can_proceed = True` and ran the parametric t-test. Most damagingly, **Case Study 4
contradicts Fig 2's stated rule**: 24,391 genes carried confidence 0.7222 (≥ 0.7) and every one was
cascaded rather than executed — the opposite of what Fig 2 predicts.

### S1.5's performance numbers are measured on a cached path and are wrong by ~550×

`benchmark_api.py` builds **one** seeded payload per cell and re-POSTs it 110 times. The 10 warm-up requests
fill the response cache, so **all 100 measured iterations return `_cache_hit=True`.** With a unique payload
per request (`cache_hits = 0/40`):

| | Reported (cached) | Real (uncached) |
|---|---|---|
| median standard | — | 20.9 ms |
| median guardian | — | **130.0 ms** |
| **Guardian overhead** | **0.2 ms** | **109 ms** |

Decomposed: **Guardian itself costs +4.79 ms**; the `validate_results` flag that the script ties to the same
boolean costs **+115.30 ms**. So the honest Guardian overhead is ~5 ms — entirely defensible — but the
printed 0.2 ms is a cache artifact, and "all latencies below 10 ms at the 99th percentile" rests on the same
cached data. Fix the script (randomise payloads, separate the two flags), re-run, and restate both numbers.

**The script also no longer reproduces one of its own four rows:** Linear regression returns **HTTP 400** in
both modes (`{"type":["\"linear\" is not a valid choice."]}`) because the endpoint stopped accepting the
`type` value the script sends. A reviewer running the cited script gets 3 of 4 rows. Related hazard:
`_bench_one` records timings only `if status == 200`, so non-200 responses are **silently dropped** instead
of failing loudly.

### "Correct handling of empty arrays" is false

```python
GuardianCore().check(test_type='t_test', data={'group1': [], 'group2': []})
# -> uncaught IndexError at guardian_core.py:1329, in OutlierDetector.validate
#    (np.percentile on a zero-length array), reached from check() at line 520
```

No test in the repo covers empty input, which is why it went unnoticed. This is a **one-line refutation for
any reviewer** — the sentence at line 311 invites exactly this paste. Either guard `len(arr) == 0` and add a
regression test, or delete "empty arrays" from the claim.

The other edge cases hold: n = 10⁶ completes in **3.90 s** against the claimed 5 s (only 22% headroom on
fast local hardware), and 10³⁰⁸, single observations and zero-variance input all behave. But **no test in
the repo covers any of them** — they were verified ad hoc.

### The Guardian-evaluation numbers have no reproducible source anywhere

`manuscript.md:311` states Shapiro-Wilk **W = 0.886**, Levene **F = 8.92, p = 0.004**, and an R² improvement
of **45%**. `grep` confirms 0.886 and 8.92 appear **only inside the three manuscript `.md` copies** — no
script, test, or results file emits them — and **none states an n or a seed.** W on exponential data ranges
**0.501–0.961** across seeds, so W = 0.886 is uncheckable by any reader.

Compounding it: the Levene and Shapiro validators are **direct SciPy passthroughs**
(`guardian_core.py:1144` and `:1067`), so the accompanying *"exact SciPy agreement"* is **true by
construction and validates nothing.**

This is the closest thing in the paper to a number that exists only as prose. Either ship seeded scripts
under `paper/replication/` that emit these exact values with n and seed stated inline, or cut the sentence.

### Table 4's "Exact (N digits)" column is unsourced and conceptually unsound

- **No script in the repo computes any per-row digit count.** `validate_against_R.R` passes, but it asserts fixed tolerances and compares R against **hard-coded SciPy constants — never exercising StickForStats' own code.**
- "Exact" and "N digits" are contradictory, and every quoted N (10/12/14/16) sits at or below the ~15–17 digit double-precision ceiling.
- The Spearman, chi-square and Shapiro rows are **direct SciPy passthroughs**, so their "agreement" is a tautology. **"Shapiro-Wilk — Exact (10 digits)" is unexplainable** given it is bit-exact by construction.
- Table 4 says the meta-analysis agrees to **"3 decimal places"** while Methods line 303 says **"four-plus decimal places"** — the two cannot both be right.

### "98% cascaded" on log-normal data depends entirely on an unstated parameter

Running the real `DifferentialExpressionService`, the cascade rate is set by the unstated σ:
**44.6% at σ=0.5, 87.2% at 1.0, 98.1% at 1.5, 100% at 3.0.** So 98% is attainable at σ≈1.5 and the claim is
not false — but it spans 45–100% across plausible parameters. State σ and the seed and ship the script, or
replace it with the well-sourced Case Study 4 figure (90.55% on real GSE271517 data).

### Correction to something I said earlier in this document

I initially characterised **"Zero lint errors across all codebases" as false.** Executed, it is **literally
true**: flake8 returns 0, ruff is clean, and eslint exits with **0 errors**. What the sentence omits is that
eslint also reports **1,064 warnings**, which pass only because `package.json` pins `--max-warnings 1064` — a
ratchet set to exactly the current count — and that CI's `black --check` ends in `|| true`, so formatting is
non-gating. The honest phrasing is something like *"zero lint errors (warnings tracked under a
non-regression ratchet)."* Downgraded from `MISMATCH` to `MISLEADING`.

### Verified as stated

| Claim | Status |
|---|---|
| **Eight Guardian validators**, with the named list | `VERIFIED` |
| **Seven manuscript validators**, exactly matching the named list | `VERIFIED` |
| **45 SQS rules across six categories** (`ALL_RULES` = 45, `CATEGORIES` = 6, summing to 100 points) | `VERIFIED` |
| 38 Guardian tests = 22 integration + 16 middleware | `VERIFIED` |
| S1.4 frontend counts: 25 component + 30 hook | `VERIFIED` |
| Security workflow with Trivy + CodeQL | `VERIFIED` |
| Manifest V3 browser extension | `VERIFIED` |
| Confidence formula `C = max(0, 1 − Σw/(W_max × 1.2))` with weights 3.0/2.0/1.0 | `VERIFIED` — the *formula* matches the code; the *thresholds* do not |
| Python & R SDKs exist | `VERIFIED` — but the **R SDK is not on CRAN** (404) while the Python SDK is on PyPI (200). Say "available from the repository" for R |
| Table 4: t-test (independent), t-test (paired), one-way ANOVA — 14-digit agreement | `VERIFIED` (measured 14.6–15 digits) |

### My own static counts, for cross-reference

Static `grep` gives 1,425 backend `def test_` across 92 files and 922 frontend `it(`/`test(` across 58 files.
These exceed the *executed* counts (1,342 / 1,031) because not every defined test is collected by the runner
CI uses — worth knowing if anyone tries to reconcile the two.

Also note S1.4's breakdown (22 + 16 + 51 + 12 = 101 backend, 25 + 30 = 55 frontend) covers only ~8% of the
backend and ~5% of the frontend suites while being presented as "per-suite counts" — a reader could take it
for a complete accounting.

### Historical note on the lint gate

`ci.yml` documents it in a comment: the previous invocation `eslint src/` expanded to `.js` only, linted
**0 of 469 `.jsx` files**, reported 0/0 and exited 0 — so `--max-warnings 0` **passed vacuously** while
`no-use-before-define` errors sat uncaught. That is the gate the "Zero lint errors" claim was originally
written against. It is fixed now (`--ext .js,.jsx,.ts,.tsx`, 764 files).

## Checkpoint 7 — Availability, archival, and the v1.1.0 problem

All checked by me directly with `curl`, `git ls-remote` and the Zenodo API.

### What is in good order

| Item | Ground truth |
|---|---|
| GitHub repo public | `github.com/visvikbharti/stickforstats_new` → **HTTP 200** |
| `main` fully pushed | `main` == `origin/main` == `8fbada2`; `git rev-list --left-right --count` = **0 0** |
| `v1.1.0` tag on origin | present, `8d8ca8f` |
| Zenodo concept DOI | `10.5281/zenodo.21258381` → 200 |
| Zenodo version DOI | `10.5281/zenodo.21258382` → 200; record metadata reads **version `v1.1.0`**, MIT, published 2026-07-08, one file `stickforstats_new-v1.1.0.zip` (48.5 MB) |
| `CITATION.cff` | version 1.1.0, doi `10.5281/zenodo.21258381`, both ORCIDs — consistent with the manuscript |
| ORCIDs resolve | 0009-0003-1431-4457 → Vishal Bharti; 0000-0003-1460-7594 → Debojyoti Chakraborty |
| Corresponding-author email | **The manuscript is right and the other project files are stale.** `debojyoti.chakraborty@igib.in` returns **18 hits** in Europe PMC full text as this author's correspondence address. Use `igib.in`, not the `igib.res.in` that appears in older notes here |
| Affiliation postcode | **New Delhi 110025** — verified against a 2026 record with Chakraborty D as corresponding author |
| MIT `LICENSE` | present |
| Python SDK on PyPI | Installed into two throwaway venvs: `pip install stickforstats` → 0.4.0, and `pip install stickforstats[cli]` → the **`sfs` command exists**. The installed package is **byte-identical** to the SDK source at `v1.1.0` |

*(`.zenodo.json` has `"version": null`, but Zenodo picked the version up from the tag, so the deposited
record is correct. Worth fixing anyway for future releases.)*

### Blocker 7a — the archived artifact predates the statistics fixes it is credited with

`v1.1.0` = `8d8ca8f`, dated **2026-07-06**. `git log --oneline 8d8ca8f..main` shows **104 later commits**,
a large fraction of them statistical-correctness fixes. Among the titles:

```
cfe14c1  fix(stats): a 95% CI that covered 94.3%, and every ANOVA effect size labelled "negligible"
960004d  fix(multiplicity): Holm and Benjamini-Hochberg were computing the wrong decisions
1e5fd75  fix(power): a wizard that reported 100% power for every design
9a99675  fix(stats): an assumption test that never ran, and p-values that were exactly zero
4fed715  fix(stats): verdicts delivered by tests that were never computed
50894c4  fix(stats): p-values that were exactly 0, and robust regressions whose p-values were noise
8c286e4  fix(frontend): three render-time TDZ crashes (chi-square, CI plot, ML regression)
06bd9a4  fix(receipts,ci): fail-closed receipt signing; make eslint actually look at .jsx
```

The manuscript advertises "high-precision power and sample-size analysis", eight multiple-testing methods
**including Holm and Benjamini-Hochberg**, chi-square Guardian support (Table 1), and "Zero lint errors" —
and designates as its citable artifact a snapshot in which several of those were broken.

**This was verified the strongest possible way.** The **Zenodo artifact itself was downloaded**
(sha256 `9811d8f8…`; its zip comment is literally `8d8ca8fffecfe12baa22825007cbce486a07b5f1`), the defective
source lines were **extracted from that zip**, and they were **executed**. Not inferred from git history —
run from the published artifact.

**Ten of the eleven defect classes are present in it.** Confirmed by execution:

| Defect | Evidence from the Zenodo zip |
|---|---|
| 95% CI covering 94.3% | `simulationUtils.js` `tCritical` contains `if (df > 30) { return z; }` — run in node |
| All ANOVA effect sizes "negligible" | `powerCalculations.js` `interpretEffectSize` benchmark table has no η² key |
| **Holm/BH computing wrong decisions** | `MultiplicityCorrectionPanel.jsx` applies Holm as `p*(m-i)`. **The shipped Holm rejects p = 0.031 while sparing p = 0.030.** The backend endpoint raised `AttributeError` → **HTTP 500 on every request** |
| Wizard reporting 100% power for every design | `PowerAnalysisStep.jsx:134` argument order |
| `/power/t-test/` ignoring `t_test_type` | present in `power_views` at v1.1.0 |
| Guardian chi-square 500 | `guardian_core.py:374` maps `"chi_square": ["expected_frequencies", "independence"]` — bears directly on Table 1's chi-square row |
| Assumption test that never ran | `hp_regression_comprehensive.py:1113` |
| **p-values exactly zero at 50-digit precision** | executed v1.1.0's `hp_anova_comprehensive._calculate_f_p_value` on **F = 1122.09 — Case Study 1's own F statistic** — and it returns exactly 0 |
| TDZ render crashes | present in a **different and worse form** than the commit describes |
| "Zero lint errors" | `eslint src/` (the exact v1.1.0 CI command) linted 294 files and **zero `.jsx`** |

**Five manuscript sentences are outright false of the archived artifact**, including line 273's *"the
platform ensures corrections are applied correctly"* and line 293's claim that 50-decimal precision is
*"critical for validation studies and extreme-value computations where IEEE 754 double precision may be
insufficient"* — in the very regime where the shipped code returns p = 0.

**And Case Study 1's own headline number breaks in the archived UI.** The manuscript says all six pairwise
Mann-Whitney comparisons are significant after BH correction, *"all adjusted p < 0.001"*. Recomputed
correctly, all six are 1.82672e-04, which supports the claim. **The v1.1.0 in-app BH returns 1.09e-03** — so
a reviewer who reproduces Case Study 1 *through the software the paper points them to* gets a number that
contradicts the paper.

Checkpoint 11 independently confirms the same pattern from the other direction: `validate_corpus` at
`v1.1.0` gives 1104 / 459 / 353 / 320 consistent / 33 flags / 4 decision errors where the manuscript prints
980 / 468 / 295 / 276 / 19 / 5.

**Minimal correct fix:** fix the Tier-1 code defects, cut and archive **v1.2.0**, re-verify that the paper's
numbers reproduce *at that tag*, and update the version sentence and both DOIs in the manuscript,
`CITATION.cff` and the cover letter.

### Blocker 7d — the "eight multiple-testing methods" list matches neither version

The manuscript names Bonferroni, Holm-Bonferroni, Hochberg, **Šidák**, **Holm-Šidák**, Benjamini-Hochberg,
Benjamini-Yekutieli and Storey. The UI panel offers **seven** at both v1.1.0 and HEAD: Bonferroni, Holm,
Hochberg, **Hommel**, BH, BY, Storey.

So **Šidák and Holm-Šidák are unreachable from the UI in both versions**, and **Hommel, which is present, is
not listed in the paper.** Either implement the two missing methods, or correct the list to what ships.

### Blocker 7b — the hosted instance is behind HTTP 401

```
$ curl -sI https://stickforstats.com/
HTTP/2 401
www-authenticate: Basic realm="StickForStats closed beta"
```

Against BMC's Software criterion — *"must be available for testing by reviewers in a way that preserves
their anonymity"* — a password obtainable only by emailing the authors defeats the requirement by
construction. The manuscript lists the URL as the "hosted evaluation instance" and declares **"Any
restrictions to use by non-academics: None"**; the cover letter says it "is available for evaluation" with
no credentials given.

**Three workable fixes:** open a credential-free public demo for the review period; or print a single shared
reviewer credential in the manuscript/cover letter (this *does* preserve anonymity, since no reviewer has to
make contact); or drop the URL and lean on the Docker + Zenodo route. In all three cases also act on BMC's
explicit recommendation to **upload a source archive as an Additional file**.

### Blocker 7c — reference [31] has no public artifact of any kind

`github.com/visvikbharti/CRISPRArchitect` → **HTTP 404**. The account has **no such repository among its 23
public repos**, and Zenodo, Crossref and Europe PMC all return **zero hits**.

Reference [31] is simultaneously (a) a broken citation, (b) the **sole provenance of Case Study 1's
dataset**, and (c) the subject of the Competing Interests declaration, which describes the tool as though a
reader could go and look at it. The shipped `crispr_topsis_scores.json` carries **no generation metadata,
version, seed or timestamp** either — so nothing anywhere ties those 40 TOPSIS scores to CRISPRArchitect v3.

*(The replication copy is at least internally consistent: it is byte-identical, md5 `02089c6c…`, to
`examples/biological_datasets/crispr_editing_strategies/real_scored_strategies.json`.)*

Either publish CRISPRArchitect (even a tagged, Zenodo-archived snapshot), or restate Case Study 1's data
provenance honestly as an internal tool output deposited with the paper.

### Blocker 7e — a broken cross-reference the reader will follow

Line 287: *"The platform includes five curated biological example datasets … **(availability details are
given in Materials and Methods)**."* The Methods documents a **different** five datasets (Iris, Wine, Egger,
GSE271517, the PMC corpus) and **never mentions `examples/`, the five example-dataset names, or vignettes** —
`grep` over the whole manuscript confirms. The five directories *do* exist under
`examples/biological_datasets/` with exactly those names and contain data files; the cross-reference simply
points at the wrong place, and the vignettes are not where the sentence promises.

### Also worth fixing

- The **`S1 Text` / Additional file 1 document does not exist** in the submission package. The manuscript describes five S1 sections in detail; there is currently **nothing to upload**.
- `SUBMISSION_GUIDE.md` and `CHANGES_FROM_PREPRINT.md` both describe the tool as **v1.0.0** while the manuscript says v1.1.0, and the guide's step 9 says the Zenodo DOI is still to be minted. Stale internal docs that contradict the submission.
- The cover letter is dated **8 July 2026**, claims cross-validation *"to 10–16 decimal places"* (Table 4's meta-analysis row says 3), and says an updated bioRxiv version *"is being posted"* — which may be false on the day of submission, since the v2 route is blocked.
- **The APC is cheaper than the cover letter assumes.** BMC Bioinformatics is in the country-tiered pricing pilot and **India's tier is 25%**, so the baseline is roughly **£572 / $772 / €648**, not the ~£2,290 list price. The discretionary need-based waiver is real and correctly requested at submission, but it applies *on top of* the already-adjusted figure — and a CSIR-IGIB institutional OA agreement should be checked first. The cover letter's framing understates what you already get.

---

## Checkpoint 8 — Software-version claims

| Manuscript says | Ground truth | Status |
|---|---|---|
| Recharts **2.8** | `package.json`: **`^3.2.1`** — a major version off | `MISMATCH` |
| "SciPy **>= 1.11**" (Availability) | `requirements.txt`: **`scipy>=1.10.1`** | `MISMATCH` |
| React 18 | `^18.2.0` | `VERIFIED` |
| Material-UI 5 | `@mui/material ^5.14.20` | `VERIFIED` |
| jStat 1.9 | `^1.9.6` | `VERIFIED` |
| NumPy >= 1.24 | `numpy>=1.24.3` | `VERIFIED` |
| Django 4.2 | `Django>=4.2.0,<4.3.0` | `VERIFIED` |
| statsmodels 0.14, mpmath 1.3, lifelines 0.27, scikit-learn 1.3, Celery 5.3 | floors match | `VERIFIED` as floors |
| Part B "executed via **R 4.3.2**" | **R 4.4.1**; and edgeR 4.2.2 / DESeq2 1.44.0 are Bioconductor 3.19, which *requires* R 4.4.x — the stated combination is not self-consistent | `MISMATCH` |

**A reproducibility caveat that deserves a sentence in the Methods.** The manuscript states exact versions
("NumPy 1.25, SciPy 1.11"), but the environment the reported numbers were actually computed in has
**NumPy 2.4.6 and SciPy 1.17.1** — far newer. `requirements.txt` uses `>=` floors throughout, so a reviewer
who installs from it today gets NumPy 2.x. Since Case Study 1's Shapiro p and Case Study 2's correlations
are quoted to three significant figures, the safest fix is to ship a lockfile (`requirements-pinned.txt`
already exists — pin to it) and state the exact versions the results were produced under.

Finally, note the **undisclosed runtime dependency**: `requirements.txt:70` pins `anthropic>=0.39.0`, which
appears in none of the manuscript's version lists. See the AI-dependency section below.

## Checkpoint 9 — Case Study 4 (GSE271517): **provenance perfect, counts exact, but the fold changes are not fold changes**

Verified two independent ways: by re-executing the shipped pipeline, and by a clean-room reimplementation
written from the raw counts without importing repo code. The two agree to **1.1e-15** on every per-gene q.

### Provenance — the strongest in the paper

- The shipped `GSE271517_Sample_Counts.csv.gz` is **byte-identical to a fresh live download from NCBI GEO** (MD5 `305be1592dd5f00670aab55c6c0375c9`).
- The sample assignment was independently rebuilt from the GEO **series matrix**: 91 samples, 55 unique patients, `Primary_tumor` 55 / `Metastasis` 36 — **zero disagreements** with the shipped `sample_assignment.csv` on tumour type, patient ID or sample title.
- The verbatim Chen et al. quotation is **word-for-word correct** against the Europe PMC full text of PMC11892499. Reference [34]'s every bibliographic field (volume 11, issue 41, e2404510, DOI, PMID, PMCID, 21-author order) matches PubMed.
- The two "55"s are **not** a conflation: 55 primary samples and 55 patients are independently correct and coincidental (39 patients primary-only + 6 metastasis-only + **10 in both** = 55).

### Counts that reproduce exactly

| Claim | Manuscript | Recomputed | Status |
|---|---|---|---|
| Genes after `≥10 reads in ≥3 samples` | 27,221 | 27,221 | `VERIFIED` |
| Normality violations | 24,391 | 24,391 | `VERIFIED` |
| Variance violations | 2,394 | 2,394 | `VERIFIED` |
| Union cascaded / rate | 24,648 / 90.55% | 24,648 (22,254 norm-only + 257 var-only + 2,137 both) / 90.5477% | `VERIFIED` |
| Guardian significant | 1,411 | 1,411 | `VERIFIED` |
| flipped / A / B / both | 553 / 479 / 74 / 932 | 553 / 479 / 74 / 932 | `VERIFIED` |
| Group A median naive q, Guardian q | 0.07, 0.04 | 0.070024, 0.036845 | `VERIFIED` |
| MKI67 q | 0.019 | 0.019037 | `VERIFIED` |
| TOP2A q | 0.040 | 0.040159 | `VERIFIED` |
| MKI67 / TOP2A up in metastasis | up | primary 5.7269 → met 6.6984; 5.1566 → 6.0974 | `VERIFIED` |
| Gene ID mapping | MKI67, TOP2A | ENSG00000148773, ENSG00000131747 confirmed against live Ensembl REST | `VERIFIED` |

### Blocker 9a — the naive baseline is **not** Welch

`manuscript.md:202` says "a naive parametric default (per-gene **Welch** t-test)". Both code paths
(`phase_d_guardian_analysis.py:199`, `case_study_4_genomics.py:207`) call
`scipy.stats.ttest_ind(..., equal_var=True)` — an **equal-variance Student's t-test**.

The 1,006 figure is exactly reproducible **from equal-variance Student's t**. Run the real Welch and every
downstream number changes:

| | Manuscript (= equal-var Student, verified) | If it really were Welch |
|---|---|---|
| naive significant | 1,006 | **1,701** |
| flipped | 553 | **698** |
| Group A | 479 | **204** |
| Group B | 74 | **494** |
| hit by both | 932 | **1,207** |

The calibration section (lines 230, 421) *already* says "equal-variance Student's t-test", so the
manuscript contradicts itself. **This is a one-word text fix, not a data problem** — but it must be fixed
in three places: `manuscript.md:202`, and the two prose mislabels in the shipped package
(`case_study_4_genomics.py` docstring line 20 and its stdout label line 287, both of which print "Welch"
over `equal_var=True` code).

### Blocker 9b — not all 24,648 genes go to a rank test

`differential_expression.py:406–410` routes the **257 variance-only** violators to **Welch's t-test**, and
only the 24,391 normality violators to Mann-Whitney. Verified counts:
`{mann_whitney: 24391, t_test: 2573, welch_t_test: 257}`.

So the abstract's "cascaded **90.6%** of 27,221 genes **to a rank-based test**" is wrong — the rank-test
rate is **89.60%** (24,391). The union rerouting rate is 90.55%. The error repeats at line 206, line 211,
Table 6 (line 224) and in the abstract.

Correct wording: *"24,648 of 27,221 genes (90.55%) were rerouted off the default equal-variance t-test —
24,391 (89.60%) to Mann-Whitney U and 257 to Welch's t-test."*

### Blocker 9c — **every |log2FC| in Case Study 4 and Fig 5 is not a log2 fold change**

This is the most serious scientific finding of the audit, and it is a **live bug in the production
genomics module**, not only a manuscript error. `backend/core/services/genomics/differential_expression.py`
(read directly, lines 245–262):

```python
mean1 = np.mean(row[g1_idx])          # row is ALREADY log2(CPM+1)
mean2 = np.mean(row[g2_idx])
result.log2_fold_change = float(np.log2(mean2 / mean1))
```

On log-transformed input the log2 fold change is the **difference of means**, not `log2` of the **ratio of
log-scale means**. The quantity computed has no fold-change interpretation. The same output file already
carries the correct value (`D_guardian_vs_naive.csv` column `naive_log2_fold_change`, confirmed equal to
the difference of means to 0.0).

| Reported | Manuscript | True log2FC |
|---|---|---|
| MKI67 | +0.23 | **+0.97** |
| TOP2A | +0.24 | **+0.94** |
| Group A median \|log2FC\| | 0.20 | **0.54** |
| Group A with \|log2FC\| ≥ 1 | 8% | **2.7%** |
| Group B median \|log2FC\| | 0.46 | **0.61** |
| Group B with \|log2FC\| ≥ 1 | 31% | **10.8%** |

Signs and all q-values are unaffected, so "up in metastasis" and every significance claim survive.
**What does not survive is Case Study 4's central narrative.** The paper contrasts "Group A concentrated at
small effect sizes (0.20)" against "Group B shifted right (0.46)" — a 2.3× separation. Under the correct
log2FC it is 0.54 vs 0.61, a **1.1× separation**. The "two qualitatively different groups" reading, the
"large-effect, outlier-influenced genes" framing in the abstract, and **Fig 5B** all need rethinking, not
relabelling. Fig 5A's x-axis is likewise labelled "log2 fold change (Metastasis vs Primary)" while
plotting the invalid quantity (`generate_figures.py:465, :489`).

*Note the irony:* the code carries a long comment about a previously-fabricated epsilon clamp in this exact
block. That earlier bug was fixed; the underlying formula was not.

---

## FIXED AND RE-RUN — 2026-08-04

`log2_fold_change` is corrected and Case Study 4 has been re-executed. Details below; the manuscript has
**not** been edited, because the corrected numbers raise an authorial question that is not mine to settle
(see "what does not survive").

### The fix

`input_scale` is now a **required** constructor argument on `DifferentialExpressionService`
(`"linear"` | `"log2"`), with no default, and all fold-change arithmetic lives in one method:

```python
def _compute_log2_fold_change(self, mean1, mean2):
    if self.input_scale == "log2":
        return float(mean2 - mean1)          # difference of means on a log scale
    if mean1 > 0 and mean2 > 0:
        return float(np.log2(mean2 / mean1))  # ratio of means on a linear scale
    return None
```

The scale was the unstated assumption that caused the bug, so it is now impossible to inherit silently: a
caller that has not decided gets a `TypeError`, and an unrecognised value gets a `ValueError`. The HTTP API
keeps `"linear"` as its default (existing clients upload counts) but validates it and **echoes it back under
`summary.input_scale`**, so the convention behind any set of numbers is visible in the output.

**Verification.** 10 new tests in `backend/tests/test_fold_change_is_a_fold_change.py`. Mutation-checked:
with the log2 branch deleted, `grep` confirmed the mutation applied and **5 of 10 tests failed**. Full backend
suite **1,352 tests OK** (1,342 before, +10 new). The fixed service now agrees with an independent
clean-room difference-of-means to **8.9e-15** across all 27,221 genes.

### Corrected values

Counts, p-values, q-values, cascade routing and category assignments are **all unchanged** — the fix touches
only the fold change. In the regenerated `D_guardian_vs_naive.csv`, `test_used` differs on **0 rows**,
`guardian_confidence` by **exactly 0**, and the p-value columns only by float noise (~1e-15).

| Quantity | Manuscript | Corrected | 
|---|---|---|
| MKI67 log2FC | +0.23 | **+0.97** |
| TOP2A log2FC | +0.24 | **+0.94** |
| Group A median \|log2FC\| | 0.20 | **0.54** |
| Group A with \|log2FC\| ≥ 1 | 8% | **2.7%** (13 of 479) |
| Group B median \|log2FC\| | 0.46 | **0.61** |
| Group B with \|log2FC\| ≥ 1 | 31% | **10.8%** (8 of 74) |
| Group B / Group A median ratio | 2.36× | **1.13×** |
| max \|log2FC\| over all genes | 32.08 | **2.77** |

Unchanged and re-confirmed: 27,221 genes; 24,391 normality + 2,394 variance violations; 24,648 cascaded
(90.55%); 1,411 Guardian-significant; 1,006 naive-significant; 553 flipped = 479 + 74; 932 hit by both;
MKI67 q = 0.019, TOP2A q = 0.040; **sign agreement between old and new log2FC is 100.00%**, so every
"up in metastasis" direction claim is untouched.

### A second, older defect surfaced in the same artifact

The shipped CSV contained **10 genes with |log2FC| > 5, up to −32.08**. These are *not* from the ratio
formula — they are residue of the **1e-10 epsilon clamp** removed in `9a99675`:
`log2(1e-10 / 0.4531) = −32.077`, matching the stored value exactly. The artifact was written on 2026-05-07
and **never regenerated after the clamp was fixed**. One of the ten (`ENSG00000255123`, real log2FC −0.45)
was significant at q = 0.002 and categorised `hit_by_both`.

They did **not** contaminate the published Group A/B figures — 9 were `neither` and 1 `hit_by_both`, so none
entered either group. The old CSV reproduces the manuscript's 0.1952/7.52% and 0.4604/31.08% exactly, which
confirms the published figures were wrong for exactly one reason: the quantity was not a fold change.

*Lesson for the replication package: a stale output artifact is as dangerous as stale code. Fig 5 was drawn
from a CSV two bug-fixes behind the code that nominally produced it.*

### Fig 5 regenerated

Regenerated from the corrected CSV; all three copies (`plos_compbio/figures`, `figures_plos`,
`submission_package/figures`) are now identical, 3420×1409 px = **511 dpi at 170 mm**. Nothing in the
generator was hardcoded, so the in-figure medians and percentages updated themselves. Three changes made:

- The panel-B label **"Group B: Guardian rejected" → "Group B: naive only, Guardian n.s."**, because the manuscript twice states these genes are a pipeline disagreement and that it deliberately does *not* label them false positives. A panel label must not assert what the text is at pains to deny.
- Panel A `xlim` −7…+7 → **−3.2…+3.2**. The old range dated from the epsilon-clamp era, when fabricated points sat off the left edge; real data spans ±2.8.
- Panel B `xlim` 0…4 → **0…2.0** and the `|log2FC| ≥ 1` annotation moved, because it had been **occluded by the legend box** and its percentages were clipped.

### What does not survive — and this is the authorial decision

Three sub-claims are made about Group B. I tested each against the corrected data rather than assuming.

| Sub-claim | Verdict |
|---|---|
| Group B has "**much larger** apparent effects" | **NOT SUPPORTED.** Median 0.61 vs 0.54 — a **1.13×** ratio. Mann-Whitney p = 0.0013, so *detectable*, but the common-language effect size is 0.384 against 0.5 for no difference: a small effect. "Much larger" cannot stand |
| "frequently driven by a **subset of extreme samples**" | **SUPPORTED.** 20% trimming removes a median **22.1%** of Group B's effect vs **7.5%** of Group A's (p = 1.5e-05) |
| "the rank test declines them because **most observations overlap**" | **STRONGLY SUPPORTED.** Overlap index 0.644 vs 0.605, p = 1.8e-35, common-language statistic 0.051 — near-perfect separation between the groups on this measure. Probability of superiority 0.675 vs 0.695 |

So the *mechanism* Case Study 4 asserts holds up — arguably better than before, since it is now supported by
the two measures that actually explain why a rank test declines a gene. What fails is the *effect-magnitude*
framing that the section leads with, and Fig 5B's "two qualitatively different groups" reading: the corrected
histograms **overlap almost entirely**, both peaking at 0.5–0.6, with Group B showing only a slightly heavier
right tail.

**This needs rewriting, not renumbering.** The honest version anchors Group B on outlier-dependence and
distributional overlap and drops "much larger effects" and "shifted right". Whether to do that, or to cut the
Group A/B contrast, or to run the pre-registered DESeq2/edgeR follow-up first and report the three-way
comparison instead, is an authorial call — so the manuscript is left untouched pending that decision. The
abstract's "74 large-effect, outlier-influenced genes" needs the same treatment: "outlier-influenced" is
supported, "large-effect" is not.

### Smaller items

- **Wrong section pointer into another group's paper.** The manuscript cites the quote as Chen et al.'s "Methods Section §4". In the actual article §4 is *Conclusion*; the `Statistics` subsection is in **§5, "Experimental Section"** (Adv Sci does not use a "Methods" heading). A wrong pointer sitting immediately beside a verbatim quotation is precisely where a reviewer looks.
- **Shapiro is per-group with an OR rule**, not on pooled residuals: a gene is routed nonparametric if **either** group rejects at α = 0.05. Since two 5%-level tests per gene inflate the flag rate even under the null, and this rule is what produces the headline 89.6%, it must be stated explicitly in Methods.
- **Library sizes are computed after filtering** — defensible, but unstated.
- Replace "some patients contributing to both arms" with the actual figure: **10 of 55**. A number is strictly stronger than "some" in the paper's own honest limitation.
- TOP2A was **not** cascaded (`test_used = t_test`); its naive q clears 0.05 by only 0.0019, so the "significant in both pipelines" claim for TOP2A is fragile to any change in the naive test.

## Checkpoint 10 — Calibration benchmark (Fig 8): **the strongest section in the paper**

This is the section that would survive the most hostile review, and it is worth saying so plainly.

**Both stored result JSONs were re-executed from scratch and came back byte-identical.** Part A ran in full
(6 scenarios × 2 designs × 100 datasets × 1,000 genes — no replicate reduction), and Part B ran end-to-end
with the **real edgeR 4.2.2 and DESeq2 1.44.0**, which are installed on this machine. So these artifacts are
genuine outputs of the shipped scripts at the stated seed, not a past run nobody can check.

| Claim | Manuscript | Re-executed | Status |
|---|---|---|---|
| Stored JSONs are genuine script output at seed 20260706 | implied | **bit-for-bit identical** on fresh full runs of both parts | `VERIFIED` |
| S2 Type I | 0.100 → 0.058 | 0.1000 → 0.0576 (≈40 Monte-Carlo SE apart — unambiguously real) | `VERIFIED` |
| S2 FDR | 0.179 → 0.068 | 0.1793 → 0.0683 | `VERIFIED` |
| S6 cascade Type I | 0.080 | 0.0801 (naive 0.0941, always-Welch 0.0446 — the "only partially controls" characterisation is right) | `VERIFIED` |
| "gate is neutral when assumptions hold (S1)" | neutral | Type I 0.0494 → 0.0508; FDR 0.0459 → 0.0479; power 1.0000 → 1.0000 | `VERIFIED` |
| "adds power in S3–S5 without inflating Type I" | no inflation | S3 0.0494 / S4 0.0518 / S5 0.0494 at 55v36; max across **both** designs 0.0543. Power S5 0.9375 → 0.9996 (and at 20v20, 0.6256 → 0.8450) | `VERIFIED` |
| "a fixed Welch default controls error in **every** scenario" | all six | Checked all **12** cells (6 × 2 designs): Type I 0.0413–0.0505, max only +0.6 MC SE above nominal — **including S6** (0.0439 / 0.0446) | `VERIFIED` |
| Part B power at 55v36 | 0.82 vs 0.74 | edgeR 0.8155, DESeq2 0.8175, cascade 0.7355 | `VERIFIED` |
| "roughly twofold at 20v20" | ~2× | cascade 0.1355; edgeR 0.2835 (2.09×), DESeq2 0.3045 (2.25×) | `VERIFIED` |
| Design parameters (1,000 genes, 10% DE, 100/20 datasets, dispersion 0.2, 1.5-fold, seed 20260706) | as stated | all confirmed against code constants; 1.5-fold encoded as log2 = 0.585 → 1.5003× | `VERIFIED` |
| Ablation framing is legitimate | "cascade's own parametric branch, gate off" | confirmed from code both sides | `VERIFIED` |
| Fig 8 PNG displays the claimed values; submission copy is the script's output | as captioned | plotted values read off the image match the JSON; all three copies byte-identical (md5 `fe501f6b…38b4`) | `VERIFIED` |
| Limitations paragraph on calibration | as written | every assertion supported; the stated mechanism (normality-first routing) confirmed by the reproduced routing mix (S6 55v36: **84.1% Mann-Whitney**, only 15.9% Welch) | `VERIFIED` |
| **"all methods control the FDR"** | all | **DESeq2 at 20v20 = 0.0622**, above nominal — and **Fig 8 panel D plots that bar above its own α = 0.05 line** | **`MISLEADING`** |
| **Part B "executed via R 4.3.2"** | R 4.3.2 | **R 4.4.1 (2024-06-14)**. Worse, edgeR 4.2.2 / DESeq2 1.44.0 are Bioconductor 3.19, which *requires* R 4.4.x — so the stated combination is not self-consistent. Since Part B reproduced bit-for-bit under 4.4.1, the original run almost certainly used 4.4.1 | **`MISMATCH`** |

### The three fixes

1. **Qualify "all methods control the FDR."** The excess is not statistically significant (0.0622 ± 0.0092, t = 1.33, df = 19, p ≈ 0.20) — but the figure the sentence captions visibly contradicts it. **The team's own `CALIBRATION_BENCHMARK_MEMO.md` already carries this asterisk; it was dropped in transfer to the manuscript.** Suggested: *"all methods control the FDR at 55 versus 36, with DESeq2 marginally above nominal at 20 versus 20 (0.062, within Monte-Carlo error at 20 datasets)."*
2. **Correct the R version** to "R 4.4.1 (edgeR 4.2.2, DESeq2 1.44.0)". No reported value changes, but as written the Methods misdirects anyone attempting replication.
3. **State Part B's Monte-Carlo error.** 20 datasets vs Part A's 100 gives FDR standard errors of ~0.006 (55v36) and ~0.009–0.011 (20v20) — large enough that no Part B FDR difference from nominal is individually significant. The memo says this explicitly; the manuscript does not, leaving Part B's point estimates looking more precise than they are.

*A pattern worth noting:* in both places where the manuscript overstates this section, the internal memo was
**more careful than the paper**. The honesty existed and was lost in transcription — the same mechanism as
the Case Study 2 conflation, running in the opposite direction.

**Housekeeping for whoever re-runs these:** both calibration scripts write their results JSON in place via
`Path(__file__).with_name(...)`, so simply running them **overwrites the shipped artifacts**. Add an `--out`
flag before anyone attempts replication.

## Checkpoint 11 — Retrospective verification corpus (Tables 7–8): **the numbers came from a superseded engine, and nobody can reproduce them**

### Blocker 11a — the whole section describes a build that no longer exists

`manage.py validate_corpus` was run against the shipped corpus at three commits:

| Engine build | claims / with-stat / recomputable | consistent | discrepancy + gross |
|---|---|---|---|
| **d41ee20** (3 Jun 2026 — the commit that committed `results.json`) | 980 / 468 / 295 | **276 (93.6%)** | 14 + 5 |
| **v1.1.0** (`8d8ca8f`, the version the paper says it describes and archived on Zenodo) | 1104 / 459 / **353** | **320 (90.7%)** | 29 + **4** |
| current `HEAD` | 1104 / 459 / 353 | 320 (90.7%) | 29 + 4 |

So the manuscript's figures are **real and genuinely executed** — they reproduce *bit-for-bit* at d41ee20,
every per-article field identical — but by an engine that has since been superseded by ~25 commits on the
manuscript-verify line (including `62677e0` "extractor p-mis-pairing" and `6e4242a` "extractor precision").

**A reviewer who follows the Methods at v1.1.0 gets 90.7% consistent, 33 flags and 4 decision errors — not
93.6%, 19 and 5.** That invalidates every aggregate in the section, the whole of Table 7's 19-item
taxonomy, and two of Table 8's three rows. The newer extractor is *better* (it recomputes 353 vs 295,
because it now handles three papers the old one recovered almost nothing from) — the printed figures are
simply stale.

The Methods sentence "the `validate_corpus` management command reproduces the per-claim results
(`results.json`)" is **false as shipped**.

### Blocker 11b — Tables 7 and 8 are not reproducible by anyone

- `git ls-files paper/replication/manuscript_validation/corpus/` returns **0**. The 20 article texts are **gitignored**.
- The `.gitignore` justifies this as "re-derivable via `fetch_corpus.py`" — **but the script does not pin the PMCIDs.** It calls `esearch(query, retmax)` and keeps whatever passes its `≥3 inline stats` / `≥8000 chars` filters. It **never reads `manifest.json`** (the manifest is output-only). The PMC OA subset grows daily and esearch ordering is unstable, so a rerun returns a different 20 articles.
- Worse: the manifest records an **11-term** query while `fetch_corpus.py`'s `DEFAULT_QUERY` has only **5** terms, and the README's documented reproduce command passes no `--query` — so **the documented command issues a query that never built this corpus.**

Net effect: no corpus, no way to rebuild the corpus, and at v1.1.0 an engine that would give different
numbers even if a reviewer had it. Excluding the texts for licensing reasons is defensible; pairing that
with a fetch script that cannot re-derive them is not. **Minimum fix:** make `fetch_corpus.py` efetch the
manifest's pinned PMCID list directly (no `esearch`), and correct the Availability sentence, which currently
claims the corpus is "rebuilt by `fetch_corpus.py` from the recorded E-utilities query and manifest".

### Blocker 11c — the "5 vs 2 decision errors" sentence reverses the actual quality picture

The manuscript writes: *"our engine surfaces more decision-level errors (5 vs 2) — the class that actually
alters a conclusion."* Applying **the manuscript's own Table 7 taxonomy** to those 5:

| # | Item | What it actually is |
|---|---|---|
| 1 | PMC13223243 `F(1.86, 28.30) = 6.535` | **Not a decision error at all.** Article reports p = 0.011; scipy gives 0.005441 — *same side of α*. The old engine mis-paired a stray "p > 0.05" — the exact bug fixed in `62677e0`. `TABLE7_CLASSIFICATION.md` then rationalised it as "sphericity, high confidence" |
| 2 | PMC13223457 `F(2,58) = 3.728` | A Greenhouse-Geisser article the manuscript itself concedes is a tool limitation |
| 3 | PMC13224458 `Z = 1.96` | Cochran's *assumed proportion* p = 0.5 read as a p-value |
| 4 | PMC13224422 `t(91) = 2.28, p = 0.050` | Knife-edge: engine treats 0.050 as non-significant; the article calls it significant |
| 5 | PMC13223804 `F(1,16) = 8.66, p = 0.20` → 0.0096 | **The one unambiguous conclusion-altering discrepancy** |

And statcheck's 2 decision errors are PMC13223457 and PMC13223804 — i.e. **statcheck already catches the
only genuine one.** The manuscript rigorously adjudicates its 19 flags down to 4 genuine, then declines to
apply the same adjudication one paragraph later. A reviewer will spot this immediately and use it against
the whole comparison.

### Blocker 11d — Table 8 is not a fair head-to-head as presented

1. **Row 1 fuses two different constructs** into one label ("Inline statistics extracted / recomputable"): statcheck's 266 is its *complete extraction output*; our 295 is a *filtered subset* of 980 extracted / 468 with-a-statistic. Our extraction recall is never measured against statcheck's, yet the prose reads the row as an extraction-agreement result.
2. **Row 2's rates have different denominators** (47/266 vs 19/295) **and different flagging semantics** — our engine adds a flat ±0.005 tolerance and an inequality-satisfaction rule statcheck does not have. Neither figure is an error rate against ground truth.
3. **The fatal asymmetry:** the manuscript adjudicates its own 19 flags down to 4 genuine (1.4% of 295) but **never adjudicates statcheck's 47**. A lower flag rate under a wider tolerance is *leniency*, not *precision*. Precision is unmeasurable until statcheck's 47 are read back the way Table 7 reads back ours.

Concretely: both tools flag the **same set of articles**, and **16 of the 28-flag gap (57%) is one
article's "p > 0.001" typos.** The 6.4% vs 17.7% contrast will read as "17.7% of statcheck's flags are
noise, ours is 3× cleaner", which the data does not establish. Fix by relabelling Row 1, printing both
denominators in Row 2, and either adjudicating statcheck's 47 or dropping the precision/recall framing for
a purely descriptive one.

### What did reproduce perfectly

| Claim | Status |
|---|---|
| Corpus is 20 PMC articles; manifest matches the corpus exactly (all 20 per-paper counts re-derive) | `VERIFIED` |
| Table 7 rows sum to 19; flag→article mapping accounts for all 19 with no double-counting | `VERIFIED` |
| 9 sphericity flags are **source-grounded** — spot-checked 4 articles; each states Mauchly/Greenhouse-Geisser/Huynh-Feldt in its own Methods; one reports a fractional `F(3.437,21)` | `VERIFIED` |
| The `Z = 1.96` sample-size flag is exactly as the paper describes (Cochran's formula, assumed proportion 0.5) | `VERIFIED` |
| Table 7 caption's 14 + 5 = 19, and the "5 gross-error" items **are** the same 5 as Table 8's "5 decision errors" (`consistency_core.py:257` defines `gross_error` as opposite sides of α) — **no label conflation** | `VERIFIED` |
| `F(6,128) = 6.8, p = 0.03` → recomputes 2.815e-06 ("approximately 3 × 10⁻⁶"); the article genuinely reports it, with ηp² = 0.18, and never mentions sphericity anywhere | `VERIFIED` |
| `t(91) = 2.28, p = 0.050` → recomputes 0.024944 ("approximately 0.025"); design genuinely "independent samples" | `VERIFIED` |
| **statcheck side**: R `statcheck` **1.5.0 is installed**; re-running the baseline gives 266 extracted / 47 errors / 2 decision errors, and every per-file triple reproduces | `VERIFIED` |
| Per-article agreement 45 vs 45, 9 vs 9, 88 vs 86 — and these survive the engine drift | `VERIFIED` |
| Sphericity-heavy article: statcheck 9, ours 6 | `VERIFIED` |
| "p > 0.001" appears **34** times in PMC13224698 and statcheck flags **16** | `VERIFIED` (counted from the article text and a fresh statcheck run) |
| Limitations' 9 + 5 + 1 = 15 explainable, 4 genuine | `VERIFIED` |

### Two smaller fixes

- The manuscript says our engine passes the "p > 0.001" cases *"because the significance decision is unchanged"*. That is **not the code's mechanism**: `consistency_core.py`'s `greater_than` branch computes `p_hi >= p_value - 0.005`, which for a 0.001 threshold is **unconditionally true** — the engine cannot flag *any* `p > x` claim for x ≤ 0.005, regardless of the decision. The shipped `STATCHECK_COMPARISON.md` states this candidly ("lenient at p-thresholds below its rounding tolerance"); the manuscript prints the flattering version.
- `paper/replication/manuscript_validation/README.md` says "295 recomputable → **275** consistent" where `results.json`, the executed engine and the manuscript all say **276**. An off-by-one contradiction inside the replication package a reviewer will read.

## Checkpoint 12 — Citation accuracy and claim support: **one reference does not exist, and the abstract's premise misreads its only source**

All 40 references were checked against Crossref, PubMed and publisher records. The in-text citation coverage
audit came back **clean** — every number [1]–[40] is used, and none dangles beyond 40. But five findings are
blocking.

### Blocker 12a — Reference 5 does not exist

> `5. Zimmerman DW. Comparative Power of Student t Test and Mann-Whitney U Test. J Exp Educ. 2004;73(2):167-183.`

**I verified this myself against Crossref**, independently of the agent. The real paper is:

> Zimmerman DW. *Comparative Power of Student T Test and Mann-Whitney U Test for Unequal…* The Journal of
> Experimental Education. **1987;55(3):171–174.** doi:10.1080/00220973.1987.10806451

Every metadata field in the citation is wrong: year (2004 vs 1987), volume (73 vs 55), issue (2 vs 3), pages
(167–183 vs 171–174). And enumerating J Exp Educ vol 73 shows **issue 2 ends at page 160 and issue 3 begins
at 165** — there is no article at 167–183 in that issue, and Zimmerman published nothing in that journal in
2004. The correct title and author have been welded onto fabricated publication metadata.

### Blocker 12b — the ">15% false positive rate" claim has no support

> *"Zimmerman demonstrated that even moderate heterogeneity of variance can inflate the false positive rate
> of the independent t-test from the nominal 5% to over 15% [5]."*

- It rests **solely on the non-existent Ref 5**.
- It appears **nowhere in Ref 4** (the other Zimmerman reference, whose abstract was retrieved).
- It **omits the unequal-sample-size condition** without which it is false — with equal n the pooled t-test is famously robust to unequal variance, which the project's own benchmark confirms (S2 at 20v20 gives a benign Type I of 0.0550).
- **It is contradicted by the manuscript's own Fig 8**, which measures Type I = **0.100** under unbalanced heteroscedasticity — 10%, not "over 15%".
- It exists only as **prose duplicated verbatim across three draft manuscripts**, with no supporting computation anywhere in the repository.

The irony is sharp: the paper has a rigorous, executed, seed-fixed measurement of exactly this quantity, and
its Introduction cites a non-existent paper for a different and larger number instead. **Replace the claim
with the paper's own Fig 8 S2 result.**

### Blocker 12c — the abstract's motivating premise misreads its only source

> *"Surveys consistently find that fewer than 20% of published biomedical studies report checking these assumptions"* (Abstract)
> *"Hoekstra et al. reported that fewer than 20% of published studies in psychology mentioned checking assumptions [6]"* (Introduction)

Hoekstra et al. 2012 **observed 30 psychology PhD students analysing fictitious datasets.** It is not a
survey of published studies, and contains nothing biomedical. Its measured rates are **12% (normality) and
23% (homogeneity of variance)** — and the second **exceeds** the manuscript's "fewer than 20%".

So the abstract's headline sentence is unsupported on **every element**: "surveys" (one observational
study), "consistently" (a single source), "published" (unpublished student analyses), "biomedical"
(psychology), and "fewer than 20%" (one of the two measured rates is 23%). The Introduction's narrower
version is closer but still says "published studies" where the source studied students.

**This is the first substantive sentence of the paper and its entire motivating premise.** It is the single
highest-leverage fix in the manuscript: either find sources that actually support a biomedical claim, or
restate it precisely as what Hoekstra measured.

### Blocker 12d — Reference 31 (CRISPRArchitect) is unresolvable, and it is Case Study 1's only provenance

`https://github.com/visvikbharti/CRISPRArchitect` → **HTTP 404**. The account has **no such repository among
its 23 public repos**, and Zenodo, Crossref and Europe PMC all return **zero hits**. There is no public
CRISPRArchitect artifact of any kind.

This is simultaneously a broken citation, a **data-availability failure** (Ref 31 is the sole provenance of
the Case Study 1 dataset), and awkward for the Competing Interests declaration, which describes the tool as
though a reader could go look at it.

### Blocker 12e — an in-text citation with no reference-list entry

*"eta-squared H = 0.93 (unbiased form per **Tomczak & Tomczak 2014**; large effect)"* — there is **no Tomczak
entry among references 1–40**. It is also the manuscript's only author–year citation in an otherwise numeric
list. BMC production will bounce this.

*(Note: an adversarial check **refuted** a related concern. The value 0.93 is correct, the estimator name
"η²_H" is the post-audit correct name, and the production engine's own output label reads verbatim
"eta-squared H (unbiased; Tomczak & Tomczak 2014)" — so the manuscript faithfully transcribes the software.
The dangling reference is the real and only defect here.)*

### Major citation-style and attribution issues

| Issue | Detail |
|---|---|
| **"et al." style** | All seven `Author, et al.` entries violate BMC's current Vancouver style, which names the **first six** authors before "et al.". Refs 13, 26, 28, 30 have 6, 4, 4 and 5 authors — so "et al." is **not permitted at all** for those |
| **Ref 40 page range is wrong** | Seabold & Perktold: the proceedings PDF's own printed running head shows the article begins on page **92 (92–96)**, not 57–61 |
| **Grubbs 1969 [22] cited for methods it does not contain** | Cited for "IQR fencing and Z-score". Grubbs' paper contains neither, and **Grubbs' test appears nowhere in the codebase** (grep: zero hits; `OutlierDetector` implements only IQR fences and \|z\|>3). Should be **Tukey 1977** |
| **statcheck cited via the wrong artifact** | The software is cited through the 2016 prevalence study, and **"statcheck 1.5.0"** — a 2024 release — is cited to a 2016 journal article |
| **DESeq2 and edgeR are cited nowhere** | They carry substantial argumentative weight (Group B's interpretation, Fig 8D–E) and are **executed in the Methods**, yet appear in none of the 40 references. Conspicuous in a bioinformatics journal |
| **Five named methods uncited** | Holm, Hochberg, Šidák, Benjamini-Yekutieli and Storey are all named as implemented; only Benjamini-Hochberg [9] is cited |
| **Nine titles truncated mid-title** | Dropping subtitles Vancouver requires |
| **Software refs lack URL + access date** | Refs 16, 27, 35, 36, 37; and Ref 27's year contradicts the mpmath version the manuscript states |
| **All 40 titles are Title Case** | BMC/Vancouver wants sentence case |

### Table 3 is demonstrably unfair to the competition

Four cells are wrong, verified against the products' own current documentation:

- **jamovi has an Assumption Checks panel** (normality, homogeneity) — marked "--"
- **jamovi Cloud** is a web interface — marked "--"
- **jamovi's Rj / syntax mode** provides R access — marked "--"
- **JASP has an R Syntax Mode**, which shipped in *the very version 0.17.3 the manuscript cites*

Versions cited are 2–3 years stale (JASP 0.17.3 vs current 0.98.1; jamovi 2.4 vs 2.7.30). **A jamovi or JASP
developer is a plausible reviewer for this paper**, and BMC's Software criteria explicitly ask for
"direct comparison with available related software" — so an unfair table attacks the paper's own strongest
compliance point.

### Minor attributions worth tightening

- **"70%" understates what Baker actually reported.**
- The **36% replication figure** is attached to a metric the Open Science Collaboration did not report.
- **Ioannidis 2005** is credited with a cause it does not list.
- **"over 25 years"** is an uncited quantitative claim.
- **Ref 19** (Levene) omits the editor and the book's actual title, so the chapter cannot be located.
- **Ref 21**'s page range differs between the two authoritative records — resolve before submission.
- Bare URLs sit in running text (lines 20, 315, 401) instead of being numbered references with site titles and access dates, contrary to the journal's explicit rule. GSE271517, UCI Wine Quality and the Zenodo archive should all become **citable dataset references with persistent identifiers**, which BMC explicitly requests.

## Checkpoint 13 — Figures: **Fig 7 shows the Guardian getting an assumption check backwards**

All eight figures were opened and read, their plotted values pixel-measured against calibrated axes, and
cross-checked against the underlying result files. The embedding itself is clean: `pdfimages -list` finds
exactly 8 images in the upload PDF, none a placeholder, no literal `{ width=95% }` text. Fig 4B's
meta-analysis panel was independently recomputed and matches (16 study rows, diamond spanning
OR 0.3285–0.7062, ISIS-4 the largest marker). Fig 4A's box statistics match Table 5 exactly.

But there are four blockers, and the first is the most damaging single item in this entire audit.

### Blocker 13a — Fig 7 displays a wrong statistical verdict, and the legend endorses it

The Assumption Checks panel prints:

```
Equal Variance:  ⚠ Violated
p-value:         0.7906698074889
```

The displayed inputs were re-entered and `scipy.stats.levene(center='median')` returns
**0.7906698074889001 — bit-for-bit the number in the image.** A Brown-Forsythe p of 0.79 means you **fail
to reject** equal variance. The correct verdict is **"Met"**. The figure shows Guardian getting an
assumption check exactly backwards — in a paper whose entire thesis is that Guardian checks assumptions
correctly.

`frontend/src/modules/TTestRealBackend.jsx:291–294` documents this as a **since-fixed bug**, which means
Fig 7 is a screenshot of a **broken build**, and the legend (lines 295 and 419) presents the wrong output as
intended behaviour. The same panel also reports **df = 26** (pooled Student's t) *after* flagging a variance
violation — contradicting Table 2's Welch routing.

Three further problems in the same image:

- **The "50 decimal" t-statistic is wrong past the 16th decimal.** The figure prints `-0.35447616466845523882512768458383121551592373686825` under a green "50 decimal places" chip. Computed two independent ways (mpmath at dps=80, and exact rational arithmetic via `fractions.Fraction` + `Decimal.sqrt` at 80 digits), the true value is `0.354476164668455229263773665026...`. It agrees to **16 decimals**; **34 of the 50 advertised digits are noise.**
- **Four fields read "N/A"** — mean difference, 95% CI, Cohen's d, and the normality p-value — all trivially computable for the displayed data (mean difference −3.7857, Cohen's d −0.1340, Shapiro-Wilk p = 3.06e-05 / 4.81e-05). A live field-mapping bug in `TTestRealBackend.jsx`.
- **It is a developer demo route carrying dev banners**: a subtitle *"Using actual backend calculations, NOT simulations"*, a button *"Calculate (Real Backend)"*, and a footer *"This calculation used the REAL backend API with 50 decimal precision. No Math.random() or simulations were used."* A published figure that protests it is not fabricating its own numbers invites precisely the suspicion it is trying to pre-empt.

**Do not submit this image.** Re-shoot from the production analysis screen on a fixed build.

### Blocker 13b — Fig 3 contradicts the manuscript on the LLM question, in bold, inside the PNG

Box 2 of the flowchart reads **"2. Extract Claims (regex + LLM hybrid)"**. The manuscript says the exact
opposite **three times**: line 111 *"a deterministic regex pattern library (no language model is used in
extraction)"*, and both Fig 3 legends. The parenthetical reads as a deliberate, defensive disclaimer — and
the figure it captions refutes it.

Given the separate finding that a generative LLM **is** a runtime component of the product, this is the
contradiction most likely to be read uncharitably. Regenerate the figure with
`"2. Extract Claims (deterministic regex pattern library)"` — and do **not** resolve it by weakening the
manuscript sentence unless the extraction path genuinely uses a model.

Fig 3 also says **"8 validators"** in box 4 and its side panel where the text says **seven** — the figure's
list double-counts statistical consistency ("Consistency (p-value recompute)" and "Statistical consistency"
are the same validator).

### Blocker 13c — Fig 6A's digit claims contradict Table 4 and the Methods

Pixel-measured, the nine bars read 16, 14, 16, 16, 14, 16, 10, 12, 10 decimal places. Three disagree with
the text:

- **Meta-analysis bar: "10 digits (R metafor)"** vs Table 4's **"3 decimal places"** vs the Methods' **"four-plus decimal places"** — three mutually incompatible numbers for one comparison.
- The t-test bar claims **16** where Table 4 says **14**.
- The Mann-Whitney bar asserts **16 digits** that Table 4 does not claim at all.

*(The apparent 9-vs-10 contradiction resolves benignly: the figure silently merges Table 4's two t-test rows
into one bar. Both counts are literally accurate; the merge is just undisclosed.)*

**Fig 6 is also an exact graphical restatement of Tables 3 and 4** and reveals no relationship the tables
do not state — while having introduced three numerical contradictions in the redrawing. The cleanest fix is
to **drop Fig 6 entirely** and keep the tables; renumbering is needed anyway.

### Blocker 13d — figures are not numbered in order of first mention

First-citation sequence is **1, 2, 3, 4, 5, 8, 6, 7**, and `pdfimages -list` confirms the upload PDF's
physical order is the same. BMC's current guidelines: *"Figures should be numbered in the order they are
first mentioned in the text, and uploaded in this order."* Renumber the calibration figure to Fig 6, the
platform comparison to Fig 7, and the screenshot to Fig 8.

### Fig 8's presentation problems

- **The legend box covers the top of the tallest bar in panel A** — the S2 naive Type I of 0.100, which is the section's headline number. The visible bar top measures 0.086; the top 14% is hidden. **A reader cannot read the headline number off the panel at all.**
- **A 130-word prose note is baked into the graphic** as a sixth panel, duplicating the legend. BMC explicitly forbids this.
- **293 ppi as actually embedded** — the only one of the eight below BMC's 300 dpi minimum (the others are 351–558 ppi). **This corrects my own earlier note in this document**, where I computed nominal dpi from pixel width and concluded all eight cleared 300; `pdfimages -list` on the real embedded image is the authoritative measure, and Fig 8 does not. Fix by submitting the **vector PDF that already exists** at `verification/calibration_benchmark.pdf`.
- **Panel C is saturated at ceiling for S3 and S4** (0.9916 → 1.0000 and 0.9982 → 1.0000), so the "adds power under heavy-tailed, skewed" claim is not visible at this design; only S5 and S6 show a readable gain.

### Text legibility — six figures fail

Derived from the generator scripts plus each file's saved pixel width, text in **Figs 2, 4, 5, 6, 7 and 8**
prints between roughly **3.7 and 5 pt** at BMC's 170 mm full-page width. BMC requires all text to be legible
at 85 mm / 170 mm. Fig 4B's 16 study labels print at **3.9 pt**. Every plotted figure needs regenerating
with fonts sized for the final printed width.

### Smaller figure issues

| Figure | Issue |
|---|---|
| Fig 1 | **Caption missing entirely from the PDF.** The trailing sentence on line 52 sits on the same markdown line as the image, so no `figcaption` was generated — the caption went into the image's `alt` attribute and never printed. Confirmed by rendering page 3 |
| all | **Every legend appears twice**, and the two versions **differ in substance**: Fig 1's inline caption omits the genomics workflow, AI advisor and manuscript-review modules that the end-of-document legend names |
| Fig 5B | The in-graphic label reads **"Group B: Guardian rejected"** — the exact framing the manuscript twice and deliberately avoids ("We deliberately do *not* label these false positives") |
| Fig 5 | The legend never explains the light-grey "neither" category (n = 25,736) that occupies 94.5% of panel A, and names the contrast in the opposite direction to the plotted axis |
| Fig 4A | Scatter points are drawn in the same colour as the box they overlay, so the ten variants per modality are invisible; jitter is unseeded; the plotted centre line is the **median** while Table 5 reports the **mean** |
| Fig 4B | Seven of sixteen study labels are struck through by CI lines; CIs run off both axis edges untruncated; the Egger annotation's minus sign is hidden behind a marker |
| Fig 6B | No key for its three-state colour/glyph encoding (BMC requires keys inside the graphic); uses a red/green pair that is not colour-blind safe; its 10 rows are **not a subset** of Table 3's 12 — two rows have no table counterpart |
| Fig 2 | Routing threshold 0.7 in the diamond vs the text's 0.8/0.6 bands |
| Fig 3 | Text overflows three box borders; names GROBID, pandoc and python-docx, which appear nowhere in the manuscript's requirements |
| Figs 1, 2 | Large dead white space (24% and 18% of canvas height); at full width Fig 2 also exceeds BMC's 225 mm height cap |
| all | Files are byte-identical to `paper/plos_compbio/figures_plos/`. **No PLOS branding is present** — the images themselves are clean. But the path string `figures_plos` is embedded in the submitted manuscript, and `figures_plos` is a **git-tracked symlink** (mode 120000), which will not survive a Windows clone or some archive extractions |

**Vector PDFs already exist for seven of the eight figures** — submitting those instead fixes the dpi and
line-width problems in one step, and BMC states *"Vector figures should if possible be submitted as PDF
files."*

---

## Software defects found along the way

These are bugs in the **shipped product**, not manuscript errors. They affect real users regardless of what
the paper says, and several are one-line reviewer refutations. Ordered by how much damage they do.

| # | Defect | Location | Why it matters |
|---|---|---|---|
| **D1** | **`log2_fold_change` computes `log2(mean₂/mean₁)` on already-log-transformed input.** On the log scale the fold change is the *difference* of means | `backend/core/services/genomics/differential_expression.py:245–262` | Every fold change the genomics module reports is wrong. MKI67 reads +0.23 instead of +0.97. Feeds the volcano-plot output the Methods describe |
| **D2** | **Unmapped `test_type` strings silently pass with confidence 1.0 and zero checks.** `test_type="correlation"` or `"pearson_correlation"` returns `assumptions_checked = []` | `guardian_core.py` | For a platform whose thesis is "validation is the default, not an opt-in", a plausible-looking test name that skips all checks and reports *maximum* confidence is the worst possible failure mode. **Unknown test types must raise, not pass** |
| **D3** | **`Welch's t` is unreachable: `GUARDIAN_TEST_MAP` maps `"welch_t"` → `"t_test"`** | cascade engine | A variance violation on a t-test ends at Mann-Whitney instead of Welch — and Fig 8 shows always-Welch is the best-calibrated arm in every scenario, so this bug costs real accuracy |
| **D4** | **Empty input crashes with an uncaught `IndexError`** (`np.percentile` on a zero-length array) | `guardian_core.py:1329`, reached from `check()` at :520 | The manuscript explicitly claims correct handling of empty arrays. No test covers it |
| **D5** | **Linearity verdict is row-order dependent.** The Wald-Wolfowitz runs test is applied to residuals with **no `observation_order` gate** | linearity validator | Raw CSV order → CRITICAL; shuffled → PASS. This is exactly the arrangement-dependence the paper carefully carves out for the *independence* validator, not applied here |
| **D6** | **`NormalityValidator` returns a mismatched W/p pair** — `statistic` from `data_arrays[0]` but `p_value` as the min across all arrays | `guardian_core.py:1099–1102` | Guardian reports W = 0.9288 (alcohol) with p = 9.5e-36 (quality). Anyone matching a W to its p gets a contradiction |
| **D7** | **Four of Table 2's nine cascade targets have no executor** — Yuen's trimmed t, Welch's ANOVA, robust SE, GLS. Regression routes to Spearman/Kendall, **which cannot return coefficients** | cascade engine | The advertised cascade is substantially aspirational |
| **D8** | **The confidence score is a 4-valued statistic presented as continuous.** Count cancels, so only 1.0 / 0.722 / 0.444 / 0.167 are reachable for uniform severity, and ≥1 violation caps it at 0.722 | `guardian_core.py:987–1025` | The published interpretive bands are unreachable. The code's own docstring warns the thresholds need calibrating |
| **D9** | **`benchmark_api.py` measures a cached path** — one payload re-POSTed 110 times, warm-ups fill the cache, so all 100 measured calls are `_cache_hit=True`. It also conflates the `guardian` and `validate_results` flags, and silently drops non-200 responses | `paper/replication/benchmark_api.py` | Turns a real +4.79 ms Guardian cost into a reported 0.2 ms. One of its four rows now returns HTTP 400 and is dropped rather than failing |
| **D10** | **Calibration scripts overwrite their own shipped artifacts** — results JSON written in place via `Path(__file__).with_name(...)` | `calibration_partA_continuous.py`, `calibration_partB_countglm.py` | Anyone who reruns them to check the paper destroys the reference copy. Add `--out` |
| **D11** | **`fetch_corpus.py` cannot rebuild the corpus it documents** — calls `esearch` against a live, growing index; never reads `manifest.json`; its `DEFAULT_QUERY` has 5 terms where the manifest records 11 | `paper/replication/manuscript_validation/` | Makes Tables 7–8 unreproducible. Fix: efetch the manifest's pinned PMCIDs |
| **D12** | **`render_pdfs.sh` hardcodes `REPO_ROOT` and the Chrome path, and reports success for a figureless PDF** | `paper/render_pdfs.sh` | For anyone who clones the repo the render silently produces a PDF with no figures. Add a post-render assertion that ≥8 image XObjects are embedded |
| **D13** | **Backend `black --check` ends in `\|\| true`** | `.github/workflows/ci.yml` | Formatting is advertised as gated but is not |

**D1, D2, D3 and D4 should be fixed before the software is put in front of reviewers**, independent of the
manuscript timeline — D1 because it produces wrong scientific output, D2/D3 because they defeat the product's
core promise, and D4 because it is a two-second crash any reviewer will find.

---

## An undisclosed runtime LLM dependency

Verified directly, and worth its own section because it is a **disclosure** question rather than a
correctness one.

```
backend/requirements.txt:70   anthropic>=0.39.0  # Claude API SDK for AI Statistical Advisor
ai_service.py:265             DEFAULT_MODEL  = "claude-sonnet-4-20250514"
ai_service.py:266             FALLBACK_MODEL = "claude-3-5-sonnet-20241022"
ai_service.py:272             self.api_key = os.environ.get("ANTHROPIC_API_KEY")
ai_service.py:335             response = self.client.messages.create(model=self.DEFAULT_MODEL, ...)
```

So a **generative LLM is a runtime component of the shipped software**, reached through a paid third-party
API. It degrades gracefully when the key is absent ("AI features will be limited"), so it is optional in
effect — but the dependency is pinned unconditionally in `requirements.txt`.

Against that, the manuscript:

- **Line 330's AI declaration covers only development and manuscript drafting.** It does not disclose that a generative model ships inside the product.
- **Line 111 says "(no language model is used in extraction)"** — narrowly true, since extraction is regex — but placed so as to leave the impression that no LLM is a runtime component at all.
- **Line 269 claims the Advisor "generates publication-ready methods sections"** — an LLM writing Methods text, in a paper whose thesis is reproducibility. A reviewer will ask about non-determinism.
- **Line 326 declares "Any restrictions to use by non-academics: None"** — the Advisor needs a paid API key.
- The Advisor appears **nowhere in the Results**: not in the architecture paragraph, not in "Additional analysis modules", not in Table 3, not in the Introduction's capability list. It surfaces only in the Discussion and in the duplicate Fig 1 legend ("AI advisor") — which the *inline* Fig 1 caption omits.

Nobody hid this — the dependency sits in `requirements.txt` with an explanatory comment. But BMC/Springer
Nature has an explicit AI policy, and the paper's own disclosure section is incomplete against it.

**Two clean options:** (a) delete the Advisor clause from the Discussion, or (b) describe it properly —
Anthropic Claude API, requires a user-supplied `ANTHROPIC_API_KEY`, optional and disabled by default,
non-deterministic output requiring author review, no validation claimed. Either way, amend line 330 to
disclose the runtime model and line 326 to note the API-key requirement.

---

## Round 2 — `similar_shapes` implemented, and four defects of the same class found behind it

Requested as "fix the `similar_shapes` defect too before we tag v1.2.0". Fixing it exposed four more
instances of the same failure mode — *something reported as verified that was never verified* — plus one
live regression introduced by the preceding hardening pass. Every number below was executed in this
session; none is carried over from a document.

### What was fixed

| # | Defect | Evidence it was real | State now |
|---|---|---|---|
| 1 | `similar_shapes` declared but not implemented | normal-vs-exponential, 100× spread, bimodality, extreme skew → **all zero violations, confidence 1.000**, with `similar_shapes` listed as checked | `SimilarShapesValidator`: KS on median-centred groups, Bonferroni across pairs. 19 tests |
| 2 | **Any** requirement could be declared without an implementation and be silently skipped | `check()` reads `if req in self.validators`; `assumptions_checked` is built from the *requirements* list, so the two can disagree | `_assert_every_requirement_is_implemented()` refuses to construct a `GuardianCore` with a declared-but-unimplemented requirement |
| 3 | **Cascade engine failed open on a Guardian exception** | `passed = True` was the initial value and was only lowered inside `if guardian_report:`, so a Guardian crash produced `CascadeStep(guardian_passed=True)` and ran the test. Survived the first mutation round with **no test covering it at all** | Client errors propagate; internal errors return `assumptions_satisfied=False`, `confidence_score=0.0`, and a violation stating the assumptions were not verified |
| 4 | `manova` absent from `test_requirements` | The MANOVA screen received zero checks and confidence 1.000 and rendered an all-clear having verified nothing; after the hardening pass it received **HTTP 500** | Registered with the univariate assumptions it can genuinely evaluate, and the screen now states that multivariate normality and Box's *M* are **not** assessed |
| 5 | Client errors returned HTTP 500; `requirements/<test_type>/` 404'd for every alias | Executed: `welch_t`, `students_t`, `mann_whitney_u` all 404 there while running fine through `check()` | 400 for bad input with the actionable message; the requirements endpoint canonicalises, so all aliases resolve and only genuine nonsense 404s |
| 6 | An existing test **asserted the defect as the specification** | `test_unknown_test_type_runs_without_checks` asserted `confidence_score == 1.0` for an unknown test type | Replaced with the inverted assertion, plus a companion test that legitimate aliases still resolve |

### Calibration of the one new threshold, and why it is not a made-up number

`D_SUBSTANTIAL = 0.161` is the only constant introduced. KS's *D* has no conventional effect-size scale, so
it was anchored to the thresholds the sibling `VarianceHomogeneityValidator` already uses after Box (1954),
by measuring where those variance ratios land on the *D* scale at n = 10⁶ per group:

```
D = 0.002  identical normals        D = 0.162  SD ratio 2   <- Box warning cut
D = 0.031  normal vs t(5)           D = 0.174  normal vs lognormal(0,1)
D = 0.057  normal vs uniform        D = 0.244  normal vs exponential
D = 0.097  SD ratio 1.5             D = 0.291  SD ratio 4   <- Box "not robust" cut
                                    D = 0.500  unimodal vs strongly bimodal
```

Part 6 of `paper/replication/guardian_validator_evidence.py` re-measures this on every run and asserts the
constant still matches the ratio-2 row within 0.01.

### Three things I got wrong in this round, corrected before they shipped

1. **I nearly removed the Bonferroni correction.** Measuring family-wise error at k = 6, n = 100 gave 4.5%
   uncorrected — close enough to nominal that the correction looked like dead weight costing power. Measuring
   the full grid showed it is load-bearing: uncorrected error reaches **13.8% at k = 10, n = 150 and 18.4% at
   k = 10, n = 500**. The correction stayed. One measurement was not enough to justify removing a safeguard.
2. **I wrote a reproducibility pointer I had not earned.** The code comment said "Reproduce with
   `paper/replication/guardian_validator_evidence.py`" before that script contained the calibration. Caught
   when the user asked whether anything was hardcoded. The section was then written, so the claim is now true.
3. **I nearly claimed the shape check closes the cascade's calibration gap.** It sounded right — the gap is
   heteroscedastic non-normal genes routed to Mann-Whitney, which is exactly what a shape check should catch.
   Measured: at the benchmark's sample sizes (n = 12 vs 24) it fires in **0.5% of 200 replicates**, reaching
   67% only at n = 40 per group. The claim was false and is now a disclosed limitation instead.

### Mutation testing

Eight mutations, each grep-confirmed to have applied before the suite was run. First round caught 4 of 8.
The four that got through were diagnosed rather than waved away: **two were vacuous tests** (a NaN assertion
guarded behind `if not violated`, and a false-positive-rate test at a k where the uncorrected rate is
indistinguishable from the corrected one) and **two were broken mutations** (one produced a `SyntaxError`,
one did not actually restore the fail-open). Tests rewritten, mutations fixed: **8 of 8 caught.**

### Suite

`manage.py test`: **1,405 tests, OK** (from 1,380 with 1 error at the start of this round). Guardian-specific:
148. ESLint clean on the modified `.jsx`. `build_bmc_docx.sh` passes all five assertions.

---

## Round 3 — a pre-tag audit of the whole changeset, before it became a citable release

Before committing, the entire 64-path working tree was audited by six independent read-only
reviewers over non-overlapping slices, every finding then put to a skeptic instructed to refute it
by execution. The reason for auditing at this point rather than earlier: the commit was about to
become tag **v1.2.0**, be archived to Zenodo, and be cited by the manuscript. Everything below was
re-executed by hand before being accepted; several reviewer claims were checked and one of my own
readings of the evidence was wrong (see the note on figure hashes).

### Regressions the previous round introduced, found here

| Location | Defect | Evidence |
|---|---|---|
| `cascade_engine.py` | Re-raising client errors let a test name **Guardian itself recommended** escape as an unhandled exception. `CASCADE_ALTERNATIVES` contains `permutation_test` and Guardian's `alternative_tests` suggests `distance_correlation`; neither is in Guardian's vocabulary | Executed: `execute_with_cascade(<outlier data>, "pearson")` raised `UnknownTestTypeError: … 'distance_correlation'`, likewise for `linear_regression` and `spearman`. Fixed by filtering candidates through `_guardian_can_check`; the caller's own typo still raises |
| `SimilarShapesValidator` | The `<2 groups` branch omitted `not_applicable`, so a check that never ran was audited as **`result="pass"`** with confidence 1.0 — the exact defect the validator was written to remove, reintroduced in its own no-op branch | Executed: `check({"a": …}, "mann_whitney")` → audit `('similar_shapes', 'pass')`. Also reachable for **any paired design**, where the arrays collapse to one before the loop |
| `guardian_core.py` | An unescaped `<` in the new recommendation string broke the PDF export | Executed: `POST /api/guardian/export/pdf/` with a Mann-Whitney and n = 3 → **HTTP 500**, `paraparser: syntax error`. reportlab parses these strings as mini-XML. Rewritten as prose with no markup-hostile characters |
| `differential_expression.py` | Making `input_scale` required broke **three replication scripts** that a reviewer would run: `calibration_partA_continuous.py`, `calibration_partB_countglm.py`, `independence_permutation_sensitivity.py` all call `Service(alpha=…, normality_alpha=…)` | Executed: `TypeError: __init__() missing 1 required positional argument: 'input_scale'`. All three feed log2-CPM, so `input_scale="log2"` was added. Verified it changes no published number: `input_scale` is read only by `_compute_log2_fold_change`, and none of the three scripts references a fold change |
| `api/v1/views.py` | The new CI code emitted a **zero-width "95% CI"** on degenerate input | Executed: `data1=[5]*5, data2=[7]*5` → `t_statistic` and `p_value` `None` (correctly undefined) but `ci_lower = ci_upper = "-2.000…"` — an interval excluding 0 for a statistic that does not exist. Cohen's d already refused on this input; the interval did not |
| `guardian_core.py` | A comment asserted `manova` is "deliberately absent" and raises — 70 lines after I had registered it | Executed: `_canonical_test_type('manova')` → `'manova'`, no raise. A false statement about assumption coverage inside the archived source |

### Pre-existing defects of the same class, surfaced by the audit

| Location | Defect | Evidence |
|---|---|---|
| `guardian_core.py` | A chi-square whose table is **not declared** under an explicit key fell through to the numeric path, where `expected_frequencies` was skipped — yet still appeared in `assumptions_checked` | Executed on the same 2×2 both ways: `check([[[1,2],[3,4]]], …)` → 0 violations, **confidence 1.000, can_proceed True**; `check({"observed": [[1,2],[3,4]]}, …)` → critical, 0.167, blocked. Every expected count is ≈2.5, so Cochran's rule is grossly violated. `ClaimDataSpec.as_engine_data()` produces the undeclared shape, so the **manuscript verifier** certified Cochran-violating chi-squares as clean. Now warns explicitly and drops the false claim, without blocking the cascade's legitimate raw code vectors |
| `assumption_checker.py` | Levene returns **NaN** on zero-variance groups; `NaN > alpha` is `False`, so the assumption was recorded as VIOLATED from a comparison against a number that does not exist — and the NaN reached DRF's renderer | Executed: the t-test endpoint raised `ValueError: Out of range float values are not JSON compliant`, i.e. **HTTP 500**. Now recorded as not computable, with a `_json_safe` boundary so no non-finite float can 500 the endpoint again |
| `differential_expression.py` | With **3+ groups** every gene reported `log2_fold_change = 0.0` **and `mean_group1 = mean_group2 = 0.0`** | Executed on log2 data with means ≈ 8: all three fields 0.0 for every gene on the ANOVA path. Not an absence — a claim that the means are zero. Defaults changed to `None` |
| `api/v1/views.py` | `confidence_level` arrives on **two contradictory scales**: `TTestRequestSerializer` declares it a percent string (and derives it from `alpha` as `(1-alpha)*100`), `CorrelationRequestSerializer` a fraction | Executed: `confidence_level: 99` → `ci_lower = ci_upper = "NaN"` with HTTP 200 and `ci_level` echoed as 99.0. Now normalised, so 99 and 0.99 give the identical interval |
| `generate_figures.py` | `ax.boxplot(labels=…)` was **removed** in matplotlib 3.11 | Executed on the pinned 3.11.0: hard `TypeError`. `__main__` calls the figure functions in sequence with no error handling, so the documented `python generate_figures.py` died at fig3 and never reached fig4–fig6. Fixed to `tick_labels=` and confirmed fig3 renders identically to the tracked version |
| `.zenodo.json` | The deposit description — which **populates the archive record the manuscript cites** — said "eight validators" and omitted `similar_shapes` | Executed: registry has 9 keys. Would have been the only artifact still saying eight |

### Documentation errors, all executed against the files they describe

`SUBMISSION_GUIDE.md` and `BIORXIV_V2_UPLOAD.md` both directed the reader to
`BMC_SUBMISSION_STEPS_2026-08-04.md`, **a file that has never existed in this repository**
(`git log --all --diff-filter=A` finds no such path); the real file is
`paper/bmc_bioinformatics/SUBMISSION_STEPS.md`. This document claimed the `.docx` embeds **8**
figures when the artifact contains 7 and this document says so 15 lines later. Its "Still blocking"
list was **8-of-11 stale**, including "Additional file 1 does not exist" for a file that does.
`docs/README.md` said Case Studies 1 and 3 "came back clean" when this ledger's own checkpoint
heading reads "every statistic reproduces; **the Guardian paragraph does not**", and misattributed
that failure to Case Study 2. All corrected.

### Test quality: 16 further mutations, 6 initially surviving

An independent reviewer applied 16 mutations across the eight changed test files (all four mutated
production files restored byte-identically, shasums re-verified). Ten were caught; **six were not**,
and the two most consequential were:

- **Nothing pinned the confidence score's independence from the violation COUNT.** That property —
  one critical and five criticals both scoring 0.167 — is the documented core of the formula and a
  headline number in the manuscript's case studies. Mutating the denominator to be count-sensitive
  passed all 98 Guardian tests, because the existing tests only ever build single-violation lists.
  Now covered, and the new tests catch the mutation (16 failures). Writing them also revealed that
  the implementation **rounds to three decimals**, which nothing had recorded.
- **`confidence_level` was never exercised at a non-default value**, so hardcoding it to 0.95 passed
  — a 95% interval under a "99%" heading, the same failure mode as the dropped `equal_variance` and
  `alternative` flags. Note that asserting "the percent form equals the fraction form" does *not*
  close this: if the level were hardcoded both would be 95% and still agree. The test now checks the
  half-width against `scipy.stats.t.ppf` at three levels.

Also `CACHE_SCHEMA_VERSION` was bumped **5 → 6**. The t-test response changed for unchanged request
bodies, and without the bump Redis would have re-served the fabricated interval for an hour.

### A reading error of my own, corrected

I briefly concluded that a regenerated figure had been reverted to its old 8-validator version,
because I mapped the two hashes from `md5 -q file1 file2` in the wrong order. Re-checking both files
directly showed they were byte-identical to the regenerated 9-validator figure, which I had already
viewed. Recorded because misreading one's own verification output is the failure mode this whole
exercise is built to catch.

### Still open, and it is a submission-quality issue rather than a defect

Fig. 5 panel B (the forest plot) has **pre-existing legibility problems**: the confidence-interval
lines strike through several study labels (Shechter 1989, Ceremuzynski 1989, Bertschat 1989,
Pereira 1990, Shechter 1991), and the "Guardian: Publication bias" annotation box overlaps the
Feldstedt 1988 row. Confirmed pre-existing by rendering the tracked version and the regenerated one
side by side — they are visually identical. A reviewer will notice struck-through study names.

### Suite

`manage.py test`: **1,424 OK** (1,380 with one error at the start of this session).

### Round 3 addendum — two findings from the verification pass itself

The skeptic pass on the chi-square finding reported it as **worse** than first stated: reachable
through the production endpoint with an ordinary payload, `POST /api/guardian/check/` with
`{"data": [[1,2],[3,4]], "test_type": "chi_square"}`, returning HTTP 200 and
*"All assumptions satisfied. Safe to proceed with analysis."* on a table whose every expected count
is 1.2. Re-executed after the fix: all four routes (`chi_square`, `chi_square_independence`, `chi2`,
`fisher_exact`) now return confidence 0.444 with an explicit "NOT evaluated" warning and no claim
that the rule was checked. It also noted that `_serialize_report` never emits `audit_trail`, so the
`"skipped"` marker never reached the client — which is why the report looked clean rather than
merely incomplete.

On the PDF export it made a better point than the original finding: escaping the one offending
string leaves the trap armed, because `report_generator.py` interpolates `test_name`, `message` and
`recommendation` into reportlab mini-XML with **no escaping anywhere in the file**, and the endpoint
has **zero test coverage** in the whole repository — which is why the string shipped. The escape is
now applied at that single convergence point rather than in the validators, whose job is to write
the clearest sentence for a human.

Writing the test for it produced a **surviving mutation on the first attempt**: removing the escaping
left the suite green. The cause was the test data, not the fix. Fed to a bare `Paragraph`, reportlab
tolerates a closed unknown tag (`A <test> & another` renders) and a spaced `value < 5`; what raises
is `<` immediately followed by text and never closed — the real `P(X<Y) != 0.5`, and a real tag name
left open, `the <b thing`. The test now uses those shapes across all three fields and catches the
mutation. A plausible-looking string proved nothing.

Suite after these: **1,427 OK**; 160 Guardian-specific backend tests.
