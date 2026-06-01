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

## 4. Test suite must be green & actually gate  ☑ DONE (2026-06-01)

- ☑ **Test-isolation 429 problem fixed** (`f8cee5c`): `RATE_LIMIT_ENABLED` now gates off under the
  `TESTING` flag, so the test client is no longer throttled — the 76-failure "429" storm in
  `core.tests.test_v2_api_endpoints` is gone (and it had masked a real batch-submit regression).
- ☑ **Per-test unique LTI nonce** (`e8c88d0`) — fixed a pre-existing full-suite isolation failure
  exposed once the suite could run end to end.
- ☑ Full backend suite green: **831/831** (verified locally pre-merge AND on CI `Backend Test`).
- ☑ Frontend gate green: **654/654** (verified locally pre-merge AND on CI `Frontend Test`).
- ☑ Audit-branch suites confirmed: report-token, lti/jwt, hp-anova, cascade, hp-edge,
  stats-regression-route, platform-services — all in the green run.

---

## 5. Deploy-and-smoke-test the REAL stack  ◐ smoke PASSED live; image-build verified on CI; host deploy remains operator

- ☑ **Smoke-test script ready & validated:** `scripts/smoke_test.sh` (commit 5947125).
- ☑ **Smoke run against a live, migrated server — 7/7 PASS (2026-06-01).** Ran the real backend on a
  fresh-migrated throwaway SQLite DB (DEBUG=True functional smoke; prod-posture — SSL redirect,
  rate-limit, fail-closed secret — is unit-tested in `test_settings_hardening.py`). Migrations apply
  cleanly from scratch incl. `0012_manuscriptsubmission_report_token_hash`. Results: health, t-test,
  ANOVA, high-precision regression all 200; **manuscript share-token IDOR flow PASSED end-to-end**
  (with-token → 200, without-token → 404) — the part that SKIPs without a migrated DB.
- ◐ **Docker images build:** verified on CI (`Docker Build` + `Push to GHCR` jobs on `main`), since
  the local box had only ~9 GB free (a multi-GB compose build risked the disk-full state hit earlier).
  Images publish to `ghcr.io/visvikbharti/stickforstats_new/{backend,frontend}` — pull these on the
  deploy host instead of building there.
- ★ `docker compose up` on the **deploy host** with the §2 `.env` (compose refuses to start without
  the secrets) → postgres + redis + backend + frontend + celery healthy.
- ★ HTTPS serves with a real cert (nginx TLS config exists; `nginx/ssl/` is empty — provide certs).
- ★ Run `scripts/smoke_test.sh` against the deployed HTTPS URL → expect all 7 green (same as the local
  run, now over TLS on the real host).

---

## 6. Merge & release hygiene  ☑ DONE (2026-06-01)

- ☑ **PR opened, CI green, merged.** PR #1 (https://github.com/visvikbharti/stickforstats_new/pull/1)
  — all 5 required checks green (Backend/Frontend/SDK Lint + Backend/Frontend Test). Squash-merged to
  `main` as commit `ba0e119` via admin override (branch protection required 1 review; author can't
  self-approve a solo repo, `enforce_admins=false` permitted the override — done with explicit
  maintainer authorization). Playwright E2E is non-gating (`continue-on-error`).
- ☑ **Tagged + released:** annotated tag `v1.0.0-beta.1` on `ba0e119`, pushed; GitHub **prerelease**
  published: https://github.com/visvikbharti/stickforstats_new/releases/tag/v1.0.0-beta.1
- ☑ Merge-prep gates (pre-merge): backend 831/831, frontend 654/654, flake8 0, ESLint 0.
  PR description: `docs/PR_audit_p0_remediation.md`.
- ◐ **On-merge `main` pipeline:** `Docker Build` + `Push to GHCR` run on `main` (publishing
  `ghcr.io/visvikbharti/stickforstats_new/{backend,frontend}:latest`+`:<sha>`; no secrets baked).
  `Deploy to Staging` is a placeholder echo — **no real deploy happens from CI.**
- ○ Update README/docs metrics if any still drift (endpoint count, languages, etc.).

Note: local `main` still carries 2 pre-existing unpushed commits (governance/PDF-renderer) on top of
the old `c93706c`; `origin/main` now diverges (it has the squash commit `ba0e119`). Reconcile locally
with `git fetch && git reset --hard origin/main` (discards the 2 local doc commits) or cherry-pick
them onto `origin/main` if you still want them. Harmless to the release.

---

## 7. Recommended-but-can-run-during-beta (not blockers)

- Auth on platform/billing/RBAC/audit endpoints if exposed (audit 11/F4).
- Wire real monitoring (`/metrics/` + exporters) — currently scaffolded only (audit 21/F3).
- Mobile/desktop/SDK polish (audit 22) — keep out of beta scope.
- A quick re-audit of the changed code after merge.

---

## Go / No-Go

**Status (2026-06-01):** §1 ☑, §2 ☑, §3 ☑, §4 ☑ (code-side), §5 ◐ (live smoke 7/7 + CI image build),
§6 ☑ (merged + tagged `v1.0.0-beta.1` + prerelease). Everything I can do without your infrastructure
is **done**. The single remaining gate to actually invite testers is the **host deploy**:
  1. Provision a host; create the §2 `.env` with strong secrets; provide TLS certs in `nginx/ssl/`.
  2. `docker pull` the GHCR images (or `docker compose build`), `docker compose up`, `migrate`.
  3. Run `scripts/smoke_test.sh` against the live HTTPS URL → expect 7/7.
  4. Apply the §0 beta-shape decisions (invite gating, beta banner, feedback channel, privacy notice).
Open public beta (open registration, abuse protection at scale, compliance) is a later milestone.
