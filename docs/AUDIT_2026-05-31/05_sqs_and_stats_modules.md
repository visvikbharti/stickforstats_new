# Audit 05 — SQS Rules + Statistical Service Modules (sweep)

Date: 2026-05-31
Auditor: senior skeptical auditor (statistics / security / SWE)
Scope: `backend/core/sqs_rules.py`, `backend/core/sqs_scoring.py`,
`backend/api/v1/sqs_views.py`; sweep of `backend/core/services/{anova,bayesian,
causal,mixed_models,multivariate,nonparametric,regression,time_series,power,
genomics,analytics,data_processing}/`.

Method: read the code, quote it, and where cheap verify behavior with read-only
`python3` (no project files modified, no servers run). Findings carry concrete
`file:line` evidence.

NOTE ON CORRECTIONS: an intermediate pass produced two false findings (a
"mann_whitney shadowed by pass-stub" and "all engine services are dead code").
Both were artifacts — a stale /tmp extract and a broken `--include=*.py` glob
under zsh. Re-verified directly against the files: `mann_whitney_u_test` is
defined exactly once with a full body, and the engine services ARE wired to API
views. Those two findings are RETRACTED below and do not appear in the final
finding list. This is recorded for transparency.

---

## (a) GROUND TRUTH — what this subsystem actually is

### SQS (Statistical Quality Score)
A **regex-based manuscript reporting-quality scorer**, not a statistical
calculator. Three files:

- `sqs_rules.py` (700 lines): **45 rule dicts** in 6 lists compiled into
  `ALL_RULES`. Each rule = `{id, name, description, pattern (regex), category,
  points, severity, recommendation, examples}`. Six categories with declared
  `max_points` 20/15/15/15/20/15 = **100**. Field-weight table for psychology /
  medicine / biology / ecology / economics / general.
- `sqs_scoring.py` (583 lines): `SQSScorer.analyze()` runs each rule's regex over
  preprocessed text via `re.findall`, awards points on match, sums per category
  with a field-weight multiplier, caps each category at its weighted max, maps
  the total percentage to an A–F grade, emits text/HTML/journal reports.
- `sqs_views.py` (383 lines): 7 DRF `APIView`s. All `AllowAny` (public).

Confirmed counts (read-only):
```
TOTAL_RULE_DICTS 45
CATEGORY_COUNTS {effect_sizes:11, assumptions:8, sample_power:6, precision:8, reproducibility:7, guidelines:5}
SEVERITY_COUNTS {important:26, suggested:13, critical:6}
CATEGORIES_MAX_POINTS_DECLARED [20,15,15,15,20,15]  (sum 100)
```
Functional smoke test: a well-reported manuscript scores 82.4 % / grade B; pure
filler text scores 0 % / grade F. The rules are statistically meaningful (Cohen's
d, η², CIs, power analysis, Shapiro-Wilk, exact p-values, data-availability,
multiple-comparison correction, etc.), not arbitrary.

### Statistical service engine modules (`backend/core/services/*`)
A large library of **real** scientific implementations (numpy/scipy/statsmodels/
sklearn). ANOVA, nonparametric, power, multivariate, causal, mixed models,
regression, time series, Bayesian, genomics, analytics, data-processing. Per-file
sweep confirmed substantive method counts and scientific imports.

**These ARE wired to live API views** (confirmed):
- `core.services.nonparametric.NonParametricService` ← `api/v1/nonparametric_view.py:14`
- `core.services.anova.AdvancedANOVAService` ← `api/v1/ancova_view.py:13`
- `core.services.power.PowerAnalysisService` ← `api/v1/power_analysis_view.py:13`
- `core.services.multivariate` ← `api/v1/multivariate_view.py:14` (BROKEN — see F1)
- `core.services.genomics.DifferentialExpressionService` ← `api/v1/genomics_views.py`
All five are registered in `api/v1/urls.py` (nonparametric 4 refs, ancova 2,
power 12, multivariate 4, genomics 6). So this is a real, exposed statistical
service layer — not dead code.

### Genomics (paper Case Study 4) — verified real
`genomics/differential_expression.py` (546 lines) implements a genuine per-gene
DE pipeline with Guardian-style assumption gating: Shapiro-Wilk + Levene per
gene, cascade to Welch / Mann-Whitney / Kruskal-Wallis on violation, delta-method
log2FC, and Benjamini-Hochberg FDR. I validated the BH implementation against
`statsmodels.multipletests(method='fdr_bh')` (exact match). It is consumed by
`genomics_views.py`, `test_genomics_silent_failures.py`, and the two Case Study 4
scripts. Notably, on test failure it emits NaN + `test_failed=True` rather than
silently substituting `(0.0, 1.0)` — a documented anti-fabrication fix
(`differential_expression.py:34-41`). Numbers are code-produced, not fabricated.

NOTE: the genomics module is a t-test/ANOVA-cascade DE pipeline with BH FDR; it
is NOT a true DESeq2 negative-binomial/GLM model (no size-factor normalization,
no NB dispersion). The module docstring and Case Study framing call it
"differential expression with Guardian validation," which is accurate; any doc
that calls it "DESeq2-style" would be an overstatement.

---

## (b) FINDINGS

### F1 — `multivariate` service package raises ImportError on load; the multivariate endpoint is broken (HIGH, bug)
`backend/core/services/multivariate/__init__.py`:
```
from .multivariate_service import MultivariateService
try:
    # Backward-compat alias: some callers import PowerAnalysisService from here
    from .multivariate_service import PowerAnalysisService
except ImportError:  # pragma: no cover
    pass
from .multivariate_service import PowerAnalysisService   # <-- line 10, UNGUARDED
__all__ = ["MultivariateService"]
```
`multivariate_service.py` defines `MultivariateService` (line 90) and
`MultivariateResults` (line 32) — there is **no** `PowerAnalysisService`. The
guarded import at the top swallows the error, but the **unguarded** import on
line 10 re-raises it. Verified at runtime:
```
from core.services.multivariate import PowerAnalysisService
-> ImportError: cannot import name 'PowerAnalysisService' from
   '...multivariate.multivariate_service'
```
`api/v1/multivariate_view.py:14` does exactly `from core.services.multivariate
import PowerAnalysisService`, so importing the multivariate view module fails →
the multivariate endpoint (registered in urls.py) is dead on arrival. This is a
copy-paste error: the import name is wrong (should be `MultivariateService`) and
the redundant line 10 defeats the very try/except meant to guard it.
Recommendation: delete line 10; fix `multivariate_view.py:14` to import
`MultivariateService`; add a smoke test that imports each engine view module.

### F2 — SQS category scores/percentages can go negative; "0–100 scale" docstring violated (MEDIUM, statistical-correctness / doc-mismatch)
`sqs_rules.py:339` defines PR002 with `"points": -2, "is_penalty": True`. 
`sqs_scoring.py:174` caps the **high** end (`final_score = min(weighted_score,
weighted_max)`) but never floors the **low** end at 0.
Verified: a manuscript whose only precision signal is `p < .05` yields
`precision score = -2.0`, `percentage = -13.33 %`. This violates
`sqs_scoring.py:7` ("The SQS ranges from 0-100") and `sqs_rules.py:16`
("Total: 100 points").
Recommendation: `final_score = max(0.0, min(weighted_score, weighted_max))` and
floor percentage at 0.

### F3 — Field weighting makes `max_score` exceed 100, contradicting the "0–100 / Total 100" claim (MEDIUM, doc-mismatch)
`sqs_scoring.py:170-171` multiplies both score and max by the field weight. For
`field="psychology"` the reported `max_score` is **109.6**, not 100, and
`total_score` is on that inflated scale. The grade uses the percentage so grading
is sane, but every doc/UI saying "out of 100" is wrong for non-`general` fields,
and raw `total_score` is not comparable across fields.
Recommendation: normalize weighted totals back to 0–100, or stop advertising a
fixed 100-point scale.

### F4 — Tukey HSD post-hoc uses an unused/abandoned critical-value line; comment says "approximate" (LOW/MEDIUM, statistical-correctness)
`anova/advanced_anova_service.py:656-660`:
```
# Critical value (approximate)
_ = 3.5  # Approximate for alpha=0.05
# P-value (approximate)
p_value = 1 - studentized_range.cdf(q, n_levels, df_error) if df_error > 0 else 1
```
The actual p-value uses `scipy.stats.studentized_range.cdf` (correct), so the
dead `_ = 3.5` line is harmless leftover — but it signals an earlier hard-coded
approximation and the "approximate" comments are now misleading (the computation
is exact). The `se = sqrt(ms_error*(1/n1+1/n2)/2)` is the correct Tukey SE.
Recommendation: delete the dead `_ = 3.5` line and the stale "approximate"
comments.

### F5 — `is_penalty` branch in `_evaluate_rule` is a dead no-op (LOW, dead code)
`sqs_scoring.py:294-298`: both `if is_penalty` and `else` branches assign the
identical expression `rule["points"] if found else 0`. The penalty works only
because `rule["points"]` is already `-2`; the if/else is misleading.
Recommendation: collapse to one assignment.

### F6 — Documented `GET /sqs/report/{id}/` endpoint does not exist (LOW, doc-mismatch)
`sqs_views.py:10` lists "GET /api/v1/sqs/report/{id}/ - Retrieve a report", but
there is no `SQSReportView` and no such route (reports are returned inline).
Recommendation: remove the line or implement persistence + the endpoint.

### F7 — Public SQS analyze endpoints lack rate limiting / upload-size cap (LOW, security)
All 7 SQS views are `AllowAny` (`sqs_views.py:104,168,214,258,297,332,372`).
`SQSAnalyzeView.post` accepts arbitrary uploaded PDFs and runs pdfplumber/PyPDF2
plus 45 IGNORECASE regexes over the extracted text with no throttle and no
explicit size cap. The regexes were spot-checked and are not obviously
catastrophic-backtracking (no ReDoS found); the feature is read-only with no
secrets/persistence, so AllowAny itself is defensible. Still a mild
unauthenticated resource-exhaustion surface.
Recommendation: add DRF throttling + upload-size limit to the analyze endpoints.

### F8 — Engine packages contain stray `to_dict`/`integrand`/`__init__` duplicate defs and a couple of harmless `pass`/NotImplementedError (LOW, quality)
Sweep flagged duplicate method names within single files: `bayes_ttest.integrand`,
`causal/mediation.py to_dict`, `causal/did.py to_dict`, `mixed_models/lmm.py
to_dict`, `analytics/statistical/statistical_tests.py __init__`,
`causal/dag.py to_dict`, `bayesian/priors.py` ({pdf,cdf,rvs,__init__,__repr__}).
Most are legitimate (same method name across multiple nested dataclasses/inner
functions in one file), and `priors.py:67,71,75 raise NotImplementedError` are
abstract-base placeholders. `analytics/statistical/advanced_statistical_analysis.py:975`
literally says "Note: This is a placeholder. Full implementation would use
statsmodels..." — one genuinely partial method in an analytics helper.
Recommendation: confirm the analytics placeholder is not surfaced as a finished
feature; otherwise low priority.

---

## (c) CLAIMS-VS-REALITY TABLE

| # | Claim (MEMORY / docs / paper) | Reality | Verdict |
|---|---|---|---|
| 1 | "45 SQS rules, 6 categories" | Exactly 45 rule dicts, 6 categories (11/8/6/8/7/5) | CONFIRMED |
| 2 | SQS category maxes 20/15/15/15/20/15 = 100 | Declared maxes sum to 100 | CONFIRMED |
| 3 | SQS rules statistically meaningful | Detect d, η², CIs, power, normality, exact p, etc.; good text 82 %, filler 0 % | CONFIRMED |
| 4 | SQS produces a 0–100 score | Field weights push max to ~110 and penalties go negative | PARTIAL / REFUTED |
| 5 | genomics runs a real DE pipeline (Case Study 4) | Real per-gene Guardian-gated t/ANOVA cascade + BH FDR (BH matches statsmodels); wired + tested | CONFIRMED |
| 5b | genomics is "DESeq2-style" (if claimed) | No NB/GLM/size-factor; it's a t-test/ANOVA cascade with BH | REFUTED-IF-CLAIMED |
| 6 | Service modules are real implementations | Real scipy/statsmodels engines; substantive method bodies | CONFIRMED |
| 7 | Service modules are wired to the platform | nonparametric/anova/power/genomics views import them + registered in urls.py | CONFIRMED |
| 8 | multivariate endpoint works | Package raises ImportError on load (bad import name) | REFUTED |
| 9 | Power analysis correct (noncentral-t) | `t_test_power` ncp=d·√(pooled_n), df=n1+n2−2; matches statsmodels TTestIndPower (0.8015) | CONFIRMED |
| 10 | Kruskal-Wallis ε² correct | `(H−k+1)/(N−k)` — standard epsilon-squared | CONFIRMED |
| 11 | One-way/RM ANOVA effect sizes correct | η²=SS_b/SS_t etc.; F via scipy f.cdf with correct df | CONFIRMED |
| 12 | `GET /sqs/report/{id}/` endpoint exists | No such view/route | REFUTED |
| 13 | Mann-Whitney effect size r = 1−2U/(n1·n2) | Rank-biserial correlation — correct formula | CONFIRMED |

---

## (d) PRIORITIZED RECOMMENDATIONS toward "world-class"

1. **Fix the multivariate ImportError (F1)** — wrong import name breaks a
   registered endpoint at module load. Add an import-smoke test covering every
   `api/v1/*_view.py`.
2. **Make SQS a true 0–100 scale (F2, F3)** — floor category scores at 0 and
   normalize field-weighted totals back to 100; then docstring/UI/cross-field
   comparability all become correct.
3. **Clarify genomics framing (5b)** — keep calling it a Guardian-gated DE
   cascade; do not let any doc/paper imply DESeq2 negative-binomial modeling.
4. **Clean up dead code / stale comments (F4, F5)** and **stale endpoint doc (F6).**
5. **Throttle + size-cap the public PDF/text analyze endpoints (F7).**
6. Audit the one analytics placeholder (F8) so it is not exposed as finished.
7. Add SQS scorer edge-case unit tests (penalty-only text, non-general fields)
   to prevent F2/F3 regressions.

---

## Appendix — verification commands (read-only)
- Rule/category counts: regex parse of `sqs_rules.py` → 45 rules, 6 categories.
- BH FDR: replicated genomics `_benjamini_hochberg` vs `statsmodels.multipletests(method='fdr_bh')` → exact match.
- Power: replicated `t_test_power` vs `statsmodels.TTestIndPower().power(0.5,64)` → both 0.8015.
- Wiring: `grep -rln <ClassName> backend paper` (no glob) → nonparametric/anova/power/multivariate/genomics views import the engines; all registered in `api/v1/urls.py`.
- Multivariate bug: `python3 -c "from core.services.multivariate import PowerAnalysisService"` → ImportError.
- mann_whitney: `grep -n "def mann_whitney"` → single def at line 55, no `pass` stubs.
- SQS functional: good manuscript 82.4 % grade B; filler 0 % grade F; penalty-only precision = −13.33 %.
