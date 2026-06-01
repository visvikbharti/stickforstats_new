# Audit 12 — API Layer: Statistical Endpoints

**Date:** 2026-05-31
**Auditor:** Subsystem audit agent (skeptical, code-first)
**Scope:** `backend/api/v1/` statistical views — correlation_views, regression_views (+regression_serializers), nonparametric_views, categorical_views, meta_analysis_views, power_views, survival_views, mixed_models_views, missing_data_views, factor_views, causal_views, ancova_view, descriptive_view, simple_regression_view, genomics_views, ai_advisor_views, sqs_views.

> **Tooling integrity note (important).** During this audit the shell layer intermittently *suppressed or duplicated* multi-line tool output. An EARLIER draft of this report asserted two findings that turned out to be FALSE artifacts of that corrupted output: (a) a claimed early-`return` making the regression endpoint return an empty result, and (b) a claimed excess-kurtosis off-by-one. Both were DISPROVEN by subsequent byte-faithful `Read`-tool windows and are explicitly retracted in the table below. Every finding that remains is backed by a verbatim `Read`-tool quote with line numbers. When in doubt, this report keeps only what the Read tool showed directly.

---

## (a) Ground Truth — what this subsystem really is

The statistical API layer is a set of **thin DRF view wrappers** (class-based `APIView` and function-based `@api_view`) that:
1. accept POST JSON,
2. run a parameter adapter and/or a serializer to normalize flexible input shapes,
3. delegate to a real `core/` (or `core/services/…`) engine,
4. `sanitize_for_json`/`str(Decimal)` the result and return it.

Engines delegated to (all confirmed to exist and be invoked):
- `core.hp_correlation_comprehensive.HighPrecisionCorrelation` (correlation)
- `core.hp_regression_comprehensive.HighPrecisionRegression` (regression)
- `core.hp_nonparametric_comprehensive` (35 defs; nonparametric)
- `core.hp_categorical_comprehensive` (categorical)
- `core.meta_analysis.run_meta_analysis` + `get_meta_analysis_engine()` (meta-analysis; engine has `eggers_test`, `beggs_test`, `subgroup_analysis`, `sensitivity_analysis`)
- power calculator (`power_calculator.*`)
- `core.services.analytics.survival.get_survival_service` (survival)
- `core.services.mixed_models` (`calculate_icc`, `fit_linear_mixed_model`)
- `core.missing_data_handler.MissingDataHandler` (missing data)
- `core.services.analytics.factor.get_factor_service` (factor)
- `core.services.causal` (DAG, propensity, matching, ATE/ATT, mediation, DiD)
- `core.services.anova.advanced_anova_service.AdvancedANOVAService` (ANCOVA)
- `core.high_precision_calculator` moment math (descriptive — engine, not inline in the view)
- `core.services.genomics.differential_expression.DifferentialExpressionService` (genomics)
- `ai_advisor.services` + `ai_advisor.services.nlp_enhanced` (AI advisor)
- SQS `analyze_manuscript` + `SQSReportGenerator` (sqs)

There is **no canned/mock/placeholder statistical output** in these endpoints — they genuinely call engines. Engines that depend on optional libraries return availability/503 paths (e.g. `survival_views.check_survival_availability`) rather than fabricating numbers — good integrity. Multiple endpoints carry honest "implement high-precision later" comments rather than overclaiming.

**Security posture (all 17 files, verified counts):** `AllowAny = 121`, `IsAuthenticated = 0`, throttle declarations = `1` (only in `ai_advisor_views.py`, via the service's internal rate limiter), DB writes = `0`, input-size guards = `0`. The endpoints are intentionally public, stateless calculators (no persistence limits blast radius), but there is **no authentication, no DRF throttling, and no array-size cap** on the numeric endpoints, including an unauthenticated PDF-upload endpoint (SQS). `ai_advisor_views.AIAdvisorChatView` does cap message length at 10,000 chars (line 72) — the only input-size guard found.

---

## (b) Findings

### F1 (MEDIUM — doc_mismatch / precision) "50-digit precision" headline is true for the COEFFICIENT but NOT for the p-value (float64, can underflow to 0)
**File:** `backend/core/hp_correlation_comprehensive.py:387-390`; surfaced via `backend/api/v1/correlation_views.py:66`
```python
# engine (correlation):
387:  t_stat = r * ((n - 2) / (1 - r**2)).sqrt()
389:  # Calculate p-value using scipy for now (can implement high-precision later)
390:  p_value = Decimal(str(2 * (1 - stats.t.cdf(abs(float(t_stat)), df))))
# view metadata (returned to user):
66:   "metadata": {"precision": 50, "algorithm": "high_precision_decimal", "version": "1.0.0"},
```
The coefficient `r`, `r_squared`, sums of squares and CI are computed in genuine 50-digit `Decimal` (lines 355-419 — confirmed). But the **p-value** casts `t_stat` to `float` and calls SciPy's float64 `stats.t.cdf`; for large |t| the `1 - cdf` underflows and `p_value` becomes exactly `0`. The response advertises `"precision": 50` globally, overstating p-value precision. The engine's own comment ("can implement high-precision later") is honest about this. The same `2*(1-t.cdf)` pattern is used for the Spearman p-value (engine line 451) and many sibling endpoints likewise return `"precision": "50 decimal places"` in their envelope while p-values come from SciPy float64. The high-precision `mpmath` descriptive engine and the `Decimal` correlation coefficient are genuinely 50-digit; the precision overstatement is specifically about p-values / SciPy-derived quantities.
**Doc claim contradicted:** "50 decimal precision" / `"precision": 50` headline on correlation (and most stats) endpoints.
**Reality:** Coefficient/moments are 50-digit; p-values are float64 and can be `0.0`.
**Recommendation:** Compute the survival function in extended precision (e.g. `mpmath.betainc`) OR label precision per-field (`coefficient_precision: 50, pvalue_precision: "float64"`). Use `2*stats.t.sf(|t|, df)` instead of `1 - cdf` to preserve small-p accuracy and avoid returning `p=0.0`.

### F2 (MEDIUM — security) No authentication, no rate limiting, no array-size cap on the numeric statistical endpoints (incl. unauthenticated PDF upload)
**Evidence (verified scan of the 17 files):** `AllowAny=121, IsAuthenticated=0, throttle=1 (ai_advisor only), db_writes=0`, array-size guards = 0. Examples:
- `backend/api/v1/correlation_views.py:32` `permission_classes = [AllowAny]`
- `backend/api/v1/descriptive_view.py:33` `permission_classes = [AllowAny]`
- `backend/api/v1/causal_views.py:75` (16 AllowAny endpoints, several fit models on user matrices)
- `backend/api/v1/sqs_views.py:103-104` accepts an **unauthenticated multipart PDF upload** (`parser_classes = [MultiPartParser, FormParser]`, `permission_classes = [AllowAny]`) and runs PDF text extraction + analysis on it.
**Reality:** Anyone can POST unbounded arrays into O(n) 50-digit-`Decimal`/`mpmath` loops (correlation, descriptive, ANCOVA), large matrices to factor/causal/regression model fits, or large PDFs to SQS, with no throttle or timeout. Statelessness (`db_writes=0`) limits blast radius to CPU/memory DoS rather than data exposure. Only `ai_advisor` chat has any input cap (10,000-char message limit, `ai_advisor_views.py:72`).
**Recommendation:** Add DRF `AnonRateThrottle` globally to the stats API, enforce array-length / matrix-size and PDF-size ceilings, and a request timeout. If public access is intentional (it is, per design), document it explicitly and keep the throttle.

### F3 (MEDIUM — bug) `RegressionModelComparisonView` will 500 instead of validating when `data` is omitted, and ignores the `parameter_adapter`/serializer used elsewhere
**File:** `backend/api/v1/regression_views.py:383-387`
```python
383:  adapted_data = parameter_adapter.adapt_parameters("regression", request.data)
384:  data = adapted_data["data"]          # KeyError -> generic 500 if "data" absent
385:  X = np.array(data["X"])
386:  y = np.array(data["y"])
```
Unlike `HighPrecisionRegressionView` (which uses `RegressionRequestSerializer` and returns a clean 400 on bad input), the comparison endpoint indexes `adapted_data["data"]`/`["X"]`/`["y"]` directly inside the `try`, so missing fields yield an opaque `HTTP 500 {"error": "'data'"}` instead of a 400 with a validation message. Same pattern in several function-based endpoints that do `data.get(...)` presence checks but then index nested dicts.
**Reality:** Inconsistent, low-quality input validation; some malformed requests 500 instead of 400.
**Recommendation:** Validate with a serializer (or explicit presence checks returning 400) before indexing. Mirror the `HighPrecisionRegressionView` pattern.

### F4 (LOW — quality) Inconsistent validation strategy across the subsystem
**Evidence:** Class-based views use serializers (`correlation_views.py:43` `CorrelationRequestSerializer`; `regression_views.py:94` `RegressionRequestSerializer`; `ancova_view.py:59` `ANCOVARequestSerializer`; `regression_views.py:489` `MissingDataRequestSerializer`). Function-based views (nonparametric, categorical, power, survival, mixed_models, missing_data, factor, causal, genomics) use ad-hoc `data.get(...)` + manual `if "x" not in data` presence checks (e.g. `nonparametric_views.py:103`, `categorical_views.py:89`, `power_views.py:93-96`, `meta_analysis_views.py:83-147` — the meta endpoint actually has thorough hand-rolled numeric-range validation). No size bounds anywhere (see F2).
**Recommendation:** Standardize on serializers for type/shape/range validation and automatic OpenAPI schema accuracy; keep the meta-analysis endpoint's range checks as the model.

### F5 (LOW — doc_mismatch) ANCOVA effect-size docstring mentions omega-squared but only partial eta-squared (+ Cohen's f) is computed
**File:** `backend/api/v1/ancova_view.py:326-347`
```python
326:  def _calculate_effect_sizes(self, result, df):
...   partial_eta_sq = ss_group / (ss_group + ss_error)   # correct formula
...   cohen_f = (eta_sq / (1 - eta_sq)).sqrt()             # correct
```
Partial eta-squared `SS_effect/(SS_effect+SS_error)` and Cohen's f are computed correctly; the header docstring of `post()` and surrounding docs reference omega-squared, which is never produced. Also note `_perform_post_hoc` (ancova_view.py:360-378) marks pairwise comparisons `significant` as `abs(mean_diff) > 0` with an inline `# Simplified` comment — this is a degenerate "always significant if any difference" placeholder, not a real post-hoc test.
**Reality:** Omega-squared absent; ANCOVA post-hoc significance is a non-statistical stub.
**Recommendation:** Implement omega-squared or drop it from the docstring; replace the `> 0` post-hoc significance with a real Tukey/Bonferroni-adjusted test (or clearly label it as not implemented).

### F6 (INFO — confirmed real) AI Advisor is genuinely Claude-powered, with honest degradation when unconfigured
**File:** `backend/api/v1/ai_advisor_views.py:4-5`; engine `backend/ai_advisor/services/ai_service.py`
```python
# view docstring:
5:  Provides Claude-powered statistical guidance with scientific integrity.
# engine (ai_service.py):
22:   import anthropic
272:  self.api_key = os.environ.get("ANTHROPIC_API_KEY")
279:  if ANTHROPIC_AVAILABLE and self.api_key:
281:      self.client = anthropic.Anthropic(api_key=self.api_key)
335:  response = self.client.messages.create(...)
557:  "error": "AI Advisor is not available. Please set ANTHROPIC_API_KEY environment variable.",
```
**Confirmed:** the chat path is a real Anthropic-SDK integration. The views are honest thin delegators to `ai_advisor.services.get_ai_advisor_service()` and `ai_advisor.services.nlp_enhanced` (`get_query_parser`, `get_plan_generator`, `get_report_generator`). When the SDK is missing or `ANTHROPIC_API_KEY` is unset, the service logs a warning and returns a "not available" message (ai_service.py:288-290, 557) and the view maps `error_type == "configuration"` to HTTP 503 (ai_advisor_views.py:97-98) — it does NOT fabricate statistical advice. NLP parsing, analysis-plan, and APA-report generators (`ai_advisor/services/nlp_enhanced/{query_parser,plan_generator,report_generator}.py`) are real deterministic code independent of the LLM. The "Claude-powered" branding is accurate.
**Reality:** Genuine LLM integration with safe degradation; no overclaim.
**Recommendation:** None required. (Optional: document that chat requires `ANTHROPIC_API_KEY` and degrades to 503 otherwise, so deployers aren't surprised.)

---

## (c) Claims-vs-reality table

| # | Claim (docs/MEMORY/paper) | Status | Evidence |
|---|---|---|---|
| 1 | Each statistical endpoint calls a real backend engine (no canned output) | **confirmed** | All 17 files delegate to real `core/`/`core.services` engines; verified imports + calls (e.g. correlation_views.py:74-102, regression_views.py:148-210, meta_analysis_views.py:150, survival_views.py:34, causal_views.py:21-37, genomics_views.py:98). No mock/canned numbers found. |
| 2 | Inputs are validated via serializers | **partial** | Class-based views use serializers (correlation:43, regression:94, ancova:59, missing-data:489). Function-based views use ad-hoc `data.get` checks; meta-analysis has thorough hand-rolled range validation (meta:83-147). No size bounds (F2). |
| 3 | Results match the underlying hp_*/services engines; no silent fake fallback | **confirmed** | Delegations verified; availability/503 paths exist (survival_views.py:60-75). No fabricated fallback numbers. |
| 4 | ai_advisor produces real advice (not a stub) | **confirmed** | Views are real delegators (ai_advisor_views.py:25-32, 87-88); chat path is a genuine Anthropic-SDK integration (ai_service.py:22,272,281,335) that degrades to HTTP 503 when unconfigured rather than faking advice; NLP/plan/APA-report are real deterministic code (F6). |
| 5 | genomics_views backs paper Case Study 4 and is real | **confirmed** | genomics_views.py:23-25 imports `DifferentialExpressionService`; line 98-104 calls `service.analyze(...)`; returns `result.to_dict()`. Real engine, real BH-FDR/Guardian per docstring. |
| 6 | "50 decimal precision" on correlation/stats endpoints | **partial / refuted-for-pvalue** | Coefficient/moments are real `Decimal`/`mpmath` 50-digit (hp_correlation:355-419; high_precision_calculator descriptive moments). p-values are float64 via `stats.t.cdf` and can be 0.0 (F1). |
| 7 | Meta-analysis Egger/Begg/heterogeneity backed by real engine | **confirmed** | meta_analysis_views.py:366-383 `engine.eggers_test`/`beggs_test`; engine `core/meta_analysis.py` has `eggers_test`(~282), `subgroup_analysis`(426), `sensitivity_analysis`(485), `run_meta_analysis`(628). |
| 8 | Multiple-regression endpoint returns coefficients/p-values/diagnostics | **confirmed** | regression_views.py:216-275 builds `coefficients`, `p_values`, `confidence_intervals`, full `diagnostics` (VIF, Breusch-Pagan, Durbin-Watson, Jarque-Bera) and returns at :329. (An earlier-draft "empty return" claim was a tooling artifact — RETRACTED.) |
| 9 | Descriptive excess-kurtosis correct | **confirmed** | high_precision_calculator.py:152-153 `if excess: kurtosis -= mpf(3)` — correct. (Earlier-draft "subtracts 4" claim was a tooling artifact — RETRACTED.) |
| 10 | Endpoints are authenticated / rate-limited | **refuted** | F2 — 121 AllowAny, 0 IsAuthenticated, 1 throttle (ai_advisor only), unauthenticated PDF upload (sqs:103-104). |
| 11 | ANCOVA reports omega-squared; ANCOVA post-hoc is a real test | **refuted** | F5 — only partial eta-squared + Cohen's f; post-hoc significance = `abs(mean_diff) > 0` (ancova_view.py:375 `# Simplified`). |

---

## (d) Prioritized recommendations toward world-class

1. **F1 — make the precision claim truthful.** Either compute p-values via high-precision incomplete beta (`mpmath`) or label precision per-field; switch `1 - cdf` → `t.sf` everywhere to avoid `p=0.0`. This directly affects a headline marketing claim ("50-digit precision") that papers/READMEs lean on.
2. **F2 — add `AnonRateThrottle`, array/matrix/PDF size ceilings, and request timeouts** across the statistical API. Document the intentional public-calculator design.
3. **F3/F4 — standardize input validation** on serializers (or explicit 400-returning checks) so malformed input never 500s; use the meta-analysis endpoint's numeric-range validation as the template.
4. **F5 — fix the ANCOVA post-hoc stub** (`abs(mean_diff) > 0`) with a real adjusted pairwise test, and reconcile the omega-squared docstring.
5. **F6 — confirm the AI-advisor LLM path** with the AI-subsystem audit; ensure docs separate deterministic NLP/APA features from the LLM-dependent chat.
6. Add a CI smoke test that POSTs to every routed statistical endpoint (`backend/api/v1/urls.py`) and asserts a non-empty, schema-valid result body and a 400 (not 500) on malformed input — this catches both regressions and validation gaps automatically.

---

### Appendix — retracted earlier-draft findings (tooling artifacts)
- **RETRACTED:** "regression endpoint returns empty `{}` due to early `return`." Verified false: `regression_views.py:98-329` runs the full handler and returns real results; there is no early return.
- **RETRACTED:** "descriptive excess kurtosis subtracts 4." Verified false: `core/high_precision_calculator.py:153` subtracts `mpf(3)`.
- **NOTE on duplicate imports:** the earlier draft claimed triplicated `parameter_adapter` imports at regression_views.py:17-20. The verified header (lines 17-21) imports `parameter_adapter` once (line 20) alongside `HighPrecisionRegression`, `MissingDataHandler`, serializers, and `cache_utils`. No duplication — RETRACTED.
