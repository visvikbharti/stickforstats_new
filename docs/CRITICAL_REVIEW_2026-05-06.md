# Critical Review — StickForStats v2.0
## Multi-Agent Audit Synthesis

**Date:** 2026-05-06
**Auditor:** Claude Opus 4.7 (1M context), 9 specialized sub-agents
**Project root:** `/Users/vishalbharti/StickForStats_v1.0_Production`
**Scope:** Entire codebase (3,255 files, 434 Python, 766 JS/TS) + papers + replication scripts + compliance docs + infrastructure
**Methodology:** Nine parallel specialized auditors, each tasked with a specific subsystem, instructed to find placeholders, fabricated data, scientific-integrity issues, and overclaims. Findings cross-checked and synthesized.
**Trigger:** Pre-submission integrity audit requested by PI ahead of JOSS / PLOS Computational Biology submissions.

---

## Auditors Deployed

1. **Backend statistical core** — Guardian validators, high-precision calculator, SQS rules, statistical services
2. **Backend API + autonomous/manuscript services** — 195 endpoints, services, middleware, Celery, OpenAPI
3. **Frontend code** — React pages, components, services, i18n, mock-data sweep
4. **Test suite integrity** — backend/frontend/E2E tests, CI workflows, test counts, skipped tests
5. **Papers + replication scripts** — JOSS paper, PLOS draft, all replication scripts, retraction backtest framing
6. **Compliance + infrastructure** — SOC2, FDA Part 11, Docker, Kubernetes, Keycloak, Kong, Nginx
7. **Mobile + Desktop + SDKs + Extensions** — React Native app, Tauri desktop, Python/R SDKs, browser/Jupyter extensions
8. **Retraction backtest deep-dive** — Preregistration, harvest, scoring, analysis, second-coder process
9. **Cross-cutting placeholders/secrets sweep** — Global TODOs, NotImplementedError, mock signals, leaked credentials

---

## Bottom Line

The platform's **statistical engine is real and well-engineered**. The **Guardian core** and **manuscript pipeline** are real. The **retraction-backtest harness** (data + code) is unusually rigorous. **There is no evidence of malicious fabrication.**

However, there is a consistent pattern of **scope-overclaim, curated-data presentation, and stub-as-real misrepresentation** that a careful reviewer or institutional auditor will catch. There are also **two authentication bypasses** shipped in `main` that must be fixed before any deployment.

---

## P0 — Stop-the-Press (must fix before any submission or deployment)

### 1. Cherry-picked meta-analysis dataset (Case Study 3) — most serious finding

Two scripts in the public repo openly document seed-search curation:
- `paper/replication/find_optimal_meta_data.py:1-3` — *"Target: Egger's p around 0.02-0.05 (pedagogically interesting borderline case)"*. Sweeps 1,000 seeds keeping the closest to 0.024.
- `paper/replication/create_correct_meta_analysis_data.py:127-176` — *"SEARCHING FOR OPTIMAL PEDAGOGICAL EXAMPLE"*. 100-seed sweep filtered by I² and direction.

The 12-row dataset that ends up in PLOS Case Study 3 (`paper/plos_compbio/manuscript.md:206-208`) and Figure 5 was filtered through this seed search. **PLOS abstract line 18 then claims:** *"Guardian detected publication bias (Egger's p = 0.024) that a conventional pipeline would have missed."* The number is arithmetically reproducible from the 12 numbers, but the 12 numbers were curated to land in the desired p-range. **This is undisclosed in both papers.**

**Fix:** Replace with a real published meta-analysis. Delete or relocate the `find_optimal_*` / `create_correct_*` scripts.

### 2. Authentication bypasses shipped in `main`

- `backend/core/services/sso_service.py:78-121` — `validate_token()` decodes JWT payload, checks `exp` and audience, **does not verify signature**. Returned claims map to org-admin roles via `sso_views.py:106-144`. Any forged JWT works.
- `backend/core/services/lms_service.py:128-129` — explicit comment: *"For now, extract and validate structure"*. Same bypass for LTI 1.3.
- `backend/api/v1/lms_views.py:213-226` — JWKS endpoint returns hardcoded `"n": "placeholder_modulus"`.

**Fix:** Implement JWKS-backed signature verification before any pilot deployment.

### 3. Compliance documents presented as audited

- `compliance/SOC2_Type_II_Controls.md` titled and framed as a Type II report (line 1, 8, 10). It is a self-attested control inventory. References non-existent personnel (CISO, "Platform Security Team"), non-existent customers ("Enterprise tier customers", "99.9% uptime SLA"), non-existent processes (annual security training, quarterly DR drills, annual pentest, audited cloud datacenters).
- `compliance/FDA_21_CFR_Part_11.md` — same C-as-A pattern. References non-existent VMP (line 484), non-existent SOPs SOP-001..SOP-008 (line 599). Says "6-language internationalization" (actually 16).
- `compliance/SECURITY_CONTROLS_MATRIX.md:266-272` — fabricated quantitative claims: "78 of 84 controls Implemented (93%)", "OWASP Top 10: 35/35 implemented (100%)".

**Fix:** Rebrand as "Self-Attested Control Reference (Not an Audit Report)"; strip fake signatures; mark operational-evidence rows as "Designed; operational evidence pending."

### 4. PLOS manuscript factual errors any reviewer catches in 60 seconds

- **"Eight validators"** (lines 20, 62, 113, 115, 248, Fig 4) — code has 7. `backend/core/manuscript/advanced_validators.py:1684-1693`. JOSS paper correctly says "Seven."
- **"ICH-E9 discipline profile"** — does not exist as a profile. `discipline_profiles.py:1539-1554` registers 7 profiles; "ICH-E9" appears only as a string inside `CLINICAL_TRIAL_PROFILE.guideline`.
- **Internal contradiction**: line 133 says *"648 backend and 573 frontend tests"* (=1,221); abstract+222+274 say *"1,088 automated tests (515 backend, 573 frontend)"*. Both cannot be true.
- **Endpoint count**: PLOS=197, JOSS=195, **actual=198** (`grep -c "^\s*path(" backend/api/v1/urls.py`).
- **Page count**: PLOS=40, JOSS=25, **actual ≈38**.

### 5. Frontend ships hardcoded test credentials in production bundle

`frontend/src/pages/DebugLoginPage.js:21-49` — hardcoded `admin@stickforstats.com / admin123`, `researcher / researcher123`, `student / student123`, `demo / demo123`. The `NODE_ENV === 'production'` redirect runs after mount; credentials live in the JS bundle delivered to every browser.

### 6. JATS metadata has empty email tags — JOSS will reject

`paper/jats/paper.jats:58-59` — both `<corresp>` blocks have empty `<email></email>` tags.

### 7. `MASTER_VERIFICATION.py` "Scientific Integrity Certification" is fake

Lines 50-62 pass whenever stdout contains "PASS" anywhere, regardless of returncode. `validate_meta_analysis_paper_data.py` compares against an out-of-sync `paper_values` dict — every row prints "✗ NO" but MASTER_VERIFICATION reports STATUS: PASSED. The "Certification" banner cannot be cited.

---

## P1 — Scientific Integrity & Honesty Concerns

### 8. Statistical math errors surfaced to researchers

- `backend/core/guardian/guardian_core.py:811-845` `IndependenceValidator` — claims **Durbin-Watson** in docstring + citation; computes **lag-1 Pearson autocorrelation on raw data** (line 823). No p-value.
- `backend/core/services/assumption_service.py:227-233` and `guardian_core.py:710-714` — Anderson-Darling "p-values" are step-function categorical (one of {0.15, 0.10, 0.05, 0.025, 0.01, 0.001}); for n>5000, two-valued ({0.05, 0.10}).
- `backend/core/services/cascade_engine.py:354-362` — Wilcoxon "r effect size" computed as `W / max(W)`, labeled `"r (effect size)"`. Conventional formula is `Z / √N`.
- `backend/core/services/cascade_engine.py:394` — labeled "Epsilon-squared" but formula is unbiased η².
- `backend/core/services/genomics/differential_expression.py:285-289` — on `ValueError`, sets `(stat, p_val) = (0.0, 1.0)` without flagging. Silently marks failed-to-compute genes "not significant."

### 9. User-facing UI fabricates data

- **RAG monitoring dashboards** (`frontend/src/components/rag/RAGPerformanceMonitorDashboard.js:99-150`, `RAGPerformanceDashboard.js:88-130`) — every metric from `Math.random()`. Route `/monitoring/rag-performance`. No "demo" disclosure.
- **PCA pathway enrichment** (`frontend/src/components/pca/PcaInterpretation.jsx:164-181`, `PcaVisualization.optimized.jsx:1071-1115`) — hardcoded pathway names with `Math.random()` enrichment scores assigned to genes regardless of input.
- **PCA module silently fakes success** on backend failure (`DataUploader.jsx:96-110`, `PcaConfiguration.jsx:73-91`, `PcaPage.jsx:364-371`) — cheerful "Demo Mode" success.
- **BundleComparison reproducibility** (`frontend/src/components/Reproducibility/BundleComparison.jsx:296`) — `const similarity = Math.random() * 30 + 70; // Placeholder`.
- **PowerCalculator G\*Power "validation"** (`frontend/src/components/PowerAnalysis/PowerCalculator.jsx:430-439`) — sets `gpowerValue = calculated`, reports `passed: true, percentDiff: '0.00'`. Self-validating loop. **PLOS Table 4 cites this as "G\*Power within 1%" — there is no G\*Power comparison anywhere in `replication/`.**
- **AI Advisor fallback** (`frontend/src/components/ai-advisor/hooks/useAIAdvisor.js:62-100+`) — silently returns `mockAIResponse()` on backend failure with no "DEGRADED" indicator.
- **Statistics demo pages** — `pages/statistics/{DataExplorationPage,StatisticalTestsPage,DataUploadPage}.jsx` — fully hardcoded `mockDatasets`.
- **EnvironmentCapture** (`frontend/src/components/Reproducibility/EnvironmentCapture.jsx:198-211`) — hardcoded React/Redux/D3/Lodash/Axios versions stamped into "reproducibility bundles" instead of reading `package.json`.

### 10. Test-coverage claims overstate what exists

- "38/38 Guardian tests" implies coverage of 8 validators. Cited files (`test_guardian_integration.py`, `test_guardian_middleware.py`) are 22+16=38 — but **15+ are dataclass-only assertions** that pass regardless of validator logic.
- `backend/core/tests/test_integration_manuscript.py:49-61` — dead `try: pass` blocks make `VALIDATORS_AVAILABLE` and `SQS_AVAILABLE` permanently True. Skip guards are theatre.
- `.github/workflows/ci.yml:137,154` — SDK and E2E jobs both `continue-on-error: true`. Neither can fail the pipeline.
- `backend/core/tests/test_celery_tasks.py:130-258` — patches `AutonomousCascadeEngine`/`SmartProfiler`, asserts mocks. Tests mock plumbing, not behavior.

### 11. "Universal Platform" peripherals are largely scaffolding

- **Mobile**: 5 of 6 features (`SmartAnalysis`, `PaperCheck`, `GuardianCheck`, `Certification`, `Learn`) all route to `QuickAnalysisScreen` (`AppNavigator.tsx:50-57`). Only t-test/correlation/descriptive work.
- **Desktop**: 94-line Rust file with 4 trivial commands. **Cannot build** — `tauri.conf.json:68-74` requires icons in empty `icons/` directory.
- **R SDK**: `NAMESPACE` says "Generated by roxygen2"; `man/` directory does not exist. README claims "40+ tests"; only 13 wrappers exported. **Will fail R CMD check.**
- **Python SDK**: `pyproject.toml:65-66` declares `testpaths = ["tests"]`; directory does not exist. Type annotations require Python 3.10+ but README claims 3.8+.
- **Two Jupyter packages with same name**: `sdk/jupyter/` (real, 1,879 LOC) and `extensions/jupyter/` (218 LOC stub doing scipy locally instead of calling backend). Collide on PyPI.
- **`extensions/browser/`** in MEMORY.md is a phantom — does not exist. Browser extension lives at `sdk/browser-extension/`.

### 12. "Stubs presented as real" services in backend

- `backend/core/services/site_license_service.py:135-178` — `get_license_usage`, `validate_license_key`, `generate_usage_report` return zeros and prefix-checks. `site_license_views.py:64-94` literal comment *"For demo purposes, create a mock license_data"*.
- `backend/core/services/certification_service.py:87-358` — 10 hardcoded questions; `verify_certificate` always returns `valid: True` for any `SFS-` prefix; `check_prerequisites` always `met: True`. `UserCertificationsView` returns empty arrays with literal *"will be stored in the database in production"*.
- `backend/core/services/plugin_runtime.py` — claimed "sandboxed". No subprocess isolation, no `setrlimit`, no `signal.alarm`, no AST checks. `TIME_LIMITS` checked *after* synchronous call returns. Custom plugins return *"Custom test 'X' would be loaded dynamically in production"*.
- `backend/core/tasks.py:343-422` — `sync_usage_aggregates`, `cleanup_expired_sessions`, `check_subscription_expirations` count and log but never aggregate, delete, or notify.

### 13. Retraction backtest preregistration is git-only

- Pilot's PROTOCOL.md, code, manifest, scores, and AUC=0.5727 were **all committed in single atomic commit** `3da1c65` (2026-04-17 19:13). Protocol carries no time-stamp evidence of priority over the data.
- `OSF_PREREGISTRATION.md:5` admits *"Status. Draft — ready for upload"*. Never filed at OSF.
- `PROTOCOL.md` §9 attestation says pilot was *"preregistered separately via git commit `3da1c65`"* — but that IS the same commit containing the pilot scores. Circular.
- Second-coder κ has not been computed. Honestly disclosed in PILOT_REPORT.md.
- AUC=0.573 itself is **honestly computed and reproducible** (re-run verified). The "UNDERPOWERED PILOT" framing is properly disclosed in deliverables. Concern is purely about the preregistration claim.

### 14. Memory file inaccuracies

- Memory says Egger p=0.010; paper says 0.024 and data give 0.024.
- Memory says "Guardian validators lines 314-911"; actual lines 687-1264.
- Memory says `manuscript_validators.py` and `discipline_profiles.py` under `backend/core/services/`; actually under `backend/core/manuscript/`.
- Memory says "4 discipline profiles"; actual 7.
- Memory says 13 Celery tasks; actual 12.
- Memory says 25 frontend pages; actual ~38-41 page files / 69 routes.
- Memory says `extensions/browser/`; does not exist.

---

## P2 — Polish, Drift, Documentation

- README RBAC roles "Owner, Admin, **Analyst**, Viewer"; SOC2 doc "Owner, Admin, **Member**, Viewer".
- README documentation links: 3 of 5 broken (`docs/GUARDIAN_GUIDE.md` missing; `DEPLOYMENT_GUIDE.md` and `FEATURES_DOCUMENTATION.md` referenced at root but live in `docs/`).
- README citation block still says JSS "Submitted"; was desk-rejected 2026-05-15.
- README claims SAML 2.0 + OIDC SSO; Keycloak realm config has only OIDC clients defined.
- README claims `pip install stickforstats` and CRAN-ready R package; neither published.
- i18n claim of "16 languages": 6 languages (id, pl, ru, th, tr, vi) have only ~73 keys vs ~333 for full languages — UI renders ~80% English in those locales.
- `docker-compose.yml` insecure defaults: `SECRET_KEY:-change_this_in_production`, `GRAFANA_PASSWORD:-admin`, `KEYCLOAK_ADMIN_PASSWORD:-admin`. Keycloak runs `start-dev`.
- `kubernetes/production/deployment.yaml:209-210` — `ALLOWED_HOSTS=*`.
- `kubernetes/production/services.yaml:12` — ACM ARN `xxxxxxxxxxxx` placeholder.
- `nginx/nginx.conf:89-90` — references `/etc/nginx/ssl/cert.pem` which does not exist.
- `backend/Dockerfile` Python 3.9; README says Python 3.10+.
- `backend/api/v1/audit_views_broken.py` — explicitly named "broken", excluded from flake8.
- `backend/fix_imports.py`, `fix_missing_models.py`, `test_endpoints.py`, `verify_*.py`, `performance_benchmark.py`, `stress_test_*.py`, `memory_profile_50decimal.py` — utility scripts in production root.
- `backend/memory_profile_20250918_160508.json` — captured stack-trace JSON with personal anaconda paths.
- `frontend/public/manifest.json:62-71` — PWA screenshots reference paths under `/screenshots/` that don't exist.
- Orphan frontend components: `TestTypeScript.tsx`, `ANOVAVisualization.jsx`, `AssumptionFirstSelector.jsx`.
- `pages/CertificationPage.jsx:342-551` — `linear-gradient(135deg, ...)` strings still present after 2026-04-17 flat-aesthetic redesign.
- `examples/biological_datasets/crispr_editing_strategies/README.md:19` — says "30 variants × 3 modalities (90 rows)"; CSV has 40 rows = 10 variants × 4 modalities.
- AI disclosure in JOSS paper trimmed in commit `b0ad7f0` to single sentence; on the thin side for current JOSS norms.
- PLOS Reference 8 (Osborne 2010 Box-Cox) wrong citation for the "434 articles, 8% reported normality testing" claim.
- PLOS Table 3 last row implies "SOC 2 / 21 CFR Part 11" *compliant*; should say *documented* or *designed for*.
- `paper/replication/run_all_validations.py` validates SciPy against hardcoded SciPy outputs — circular consistency check.
- `paper/replication/validate_against_R.R` does real R/SciPy comparison for 7 tests, then prints static "EXACT agreement (16 digits)" block regardless of per-test outcomes.

---

## What's Genuinely Solid

1. **High-precision statistical engine** (`backend/core/high_precision_calculator.py`) — real `mpmath` (50 digits), `Decimal`, Kahan summation, Welford. Foundation is solid.
2. **Guardian central engine** — `NormalityValidator`, `VarianceHomogeneityValidator`, `HomoscedasticityValidator` (Breusch-Pagan), `LinearityValidator`, `OutlierDetector` are textbook implementations using real scipy. Confidence formula matches docs.
3. **SQS rules** (`backend/core/sqs_rules.py`) — all 45 rules concrete regex patterns with reasoned point values.
4. **Manuscript pipeline** — real PDF/DOCX/LaTeX parser, real APA-style claim extractor, real STATCHECK-style p-value recomputation, 7 real advanced validators (1,751 lines), 7 real discipline profiles.
5. **Webhook signing** — HMAC-SHA256 + replay window. Stripe via `stripe.Webhook.construct_event`.
6. **GDPR service** — actually deletes/anonymizes records.
7. **RBAC service** — DB-backed role lookups with cache.
8. **Data import** — real pyreadstat for SPSS/SAS/Stata.
9. **APIDocsPage.jsx** — 1,267 lines, **89** real endpoint specs across 15 categories. Exceeds the claim.
10. **Guardian frontend components** — all consume real backend props. No demo fallbacks. Well-tested.
11. **Autonomous components** (`SmartUpload`, `NaturalLanguageBar`, `PlainEnglishResults`, `GuidedWizard`) — real API integration.
12. **Service layer** (23 files): all use `process.env.REACT_APP_API_URL`, real auth interceptors, real axios.
13. **Retraction backtest harness** — real Retraction Watch + PMC + Europe PMC API harvesting, 619-file response cache, real DOI cross-validation, real Mann-Whitney AUC + matched-cluster bootstrap, real per-rule BH-FDR. The `CRITICAL_REVIEW.md` self-audit caught a real data bug (case_0019) and fixed it. AUC=0.573 reproduces exactly.
14. **Cohen's κ implementation** (`compute_kappa.py`) — real, well-tested. Decision rule preregistered.
15. **Browser extension** (`sdk/browser-extension/`) — real Manifest V3, 642-line content script, real backend call.
16. **Iris, Wine, CRISPR case-study numbers** — all reproducible from real datasets. Honest.
17. **Code hygiene**: only 3 `TODO` comments project-wide, zero `FIXME/XXX/HACK`, zero leaked secrets, zero unconditional skipped tests, zero `debugger;` statements.
18. **`kubernetes/production/secrets-template.yaml`** — gold-standard honest template with explicit "DO NOT commit actual secrets" header.
19. **`examples/biological_datasets/README.md`** — honest provenance labeling.

---

## Risk Summary

| Risk | Severity | Affected | Mitigation |
|------|----------|----------|------------|
| Cherry-picked meta-analysis surfaces in PLOS reviewer's check of `replication/` | High | Scientific integrity, journal acceptance | Replace dataset with real published meta-analysis |
| JWT bypass allows identity spoofing | Critical | Production deployments | Implement JWKS signature verification |
| SOC 2 Type II claim unsupported | High | Institutional procurement, legal | Rebrand as self-attested |
| FDA Part 11 claim unsupported | High | Pharma/CRO trust | Rebrand as design specification |
| Mock dashboards present fabricated metrics | Medium | User trust | Wire to real metrics or remove routes |
| Mobile/Desktop claimed as platform components | Medium | Reviewer credibility | Reframe as prototypes or implement |
| Test count claims overstate validator coverage | Low-Medium | Paper credibility | Reframe in docs |
| Compliance docs reference non-existent VMP/SOPs/CISO | High | Institutional procurement | Honest rewrite |

---

## Methodology Note

This audit was generated by 9 AI sub-agents in parallel, each given a specific scope and instructed to be ruthlessly honest. Each finding includes a file:line reference. Findings were cross-checked between agents (e.g., the cherry-picked meta-analysis was independently surfaced by the papers auditor and the cross-cutting auditor).

The audit may have missed:
- Issues in archived directories (`docs/archive/`) — only spot-checked.
- Deep issues inside individual statistical implementations (e.g., specific test families like survival analysis or Bayesian methods) where time was bounded.
- Production runtime issues that would only manifest under load.
- Issues introduced after the audit date.

A re-audit should be performed after each major remediation phase.

---

## Companion Document

See [`WORK_PLAN_2026-05-06.md`](WORK_PLAN_2026-05-06.md) for the six-phase remediation plan derived from this audit.
