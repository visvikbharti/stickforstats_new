# StickForStats — Proactive Robustness & Accuracy Audit

**Date:** 2026-06-04
**Method:** 9-dimension multi-agent bug-class sweep (Opus 4.8), every candidate adversarially re-verified against current code on disk (read-only; no runtime execution).
**Result:** 16 candidates → **12 confirmed**, 2 uncertain (refuted on close reading), 2 refuted at find stage.

This was a *proactive* audit — hunting the bug **classes** that have bitten us reactively (shadowed identifiers, fabricated values, silent failures, crash-on-render, auth/signature gaps, statistical-formula errors) — rather than waiting for the next live crash.

---

## 0. What the audit CONFIRMED is already fixed (prior remediation held up)

Adversarial re-verification confirmed these previously-flagged issues are genuinely remediated in current `main` — **do not re-open**:

- **Frontend `alpha()` shadow class** — clean; power-analysis lessons alias `alpha as muiAlpha`; the two remaining local `const alpha` are block-scoped inside `useCallback`/`useMemo`, no render-scope shadow.
- **Guardian `IndependenceValidator`** — no longer claims Durbin-Watson; honestly named "Lag-1 Autocorrelation (Pearson)" with correct t-distribution p-value (`guardian_core.py:819-903`).
- **Guardian Anderson-Darling** — continuous D'Agostino-Stephens (1986) p-values, not step-function table (`:717-722`); branch coefficients numerically verified.
- **Cascade Wilcoxon r** — now `|Z|/√N` (Rosenthal), not `W/max(W)`.
- **Cascade Kruskal-Wallis effect size** — correctly labeled η²_H (Tomczak 2014), ε² reported separately; Fisher r×c relabeled Chi-Square/Cramér's V (was "Odds Ratio").
- **HP calculator `t = ±999.999 / p = 1e-50` fabrication** — gone; honest `None` + interpretation for zero-variance edge cases (`:248-296`).
- **SSO / LTI JWT signature verification** — real `jose.jwt.decode` against issuer JWKS, RS256, rejects `none`/HS*, enforces exp/aud/iss; nonce replay protection (`sso_service.py:144-207`, `lms_service.py:208-307`).
- **`placeholder_modulus`** — gone; real RSA public keys served from `lti_keys.py` / `receipt_signing.py`.
- **IDOR / report tokens** — SHA-256-hashed, `hmac.compare_digest`, 404 (not 403) on mismatch (no existence oracle); SSRF guard on LMS grade-passback.
- **HP-ANOVA two-way/RM/MANOVA silent `None`** — now raise `NotImplementedError` (but see F-04 below — that now surfaces as an opaque 500).
- **Manuscript false-positive classes** — Greenhouse-Geisser fractional-df, correlation sample-size critical values, and the `p<.05`→recomputed-`.016` inequality case were **empirically re-tested** and do **not** fire false positives in current code.

---

## 1. Triage table — 12 confirmed findings

| # | Sev | File:Line | Description | Class |
|---|---|---|---|---|
| F-01 | **P0** | `backend/core/missing_data_handler.py:535` | "Little's MCAR test" returns `n·log(#patterns)` as chi-square + p + `is_mcar` verdict — pure fabrication; verdict driven by sample size, not data. Public endpoint. | fabricated statistic |
| F-02 | P1 | `frontend/src/components/AuditDashboard.jsx:48,96` | `new StatisticalTestService()` calls `new` on the default-exported **singleton instance** → TypeError swallowed → `/audit` always shows "No audit data". | import-shape misuse |
| F-03 | P1 | `backend/core/services/cascade_engine.py:357-386` | Wilcoxon Z / n use total pair count, not non-zero-diff count → `z_approx` ~21% wrong & `n_pairs` overstated when any pairs unchanged. | wrong formula |
| F-04 | P1 | `backend/core/hp_anova_comprehensive.py:338-379` | `two_way`/`repeated_measures`/`manova` raise `NotImplementedError` → opaque HTTP 500 on serializer-accepted, routed requests. | crash / unimplemented-advertised |
| F-05 | P1 | `backend/core/sqs_scoring.py:166-190` | Penalty rules subtract from score but add 0 to category max, no floor → negative category/total %, broken progress bar. Public `/sqs/analyze-text/`. | scoring math |
| F-06 | P1 | `backend/core/manuscript/consistency_core.py:172-218` | Flat additive p-tolerance (0.005) swamps tiny p-intervals → real reported-p errors below ~0.01 pass as "consistent" (false negative on headline feature). | false negative |
| F-07 | P2 | `frontend/src/components/DataPipeline.jsx:18,30` | `new HighPrecisionStatisticalService()` on default singleton → TypeError on render (latent — component currently unrouted). | import-shape misuse |
| F-08 | P2 | `backend/core/data_profiler.py:515-540` | Missing-pattern classifier inverts MAR/MNAR, contradicts `missing_data_handler`, declares MNAR from observed-var correlation. Shown on live SmartAnalysis profile. | wrong labeling |
| F-09 | P2 | `backend/api/v1/lms_views.py:79` | `LTILaunchView` passes empty `platform_config={}` → no `jwks_url` → every real signed LTI launch rejected (fails **closed**, not a bypass). | integration broken |
| F-10 | P2 | `backend/core/guardian/guardian_core.py:546,636-664` | Confidence-score docstring grossly wrong (claims ~50% all-critical; actual 16.7%); stale "golden ratio" comment. | misleading docs |
| F-11 | P2 | `backend/core/hp_regression_comprehensive.py:181-184` | Singular-matrix except branch calls `warnings.append()` on the stdlib `warnings` module → AttributeError instead of graceful ridge fallback. | name collision |
| F-12 | P2 | `backend/core/hp_anova_comprehensive.py:740-749` | ANOVA `observed_power` is a fabricated heuristic (`0.8+0.1·effect`, else 0.5); latent — only in an unwired text report, not API JSON. | fabricated statistic (latent) |

---

## 2. Root-cause groups & systemic prevention (fix the class, not the instance)

### Group A — `new` on a default-exported singleton instance (F-02, F-07)
`StatisticalTestService.js` & `HighPrecisionStatisticalService.js` export a singleton **instance** as `default` and the **class** as a named export. `new (default import)()` → `TypeError: not a constructor`.
- **Fix:** AuditDashboard → drop `new` (that module has no named class export, use the singleton directly). DataPipeline → use named class import + `new`, matching the correct pattern in `CorrelationCalculator`/`RegressionCalculator`.
- **Prevent the class:** ESLint `no-restricted-syntax` banning `new <DefaultImportedIdentifier>` for `*Service` modules; or collapse each service to one canonical export shape (class-only, or frozen instance that throws on `new`). Add a smoke test that mounts each routed dashboard and asserts no error-boundary trip (would have caught the silent `/audit` failure).

### Group B — Fabricated/heuristic stats presented (or one step from) as computed (F-01, F-12, F-10)
Placeholder math left under the name of a real statistic with no "approximate/unavailable" signaling. **F-01 (MCAR) is the dangerous one** — ships chi-square/df/p/verdict that are a function of sample size.
- **Fix:** F-01 → implement real EM-based Little's test, or return `available: false` with no statistic. F-12 → keep out of any rendering until a real non-central-F power calc exists. F-10 → correct docstring to true mapping (0.167 / 0.444 / 0.722), delete "golden ratio" comment.
- **Prevent the class:** hard rule — *any value labeled as a named statistic is either genuinely computed or explicitly marked unavailable*. CI grep for placeholder markers ("Simplified approximation", "for now", "placeholder") in compute modules that reach a serializer. Golden-value tests pinning each named statistic to scipy/statsmodels/R (the MCAR test would fail instantly — its output ignores the data values).

### Group C — Missing-data mechanism logic duplicated & divergent (F-08, + F-01)
Two independent classifiers with contradictory thresholds; one is exposed live with no caveat.
- **Fix:** collapse to a single shared classifier (low→MCAR, mid→MAR, high→"MNAR suspected / cannot rule out"); drop the unsound "MNAR from observed-variable correlation" claim; surface a "heuristic, not a formal test" caveat. `data_profiler` should delegate, not re-implement.

### Group D — Unimplemented features advertised through serializer/routes → opaque 500 (F-04)
Serializer whitelists the types + URLs registered, but methods raise `NotImplementedError` → generic 500.
- **Fix:** implement (an ANCOVA/two-way path exists in `services/anova/` — verify then wire), **or** return honest 501/400 and remove the type from the serializer whitelist + advertised routes.
- **Prevent:** contract test POSTing each serializer-accepted `anova_type`, asserting result-or-honest-501, never a `NotImplementedError`→500.

### Group E — Error-path bugs / missing clamps (F-11, F-05)
- **Fix:** F-11 → append to `RegressionResult.warnings` list (rename local / use dataclass field). F-05 → floor each category score and total at 0: `max(0.0, min(weighted_score, weighted_max))`; guard progress-bar width.
- **Prevent:** pylint `no-member` catches `warnings.append`; property-test SQS with penalty-heavy inputs asserting output ∈ [0,100].

### Group F — Integration contract that fails closed (F-09)
- **Fix:** resolve platform from JWT issuer against `LMSPlatformRegistry.get_platform_config` and pass `{jwks_url, client_id, issuer}`.
- **Prevent:** LTI launch happy-path integration test with a locally-signed id_token (nothing currently exercises a *successful* launch).

---

## 3. Fix-first

**F-01 — fabricated "Little's MCAR test" (P0).** Only finding that is (a) reachable by a live beta user on a public endpoint, (b) presents a named textbook statistic + a definitive boolean verdict that are entirely fabricated, and (c) directly violates the "100% scientifically accurate, no fabricated values" mandate. The verdict is governed by sample size, so it is *confidently wrong* for essentially every moderately-sized dataset and steers users toward invalid imputation choices.

---

## 4. Refuted on close reading (latent smells, not active bugs)

- **MasterTestRunner Guardian-on-`Math.random()`** — the "All assumptions met" banner is **dead code** (backend never sends `all_assumptions_met`); the page has no working real-data input (manual entry is an unimplemented placeholder) and no nav link. A non-functional demo page, not a fabricated verdict on user data. Worth deleting/gating opportunistically.
- **Mixed-model influence diagnostics swallow** — the only realistic `except` trigger (Series label-vs-positional indexing) can't fire on the JSON-built RangeIndex DataFrames these endpoints use; verified end-to-end that the standard path returns the injected outlier. Effectively-dead `except` on the live path.

---

## 5. Coverage gaps — follow-up passes warranted

- **fe-crash:** DOE / Survival / Factor-analysis result components were **not** exhaustively read — they share the `analysisResult`-from-serializer wizard pattern that produced the SQC `plot_data` crash class. **Highest-value follow-up:** diff each module's serializer against its frontend result renderer.
- **hardcoded:** only highest-risk endpoints among 198 spot-checked; full surface + per-algorithm numeric correctness not exhaustively swept.
- **stat-hp:** ANCOVA `services/anova/advanced_anova_service.py` (the real two-way/RM path) not deep-checked — verify before wiring into F-04. Regression diagnostics (Breusch-Pagan, Jarque-Bera, VIF) read for formula only, not numerically diffed vs statsmodels.
- **silent-fail:** Bayesian BF integration & p-curve evidential-value test need a deeper statistical-correctness review; `profiling_service.get_cached_profile` appears unwired.
- **stat-manuscript:** PDF/GROBID/LaTeX/DOCX extraction path not exercised; negative-SQS frontend rendering inferred, not browser-observed.
- **General:** entirely static/read-only — no finding runtime-reproduced.
