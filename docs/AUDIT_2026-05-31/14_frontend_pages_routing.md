# Audit 14 — Frontend: Pages, Routing, Dashboards, Mock-Data Wiring

Date: 2026-05-31
Auditor: senior code auditor (read-only)
Scope: `frontend/src/pages/*`, the app entry/router (`App.jsx`, `Providers.jsx`, `routes/*`), dashboards, and the Phase-3 "mock-data wiring" claims (RAG dashboards / PCA pathways / BundleComparison / PowerCalculator G*Power).

> Process note: two earlier drafts of this report were based on wrong assumptions (that the router lived inline in `App.js`, that file extensions matched my guesses). Those drafts and their findings (a "NotFoundPage undefined build-break", "orphaned pillar pages", a duplicate `StatisticalDashboard.js/.jsx`, and "confirmed-real Phase-3 wiring") are **RETRACTED** — see the Retractions section. This version is built entirely on files I read in full and greps I observed complete.

---

## (a) Ground truth — what this subsystem really is (VERIFIED)

The frontend routing is a clean, data-driven, code-split architecture:

- **Entry:** `frontend/src/index.js:6` `import App from './App'` → resolves to **`App.jsx`** (no `App.js`). `App.jsx` (80 lines) shows a "cosmic" landing first (`ProfessionalLandingPage` lazy-loaded from `../components/Landing/ProfessionalLanding`), but **deep links bypass it** (`App.jsx:18-21`: `isDeepLink = pathname !== '/' ...; useState(!isDeepLink)`). Otherwise renders `<Providers>` → chrome → `<AppRoutes />`.
- **Providers** (`Providers.jsx`, read in full): one `BrowserRouter` (line 46) wrapping Auth, Settings (Expert Mode), Onboarding, etc. Correct single-router composition.
- **Router** (`routes/AppRoutes.jsx`, read in full): maps `ROUTE_CONFIG` to `<Route>` via a `SuspenseRoute` wrapper that applies `<ProtectedRoute requiredRole=...>` when `protected: true`. Imports **`NotFoundPage` (line 5)** and uses it for the `*` catch-all (line 31), plus `/unauthorized` and `/terms`. No undefined-reference bug.
- **Route table** (`routes/routeConfig.js`, read in full, 229 lines, ~64 routes, all lazy-loaded). The three "pillar" pages ARE routed: `/smart-analysis`→`SmartAnalysisPage` (:130), `/journal-analytics`→`JournalAnalyticsPage` (:134), `/monitoring/rag-performance`→`RAGPerformanceMonitoringPage` (:214, admin-only). Admin routes use `requiredRole:'admin'` (:212-215). The old `/debug-login` page with hardcoded creds was deliberately aliased to `LoginPage` (:19-24) — a real prior security fix.

Statistical computation is delegated to the backend (e.g. `EnhancedStatisticalAnalysis.jsx:134` `axios.post(getApiUrl(endpoint))`, `PowerCalculator.jsx:77` `axios.post(.../v1/power/calculate/)`, `JournalAnalyticsPage.jsx:167-170` `apiClient.get('/v1/journal/analytics/...')`). No hardcoded secrets in pages.

---

## (b) Findings

### F1 — HIGH (doc_mismatch): MEMORY claims RAG dashboards were "fixed to use real data"; the code DISABLED the feature because it was `Math.random()`-fabricated
- **Doc claim:** MEMORY Phase-3: *"frontend mock-data wiring (RAG dashboards / …) "* fixed so dashboards "now call real APIs, not mock arrays."
- **Reality (verified):** `frontend/src/pages/RAGPerformanceMonitoringPage.js` (the routed page) is a **feature-disabled stub**. Its docstring (lines 5-10): *"'metrics' were generated from `Math.random()` on every render … those dashboards displayed fabricated numbers as if they were live data."* Body (lines 40-50) renders `Alert severity="warning"` titled **"Feature unavailable"**; re-enable is *"Tracked under WORK_PLAN P3.15"* (:65-71). There is **no `ragService.js`** anywhere under `frontend/src` (verified by `find`). The two real dashboard components still exist as **`components/rag/RAGPerformanceDashboard.js`** and **`RAGPerformanceMonitorDashboard.js`** (note: `.js`, and still wired into `components/rag/index.js` + `LazyRAGComponents.js`) but the routed page no longer imports them.
- **Severity rationale:** This is the OPPOSITE of "wired to real data." The honest in-page notice is good (no fabrication reaches users via this route), but the MEMORY/Phase-3 record materially misrepresents the work. For a project under anti-fabrication discipline, the stale claim must be corrected.
- **Recommendation:** Correct MEMORY/Phase-3 docs: RAG monitoring was **disabled**, not wired to real data. Keep the in-page notice. Confirm the orphaned `RAGPerformance*Dashboard.js` (and their `index.js`/`LazyRAGComponents.js` exports) cannot be lazy-imported into any live route, since they still embed `Math.random()` metrics.

### F2 — HIGH (statistical_correctness / scientific_integrity): routed `/enhanced-analysis` ships a statistically FAKE confidence-interval "coverage simulation"
- **Reality (verified, full context read):** `frontend/src/pages/EnhancedStatisticalAnalysis.jsx` is routed at `/enhanced-analysis` (routeConfig.js:140). Its `runSimulation()` (lines 152-177) generates client-side data and reports per-iteration CI coverage as:
  ```js
  // line 170
  containsTrue: Math.random() < (confidenceLevel / 100) // Simplified
  ```
  The interval's "does it contain the true value" flag is a **coin flip rigged to the nominal rate**, completely ignoring the data and the interval actually computed at lines 160-168. So the page's CI-coverage demonstration will ALWAYS appear to achieve ~nominal coverage by construction — a textbook misrepresentation of how confidence intervals behave (the whole pedagogical point of a coverage simulation is that empirical coverage may deviate from nominal). The `// Simplified` comment acknowledges the shortcut.
- **Note:** the same page's *real* analysis path is legitimate — line 134 `axios.post(getApiUrl(endpoint))` to the backend; line 136 checks `high_precision_result`. So only the coverage-simulation tab is affected.
- **Severity rationale:** A statistically-wrong artifact presented in a routed, user-facing statistics page on a platform whose entire value proposition is statistical correctness. It teaches the wrong thing. Not "critical" only because it is a demo simulation rather than a reported analysis result, but it is squarely an integrity problem.
- **Recommendation:** Compute `containsTrue` correctly: draw from a known true mean μ, build the interval from the sample, and set `containsTrue = (lower <= μ && μ <= upper)`. Then empirical coverage will (correctly) fluctuate around nominal. Until fixed, this tab should be removed or clearly flagged as non-representative.

### F3 — MEDIUM (doc_mismatch): the Phase-3 "BundleComparison" item does not match the only BundleComparison in the frontend
- **Doc claim:** MEMORY Phase-3 lists "BundleComparison" among mock-data items wired to real data (memory elsewhere associates it with `GET /api/v1/payments/bundles/`).
- **Reality (verified):** The only `BundleComparison` in the frontend is `frontend/src/components/Reproducibility/BundleComparison.jsx`, whose docstring (lines 4-9) says it *"Compares two reproducibility bundles and highlights differences in … Statistical results (numerical differences with tolerance checking)."* It is a **reproducibility-bundle diff tool**, unrelated to pricing/payments. No payments/pricing `BundleComparison` exists. (A `find` for `*Bundle*` returns only Reproducibility/ReproducibilityBundle files.)
- **Recommendation:** Correct the Phase-3 record to name the actual pricing component (if any) for the `/payments/bundles/` wiring, or drop the claim. The reproducibility `BundleComparison` is a different, legitimate component.

### F4 — HIGH (doc_mismatch): the Phase-3 "PowerCalculator G*Power wired to real data" claim is REFUTED — G*Power validation is a disabled, previously-FAKED stub
- **Doc claim:** MEMORY Phase-3 lists "PowerCalculator G*Power" among mock-data items "fixed to use real data."
- **Reality (verified, read in full):** `frontend/src/components/PowerAnalysis/PowerCalculator.jsx` imports **only `jStat`** (line 2) — there is **no `axios`/`apiClient`/`fetch` and no backend call**; all power math is computed client-side via `jStat` (lines 126-157). (Correction to an earlier draft of this report: I wrongly stated it posts to `/v1/power/calculate/`; it does not.) The G*Power "validation" feature is **explicitly not implemented**: `validationMode` defaults to `false` *"off until G*Power integration lands (WORK_PLAN P3.18)"* (line 9); lines 427-445 carry a comment that **earlier code FAKED the cross-check** — *"Earlier code in this function set gpowerValue = calculated and … [reported] as 'Within 1% (G*Power)'"* — and now sets `message: 'G*Power cross-validation is not implemented. The shown power value comes from the in-app calculation only.'` (line 445); the UI checkbox is labeled *"Validate with G*Power (not yet implemented)"* (lines 624-630).
- **Severity rationale:** Same class as F1: a Phase-3 item claimed "wired to real data" is in fact a disabled stub that **previously fabricated** a "Within 1% (G*Power)" validation result. The current honest disclosure is good, but the MEMORY/Phase-3 claim is materially false. (Note: the component also appears **unrouted** — grep of `routes/` found no reference; routed power surfaces are `PowerAnalysisReal` (routeConfig.js:160) and `PowerAnalysisEducationHub` (:203) — so even its client-side calc may not be in the live app.)
- **Recommendation:** Correct the Phase-3 record: PowerCalculator's G*Power validation is **not implemented** (P3.18 open), not "wired to real data"; its power values are in-app `jStat` only. Confirm whether the component is reachable; route or delete. Add a CI orphan check (transitive against `routeConfig.js`).

### F5 — LOW (quality): `StatisticalDashboard` presents hardcoded per-module `progress`/`status` as if user-specific
- **Reality (verified):** `frontend/src/pages/StatisticalDashboard.jsx` (routed `/dashboard`) hardcodes each module's `progress` and `status`, e.g. lines 68-69 `progress: 100, status: 'completed'`, line 104-105 `progress: 75, status: 'in-progress'`, line 116-117 `progress: 0, status: 'pending'`. There is a `useEffect` (line 308) but no `Math.random`/mock/API for these values — they are static literals in `moduleCategories`. So every user sees the same "75% in-progress ANOVA," which reads like personal progress but is fixed content.
- **Severity rationale:** cosmetic/misleading-but-harmless; not fabricated metrics in the statistical sense.
- **Recommendation:** Either drive progress from real per-user state or relabel as "module maturity/curriculum status" so it is not mistaken for the user's progress.

### F6 — INFO (good, verified):
- `JournalAnalyticsPage.jsx` is genuinely wired to real APIs: `apiClient.get('/v1/journal/analytics/{overview,issues,trends,comparison}/')` (lines 167-170) via `fetchAnalytics` in a `useCallback`/`useEffect` (lines 159-199). No mock/`Math.random`.
- `App.jsx:18-21` correctly bypasses the cosmic landing for deep links.
- `CertificationPage.jsx:1056` `Math.random()` is certificate-ID hex generation — legitimate.
- `PlatformDashboardPage.jsx`: only hit for "placeholder"/mock tokens was an input `placeholder="e.g., Production Backend"` (line 990) — UI hint, not fabricated data.

---

## Retractions (earlier incorrect drafts of this report)
- **RETRACTED:** "App.js:69 `<NotFoundPage/>` undefined → build break." FALSE — router is `App.jsx`→`routes/AppRoutes.jsx`, which imports `NotFoundPage` (AppRoutes.jsx:5) and uses it (:31).
- **RETRACTED:** "duplicate `StatisticalDashboard.js` + `.jsx`." FALSE — only `StatisticalDashboard.jsx` exists.
- **RETRACTED:** "SmartAnalysisPage / JournalAnalyticsPage orphaned." FALSE — routed at routeConfig.js:130/:134.
- **RETRACTED:** "Phase-3 RAG wiring confirmed real (F-OK1)." FALSE — RAG is a disabled stub (F1).

---

## (c) Claims-vs-reality table

| # | Claim (source) | Status | Evidence |
|---|----------------|--------|----------|
| 1 | Router is `App.js` w/ inline `<Routes>` | REFUTED | entry → `App.jsx` → `routes/AppRoutes.jsx` + data-driven `routeConfig.js` |
| 2 | NotFoundPage missing → build break | REFUTED | `AppRoutes.jsx:5` import, `:31` use |
| 3 | SmartAnalysisPage routed (Pillar 1) | CONFIRMED | routeConfig.js:130 |
| 4 | JournalAnalytics dashboard routed + real API (Pillar 2) | CONFIRMED | routeConfig.js:134; `JournalAnalyticsPage.jsx:167-170` |
| 5 | Phase-3: RAG dashboards now use real APIs, not mock | REFUTED | feature-disabled stub; no `ragService.js`; `RAGPerformanceMonitoringPage.js:5-50` |
| 6 | Phase-3: PowerCalculator G*Power wired to real API | REFUTED | `PowerAnalysis/PowerCalculator.jsx` imports only `jStat` (no backend); G*Power validation not implemented and previously FAKED "Within 1% (G*Power)" (lines 9, 427-445, 624-630); also appears unrouted (F4) |
| 7 | Phase-3: BundleComparison wired to `/payments/bundles/` | REFUTED | only `Reproducibility/BundleComparison.jsx` exists — a reproducibility diff tool, not payments |
| 8 | Phase-3: PCA pathways wired to real data | NOT FOUND | no `*pathway*`/`GenePathway` component; PCA dir has viz/education only |
| 9 | A routed page presents fabricated/incorrect statistics | CONFIRMED | `EnhancedStatisticalAnalysis.jsx:170` fake CI coverage (F2) |
| 10 | Admin routes are role-gated | CONFIRMED | `AppRoutes.jsx:17-18`; routeConfig.js:212-215 |
| 11 | Deep links bypass landing | CONFIRMED | `App.jsx:18-21` |

---

## (d) Prioritized recommendations toward world-class

1. **Fix F2 now.** Compute CI `containsTrue` from the actual interval vs a known true parameter so the coverage demo is statistically honest. This is shipped, routed, and wrong on a statistics platform.
2. **Correct the Phase-3 record (F1, F3, F8).** RAG monitoring was disabled (not wired); the only `BundleComparison` is reproducibility (not payments); no PCA-pathway frontend component exists. The current MEMORY/Phase-3 narrative overclaims.
3. **Resolve dead/orphaned code (F4).** Confirm reachability of `PowerCalculator.jsx` and the competing statistics pages; route or delete. Ensure the orphaned `components/rag/RAGPerformance*Dashboard.js` (which still use `Math.random`) cannot be lazy-imported into any live route.
4. **Add a CI orphan check** that flags page/component modules not transitively referenced by `routeConfig.js`, and that greps routed components for `Math.random`/hardcoded arrays presented as live data.
5. **Relabel static progress (F5)** so curriculum status is not mistaken for per-user progress.
6. **Keep the good patterns:** the data-driven `routeConfig.js`, role-gated `ProtectedRoute`, deep-link bypass, the honest "feature unavailable" RAG notice, and the real backend wiring in JournalAnalytics/PowerCalculator/EnhancedStatisticalAnalysis (analysis tab) are the right models.
