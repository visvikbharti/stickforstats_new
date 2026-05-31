# Audit: Meta-analysis + Validation Framework (paper-critical)

Date: 2026-05-31
Auditor: senior-auditor subagent
Repo root: /Users/vishalbharti/StickForStats_v1.0_Production
Scope files (all read in full, all executed where feasible):
- `backend/core/meta_analysis.py` (700 lines)
- `backend/core/validation_framework.py` (585 lines)
- `backend/core/hypothesis_registry.py` (835 lines)
- `backend/core/services/pcurve/core.py` (420 lines) + `__init__.py`
- `backend/core/services/preregistration/preregistration.py` (419 lines) + siblings
- `backend/api/v1/meta_analysis_views.py` (502 lines)

---

## (a) GROUND TRUTH

### meta_analysis.py — the paper-critical engine
A self-contained numpy + scipy.stats meta-analysis engine. `MetaAnalysisEngine.analyze()`
supports fixed and random (DerSimonian-Laird / Paule-Mandel) effects. Heterogeneity
(Q, df, I², τ², τ, H²), Egger's regression test, Begg's rank test, funnel-plot data,
subgroup analysis, and leave-one-out sensitivity. Exposed via `run_meta_analysis()`
and REST endpoints in `meta_analysis_views.py`. **The core DL random-effects path and
Egger's test are mathematically correct** (verified by reading AND by executing the engine
on real Egger-1997 magnesium 2×2 counts: it returns a pooled OR ≈ 0.48 with I² in the
60-70% band and a strongly negative, significant Egger t — i.e. the published headline
numbers are genuinely producible by this code, not hardcoded).

### validation_framework.py — "validates against R/Python/SAS to 15 decimals"
This is the most overclaimed file. The "our" calculation is **literally identical** to the
scipy "reference" calculation — both call the same `scipy.stats` functions. So the
headline "scipy" comparison compares scipy to itself and is guaranteed to pass with 15/15
matching decimals. R validation only runs if R is installed (and the ANOVA-R path is a stub
returning None). SAS is always unavailable by hardcode. The "50-digit"/"15 decimal" precision
is not realized: all computation is float64; `getcontext().prec = 50` is set but `Decimal`
is never used.

### hypothesis_registry.py — multiplicity / p-hacking tracker
Genuinely substantive: session-based test registration, auto-correction via a real
`MultiplicityCorrector` (import verified to resolve), p-hacking risk heuristic, export
blocking until corrections applied, pre-registration compliance check. Sequential/interim
boundary is explicitly "Simplified" (O'Brien-Fleming-*like* `0.05*sqrt(info)`, not a real
alpha-spending function).

### pcurve/core.py — p-curve analysis (Simonsohn et al.)
Right-skew Stouffer test direction is correct (verified by simulation). BUT power estimation
is a hardcoded piecewise-linear lookup table, NOT Simonsohn's loss-function method; the
"flat test against 33% power" does not test flatness at all; `expected_33` is a hardcoded
constant; and the half-curve pp-values are computed but never used in any test.

### preregistration/* — OSF-style pre-registration builder
Substantive builder/exporter (OSF-JSON, Markdown, PDF-data). Note: `export_to_osf_json`
produces an OSF-*shaped* JSON locally — it does not actually file anything with OSF (no
network/API call), consistent with MEMORY noting OSF filing is a Phase-5 external item.

### Integration status (CORRECTED after execution)
Contrary to an earlier draft of this report, these modules ARE wired to REST endpoints —
the p-curve and validation defects below **are shipped to end users**:
- `meta_analysis.py` → `backend/api/v1/meta_analysis_views.py` (all AllowAny).
- `pcurve` → `backend/core/api_views.py:105 compute_pcurve_analysis` → URL `p-curve/analyze/`
  (`backend/core/api_urls.py:59`), which calls `compute_pcurve(p_values)` and returns the
  result dict to clients (`api_views.py:117,125`).
- `preregistration` / `sample_size` / `analysis_plan` → `api_views.py:171 create_preregistration`,
  `:536 calculate_sample_size`, `create_analysis_plan_view` → URLs `pre-registration/create/`,
  `sample-size/calculate/`, `analysis-plan/create/` (`api_urls.py:61-63`).
- `validation_framework.StatisticalValidator` → `backend/api/v1/views.py` (ValidationDashboardView,
  `:78`) and `backend/api/v1/ancova_view.py:71`.
`hypothesis_registry` is used via `core/reproducibility/state_capture.py` (and is imported by
multiplicity-related flows). So all four "framework" modules are reachable.

**HEADLINE CONFIRMED BY EXECUTION:** Running the engine on the shipped magnesium dataset
(`paper/replication/data/iv_magnesium_meta_analysis.csv`, k=16, using its `log_or`/`se` columns)
reproduces the PLOS numbers EXACTLY: pooled OR=0.483, 95% CI [0.329, 0.710], I²=68.1%,
Egger intercept=-4.137, t=-5.78, p=2.26e-05 (< 0.001). These numbers are genuinely computed
from the data, not hardcoded.

---

## (b) FINDINGS

### F1 — validation_framework "validates our calc vs scipy" actually compares scipy to itself (vacuous test)
- Severity: high · Category: scientific_integrity / stub_vs_claim
- Evidence: module docstring `validation_framework.py:8-11` claims it "compares StickForStats
  calculations against R, Python (scipy/statsmodels), and SAS" to "15 decimal places."
  But `_calculate_t_test` (`:175-195`) computes via `stats.ttest_1samp/ttest_ind/ttest_rel`,
  and `_validate_with_scipy_t_test` (`:197-216`) calls the **same** scipy functions. The
  comment at `:139` admits it: "Our calculation via scipy (the reference implementation used
  by StickForStats)." Same for ANOVA: `_calculate_anova` (`:403-407`) and the scipy ref
  (`:373`) are both `stats.f_oneway`.
- Reality: The scipy comparison is a tautology — it will always report `decimal_places_matched=15`
  and PASSED. It validates nothing.
- Recommendation: Either validate an *independent* StickForStats implementation against scipy,
  or drop the self-comparison and rely solely on R/statsmodels (genuinely independent) as the
  reference, and stop counting the scipy row as a passing validation.

### F2 — "15 decimal place" / "50-digit precision" accuracy claim not realized
- Severity: medium · Category: doc_mismatch / scientific_integrity
- Evidence: `validation_framework.py:11` "Scientific Accuracy Target: 15 decimal places";
  `:28-29` `getcontext().prec = 50`. `Decimal` is imported only via `getcontext` and is
  **never used** anywhere in the file; all values are Python/numpy float64. `_count_matching_decimals`
  (`:342-361`) caps at 15 and (per F1) trivially returns 15 for the scipy row.
- Reality: No 50-digit or guaranteed-15-decimal arithmetic happens here. (The repo's separate
  `high_precision_calculator.py` uses mpmath, but this validation file does not.)
- Recommendation: Remove the precision claim from this module or back it with actual Decimal/mpmath
  comparisons; ensure paper accuracy claims cite the mpmath module, not this one.

### F3 — REML τ² estimator advertised but not implemented (silent fallback to DL)
- Severity: medium · Category: stub_vs_claim
- Evidence: `meta_analysis.py:90` docstring lists "'REML'"; dispatch `:216-221` handles only
  `"DL"`/`"PM"`, else runs `_dersimonian_laird`. **Verified by execution:** calling
  `analyze(..., method='REML')` returns a τ² bit-identical to DL.
- Reality: `method='REML'` silently returns DerSimonian-Laird with no warning.
- Recommendation: Implement REML or remove it from the docstring and raise on unknown methods.

### F4 — p-curve power estimation is a hardcoded heuristic, not Simonsohn's method
- Severity: high · Category: statistical_correctness / stub_vs_claim
- Evidence: `pcurve/core.py:5-6` claims it follows "Simonsohn, Nelson, & Simmons (2014, 2015)."
  `estimate_power` (`:187-236`) maps the observed proportion-below-.025 to power via a
  hand-written piecewise-linear table (`:219-226`: `if prop>=0.73: power=0.80+...`, etc.) with a
  binomial-SE Wald CI. The docstring even concedes "This is a simplified estimation" (`:210`)
  and "Confidence interval using bootstrap would be ideal, but simplified here" (`:230`).
- Reality: Simonsohn's p-curve power estimate minimizes a loss between observed and expected
  pp-value distributions across candidate non-centralities; this lookup table is an ad-hoc
  approximation that will not reproduce pcurve.app results, despite the citation.
- Recommendation: Implement the loss-function estimator or relabel the citation/claim as an
  approximation and remove the implied equivalence to the published method.

### F5 — p-curve "flat test (against 33% power)" does not test flatness
- Severity: high · Category: statistical_correctness
- Evidence: `pcurve/core.py:300-301` assigns `flat_test = binomial_test_33(...)` labeled
  "Test against 33% power (flat p-curve)". `binomial_test_33` (`:114-152`) computes
  `p_value = 1 - binom.cdf(n_below_025 - 1, n_total, 1/3)` — the **upper-tail** probability of
  seeing *more* than 1/3 of p-values below .025, i.e. yet another right-skew test, not a test
  that the curve is *flatter* than the 33%-power reference. Simonsohn's flat/half test for
  inadequate evidence tests the *opposite tail* against a 33%-power null using pp-values, not a
  binomial on the raw count.
- Reality: The reported "flat test" is mislabeled and statistically wrong for its stated purpose;
  `inadequate_evidence` (`:309`) is then derived from a raw proportion threshold rather than this test.
- Recommendation: Implement the real flat/33%-power test (Stouffer on pp-values computed under a
  33%-power non-central reference) or remove the "flat test" and the inadequate-evidence verdict.

### F6 — p-curve: half-curve pp-values and a count are computed but never used (dead code / unfinished feature)
- Severity: medium · Category: quality / stub_vs_claim
- Evidence: `pcurve/core.py:287` computes `pp_values_half` but it is only stored in the result,
  never fed to any test (the standard half p-curve right-skew test is absent). `:206`
  `sum(1 for p in p_values if p < 0.01)` is computed and discarded (no assignment).
  `expected_33` (`:333`) is hardcoded `[n*0.356] + [n*0.161]*4` (sums to ~1.0) rather than
  derived from the 33%-power pp distribution.
- Reality: The half p-curve (a core robustness check in Simonsohn's method) is advertised by the
  data structure but not actually run; visualization "expected under 33%" is a constant.
- Recommendation: Wire up the half-curve test or remove the unused fields; compute expected_33
  from the model.

### F7 — Begg's rank-correlation test uses a non-standard construction
- Severity: medium · Category: statistical_correctness
- Evidence: `meta_analysis.py:356-369`: centers on the **unweighted** mean (`:360 np.mean(effects)`),
  standardizes by raw `sqrt(var)` (`:362`), correlates standardized effect with **raw** variance
  via Kendall's tau (`:365`), and computes a hand-rolled `z_stat` (`:369`) that is then **discarded**
  (significance at `:375` uses scipy's exact p). `:361 np.mean(var)` is also computed and discarded.
- Reality: Begg & Mazumdar (1994) center on the inverse-variance-weighted mean and use the variance
  of the standardized deviate; this implementation is a related-but-incorrect variant, mislabeled as
  "Begg's rank correlation test." (Secondary check, lower impact than Egger.)
- Recommendation: Implement the textbook standardization or relabel/down-scope; remove dead code.

### F8 — validation_framework R/SAS/ANOVA-R paths are stubs or unreachable
- Severity: medium · Category: stub_vs_claim
- Evidence: `_check_sas_availability` (`:115-118`) hardcoded `return False` (SAS "validation" never
  runs). `_validate_anova_with_r` (`:409-412`) is `return None  # Return None for now to skip R
  validation`. R t-test path runs only if R is on PATH (`:106-113`).
- Reality: Of the three advertised external references, SAS is never used, ANOVA-R is a no-op, and
  R is environment-dependent — so in CI/most deployments the only "reference" is scipy (see F1).
- Recommendation: Either implement these or remove SAS/R from the documented capability set.

### F9 — meta-analysis REST endpoints are entirely unauthenticated (AllowAny)
- Severity: low · Category: security
- Evidence: Every view in `meta_analysis_views.py` is `permission_classes = [AllowAny]`
  (`:31`, `:164`, `:272`, `:336`, `:390`, `:444`). Input is well-validated (effect-size/SE bounds,
  alpha range at `:83-147`) and the engine is pure-CPU on small arrays with no I/O, so risk is low,
  but the endpoints are open and could be abused for CPU with very large `studies` arrays (no length
  cap; sensitivity/subgroup are O(k²)).
- Reality: Open compute endpoints, no auth, no upper bound on number of studies.
- Recommendation: Confirm AllowAny is intended for these public stats tools; add a sane cap on
  `len(studies)` to bound `sensitivity_analysis`/`subgroup_analysis` cost.

### F10 — EffectSizeConverter.calculate_se_r ignores its `r` argument
- Severity: low · Category: doc_mismatch
- Evidence: `meta_analysis.py:594-602` signature `calculate_se_r(r, n)` returns `1/np.sqrt(n-3)`,
  never using `r`. (Correct Fisher-z SE; documented as such, but the `r` param is a no-op trap and
  is passed from the endpoint `:319`.)
- Recommendation: Drop the unused `r` parameter or document the Fisher-z convention loudly.

### F11 (info / positive) — Core DL random-effects + Egger math is correct and reproduces the headline EXACTLY
- Severity: info · Category: statistical_correctness
- Evidence: Q + χ² p (`meta_analysis.py:211-213`), I² (`:227-230`), H² (`:233-236`),
  DL τ² `c=Σw−Σw²/Σw; τ²=(Q−df)/c` floored at 0 (`:246-247`,`:223`), RE IV pooling + SE
  (`:191-195`), Wald CI/z (`:120-124`), Egger OLS of effect/SE on 1/SE with intercept t-test df=n-2
  (`:294-323`). **Executed** on the shipped Egger-1997 magnesium dataset (k=16):
  pooled OR=0.483, 95% CI [0.329, 0.710], I²=68.1%, τ²=0.2515, Egger intercept=-4.137, t=-5.78,
  p=2.26e-05 — an EXACT match to the PLOS headline (OR=0.483, CI [0.329,0.710], I²=68.1%,
  Egger t=-5.78, p<0.001). Numbers are computed from the data, not hardcoded. No fabrication.

---

## (c) CLAIMS-VS-REALITY TABLE

| Claim (docs/MEMORY/paper) | Reality | Status |
|---|---|---|
| DerSimonian-Laird random effects implemented correctly | Correct (lines 191-247); executed OK | CONFIRMED |
| Egger's regression test correct, can produce t=-5.78, p<0.001 | Canonical OLS form (294-323); executed, strongly significant on real data | CONFIRMED |
| I², τ², Q, H² heterogeneity correct | Correct (211-236) | CONFIRMED |
| Headline IV-magnesium numbers producible by the code (not hardcoded) | Reproduced OR≈0.48 / high-I² / sig-Egger from real 2×2 counts | CONFIRMED |
| REML τ² estimator available | Not implemented; silent DL fallback (90, 216-221); verified by execution | REFUTED |
| Begg's rank test implemented per standard definition | Non-standard (unweighted mean, raw variance, discarded z) (356-369) | PARTIAL/REFUTED |
| validation_framework validates StickForStats vs R/scipy/SAS to 15 decimals | "Our"=scipy (self-comparison, vacuous); SAS hardcoded off; ANOVA-R stub; float64 not 50-digit | REFUTED |
| p-curve analysis statistically correct (Simonsohn 2014/2015) | Right-skew direction OK; power=hardcoded lookup; flat test mislabeled/wrong; half-curve unused | PARTIAL/REFUTED |
| Hypothesis registry / multiplicity tracking real | Real (MultiplicityCorrector resolves); sequential boundary "Simplified" | CONFIRMED (partial) |
| Pre-registration / OSF export real | Builder + OSF-shaped JSON real; does NOT file with OSF over network | PARTIAL (as documented) |

---

## (d) PRIORITIZED RECOMMENDATIONS TOWARD WORLD-CLASS

1. **Fix the validation-framework self-comparison (F1) and precision claim (F2)** — these
   underpin "validated to 15 decimals" statements in the papers and are currently false as written.
2. **Repair or relabel p-curve (F4/F5/F6)** — power estimation and the flat/inadequate-evidence
   test are wrong for their stated Simonsohn method; either implement the loss-function +
   pp-value flat test or drop the published-method citation and the verdicts derived from them.
3. **REML (F3)** — implement or remove + raise on unknown method.
4. **Begg's test (F7)** — textbook standardization or down-scope; remove dead code.
5. Add a `len(studies)` cap on the meta endpoints (F9); confirm AllowAny is intended.
6. Implement or remove the SAS/ANOVA-R stubs (F8); drop the unused `r` param (F10).
7. Consider Hartung-Knapp small-sample CIs for random-effects (k=16 is borderline) — not a bug,
   but expected of a world-class meta-analysis tool.
8. The headline meta-analysis (F11) is sound; keep it and add the executed reproduction to the
   replication harness as a regression guard.
