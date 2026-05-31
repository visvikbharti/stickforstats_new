# Audit: Guardian Statistical Protection System (core)

Date: 2026-05-31
Auditor: senior code/statistics/security auditor (read-only)
Subsystem: `backend/core/guardian/` + assumption-check overlap (`core/assumption_checker.py`, `core/services/assumption_service.py`)
Method: full source read, AST structure extraction, live execution under real Django settings (multiple seeds), numeric verification of formulas.

---

## (a) Ground truth — what this subsystem really is and does

The active Guardian engine is the class **`GuardianCore`** in `backend/core/guardian/guardian_core.py` (1,322 lines). `core/guardian/views.py:18` imports it via `from .guardian_core import GuardianCore, GuardianReport`. The package imports cleanly under Django (verified live: `import core.guardian` and `from core.guardian.guardian_core import GuardianCore` both succeed; `__init__.py:23-48` re-exports only names that exist).

Architecture (the MEMORY/doc line numbers and the old name `StatisticalGuardian` are STALE; the class is `GuardianCore`):
- 8 validator CLASSES (not 8 methods on one class), registered in `GuardianCore.__init__` (guardian_core.py:354-363): `NormalityValidator` (687), `VarianceHomogeneityValidator` (769), `IndependenceValidator` (819), `OutlierDetector` (906), `SampleSizeValidator` (963), `ModalityDetector` (997), `LinearityValidator` (1038), `HomoscedasticityValidator` (1236).
- Entry point `GuardianCore.check(data, test_type, alpha)` (line 410): selects required assumptions from `test_requirements` (367-401), runs each validator, builds an audit trail, applies a `ContextualSeverityAdjuster` (177-341), computes `can_proceed` (no critical violations) and a confidence score, and attaches matplotlib visualizations + effect sizes.
- Confidence: `_calculate_confidence` (636), formula at line 662: `confidence = max(0, 1 - (total_penalty / (max_possible_penalty * 1.2)))`, with `SEVERITY_WEIGHTS = {critical:3.0, warning:2.0, minor:1.0}` (26-30). MATCHES the documented claim exactly.

Statistical methods are real and sound:
- Normality: Shapiro-Wilk (n<=5000) else Anderson-Darling with a GENUINE continuous p-value (`core/utils/anderson_darling.py` — D'Agostino-Stephens 1986 / nortest::ad.test piecewise-exponential approximation). The previously-flagged "step-function categorical Anderson-Darling" is FIXED and well documented.
- Independence: lag-1 Pearson autocorrelation via `stats.pearsonr(arr[:-1], arr[1:])` (855) with exact t-p-value, requiring BOTH p<alpha and |r|>0.3 (warning)/>0.5 (critical). The class docstring (820-836) is unusually honest: it explicitly states this is NOT Durbin-Watson and is only meaningful for sequential data. The previously-flagged "claims Durbin-Watson but computes lag-1 Pearson on raw data" is FIXED (no false DW claim remains).
- Variance: Levene (center=median); Homoscedasticity: Breusch-Pagan via n*R^2 ~ chi2(1); Linearity: linear-vs-quadratic R^2 improvement + runs test on residuals; Outliers: IQR + |z|>3; Sample-size and Modality (KDE peak detection).
- Effect sizes (`effect_size_calculator.py`, 357 lines): Cohen's d (pooled SD), correlation r with Fisher-z CI, eta^2 (ANOVA), Cramer's V. 5 methods, NO duplicates (AST). Numerically verified correct. Note: this file has NO Hedges' g, NO omega^2, and NO epsilon^2 method (those live elsewhere in the codebase, not in the guardian package).
- Transformations (`transformation_engine.py`) and report generation (`report_generator.py`, used by the PDF/JSON export views at views.py:306-360) are real.
- Visualizations (`visualization_generator.py`): real matplotlib -> base64 PNG.

Live behavior verified (under Django, multiple seeds):
- Clean two-group normal data, t_test: `can_proceed=True`, `confidence=1.0`, 0 violations.
- Extreme heteroscedasticity (N(0,1) n=40 vs N(0,20) n=40, Levene p~1e-11), t_test, 10 seeds: `can_proceed=False`, `confidence=0.167`, variance_homogeneity correctly stays **critical** (NOT downgraded). The engine blocks as intended.

Three+ overlapping assumption engines coexist:
- `service_integration.py` (282 lines): `GuardianServiceWrapper`, `guardian_protected` decorator, `GuardianIntegratedService` — these just delegate to `GuardianCore.check` (no independent statistical/confidence logic). The `guardian_protected` decorator is applied ONLY in `core/guardian/tests/test_guardian_integration.py`, never in production — tested-but-unused.
- `core/assumption_checker.py` (1,019 lines, `AssumptionChecker`): a SEPARATE live engine imported by `core/api_views.py`, `core/automatic_test_selector.py`, `core/test_recommender.py`, `api/v1/correlation_views.py`, `api/v1/ancova_view.py`, `api/v1/views.py`. It uses Durbin-Watson on residuals for independence (vs GuardianCore's lag-1 Pearson).
- `core/services/assumption_service.py` (898 lines): a third live overlap engine.

API endpoints (views.py, 579 lines): 7+ `APIView` classes, all `permission_classes = [AllowAny]` (lines 30,126,159,240,276,329,384,434,490,541), overriding the project default `IsAuthenticated` (settings.py:148-150), with explicit "public endpoint" comments.

Tests: `backend/tests/test_guardian_validators.py` has exactly 46 `def test_` (MEMORY claim CONFIRMED).

---

## (b) Findings

### F1 (MEDIUM, security) — All Guardian endpoints are unauthenticated AND run unbounded compute on user input
Evidence: every Guardian APIView sets `permission_classes = [AllowAny]` (views.py:30,126,159,240,276,329,384,434,490,541), overriding the project default `IsAuthenticated` (settings.py:148-150). `GuardianDetectOutliersView` does `arr = np.array(data)` (views.py:174); the check endpoints run sklearn `LinearRegression` (guardian_core.py:1080), `gaussian_kde` (1009), Levene, and Breusch-Pagan on arbitrary-size user arrays with no explicit max-length/max-group guard. There is no DRF `DEFAULT_THROTTLE_RATES` in settings.py (only an unused constant `RATE_LIMIT_DEFAULT_ANONYMOUS = 20` at settings.py:326) and no throttle attached to these views.
Reality: Anonymous callers can submit large/crafted payloads consuming significant CPU/memory per request, with no auth and no evident rate limit. The public-good design intent is reasonable but lacks guardrails.
Recommendation: Add explicit input-size validation (max array length, max group count) and attach a throttle (e.g., a `guardian` scope or `AnonRateThrottle`) to the Guardian views.

### F2 (MEDIUM, quality) — Three+ overlapping assumption engines with divergent implementations; tested-but-unused integration decorator
Evidence: `guardian_protected` (service_integration.py:159) is applied only in `core/guardian/tests/test_guardian_integration.py` (lines 226,241), never in production code. `core/assumption_checker.py` (1,019 lines) is a separate live engine imported by 6 modules including `api/v1/views.py`; it uses Durbin-Watson for independence while `GuardianCore` uses lag-1 Pearson. `core/services/assumption_service.py` (898 lines) is a third live overlap engine.
Reality: The same conceptual assumption check (normality, independence, etc.) can yield different verdicts depending on which engine an endpoint calls; the integration decorator is dead weight in production.
Recommendation: Document the intended division of responsibility between `GuardianCore`, `assumption_checker.py`, and `assumption_service.py`; converge on one implementation per assumption to avoid divergent verdicts; delete or wire up the unused `guardian_protected` decorator.

### F3 (LOW, quality) — `adjust_normality_severity` will downgrade a non-normality violation if mis-dispatched
Evidence: `ContextualSeverityAdjuster.adjust_normality_severity` (guardian_core.py:196-232) downgrades any violation passed to it based purely on sample size and test_type (the CLT/Lumley-2002 rationale), without checking `violation.assumption`. Called directly on a variance_homogeneity violation it returns severity "warning". The dispatcher `adjust_all` (302-336) currently gates this correctly (the normality branch only triggers for assumption in {"normality","shapiro_wilk","normalcy"}), so in the live pipeline a variance violation is NOT downgraded (verified across 10 seeds: variance stays critical, can_proceed=False). This is a latent footgun, not a current defect.
Reality: No current mis-behavior, but the helper would silently apply a statistically irrelevant CLT downgrade to any violation if a future caller forgets the name gate.
Recommendation: Add an internal guard inside `adjust_normality_severity` (early-return if `violation.assumption` is not a normality variant) so correctness does not depend solely on the caller's dispatch.

### F4 (LOW, bug) — Vestigial no-op statement in `calculate_eta_squared`
Evidence: effect_size_calculator.py:215 `len(all_data)` — a bare expression whose result is discarded (leftover from a removed `n = len(all_data)`).
Reality: Harmless dead statement; no effect on the (correct) eta^2 computation.
Recommendation: Remove the orphan line.

### F5 (LOW, doc_mismatch) — Stale MEMORY/doc references (line numbers and class name)
Evidence: MEMORY says "8 validators in guardian_core.py (lines 687-1264)" and refers to the engine as `StatisticalGuardian`; reality: validators span 687-1322 and the class is `GuardianCore` (line 344; `StatisticalGuardian` has 0 occurrences). The Phase-2 fix line refs (`:811-845`, `:710-714`) no longer match (the underlying fixes are genuinely present, just relocated).
Recommendation: Refresh MEMORY/doc references.

### F6 (INFO) — Confirmed-correct items (positive findings)
- Confidence formula and weights match docs exactly (guardian_core.py:26-30, 662).
- Anderson-Darling continuous p-value is a real D'Agostino-Stephens / nortest implementation (core/utils/anderson_darling.py) — prior bug fixed.
- Independence validator no longer falsely claims Durbin-Watson; uses lag-1 Pearson with a proper p-value and an honest docstring — prior bug fixed.
- Effect sizes (Cohen's d pooled, eta^2, Cramer's V, Fisher-z correlation CI) verified numerically correct; no duplicate methods.
- Guardian package imports cleanly under Django; 46 validator tests present.
- Live behavior is correct: clean data -> proceed/conf 1.0; extreme variance -> blocked/critical (10 seeds).

---

## (c) Claims-vs-reality table

| Claim (MEMORY/docs/papers) | Status | Reality / Evidence |
|---|---|---|
| "8 validators in guardian_core.py (lines 687-1264)" | PARTIAL | 8 validator CLASSES at 687,769,819,906,963,997,1038,1236 (span 687-1322). Count correct, line range stale. |
| Confidence `max(0, 1 - sum(w_si)/(max_penalty*1.2))` at :662 | CONFIRMED | guardian_core.py:662 verbatim; max_penalty=len(violations)*3.0 at :658. |
| Weights critical=3.0/warning=2.0/minor=1.0 at :26-30 | CONFIRMED | guardian_core.py:26-30 exact. |
| IndependenceValidator "claims Durbin-Watson but computes lag-1 Pearson" — fixed? | FIXED | Class 819-903; `stats.pearsonr(arr[:-1],arr[1:])` (855) + honest "this is NOT Durbin-Watson" docstring. |
| Anderson-Darling "step-function categorical" — fixed? | FIXED | guardian_core.py:717-723 calls real continuous `anderson_pvalue_continuous` (core/utils/anderson_darling.py). |
| "46 dedicated validator tests" | CONFIRMED | grep -c def test_ = 46. |
| Engine class is `StatisticalGuardian` | REFUTED | Class is `GuardianCore` (line 344); 0 occurrences of StatisticalGuardian; package imports fine. |
| Effect-size formulas correct | CONFIRMED | Cohen's d / eta^2 / Cramer's V / Fisher-z CI verified; 5 methods, no duplicates. |
| Guardian blocks severe assumption violations | CONFIRMED | Extreme variance t_test (10 seeds): can_proceed=False, variance stays critical, conf=0.167. |
| Guardian endpoints are a public good (no auth) | CONFIRMED (with caveat) | All AllowAny by design, overriding default IsAuthenticated; but no input-size cap or throttle (F1). |

---

## (d) Prioritized recommendations toward "world-class"

1. (F1) Add explicit input-size validation and a throttle to the public Guardian endpoints.
2. (F2) Document and converge the overlapping assumption engines (`GuardianCore`, `core/assumption_checker.py`, `core/services/assumption_service.py`) so the same assumption cannot produce different verdicts on different endpoints; delete or wire up the tested-but-unused `guardian_protected` decorator.
3. (F3) Harden `adjust_normality_severity` with an internal assumption-name guard so correctness does not depend solely on the caller's dispatch.
4. (F4) Remove the no-op `len(all_data)` line.
5. (F5) Refresh MEMORY/doc line numbers and the class name.

Overall: the ACTIVE Guardian engine is statistically sound on its headline path, the two previously-flagged math bugs (Durbin-Watson mislabel, Anderson-Darling step-function) are genuinely fixed and well documented, the package imports cleanly, and live behavior is correct (clean data proceeds; severe violations block). No fabrication, hardcoded "results", or wrong headline formulas were found. The remaining risks are operational/maintainability: unauthenticated unbounded public endpoints (F1), overlapping/duplicate assumption engines (F2), and a latent severity-downgrade footgun (F3).
