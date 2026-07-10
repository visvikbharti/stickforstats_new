# StickForStats — Information-Architecture Consolidation Plan

**Date:** 2026-07-10
**Status:** **All five steps executed 2026-07-10.** Read the **OUTCOME** section at the bottom before trusting
anything above it: executing the plan disproved two of its own recommendations and uncovered a
data-fabrication bug the audit never looked for.
**Visual map:** `scratchpad/ia-audit.html` (published as an Artifact) — same content, scannable.

---

## TL;DR

The app *works*. The problem is **accretion**: each analysis was rewritten 2–3× (`…Complete` / `…Real` / `…Professional` / `…RealBackend`) and the originals were never deleted; the nav and hubs were never reconciled. So the app is wearing every draft at once.

- **71 routes** total → **40 canonical · 23 orphan · 4 duplicate · 6 dead files**
- **9 test modules collapse to 4** canonical surfaces
- Net if fully applied: **71 → ~42 routes**, one clear path to every analysis

---

## The one finding that explains everything

Your real **T-Test**, **ANOVA**, and **Correlation & Regression** modules — and the Guardian assumption→non-parametric fallback shipped 2026-07-09 — are stranded behind `/dashboard` (`StatisticalDashboard`), which **nothing links to**.

```
nav / home / hub   ──✗ no link──►  /dashboard  ──►  /modules/t-test
                                                     /modules/anova
                                                     /modules/correlation-regression
```

`/dashboard`'s only inbound is a back-button on the PCA page; it is not in the nav. So the only way to reach those modules is by typing the URL. That is exactly why the Guardian fallback felt unfindable.

Compounding issues on `/dashboard`:
- ~9 cards point at routes that **don't exist** (dead clicks): `/modules/descriptive`, `/chi-square`, `/time-series`, `/mann-whitney`, `/wilcoxon`, `/kruskal-wallis`, `/multivariate`, `/bayesian`, `/ml-stats`.
- Two hubs disagree: `/statistical-analysis-tools` (canonical, in nav) vs `/analysis` (redundant alias to the same `StatisticalAnalysisHub`). The hub opens modules **in-page via state**, so it never touches the `/modules/*` routes at all — a parallel path.

---

## 1. Duplicated test modules — 9 files, 4 real surfaces

All four canonicals are real-backend and 50-decimal; the Guardian fallback lives in the canonicals, so consolidating **toward** them preserves it.

| Family          | Keep (canonical)                                          | Redirect                                       | Delete (dead)                                   |
|-----------------|-----------------------------------------------------------|------------------------------------------------|-------------------------------------------------|
| T-Test          | `TTestCompleteModule` → `/modules/t-test`                 | `TTestRealBackend` → `/modules/t-test-real`    | `TTestProfessionalModule` (mock, never imported)|
| ANOVA           | `ANOVACompleteModule` → `/modules/anova`                  | `ANOVARealBackend` → `/modules/anova-real`     | —                                               |
| Non-Parametric  | `NonParametricTestsRealProfessional` → `/modules/nonparametric-real` | —                                   | `NonParametricTestsReal` (never imported)       |
| Hypothesis      | `HypothesisTestingModuleReal` → `/modules/hypothesis-testing` | —                                          | `HypothesisTestingModule.jsx` (mock)            |

---

## 2. Duplicate routes → redirect

| Route                   | Same as                                              | Action   |
|-------------------------|------------------------------------------------------|----------|
| `/analysis`             | `/statistical-analysis-tools` (same `StatisticalAnalysisHub`) | redirect |
| `/modules/t-test-real`  | `/modules/t-test`                                    | redirect |
| `/modules/anova-real`   | `/modules/anova`                                     | redirect |
| `/debug-login`          | `/login` (intentional legacy alias)                  | keep     |

> ⚠️ **This was wrong.** The claim below — "the canonicals already return 50-decimal precision via
> `/api/v1/stats/*`, so redirecting the `-real` variants loses no precision" — did not survive contact with
> the code. `/modules/anova` was posting to a route that does not exist and rendering hard-coded numbers;
> `ANOVARealBackend` was the only working ANOVA. `TTestRealBackend` has UI the canonical lacks and backs
> manuscript Figure 7. **Only `/analysis` was redirected.** See the OUTCOME section.

---

## 3. Dead files → safe to delete

Zero imports and zero routes anywhere in `frontend/src` (confirmed by name + import-path grep). Delete by **exact path** — names differ from live twins only by suffix.

- `frontend/src/modules/CorrelationRegressionModule.jsx` (superseded by `…ModuleReal` → `/modules/correlation-regression`)
- `frontend/src/modules/HypothesisTestingModule.jsx` (superseded by `…ModuleReal`)
- `frontend/src/modules/NonParametricTestsReal.jsx` (superseded by `…RealProfessional`)
- `frontend/src/modules/TTestProfessionalModule.jsx` (superseded by `TTestCompleteModule`)
- `frontend/src/pages/ProfessionalStatisticalAnalysis.jsx` (superseded by `EnhancedStatisticalAnalysis`)
- `frontend/src/pages/StatisticalTestsPage.jsx` (top-level; shadowed by `pages/statistics/StatisticalTestsPage.jsx`)

---

## 4. Orphan / unreachable routes — 23

Routed but nothing in nav/home/hub/dashboard links to them — reachable only by URL.

- **Dev & test harnesses (6, remove from prod):** `/test/calculator`, `/test/performance`, `/testing/browser-compatibility`, `/test-universe`, `/test-runner`, `/unified-test` — ✅ done, dev-gated
- **Admin & monitoring (5, gate behind auth/flag):** `/security`, `/monitoring/websocket`, `/monitoring/rag-performance`, `/admin/branding`, `/enterprise` — ⚠️ **already gated**; four carry `requiredRole: 'admin'`, `/enterprise` is `protected`. No change made.
- **Built but never linked (6, decide link-or-cut):** `/statistics`, `/advanced-statistics`, `/visualization-studio`, `/workflows`, `/reports`, `/reporting-studio` — left routed, pending a product call
- **Standalone orphans (6, triage):** `/dashboard` (retired), `/audit`, `/guardian-demo`, `/modules/power-analysis-real` (⚠️ **a working feature — now in the nav**), `/genomics-analysis` (⚠️ **ditto; backs Case Study 4**), `/shortcuts`

> The audit missed a **fifth duplicate route** (`/privacy`, declared in both `routeConfig` and `AppRoutes`)
> and the fact that `components/Navigation.jsx` is **never imported** yet lists eleven of these routes, which
> is what makes them look reachable to an import-graph crawl. Both handled; see OUTCOME.

---

## Consolidation plan (ordered by risk, low first)

### Step 1 — Un-strand the modules **[DO NOW · tiny · 1 file]**
Add **T-Test**, **ANOVA**, and **Correlation & Regression** to the Analysis nav category, pointing at the canonical `/modules/*` routes. Instantly makes the Guardian fallback (and those modules) discoverable. Same one-line-per-entry change as when "Non-Parametric Tests" was added.

### Step 2 — Collapse duplicate routes **[after paper · low risk]**
Redirect `/modules/t-test-real → /modules/t-test`, `/modules/anova-real → /modules/anova`, `/analysis → /statistical-analysis-tools`.

### Step 3 — Delete the 6 dead files **[after paper · low risk]**
Remove by exact path (§3). No imports, no routes.

### Step 4 — Pick one home + one hub **[after paper]**
Keep `ShowcaseHomePage` (home) + `StatisticalAnalysisHub` (`/statistical-analysis-tools`) as the single hub. Retire `/dashboard` or fix its dead card links; make the hub link the real `/modules/*` routes instead of opening modules in-page.

### Step 5 — Gate the 23 orphan routes **[after paper]**
Move dev/test/admin/monitoring routes behind a dev-only flag (or drop from the prod build). Keep the "built but never linked" pages only if on the roadmap; otherwise cut.

---

## ▶ OUTCOME — steps 2–5 executed 2026-07-10

All five steps are implemented. Executing them surfaced three defects this audit had not looked for, one of
them serious, and disproved two of the audit's own recommendations. Both are recorded below, because the
corrections matter more than the plan did.

### What the audit got wrong

**The `-real` modules are not duplicates.** §2 said "the canonicals already return 50-decimal precision via
`/api/v1/stats/*`, so redirecting the `-real` variants loses no precision." False in both cases:

- `ANOVACompleteModule` (`/modules/anova`) was posting to `/statistical-tests/anova/`, **a route that does not
  exist**. `ANOVARealBackend` was the only working ANOVA in the app.
- `TTestRealBackend` renders the Guardian report/badge, the confidence interval and Cohen's d, none of which
  `TTestCompleteModule` shows — and `e2e/capture_guardian.js` drives it to regenerate manuscript Figure 7.

Only `/analysis → /statistical-analysis-tools` was redirected. Both `-real` routes stay, and `routeConfig`
now documents why so a future pass does not collapse them.

**The admin routes were already gated.** §5 recommended gating `/security`, `/monitoring/*`, `/admin/branding`
behind auth. Four already carry `protected: true, requiredRole: 'admin'`; `/enterprise` is `protected`. No
change was needed.

**Two "orphans" were working features, not junk.** `/modules/power-analysis-real` and `/genomics-analysis`
(which backs Case Study 4) were unreachable only because nothing linked them. They are now in the nav.

**The audit missed a fifth duplicate route and a dead nav file.**

- `/privacy` was declared twice — `routeConfig → PrivacyDashboardPage` and `AppRoutes → PrivacyPolicyPage`.
  React Router's tie-break gave it to `routeConfig`, so the footer's "Privacy Policy" link, the beta banner,
  and the register page's *"I accept the … Privacy Policy"* consent checkbox all opened the GDPR data
  dashboard. The dashboard moved to `/privacy-settings`; the policy now renders at `/privacy`.
- `components/Navigation.jsx` was never imported (`App.jsx` mounts `SimpleNavigation`) yet listed eleven
  routes. Any import-graph audit that reads it reports those routes as reachable when they are not. Deleted.

### The defects found while executing

1. **`/modules/anova` fabricated results.** Its POST 404'd, and the `catch` wrote hard-coded numbers
   (`F=4.573, p=0.012, η²=0.348`) into the results state. The results table renders above the error alert and
   is not gated on it, so users saw a complete, plausible, fake ANOVA table on every run — including
   post-hoc comparisons. Step 1's nav change had just made this module discoverable.
2. **`getApiUrl()` doubled the `/api` prefix.** `API_BASE_URL` already ends in `/api` (CI builds prod with
   `REACT_APP_API_URL=/api`), so call sites passing an absolute `/api/v1/stats/ttest/` requested
   `/api/api/v1/stats/ttest/` → 404. This silently broke the t-test module, Enhanced Statistical Analysis,
   and the Test Universe harness.
3. **The t-test Guardian fallback never fired.** In `TTestCompleteModule` the Guardian check sat *inside* the
   `try`, after that failing POST — so the assumption→non-parametric fallback shipped in `e3cacde` was dead in
   production. It now runs on the submitted samples regardless of whether the parametric test succeeds.

Fixed in `166d187`, verified against a local Django server: `POST /api/v1/stats/anova/` returns 200 and its
F and p match `scipy.stats.f_oneway` to 1e-9 and 1e-12, with 50-decimal precision preserved end to end.

### Commits

| Commit | Step | Change |
|--------|------|--------|
| `166d187` | 0 | Stop ANOVA fabricating results; repair the doubled `/api` prefix; fire the t-test Guardian check unconditionally |
| `223817c` | 0 | Satisfy CI's `--max-warnings 0` eslint gate |
| `a53919c` | 2 | Retire `/analysis`; serve the privacy policy at `/privacy` |
| `2d089b1` | 3 | Delete six superseded modules |
| `148fa6c` | 4 | Retire `/dashboard`, repoint its three callers |
| `909072b` | 5 | Drop dev harnesses from the prod bundle; surface Power Analysis and Genomics |

### Notes for the next pass

- **The dev-only gate must be written inline.** `if (process.env.NODE_ENV !== 'production') { ... }` lets
  webpack's DefinePlugin fold the branch and drop the `import()` chunks. Hoisting the test into a
  `const IS_DEV_BUILD` does *not* work — webpack will not propagate the constant into the branch and still
  emits a chunk per harness. The first attempt did exactly that and shipped them. Verify with:
  `grep -rlF 'Master Test Runner' build/static/js/` — must return nothing. Chunks: 209 → 196.

- **Still open, deliberately not done:**
  - The hub (`/statistical-analysis-tools`) opens its ten modules in-page via React state and renders an older
    `ParametricTests` twin. Its Guardian "select alternative" fires a blocking `window.alert()` with manual
    instructions (`ParametricTests.jsx:362`) instead of running the test, whereas the canonical
    `TTestCompleteModule` auto-navigates to `/modules/nonparametric-real` with the data prefilled. **Users get
    a different Guardian experience depending on which entry point they used.**
  - `components/AdvancedVisualization/VisualizationDashboard.jsx` imports `./StatisticalDashboard`, which does
    not exist. Nothing imports `VisualizationDashboard`, so it never compiles — dead code with a broken import.
  - The omnibus p-value renders as `0.0000` for highly significant results, because the shared
    `ResultDisplay.formatValue` uses `toFixed(4)`. The ANOVA post-hoc table now shows `< 0.0001` instead;
    the shared component was left alone.
  - Correlation Pearson→Spearman fallback, one-sample t-test fallback, and the backend `is_met` / `is_normal`
    dead code remain out of scope.

## Provenance

Produced by a read-only 4-agent audit (workflow `w5y7a05bg`) that inventoried every entry in `routeConfig.js`, cross-referenced imports across `frontend/src`, and traced inbound links from nav (`SimpleNavigation.jsx`), home, hubs, and `/dashboard`. No files were modified during the audit.
