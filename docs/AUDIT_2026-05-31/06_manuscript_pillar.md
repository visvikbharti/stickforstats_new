# Audit Report — Journal Integration Platform (Pillar 2 / core.manuscript)

**Date:** 2026-05-31
**Auditor:** Senior audit subagent (statistics / security / SWE)
**Repo root:** /Users/vishalbharti/StickForStats_v1.0_Production
**Scope:** `backend/core/manuscript/{parser,claim_extractor,consistency_validator,advanced_validators,discipline_profiles,manuscript_guardian}.py` and `backend/api/v1/{manuscript_views,journal_analytics_views,batch_views}.py`

---

## Coverage note

Read in full or substantially: `manuscript_views.py` (599 ln), `claim_extractor.py` (1,157 ln),
`consistency_validator.py` (749 ln), `batch_views.py` (350 ln), `journal_analytics_views.py` (241 ln),
`advanced_validators.py` (all 7 validator classes + `ALL_VALIDATORS` + `run_all_validators`),
`discipline_profiles.py` (dataclasses, all 8 `*_PROFILE` definitions, `ALL_PROFILES` registry,
`get_profile`, `checklist_summary`, `apply_discipline_weights`), `manuscript_guardian.py`
(orchestration pipeline). The statcheck recomputation math was **independently verified with scipy**.
Partial: `parser.py` (header + view-layer dispatch only), the body of `evaluate_checklist`
(a Read render returned garbled text — flagged below, not asserted as a bug). The intermittent
tool channel forced multiple retries but the substantive code above was obtained cleanly.

---

## (a) Ground Truth — what this subsystem actually is

A Django-REST automated **manuscript statistical-quality review pipeline**. It is real, substantive
code — not a stub. Pipeline orchestrated by `ManuscriptGuardian.review()`
(`manuscript_guardian.py`): parse → extract claims (regex) → consistency-recompute (scipy) →
7 advanced validators → discipline checklist → optional SQS scoring → assemble tiered findings.

- **Claim extraction** (`claim_extractor.py`) is **regex/heuristic**, NOT LLM-based. ~20 compiled
  APA-style patterns (t, F, χ², r, ρ, z, β/B, R², OR, HR, CI, Cohen's d, η², ω², Hedges' g, Glass's Δ,
  N, standalone p, ns). Standalone fragments are merged into the nearest primary claim within a
  300-char window (`_merge_claims`, `claim_extractor.py:1010-1108`). A completeness-based
  `_score_confidence` rubric (`:1123-1156`) is genuine.
- **Consistency validator** (`consistency_validator.py`) is a faithful **statcheck** implementation:
  t → `2*t.sf(|t|,df)`, F → `f.sf(F,df1,df2)`, χ² → `chi2.sf`, z → `2*norm.sf(|z|)`,
  r → r-to-t then `2*t.sf`. All formulas verified correct against scipy. Severity tiers
  (none/minor/major/gross_error) and decision-consistency at α follow Nuijten et al. (2016).
- **7 advanced validators** (`advanced_validators.py`) all exist and have real logic; `ALL_VALIDATORS`
  (`:1684-1692`) lists exactly 7 classes; `run_all_validators` (`:1695`) executes them with per-
  validator try/except and severity-ordered output.
- **8 discipline profiles** (`discipline_profiles.py`) all exist and are substantive: 67 total
  `ChecklistItem(` instances across CONSORT, STROBE, JARS-Quant, ECONOMICS, EDUCATION,
  CLINICAL_TRIAL, SOCIAL_SCIENCE, ICH_E9 — each item carries a real regex detection pattern,
  required flag, section hint, category, and guideline citation. `ALL_PROFILES` (`:1744-1753`)
  registers all 8; `_FIELD_TO_PROFILE` maps journal fields/aliases to them.
- **Persistence** is optional/import-guarded (`MODELS_AVAILABLE`) in all view modules.
- **Auth:** Only `JournalSubmitView` and `BatchSubmitView` do API-key auth. Every other endpoint —
  including report retrieval and the full journal analytics dashboard — is `AllowAny`.

## (b) Findings

### F1 — All public manuscript + analytics endpoints are unauthenticated; report/analytics leak by UUID or slug — HIGH (security)
`AllowAny` on: `ManuscriptAnalyzeView` (`manuscript_views.py:80`), `ManuscriptParseView` (`:166`),
`ClaimExtractionView` (`:232`), `ConsistencyCheckView` (`:304`), `SubmissionReportView` (`:386`),
`BatchStatusView` (`batch_views.py:285`), and all four journal-analytics views
(`journal_analytics_views.py:27, 85, 143, 191`).
`SubmissionReportView.get` (`manuscript_views.py:388-426`) returns full report content for any
`submission_id` UUID with **no ownership check**. `BatchStatusView.get`
(`batch_views.py:287-348`) returns every submission in a batch for any `batch_id` UUID.
`JournalAnalyticsOverviewView` (and Issues/Trends/Comparison) return a journal's aggregate
submission stats, SQS distribution, and trends for any `?journal=<slug>` with **no
authentication** (`journal_analytics_views.py:29-76`). A competitor or anyone can enumerate slugs
and read a journal's private submission analytics.
**Recommendation:** Require authentication + object-/journal-level permissions on report,
batch-status, and all analytics endpoints; rate-limit + size-cap the anonymous file-processing
endpoints.

### F2 — claim_extractor documented as "LLM-powered" but is pure regex — MEDIUM (doc_mismatch / stub_vs_claim)
`claim_extractor.py:8-10` self-documents as regex-based, and a grep across `core/manuscript/*.py`
for `openai|anthropic|gpt|llm|claude|gemini|langchain|completion|api_key` returns **zero matches**.
MEMORY/docs describe `statistical_claim_extractor.py` as "LLM-powered extraction." That claim is
materially false. (Regex statcheck-style extraction is legitimate; only the "LLM-powered" label is
wrong, and the documented filename/path is also wrong — see F6.)
**Recommendation:** Change docs/paper wording to "rule/pattern-based extraction."

### F3 — Anonymous batch endpoint runs up to 10 synchronous full manuscript analyses per request — MEDIUM (security / performance)
`BatchSubmitView` is `AllowAny` (`batch_views.py:78`); journal auth is *optional* (`:89, 238-266`).
An unauthenticated caller can POST `file_0..file_9` and trigger 10 synchronous
`ManuscriptGuardian.review()` runs in one request (`:122-160`), each parsing a PDF/DOCX and running
scipy across all claims, inside the request/response cycle (no Celery offload here). This is an
amplification/DoS vector and risks worker-thread exhaustion.
**Recommendation:** Require auth for batch; offload to Celery (async) and return a polling handle;
enforce per-IP and per-file size limits.

### F4 — `JournalAPIKey.verify_key` is the linchpin of all journal auth but was not in scope to verify — MEDIUM (security, pending)
Both `JournalSubmitView._authenticate_journal` (`manuscript_views.py:574-599`) and
`BatchSubmitView._authenticate_journal` (`batch_views.py:238-266`) do prefix-lookup
(`raw_key[:8]`) + `key_obj.verify_key(raw_key)` + `journal.is_active` and fail closed on any
exception. The shape is correct, but security depends entirely on `JournalAPIKey.verify_key`
(in `core/models`, out of scope) using a salted hash + constant-time compare. Unverified.
**Recommendation:** Confirm `verify_key` hashes keys (salted) and uses `hmac.compare_digest`;
add rate-limiting on the prefix lookup.

### F5 — `JournalSubmitView` POSTs reports to a journal-controlled webhook URL (SSRF surface) — MEDIUM (security, pending)
`manuscript_views.py:516-536` delivers the review report to `journal.webhook_url` via
`WebhookDeliveryService.deliver_report` (in `core/services/webhook_service.py`, out of scope). A
server-side POST to a tenant-controlled URL is an SSRF/internal-egress vector unless the URL is
validated (block RFC1918/link-local/loopback/metadata, enforce https, no internal redirects) and
the payload is signed.
**Recommendation:** Audit `webhook_service.py` for SSRF protections + HMAC payload signing.

### F6 — MEMORY/doc module paths and the "GROBID" parser claim are stale/incorrect — LOW (doc_mismatch)
MEMORY references `core/services/manuscript_parser.py`, `statistical_claim_extractor.py`,
`consistency_validator.py`; none exist under `core/services/`. The real modules are under
`core/manuscript/` (`parser.py`, `claim_extractor.py`, `consistency_validator.py`). MEMORY also
says the parser supports "GROBID/LaTeX/DOCX"; the view layer dispatches only on pdf/tex/latex/docx/
txt and `parser.py` could not be fully read this session — GROBID usage is **unconfirmed** and
should be checked.
**Recommendation:** Correct MEMORY paths; verify/qualify the GROBID claim against `parser.py`.

### F7 — Mild statistical inconsistency: two parallel statcheck implementations with differing r-fallback — LOW (quality / statistical_correctness)
The consistency logic exists twice: `ConsistencyValidator._recompute_*`
(`consistency_validator.py:333-484`) and `StatisticalConsistencyValidator._recompute_p`
(`advanced_validators.py:282-332`). They mostly agree, but for correlations the advanced one
infers `n = df + 2` from a reported correlation df (`advanced_validators.py:316-317`) while the
core one prefers explicit `n` and otherwise treats df directly as the t-df
(`consistency_validator.py:452-457`). For an APA `r(48)=...` claim the extractor stores `df=(48,)`,
so the core validator would use df=48 as the t-df (correct: n-2=48), whereas the advanced one
would compute n=50 then df=48 (also correct) — consistent here, but the two code paths are a
maintenance hazard and could diverge. Duplicate logic, not a current numerical error.
**Recommendation:** Have `StatisticalConsistencyValidator` delegate to `ConsistencyValidator`.

### F8 — `evaluate_checklist` body could not be cleanly read; verify it is not stubbed — INFO (quality, pending)
A Read of `discipline_profiles.py:1811-1832` returned garbled/likely-rendering-artifact text
(`text_to_search = self._section_text(...) if False else manuscript_text` inside a *module-level*
function, which would be a `NameError`). This is most likely a tool render artifact, but because
`evaluate_checklist` is what actually applies the 67 checklist items to a manuscript, its real body
should be confirmed to (a) honor `section_hint` and (b) not be a simplified/stub search.
**Recommendation:** Re-read `evaluate_checklist` and confirm per-section detection logic.

## (c) Claims-vs-Reality table

| Claim (docs/MEMORY/paper) | Reality | Status |
|---|---|---|
| "7 validators in ALL_VALIDATORS" | Exactly 7 real classes (`advanced_validators.py:1684-1692`): StatisticalConsistency, MultipleTesting, EffectSizeCompleteness, PowerReporting, Reproducibility, MethodologicalAppropriateness, ReportingCompleteness. | **confirmed** |
| "8 discipline profiles (CONSORT, STROBE, JARS-Quant, ECONOMICS, EDUCATION, CLINICAL_TRIAL, ICH_E9, SOCIAL_SCIENCE)" | All 8 present & registered in `ALL_PROFILES` (`:1744-1753`); 67 `ChecklistItem(` instances with real regex/citations. | **confirmed** |
| claim_extractor "LLM-powered extraction" | Pure regex; zero LLM imports. | **refuted** |
| consistency_validator "STATCHECK-style (recompute p from stat+df)" | Correct: t/F/χ²/z/r recomputation matches scipy (t(25)=2.34→0.0276, F(2,30)=5.67→0.0082, r=.45 df=30→t=2.76,p=0.0098). | **confirmed** |
| JournalSubmitView "inline API-key auth at manuscript_views.py:574-599" | Present at exactly those lines; prefix+verify_key+active, fails closed. Safety hinges on unverified `verify_key`. | **confirmed (shape)** |
| Parser supports "GROBID/LaTeX/DOCX" | Views dispatch pdf/tex/latex/docx/txt; GROBID not confirmed in code. | **not_found** |
| Modules under `core/services/` | Real modules are under `core/manuscript/`. | **refuted** |

## (d) Prioritized recommendations toward world-class

1. **Authn/authz (HIGH):** Lock down report retrieval, batch-status, and ALL journal-analytics
   endpoints; scope by owner/journal; rate-limit + size-cap anonymous processing.
2. **Async + auth for batch (MEDIUM):** Require auth and move batch analysis to Celery.
3. **SSRF hardening (MEDIUM):** Validate/sign the journal webhook path.
4. **Verify `JournalAPIKey.verify_key`** (salted hash + constant-time compare).
5. **De-duplicate** the two statcheck implementations (F7).
6. **Fix the "LLM-powered" overclaim** and stale module paths in MEMORY/docs (F2, F6); verify
   GROBID claim.
7. **Confirm `evaluate_checklist`** honors per-section detection and isn't simplified (F8).

---
*The headline pipeline (parse→extract→statcheck→validate→checklist) is genuinely implemented and
statistically correct; the principal risks are access-control/SSRF on the API surface and a few
stale documentation overclaims.*
