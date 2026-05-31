# Subsystem Audit: Documentation Accuracy vs Reality

**Date:** 2026-05-31
**Auditor:** Senior audit (docs-vs-code subsystem)
**Scope:** README.md, CITATION.cff, MEMORY.md headline claims, and `docs/` (esp. CRITICAL_REVIEW_2026-05-06, WORK_PLAN_2026-05-06, API_DOCUMENTATION, FEATURES_DOCUMENTATION, DEPLOYMENT_GUIDE, SCIENTIFIC_INTEGRITY_AUDIT_COMPLETE, SESSION_HANDOFF_2026-05-06).
**Method:** Trust the code. Every numeric/behavioral claim cross-checked against source via read-only inspection.

---

## (a) Ground Truth — what this subsystem really is

StickForStats ships a large documentation surface: a 547-line marketing README, a `CITATION.cff`, ~29 markdown files in `docs/`, an institutional `MEMORY.md`, and two research-paper drafts (JOSS `paper/paper.md`, PLOS `paper/plos_compbio/manuscript.md`).

The internal remediation docs are unusually honest and accurate. `docs/WORK_PLAN_2026-05-06.md` tracks Phase 1/2/3 as DONE (2026-05-06), Phase 4 Not started, Phase 5 Awaiting PI decisions, Phase 6 Mostly done (`WORK_PLAN_2026-05-06.md:281-286`), and these markers are corroborated by code:
- **SSO JWT** now verified — `sso_service.py:178-185` `jose_jwt.decode(... options={"verify_signature": True, ...})`; the docstring at `:106-111` candidly documents the prior base64+json bypass and its fix.
- **LMS JWT** now verified — `lms_service.py:219-226` decodes with `verify_signature: True`, gated by `LTI_REQUIRE_JWT_SIGNATURE` (default True, `:149`).
- **Wilcoxon r** — `cascade_engine.py:375` `r = abs(z) / sqrt(n)` labeled "r (|Z|/sqrt(N), Rosenthal 1991)" (`:384`).
- **Kruskal-Wallis effect size** — `cascade_engine.py:435-436` defaults to "eta-squared H (unbiased; Tomczak & Tomczak 2014)" and reports `epsilon_squared` alongside (`:430,438`), with a comment citing `CRITICAL_REVIEW_2026-05-06.md §P1-8`.
- **Certification** — `certification_service.py:443-463` `verify_certificate` does a real `CertificationRecord` DB lookup + HMAC compare (no longer "valid=True for any SFS- prefix").

The **README** is the stalest, most overclaiming artifact: outdated counts (195 endpoints, 25 pages, 13 Celery tasks) and several capabilities presented as complete that are stubbed or absent (Stripe payment processing, SAML 2.0 SSO, fully-translated 16 languages, buildable desktop app).

**MEMORY.md is mostly accurate but drifted in two ways:** (1) several items it lists as open "Phase 2 fix item / STUB" are already fixed in code (SSO/LMS JWT, Wilcoxon r, KW effect-size, Independence/Durbin-Watson labeling, certification, site-license); (2) its line-number references have drifted. The two specific "nonexistent file" probes from the task prompt resolved as: `smart_profiler.py.bak` does NOT exist (correct — gone; `smart_profiler.py` does exist), and there is no file literally named `case_study_1*.py`; the CRISPR Case Study 1 script is `paper/replication/verify_case_study.py` (exists, simulated, disclosed).

---

## (b) Findings

### F1 — README claims "195 API endpoints"; code has 198 (stale badge + text; own table = 28 rows summing to 190)
- **Severity:** medium | **Category:** doc_mismatch
- **Evidence:** `README.md:9` badge `API_endpoints-195`; `README.md:282` "195 REST API endpoints organized across 22 categories."; `README.md:324` "# 195 REST API endpoints". Code: `backend/api/v1/urls.py` has 198 `path()/re_path()` entries (`grep -cE '(path|re_path)\(' = 198`). The README's own category table = **28 rows summing to 190**.
- **Doc claim:** 195 endpoints across 22 categories.
- **Reality:** 198 endpoints; table sums to 190 across 28 rows — internally inconsistent with both "195" and "22 categories."
- **Recommendation:** Auto-generate the count from `urls.py` in CI and reconcile the category buckets.

### F2 — README presents "16 languages" as fully supported without disclosing 6 are navigation-only stubs
- **Severity:** medium | **Category:** doc_mismatch
- **Evidence:** `frontend/src/i18n/locales/` has 16 dirs, 4 json files each. Key counts: en/es/zh/pt/fr/de/ja/ko/hi/ar ~333 keys each (full); id/pl/ru/th/tr/vi ~73 keys each (navigation-only). `README.md:453` "supports 16 languages with 4 translation namespaces per language"; README has no stub/partial/navigation-only disclosure. WORK_PLAN itself flags this as an open Phase-5 decision (`WORK_PLAN_2026-05-06.md:25`: "i18n stub languages (id, pl, ru, th, tr, vi)").
- **Doc claim:** 16 fully supported languages.
- **Reality:** 10 fully translated, 6 are ~22%-complete navigation-only stubs. MEMORY.md states this correctly; README does not.
- **Recommendation:** Mark the 6 stub languages as navigation-only/in-progress in the README i18n table.

### F3 — README "Billing integration via Stripe" is largely TRUE (real SDK, gated on STRIPE_SECRET_KEY); real defects are a self-contradicting "stubs" docstring and frontend text asserting payment security when Stripe is unconfigured
- **Severity:** medium | **Category:** doc_mismatch
- **Evidence:** `README.md:90` "Billing integration via Stripe with tiered plans." The integration is REAL, not a stub:
  - `backend/core/services/billing_service.py:24` `import stripe`; `:26-27` `stripe.api_key = getattr(settings, "STRIPE_SECRET_KEY", ""); STRIPE_AVAILABLE = bool(stripe.api_key)`.
  - `:263` `stripe.checkout.Session.create(...)` (real checkout); `:294` `stripe.Webhook.construct_event(payload, sig_header, webhook_secret)` (real webhook signature verification); `:301-369` real event handlers (checkout.session.completed, customer.subscription.updated/deleted, invoice.payment_failed) that update the Organization tier/status in the DB.
  - Wired end-to-end: `urls.py:399` `platform/billing/webhook/` → `platform_views.py:424 StripeWebhookView` → `BillingService.handle_stripe_webhook` (`:438`); `BillingView.post:417` → `create_checkout_session`.
  - Settings plumbed: `backend/stickforstats/settings.py:361-362` and `env_settings.py:112-113` read `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` from env.
  - Defects: (1) `billing_service.py:5-7` module docstring stale-calls the code "stubs that work without Stripe installed — replace with real calls when Stripe SDK is added," contradicting the real `stripe.*` calls below it. (2) When `STRIPE_AVAILABLE` is False the service degrades to `{"status": "simulated"}` (`:246-255`) / `{"error": "Stripe not configured"}` (`:290`) — disabled by default until a key is set. (3) `frontend/src/pages/PlatformDashboardPage.jsx:1122` unconditionally tells users "Payments are securely processed by Stripe. StickForStats never stores your card details," which is false in the default no-key configuration; `BillingDashboard.jsx:283` has `{/* TODO: Integrate Stripe Elements for payment processing */}`.
- **Doc claim:** Billing integration via Stripe with tiered plans.
- **Reality:** A genuine Stripe integration (checkout + webhook + signature verification + DB updates) exists, gated on `STRIPE_SECRET_KEY` and disabled by default. The README claim is essentially accurate. The actual problems are documentation drift (module docstring still calls itself "stubs") and a frontend payment-security assertion shown even when Stripe is unconfigured.
- **Recommendation:** Fix the stale `billing_service.py:5-7` docstring to describe the real integration; gate the `PlatformDashboardPage.jsx:1122` "securely processed by Stripe" copy on actual Stripe availability; optionally note in the README that billing requires `STRIPE_SECRET_KEY`.

### F4 — README claims "SAML 2.0 SSO"; SAML is advertised in API responses but not implemented (OIDC only)
- **Severity:** high | **Category:** stub_vs_claim
- **Evidence:** `README.md:95` "SSO via Keycloak — SAML 2.0 and OpenID Connect support." `sso_service.py:4` docstring "OIDC/SAML authentication via Keycloak"; `sso_service.py:295,307,313` the provider-list endpoint returns `"protocols": ["OIDC", "SAML 2.0"]` for each provider. But there is **no SAML implementation**: no SAML response parsing/validation code, no SAML library import, and `infrastructure/` has 0 SAML config (`grep -rli saml infrastructure = none`). `validate_token` exclusively does OIDC JWT-over-JWKS.
- **Doc claim:** SAML 2.0 SSO support.
- **Reality:** OIDC only. The code actively *claims* SAML 2.0 in its provider-list API output but cannot perform a SAML login. MEMORY.md states the truth ("OIDC clients only, no SAML configured"). This is worse than a stale README: the running API advertises an unimplemented protocol.
- **Recommendation:** Remove "SAML 2.0" from the README and from the `protocols` arrays in `sso_service.py:295,307,313` until implemented.

### F5 — README presents the Tauri desktop app as usable; the icons directory is empty so it cannot build
- **Severity:** medium | **Category:** stub_vs_claim
- **Evidence:** `desktop/src-tauri/icons/` exists but contains **0 files** (verified: dir present, `find ... -type f | wc -l = 0`). Tauri requires icons to build, so `cargo tauri build` fails as configured. `README.md:151` "Desktop app via Tauri — native performance with the full web UI."
- **Doc claim:** Usable Tauri desktop app.
- **Reality:** Webview wrapper that cannot build. MEMORY.md documents this; README does not.
- **Recommendation:** Add icons and verify a build, or mark the desktop app experimental/not-yet-buildable.

### F6 — `docs/SCIENTIFIC_INTEGRITY_AUDIT_COMPLETE.md` certifies "Paper Ready for Submission" (2026-01-27) with NO supersede disclaimer, despite a later audit finding a fabrication-risk item it missed
- **Severity:** high | **Category:** scientific_integrity
- **Evidence:** `docs/SCIENTIFIC_INTEGRITY_AUDIT_COMPLETE.md:1-7`:
  ```
  # StickForStats JSS Paper - Scientific Integrity Audit
  ## Complete Documentation
  **Document Created:** 2026-01-27 13:30 IST
  **Status:** ✅ COMPLETE - Paper Ready for Submission
  ```
  Executive Summary: a comprehensive audit "identified several unverified claims that have now been resolved." The file contains **0** occurrences of `supersed`, `cherry`, or `2026-05-06` (verified). Meanwhile `docs/WORK_PLAN_2026-05-06.md:15,38-40` records that the project later discovered a **cherry-picked meta-analysis** and replaced it on 2026-05-06 with the real Egger 1997 / `metafor::dat.egger2001` dataset — an integrity issue this "COMPLETE" audit did not catch.
- **Doc claim:** A 2026-01-27 audit certifying the paper scientifically sound and "Paper Ready for Submission," all unverified claims resolved.
- **Reality:** The "complete" audit missed a fabrication-risk item later found and fixed in May, and carries no pointer to the authoritative later review. A reviewer or new dev opening this file first would be actively misled into believing scientific integrity was fully signed off.
- **Recommendation:** Add a prominent SUPERSEDED banner at the top linking to `CRITICAL_REVIEW_2026-05-06.md` / `WORK_PLAN_2026-05-06.md`, and/or rename to `*_2026-01-27_SUPERSEDED.md`. A silently-stale green "COMPLETE / Paper Ready" certificate is the most dangerous doc in this subsystem.

### F7 — MEMORY.md lists already-fixed items as open Phase-2/STUB (stale institutional memory)
- **Severity:** medium | **Category:** doc_mismatch
- **Evidence:** MEMORY.md "Math bugs in non-headline validators (Phase 2 fixes)" + Pillar-3 index mark these broken, but code shows fixed:
  - SSO JWT — `sso_service.py:178-185` `verify_signature: True` via JWKS (MEMORY: "JWT signature NOT verified; Phase 2 critical fix").
  - LMS JWT — `lms_service.py:219-226` `verify_signature: True`, default-on (MEMORY: "JWT signature NOT verified at :128-129").
  - Wilcoxon r — `cascade_engine.py:375` `abs(z)/sqrt(n)` (MEMORY: "W/max(W) instead of Z/√N").
  - KW effect size — `cascade_engine.py:435-436` defaults to unbiased eta-squared H, reports epsilon-squared alongside (`:430`) (MEMORY: "labeled 'ε²' but formula is unbiased η²" — the labeling has since been explicitly corrected per the `§P1-8` comment).
  - Certification — `certification_service.py:443-463` real DB+HMAC lookup (MEMORY: "verify_certificate always returns valid=True for SFS- prefix").
- **Doc claim:** Multiple MEMORY.md lines marking these open/broken/STUB.
- **Reality:** Fixed in code, consistent with WORK_PLAN Phase 1/2/3 = DONE. Stale entries could mislead the next dev into re-fixing or distrusting working code. (Deep numerical correctness of the *new* formulas is delegated to the stats subsystem audit; this finding is purely doc-vs-code drift.)
- **Recommendation:** Update the MEMORY.md Pillar-3 index and "Math bugs" section to mark these remediated; fix drifted line numbers.

### F8 — README badge/structure "25 pages" is stale; actual ~40 page modules
- **Severity:** low | **Category:** doc_mismatch
- **Evidence:** `frontend/src/pages/` = 29 `.jsx` + 11 non-test `.js` = **40** page modules. `README.md:13` badge `frontend_pages-25`; `README.md:348` "25 page components."
- **Reality:** ~40 page modules (≈MEMORY's "~41 pages").
- **Recommendation:** Update badge/structure to ~40.

### F9 — README claims "13 Celery task types"; code defines 12 `@shared_task`
- **Severity:** low | **Category:** doc_mismatch
- **Evidence:** `backend/core/tasks.py` = 12 `@shared_task` (`grep -c = 12`): run_statistical_analysis, run_guardian_check, process_manuscript, batch_manuscript_analysis, generate_full_report, export_user_data_async, erase_user_data_async, send_webhook_delivery, compute_journal_analytics, sync_usage_aggregates, cleanup_expired_sessions, check_subscription_expirations. `README.md:159,343` say "13."
- **Reality:** 12 tasks. The "7 queue routes" claim IS correct (7 distinct queues: analysis, analytics, default, gdpr, manuscript, reports, webhooks). MEMORY.md correctly says 12.
- **Recommendation:** Change 13 → 12 in both README locations.

### F10 — Case Study 1 (CRISPR) is simulated and honestly disclosed in script + manuscript (verified clean)
- **Severity:** info | **Category:** scientific_integrity
- **Evidence:** `paper/replication/verify_case_study.py` uses a fixed seed and its docstring labels the data SIMULATED, not a biological discovery; manuscript heading `paper/plos_compbio/manuscript.md` "Case Study 1: CRISPR Guide RNA Efficiency (Simulated Data)."
- **Reality:** Simulated, fixed seed, clearly labeled illustrative in BOTH script and manuscript — the disciplined disclosure pattern adopted after the meta-analysis incident. Recorded as a positive.
- **Recommendation:** Keep this disclosure pattern; apply it to all illustrative datasets.

---

## (c) Claims-vs-Reality Table

| # | Source | Claim | Reality | Verdict |
|---|--------|-------|---------|---------|
| 1 | README:9,282,324 | 195 endpoints / 22 categories | 198 endpoints; table 28 rows / 190 | **Refuted (stale)** |
| 2 | README:453 | 16 languages fully | 10 full + 6 nav-only (~73 vs ~333 keys) | **Partial / misleading** |
| 3 | README:90 | Stripe billing integration | REAL integration (billing_service.py:24,263,294) gated on STRIPE_SECRET_KEY; defects are stale "stubs" docstring + frontend payment-security text shown when unconfigured | **Confirmed (with caveats)** |
| 4 | README:95 | SAML 2.0 SSO | OIDC only; SAML advertised in API but unimplemented | **Refuted** |
| 5 | README:151 | Tauri desktop app (usable) | Icons dir empty → cannot build | **Misleading** |
| 6 | docs/SCI_INTEGRITY_..COMPLETE:1-7 | 2026-01-27 "COMPLETE / Paper Ready" | Missed cherry-picked meta-analysis; no supersede note | **Refuted (dangerously stale)** |
| 7 | MEMORY "Phase 2 pending" | SSO/LMS JWT, Wilcoxon, KW, cert broken | All fixed in code | **Refuted (MEMORY stale)** |
| 8 | README:13,348 | 25 pages | ~40 page modules | **Refuted (stale)** |
| 9 | README:159,343 | 13 Celery tasks | 12 `@shared_task` | **Refuted (off by one)** |
| 10 | README:159 | 7 queue routes | 7 distinct queues | **Confirmed** |
| 11 | README:11,200 | Guardian 38/38 (22+16) | 22 integ + 16 mw = 38 | **Confirmed** |
| 12 | README:223 | 45 SQS rules / 6 categories | 45 rules (per MEMORY/recon; self-claimed in file) | **Confirmed** |
| 13 | README:176 | 8 Guardian validators | 8 validator classes (per MEMORY/recon) | **Confirmed** |
| 14 | README:198 | confidence formula; 3/2/1 | matches guardian_core | **Confirmed** |
| 15 | README:236 | 50-decimal mpmath precision | `mpmath.mp.dps=50` (HPC:26) + `getcontext().prec=50` (:22) | **Confirmed** |
| 16 | README:182 | Independence = autocorrelation \|r\|>0.3 | lag-1 Pearson, honestly labeled | **Confirmed** |
| 17 | WORK_PLAN:281-286 | Phase 1/2/3 DONE; 6 mostly done | SSO+LMS JWT, Wilcoxon r, KW η², cert all fixed | **Confirmed (spot-checked)** |
| 18 | MEMORY | smart_profiler.py.bak referenced | does not exist (correct) | **Confirmed** |
| 19 | Case Study 1 | reproducibility | simulated + disclosed in script & manuscript | **Confirmed (clean)** |
| 20 | CITATION.cff | authors/v1.0.0/MIT | consistent w/ README | **Confirmed** |

---

## (d) Prioritized Recommendations toward "world-class"

1. **(high) Stop advertising unimplemented SAML 2.0** — drop it from `README.md:95` and from the `protocols` arrays in `sso_service.py:295,307,313` (F4). The running API currently claims a protocol it cannot perform — the single clearest false capability claim.
2. **(medium) Fix the Stripe documentation/UI drift** (F3) — the integration is real but disabled-by-default; correct the stale "stubs" docstring at `billing_service.py:5-7` and gate the "Payments are securely processed by Stripe" copy at `PlatformDashboardPage.jsx:1122` on actual Stripe availability so users are not falsely reassured when no key is configured.
3. **(high) Add a SUPERSEDED banner to `SCIENTIFIC_INTEGRITY_AUDIT_COMPLETE.md`** pointing to `CRITICAL_REVIEW_2026-05-06.md` (F6). It currently certifies "Paper Ready" with no warning that a later audit caught a fabrication-risk item.
4. **(medium) Disclose i18n stub languages** (id/pl/ru/th/tr/vi) as navigation-only/in-progress (F2).
5. **(medium) Auto-generate README counts** from source (endpoints, pages, tasks) in CI so 195/25/13 cannot drift again (F1, F8, F9).
6. **(medium) Refresh MEMORY.md** — move SSO/LMS JWT, Wilcoxon r, KW effect-size, Independence/DW, certification, site-license out of "open/STUB/Phase 2" into "remediated"; fix drifted line numbers (F7).
7. **(medium) Caveat the desktop app** until icons are added and a build verified (F5).
8. **(low) Keep the Case Study 1 "(Simulated Data)" disclosure** as the model for all illustrative datasets (F10).
