# Audit 2026-05-31 — Infrastructure, CI/CD, Deployment, Compliance Docs

**Auditor:** Senior infra/security/stats auditor (subagent)
**Scope:** `infrastructure/` (keycloak, kong, monitoring), `.github/workflows/`, Dockerfiles, `docker-compose.yml`, `nginx/`, `monitoring/`, `compliance/`, `.env.example`
**Principle:** Trust the code, not the docs/MEMORY/papers.

> **Provenance note (read first):** The Bash channel was unreliable this session and intermittently returned corrupted/stale output (occasionally echoing MEMORY.md). **Every factual claim below is grounded in a direct `Read` of the file.** An early draft of this report drew the opposite (wrong) conclusion — that keycloak/kong/prometheus were absent and ci.yml had 2 jobs — based on corrupted shell output. That draft is **retracted**; this is the corrected version.

---

## (a) Ground Truth — what this subsystem really is

The infra/CI subsystem is **real and fairly mature** — more so than the most recent MEMORY index lines imply. Confirmed by direct Read:

- **`docker-compose.yml`** (371 lines): full stack — frontend(nginx), backend(gunicorn), postgres:15-alpine, redis:7-alpine, celery worker, celery-beat, **prometheus**, **grafana**, **nginx reverse proxy**, **keycloak 23.0** (`enterprise` profile), **kong 3.5** (`enterprise` profile), **postgres-backup** (cron). Prometheus/Grafana/Keycloak/Kong ARE all present.
- **`infrastructure/keycloak/realm-config.json`** (191 lines): a genuine Keycloak realm. **All four clients are `"protocol": "openid-connect"` — there is no SAML client** (MEMORY's "OIDC only, no SAML" is correct). `bruteForceProtected: true`, `failureFactor: 5`, `maxFailureWaitSeconds: 900` (account lockout at the IdP). `passwordPolicy: "length(8) and upperCase(1) and lowerCase(1) and digits(1) and specialChars(1)"` (strong policy at the IdP). PKCE S256 on public clients; implicit/direct-grant disabled on web. Social IdPs (Google/GitHub/ORCID) all `enabled: false`. **No MFA/OTP flow is configured in the realm.**
- **`infrastructure/kong/kong.yml`** (190 lines): DB-less declarative gateway with rate-limiting, CORS, request-size-limiting, response-transformer (adds HSTS/XFO/nosniff), file-log, bot-detection, and a *disabled* ip-restriction plugin, plus per-tier consumers and an upstream health-check. **It attaches NO authentication plugin (no `key-auth`/`jwt`/`oauth2`)** — MEMORY's "no auth plugin attached" is correct; Kong does not enforce auth, the Django layer does.
- **CI:** `.github/workflows/ci.yml` (327 lines) defines **10 jobs**: `backend-lint`, `frontend-lint`, `sdk-lint`, `backend-test`, `frontend-test`, `sdk-test`, `e2e` (Playwright), `docker-build` (matrix), `docker-push` (GHCR), `staging-deploy`. It genuinely runs the suites (`manage.py test`, `react-scripts test`). `security.yml` adds `trivy` + `codeql` (js+python). So the real pipeline is richer than the "8 jobs" claim.
- **Dockerfiles:** `backend/Dockerfile` uses a venv at `/opt/venv` copied between stages and non-root `appuser` (no perms bug). `frontend/Dockerfile` node→nginx, non-root. Both confirmed by Read.
- **nginx:** `nginx/nginx.conf` (154 lines) is a real reverse proxy: TLS 1.2/1.3, modern ciphers, HSTS, per-zone rate limiting, WS proxying, static caching. `frontend/nginx.conf` (103 lines) adds CSP + more headers inside the image. (Both `nginx/sites-enabled/` and `nginx/ssl/` dirs are empty — certs must be provided at deploy.)
- **Settings hardening** (`settings.py`): DRF default `IsAuthenticated` (default-deny), SimpleJWT 15-min/7-day with rotation+blacklist, production block (SSL redirect, HSTS+preload, secure/httponly cookies, COOP, XFO DENY) gated on `not DEBUG`, `SECRET_KEY` ephemeral fallback, `DEBUG` defaults False.
- **Papers:** JOSS silent on compliance; PLOS `manuscript.md:153` honestly labels "Documented compliance design (SOC 2, 21 CFR Part 11)" as **"Partial"** — no fabricated audit claim.

**Net:** genuinely good headline posture (default-deny API, JWT rotation, prod hardening, real OIDC realm with lockout+strong password policy, real gateway w/ rate limiting, real reverse proxy, real CI w/ tests). The problems are: (1) compliance docs overclaim operational maturity; (2) a **public metrics endpoint returns fabricated hardcoded numbers**; (3) the Prometheus scrape config points at non-functional targets; (4) weak default secrets + host port exposure in compose; (5) a Django-layer password policy weaker than the IdP's.

---

## (b) Findings

### F1 — Public `validation/dashboard/` endpoint returns FABRICATED hardcoded metrics
**Severity: high · Category: fabrication**

`backend/api/v1/views.py:376-402` (`ValidationDashboardView`, routed at `backend/api/v1/urls.py:230` as `validation/dashboard/`):
```python
class ValidationDashboardView(APIView):
    """Provide real-time validation metrics for all calculations"""
    permission_classes = [AllowAny]  # Allow public access ...
    @method_decorator(cache_page(60))
    def get(self, request):
        # This would connect to your validation framework
        metrics = {
            "overall_accuracy": "99.999%",
            "decimal_precision": 50,
            "tests_validated": 127,
            "tests_passed": 125,
            "last_validation": "2025-09-15T10:30:00Z",
            "comparison": {
                "vs_r": {"accuracy": "99.99%", "tests": 50},
                "vs_scipy": {"accuracy": "100%", "tests": 50},
                "vs_statsmodels": {"accuracy": "99.98%", "tests": 27}},}
        return Response(metrics, ...)
```
**Reality:** The docstring says "real-time validation metrics" and the comment admits "This would connect to your validation framework" — but every number is a **hardcoded literal** (99.999% accuracy, 127 tests, fixed 2025-09-15 timestamp, canned vs_R/vs_scipy/vs_statsmodels accuracy). It ignores all inputs and is served **publicly** (`AllowAny`). Any user/auditor hitting this endpoint sees fabricated validation evidence presented as live measurement.
**Doc claim:** `SECURITY_CONTROLS_MATRIX.md` / `SOC2...md` present validation/metrics as real telemetry; `FDA_21_CFR_Part_11.md` leans on validation evidence.
**Recommendation:** Either wire this to the real test/validation framework or remove it; at minimum do not present static literals as "real-time metrics", and reconsider public exposure. This is the single most concerning item in this subsystem because it is a fabricated-evidence surface.

### F2 — Compliance docs mark organizational/process controls (and electronic signatures) "Implemented" with no in-repo backing
**Severity: high · Category: doc_mismatch (integrity)**

Confirmed by full Read of all four docs:
- `compliance/FDA_21_CFR_Part_11.md:626-640` Gap Analysis marks **all 15** Part-11 sections "Implemented", including **11.50/11.70/11.100/11.200 Electronic Signatures** — yet there is **no e-signature subsystem**, and the same doc lists "Digital signature with X.509 certificates" as a **2026-Q4 *planned*** item (`:648-649`), self-contradicting.
- `compliance/SOC2_Type_II_Controls.md:113-119/160-166` mark background checks, security training, STRIDE threat model "Implemented" (evidence = "HR records", "threat model documentation" — none in repo); `:553-558` asserts quarterly DR drills / annual pen tests as routine.
- `compliance/SECURITY_CONTROLS_MATRIX.md:268` "Implemented 78 / 93%", `:277` "OWASP Top 10 ... 100%" — quantified coverage presented as audited fact.

**Reality:** No independent SOC 2 Type II or Part 11 audit occurred; many "controls" are aspirational SOPs. MEMORY's "template-as-audited overclaim" flag is confirmed.
**Recommendation:** Re-frame as readiness/design docs with a per-control taxonomy (Implemented-in-code / Process-only / Planned / N/A); drop blanket "Implemented" and the 93%/100% figures; never list e-signatures as implemented. Mirror the PLOS manuscript's honest "Documented ... Partial" framing.

### F3 — Prometheus scrape config targets a non-existent exposition endpoint and exporter-less services
**Severity: medium · Category: stub_vs_claim**

`monitoring/prometheus.yml` (the one compose mounts, `docker-compose.yml:207`):
- `:28-31` job `stickforstats-backend` scrapes `metrics_path: /api/v1/metrics/` on `backend:8000`. **No such route exists** — `backend/api/v1/urls.py` has `validation/dashboard/`, `audit/metrics/<type>/`, and `health/`, but no `/api/v1/metrics/`. The nearest endpoints return **JSON**, not Prometheus exposition format, so Prometheus cannot parse them.
- `:47-54` scrape `redis:6379` and `postgres:5432` **directly** (no `redis_exporter`/`postgres_exporter` defined in compose), which will not yield Prometheus metrics.
- `:38-40` scrape `frontend:80` for "Nginx metrics" with no nginx exporter.
- `requirements.txt` (92 lines) has **no `django-prometheus`/`prometheus_client`**.

**Doc claim:** `SOC2...md:262` "Prometheus Metrics Collection ... collects metrics"; `SECURITY_CONTROLS_MATRIX.md:193` "Scrapes all service endpoints".
**Reality:** Prometheus/Grafana containers run, but no scrape target actually produces Prometheus metrics. Monitoring is scaffolded, not functional.
**Recommendation:** Add `django-prometheus` + a real `/api/v1/metrics/` exposition view; add the postgres/redis/nginx exporters to compose; or document monitoring as not-yet-wired.

### F4 — `docker-compose.yml` ships weak default secrets for Redis, Django SECRET_KEY, and JWT_SECRET
**Severity: medium · Category: security**

`docker-compose.yml:52` `${REDIS_PASSWORD:-redis_secure_password}`, `:53` `${SECRET_KEY:-change_this_in_production}`, `:61` `${JWT_SECRET:-change_this_jwt_secret}` (repeated for celery/beat at `:152-156`, `:178-180`).
Positive contrast: DB/Grafana/Keycloak admin are fail-closed — `:51,95` `${DB_PASSWORD:?...must be set...}`, `:224` `${GRAFANA_PASSWORD:?...}`, `:272` `${KEYCLOAK_ADMIN_PASSWORD:?...}`. `.env.example` likewise carries placeholders (`your-secret-key-here-change-this`).
**Doc claim:** `SECURITY_CONTROLS_MATRIX.md:88` "Default Credential Prevention"; `DATA_PROCESSING_AGREEMENT.md:306` "No hardcoded credentials".
**Reality:** Omitting these env vars boots with attacker-known SECRET_KEY/JWT_SECRET (session/CSRF/JWT forgery) and a predictable Redis password. The fail-closed pattern is applied inconsistently.
**Recommendation:** Apply `${VAR:?must be set}` to `SECRET_KEY`, `JWT_SECRET`, and `REDIS_PASSWORD`.

### F5 — Postgres/Redis/backend published to host on all interfaces, contradicting "internal-only" compliance claim
**Severity: medium · Category: security**

`docker-compose.yml:48-49` backend `8000`, `:97-98` postgres `5432`, `:128-129` redis `6379` all bind `0.0.0.0` by default.
**Doc claim:** `SOC2...md:248` (CC6.3-02) and `SECURITY_CONTROLS_MATRIX.md:181`: "Backend (8000), PostgreSQL (5432), Redis (6379) accessible **only on Docker network**".
**Reality:** All three are published to the host, directly contradicting the docs. DB still requires its password; Redis is guarded only by the weak default from F4.
**Recommendation:** Bind to `127.0.0.1:` or drop the `ports:` for internal services; reconcile the doc claim.

### F6 — Django password policy (8 chars, no complexity) is weaker than the Keycloak realm policy and the docs imply
**Severity: medium · Category: doc_mismatch**

`settings.py:105-118` — four stock Django validators with no args; `MinimumLengthValidator` defaults to 8 chars, no complexity validator. By contrast, `realm-config.json:21` enforces `length(8) and upperCase(1) and lowerCase(1) and digits(1) and specialChars(1)`. So users authenticating via Django local accounts get a *weaker* policy than SSO users, and weaker than `SECURITY_CONTROLS_MATRIX.md:104` implies.
**Recommendation:** Align Django validators to the IdP policy (min length + complexity), or document the discrepancy and steer enterprise auth through Keycloak.

### F7 — CI Black gate is non-blocking; e2e/sdk-test `continue-on-error`; `staging-deploy` is an echo-only placeholder
**Severity: low · Category: stub_vs_claim**

`ci.yml:37` `black --check --diff . || true` (cannot fail); `:137` sdk-test and `:154` e2e `continue-on-error: true`; `:316-327` `staging-deploy` only `echo`s "Deploy to staging would happen here". Genuinely blocking: flake8 (`:34`), ESLint `--max-warnings 0` (`:58`), ruff (`:76`), backend-test (`:108`), frontend-test (`:132`), docker-build/push (main).
**Doc claim:** `docs/CI_CD_SETUP_2026-02-27.md:4` "all 8 jobs green, lint required"; MEMORY "8 jobs (3 lint + 3 test + 2 docker)".
**Reality:** CI is more capable than documented (tests + Playwright + GHCR push), but Black/e2e/sdk failures can't break the build and staging-deploy does nothing.
**Recommendation:** Make Black blocking after a format pass; implement or clearly label `staging-deploy` as a stub; update CI_CD_SETUP + MEMORY to the real 10-job pipeline.

### F8 — Two divergent `prometheus.yml` files
**Severity: low · Category: quality**

`monitoring/prometheus.yml` (mounted, 54 lines) and `infrastructure/monitoring/prometheus.yml` both exist and are **DIFFERENT** (confirmed). Only `monitoring/` is wired in; `infrastructure/monitoring/` is an orphan that can drift.
**Recommendation:** Keep one source of truth; delete or symlink the orphan.

---

## (c) Claims-vs-reality table

| # | Claim (source) | Reality | Verdict |
|---|----------------|---------|---------|
| 1 | Keycloak OIDC clients only, no SAML (MEMORY) | All 4 clients `protocol: openid-connect`; no SAML client in realm-config.json | **CONFIRMED** |
| 2 | Kong DB-less declarative, no auth plugin attached (MEMORY) | kong.yml DB-less; has rate-limit/CORS/etc but NO key-auth/jwt/oauth2 plugin | **CONFIRMED** |
| 3 | compose has Prometheus+Grafana+Keycloak+Kong (MEMORY Prod Readiness) | All four defined in docker-compose.yml | **CONFIRMED** |
| 4 | CI = 8 jobs (3 lint + 3 test + 2 docker) (MEMORY/CI doc) | 10 jobs incl sdk-lint, e2e, docker-push, staging-deploy | **PARTIAL (undercount)** |
| 5 | CI runs the test suite | backend-test runs manage.py test; frontend-test runs jest | **CONFIRMED** |
| 6 | DRF default permission IsAuthenticated (SOC2/Matrix) | settings.py:148-150 IsAuthenticated | **CONFIRMED** |
| 7 | HSTS/secure cookies/SSL-redirect gated on not DEBUG (MEMORY) | settings.py:336-346 | **CONFIRMED** |
| 8 | "No hardcoded credentials" (DPA/Matrix) | DB/Grafana/Keycloak fail-closed; Redis/SECRET_KEY/JWT weak defaults | **REFUTED (partial)** |
| 9 | Internal services "only on Docker network" (SOC2/Matrix) | backend/postgres/redis published to host | **REFUTED** |
| 10 | Strong password policy (Matrix:104) | Django default 8, no complexity (Keycloak realm IS strong) | **REFUTED (Django) / CONFIRMED (IdP)** |
| 11 | Electronic signatures "Implemented" (FDA gap analysis) | No e-sign subsystem; doc lists X.509 e-sign as 2026-Q4 planned | **REFUTED** |
| 12 | SOC2/Part11 controls broadly "Implemented" | Many are org/process w/o repo artifact; no real audit | **REFUTED (overclaim)** |
| 13 | Prometheus "collects metrics" / "scrapes all endpoints" (SOC2/Matrix) | Scrapes nonexistent /api/v1/metrics/ + exporter-less pg/redis; no prom lib | **REFUTED** |
| 14 | "real-time validation metrics" endpoint | Hardcoded literals (99.999%, 127 tests, fixed date), public AllowAny | **REFUTED (fabricated)** |
| 15 | DB password fail-closed in compose (good) | `${DB_PASSWORD:?...}` | **CONFIRMED** |
| 16 | Papers claim completed SOC2/Part11 audit | PLOS "Documented ... Partial"; JOSS silent | **CONFIRMED (no fabrication)** |
| 17 | nginx reverse proxy w/ TLS termination (docs) | nginx/nginx.conf: TLS1.2/1.3, HSTS, rate-limit, modern ciphers (real) | **CONFIRMED** |

---

## (d) Prioritized recommendations toward "world-class"

1. **(Integrity — do first)** Fix or remove `ValidationDashboardView` — do not serve hardcoded literals as "real-time validation metrics" on a public endpoint (F1). Then re-frame the four compliance docs as readiness/design artifacts with per-control status and no blanket "Implemented"/"93%/100%" or e-signature claims (F2).
2. **Make monitoring real or honest:** add `django-prometheus` + a real `/api/v1/metrics/` exposition view + pg/redis/nginx exporters, or mark monitoring as not-yet-wired; de-dup the two prometheus.yml files (F3, F8).
3. **Close compose secret + exposure gaps:** `${VAR:?must be set}` for SECRET_KEY/JWT_SECRET/REDIS_PASSWORD; bind pg/redis/backend to localhost or drop host ports; reconcile the "only on Docker network" claim (F4, F5).
4. **Align password policy** in Django to the Keycloak realm (min length + complexity) (F6).
5. **Polish CI:** make Black blocking; implement/label `staging-deploy`; correct CI_CD_SETUP + MEMORY to the real 10-job pipeline (F7).
6. **Optional gateway hardening:** Kong currently attaches no auth plugin (by design — Django authenticates). If Kong is meant to be a security boundary, attach `jwt`/`key-auth`; otherwise document explicitly that auth is enforced at the app layer, not the gateway, so the SOC2/Matrix "API gateway authentication" claims aren't over-read.

---

## Honest limitations
An early draft mis-concluded (from corrupted shell output) that keycloak/kong/prometheus/grafana were absent and ci.yml had 2 jobs — that draft is retracted. All findings here rest on direct `Read` of: `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`, `nginx/nginx.conf`, `infrastructure/keycloak/realm-config.json`, `infrastructure/kong/kong.yml`, `monitoring/prometheus.yml`, `.github/workflows/{ci,security}.yml`, all four `compliance/*.md`, `backend/stickforstats/settings.py`, `backend/requirements.txt`, `backend/api/v1/urls.py`, `backend/api/v1/views.py` (ValidationDashboardView), and `.env.example`. The only items I could not fully exercise (whether Prometheus actually fails at runtime, whether `Dockerfile.production` body is correct) are reasoned from config, not executed.
