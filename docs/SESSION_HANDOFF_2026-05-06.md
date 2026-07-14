# Next-Session Pickup — 2026-05-06

> **Dated snapshot — superseded.** This records what was believed on the date in its title.
> For the current state of the project, start at [`README.md`](README.md) (the undated index),
> then [`STATUS_2026-07-14.md`](STATUS_2026-07-14.md) and [`TODO_2026-07-14.md`](TODO_2026-07-14.md).
> **Do not trust a "Still open" section in a dated document without re-checking it.**

**Last session ended:** 2026-05-06 ~21:00 IST (laptop battery emergency at 1%)
**Branch:** `main`, fully synced with `origin/main`
**Last commit:** `93783b6` (`fix(security): Real JWT signature verification for SSO + LTI 1.3`)
**Working tree:** clean

---

## TL;DR for the next assistant session

The previous session executed a 9-agent comprehensive scientific-integrity audit and then completed **Phases 1 and 2** of the resulting remediation work plan in one sitting (11 commits pushed). All P0 (stop-the-press) and P1 (integrity / security / statistical correctness) findings from `docs/CRITICAL_REVIEW_2026-05-06.md` are now closed and on `main` with CI green on the 5 required checks.

**What's left:** Phase 3 (implement claimed peripheral services), Phase 4 (mobile/desktop/SDK completion), Phase 5 (external-resource items awaiting PI decisions), Phase 6 (test integrity + CI cleanup including the pre-existing Playwright E2E failure).

---

## Read these first (in order)

1. `docs/CRITICAL_REVIEW_2026-05-06.md` — the source audit, organized P0/P1/P2 with file:line evidence
2. `docs/WORK_PLAN_2026-05-06.md` — six-phase remediation plan; Phase 1 + Phase 2 marked DONE with commit hashes; Phases 3-6 still have unchecked checklist items
3. `MEMORY.md` — Project Overview + Audit Remediation Status section + JWT/Auth operational notes
4. The 11 commits since the audit (run `git log --oneline def64ea^..HEAD`):

```
93783b6 fix(security): Real JWT signature verification for SSO + LTI 1.3
b1a28b4 fix(genomics+core): Stop swallowing silent test failures and assumption-check errors
afcf6bb fix(guardian): Continuous Anderson-Darling p; honest IndependenceValidator
a37ee71 fix(cascade-engine): Correct Wilcoxon r and Kruskal-Wallis effect-size labels
784a462 fix(compliance): Mark Stripe + Keycloak sub-processors as conditional in DPA
7a78811 fix(security): Remove DebugLoginPage with hardcoded test credentials
664fdc9 fix(plugin-runtime): Honest in-process trust model — drop "sandboxed" claim
1fecc0d feat(manuscript): Add ICH-E9(R1) estimands discipline profile
8deee5a paper(plos)+fix(replication): Replace cherry-picked Case Study 3 with real Egger 1997 data + fix factual errors + repair verification harness
5b81342 paper(joss): Fill empty corresponding-author email tags in JATS
def64ea docs(audit): Add 2026-05-06 multi-agent critical review + Phase 1 work plan
```

---

## What's done (deltas to remember)

### Files added (won't be obvious without reading)

| Path | Purpose |
|---|---|
| `docs/CRITICAL_REVIEW_2026-05-06.md` | Audit findings (P0/P1/P2) |
| `docs/WORK_PLAN_2026-05-06.md` | Six-phase remediation plan + status tracker |
| `paper/replication/data/iv_magnesium_meta_analysis.csv` | Real Egger 1997 dataset (16 trials) |
| `paper/replication/verify_meta_analysis_real.py` | Python-only verification, cross-validated R↔Python to 4+ dp |
| `paper/replication/_pedagogical_seed_search/README.md` | Transparency note for archived cherry-picking scripts |
| `paper/replication/_pedagogical_seed_search/find_optimal_meta_data.py` | Moved here from the public replication directory |
| `paper/replication/_pedagogical_seed_search/create_correct_meta_analysis_data.py` | Same |
| `backend/core/utils/anderson_darling.py` | D'Agostino-Stephens 1986 continuous AD p-value |
| `backend/core/services/jwks_cache.py` | Shared JWKS fetch + TTL cache (SSO + LTI) |
| `backend/core/services/lti_keys.py` | LTI tool RSA keypair loader (env var → PEM, ephemeral fallback) |
| `backend/core/management/commands/generate_lti_keypair.py` | `python manage.py generate_lti_keypair` |
| `backend/core/migrations/0008_add_lti_nonce_used.py` | Migration for `LTINonceUsed` model |
| `backend/core/tests/test_jwt_signature_verification.py` | 20 tests — valid/forged/alg=none/HS256/expired/wrong-aud/replay/JWKS |
| `backend/core/tests/test_genomics_silent_failures.py` | 6 tests — NaN propagation, JSON-safe to_dict, cascade-on-failure |
| `backend/core/tests/test_guardian_math_fixes.py` | 12 tests — AD continuous p monotonicity, lag-1 autocorr p |
| `backend/core/tests/test_cascade_engine_effect_sizes.py` | 10 tests — Wilcoxon r and Kruskal η²H formula contracts |

### Files significantly modified

| Path | Change |
|---|---|
| `paper/plos_compbio/manuscript.md` | Case Study 3 rewrite + factual fixes (validator count, ICH-E9, endpoint count, page count, test count, references [25, 38, 39] now used) |
| `paper/plos_compbio/figures/generate_figures.py` | Reads CSV from replication dir; draws real 16-trial forest plot with Egger annotation |
| `paper/replication/MASTER_VERIFICATION.py` | Uses `result.returncode == 0` (was substring-PASS heuristic); Case Study 3 banner updated |
| `paper/jats/paper.jats` | Both `<corresp>` blocks now have real emails |
| `compliance/DATA_PROCESSING_AGREEMENT.md` | Stripe + Keycloak labeled conditional in all 3 sub-processor tables |
| `backend/requirements.txt` | Added `python-jose[cryptography]>=3.3.0` and `cryptography>=41.0.0` |
| `backend/core/services/sso_service.py` | `validate_token` now does real JWKS-based signature verification |
| `backend/core/services/lms_service.py` | `validate_launch_request` does real signature verification + nonce replay protection |
| `backend/core/services/genomics/differential_expression.py` | NaN+flag instead of (0,1) on Mann-Whitney failure; cascade on shapiro/levene NaN |
| `backend/core/services/cascade_engine.py` | Wilcoxon r = Z/√N; Kruskal η²H label; logger.exception in `_execute_test` |
| `backend/core/services/bayesian/bayesian_correlation.py` | Narrow except for quad failure (was bare `except:`) |
| `backend/core/guardian/guardian_core.py` | Anderson-Darling continuous p; IndependenceValidator honest naming + real p-value |
| `backend/core/services/assumption_service.py` | Anderson-Darling continuous p |
| `backend/core/services/plugin_runtime.py` | Honest in-process trust model; `IS_SANDBOXED = False`; structured custom-function error |
| `backend/core/manuscript/discipline_profiles.py` | Added `ICH_E9_PROFILE` (15 items) + 5 aliases; module docstring updated to "eight major research disciplines" |
| `backend/core/models.py` | Added `LTINonceUsed` model |
| `backend/api/v1/lms_views.py` | `LTIJWKSView` returns real public key |
| `backend/core/tests/test_integration_manuscript.py` | Added 2 ICH-E9 integration tests |
| `backend/tests/test_guardian_validators.py` | Updated `test_autocorrelated_data_fails` for new lag-1 message |
| `backend/core/tests/test_platform_services.py` | Updated PluginRuntime docstrings + added 2 new tests for the in-process API contract |
| `frontend/src/routes/routeConfig.js` | Removed isDevMode branch; `/debug-login` aliases LoginPage |
| `README.md` | "Sandboxed plugin runtime" → "In-process plugin extension API" |

### Files deleted

| Path | Reason |
|---|---|
| `frontend/src/pages/DebugLoginPage.js` | Shipped hardcoded test credentials in source tree (P0-5) |
| `paper/replication/validate_meta_analysis_paper_data.py` | Was checking against an out-of-sync expected dict; replaced by `verify_meta_analysis_real.py` |

---

## Operational notes (essential for any LTI / SSO work)

### Required env vars for production LTI deployment

```bash
# Generate the RSA keypair (one-time)
python manage.py generate_lti_keypair --output lti_private.pem

# Set in production environment
export LTI_RSA_PRIVATE_KEY="$(cat lti_private.pem)"
export LTI_RSA_KEY_ID="stickforstats-lti-key-1"  # optional, has default
```

Without `LTI_RSA_PRIVATE_KEY`, the LTI module generates an ephemeral keypair on each process restart (with a loud warning). LMS platforms cannot rely on key stability.

### Optional Django settings

| Setting | Default | Purpose |
|---|---|---|
| `LTI_REQUIRE_JWT_SIGNATURE` | `True` | If False, `LTIService.validate_launch_request` accepts pre-decoded claims dicts (used only by tests) |

### JWKS cache behavior

- TTL: 1 hour (Django default cache backend; uses Redis in prod, local memory in dev)
- Auto-refresh on `kid` not found (handles issuer key rotation gracefully)
- Errors raised as `JWKSError` (distinct from signature failure)

### Testing tip

The `SECURE_SSL_REDIRECT=True` setting causes Django test client to return 301s. Use `@override_settings(SECURE_SSL_REDIRECT=False)` on any test that hits the live URL routing layer (see `test_view_returns_jwks_at_endpoint` for an example).

### Database

- New migration `0008_add_lti_nonce_used` is APPLIED in dev. CI / production must run `python manage.py migrate` before traffic.

---

## What's left — pickup priority

### Phase 3 — Implement Claimed Peripheral Services (~4-7 days)

Recommended order (smallest blast radius first):

1. **Frontend mock-data wiring (P3.15-P3.21)** — easy wins; either wire to real data or remove the routes
   - RAG dashboards (`/monitoring/rag-performance`) — fabricated `Math.random()`; either wire to Prometheus or delete route
   - PCA pathway enrichment (`PcaInterpretation.jsx:164-181`) — hardcoded pathways
   - BundleComparison `Math.random()` similarity score
   - PowerCalculator G\*Power "validation" self-loop (P0 in PLOS Table 4 — must remove or replace)
   - AI Advisor mock fallback indicator
   - `pages/statistics/{DataExploration,StatisticalTests,DataUpload}` — hardcoded mockDatasets
   - EnvironmentCapture hardcoded package versions
2. **Site licensing DB-backed (P3.10-P3.14)** — DB models + real validation
3. **Certification DB-backed (P3.4-P3.9)** — Question/Exam/CertificationRecord models + signed certificates
4. **LTI grade passback POST (P3.1-P3.3)** — actual POST to LMS AGS endpoint (currently builds the payload but never sends it)

### Phase 4 — Mobile / Desktop / SDKs (~1-2 weeks)

Ordered by ease of unblocking the "platform component" claim:

1. **R SDK packaging (P4.18-P4.21)** — run `roxygen2::roxygenise()`, add missing deps (`withr`, `curl`), get `R CMD check` clean
2. **Python SDK tests (P4.15-P4.17)** — create `sdk/python/tests/`, pin Python 3.10+ in setup
3. **Reconcile dual Jupyter packages (P4.22)** — keep `sdk/jupyter/`, deprecate `extensions/jupyter/`
4. **Browser extension memory cleanup (P4.23)** — remove phantom `extensions/browser/` reference from MEMORY
5. **Desktop icons (P4.11)** — generate icon assets so Tauri can build at all
6. **Mobile screens (P4.1-P4.10)** — biggest item; 5 missing screens + ANOVA wiring + Profile persistence

### Phase 5 — External Resources (PI decisions needed)

Each item needs a yes/no budget call from the PI:

- [ ] **P5.1** OSF preregistration — file the existing draft `paper/retraction_backtest/OSF_PREREGISTRATION.md`; record DOI back into the file
- [ ] **P5.2** Recruit second coder for retraction backtest; complete labels; compute κ
- [ ] **P5.5** SOC 2 Type II — pursue real audit (~$50K, 6-12 months) OR rewrite docs as honest self-attestation
- [ ] **P5.6** FDA 21 CFR Part 11 — pursue VMP/IQ/OQ/PQ + consultant OR rewrite as design specification
- [ ] **P5.7** i18n stub languages (id, pl, ru, th, tr, vi) — hire translators OR scope claim to "10 fully translated + 6 navigation-only"
- [ ] **P5.8** R SDK CRAN submission
- [ ] **P5.9** Python SDK PyPI publication
- [ ] **P5.10** Apple/Microsoft signing certs (annual fees)

### Phase 6 — Test Integrity, CI, Cleanup (~1-2 days)

Highest-priority items first:

1. **P6.3 Playwright E2E investigation** — pre-existing red, currently `continue-on-error: true`. Need to identify what's actually broken before flipping the gate to required. The previous push run captured "Process completed with exit code 1" with no Playwright report artifact uploaded. See `e2e/tests/`.
2. **P6.1** Fix dead `try: pass` blocks at `backend/core/tests/test_integration_manuscript.py:49-61` (`VALIDATORS_AVAILABLE` and `SQS_AVAILABLE` are permanently True)
3. **P6.2** Replace mock-of-self pattern in `backend/core/tests/test_celery_tasks.py:130-258` with eager-mode integration tests
4. **P6.4-P6.7** Delete `backend/api/v1/audit_views_broken.py`; relocate `backend/fix_imports.py`, `fix_missing_models.py`, `verify_*.py`, `performance_benchmark.py`, etc. out of importable production root; rename `backend/test_endpoints.py` etc. to `manual_check_*.py`; remove `backend/memory_profile_20250918_160508.json`
5. **P6.8-P6.20** README broken links, missing PWA screenshots, RBAC role name mismatch, JSS-citation update, gradient cleanup in CertificationPage, examples README counts, docker-compose insecure defaults, Kubernetes `ALLOWED_HOSTS=*`, Python version mismatch, PLOS Reference 8 (Osborne 2010 misattribution), PLOS Table 3 "compliant" → "documented", SOC2 doc endpoint count contradiction (line 56 says 267)
6. **Node.js 20 deprecation warnings** — bump GitHub Actions to Node 24 before September 16 2026 (deadline is mid-2026; workflows currently use `actions/checkout@v4`, `actions/setup-node@v4`, `actions/setup-python@v5` etc.)

---

## Decisions made this session (don't re-litigate)

1. **Meta-analysis replacement:** real Egger 1997 / metafor::dat.egger2001 (16 IV magnesium for AMI trials)
2. **PLOS validator count:** changed to "seven" (manuscript module has 7; Guardian still has 8 separately)
3. **ICH-E9 profile:** implemented as alias of CLINICAL_TRIAL_PROFILE plus 4 estimand-specific items (rather than dropped from the paper)
4. **Plugin runtime:** Option B (honest scope-down to "in-process plugin extension API") — NOT real subprocess+setrlimit sandbox
5. **JWT library:** `python-jose[cryptography]` (not `PyJWT`)
6. **Co-Authored-By trailer:** OMITTED from all commits per user preference (saved as feedback memory `feedback_no_coauthor_trailer.md`)

---

## Known live issues (not new — pre-existing)

- **Playwright E2E** is red on `main` (Phase 6 P6.3). Currently `continue-on-error: true` in `.github/workflows/ci.yml:154`, so it does not block the pipeline, but it cannot be flipped to required until the underlying failure is investigated.
- **Node.js 20 deprecation warnings** in CI — informational, deadline June-September 2026.
- **Memory file** `~/.claude/projects/.../memory/MEMORY.md` was updated 2026-05-06 — it is the source of truth for project state. Older `docs/NEXT_SESSION_PROMPT_2026-02-20.md` is stale.

---

## Quick-start commands

```bash
# Verify current state
git status
git log --oneline -12

# Run the math + JWT tests added in this session
cd backend
DJANGO_SETTINGS_MODULE=stickforstats.settings python3 -m pytest \
  core/tests/test_jwt_signature_verification.py \
  core/tests/test_genomics_silent_failures.py \
  core/tests/test_guardian_math_fixes.py \
  core/tests/test_cascade_engine_effect_sizes.py \
  core/tests/test_integration_autonomous.py \
  core/tests/test_integration_manuscript.py

# Re-run Master Verification (Case Study 3 + Iris + Wine + others)
cd /Users/vishalbharti/StickForStats_v1.0_Production
python3 paper/replication/MASTER_VERIFICATION.py

# Apply migration if running on a fresh DB
cd backend
DJANGO_SETTINGS_MODULE=stickforstats.settings python3 manage.py migrate core

# Generate an LTI keypair (one-time, for production)
DJANGO_SETTINGS_MODULE=stickforstats.settings python3 manage.py generate_lti_keypair --output /tmp/lti_private.pem

# Check CI status
gh run list --branch main --limit 3
```

---

## Companion documents

- [`CRITICAL_REVIEW_2026-05-06.md`](CRITICAL_REVIEW_2026-05-06.md) — source audit
- [`WORK_PLAN_2026-05-06.md`](WORK_PLAN_2026-05-06.md) — phase status tracker
