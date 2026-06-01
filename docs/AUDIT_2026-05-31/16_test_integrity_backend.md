# Audit: Backend Test-Suite Integrity

**Date:** 2026-05-31
**Auditor:** Backend test-integrity subsystem audit (read-only)
**Repo:** /Users/vishalbharti/StickForStats_v1.0_Production
**Scope:** All backend test files — `backend/tests/*`, `backend/core/tests/*`, `backend/core/guardian/tests/*`, `backend/{confidence_intervals,doe_analysis,sqc_analysis}/tests/*`, `backend/core/test_recommender*.py`, `backend/api/v1/simple_test.py`, `backend/api/v1/test_missing_endpoints.py`.

> Method note: every count below was produced programmatically and re-verified by running the suites. Where iteration produced wrong intermediate numbers (from a truncated parallel command), they were discarded; the figures here come from a complete Django `DiscoverRunner.build_suite([])` enumeration and a clean regex pass, with the headline suites actually executed.

---

## (a) Ground Truth — what this subsystem really is

There are **39 test-named Python files** under `backend/`, containing **860 `def test_` functions** (clean regex count — matches the "~860 backend" claim almost exactly). The headline scientific/statistical regression tests are **real, adversarial, and meaningful**; the security-critical JWT-signature and certification tests are genuinely negative-path (they assert that forged/expired/revoked artifacts are **rejected**) and pass. This is a credible, healthy suite.

There is **one** material integrity problem, plus minor quality issues:

**Material:** **CI exercises only 799 of the 860 static tests; the 61-test gap is two whole files that the CI command never runs.** The CI backend step is `python manage.py test --verbosity 2` (`.github/workflows/ci.yml:108`, working-directory `backend`) with no test label. Django's `DiscoverRunner.build_suite([])` discovers exactly **799 tests** (verified). The 61 un-run tests are entirely in `backend/tests/test_effect_sizes_validation.py` (29) and `backend/tests/test_power_analysis_validation.py` (32) — both written as **pytest-style classes with no `unittest.TestCase` base** (`class TestEffectSizeValidation:` at `test_effect_sizes_validation.py:36`, `import pytest` at `:24`, `@pytest.fixture` at `:39`; same shape in the power file). Django's test runner only collects `TestCase` subclasses, so these are silently skipped — and although `requirements.txt` provides pytest, the backend CI job **never invokes pytest**, only `manage.py test`. So 61 genuinely value-checked tests (e.g. Cohen's d cross-checked against R `effectsize` = 1.93, G*Power power values) are dead in CI.

**Verified-good (initial draft suspicions refuted):**
- `core/tests/test_platform_services.py` (104 tests) **IS discovered and run by CI, and it PASSES**: a full run gives `Ran 104 tests in 57.5s ... OK` (exit 0). (An earlier intermediate note of "FAILED" was an artifact of a truncated run and mistyped method names; on careful re-run the file is green.)
- No `@skip`/`@expectedFailure`/`xfail` anywhere. Only **3 `@skipUnless`** optional-dependency guards (SciPy / SQS availability) — not used to hide failures.
- The headline regression suites I executed are all green: guardian math-fixes (12), cascade effect-sizes (10), JWT (20), genomics (6), certification (38).

### Verified test counts (programmatic)

| Metric | Value | How verified |
|---|---|---|
| Static `def test_` in 39 test-named files | 860 | clean regex pass |
| CI-discovered (`build_suite([])`, no label) | 799 | Django runner |
| Silently not run by CI | 61 | `test_effect_sizes_validation.py` (29) + `test_power_analysis_validation.py` (32) |
| `test_platform_services.py` (run by CI) | 104, **OK (exit 0)** | full explicit run |
| `@skip`/`@expectedFailure`/`xfail` | 0 | grep |
| `@skipUnless` (optional-dep guards) | 3 (scipy/SQS) | grep |
| No-assertion test functions | 3 | body scan |
| Trivial (`assertTrue(True)`-only) | 1 | body scan |
| API asserts accepting 2xx OR 4xx/5xx | 8–12 | grep |
| Non-test files in test namespace (0 asserts) | 5 | grep |

---

## (b) Findings

### F1 — 61 effect-size/power tests are never run by CI (pytest-style classes under a `manage.py test` pipeline) — HIGH (missing_test)
**Evidence:**
- `.github/workflows/ci.yml:108` — backend test step = `python manage.py test --verbosity 2` (Django runner, no pytest call); `requirements.txt` provides pytest but no backend CI step invokes it.
- `backend/tests/test_effect_sizes_validation.py:24` `import pytest`, `:36` `class TestEffectSizeValidation:` (NOT a `TestCase`), `:39` `@pytest.fixture`; `backend/tests/test_power_analysis_validation.py:25,34` identical shape (`class TestGPowerValidation:`).
- Programmatic: `DiscoverRunner.build_suite([]).countTestCases() == 799`; the only "orphaned" test-bearing files are these two (29 + 32 = 61). All other 37 files are collected.

**Doc claim contradicted:** `paper/plos_compbio/manuscript.md:133,249` and `paper/paper.md:170`: "more than 1,500 automated tests (approximately 860 backend …) executed in CI." 61 of the 860 are not executed by the CI command.
**Reality:** Real, value-checked tests (e.g. `test_cohens_d_two_sample` at `test_effect_sizes_validation.py:55-78` asserts `abs(result.value - 1.93) < 0.05` against R `effectsize`), but Django's runner cannot collect non-`TestCase` classes, so they never run in CI.
**Recommendation:** Add a `pytest backend/tests/test_effect_sizes_validation.py backend/tests/test_power_analysis_validation.py` step to the backend CI job, or convert the two files to `unittest.TestCase`. Add a CI assertion pinning the discovered test count so silent drops can't recur.

### F2 — Five files in the test namespace are not tests (0 assertions); two are library code named `test_*` — MEDIUM (quality / stub_vs_claim)
**Evidence (all 0 `TestCase`, 0 `def test_`, 0 `assert`):**
- `core/test_recommender.py` (44 KB) and `core/test_recommender_scenarios.py` (46 KB) — these are the recommender *implementation / scenario library*, not tests (top of file: "Statistical Test Recommendation Engine … This module implements an intelligent test recommendation system"; classes `TestCategory(Enum)`, `TestRecommendationEngine` are domain classes whose names merely start with "Test").
- `api/v1/simple_test.py` — a DRF view: `def simple_test(request): return Response({"message": "Server is running!"})`.
- `api/v1/test_missing_endpoints.py` — a `requests`-based manual script hitting `http://localhost:8000` with 13 `print()` and 0 asserts.
- None are collected by CI.

**Reality:** These pollute the "test file" inventory; `core/test_recommender*.py` are especially misleading (library code under a `test_` prefix).
**Recommendation:** Rename `core/test_recommender*.py` to drop the `test_` prefix; move/rename `simple_test.py` and `test_missing_endpoints.py` out of the test namespace.

### F3 — Genomics "silent-failure" test uses a disjunctive accept (`cascaded or test_failed`) — LOW (missing_test)
**Evidence:** `core/tests/test_genomics_silent_failures.py:55-59` — `self.assertTrue(result.cascaded or result.test_failed, ...)`, then checks `isnan(raw_p_value)` only `if result.test_failed`. A wrong-reason path could satisfy the disjunction. (The file is otherwise strong: 6 deterministic assertions on non-empty `violations`, `to_dict()` NaN→None conversion, and the normal path; 6/6 pass.)
**Doc claim:** docstring `:1-26` — tests pin that uncomputable checks "raise visible flags instead of silently substituting 'not significant'." Mostly true.
**Recommendation:** Assert the specific expected branch (`test_failed is True` AND `isnan(raw_p_value)`) rather than the disjunction.

### F4 — A few API assertions accept both success and error status as pass — LOW (missing_test)
**Evidence:** `tests/test_security.py` (4), `tests/test_api_endpoints.py` (2), `core/tests/test_v2_api_endpoints.py` (2: `test_delete_project_archives`, `test_install_nonexistent_plugin_returns_404`) use `assertIn(response.status_code, [2xx, 4xx/5xx])`. By contrast `confidence_intervals/tests/test_api.py` is strict (`assertEqual(status_code, 200/201)` at lines 50,62,73,86,104,126,155). Suite-wide total accepting a 2xx-and-4xx/5xx list is ≈8–12. Most are justified (a delete may return 200/204; a not-found may return 400/404).
**Recommendation:** Tighten where a single status is genuinely expected; otherwise acceptable.

### F5 — Negative JWT tests use `assertRaises(Exception)` rather than specific exception types — LOW (quality)
**Evidence:** `core/tests/test_jwt_signature_verification.py` rejection tests use broad `assertRaises`. Mitigated by the strong positive happy-path test (`TestSSOValidateToken`) and explicit `alg=none`/`alg=HS256` algorithm-confusion cases (docstring `:16-23`). 20/20 pass.
**Recommendation:** Narrow to `jose` `JWTError`/`ExpiredSignatureError` subclasses.

---

## (c) Claims-vs-Reality

| Claim (source) | Status | Evidence |
|---|---|---|
| "approximately 860 backend" automated tests (`paper/plos_compbio/manuscript.md:133,249`, `paper/paper.md:170`) | **CONFIRMED (count)** | 860 static `def test_` across 39 files. |
| …"executed in CI" | **PARTIAL** | Only **799 run in CI**; 61 (effect-size + power) are pytest-style and never collected by `manage.py test`. |
| "all required CI checks are green on the main branch" (`manuscript.md:133`) | **CONFIRMED locally** | The largest CI-run file `test_platform_services.py` → `Ran 104 tests ... OK` (exit 0); other headline suites green. (CI itself not re-run here, but the local `manage.py test` of the heaviest module passes.) |
| Math fixes (Durbin-Watson honestly renamed, AD continuous p) covered by regression tests | **CONFIRMED** | `test_guardian_math_fixes.py:117-191` asserts validator no longer says "Durbin-Watson" and matches `scipy.stats.pearsonr` to 10 places; `guardian_core.py:819-889` lag-1 Pearson autocorr (documented as NOT Durbin-Watson); `:709-723` `anderson_pvalue_continuous`. 12/12 pass. |
| Cascade Wilcoxon r=\|Z\|/√N and KW eta²/epsilon² fixed and tested | **CONFIRMED** | `cascade_engine.py:357-386` r=\|Z\|/√N, label "r (\|Z\|/sqrt(N), Rosenthal 1991)"; `:412-447` KW; `test_cascade_engine_effect_sizes.py:62-167` asserts each formula to 10 places and that the label is no longer "Epsilon-squared". 10/10 pass. |
| No tests skipped/xfail to hide failures | **CONFIRMED** | 0 `@skip`/`@expectedFailure`/`xfail`; only 3 `@skipUnless(SCIPY_AVAILABLE/SQS_AVAILABLE)` guards (`test_integration_manuscript.py:351,432`, `test_manuscript_services.py:420,787`). |
| Certification verify rejects fake/revoked/tampered/expired/unknown-SFS certs | **CONFIRMED** | `test_certification_service.py:320-349`: `test_unknown_sfs_prefixed_id_no_longer_validates`, `test_tampered_signature_rejected`, `test_revoked_certificate_rejected`, `test_expired_certificate_rejected`, all `assertFalse(result["valid"])`; 14 `assertFalse`. 38/38 pass. |
| JWT signature verification enforced and adversarially tested (SSO/LTI) | **CONFIRMED** | real RSA keypairs; forged-signature/alg-confusion/expired/wrong-aud/wrong-iss rejection + LTI replay. 20/20 pass. |
| Genomics raises visible flags instead of silently returning "not significant" | **CONFIRMED (minor weakness)** | `test_genomics_silent_failures.py` asserts NaN→None, non-empty `violations`, cascade firing; one disjunctive accept (F3). 6/6 pass. |
| Guardian: 46 validator + 22 integration + 16 middleware tests | **CONFIRMED** | counts match exactly; all run by CI. |
| Tests are "meaningful (assert real expected values)" | **CONFIRMED (with caveats)** | True for the statistics/guardian/JWT/cert suites; the only non-asserting items are the 5 mis-named non-test files (F2) and 3 no-assert helpers. |

---

## (d) Prioritized recommendations toward world-class

1. **(HIGH) Run the pytest files (F1).** Add a `pytest backend/tests/test_effect_sizes_validation.py backend/tests/test_power_analysis_validation.py` step or convert them to `TestCase`. Add a CI count-gate so silent drops are caught.
2. **(MEDIUM) Rename the misnamed non-test files (F2)** — especially `core/test_recommender*.py`, which are library code masquerading as tests; this also de-confuses the "test file" inventory.
3. **(LOW) Tighten the disjunctive genomics assertion (F3),** the few accept-either status assertions (F4), and the broad `assertRaises(Exception)` in JWT tests (F5).
4. **(LOW) After F1, update MEMORY + both manuscripts** so the "executed in CI" figure equals the actually-run count (799 + the 61 once they are wired in).

**Overall:** The scientific, statistical, and security tests are real, negative-path, and pass — a genuinely strong core, and the "~860 backend" count is honest. The one integrity issue worth fixing is that 61 value-checked effect-size/power tests are silently never executed because they are pytest-style under a Django-`manage.py test` CI pipeline, making the "executed in CI" qualifier overstated by ~7%. Everything else is minor quality polish.
