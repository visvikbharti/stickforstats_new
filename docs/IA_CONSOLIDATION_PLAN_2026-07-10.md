# StickForStats — Information-Architecture Consolidation Plan

**Date:** 2026-07-10
**Status:** Read-only audit complete. Step 1 approved for immediate execution; steps 2–5 deferred to a post-BMC-submission cleanup pass.
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

The canonicals already return 50-decimal precision via `/api/v1/stats/*`, so redirecting the `-real` variants loses no precision.

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

- **Dev & test harnesses (6, remove from prod):** `/test/calculator`, `/test/performance`, `/testing/browser-compatibility`, `/test-universe`, `/test-runner`, `/unified-test`
- **Admin & monitoring (5, gate behind auth/flag):** `/security`, `/monitoring/websocket`, `/monitoring/rag-performance`, `/admin/branding`, `/enterprise`
- **Built but never linked (6, decide link-or-cut):** `/statistics`, `/advanced-statistics`, `/visualization-studio`, `/workflows`, `/reports`, `/reporting-studio`
- **Standalone orphans (6, triage):** `/dashboard`, `/audit`, `/guardian-demo`, `/modules/power-analysis-real`, `/genomics-analysis`, `/shortcuts`

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

## Provenance

Produced by a read-only 4-agent audit (workflow `w5y7a05bg`) that inventoried every entry in `routeConfig.js`, cross-referenced imports across `frontend/src`, and traced inbound links from nav (`SimpleNavigation.jsx`), home, hubs, and `/dashboard`. No files were modified during the audit.
