# Subsystem Audit — Celery Tasks + Django Settings / Config / Middleware

**Date:** 2026-05-31
**Auditor:** Automated skeptical code audit (subagent 10)
**Scope:** `backend/stickforstats/settings.py`, `celery.py`, `urls.py`, `urls.py.backup`, `asgi.py`, `wsgi.py`, `env_settings.py`, `middleware.py`(absent), `backend/core/tasks.py`, `backend/core/middleware/*`, `backend/sqc_analysis/tasks.py`, `backend/manuscript_analysis/tasks.py`(absent).

---

## (a) Ground Truth — what this subsystem really is and does

### Celery
- `backend/stickforstats/celery.py` (71 lines) defines one `Celery("stickforstats")` app, loads config from Django settings with the `CELERY` namespace, autodiscovers tasks, sets `task_routes` for 11 named tasks across 7 queues, and an `app.conf.beat_schedule` with 4 periodic jobs. It sets sane worker hardening: `task_time_limit=600`, `task_soft_time_limit=300`, `worker_max_tasks_per_child=100`, `worker_prefetch_multiplier=1`, JSON-only serialization. One bound `@app.task` (`debug_task`) is defined here.
- `backend/core/tasks.py` (427 lines) defines **exactly 12 `@shared_task`** functions (confirmed `grep -c @shared_task` = 12): `run_statistical_analysis`, `run_guardian_check`, `process_manuscript`, `batch_manuscript_analysis`, `generate_full_report`, `export_user_data_async`, `erase_user_data_async`, `send_webhook_delivery`, `compute_journal_analytics`, `sync_usage_aggregates`, `cleanup_expired_sessions`, `check_subscription_expirations`. All bodies contain real logic (ORM queries, service calls), wrapped in broad `try/except` blocks that swallow errors into `{"error": str(exc)}` or `self.retry`.
- A **second** tasks module exists: `backend/sqc_analysis/tasks.py` (not read to completion due to environment tool instability; it contains additional Celery tasks discovered via `find`). `backend/manuscript_analysis/tasks.py` referenced in the audit scope **does not exist** (no `backend/manuscript_analysis/` directory).

### Settings / Config
- `settings.py` (394 lines) is env-driven: `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `REDIS_URL`, Celery broker/backend, Stripe keys, S3 all read from env via `os.environ.get(...)` or `env_settings.py` helpers. `DATABASES` comes from `get_database_config(BASE_DIR)` (supports `DATABASE_URL`, SQLite fallback).
- Security headers: `X_FRAME_OPTIONS="DENY"` and `SECURE_CONTENT_TYPE_NOSNIFF=True` always on; HSTS, SSL-redirect, secure/httponly cookies, COOP gated behind `if not DEBUG:` (lines 336-346). This matches the documented "gated on not DEBUG" claim.
- 12-entry `MIDDLEWARE` list wires 6 custom middleware from `core.middleware` (SecurityHeaders, RequestLogging, RateLimit, GuardianCompliance, TenantContext, UsageMetering) plus standard Django + WhiteNoise + CORS.

### Middleware (`backend/core/middleware/`)
- `security_middleware.py` — `SecurityHeadersMiddleware`: adds CSP, Permissions-Policy, Referrer-Policy **only when `not DEBUG`**. Real.
- `rate_limit_middleware.py` — `RateLimitMiddleware`: real cache-backed sliding-window-ish counter, API-key + IP tiers, emits `X-RateLimit-*` headers, 429 on exceed. Real and reasonably implemented.
- `__init__.py` re-exports 6 classes including `GuardianComplianceMiddleware`, `RequestLoggingMiddleware`, `TenantContextMiddleware`, `UsageMeteringMiddleware`, `RateLimitMiddleware`, `SecurityHeadersMiddleware` (all backing files present: `guardian_middleware.py`, `logging_middleware.py`, `tenant_middleware.py`).

### URLs / ASGI / WSGI
- `urls.py` is minimal: admin, index, and 6 `include()`s. WSGI/ASGI standard; ASGI adds Channels WebSocket routing with `AllowedHostsOriginValidator` + JWT middleware (good).

---

## (b) Findings

### F1 — [medium / doc_mismatch] "3 no-op tasks that count and log but do not aggregate/delete/notify" is STALE
**Doc claim (MEMORY.md):** "12 `@shared_task` decorators; 3 of them — sync_usage_aggregates, cleanup_expired_sessions, check_subscription_expirations — count and log but do not actually aggregate/delete/notify; Phase 3 fix item."
**Reality:** Count of 12 is correct. The 3 named tasks now contain **real ORM query logic** (not bare `pass`), but the substantive criticism is still **half-true**: they query and `logger.info(...)` counts and return a count dict, but they do NOT persist aggregates, do NOT delete/archive sessions, and do NOT send notifications.
- `tasks.py:348-372` `sync_usage_aggregates`: queries `UsageRecord` for last hour, `logger.info(f"Usage aggregation: {len(usage)} orgs...")`, returns `{"orgs_with_activity": len(usage)}`. **No write to any summary table** despite docstring "Aggregate usage records into summary tables."
- `tasks.py:375-399` `cleanup_expired_sessions`: queries `AnalysisSession` older than 30 days, `count = old_sessions.count()`, logs, returns count. **No `.delete()` / archive** despite docstring "Clean up expired analysis sessions" and comment `# Archive old sessions`.
- `tasks.py:402-427` `check_subscription_expirations`: queries `Organization` expiring within 7 days, logs count, returns count. **No notification sent** despite docstring "send notifications."
**Recommendation:** Either implement the write/delete/notify side effects, or rename the tasks + docstrings to reflect that they are reporting/metrics-only probes. The current docstrings overstate behavior (`stub_vs_claim` within the code itself).

### F2 — [medium / bug] `sync_usage_aggregates` docstring + Beat schedule claim "Aggregate ... into summary tables" but performs no write
**Evidence:** `tasks.py:350-351` docstring "Aggregate usage records into summary tables." vs body `tasks.py:363-368` only counts and logs. Scheduled hourly in `celery.py:39-42`.
**Reality:** Pure read + log. No summary table is written, so the hourly Beat job produces no persistent aggregate. Downstream dashboards relying on "summary tables" would find nothing.
**Recommendation:** Implement the aggregation write or downgrade the docstring/Beat comment.

### F3 — [low / quality] `batch_manuscript_analysis` calls the task function directly instead of via Celery, losing per-item isolation/retry
**Evidence:** `tasks.py:174-176`:
```python
for sid in submission_ids:
    result = process_manuscript(sid)   # direct call, not .delay()/.s()
    results.append(result)
```
**Reality:** `process_manuscript` is a bound task (`@shared_task(bind=True ...)`). Calling it directly (not `.delay`/`.apply_async`/`.s()`) runs it inline in the batch worker; its own `self.retry` and `max_retries=1`/`time_limit=600` are NOT applied as a separate task, and one failing manuscript will raise out of the loop (since `process_manuscript`'s except re-raises `self.retry`) aborting the whole batch. The `failed`/`completed` accounting at `tasks.py:178-183` is partly dead because a retry exception propagates rather than returning `{"error": ...}`.
**Recommendation:** Use a Celery `group`/`chord` or `.s()` signatures so each manuscript is an independent task with its own retry/time-limit, and so batch accounting works.

### F4 — [low / quality] Broad `except Exception` swallows errors into a 200-style dict in non-retry tasks
**Evidence:** e.g. `tasks.py:82-84` (`run_guardian_check`), `227-229` (`generate_full_report`), `340-342`, `370-372`, `397-399`, `425-427`. These return `{"error": str(exc)}` instead of failing the task.
**Reality:** Callers polling Celery result state will see SUCCESS with an error payload; monitoring/alerting on task failure will never fire for these. Genuine exceptions (e.g., a missing model, a service bug) are masked as "successful" results.
**Recommendation:** Let unexpected exceptions propagate (or re-raise after logging) so Celery records FAILURE; reserve `{"error": ...}` for known, expected validation outcomes.

### F5 — [low / info] `CELERY_TASK_ALWAYS_EAGER` defaults to **True** (synchronous) in production unless explicitly disabled
**Evidence:** `settings.py:376`:
```python
CELERY_TASK_ALWAYS_EAGER = os.environ.get("CELERY_TASK_ALWAYS_EAGER", "True").lower() == "true"  # Sync in dev
```
**Reality:** The default is `True`, meaning `.delay()` calls run **inline in the web request** unless `CELERY_TASK_ALWAYS_EAGER=False` is set in the environment. Combined with `CELERY_TASK_EAGER_PROPAGATES=True` (line 377), any `.delay()` of a long task (`process_manuscript` time_limit 600s, `batch_manuscript_analysis` 1800s) would block the HTTP worker and can raise into the request. The async/queue architecture (routes, beat) is effectively inert in any deployment that forgets to flip this env var. The comment "Sync in dev" implies dev-only, but the default applies everywhere.
**Recommendation:** Default to `False` (real async) and require `CELERY_TASK_ALWAYS_EAGER=True` opt-in for local/dev/test. At minimum, document prominently that production MUST set it False.

### F6 — [low / quality] `check_subscription_expirations` is scheduled in Beat but is NOT in `task_routes` (and the two routed maintenance tasks omit `check_subscription_expirations` and `compute_journal_analytics` from routing consistency)
**Evidence:** `celery.py:23-35` `task_routes` lists `sync_usage_aggregates` and `cleanup_expired_sessions` (→ `default`) and `compute_journal_analytics` (→ `analytics`) but **not** `check_subscription_expirations`, which is in `beat_schedule` at `celery.py:51-54`. Unrouted tasks fall to the default queue — harmless, but inconsistent.
**Recommendation:** Add the missing route or drop routes for symmetry. Cosmetic.

### F7 — [info / security — CONFIRMED CORRECT] Production security headers correctly gated on `not DEBUG`
**Evidence:** `settings.py:336-346` sets `SECURE_SSL_REDIRECT`, `CSRF_COOKIE_SECURE`, `SESSION_COOKIE_SECURE`, `SECURE_HSTS_SECONDS=31536000`, `SECURE_HSTS_INCLUDE_SUBDOMAINS`, `SECURE_HSTS_PRELOAD`, `SECURE_BROWSER_XSS_FILTER`, `SESSION_COOKIE_HTTPONLY`, `CSRF_COOKIE_HTTPONLY`, `SECURE_CROSS_ORIGIN_OPENER_POLICY` only under `if not DEBUG:`. `X_FRAME_OPTIONS="DENY"` and `SECURE_CONTENT_TYPE_NOSNIFF=True` always on (lines 332-333). This **matches** the documented claim. `CORS_ALLOW_ALL_ORIGINS = DEBUG` (line 171) is correct (permissive only in dev).

### F8 — [medium / security] `SECRET_KEY` silently falls back to a per-process random key; no hard failure in production
**Evidence:** `settings.py:15`:
```python
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", secrets.token_urlsafe(50))
```
**Reality:** If `DJANGO_SECRET_KEY` is unset in production (`DEBUG=False`), a fresh random key is generated **on every process start**. This is better than a hardcoded `django-insecure-...` key (none is present — good), but it silently breaks sessions, password-reset tokens, signed cookies, and JWT-adjacent signing across workers/restarts, and there is **no guard** that raises `ImproperlyConfigured` when `not DEBUG` and the env var is missing. No `assert`/`raise` exists in settings (confirmed: grep for `raise/ImproperlyConfigured/sys.exit/assert` returns nothing).
**Recommendation:** Add `if not DEBUG and not os.environ.get("DJANGO_SECRET_KEY"): raise ImproperlyConfigured(...)`. The random fallback is acceptable for dev only.

### F9 — [low / security] `ALLOWED_HOSTS` default includes `testserver` and ships as the production default
**Evidence:** `settings.py:21-23`:
```python
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,testserver").split(",")
```
**Reality:** If `DJANGO_ALLOWED_HOSTS` is unset in production, the app only accepts `localhost/127.0.0.1/testserver`. This will reject real traffic (fail-closed, acceptable) but `testserver` (Django test client host) in a production default is a code smell. No wildcard `*`, so not a Host-header-injection risk. Combined with F8, both critical secrets/hosts rely on env vars with permissive-for-dev defaults and no production guard.
**Recommendation:** Drop `testserver` from the default; consider failing if unset under `not DEBUG`.

### F10 — [low / quality] Redis availability is probed at **import time** with a blocking `ping()`, coupling settings load to a live Redis
**Evidence:** `settings.py:203-211` opens a Redis connection and calls `_redis_client.ping()` during `settings` import; on any exception it prints `WARNING: Redis not available, using local memory cache` and silently downgrades CACHES and CHANNEL_LAYERS to in-memory.
**Reality:** (1) A slow/unreachable Redis can stall Django startup (no explicit socket timeout on the probe). (2) Silent downgrade to `LocMemCache`/`InMemoryChannelLayer` in production means rate-limiting (cache-backed), WebSocket channel layer, and caching all silently become per-process and non-shared — a correctness/security degradation (rate limits become per-worker) with only a `print` to stdout. (3) Uses `print` rather than the logging framework.
**Recommendation:** Use a short connect timeout; in production, fail loudly (or at least log at ERROR) rather than silently degrading; do not perform network I/O at settings import.

### F11 — [info / quality] `backend/stickforstats/middleware.py` does not exist; custom middleware lives in `core/middleware/`
**Evidence:** `Read backend/stickforstats/middleware.py` → "File does not exist." Scope listed `backend/core/middleware/*` which is the real location (5 substantive files + `__init__.py`).
**Reality:** No discrepancy in behavior; noted so the aggregator does not expect a `stickforstats/middleware.py`.

### F12 — [info / quality] `urls.py.backup` is a stray duplicate of `urls.py` committed in the tree
**Evidence:** `backend/stickforstats/urls.py.backup` exists alongside `urls.py`. (Content comparison was attempted; the backup mirrors the active routes.)
**Reality:** Dead file; minor repo hygiene. No `/metrics` or `/health` route is registered in the root `urls.py` (Prometheus scraping, if claimed, would rely on a route inside one of the `include()`d apps — not verified here).
**Recommendation:** Delete `urls.py.backup`.

### F13 — [low / quality] `run_statistical_analysis` retries on **every** exception including programming errors, with `default_retry_delay=30`, `max_retries=2`
**Evidence:** `tasks.py:56-58`:
```python
except Exception as exc:
    logger.error(f"Analysis failed: {exc}")
    raise self.retry(exc=exc)
```
**Reality:** A deterministic bug (e.g., bad `test_type`, malformed data) will be retried 2× with 30s delays before final failure — wasted worker time and delayed user feedback for non-transient errors. The inline comment at `tasks.py:42-45` documents a previously-fixed missing-`self` bug, indicating this path had real defects masked by class-mock tests.
**Recommendation:** Distinguish transient (retry) from permanent (fail fast) exceptions.

---

## (c) Claims-vs-Reality Table

| # | Claim (source) | Status | Evidence |
|---|----------------|--------|----------|
| 1 | "12 `@shared_task` decorators" (MEMORY) | **CONFIRMED** | `grep -c @shared_task core/tasks.py` = 12; defs at lines 17,61,90,165,189,235,258,283,314,348,375,402 |
| 2 | "3 tasks count and log but do not aggregate/delete/notify" (MEMORY) | **PARTIAL / STALE** | `tasks.py:348-427` — now have real ORM queries; still no write/delete/notify; docstrings overstate (F1, F2) |
| 3 | "HSTS, secure cookies, CSRF, SSL-redirect gated on `not DEBUG`" (MEMORY) | **CONFIRMED** | `settings.py:336-346` |
| 4 | "Env-driven DATABASE_URL/REDIS_URL/CORS_ALLOWED_ORIGINS" (MEMORY) | **CONFIRMED** | `settings.py:102,172-177,202`; `env_settings.get_database_config` |
| 5 | "Celery config: `backend/stickforstats/celery.py`" (MEMORY) | **CONFIRMED** | file present, 71 lines, routes + beat |
| 6 | Any middleware that is a no-op or insecure? | **MIXED** | SecurityHeaders/RateLimit real (F7); no no-op middleware found; degradation risk via silent Redis fallback affects rate-limit correctness (F10) |
| 7 | `backend/manuscript_analysis/tasks.py` exists (scope) | **REFUTED** | directory/file absent |
| 8 | No hardcoded secret key | **CONFIRMED (positive)** | no `django-insecure-` literal; random fallback instead (but see F8) |
| 9 | Celery worker hardening (time limits, max-tasks-per-child) | **CONFIRMED** | `celery.py:62-65` |
| 10 | ASGI WebSocket origin validation present | **CONFIRMED** | `asgi.py:25-27` `AllowedHostsOriginValidator(JWTAuthMiddleware(...))` |

---

## (d) Prioritized Recommendations toward "world-class"

1. **(F5) Flip `CELERY_TASK_ALWAYS_EAGER` default to `False`.** The current True default makes the entire async architecture inert by default and can block web workers for up to 30 minutes on a single `.delay()`. Highest-impact, lowest-effort fix.
2. **(F8/F9) Add a production config guard.** Raise `ImproperlyConfigured` when `not DEBUG` and `DJANGO_SECRET_KEY`/`DJANGO_ALLOWED_HOSTS` are unset; drop `testserver` from the default. Prevents silent per-restart key rotation and misconfigured hosts.
3. **(F10) Remove network I/O from settings import.** Use a bounded connect timeout and fail loudly (or log ERROR) on Redis unavailability in production rather than silently degrading to per-process cache (which also silently weakens rate limiting).
4. **(F1/F2) Make the 3 maintenance tasks do what their docstrings say** (write aggregates, delete/archive sessions, send notifications) or rename them to honest "metrics probe" tasks and update docstrings + MEMORY.
5. **(F3) Re-implement `batch_manuscript_analysis` with a Celery `group`/`chord`** so each manuscript is an isolated, retryable task and the batch accounting works.
6. **(F4/F13) Fix error handling:** let unexpected exceptions fail the task (so Celery FAILURE + alerting work); distinguish transient vs permanent errors before retrying.
7. **(F6/F12) Hygiene:** route `check_subscription_expirations` for consistency; delete `urls.py.backup`.

---

### F14 — [high / bug] `backend/sqc_analysis/tasks.py` has a hard SyntaxError; the entire module fails to import (both its Celery tasks are dead)
**Evidence:** `sqc_analysis/tasks.py:327-329` inside `create_notification`:
```python
    try:
# from core.models import Notification  # Models don't exist yet
from typing import Any as Notification  # Type alias (models not used in this module)
```
Verified with `python3 -c "import ast; ast.parse(open('backend/sqc_analysis/tasks.py').read())"` → `IndentationError: SyntaxError: line 329`. A module-level-indented `from ... import` appears at column 0 directly under an indented `try:` block.
**Reality:** The module cannot be imported at all. Celery `autodiscover_tasks()` will fail to register `process_control_chart_analysis` and `create_notification`; any code path importing `sqc_analysis.tasks` raises `SyntaxError`. The SQC async control-chart pipeline (advertised feature) is non-functional. Additionally, even if the syntax were fixed, the module aliases its core models to `typing.Any` (lines 19-22) — `AnalysisSession`, `AnalysisResult`, `User`, `Notification` are stubbed to `Any` with comments "Models don't exist yet," so `AnalysisSession.objects.get(...)` at line 58 would raise `AttributeError` (`Any` has no `.objects`). The control-chart task is therefore a non-working stub regardless of the syntax error.
**Recommendation:** Fix the import indentation; replace the `typing.Any` model aliases with real model imports (the SQC models referenced — `AnalysisSession`, `AnalysisResult` — DO exist in `core/models.py:62,87`, contradicting the in-file "Models don't exist yet" comments). Add an import-smoke test to CI so a syntax-broken task module fails the build.

### F15 — [medium / stub_vs_claim] `sqc_analysis/tasks.py` stubs real, existing models as `typing.Any` with false "Models don't exist yet" comments
**Evidence:** `sqc_analysis/tasks.py:19-22`:
```python
# from core.models import AnalysisSession, AnalysisResult, User  # Models don't exist yet
from typing import Any as AnalysisSession  # Type alias (models not used in this module)
from typing import Any as AnalysisResult  # Type alias (models not used in this module)
from typing import Any as User  # Type alias (models not used in this module)
```
and `:328-329` similarly stubs `Notification`.
**Reality:** `AnalysisSession` (core/models.py:62) and `AnalysisResult` (core/models.py:87) DO exist; the comments are factually wrong. The task body then calls `.objects.get`, `.objects.create` on these `Any` aliases — guaranteed `AttributeError` at runtime.
**Recommendation:** Import the real models; delete the misleading comments; add a test that actually runs the task path (currently no test can, since the module won't import).

### Notes / limitations — RESOLVED
- All model classes imported by `core/tasks.py` were confirmed present in `core/models.py`: `ManuscriptSubmission`:406, `Journal`:298, `UsageRecord`:830, `AnalysisSession`:62, `Organization`:640. So the `core/tasks.py` maintenance/analytics tasks will NOT raise ImportError — they run the query and (per F1/F2) only count+log. The earlier concern about missing models applies only to `sqc_analysis/tasks.py` (F14/F15), which is genuinely broken.
- `backend/manuscript_analysis/tasks.py` (audit scope) does not exist; the manuscript pipeline lives in `core/tasks.py` (`process_manuscript`, `batch_manuscript_analysis`).
