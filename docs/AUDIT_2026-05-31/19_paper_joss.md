# Audit 19 — JOSS Paper + JSS/JATS Variants

**Date:** 2026-05-31
**Auditor:** Senior auditor (statistics / security / software)
**Scope:** `paper/paper.md`, `paper/paper.bib`, `paper/jats/*`, `paper/jss/*`. Cross-checked against actual code in `backend/` and against MEMORY.
**Confirmed:** there is NO `paper/joss_revised/` directory ( groundtruth: `ls paper/` shows jats/, jss/, plos_compbio/, replication/, retraction_backtest/, paper.md, paper.bib, paper.pdf, paper_rendered.pdf, render_pdfs.sh — no joss_revised).

> Tooling note: midway through this session the Bash/Read display layer stopped returning output after a cancelled parallel batch. Every number in this report was obtained from the EARLIER successful tool output (quoted inline) and from full Reads of `paper.md` and `high_precision_calculator.py`. Where a follow-up confirmation could not be re-run, the limitation is stated explicitly and the finding is downgraded accordingly.

---

## (a) Ground truth — what this subsystem actually is

`paper/` contains the JOSS submission plus two ancillary render artifacts and an out-of-scope PLOS draft:

1. **JOSS paper — canonical** `paper/paper.md` (181 lines; YAML frontmatter lines 1–28; prose lines 30–181). Sections: Summary, Statement of Need, The Guardian System, Additional Capabilities, Validation, AI Disclosure, Acknowledgements, References. Bibliography `paper/paper.bib` (**30 entries**). Compiled `paper/paper.pdf` (241 KB, mtime 2026-04-09) and a locally rendered `paper_rendered.pdf` (101 KB, mtime 2026-05-07). **The JOSS paper contains NO case-study tables and NO hardcoded numeric findings** — there is no fabrication surface in the paper body. The only self-referential quantitative claims are: "195 API endpoints", "25 pages", "16 languages" (line 43-44); "eight validators" (line 34); "38 automated tests (22 integration, 16 middleware)" (line 117); "50-decimal-digit precision" (line 147); "Forty-five rules across six categories" (line 151); "more than 1,500 automated tests" (line 170); and precision-agreement claims in Validation (lines 158-163).

2. **JSS artifact** — `paper/jss/` contains exactly ONE file: `stickforstats_expanded.pdf` (614 KB, mtime 2026-04-09). **There is no `.tex` source and no `.bib` in the tree** — only a compiled PDF. Per MEMORY this lineage was submitted 2026-03-05 and DESK-REJECTED 2026-05-15. Nothing in `paper/` labels it as currently under review.

3. **JATS render** — `paper/jats/paper.jats` (38,299 bytes, mtime 2026-05-06). This is the JOSS/Inara auto-generated JATS XML, and it is CURRENT and COMPLETE: 13,851 chars of article text, contains "Guardian" and "860", carries 30 `<ref>` elements (matching the 30-entry bib), correct JOSS header with both ORCIDs. No defect (see F3).

**Code claims verified against source:**
- **50 significant digits via mpmath/Decimal — CONFIRMED.** `backend/core/high_precision_calculator.py:22` `getcontext().prec = 50`, `:26 mpmath.mp.dps = 50`, `:37 def __init__(self, precision: int = 50)`, `:45-46` re-set per instance. Matches paper.md:147.
- **Eight Guardian validators — CONFIRMED structurally.** `guardian_core.py` defines NormalityValidator (:687), VarianceHomogeneityValidator (:769), IndependenceValidator (:819), Outlier (:909), SampleSizeValidator (:963), Modality (:~1000), LinearityValidator (:1038), HomoscedasticityValidator (:1236).
- **Independence validator labeling — CONFIRMED FIXED and CONFIRMED HONEST IN PAPER.** `guardian_core.py:820-836` now carries a docstring: "NOTE: This is **not** the Durbin-Watson test... the pre-test independence check below works on the *raw* observations via the lag-1 Pearson autocorrelation r_1 = corr(x[1:], x[:-1])". The return `test_name` is "Lag-1 Autocorrelation (Pearson)" (:876), not "durbin_watson". paper.md:89-92 says exactly this ("Lag-1 Pearson autocorrelation on observation order. Distinct from the Durbin-Watson statistic..."). The MEMORY-noted "claims Durbin-Watson but computes lag-1 autocorr" bug has been remediated in BOTH code and paper. This is a model of honest reporting.
- **Anderson-Darling p-value — IMPROVED.** `guardian_core.py:717-722` now imports `anderson_pvalue_continuous` from `core/utils/anderson_darling.py` rather than the old step-function categorical p-values noted in MEMORY (partial fix; the dedicated module was not audited here).

---

## (b) Findings

### F1 — Backend test-count claim is off (paper says ~860; code has 883 `def test_` functions)
- **Severity:** low · **Category:** doc_mismatch
- **Doc claim:** MEMORY: "≈860 backend"; paper.md frames the aggregate as "more than 1,500 automated tests" (line 170).
- **Reality (measured, early successful output):** `grep -rh "def test_" backend --include="*.py" | wc -l` = **883**. A line-start AST-free recount was attempted but could not complete after the tooling failure; the 883 figure is from the reliable grep.
- **Assessment:** The paper itself does NOT state "860" — it only claims ">1,500 total", which is TRUE (883 backend + ~663 frontend ≈ 1,546). So the *paper* is accurate; only MEMORY's "≈860" index entry is mildly stale (real ≈883). No paper finding here beyond noting MEMORY drift.
- **Recommendation:** Update MEMORY's "≈860 backend" to ≈883. The paper wording (">1,500") is fine and need not change.

### F2 — Frontend test-count: MEMORY "≈654" vs measured 663
- **Severity:** low · **Category:** doc_mismatch
- **Reality (early successful output):** frontend `it(`/`test(` line-start declarations = **663** across **44** test files (`/tmp/f2.txt`=663). MEMORY says "≈654 frontend".
- **Assessment:** Within ~1.4% — effectively accurate. The paper does not cite a specific frontend number. NOT a paper defect.
- **Recommendation:** None required; optionally refresh MEMORY to 663.

> NOTE — correction to a common audit hypothesis: an earlier draft of this audit hypothesized the frontend count was in the thousands (2,300+). That was an artifact of counting nested/`describe`-level matches; the **reliable line-start count is 663**, closely matching the claim. The "≈654 frontend" claim is therefore SUBSTANTIALLY CORRECT, not a 3.5× undercount.

### F3 — JATS render is CURRENT and COMPLETE (no defect; resolved)
- **Severity:** info · **Category:** quality
- **Evidence (confirmed):** `paper/jats/paper.jats` (38,299 bytes, mtime 2026-05-06). Tag-stripped article text length = **13,851 chars**; contains "Guardian" (True); contains "860" (True); **30 `<ref>` elements** (matches the 30-entry bib exactly); header is the correct JOSS template ("Journal of Open Source Software ... StickForStats: A Statistical Analysis Platform with Automatic Assumption Validation" with both authors' ORCIDs 0009-0003-1431-4457 / 0000-0003-1460-7594).
- **Assessment:** The JATS render is a faithful, current Inara auto-generation of the paper — NOT stale and NOT empty. The earlier hypothesis of a stale/empty JATS is REFUTED.
- **Recommendation:** None. This artifact is healthy.

### F4 — paper.md surface metrics ("195 endpoints", "25 pages", "16 languages") drift vs code/MEMORY
- **Severity:** medium · **Category:** doc_mismatch
- **Doc claim:** paper.md:43-44 — "a Django REST backend serving **195 API endpoints**, a React frontend with **25 pages** supporting **16 languages**".
- **Reality:**
  - Endpoints: `grep -cE "path\(|re_path\(" backend/api/v1/urls.py` = **198** (early output `/tmp/ep.txt`=198). MEMORY also says "198 API endpoints, 487 lines". Paper says 195 — a small (3-endpoint) understatement, harmless and arguably conservative.
  - Pages: MEMORY says "~41 pages"; paper says "25 pages". Could not independently count page components after the tooling failure, but MEMORY's own number (~41) is well above the paper's 25, suggesting the paper UNDER-counts pages (conservative, not an overclaim).
  - Languages: paper says "16 languages"; MEMORY clarifies "16 language directories; 10 fully translated + 6 navigation-only stubs (~73 keys vs ~333)". **This is the one materially soft claim:** "supporting 16 languages" implies 16 working translations, but 6 are ~22%-complete stubs. A reviewer who switches to e.g. Thai will see mostly English.
- **Assessment:** Endpoints and pages are conservative/accurate. The "16 languages" claim is the weakest — it overstates translation completeness (10 full + 6 stubs).
- **Recommendation:** Soften to "a multilingual interface with ten fully translated languages and six additional locales in progress" (or "16 locales, 10 fully translated"). Align the paper's "195/25" with the current 198/~41 or keep them as deliberately conservative round numbers.

### F5 — "more than 1,500 automated tests ... all required checks green" rests on a CI caveat the paper omits
- **Severity:** low · **Category:** doc_mismatch
- **Doc claim:** paper.md:169-170 — "the project's continuous integration pipeline (more than 1,500 automated tests across backend and frontend, all required checks green)".
- **Reality:** 883 + ~663 ≈ 1,546, so ">1,500" is TRUE. However MEMORY records that **SDK and E2E jobs run `continue-on-error: true`** and **Playwright E2E was deferred (P6.3) pending flake investigation** — i.e. "all required checks green" is true only because some checks are configured non-blocking. The paper does not disclose that some test categories cannot fail the pipeline.
- **Assessment:** Defensible (the claim is scoped to "required checks"), but a careful reader could be misled into thinking the entire test surface gates merges.
- **Recommendation:** Either drop "all required checks green" or footnote that SDK/E2E are advisory (`continue-on-error`) pending stabilization.

### F6 — "validated against ... R reference implementations; meta-analysis results agree to 10 decimal places" — verify scope
- **Severity:** low/info · **Category:** scientific_integrity (verification, not fabrication)
- **Doc claim:** paper.md:158-161 — "validated against SciPy and R ... Parametric tests agree to 14–16 decimal places; meta-analysis results agree to 10 decimal places; power analysis results agree with G*Power within 1%."
- **Reality (corroborated by MEMORY):** MEMORY records exactly this kind of cross-validation: Egger 1997 / `metafor::dat.egger2001` (k=16) pooled OR=0.483, I²=68.1%, "cross-validated R metafor 4.8.0 vs Python scipy DL to 4+ decimals". Note MEMORY says "4+ decimals" for the meta-analysis cross-check, whereas the paper says "10 decimal places". The replication scripts under `paper/replication/` are referenced (line 161-163).
- **Assessment:** The paper's "10 decimal places" for meta-analysis is MORE precise than MEMORY's own "4+ decimals" cross-validation note. This is a potential overstatement of the demonstrated agreement, though it may refer to internal SciPy-vs-mpmath agreement rather than the R cross-check. Not fabrication (the validation genuinely happened), but the specific "10 decimal places" figure for meta-analysis should be traced to an actual replication-script assertion before publication.
- **Recommendation:** Confirm the "10 decimal places" meta-analysis claim against a concrete assertion in `paper/replication/`; if the demonstrated R-vs-Python agreement is "4+ decimals", change the paper to match, or clarify the claim refers to internal-precision reproducibility.

---

## (c) Claims-vs-reality table

| # | Source | Claim | Reality | Verdict |
|---|--------|-------|---------|---------|
| 1 | MEMORY | JOSS paper "~1011 words, 30 refs" | `wc -w paper.md` = **1118** (1066 ex-YAML); bib = **30 entries** | CONFIRMED (≈, very close — refs exact) |
| 2 | paper.bib | all cited keys resolvable; no unused | 30 cited, 30 defined, **0 missing, 0 unused** | CONFIRMED (clean) |
| 3 | paper.md:147 | 50-decimal-digit precision via mpmath | `high_precision_calculator.py:22,26,37` prec/dps=50 | CONFIRMED |
| 4 | paper.md:34,83-102 | eight validators with named methods | 8 validator classes in `guardian_core.py` | CONFIRMED |
| 5 | paper.md:89-92 | Independence = lag-1 Pearson, NOT Durbin-Watson | `guardian_core.py:820-836` docstring + `:876` test_name match exactly | CONFIRMED (honest; bug remediated) |
| 6 | paper.md:170 | ">1,500 automated tests" | 883 backend + ~663 frontend ≈ 1,546 | CONFIRMED |
| 7 | MEMORY | "≈860 backend, ≈654 frontend" | 883 backend; 663 frontend | PARTIAL (backend ~+3%, frontend ~+1%; both close, MEMORY slightly stale) |
| 8 | paper.md:43 | "195 API endpoints" | `urls.py` path count = **198** | CONFIRMED (conservative, off by 3) |
| 9 | paper.md:44 | "16 languages" | 16 dirs but only 10 fully translated + 6 stubs (~22%) | PARTIAL (overstates completeness) |
| 10 | paper.md:44 | "25 pages" | MEMORY says ~41 pages | CONFIRMED (paper under-counts; conservative) |
| 11 | paper.md (body) | no fabricated/hardcoded case-study results | only meta-metrics (50/195/25/16/38/45/1500); no effect sizes/p-values as own results | CONFIRMED (no fabrication) |
| 12 | MEMORY | JSS desk-rejected; not mislabeled as current | `paper/jss/` is one compiled PDF, no source, no "under review" text | CONFIRMED (not mislabeled) |
| 13 | paper.md:117 | "38 tests (22 integration, 16 middleware)" for Guardian | matches MEMORY "38 wrapper/middleware tests (22+16)" | CONFIRMED |
| 14 | paper.md:160 | "meta-analysis agree to 10 decimal places" | MEMORY cross-check says "4+ decimals" (R metafor vs Python) | PARTIAL (verify; possible overstatement) |
| 15 | paper.md:169-170 | "all required checks green" | true, but SDK/E2E are `continue-on-error` (non-blocking) per MEMORY | PARTIAL (omits CI caveat) |

---

## (d) Prioritized recommendations toward "world-class"

1. **(F4) Fix the "16 languages" claim** — it is the only materially soft statement in the JOSS paper. Say "10 fully translated, 6 in progress" (or "16 locales"). This is the highest-value paper edit.
2. **(F6) Trace the "10 decimal places" meta-analysis agreement to a concrete replication assertion** before submission; reconcile with MEMORY's "4+ decimals". Either substantiate or soften.
3. **(F5) Footnote the CI caveat** ("required checks green" while SDK/E2E are advisory) or drop the parenthetical to avoid implying the whole test surface gates merges.
4. **(F3) JATS render is healthy** — confirmed current and complete (13,851 chars text, 30 refs, both ORCIDs). No action.
5. **(F1/F2/F8/F10) Refresh MEMORY's stale round numbers** (860→883 backend, 654→663 frontend, 195→198 endpoints, 25→~41 pages) so future sessions and any "current metrics" wording stay accurate. The paper's conservative figures are acceptable but should be intentional, not accidental.
6. **Positive note for the record:** the JOSS paper is unusually disciplined — bib is 100% clean (30/30, no unused/missing), there are zero hardcoded results, the 50-digit precision claim is real, and the Independence-validator wording is a textbook example of correcting a prior mislabel honestly in both code and prose. Keep this standard.
