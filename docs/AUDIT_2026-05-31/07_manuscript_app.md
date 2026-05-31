# Audit 07 — "manuscript_analysis Django app" subsystem

Date: 2026-05-31
Auditor: senior code auditor (skeptical, code-over-docs)
Scope as assigned: `backend/manuscript_analysis/*` (all .py: models, views (~1664 lines), serializers, urls, tasks, services, apps, admin, migrations).

---

## (a) Ground truth — what this subsystem really is

**The assigned scope path does not exist.** There is **no `backend/manuscript_analysis/` Django app** anywhere in the repository (`find . -type d -name manuscript_analysis` returns nothing; the only matches for `*manuscript*` are `backend/core/manuscript` and `frontend/src/components/manuscript`). No markdown doc, MEMORY.md, or paper references a `manuscript_analysis` app (grep for `manuscript_analysis` in `*.md` → 0 hits). The scope premise — a separate Django app with "~1664-line views" and its own models/serializers/urls/tasks/apps/admin/migrations — is **factually wrong**.

What actually exists for manuscript review (Pillar 2 / Journal Integration):

1. **`backend/core/manuscript/`** — a **Python package (NOT a Django app)**. It contains pure logic modules only; there is **no** `models.py`, `serializers.py`, `views.py`, `urls.py`, `tasks.py`, `apps.py`, `admin.py`, or `migrations/` inside it. Files (all real, substantive):
   - `parser.py` (1056 LOC) — PDF/LaTeX/DOCX parsing into sections (39 def/regex hits)
   - `claim_extractor.py` (1156 LOC) — regex-based statistical-claim extraction (43 def/regex hits)
   - `consistency_validator.py` (748 LOC) — STATCHECK-style p-value recomputation
   - `manuscript_guardian.py` (860 LOC) — orchestrator; delegates SQS to external `SQSScorer`
   - `advanced_validators.py` (1751 LOC) — **7** validator classes (lines 99, 346, 488, 688, 863, 1088, 1406) + `ALL_VALIDATORS` (1684) + `run_all_validators` (1695)
   - `discipline_profiles.py` (1979 LOC) — discipline checklists; exports `get_profile` (1735), `get_all_profiles` (1703), `list_profiles` (1708), `evaluate_checklist` (1762)
   - `__init__.py` (0 LOC)

2. **`backend/api/v1/manuscript_views.py`** (599 lines, **NOT 1664**) — the **real, wired DRF endpoints**. 6 `APIView` classes: `ManuscriptAnalyzeView` (65), `ManuscriptParseView` (154), `ClaimExtractionView` (220), `ConsistencyCheckView` (291), `SubmissionReportView` (373), `JournalSubmitView` (429).

3. **`backend/api/v1/batch_views.py`** (349 lines) — `BatchSubmitView` (57), `BatchStatusView` (269). **Fully synchronous**: `BatchSubmitView.post` runs `ManuscriptGuardian().review()` inline in a loop (no Celery, no `.delay()`, no `from core.tasks` import). Batch membership is tracked by stuffing `{batch_id, batch_index, batch_total}` into each `ManuscriptSubmission.parse_result` JSON (line 148-152). There is **no** `BatchSubmission` model row in this path; `BatchStatusView` reconstructs status by querying `parse_result__batch_id` (line 296-298).

4. **`backend/core/tasks.py`** — `process_manuscript` (line 91, single `@shared_task(bind=True, max_retries=1, time_limit=600)` at line 90) and `batch_manuscript_analysis` (line 166, `@shared_task(bind=True, time_limit=1800)`). **Neither is wired to the HTTP path** (the views do their work synchronously inline). The celery batch task calls `process_manuscript(sid)` as a plain function in a loop (line 175).

5. **Models** live in `backend/core/models.py`: `ManuscriptSubmission`, `Journal`, `JournalAPIKey` (class at line 360), `ReviewReport` — migration `core/migrations/0004_journal_manuscriptsubmission_journalapikey_and_more.py`.

**Wiring:** `stickforstats/urls.py` → `path("api/v1/", include("api.v1.urls"))` → `api/v1/urls.py` lines 369-382 register all 8 manuscript/journal routes. `INSTALLED_APPS` (settings.py:26-50) contains `core.apps.CoreConfig` but no manuscript-specific app.

**Verdict on the assigned questions:**
- "Separate Django app?" → **No such app exists.**
- "Duplicate/competing implementation?" → The MEMORY-named `core/services/{manuscript_parser,statistical_claim_extractor,consistency_validator}.py` files **do not exist** (all MISSING). The single live implementation is `core/manuscript/`. So the only "duplication" is that MEMORY documents phantom files.
- "1664-line views real or scaffolding?" → The real wired views file is **599 lines**, and the endpoints are **real** (full parse→extract→validate→score pipeline with DB persistence).
- "Celery tasks real?" → The functions exist but are **orphaned from the HTTP path** and contain a real defect (double-decorator, F3).

---

## (b) Findings

### F1 — [medium] Assigned audit scope (`backend/manuscript_analysis/`) does not exist; MEMORY names three nonexistent `core/services/*` files as canonical
- Evidence: `find . -type d -name manuscript_analysis` → none. For the MEMORY-named services: `test -f core/services/manuscript_parser.py` → MISSING; `statistical_claim_extractor.py` → MISSING; `consistency_validator.py` → MISSING. The wired code imports from `core/manuscript/` instead (`api/v1/manuscript_views.py:28-31`).
- Doc claim: MEMORY Pillar 2: "Parsing: `backend/core/services/manuscript_parser.py`", "Claims: `…/statistical_claim_extractor.py`", "Validation: `…/consistency_validator.py`".
- Reality: Those three files do not exist on disk. The real modules are `core/manuscript/parser.py`, `core/manuscript/claim_extractor.py`, `core/manuscript/consistency_validator.py`.
- Recommendation: Correct MEMORY/docs to reference `core/manuscript/*`. Correct the audit scope.

### F2 — [medium] Orphaned Celery `batch_manuscript_analysis` calls a `bind=True` task as a plain function, misrouting its argument
- Evidence: `process_manuscript` has a single decorator — `core/tasks.py:90` `@shared_task(bind=True, max_retries=1, time_limit=600)` over `def process_manuscript(self, submission_id):` (line 91). `batch_manuscript_analysis` (`tasks.py:166-183`) then does `result = process_manuscript(sid)` (line 175) — calling a `bind=True` task object *as a plain callable*, so `sid` lands in the **`self`** parameter and `submission_id` is never supplied. (Note: there is **no** double-`@shared_task`; an earlier hypothesis to that effect was refuted by re-reading lines 88-91.)
- Reality: Both code paths are currently unreachable from HTTP (the views are synchronous), so this latent bug does not affect users today. If `batch_manuscript_analysis` were ever dispatched, the in-process loop would mis-bind `sid` to `self` and fail to load the intended submission.
- Recommendation: Have `batch_manuscript_analysis` call `process_manuscript.run(submission_id=sid)` (or refactor the body into a plain helper that both the task and the batch loop call). Add a unit test that actually invokes the batch task end-to-end.

### F3 — [medium] Celery manuscript tasks are dead relative to the HTTP API (no view dispatches them)
- Evidence: `grep "from core.tasks|.delay|apply_async|process_manuscript|batch_manuscript_analysis"` in `api/v1/batch_views.py` and `api/v1/manuscript_views.py` → 0 hits. `BatchSubmitView.post` (`batch_views.py:155-159`) runs `ManuscriptGuardian(...).review(...)` synchronously inside the request. `process_manuscript`/`batch_manuscript_analysis` are only referenced by `core/tests/test_celery_tasks.py` and `stickforstats/celery.py` routing config.
- Reality: The "async" manuscript pipeline advertised by the task names is not exercised by any endpoint; all manuscript review is synchronous and request-blocking. Large/slow PDFs will tie up a gunicorn worker for the full parse+score duration.
- Recommendation: Either wire `BatchSubmitView` to enqueue `process_manuscript.delay(...)` and report progress via the existing `parse_result__batch_id` query, or delete the unused tasks to avoid the impression of an async pipeline that isn't used.

### F4 — [medium] IDOR: `SubmissionReportView` (no auth) and `BatchStatusView` (no auth) do not scope reads by owner
- Evidence: `manuscript_views.py:386` `permission_classes = [AllowAny]`; `:396` `ManuscriptSubmission.objects.get(id=submission_id)` with no user/journal filter. `batch_views.py:285` `permission_classes = [AllowAny]`; `:296-298` `ManuscriptSubmission.objects.filter(parse_result__batch_id=batch_id)` with no owner filter.
- Reality: Any caller who knows (or guesses) a submission UUID can read the full review (title, authors, SQS, all consistency results) via `GET /api/v1/manuscript/report/<uuid>/` with **no authentication**. Same for batch results by `batch_id`. Access control is by UUID-obscurity only. Submitted manuscripts can be confidential pre-publication research, so this is a real confidentiality gap.
- Recommendation: Require authentication on both views and scope queries to the requesting user/journal (404 on mismatch).

### F5 — [low] Public unauthenticated upload endpoints have no per-view file-size guard
- Evidence: `manuscript_views.py:80,166,232,304` and `batch_views.py:78,285` all `permission_classes = [AllowAny]`; no `DATA_UPLOAD_MAX_MEMORY_SIZE`/`FILE_UPLOAD_MAX_MEMORY_SIZE` override in `settings.py` (grep → 0 hits); `.size` is only used to populate `file_size_bytes` (manuscript_views.py:111,486; batch_views.py:145), never checked. Batch accepts up to `MAX_BATCH_SIZE = 10` files (batch_views.py:39).
- Reality: Unauthenticated callers can submit up to 10 arbitrarily large/complex PDFs per request, each parsed synchronously (compounding F3). Mitigated by global `RateLimitMiddleware` (settings.py:67-68) and Django's default 2.5 MB request-body cap, so this is hardening rather than an open hole.
- Recommendation: Add an explicit max-file-size check in `_get_file_and_type`/`_detect_file_type` and document the public/unauthenticated nature of these endpoints.

### F6 — [info] Inconsistent `MODELS_AVAILABLE` defensive guard
- Evidence: `manuscript_views.py:33-38` wraps `from core.models import ManuscriptSubmission, ReviewReport` in try/except (sets `MODELS_AVAILABLE`); `batch_views.py:29-34` does the same for `ManuscriptSubmission`. The models always exist (migration 0004 + live defs), so the guard and its `501 NOT_IMPLEMENTED` branches are dead code.
- Recommendation: Drop the `MODELS_AVAILABLE` guard — models are a hard dependency of this code.

---

## (c) Claims-vs-reality table

| # | Claim (source) | Status | Reality / evidence |
|---|----------------|--------|--------------------|
| 1 | "manuscript_analysis Django app exists" (audit scope) | REFUTED | No such dir; only `core/manuscript` (a package) |
| 2 | "views are ~1664 lines" (audit scope) | REFUTED | `api/v1/manuscript_views.py` = 599 lines |
| 3 | "separate app with models/serializers/tasks/apps/admin/migrations" | REFUTED | `core/manuscript/` has none of these; models in `core/models.py`, views in `api/v1/` |
| 4 | Parsing = `core/services/manuscript_parser.py` (MEMORY) | REFUTED | File MISSING; wired import is `core/manuscript/parser.py` |
| 5 | Claims = `core/services/statistical_claim_extractor.py` (MEMORY) | REFUTED | File MISSING; wired import is `core/manuscript/claim_extractor.py` |
| 6 | Validation = `core/services/consistency_validator.py` (MEMORY) | REFUTED | File MISSING; wired import is `core/manuscript/consistency_validator.py` |
| 7 | "STATCHECK-style consistency validator" | CONFIRMED | header cites Nuijten 2016 (consistency_validator.py:1-17); recompute formulas correct |
| 8 | "7 manuscript validators" (MEMORY) | CONFIRMED | 7 validator classes + `ALL_VALIDATORS` + `run_all_validators` in advanced_validators.py |
| 9 | Celery `batch_manuscript_analysis` is real | PARTIAL | Exists (tasks.py:166) but orphaned from HTTP path; calls `bind=True` `process_manuscript(sid)` as a plain function, misrouting the arg (F2) |
| 10 | Journal API-key auth is real | CONFIRMED | `JournalSubmitView._authenticate_journal` (manuscript_views.py:574-599) + `verify_key` using `hmac.compare_digest` (models.py:400-403) |
| 11 | No separate `webhook_views.py`; inline API-key auth at manuscript_views.py:574-599 (MEMORY) | CONFIRMED | Exactly as described |
| 12 | API keys hashed & compared in constant time | CONFIRMED | `generate_key` SHA-256 (models.py:393-398); `verify_key` uses `hmac.compare_digest` (models.py:403) |

---

## Statistical correctness — verified

The wired `core/manuscript/consistency_validator.py` recomputation formulas are all **correct**:
- t-test: `2 * t.sf(|t|, df)` (two-sided) — `_recompute_t_test` (line 333, formula at 352)
- F-test: `f.sf(F, df1, df2)` (upper tail) — `_recompute_f_test` (line 358, formula at 381)
- chi-square: `chi2.sf(x, df)` (upper tail) — `_recompute_chi_square` (line 387, formula at 412)
- z-test: `2 * norm.sf(|z|)` (two-sided) — `_recompute_z_test` (line 418, formula at 429)
- correlation: `t = r·√(df/(1−r²))`, df = n−2, then `2 * t.sf(|t|, df)` — `_recompute_correlation` (line 435, formula at 479-480)

Severity classification (`_determine_severity`, line ~559): `gross_error` when discrepancy ≥ 0.05 **and** the significance decision flips; `major` when decision flips or 0.02 ≤ discrepancy < 0.05; `minor` for 0.005 ≤ discrepancy < 0.02 — consistent with statcheck conventions.

**Consistency rate is computed honestly:** `_build_summary` (lines ~675-718) sets `could_not_check = sum(r.computed_p is None)`, `checked = total - could_not_check`, `consistent = sum(computed_p is not None and is_consistent)`, and `consistency_rate = consistent / checked` (not over the total). Un-checkable claims are therefore **excluded** from the denominator, not counted as consistent. (`_skip_result` sets `is_consistent=False`, `computed_p=None`, so it cannot inflate the rate.) No statistical or denominator error found. SQS itself is produced by an external `SQSScorer.analyze` (`core/sqs_scoring.py`), called with graceful fallback at `manuscript_guardian.py:436-443`; SQS internals are out of this subsystem's scope.

---

## (d) Prioritized recommendations toward "world-class"

1. **Fix the plain-function call of the `bind=True` task in `batch_manuscript_analysis` (F2)** — a concrete latent bug; small fix; add a task-invocation unit test.
2. **Close the IDOR gaps (F4)** — require auth and owner-scope `SubmissionReportView` and `BatchStatusView`; submitted manuscripts are confidential.
3. **Decide async vs sync and align (F3)** — either wire `BatchSubmitView` to the Celery task (recommended for large PDFs) or delete the orphaned tasks; today the API is fully synchronous and request-blocking.
4. **Correct MEMORY/docs (F1)** — the three `core/services/*` manuscript files it names do not exist; point at `core/manuscript/`.
5. **Hardening:** explicit upload-size cap on the public endpoints (F5); drop the dead `MODELS_AVAILABLE` guard (F6).
