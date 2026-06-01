# StickForStats — Closed Beta Deployment Checklist

**Created:** 2026-06-01
**Purpose:** Go/no-go gate before inviting a closed group of researchers to beta-test.
**Scope:** *Closed / invite-only* beta (login- or invite-token-gated), NOT an open public launch.
**Status legend:** ☐ not started · ◐ in progress · ☑ done · ⚠ blocker

> Every item is checkable with the exact command/file given. Ground-truth each before ticking.
> This list is grounded in the actual code as of branch `fix/audit-p0-scientific-integrity`
> (the audit P0 remediation branch). Do not beta off an unmerged branch — see §6.

---

## 0. Beta shape (decisions, not code)

- **Access model:** invite-only. Either require login, or gate behind an invite token.
  The manuscript-report endpoints already use per-submission share tokens (commit `3bf438d`/`f54bee8`),
  which is the right pattern to extend.
- **Banner:** every page shows a persistent "Beta — results may change; please report issues" notice.
- **Feedback channel:** a single, monitored route (email alias, form, or GitHub issue template).
- **Scope to what is solid:** autonomous analysis, Guardian, manuscript statistical review,
  and the core statistical endpoints. Explicitly mark mobile/desktop/SDK as "experimental / not in beta".
- **Data/privacy notice:** state what is stored and the erasure path (GDPR erase now real, commit `0705cc4`).

---

## 1. Scientific correctness — no wrong numbers shown to users  ☑ (done on the audit branch)

These were the P0 stats-integrity items; all fixed + tested on `fix/audit-p0-scientific-integrity`:

- ☑ CRISPR Case Study 1 reproducible (`ff1a4d4`)
- ☑ Fabricated `validation/dashboard/` metrics removed; fake CI-coverage sim fixed (`3a0922b`)
- ☑ `validation_framework` scipy-self-comparison + precision overclaim corrected (`ac5eff0`)
- ☑ hp_anova two-way/RM/MANOVA raise instead of returning None (`ec7068e`)
- ☑ Two-sample t-test no longer fabricates `999.999`/`1e-50`; reports undefined honestly (`d21cddb`)
- ☑ Cascade chi-square/Fisher handle string categories; honest r×c labeling (`7433558`)
- ☑ `stats/regression/` routes to the real high-precision engine, not the float64 stub (`28ac6e5`)

**Verify:** `cd backend && python manage.py test core.tests.test_hp_calculator_edge_cases core.tests.test_cascade_categorical core.tests.test_stats_regression_route core.tests.test_hp_anova_post_hoc` → all green.

---

## 2. Secrets & configuration hardening  ☑ DONE (commit 831197f) — operator action still required at deploy

Code-side hardening landed; the remaining items are deploy-time operator actions (★).

- ☑ **SECRET_KEY fails closed when serving in prod.** `settings.py` now raises
  ImproperlyConfigured if `DJANGO_SECRET_KEY` is unset while serving (runserver/gunicorn/
  uvicorn/daphne, DEBUG=False, not testing). Build/admin commands + tests still get an
  ephemeral key, so CI/Docker build are unaffected.
- ☑ **docker-compose weak defaults removed.** SECRET_KEY/JWT_SECRET/REDIS_PASSWORD are now
  fail-closed `${VAR:?must be set in .env}`; no more change_this_* / redis_secure_password.
- ☑ **ALLOWED_HOSTS** no longer ships `testserver` in prod (only under DEBUG/TESTING).
- ☑ **python-jose pinned** `>=3.4.0,<4.0.0` (excludes CVE-2024-33663/33664). jwt tests green.
- ★ **DEBUG=False on the beta box** — operator: ensure the deploy env does NOT set
  `DJANGO_DEBUG=True`. With DEBUG=False, prod security (HSTS, secure cookies, SSL redirect)
  and rate-limiting switch on automatically.
- ★ **Generate a real `.env`** from `.env.example` with strong unique secrets (DJANGO_SECRET_KEY,
  JWT_SECRET, REDIS_PASSWORD, DB_PASSWORD, GRAFANA_PASSWORD, KEYCLOAK_ADMIN_PASSWORD) and a real
  `DJANGO_ALLOWED_HOSTS`; confirm `.env` is gitignored. (Compose now refuses to start without them.)
- ☐ Generate a real `.env` from `.env.example` with strong secrets; confirm it is gitignored.

**Verify:** `grep -n "change_this\|redis_secure_password\|testserver" docker-compose.yml backend/stickforstats/settings.py` → only intentional/fail-closed forms remain.

---

## 3. Abuse / DoS protection on public endpoints  ☑ DONE (commit be8819e) — one deploy-time + one optional item remain

The statistical/manuscript/import endpoints are public calculators (`AllowAny`).

- ☑ **Input-size caps** (commit be8819e): shared `MAX_FILE_UPLOAD_BYTES` (default 25 MB,
  env-tunable via `MAX_FILE_UPLOAD_MB`) enforced on manuscript analyze/parse/claims/consistency,
  batch, and SQS PDF upload; Django `DATA_UPLOAD_MAX_MEMORY_SIZE`/`FILE_UPLOAD_MAX_MEMORY_SIZE`/
  `DATA_UPLOAD_MAX_NUMBER_FIELDS` set as framework-level defense in depth. Numeric endpoints
  already cap arrays at 1M points (`DataArrayValidator`); data-import already caps at 100 MB.
- ☑ **LMS grade-passback SSRF** guarded (`ddc52b6`).
- ☑ **Rate limiting** enforced in prod (auto-on when DEBUG=False; off under tests via TESTING).
- ★ **Operator:** confirm rate limiting is active on the beta host (DEBUG=False) and tune
  `RATE_LIMIT_DEFAULT_*` / `MAX_FILE_UPLOAD_MB` for expected beta load.
- ○ **Optional (post-beta decision):** require auth (not just rate-limit) on the heavier compute
  endpoints. Deferred — the public-calculator posture is acceptable for a closed beta with rate
  limiting + size caps.

**Verify:** with DEBUG=False, hammer an endpoint > limit → expect HTTP 429.

---

## 4. Test suite must be green & actually gate  ⚠ BLOCKER

- ☐ **Fix the test-isolation 429 problem.** `core.tests.test_v2_api_endpoints` has **76 failures + 3
  errors on clean HEAD**, all `429 != 200` — `RateLimitMiddleware` throttles the test client because
  the suite fires many requests fast. Fix by disabling/raising the limit under test (e.g. gate
  `RATE_LIMIT_ENABLED` off when a `TESTING` setting is on, or `@override_settings`). Until fixed, this
  suite cannot gate CI and masks real regressions. **(Pre-existing, not caused by the audit branch.)**
- ☐ Full backend suite green: `cd backend && python manage.py test` (after the 429 fix).
- ☐ Frontend gate green: `cd frontend && CI=true npx react-scripts test --watchAll=false`.
- ☐ Re-confirm the audit-branch suites: report-token, lti/jwt, hp-anova, cascade, hp-edge,
  stats-regression-route, platform-services.

---

## 5. Deploy-and-smoke-test the REAL stack  ⚠ BLOCKER

Don't assume the compose stack works — prove it on a real (staging) box.

- ☐ `docker compose build` succeeds (backend gunicorn + frontend nginx images).
- ☐ `docker compose up` brings up postgres + redis + backend + frontend + celery + nginx healthy.
- ☐ HTTPS serves with a real cert (nginx TLS config exists; `nginx/ssl/` is empty — provide certs).
- ☐ End-to-end smoke on the deployed box (not just local):
  - upload a dataset → autonomous profile/query returns a result;
  - run a Guardian-checked test (t-test/ANOVA) via `stats/ttest/`, `stats/anova/`;
  - `stats/regression/` returns high-precision output (now the real engine);
  - submit a manuscript → get a report URL with a share token → fetch it with the token (200) and
    without (404).
- ☐ Confirm migrations apply cleanly on a fresh DB (incl. `0012_manuscriptsubmission_report_token_hash`).

---

## 6. Merge & release hygiene  ⚠ BLOCKER

- ☐ Review the `fix/audit-p0-scientific-integrity` branch (15 commits) and merge to `main`.
- ☐ CI green on `main` after merge (`.github/workflows/ci.yml`, `security.yml`).
- ☐ Tag a beta release (e.g. `v1.0.0-beta.1`) so testers report against a known build.
- ☐ Update README/docs metrics to reality if they still drift (endpoint count, languages, etc.).

---

## 7. Recommended-but-can-run-during-beta (not blockers)

- Auth on platform/billing/RBAC/audit endpoints if exposed (audit 11/F4).
- Wire real monitoring (`/metrics/` + exporters) — currently scaffolded only (audit 21/F3).
- Mobile/desktop/SDK polish (audit 22) — keep out of beta scope.
- A quick re-audit of the changed code after merge.

---

## Go / No-Go

**GO for closed beta when:** §1 ☑ (done), and §2, §3, §4, §5, §6 all ☑.
Today's remaining blockers are config hardening (§2), input-size caps (§3), the test-isolation 429
fix (§4), a real deploy smoke-test (§5), and merge+CI (§6) — estimated ~2–3 focused sessions.
Open public beta (open registration, abuse protection at scale, compliance) is a later milestone.
