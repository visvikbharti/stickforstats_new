# Audit 17 — Frontend + E2E Test Integrity, CI Gating

**Date:** 2026-05-31
**Auditor:** Senior auditor (skeptical, code-first)
**Subsystem:** Frontend Jest tests, Playwright E2E specs, GitHub Actions CI gating
**Repo root:** `/Users/vishalbharti/StickForStats_v1.0_Production`

> **NOTE:** This report supersedes an earlier draft that contained speculative
> findings (about a `frontend/e2e/` dir, `e2e/specs/`, `Login.test.jsx`,
> `describe.skip` suites, and `|| true` on the frontend test step) which DIRECT
> CODE INSPECTION REFUTED. None of those files exist and none of those
> conditions hold. The findings below are grounded only in confirmed file:line
> evidence. The honest verdict is that this subsystem is **in materially better
> shape than MEMORY claims** — several MEMORY statements describe a stale,
> worse-than-reality state.

---

## (a) Ground Truth — what this subsystem really is

### Frontend unit/component tests (Jest / react-scripts + RTL) — CONFIRMED
- **30 test files** under `frontend/src` (`*.test.js` / `*.test.jsx`); full list enumerated.
- **653 `it()`/`test()` cases**, **210 `describe()` blocks** (per-file counts captured).
- **ZERO skipped suites or focused tests**: `grep -rnE "describe\.skip|it\.skip|test\.skip|\.only\(|xit\(|xdescribe\("` over all frontend test files returns **no matches** (exit 1).
- **ZERO placeholder assertions**: `grep -rnF "expect(true).toBe(true)"` returns **no matches**. (The only "placeholder" hits are legitimate `getByPlaceholderText(...)` queries in `NaturalLanguageBar.test.jsx` and `ReportList.test.jsx`.)
- The suite is **substantive and computational-heavy**: largest files are math/validation —
  `probability_distributions/utils/distributions.test.js` (77),
  `utils/validation/__tests__/ValidationIntegration.test.js` (54),
  `components/doe/utils/designCalculations.test.js` (51),
  `pca/education/utils/linearAlgebra.test.js` (47),
  `utils/simulationUtils.test.js` (44),
  `utils/validation/ValidationSystem.test.js` (42),
  `utils/validation/__tests__/ComplianceTests.test.js` (38).
- No custom Jest config (CRA defaults via `react-scripts test`).

### E2E tests (Playwright) — CONFIRMED, real and runnable
- Located at **`e2e/`** (NOT `frontend/e2e/`, NOT `e2e/specs/`).
- Real `@playwright/test@1.47.2` devDependency (`e2e/package.json:14`), installed `node_modules/`, `package-lock.json`, generated `playwright-report/` + `test-results/` (has been run locally).
- Real, well-structured `e2e/playwright.config.ts` (45 lines): `testDir: './tests'`, `baseURL` from `PLAYWRIGHT_BASE_URL` (default `http://localhost:3000`), `retries: 1` on CI, `forbidOnly` on CI, JUnit reporter on CI, trace/screenshot/video `retain-on-failure`. This is a competent config.
- **5 spec files, 11 effective tests** (`grep test( = 11`):
  - `api-health.spec.ts` (3) — talks **directly to the Django backend via Playwright APIRequest**: asserts `/api/v1/health/` returns 200 (line 15); **POSTs a real two-sample t-test** to `/api/v1/stats/ttest/` and asserts 200 + `high_precision_result.t_statistic` present (lines 18-36); **POSTs a one-way ANOVA with `post_hoc: 'tukey'`** to `/api/v1/stats/anova/` and asserts the three pairwise Tukey comparison keys are returned (lines 38-69) — an explicit **regression pin for commit c249838** (post_hoc previously 500'd). These are genuine, high-value backend contract tests, not smoke.
  - `homepage.spec.ts` (3) — title matches `/StickForStats/i`; `#root` mounts with children (no white-screen); **no uncaught console/page errors** (filters React Router future-flag noise).
  - `navigation.spec.ts` (1 `for`-loop over 5 routes → 5 dynamic tests) — visits `/`, `/dashboard`, `/modules/hypothesis-testing`, `/modules/t-test`, `/test-selection`; asserts status < 400, `#root` has children, and **zero uncaught JS exceptions** on each mount.
  - `statistical-test-flow.spec.ts` (1) — loads `/modules/hypothesis-testing`, asserts a `[role="tablist"]` is visible and ≥1 `button` present.
  - `theme.spec.ts` (2) — **enforces the post-2026-04-17 design contract**: root background must NOT be a gradient (lines 23-26); ≥1 `.MuiPaper-root/.MuiCard-root` must be opaque (alpha ≥ 0.95) and NONE may be in the glassmorphism band (0.05 < alpha < 0.95) (lines 38-57). This is a real visual-regression guard.
- **Design choice (sound):** specs use role/title/computed-style selectors rather than brittle `data-testid`, and are explicitly written to be "resilient to UI copy changes." This is good Playwright practice.

### CI gating (`.github/workflows/ci.yml`, 327 lines; `security.yml`, 50 lines) — CONFIRMED
- **Jobs:** `backend-lint`, `frontend-lint`, `sdk-lint`, `backend-test`, `frontend-test`, `sdk-test`, `e2e`, `docker-build`, `docker-push`, `staging-deploy`. **No `all-checks` aggregator job exists** (required checks are enforced via GitHub branch protection, not an in-repo aggregator).
- **`|| true` appears 3 times in ci.yml, but NONE neuters a test or lint command:** ci.yml:37 (`black --check ... || true`, an intentionally advisory formatter check) and ci.yml:240-241 (`kill $(cat /tmp/*.pid) ... || true`, process-cleanup teardown). The frontend test step is **`npx react-scripts test --watchAll=false --passWithNoTests --ci`** (ci.yml:132) with **no `|| true`** — a real, gating run. This **directly refutes** the first-draft hypothesis that frontend tests are swallowed.
- **`backend-test`** (ci.yml:108) `python manage.py test --verbosity 2` — gates, no `|| true`.
- **`frontend-lint`** ESLint (ci.yml:58) `npx eslint src/ --max-warnings 0` — gates (zero-warning policy), no `|| true`.
- **`backend-lint`** Flake8 (ci.yml:34) `flake8 . --count --statistics` — gates; Black is `--check ... || true` (ci.yml:37, non-gating, intentional).
- **`sdk-lint`** ruff (ci.yml:76) — gates.
- **`sdk-test`** (ci.yml:137) `continue-on-error: true` — non-blocking. **Confirmed.**
- **`e2e`** (ci.yml:154) `continue-on-error: true`, `needs: [backend-test, frontend-test]`. The Playwright run itself (ci.yml:225) is `npx playwright test` with **no `|| true`** — failures are reported and an artifact uploaded (ci.yml:227-235), but `continue-on-error` keeps them from blocking. **MEMORY's "P6.3 not flipped" is CONFIRMED.**
- **The E2E CI job is genuinely wired end-to-end:** installs backend deps, builds the frontend, boots Django (`runserver`, health-polled), serves the static build via `npx serve` (health-polled), runs Playwright, uploads report on failure, tears down servers (ci.yml:177-241). This is a real integration harness, not a stub.
- `security.yml`: Trivy FS scan (CRITICAL/HIGH → SARIF) + CodeQL (javascript, python), scheduled weekly + on push/PR. Real actions, no `|| true`. (Note: `security.yml:48` has a stray line-number jump in the file display but the steps are intact.)

**Net:** The genuinely gating CI steps are: `backend-lint` (flake8), `frontend-lint` (eslint, max-warnings 0), `sdk-lint` (ruff), `backend-test`, `frontend-test`, plus `docker-build` on main. `sdk-test` and `e2e` are intentionally non-blocking. The frontend Jest suite **does** gate CI.

---

## (b) Findings

### F1 — E2E Playwright job is non-blocking (`continue-on-error: true`) — MEDIUM
- **Evidence:** `.github/workflows/ci.yml:154` — `continue-on-error: true` on the `e2e` job; the Playwright step itself (ci.yml:225 `npx playwright test`) has no `|| true`, so failures are real but absorbed by the job-level flag.
- **Doc claim:** MEMORY: "P6.3 Playwright E2E `continue-on-error: true` NOT yet flipped — needs flake investigation first."
- **Reality:** Confirmed accurate. E2E failures cannot fail the pipeline. Given the harness is fully wired and the specs are resilient, this is now a low-risk flip.
- **Recommendation:** Run the E2E job for a few iterations to confirm stability, then remove `continue-on-error: true` (ci.yml:154) so regressions (e.g. a broken `/api/v1/health/` or white-screen route) actually block merges.

### F2 — `sdk-test` is non-blocking and effectively a no-op without a live backend — LOW
- **Evidence:** `.github/workflows/ci.yml:137` `continue-on-error: true`; ci.yml:149 `pytest sdk/python/ --tb=short -q || echo "SDK tests require a live backend — skipped"`.
- **Doc claim:** MEMORY: "SDK ... `continue-on-error: true` so they cannot fail the pipeline (Phase 6 cleanup item)."
- **Reality:** Confirmed. The `|| echo` swallows pytest failures inside an already non-blocking job, so SDK tests provide essentially no CI signal. (Note: this is the *only* `|| <fallback>` pattern remaining; `|| true` does not appear anywhere in ci.yml.)
- **Recommendation:** Either provide a mocked/recorded backend so SDK unit tests can run hermetically and gate, or remove the SDK test job to stop implying coverage.

### F3 — UI E2E specs are shell-level and assert status only loosely — LOW
- **Evidence:** `e2e/tests/navigation.spec.ts:24-26` — `expect(resp?.status() ?? 200).toBeLessThan(400)` defaults to 200 when `resp` is null, and the per-route check is only "`#root` has children + no uncaught JS error." `homepage`/`statistical-test-flow` are similarly shell/affordance-level (tablist visible, button count > 0).
- **Reality:** Reasonable for a client-rendered SPA, but a route that renders a degraded page (wrong content, partial data) while still mounting `#root` would pass. Note the API-health spec (F-positive) does NOT have this weakness — it asserts real computed results.
- **Recommendation:** Add one route-specific content assertion per page (e.g. an expected heading) so the UI specs fail on degraded-but-rendering pages, matching the rigor of the API specs.

### F4 — (RESOLVED on inspection) `theme.spec.ts` is a real visual-regression guard, not a no-op — INFO
- **Evidence:** `e2e/tests/theme.spec.ts:23-26` hard-asserts the root background is not a gradient; lines 38-57 hard-assert ≥1 opaque Paper/Card AND zero glassmorphic (0.05–0.95 alpha) surfaces.
- **Reality:** My first-draft concern (that the theme test passes when the toggle is absent) was WRONG — this spec does not look for a toggle at all; it enforces the post-redesign aesthetic in computed DOM styles with failing assertions. This is a genuinely valuable test. Recorded as verified-correct.
- **Recommendation:** None. Keep it.

### F5 — Stale MEMORY claim: "~654 frontend test cases" — INFO (claim is essentially correct)
- **Evidence:** 30 files, **653** `it`/`test` (654 counting the `.each`/loop-style line). Confirmed via summed per-file `grep -cE`.
- **Reality:** Accurate, not inflated. Recorded as verified-correct.
- **Recommendation:** None.

### F6 — Stale MEMORY framing understates CI quality — INFO
- **Evidence:** MEMORY says "SDK and E2E currently `continue-on-error: true` so they cannot fail the pipeline (Phase 6 cleanup item)" and implies frontend gating is shaky. Reality (ci.yml): frontend Jest **gates** (no `|| true`, ci.yml:132), ESLint gates at `--max-warnings 0` (ci.yml:58), flake8 gates (ci.yml:34). Only `sdk-test` and `e2e` are non-blocking, exactly as MEMORY says.
- **Reality:** The MEMORY non-blocking claim is correct for SDK/E2E, but earlier audit notes (and my own first draft) wrongly extended "non-gating" to the frontend unit suite. The frontend suite is a real gate.
- **Recommendation:** Update MEMORY/audit notes to record that frontend lint + test gate CI; only `sdk-test` and `e2e` remain non-blocking.

---

## (c) Claims-vs-Reality table

| # | Claim (source) | Status | Reality / Evidence |
|---|----------------|--------|--------------------|
| 1 | "~654 frontend test cases" (MEMORY) | **Confirmed** | 30 files, 653 `it`/`test` (654 w/ loop line). Accurate. |
| 2 | "P6.3 Playwright E2E `continue-on-error: true` NOT yet flipped" (MEMORY) | **Confirmed** | ci.yml:154 `continue-on-error: true` on `e2e`. |
| 3 | "SDK and E2E `continue-on-error: true` → cannot fail pipeline" (MEMORY) | **Confirmed** | sdk-test ci.yml:137, e2e ci.yml:154. |
| 4 | Frontend tests are swallowed by `|| true` / cannot gate (earlier audit-era belief) | **Refuted** | `grep "|| true" ci.yml` → no matches; frontend step is `react-scripts test ... --ci` (ci.yml:132), gating. |
| 5 | Frontend suite has skipped suites / placeholder tests | **Refuted** | `grep` for `describe.skip|it.skip|.only|xit|expect(true).toBe(true)` → 0 matches. |
| 6 | E2E Playwright suite is real and runnable | **Confirmed** | `e2e/playwright.config.ts` (baseURL, webServer-style boot in CI), `@playwright/test@1.47.2`, 5 specs / ~11 tests with real API + DOM assertions. |
| 7 | E2E specs are real assertions (not smoke-only) | **Partial → mostly real** | api-health POSTs real t-test + ANOVA-tukey and asserts computed results (api-health.spec.ts:18-69); theme.spec.ts hard-asserts no-gradient + no-glassmorphism (theme.spec.ts:23-57); only navigation/homepage/statistical-test-flow are shell-level (F3). |
| 8 | Flaky `PerformanceTests.test.js:654` (MEMORY) | **Partial** | File exists (`utils/validation/__tests__/PerformanceTests.test.js`, 30 cases). Could not pin the exact assertion line this run; line `:654` is likely stale (file may be shorter). Re-read to confirm. |
| 9 | An `all-checks` aggregator job gates the pipeline (MEMORY-adjacent) | **Refuted** | No `all-checks` job in ci.yml; gating is via GitHub branch protection. |
| 10 | Lint cannot fail CI (`|| true` on lint) (earlier-era belief) | **Refuted** | ESLint `--max-warnings 0` (ci.yml:58) and flake8 (ci.yml:34) gate; only Black is `|| true` (ci.yml:37). |
| 11 | `security.yml` runs real Trivy + CodeQL | **Confirmed** | security.yml:18-31 (Trivy→SARIF), 41-50 (CodeQL js+python), no `|| true`. |

---

## (d) Prioritized recommendations toward "world-class"

1. **(MEDIUM) Flip `e2e` to blocking.** The harness is fully wired (boots backend + serves build) and the specs are resilient. After a short stability soak, remove `continue-on-error: true` (ci.yml:154) so E2E regressions block merges. This closes the standing P6.3 item.
2. **(LOW) Make `sdk-test` meaningful or remove it.** Today it is non-blocking AND swallows pytest exit via `|| echo` (ci.yml:149) — zero signal. Provide a recorded/mock backend so SDK tests run hermetically, then gate; otherwise delete the job.
3. **(LOW) Strengthen the shell-level UI E2E specs.** `navigation`/`homepage`/`statistical-test-flow` assert only "shell rendered + no JS error." Add one route-specific content assertion per page (F3) so they match the rigor of `api-health.spec.ts` (real t-test/ANOVA result assertions) and `theme.spec.ts` (computed-style contract).
4. **(LOW) Verify and de-flake `PerformanceTests.test.js`.** Confirm the exact wall-clock assertion and tolerance; prefer render-count/Profiler assertions over timing, or isolate into a non-gating benchmark.
5. **(INFO) Refresh MEMORY/audit notes.** Record that frontend lint + frontend test + backend lint/test all gate CI (no `|| true`), there is no `all-checks` aggregator, and only `sdk-test` + `e2e` are non-blocking. The current notes understate CI quality and one prior audit-era belief (`|| true` on frontend) is simply false.

---

## Verification commands used (all read-only)
```bash
# Frontend test inventory + zero-skip/zero-placeholder proof
find frontend/src -name "*.test.js" -o -name "*.test.jsx"        # 30 files
grep -rnE "(describe|it|test)\.(skip|only)|xit\(|xdescribe\(|expect\(true\)\.toBe\(true\)" frontend/src --include="*.test.js" --include="*.test.jsx"   # 0 matches (exit 1)
# CI gating proof
grep -n "|| true" .github/workflows/ci.yml                       # 3 matches: line 37 (black --check, advisory), 240-241 (kill teardown) — none neuter a test/lint command
# (ci.yml:132 frontend-test = react-scripts test --ci, NO || true; ci.yml:154 e2e continue-on-error; ci.yml:137 sdk-test continue-on-error)
# E2E specs
cat e2e/playwright.config.ts e2e/tests/*.spec.ts
```
