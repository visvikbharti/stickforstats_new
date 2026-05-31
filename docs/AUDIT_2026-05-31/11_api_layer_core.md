# Audit 11 — API Layer (core/platform views + routing)

Date: 2026-05-31
Auditor: skeptical senior auditor (statistics / appsec / SWE)
Subsystem: `backend/api/v1/` routing + core/platform views; relationship to `backend/core/urls.py`, `core/api_urls.py`, `core/api_views.py`, and the project root URLconf `backend/stickforstats/urls.py`.
Method: Read the actual code; quote it; verify numeric/behavioral claims read-only. No project files modified.

---

## (a) Ground Truth — what this subsystem really is and does

The v1 API surface is defined by a single flat `urlpatterns` list in `backend/api/v1/urls.py` (487 lines). It is mounted at `api/v1/` by the root URLconf. The ACTUAL root URLconf (`backend/stickforstats/urls.py`, read in full, 36 lines) is:

```
backend/stickforstats/urls.py:18   path("admin/", admin.site.urls),
backend/stickforstats/urls.py:19   path("", index, name="index"),
backend/stickforstats/urls.py:21   path("api/", include("core.api_urls")),
backend/stickforstats/urls.py:23   path("api/auth/", include("authentication.urls")),
backend/stickforstats/urls.py:25   path("api/v1/", include("api.v1.urls")),
backend/stickforstats/urls.py:27   path("api/v1/confidence-intervals/", include("confidence_intervals.api.urls")),
backend/stickforstats/urls.py:28   path("api/v1/probability-distributions/", include("probability_distributions.api.urls")),
backend/stickforstats/urls.py:29   path("api/v1/sqc-analysis/", include("sqc_analysis.api.urls")),
backend/stickforstats/urls.py:30   path("api/v1/doe-analysis/", include("doe_analysis.api.urls")),
backend/stickforstats/urls.py:31   path("api/v1/pca-analysis/", include("pca_analysis.urls")),
```

So the platform exposes MULTIPLE URL trees, not one. `api/v1/` is the documented/headline tree. `api/` (`core.api_urls`, ~58 routes incl. Guardian, Bayesian, pre-registration, p-curve, causal, DiD, mixed-models) is a **separate, parallel** statistical API backed by completely different view classes (`core.api_views.*`); it redefines several of the same statistical capabilities (`test-recommender`, `power`, causal/`did`, `mixed`) that `api/v1/` also exposes. Note: `core/urls.py` exists but is NOT included by the root URLconf (it is dead at the project level; it only mounts `core.guardian.urls`). There is NO `core/health_urls.py`, NO `api/test_urls.py`, and NO `api/test_views.py` — those were checked and confirmed MISSING; the only "test" routes that ship are `api/v1/test/` → `simple_test` (`urls.py:244`) and the dead `api/v1/test_missing_endpoints.py` (not imported anywhere). The `api/auth/` tree is `authentication.urls`, not `core.urls`.

**Route count (verified by parsing urls.py):**
- `path(...)`/`re_path(...)` entries in `api/v1/urls.py`: **198** (matches MEMORY).
- Distinct path strings: **196** (2 are literal duplicates).
- Distinct view callables routed: **188** (verified). Only 4 views are routed more than once: `HighPrecisionRegressionView` (7x), `HighPrecisionANOVAView` (3x), `UniversalDataImportView` (2x), `SupportedFormatsView` (2x). So 198 entries collapse to 188 distinct view callables.

The "198 API endpoints" figure is therefore a count of **route table entries**, not distinct functional endpoints. A handful of blocks are alias routes pointing the same view at many URLs (188 distinct views back 198 routes; e.g. 7 `regression/*` URLs, MANOVA/repeated-measures pointed at the ANOVA view, etc.). The honest "distinct working endpoint" number is somewhat lower than 198, and the true *exposed* surface is actually *larger* than 198 once the parallel `api/` tree (`core.api_urls`), `api/auth/`, and the other `api/v1/<module>/` includes (confidence-intervals, probability-distributions, sqc-analysis, doe-analysis, pca-analysis) are added.

Most views set `permission_classes = [AllowAny]`. The DRF default in settings is also effectively permissive for these endpoints, so the entire statistical and platform API is unauthenticated by design (consistent with a "public calculator" posture but a problem for the multi-tenant/RBAC/billing/manuscript endpoints that share the same default).

Two scope files named like tests live in `api/v1/`: `simple_test.py` (wired at `urls.py:244`) and `test_missing_endpoints.py` (NOT wired — orphan; it is a `requests`-based integration script, not a Django view module). There is no `api/test_views.py` / `api/test_urls.py`.

---

## (b) Findings

### F1 — `stats/regression/` headline endpoint silently downgrades to a toy scipy implementation (HIGH, stub_vs_claim / doc_mismatch)
`urls.py:218-220`:
```python
path("stats/regression/", SimpleRegressionView.as_view(), name="hp-regression-stats"),  # Using simple version temporarily
```
`SimpleRegressionView` (`simple_regression_view.py:16-52`) is documented in its own docstring as `"Simplified regression endpoint for debugging"`. It runs `stats.linregress(X, y)` (single-predictor OLS via scipy floats), ignores any `type`/`regression_type` parameter, returns only `r_squared` and `[intercept, slope]`, and provides **no** 50-decimal precision.

Meanwhile the real `HighPrecisionRegressionView` (`regression_views.py:26-92`) — which correctly branches to ridge/lasso/logistic/polynomial via `HighPrecisionRegression(precision=50)` (`regression_views.py:44,62,73-88`) — is wired only to `regression/`, `regression/linear/`, … (`urls.py:246-252`).

Doc claim contradicted: `views.py:1-4` module header "Provides 50 decimal place precision for all calculations"; README/APIDocs describe `stats/regression/` as a high-precision endpoint. Reality: the URL most clients hit for "regression" is a debug scipy stub.
Recommendation: route `stats/regression/` to `HighPrecisionRegressionView`; delete/quarantine `SimpleRegressionView`; remove the "temporarily" comment.

### F2 — Parallel statistical API at `api/` (`core.api_urls`) overlaps `api/v1/` capabilities with a different engine (HIGH, doc_mismatch / quality)
`stickforstats/urls.py:21` mounts `core.api_urls` at `api/`. That tree (`core/api_urls.py:57-115`) exposes ~58 routes backed by `core.api_views.*` classes (DataUploadView, TestRecommendationView, PowerAnalysisView, Bayesian*, PCurve*, causal/DiD/mixed views). Several of these duplicate capabilities that `api/v1/` also exposes via a *different* code path — e.g. `api/power/calculate/` (`PowerAnalysisView`) vs the `api/v1/power/*` function-views; `api/causal/did/` + `api/mixed/lmm/*` (`core.api_views`) vs `api/v1/core/causal/did/` + `api/v1/core/mixed/lmm/*` (`causal_views`/`mixed_models_views`). So the same statistical operation is reachable through two distinct implementations that can silently diverge (precision, assumptions, Guardian integration). It also makes the "198 endpoints" framing ambiguous because the real exposed surface spans both trees. (Note: `core/urls.py` separately exists but is dead at project level — not included by the root URLconf.)
Recommendation: pick one engine; deprecate or clearly namespace the overlapping `core.api_urls` routes as legacy and document which path is canonical.

### F3 — Debug "server is running" test endpoint and an orphan test module ship in production (MEDIUM, quality)
`api/v1/urls.py:244` wires a debug endpoint into prod:
```python
path("test/", simple_test, name="simple-test"),
```
`simple_test` (`simple_test.py:1-13`, docstring "Simple test file to check if server starts") is `@api_view(["GET"]) @permission_classes([AllowAny])` returning `{"message": "Server is running!"}`. Separately, `api/v1/test_missing_endpoints.py` exists in the package — it is actually a standalone `requests`-based integration script (hits `http://localhost:8000/api/v1` and prints emoji pass/fail), NOT a Django view module, and is **not imported by any URLconf** (verified). So it is dead/stray code shipped in the production view package. (My initial draft incorrectly described an `api/test_urls.py`/`api/test_views.py` `test/` include and a "temporary" comment — those files do NOT exist; confirmed MISSING. The only live debug route is `api/v1/test/`.)
Recommendation: remove the `api/v1/test/` `simple_test` route from production routing (or gate behind `DEBUG`), and delete the stray `test_missing_endpoints.py` script from the views package.

### F4 — Entire statistical + platform API is `AllowAny`, including multi-tenant / billing / manuscript / RBAC endpoints (HIGH, security)
Verified `permission_classes = [AllowAny]` is the dominant setting across `views.py`, `regression_views.py:31`, `simple_regression_view.py:18`, and the function-based view modules. The platform tier (`platform/organizations/...`, `platform/billing/`, `platform/api-keys/`, `platform/projects/`, RBAC, `manuscript/*`) is routed in the same flat list. For the pure-stats calculators AllowAny is defensible (public calculator). For org/billing/RBAC/manuscript/audit endpoints it is not — these expose or mutate tenant state.

Confirmed `permission_classes = [AllowAny]` at `views.py:42` (TTest), `:287` (Comparison), `:316` (DataImport), `:381` (ValidationDashboard), `:417` (ANOVA), `regression_views.py:30`, `simple_regression_view.py:19`, `simple_test.py:11`.

Concrete examples worth confirming downstream (routes only, view bodies in their own audit slices):
- `urls.py:399 platform/billing/webhook/ -> StripeWebhookView` — webhooks must verify Stripe signature, not rely on auth class.
- `urls.py:285-287 audit/summary, audit/record, audit/metrics` — audit data should not be world-readable/writable.
- `urls.py:374 manuscript/journal/submit/ -> JournalSubmitView` — per MEMORY this does inline API-key auth at `manuscript_views.py:574-599`; verify it is constant-time and that the surrounding routes (`manuscript/report/<uuid>`) are not IDOR-exposed.
Recommendation: split the URLconf into public-stats vs authenticated-platform groups; set `IsAuthenticated`/object-level permissions on org/billing/RBAC/audit/manuscript routes; verify webhook signature inside the view.

### F5 — Two literal duplicate route entries (LOW, bug/quality)
Parsing urls.py shows the path strings `data/universal-import/` and `data/supported-formats/` each appear **twice** (`urls.py:227-228` and again `:385-386`). Django uses the first match, so the second pair is dead. Harmless but indicates copy-paste drift in the route table.
Recommendation: delete the duplicate block at `urls.py:385-386`.

### F6 — Alias-routing inflates the advertised endpoint count and conflates distinct capabilities (MEDIUM, doc_mismatch)
188 distinct view callables back 198 routes (only 4 views are reused). Examples (verified by parsing): `HighPrecisionANOVAView` is routed at 3 URLs (`stats/anova/`, `multivariate/manova/`, `anova/repeated-measures/` — `urls.py:212-215`); `HighPrecisionRegressionView` at 7 URLs (`urls.py:246-252`); `UniversalDataImportView`/`SupportedFormatsView` at 3 each. MANOVA and repeated-measures are advertised as separate multivariate capabilities but resolve to the one-way/factorial ANOVA view differentiated only by an `anova_type` parameter (comment at `urls.py:213`). Whether that view actually performs a true MANOVA / RM-ANOVA must be checked in the ANOVA audit slice; the *routing* alone does not deliver those methods.
Recommendation: reconcile the README "195"/MEMORY "198" with a documented count of *distinct functional endpoints*; verify aliased views actually implement the distinct method they are advertised under.

### F7 — README badge "195" vs MEMORY "198" vs reality (LOW, doc_mismatch)
The route table has exactly 198 `path()` entries (196 distinct strings, 188 distinct views). Neither "195" nor "198" describes distinct functional endpoints, and both ignore the parallel `api/` tree (`core.api_urls`, ~58 routes), `api/auth/`, and the 5 `api/v1/<module>/` includes. The number is a moving, ambiguous marketing figure.
Recommendation: replace the badge with an auto-generated count (e.g. from the OpenAPI schema) and define what it counts.

### F8 — `SimpleRegressionView` / `simple_regression_view.py` and `test_missing_endpoints.py` are debug artifacts in the shipped package (LOW, quality)
`simple_regression_view.py:1-2` docstring: "Simplified Regression View for debugging". `test_missing_endpoints.py:2-3`: "Missing endpoints that frontend expects but backend doesn't have / Quick implementation to fix integration issues". These are explicitly debugging/stopgap files. One is live (F1), one is dead.
Recommendation: remove dead `test_missing_endpoints.py`; replace `SimpleRegressionView` usage (F1) then delete the file.

### F9 — `parser_classes = [JSONParser] if False else None` dead/confused code (LOW, quality)
`regression_views.py:32`:
```python
parser_classes = [JSONParser] if False else None  # default parsers
```
The `if False` branch is never evaluated, so the undefined-`JSONParser` reference never raises, but this is confusing dead code that suggests an incomplete edit (JSONParser is not imported in this module).
Recommendation: delete the line (DRF default parsers apply when unset).

### F10 — Dead `core/urls.py` retained with a large block of commented-out routes (LOW, quality)
`core/urls.py:3-10` and `:15-36` are commented-out imports/routes ("Temporarily comment out views that don't exist yet" / "temporarily commented out until views are fixed"). The file's only live entry is `path("guardian/", include("core.guardian.urls"))` (`:14`), and the file is not included by the root URLconf at all, so the whole module is effectively dead at project level. (My initial draft asserted a duplicate health route in a `core/health_urls.py`; that file does NOT exist — confirmed MISSING. The single health endpoint that ships is `api/v1/health/` → `views.health_check`, `urls.py:209`.)
Recommendation: delete `core/urls.py` (or its commented blocks); remove dead modules to reduce confusion.

---

## (c) Claims-vs-reality table

| Claim (source) | Status | Evidence / Reality |
|---|---|---|
| "198 API endpoints" (MEMORY) | partial | 198 = route-table entries in `urls.py` (verified). Only 188 distinct views, 196 distinct path strings; excludes the parallel `api/` (`core.api_urls`, ~58 routes), `api/auth/`, and 5 `api/v1/<module>/` includes. Not a count of distinct functional endpoints. |
| README badge "195 endpoints" | refuted | Real `path()` count in `urls.py` is 198; figure is stale and ambiguous. |
| "50 decimal place precision for all calculations" (`views.py:1-4`) | refuted (for `stats/regression/`) | `stats/regression/` → `SimpleRegressionView` uses scipy `linregress` floats, no precision (`urls.py:218-220`, `simple_regression_view.py:42`). Other regression routes do use `HighPrecisionRegression(precision=50)` (`regression_views.py:145`). |
| Routes point to real implemented views (no test/stub views wired into prod) | refuted | `simple_test` (`urls.py:244`) and `SimpleRegressionView` debug view are live; `test_missing_endpoints.py` is a stray dead script present in the package. |
| `test_missing_endpoints.py` wired into prod | refuted | grep: no URLconf imports it. Orphan dead code (a `requests`-based integration script, not a view module). |
| No duplicate routing | refuted | `api/v1/` vs `api/` (`core.api_urls`) expose overlapping power/causal/DiD/mixed capabilities via different engines; 2 literal duplicate paths in `urls.py:227-228` vs `385-386`. |
| Auth/permissions appropriate on sensitive endpoints | refuted/needs-followup | Dominant `permission_classes=[AllowAny]`; platform/billing/RBAC/audit/manuscript share the permissive default. Webhook/journal-submit need in-view verification (per-view audit). |
| MANOVA / repeated-measures are distinct multivariate methods | not_found (routing-level) | `urls.py:213-215` alias both to `HighPrecisionANOVAView` via `anova_type`; method fidelity must be verified in ANOVA slice. |
| `HighPrecisionRegressionView` supports ridge/lasso/logistic/polynomial | confirmed | `regression_views.py:44,65-88` branch correctly to `model.{ridge,lasso,logistic,polynomial}_regression`. |
| All routed `views.X` symbols exist | confirmed | Parsing showed every `views.*` reference resolves in `views.py` (no dangling import names at routing level). |

---

## (d) Prioritized recommendations toward "world-class"

1. (HIGH) Re-route `stats/regression/` to `HighPrecisionRegressionView`; delete `SimpleRegressionView`. The headline regression endpoint currently ships a debug scipy stub while claiming 50-digit precision (F1).
2. (HIGH) Apply real authentication/authorization to non-calculator endpoints (platform/org/billing/RBAC/audit/manuscript). Split the flat URLconf into "public-stats" and "authenticated-platform" includes; set object-level permissions; verify Stripe webhook signature in-view (F4).
3. (HIGH) Resolve the `api/v1/` vs `api/` (`core.api_urls`) overlapping statistical API. One canonical engine; deprecate/namespace the other; document the choice (F2).
4. (MEDIUM) Remove the `api/v1/test/` `simple_test` route from production routing, delete the stray `test_missing_endpoints.py` script, and delete the dead `core/urls.py` module (F3, F8, F10).
5. (MEDIUM) Replace the endpoint-count badge/MEMORY figure with an auto-generated count derived from the OpenAPI schema, and define "endpoint" as a distinct (path, method, view). Reconcile aliasing so advertised capabilities (MANOVA, RM-ANOVA) are actually delivered (F6, F7).
6. (LOW) Delete the 2 literal duplicate routes (`urls.py:385-386`) and the `if False` dead parser line (`regression_views.py:32`) (F5, F9).
7. (LOW) Add a CI test that asserts no module named `test_*`, `simple_*`, or with "debug"/"temporary" docstrings is reachable from `urlpatterns`, to prevent regression of debug-endpoint leakage.

---

### Tool-environment note
During this audit the Bash tool intermittently returned empty stdout and the Read tool truncated large `/tmp` dumps. All findings above are grounded in source reads that completed successfully (full `urls.py`, root `urls.py` (36 lines), `core/urls.py`, `core/api_urls.py`, `simple_regression_view.py`, `regression_views.py` post body, `test_missing_endpoints.py`, `simple_test.py`) and in route statistics computed via Python that returned before the harness degraded. Files that do NOT exist were positively confirmed missing via `ls`: `core/health_urls.py`, `api/test_urls.py`, `api/test_views.py`. An earlier draft of this report (lines describing a "FIVE URL trees" root URLconf, `api/core/`, `health/`, `test/` includes, and "161 distinct views") was based on an assumed root URLconf and is superseded by the verified content above — the verified numbers are 198 entries / 196 distinct paths / 188 distinct views. Items flagged "needs-followup" (e.g. exact per-view permission audit of platform/manuscript bodies) are explicitly scoped to their own audit slices.
