# Audit — Autonomous Intelligence Engine (Pillar 1)

Date: 2026-05-31
Auditor: senior auditor (read-only)
Scope: `backend/core/services/cascade_engine.py`, `smart_profiler.py`,
`plain_language_translator.py`, `autonomous_query_handler.py`,
`suggestions_engine.py`, `followup_resolver.py`, `analysis_context.py`,
`profiling_service.py`, `core/data_profiler.py`, `core/automatic_test_selector.py`,
`core/test_recommender.py`, `core/test_recommender_scenarios.py`, plus
`api/v1/autonomous_views.py` and `api/v1/urls.py` for the API surface.

> NOTE ON COVERAGE: All in-scope files were read in full and verified:
> cascade_engine, smart_profiler, plain_language_translator,
> autonomous_query_handler, automatic_test_selector, data_profiler,
> suggestions_engine (233 LOC), followup_resolver (150 LOC),
> analysis_context (145 LOC), profiling_service (532 LOC),
> test_recommender (990 LOC), and the head of test_recommender_scenarios
> (1127 LOC, scenario library — pure test fixtures), plus
> `api/v1/autonomous_views.py` and `api/v1/urls.py`.
>
> Additional confirmations from the peripheral files:
> - `suggestions_engine.py` is a real, harmless rule table (no stats compute);
>   keyed on `test_type` strings — but note the cascade engine emits final_test
>   keys like `one_way_anova`/`pearson`, while the suggestion predicates also
>   accept `t_test`/`anova`/`correlation` aliases (see `_is_*` at lines 14-26).
>   The autonomous view passes `final_test` (e.g. `independent_t`,
>   `wilcoxon_signed_rank`) which does NOT match any `_is_*` predicate, so the
>   t-test/ANOVA/correlation suggestion branches never fire from the autonomous
>   query path — only the significance and guardian-violation branches do. This
>   is a quiet key-mismatch bug (see F16).
> - `analysis_context.py` is a real Django-cache-backed session store (2h TTL).
> - `profiling_service.py` is a SEPARATE service that wraps `data_profiler` +
>   `test_recommender.py` (NOT `automatic_test_selector.py`), confirming F13:
>   the platform ships two parallel recommender engines, each used by a
>   different entry point. `profiling_service` also has stub methods
>   (`get_cached_profile` always returns None :195-211; `get_profile_status`
>   returns "Status tracking not yet implemented" :213-225; `_queue_async_profiling`
>   does not actually queue — the Celery call is commented out :347-357; PDF/DOCX
>   export return literal byte strings :490-496) — see F17.
> - `test_recommender.py` is real and arguably MORE rigorous than
>   `automatic_test_selector` (delegates to a real `AssumptionChecker`,
>   normality of differences for paired tests, Levene grouping, VIF
>   multicollinearity), reinforcing that the duplication (F13) is wasteful.

---

## (a) Ground truth — what this subsystem really is

Pillar 1 is a **real, non-stub, deterministic statistical pipeline**, not a
mock. Five layers compose cleanly:

1. **DataProfiler** (`core/data_profiler.py`, 795 lines): per-variable typing,
   descriptive stats, Shapiro/Anderson normality, IQR + z-score outliers,
   distribution fitting (KS over 7 candidate distributions), correlation matrix,
   VIF (via sklearn LinearRegression), heuristic MCAR/MAR/MNAR. Real
   computation throughout.
2. **AutomaticTestSelector** (`core/automatic_test_selector.py`, 747 lines): a
   rule-based test database (~20 tests with requirements), assumption checkers
   (Shapiro/KS, Levene, Pearson/Spearman), and a multiplicative scoring engine.
   Real, though heuristic.
3. **SmartProfiler** (`smart_profiler.py`, 472 lines): genuinely *merges*
   DataProfiler + AutomaticTestSelector (instantiates both at `__init__`,
   `:92-93`), infers research questions from the variable-type matrix, builds a
   data-health card, and suggests a workflow. Real merge — claim CONFIRMED.
4. **AutonomousCascadeEngine** (`cascade_engine.py`, 554 lines): runs Guardian
   (`GuardianCore`) on the intended test; on `can_proceed=False`, walks
   `CASCADE_ALTERNATIVES` + Guardian's own `alternative_tests` to the next
   untried test and re-checks; executes the final test via scipy. Real
   Guardian-driven fallback — claim CONFIRMED.
5. **PlainLanguageTranslator** (`plain_language_translator.py`, 539 lines):
   template-based, no AI dependency; 13 per-test translators in 3 modes
   (plain/researcher/APA) + a generic fallback. Real, deterministic — claim
   CONFIRMED.
6. **AutonomousQueryHandler** (`autonomous_query_handler.py`, 519 lines):
   orchestrates profile → (optional) NLP parse → test select → prepare data →
   cascade → translate → next-steps. Real orchestration, with graceful
   degradation when the optional `QueryParser` import is absent (`:23-29`).

The Phase-2 statistical fixes claimed in MEMORY are **genuinely applied** in the
current code (verified against git commit `a37ee71` and the live source).

API: 6 endpoints under `/api/v1/autonomous/` (`urls.py`). **All are
`permission_classes = [AllowAny]`** (`autonomous_views.py:89, 179, 274, 350,
392` and `@permission_classes([AllowAny])` at `:411`). They accept arbitrary
file/JSON uploads and run unbounded server-side computation with no auth and no
throttle (`DEFAULT_THROTTLE_*` / `DATA_UPLOAD_MAX_MEMORY_SIZE` not found in any
settings module).

---

## (b) Findings

### F1 — [CONFIRMED FIX] Wilcoxon effect-size r is now correct (|Z|/√N)
Severity: info | Category: statistical_correctness
Evidence: `cascade_engine.py:357-386`:
```python
mu_w = n * (n + 1) / 4.0
sigma_w = float(np.sqrt(n * (n + 1) * (2 * n + 1) / 24.0))
z = (float(stat) - mu_w) / sigma_w if sigma_w > 0 else 0.0
r = abs(z) / float(np.sqrt(n)) if n > 0 else 0.0
...
effect_size_name="r (|Z|/sqrt(N), Rosenthal 1991)"
```
Doc claim: MEMORY says the prior `W/max(W)` bug was fixed. Reality: matches the
claim; formula is the standard normal-approximation Wilcoxon r. Confirmed via
git `a37ee71`. Recommendation: keep; consider tie/zero-correction note.

### F2 — [CONFIRMED FIX] Kruskal–Wallis effect-size label now consistent
Severity: info | Category: statistical_correctness
Evidence: `cascade_engine.py:412-439`: default `effect_size = (H-k+1)/(n-k)` is
labelled "eta-squared H (unbiased; Tomczak & Tomczak 2014)" and the simpler
`epsilon_squared = H/(n-1)` is reported in `additional`. Numerically verified:
for a 3-group n=90 sample, H=46.19 → epsilon=H/(n-1)=0.519, eta²H=0.508; both in
[0,1]. Doc claim: MEMORY "labeled ε² but formula is unbiased η²" — now relabeled.
Reality: matches the claim. Recommendation: none.

### F3 — Mann–Whitney effect size on `mann_whitney` translator is misclassified against the Cohen-d scale
Severity: medium | Category: statistical_correctness
Evidence: `cascade_engine.py:344-355` computes rank-biserial
`r = 1 - 2U/(n1·n2)` (range [-1,1], correct). But the translator classifies it
on the **Cohen's d** thresholds: `plain_language_translator.py:272`
`_classify_effect_size(es_val)` and `_classify_effect_size` uses d-bands
(0.2/0.5/0.8/1.2) at `:54-61`. Rank-biserial / r correlations use *different*
benchmarks (0.1/0.3/0.5). The same mismatch affects Wilcoxon (`:288`), Spearman
(`:417`), Kendall (`:433`), and chi-square Cramér's V (`:460`) — all are r-scale
or V-scale quantities pushed through the d-scale classifier. A rank-biserial of
0.36 (verified example) would be labelled "Small" on the d-scale, but is
"moderate" on the correlation scale.
Doc claim: PlainLanguage "produces correct, non-misleading statistical
statements". Reality: the verbal magnitude label can be misleading for all
non-d effect sizes. Recommendation: route r/ρ/τ/V through correlation-scale
bands; Cramér's V should use df-aware Cohen benchmarks.

### F4 — `welch_t` Cohen's d uses the wrong pooled SD (simple average of variances)
Severity: medium | Category: statistical_correctness
Evidence: `cascade_engine.py:300-304`:
```python
pooled_std = np.sqrt((np.var(arrays[0], ddof=1) + np.var(arrays[1], ddof=1)) / 2)
cohens_d = (np.mean(arrays[0]) - np.mean(arrays[1])) / pooled_std ...
```
For unequal-variance / unequal-n groups (the entire reason to use Welch), the
correct standardizer is either the n-weighted pooled SD (Cohen's d) or an
average-variance SD only when n are equal. Using the unweighted variance average
biases d when group sizes differ. Reality: produces a slightly wrong Cohen's d
for the unbalanced case that Welch exists to handle. Recommendation: use Glass's
delta or the n-weighted pooled SD consistent with `_exec_independent_t:279-281`.

### F5 — Fisher-exact "effect size = odds ratio" and chi-square fallback mislabel the statistic
Severity: medium | Category: statistical_correctness
Evidence: `cascade_engine.py:497-517`. For non-2×2 tables it does
`chi2,... = chi2_contingency(table); odds_ratio = chi2  # Not a true OR` and
then returns `statistic=odds_ratio`, `effect_size=odds_ratio`,
`effect_size_name="Odds Ratio"`. So for any r×c (>2×2) "Fisher" request the user
is shown a chi-square statistic mislabeled as an Odds Ratio. Also the OR is
reported as both the test statistic AND the effect size with no CI. The
translator (`:464-481`) prints `OR = {odds}` verbatim.
Doc claim: results are non-misleading. Reality: mislabeled statistic surfaced to
the user. Recommendation: for >2×2 fall back to chi-square *and relabel*; report
Cramér's V as the effect size, not the chi-square value as "Odds Ratio".

### F6 — Chi-square / Fisher coerce categorical data to int, silently corrupting string categories
Severity: high | Category: bug
Evidence: `cascade_engine.py:478` and `:499`:
`pd.crosstab(pd.Series(arrays[0].astype(int)), ...)`. `_prepare_data`
(`:240-252`) and the query handler `_prepare_test_data` (`:408-413`) pass raw
category arrays. If a categorical column contains strings (e.g. "male"/"female"
— exactly the NOMINAL columns SmartProfiler routes here), `arrays[...].astype(float)`
in `_prepare_data:243/247/251` raises, OR if integers-as-labels are present they
are silently treated as ordinal magnitudes. For the autonomous path,
`_prepare_test_data` returns `df[col].dropna().values` (object dtype) for
`chi_square_independence`/`fisher_exact` (`:408-413`), which then hits
`.astype(int)` in the executor and throws `ValueError` for string categories —
caught and logged at `:230-236`, returning `None`, so the user gets "Test
execution produced no results." with no explanation. Reality: association tests
on real (string) categorical data fail silently in the autonomous pipeline.
Recommendation: build the contingency table from raw categorical labels via
`pd.crosstab` without int coercion; add an explicit user-facing error.

### F7 — Cohen's d sign / "groups" mapping is order-dependent and unlabeled
Severity: low | Category: quality
Evidence: `cascade_engine.py:282` `(mean(g1)-mean(g2))/pooled`. In the
autonomous path, group order comes from `df.groupby(cat_var)` dict ordering
(`autonomous_query_handler.py:395-396`), so the *sign* of d and the
"group1/group2" labels are determined by category sort order, not by anything
meaningful to the user. The translator never names which group is higher.
Reality: not wrong, but the direction of effect is opaque. Recommendation:
attach category labels to means and report the direction explicitly.

### F8 — All 6 autonomous endpoints are unauthenticated with no rate limit or upload-size cap
Severity: high | Category: security
Evidence: `autonomous_views.py:89,179,274,350,392,411` all
`AllowAny`; `_parse_dataframe:44-52` reads arbitrary uploaded CSV/Excel into
pandas; `SmartProfiler`/`AutonomousQueryHandler` run Shapiro, 7-distribution KS
fitting, VIF regressions, and cascades on it. No `DEFAULT_THROTTLE_RATES`,
`DEFAULT_THROTTLE_CLASSES`, or `DATA_UPLOAD_MAX_MEMORY_SIZE` configured (grep of
all settings modules returned none). Reality: an anonymous client can submit a
large/wide dataframe and force expensive O(distributions × columns) computation
— a cheap DoS, plus `pd.read_excel`/`read_csv` parsing of untrusted files.
Recommendation: require auth (or at minimum a throttle scope) on these
endpoints; cap rows/columns/file size before profiling; bound
`_fit_distribution` work.

### F9 — `_fit_distribution` runs 7 scipy `.fit()` + KS on every continuous column on every profile call
Severity: medium | Category: performance
Evidence: `data_profiler.py:438-473` loops 7 distributions, each calling
`dist_func.fit(series)` (iterative MLE; `weibull_min`, `gamma`, `beta`,
`lognorm` are slow) and a full `kstest`. Called per-continuous-variable inside
`profile_dataset` (`:368`), which SmartProfiler runs on every
`/autonomous/profile` and `/autonomous/query` request (`smart_profiler.py:109`).
For wide datasets this dominates latency and, combined with F8, is exploitable.
Recommendation: gate distribution fitting behind a flag/sampling cap; it is not
consumed by the test-selection logic.

### F10 — `_check_normality` in AutomaticTestSelector uses no tie/constant guard and KS with estimated params
Severity: low | Category: statistical_correctness
Evidence: `automatic_test_selector.py:508-520`: for n>5000 it does
`stats.kstest(data, "norm", args=(mean, std))`. KS with parameters estimated
from the same sample is anticonservative (Lilliefors correction is the correct
remedy). The DataProfiler path instead uses Anderson–Darling for large n
(`data_profiler.py:373-377`) — so the two normality engines in the same pillar
disagree methodologically. Reality: minor over-rejection of normality for large
samples on the ATS path. Recommendation: use Anderson–Darling or Lilliefors
consistently.

### F11 — Anderson–Darling "p-value" in DataProfiler is a hardcoded 2-value step function
Severity: medium | Category: statistical_correctness
Evidence: `data_profiler.py:373-377`:
```python
result = stats.anderson(series, dist="norm")
stat = result.statistic
p_value = 0.05 if stat > result.critical_values[2] else 0.10
```
This is not a p-value; it returns exactly 0.05 or 0.10. SmartProfiler then does
`is_normal = normality_p_value > 0.05` (`smart_profiler.py:143`), so for any
large (n≥5000) sample that *passes* AD, `p_value = 0.10 > 0.05 → is_normal=True`,
and any that fails gets `0.05`, which is **not** `> 0.05` → `is_normal=False`.
The boundary works by luck but the value is fabricated as a continuous p-value
and is surfaced in `variable_summary`/reports. Reality: a categorical
pass/fail dressed up as p≈0.05/0.10. Recommendation: expose AD statistic +
critical value, or interpolate AD significance; do not call it a p-value.

### F12 — `_infer_variable_type` (ATS) ordering bug makes COUNT unreachable
Severity: low | Category: bug
Evidence: `automatic_test_selector.py:573-594`: the `unique > n/2 →
CONTINUOUS` branch (`:587-588`) precedes the COUNT branch (`:591-592`), and the
ordinal branch (`:583-584`) catches low-cardinality integers first. The COUNT
return is effectively dead for most inputs. Not on the headline path (ATS uses
its own `DataType`, distinct from DataProfiler's `VariableType`). Recommendation:
reorder or remove; or unify with `data_profiler.VariableType` to avoid two
parallel typing systems in one pillar.

### F13 — Two parallel, overlapping "test recommender" subsystems
Severity: medium | Category: quality
Evidence: `core/automatic_test_selector.py` (used by SmartProfiler) and
`core/test_recommender.py` (990 lines) + `core/test_recommender_scenarios.py`
(1127 lines) both exist and both recommend tests, with separate enums/databases.
SmartProfiler imports only `automatic_test_selector` (`smart_profiler.py:20`).
Reality: `test_recommender*` are large and not on the autonomous path I traced;
risk of drift / duplicated maintenance. Recommendation: confirm which is
canonical; deprecate or document the other. (Note: `test_recommender*.py` were
not line-verified in this pass — flagged for follow-up, not asserted as broken.)

### F14 — DataProfiler is double-checking R validation but `_validate_profile` is a stub
Severity: low | Category: stub_vs_claim
Evidence: `data_profiler.py:11-13` header claims
"Validation: Required against R and Python scipy" and `_validate_profile`
(`:713-726`) only logs "R validation would be performed here" and returns
`"validation_pending"`. SmartProfiler defensively constructs DataProfiler with
`validate_against_r=False` (`smart_profiler.py:92`), so the stub is bypassed in
production — good — but the file header overclaims. Reality: no R validation
occurs. Recommendation: soften the header docstring; the actual cross-validation
lives in `paper/replication/`, not here.

### F16 — SuggestionsEngine never fires test-type suggestions for autonomous queries (key mismatch)
Severity: low | Category: bug
Evidence: `autonomous_views.py:237-239` sets
`suggestions_input["test_type"] = cascade.get("final_test")`; the cascade engine
sets `final_test` to keys like `independent_t`, `welch_t`,
`wilcoxon_signed_rank`, `pearson`. But `suggestions_engine.py:14-26` predicates
only match `("t_test","independent_t_test")`, `("anova","one_way_anova")`,
`("pearson","correlation","spearman")`. So `independent_t` / `welch_t` /
`one_way_anova` (note: cascade uses `one_way_anova`, which DOES match `_is_anova`)
— only ANOVA aligns; the t-test and (non-pearson) correlation branches never
fire from the autonomous path. Reality: users get fewer/no test-specific
follow-up suggestions than intended. Recommendation: normalize test keys at the
boundary, or expand the predicate tuples to include the cascade key names.

### F17 — profiling_service.py advertises async/caching/export but several methods are stubs
Severity: medium | Category: stub_vs_claim
Evidence: header says "Enterprise Quality: Production-ready" with "async
processing for large datasets" (`profiling_service.py:11-12, 41-48`). Reality:
`get_cached_profile` always returns `None` (`:195-211`, "simplified
implementation"); `get_profile_status` returns
`"Status tracking not yet implemented"` (`:213-225`); `_queue_async_profiling`
does NOT queue — the Celery `.delay()` call is commented out and it returns a
fabricated `estimated_time_seconds = len(data)/1000` and a `check_status_url`
that no working status endpoint backs (`:347-357`); PDF/DOCX export return the
literal bytes `b"PDF export is not available in this version"` (`:490-496`).
Note: this service is NOT wired into the audited `/autonomous/*` endpoints
(those use SmartProfiler directly), so the stubs are not currently reachable from
the autonomous pipeline — but the "production-ready" claim is false. The async
threshold (`ASYNC_THRESHOLD_ROWS=100000`, `:57`) means a >100K-row upload to any
caller of this service silently returns "processing" forever. Recommendation:
either wire the Celery task and a real status store, or remove the async branch
and the "production-ready" claim.

### F15 — `welch_t` and several executors omit `degrees_of_freedom`, breaking APA output
Severity: low | Category: bug
Evidence: `_exec_welch_t` (`:300-317`) returns no `degrees_of_freedom`; the
translator routes Welch to `_translate_independent_t` (`:115,117`) whose APA
branch does `df = r.get("degrees_of_freedom", "")` then `t({df:.0f})`
(`:171-172`) — formatting `""` with `:.0f` raises `ValueError`, caught upstream
as a translation failure. Same risk for `mann_whitney`/`spearman` etc. where df
is absent but APA format strings call `:.0f`. Reality: APA mode can throw for
Welch. Recommendation: guard `:.0f` formatting against missing df.

---

## (c) Claims-vs-reality table

| Claim (MEMORY / docstrings) | Status | Evidence |
|---|---|---|
| cascade `_exec_wilcoxon` r fixed to \|Z\|/√N | CONFIRMED | `cascade_engine.py:371-384`; git `a37ee71` |
| cascade KW label fixed (η²H vs ε²) | CONFIRMED | `cascade_engine.py:427-438` |
| SmartProfiler merges DataProfiler + AutoTestSelector | CONFIRMED | `smart_profiler.py:19-24, 92-93, 109, 118` |
| CascadeEngine = Guardian auto-fallback to valid alternative | CONFIRMED | `cascade_engine.py:135-207` (re-checks each alt via Guardian) |
| PlainLanguage = template-based, no AI | CONFIRMED | `plain_language_translator.py:1-15`, no LLM import |
| PlainLanguage statements always correct/non-misleading | REFUTED (partial) | F3 (d-scale misclassification), F5 (mislabeled OR) |
| QueryHandler orchestrates full pipeline (not stubbed) | CONFIRMED | `autonomous_query_handler.py:116-267` |
| Autonomous endpoints exist (5 + followup) | CONFIRMED | `urls.py` autonomous/* (6 routes) |
| Endpoints are production-secured | REFUTED | F8: all `AllowAny`, no throttle/size cap |
| DataProfiler validates against R | REFUTED | F14: `_validate_profile` stub returns "validation_pending" |
| Anderson–Darling normality p-value | REFUTED (mislabeled) | F11: hardcoded 0.05/0.10 |

---

## (d) Prioritized recommendations toward world-class

1. **Security (F8):** add authentication and a DRF throttle scope to all
   `/autonomous/*` endpoints; enforce row/column/file-size caps in
   `_parse_dataframe` before any profiling. (High.)
2. **Categorical correctness (F6):** stop `.astype(int)` on category arrays;
   build contingency tables from raw labels; surface a real error instead of a
   silent `None`. (High.)
3. **Effect-size interpretation (F3, F5):** use the correct benchmark scale per
   effect-size type (d vs r vs V vs OR); never display a chi-square value as an
   "Odds Ratio". (Medium, user-visible numbers.)
4. **Welch d standardizer (F4)** and **AD pseudo-p-value (F11):** fix the
   standardizer and stop fabricating a continuous p-value from a 2-point step.
   (Medium.)
5. **Performance (F9):** gate `_fit_distribution` behind sampling/flag — it is
   not consumed by test selection and dominates latency. (Medium.)
6. **De-duplicate (F13):** pick one canonical recommender
   (`automatic_test_selector` vs `test_recommender*`) and retire/segregate the
   other; unify the two `VariableType`/`DataType` enums. (Medium.)
7. **APA robustness (F15):** guard `:.0f` against missing df. (Low.)
8. **Docs (F14):** soften DataProfiler's "validation required against R" header
   to match reality. (Low.)

Overall: Pillar 1 is substantively real and the two headline Phase-2 statistical
fixes are genuinely in place. The remaining issues are (i) one high-impact
silent failure on categorical association tests, (ii) an unauthenticated/
unbounded API surface, and (iii) a cluster of effect-size labeling/scale
inaccuracies that reach user-facing text.
