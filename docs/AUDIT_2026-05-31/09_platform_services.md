# Audit — Universal Platform Services (certification, licensing, RBAC, GDPR, billing, webhooks, plugins, data import)

**Date:** 2026-05-31
**Auditor:** Subsystem audit agent (skeptical, code-first)
**Scope:** `backend/core/services/{certification,site_license,rbac,gdpr,billing,tier_config,webhook,data_import,dataset,plugin_runtime}_service.py` + `backend/api/v1/{certification,site_license,gdpr,marketplace,platform,plugin_runtime,data_import}_views.py` + supporting models/migrations/urls.

> **Method note.** The Read/Grep tooling in this environment intermittently produced garbled output. Every load-bearing fact below was re-verified directly against the raw files with `python3`. Findings I could not reconfirm against source were dropped. No finding without concrete file:line evidence.

---

## (a) Ground truth — what this subsystem really is

The "Phase-3" remediation that MEMORY/docs describe (turning stubbed peripheral services into real ones) is **substantially real**. The headline services flagged in the prior audit as fake are genuinely DB-backed now:

- **Certification** (`certification_service.py`, 592 LOC): real exam flow on three DB models (`CertificationQuestion`, `CertificationExamAttempt`, `CertificationRecord`), defined in migration `0009_add_certification_models.py` and seeded by `0010_seed_certification_questions.py`. Exams are randomly sampled (`random.sample`, line 260), graded against an attempt snapshot with replay protection (line 329-332), and certificates are **HMAC-SHA256 signed** (`_compute_signature`, lines 146-151; key from `CERT_SIGNING_KEY`/`SECRET_KEY`). `verify_certificate` (lines 443-526) does a real DB lookup, **constant-time signature compare** (`hmac.compare_digest`, line 480), revocation check, and expiry check. The old "valid:True for any SFS- string" behavior is gone.
- **Site licensing** (`site_license_service.py`, 400 LOC): all flows DB-backed via `SiteLicense` + `SiteLicenseUsageRecord` (migration `0011_add_site_license_models.py`). `validate_license_key` (172-212) does a real lookup with status/expiry checks; `get_license_usage` (287-339) and `generate_usage_report` (341-400) aggregate real rows. Keys are `secrets.token_hex`-random (line 88). All 6 methods are real — no canned data.
- **RBAC** (`rbac_service.py`, 208 LOC): real `OrganizationMembership`-backed role checks (lines 97-103) with a 4-role permission matrix and a 5-minute cache. Clean and correct.
- **GDPR** (`gdpr_service.py`, 262 LOC): real consent management, real DSAR export, and real DB anonymization. **BUT erasure is materially incomplete** (see F-1): `erase_user_data` never touches datasets or analyses, the two largest PII categories it advertises.
- **Billing** (`billing_service.py`, 397 LOC): DB-backed subscriptions/usage on `Organization`/`SubscriptionTier`/`UsageRecord`; honest **Stripe stub** that degrades gracefully (`create_checkout_session` returns `status:"simulated"` when Stripe unconfigured, lines ~250-262; real Stripe path present behind `STRIPE_AVAILABLE`). The inbound Stripe webhook verifies signatures via `stripe.Webhook.construct_event` (line ~308). Not an overclaim.
- **Webhooks** (`webhook_service.py`, 378 LOC): this is the **journal report-delivery** webhook (Pillar 2), not a user-registerable webhook. Real outbound HMAC-SHA256 signing over `"{timestamp}.{payload}"` (sign_payload, 270-291), constant-time verify helper with a 300s replay window (verify_webhook_signature, 51-112), retry with backoff, delivery tracking. Destination is `journal.webhook_url` (admin-configured, not arbitrary user input).
- **Plugin runtime** (`plugin_runtime.py`, 431 LOC): **genuinely de-fanged.** `IS_SANDBOXED = False` is a public, honest flag (line 40). There is no `exec`/`eval`/`compile` and no dynamic import of plugin code: custom statistical functions are explicitly refused (`"custom_function_not_supported"`, lines 190-199); the four "plugin" execution paths are hard-coded built-ins (`robust_ttest`, `bootstrap_ci`, `permutation_test`, `bayesian_ab`) plus declarative SQS-regex / chart-config / connector-descriptor handlers. The module docstring is candid about the in-process trust model. This matches the "Option B scope-down" decision and removes the previously-claimed RCE primitive.
- **Data import** (`data_import_service.py`, 546 LOC): **real** pyreadstat-backed SPSS/SAS/Stata import (`read_sav`/`read_sas7bdat`/`read_dta`) plus pandas for CSV/Excel/JSON. Graceful `ImportError` messages when pyreadstat/openpyxl missing.
- **Dataset** (`dataset_service.py`, 363 LOC): real upload+validation; uses Django `FileField` (`dataset.file`) and per-user size limit (`user.max_dataset_size`). Note its top-of-file aliases `Dataset`/`User` to `typing.Any` (lines 16-17) — the real models are referenced lazily at call time.

**Endpoint auth.** Mostly correct: `IsAuthenticated` on certification, site-licensing, GDPR consent/export/erase, plugin execute/config; `AllowAny` on the genuinely public `PrivacyInfoView` and tier list; `AllowAny` on marketplace browse/detail but with explicit `request.user.is_authenticated` gates on install/review (lines 176, 220, 253). Two real exceptions are F-3 (data import is fully public) and F-4 (the "public" certificate-verify endpoint is actually login-gated).

**Bottom line:** This is among the most honestly-remediated subsystems in the project. The Phase-3 "we made the stubs real" claims hold up, and the plugin RCE risk is genuinely closed. The remaining issues are: a GDPR erasure path that silently skips the user's datasets/analyses (privacy-compliance gap), a fully-public file-import endpoint (DoS/abuse), a docstring/permission contradiction on cert-verify, no SSRF guard on the journal webhook (low, admin-configured), and minor doc drift.

---

## (b) Findings

### F-1 — GDPR "right to erasure" silently skips datasets AND analyses — the two biggest PII categories it advertises (high)
- **Category:** doc_mismatch / bug (privacy-compliance)
- **Severity:** high
- **Evidence:** `gdpr_service.py` `DATA_CATEGORIES` (lines 20-29) explicitly lists `"datasets": "Uploaded datasets"` and `"analyses": "Statistical analyses and results"`. The erasure confirmation even returns `"data_to_delete": list(GDPRService.DATA_CATEGORIES.keys())` (line 176), promising the caller these will be deleted. But `erase_user_data` (lines 166-222) only operates on `ConsentRecord` (delete), `UsageRecord` (anonymize), `OrganizationMembership` (delete), `StatisticalAudit` (anonymize), and the `User` account (anonymize). Verified at source: `erase touches AnalysisSession: False`, `erase touches Dataset: False`. It never imports or deletes `Dataset` or any analysis model, and it never calls `user.delete()` (verified `user.delete(): False`), so cascade deletion does not happen either.
- **Doc claim:** Module docstring: "right to erasure ... per GDPR Articles 15-20." MEMORY: "GDPR — REAL (actually deletes/anonymizes)." The erasure response advertises deleting `datasets` and `analyses`.
- **Reality:** After a "right to be forgotten" request, every dataset the user uploaded (rows AND the underlying `FileField` files on disk) and every statistical analysis remain fully intact and attributable. The promise in `data_to_delete` is false. This is the actual personal data subjects most want erased. GDPR Art. 17 erasure is therefore materially incomplete, and the response misrepresents what happened.
- **Recommendation:** In `erase_user_data`, delete the user's `Dataset` rows AND their on-disk files, and delete/anonymize `AnalysisSession` (or whatever analysis models hold user data). Either align `DATA_CATEGORIES`/`data_to_delete` with what is actually erased or — better — actually erase the listed categories. Add a regression test that uploads a dataset, erases the user, and asserts both the row and the file are gone.

### F-2 — `UniversalDataImportView` (and `SupportedFormatsView`) are fully public (`AllowAny`) — unauthenticated file parsing (medium)
- **Category:** security
- **Severity:** medium
- **Evidence:** `data_import_views.py:89` `permission_classes = [AllowAny]` on `UniversalDataImportView`; line 191 same on `SupportedFormatsView`. The view accepts a multipart upload and runs it through pandas/pyreadstat. Routed at `urls.py:227/385` (`data/universal-import/`). A 100 MB cap exists (`MAX_UPLOAD_SIZE_BYTES`, line 30; enforced line 112), and a 100 MB unauthenticated parse is still a meaningful CPU/RAM amplification primitive (e.g. a crafted `.xlsx`/`.sav`), and there is no per-user/tier quota because there is no user.
- **Doc claim:** None explicit, but the platform's tiered model implies import is a gated feature.
- **Reality:** Anyone on the internet can repeatedly POST 100 MB files and force the server to allocate/parse them — an unauthenticated DoS amplification vector, and it bypasses all the billing/tier limits the platform otherwise enforces.
- **Recommendation:** Require `IsAuthenticated`, apply the org's `max_upload_size_mb` and `max_stored_datasets`/rate limits, and lower the anonymous cap (or drop anonymous entirely).

### F-3 — `CertificateVerifyView` docstring says "Public endpoint" but it is `IsAuthenticated` (low→medium)
- **Category:** doc_mismatch / bug
- **Severity:** low
- **Evidence:** `certification_views.py` `CertificateVerifyView` docstring: "Public endpoint to verify a certificate's authenticity." Its `permission_classes = [IsAuthenticated]` (verified). Route `certification/verify/<certificate_id>/` (urls.py:448).
- **Reality:** Third parties (employers, journals) cannot verify a StickForStats certificate without a platform login, which defeats the entire purpose of an HMAC-signed, externally-verifiable credential. The service layer (`verify_certificate`) is built for public use; the view contradicts it.
- **Recommendation:** Change to `AllowAny` (the response already omits sensitive data and the lookup is by opaque random certificate_id), or correct the docstring if login-gating is intentional.

### F-4 — No SSRF protection on journal webhook delivery (low)
- **Category:** security
- **Severity:** low
- **Evidence:** `webhook_service.py` `_post_requests`/`_post_urllib` (lines 343-378) POST to `journal.webhook_url` with no scheme/host validation. Verified: SSRF-related terms (`urlparse`, private-IP, loopback, link-local `169.254`, https-only) = NONE in the file.
- **Reality:** If a journal's `webhook_url` is ever set to an internal address (e.g. by a malicious/compromised journal admin, or a misconfiguration), the server will POST signed payloads to it — internal port-scan / metadata-endpoint reachability. Severity is low because the destination is admin-configured (not arbitrary end-user input) and there is no user-facing "register webhook" endpoint.
- **Recommendation:** Validate `webhook_url` on save: require `https://`, resolve the host and reject RFC1918 / loopback / link-local / metadata IPs; re-resolve at send time to defeat DNS rebinding.

### F-5 — `InviteMemberView` uses `user_id=1` as an invitation placeholder for unregistered emails (medium)
- **Category:** bug / security
- **Severity:** medium
- **Evidence:** `platform_views.py:291-300`: when the invited email has no existing `User`, the code creates an `OrganizationMembership` with `user_id=1  # placeholder — will be resolved on registration`.
- **Reality:** This hard-codes membership ownership to the user whose primary key is `1` (typically the first-created account / superuser). The membership row is now associated with that real user, not the invitee. Depending on how membership is later "resolved on registration" (no such resolution code was found in scope), user #1 may appear as a member of arbitrary organizations, or the pending invite may grant access to the wrong account. At minimum it pollutes user #1's membership list; at worst it is an authorization defect.
- **Recommendation:** Model pending invitations without a fake FK — e.g. a nullable `user` (the membership model already has `invitation_email`/`invitation_token`), or a separate `PendingInvitation` table — and resolve to the real user only at registration/acceptance time. Never reuse `user_id=1`.

### F-6 — Stale doc: MEMORY references a `plugin_marketplace.py` service that does not exist (info)
- **Category:** doc_mismatch
- **Severity:** info
- **Evidence:** MEMORY: "Plugin marketplace: `backend/core/services/plugin_marketplace.py`". Verified: no such file. Marketplace logic lives entirely in `backend/api/v1/marketplace_views.py` (336 LOC) backed by `Plugin`/`PluginInstallation`/`PluginReview` models (migration `0007_plugin_marketplace.py`).
- **Reality:** Documentation drift only; the marketplace itself is real and DB-backed (browse/install/uninstall/review with atomic `downloads` counter increment at `marketplace_views.py:208`).
- **Recommendation:** Remove the phantom path from MEMORY.

### F-7 — Webhook `verify_signature` advertised for inbound receivers, but no inbound StickForStats webhook endpoint exists (info)
- **Category:** doc_mismatch
- **Severity:** info
- **Evidence:** `webhook_service.py:294-316` docstring: "Journals (or any receiver) can use this logic to verify ... a webhook payload was genuinely sent by StickForStats." The only inbound webhook endpoint in scope is `StripeWebhookView` (platform_views.py:424), which verifies via Stripe's own SDK, not this function. The StickForStats `verify_signature`/`verify_webhook_signature` is exercised only by tests.
- **Reality:** The verification helper is correct and useful (it's the reference implementation journals would copy), but nothing in this codebase consumes it at runtime — it's a published utility, not a wired endpoint.
- **Recommendation:** Soften the docstring to "reference verifier for receivers; not invoked by a server endpoint," or expose an inbound endpoint if two-way webhooks are intended.

---

## (c) Claims-vs-reality table

| Claim (MEMORY / docs / docstrings) | Status | Reality |
|---|---|---|
| Certification now DB-backed; `verify_certificate` no longer "valid:True for SFS-" | **CONFIRMED** | 3 DB models (mig 0009), HMAC-signed certs, constant-time verify, revocation+expiry (`certification_service.py:443-526`); questions seeded by mig 0010 |
| Site licensing: all 6 methods real/DB-backed (was 3 canned) | **CONFIRMED** | All flows query `SiteLicense`/`SiteLicenseUsageRecord` (mig 0011); random keys; no canned data |
| GDPR "REAL (actually deletes/anonymizes)" | **PARTIAL / REFUTED for datasets+analyses** | Consent/usage/membership/audit/account handled, but `erase_user_data` never touches `Dataset` or analyses despite advertising them (F-1) |
| plugin_runtime "NOT sandboxed / in-process exec → RCE"; now "Option B scope-down" | **CONFIRMED (RCE closed)** | No exec/eval/compile; custom functions explicitly refused; only hard-coded built-ins run; `IS_SANDBOXED=False` is honest (`plugin_runtime.py`) |
| data_import SPSS/SAS/Stata via pyreadstat real | **CONFIRMED** | Real `pyreadstat.read_sav/read_sas7bdat/read_dta` (`data_import_service.py`) |
| webhook signing secure (HMAC, constant-time compare) | **CONFIRMED** | HMAC-SHA256 over `{ts}.{body}`; `hmac.compare_digest`; 300s replay window. (No SSRF guard — F-4) |
| Billing honest Stripe stub | **CONFIRMED** | Simulated checkout when unconfigured; real Stripe path + inbound signature verify behind `STRIPE_AVAILABLE` |
| RBAC multi-tenant role checks real | **CONFIRMED** | `OrganizationMembership`-backed, 4-role matrix, cached (`rbac_service.py`) |
| Certificate verify is a "Public endpoint" (docstring) | **REFUTED** | Actually `IsAuthenticated` (F-3) |
| `plugin_marketplace.py` service exists (MEMORY) | **REFUTED** | No such file; logic in `marketplace_views.py` (F-6) |
| Webhook `verify_signature` used by inbound receivers | **REFUTED** | Test-only; no inbound StickForStats endpoint (F-7) |
| Marketplace install/popularity counter tracked | **CONFIRMED** | `Plugin.objects.filter(...).update(downloads=plugin.downloads + 1)` at `marketplace_views.py:208`; sort by `-downloads` |

---

## (d) Prioritized recommendations toward "world-class"

1. **(F-1) Make GDPR erasure actually erase datasets and analyses, including on-disk files.** Today a "right to be forgotten" request leaves the user's uploaded data fully intact while the API claims it was deleted. This is the single most important fix here — it is both a privacy-compliance gap and a misleading API response. Add a regression test.
2. **(F-2) Lock down the data-import endpoints.** Require authentication, apply tier upload/storage limits, and tighten the anonymous path (or remove it). Unauthenticated 100 MB file parsing is an avoidable DoS amplifier.
3. **(F-5) Fix the `user_id=1` invitation placeholder.** Model pending invites without a fake FK; never attribute a membership to user #1.
4. **(F-3) Resolve the certificate-verify contradiction** — make it genuinely public (its whole value is external verifiability) or correct the docstring.
5. **(F-4) Add SSRF guards** to journal webhook delivery before any multi-tenant/self-service journal onboarding.
6. **Doc cleanup (F-6, F-7):** remove the phantom `plugin_marketplace.py` from MEMORY; soften the webhook `verify_signature` docstring.
7. **Wire a real payment processor** for billing when monetization is in scope — currently an honest, well-isolated stub (acknowledged, not a defect).
