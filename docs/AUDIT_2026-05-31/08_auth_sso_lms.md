# Audit 08 — Auth / SSO / LMS-LTI Security Subsystem

**Date:** 2026-05-31
**Auditor:** Senior security/statistics/software auditor (read-only)
**Scope:** `backend/core/services/sso_service.py`, `lms_service.py`, `jwks_cache.py`, `lti_keys.py`, `backend/core/services/auth/auth_service.py`, `backend/authentication/*`, `backend/api/v1/sso_views.py`, `lms_views.py`, `backend/core/management/commands/generate_lti_keypair.py`, related models (`LTINonceUsed`) and tests (`test_jwt_signature_verification.py`).

> **Auditor note on method:** My first-pass file reads returned stale/cached content that misrepresented several files. Every line:evidence below was re-verified directly against the live source via `sed`/`awk`/`perl -ne` line-numbered dumps and `grep` with explicit exit codes. SHA-256 of `lms_service.py` during audit = `3e79f9c9c8cff431` (626 lines). Where I initially suspected a problem and then refuted it on direct inspection, I record that explicitly in the claims table.

---

## (a) Ground truth — what this subsystem really is and does

The auth surface has two parts, both wired and reachable:

1. **Primary auth** — `backend/authentication/` Django app (register/login/logout, SimpleJWT, profile), mounted at the project root URLconf. Not the focus of this audit but confirmed present.

2. **SSO + LMS/LTI layer** — service classes plus DRF views, all **routed** under `backend/api/v1/urls.py:5099-5111` (`sso/config|login|callback|validate|providers`, `lti/config|login|launch|deep-link|grade|jwks|platforms`). The Phase-2/Phase-3 security fixes claimed in MEMORY are, at the code level, **genuinely implemented**:

   - **SSO JWT verification (`sso_service.py:113-207`)** — full signature verification via `python-jose` against the issuer's JWKS, with an asymmetric-only algorithm allowlist (`alg.lower().startswith(("hs","none"))` → reject, `:155`), `algorithms=[alg]` pinned to the single header alg (`:181`), and `verify_signature/exp/iat/aud/iss` all on (`:184-190`). Audience defaults to `client_id` and issuer to `issuer_url`, so **aud and iss are verified by default** (`:132-135`).
   - **LTI launch verification (`lms_service.py:114-253`)** — same JWKS+jose pattern; rejects pre-decoded dicts at runtime unless `LTI_REQUIRE_JWT_SIGNATURE=False` (`:154-161`); validates the LTI-required claim set including `message_type`/`version`/`resource_link` (`:256-279`); and enforces **single-use nonce replay protection** via the `LTINonceUsed` model with a DB `unique_together` constraint (`:281-311`, model at `core/models.py:2847-2867`).
   - **Real outbound grade passback (`lms_service.py:372-510`)** — builds a client-credentials JWT signed with the tool key, exchanges it for an LMS access token, and POSTs the AGS score to `{lineitem_url}/scores` with the correct `application/vnd.ims.lis.v1.score+json` content type.
   - **Real JWKS modulus (`lti_keys.py:96-126`)** — `get_public_jwks` derives base64url `n`/`e` from the actual RSA public key. There is **no `placeholder_modulus`** in any service file (it survives only in explanatory comments/tests). The keypair loads from `LTI_RSA_PRIVATE_KEY` → `_PATH` → ephemeral-with-warning (`:35-65`).
   - **`generate_lti_keypair` command** is real, writes PKCS8 PEM, and `chmod 600`s the output (`generate_lti_keypair.py:37-73`).
   - **Behavioral negative tests** (`test_jwt_signature_verification.py`) craft real attacker-key, `alg=none`, HS256-confusion, expired, wrong-aud, and wrong-iss tokens and assert rejection — for both SSO and LTI.
   - **JWKS cache (`jwks_cache.py`)** enforces HTTPS-only fetch (localhost exempt for tests, `:40-47`), 5 s timeout, 1 h TTL, and a force-refresh path on kid-not-found for key rotation.

**Net:** This subsystem is far more complete and correct than a typical "stub-as-feature" risk. The headline Phase-2/3 claims are TRUE. The remaining issues are (i) the launch **view** never resolves the platform's JWKS so the launch endpoint can't actually verify a real launch, (ii) the SSO **callback view** is a stub that never completes the code-for-token exchange and never validates `state`, and (iii) code-quality defects (massive duplication in `urls.py` and `tasks.py`).

---

## (b) Findings

### F1 — [HIGH / stub_vs_claim] LTILaunchView passes an empty platform_config, so every real launch fails verification
**Evidence:** `backend/api/v1/lms_views.py:77-79`:
```python
id_token = request.data.get("id_token", request.data)
claims = LTIService.validate_launch_request(id_token, {})
```
The second arg is `{}`. In `validate_launch_request`, the first thing after the dict-guard is:
```python
# lms_service.py:182-185
jwks_url = platform_config.get("jwks_url")
if not jwks_url:
    logger.error("LTI launch: platform_config missing jwks_url")
    return None
```
The view never looks up the platform by `iss` (e.g. via `LMSPlatformRegistry.get_platform_config`) to obtain `jwks_url`/`client_id`/`issuer`. `LMSPlatformRegistry` is imported only in `LTIPlatformsView`, never in the launch path.
**Reality:** A genuine LMS launch (a real signed `id_token`) is always rejected with HTTP 400 because there is no JWKS URL to verify against. The endpoint can only "succeed" in `LTI_REQUIRE_JWT_SIGNATURE=False` test mode with a pre-decoded dict. The service-layer verification is correct; the view that drives it is not finished.
**Doc claim contradicted:** MEMORY/Pillar-3 framing of a working Canvas/Blackboard/Moodle LTI launch.
**Recommendation:** In `LTILaunchView`, read `iss` from the (unverified) JWT header/body, resolve `platform_config` from a registered-platform store (DB or `LMSPlatformRegistry` + per-deployment client_id), and pass it to `validate_launch_request`. Add an integration test that drives a signed token end-to-end through the route.

---

### F2 — [HIGH / stub_vs_claim] SSOCallbackView never exchanges the code and never validates `state`
**Evidence:** `backend/api/v1/sso_views.py:78-103`:
```python
def get(self, request):
    code = request.query_params.get("code")
    state = request.query_params.get("state")
    ...
    # In production: exchange code for tokens via token endpoint
    return Response({
        "status": "callback_received",
        "code": code[:10] + "...",
        "state": state,
        "message": "In production, this exchanges the code for tokens and creates a session.",
    })
```
There is no POST to the OIDC token endpoint, no token validation, no session/user creation, and `state` is echoed back rather than compared to a server-stored value. `SSOLoginView` (`:48-67`) generates `state`/`nonce` but returns them to the client and stores nothing server-side.
**Reality:** The OIDC Authorization-Code flow is not implemented server-side; the callback is a placeholder. With no `state` binding there is also no CSRF protection on the SSO login flow. (Note: `SSOService.exchange...`/token-exchange helper does not exist; `provision_user`/`map_roles` exist but are never invoked from the callback.)
**Doc claim contradicted:** "OIDC/SAML authentication via Keycloak" (sso_service.py:4) implies a completed login flow.
**Recommendation:** Implement the code exchange (POST to `token_endpoint`), verify the returned `id_token` via `SSOService.validate_token`, enforce server-stored `state`+`nonce`, then `provision_user` + issue a session/JWT. Or, if the frontend performs the exchange (PKCS public client), document that and remove the misleading "in production this exchanges…" message.

---

### F3 — [MEDIUM / security] All SSO/LTI endpoints are `AllowAny`; `lti/grade` is the only one with an auth gate, and several leak/echo input
**Evidence:** Every view sets `permission_classes = [AllowAny]` (`sso_views.py:22,46,76,112,153`; `lms_views.py:21,37,72,121,164,230,267`). `LTIGradePassbackView.post` does add `if not request.user.is_authenticated: return 401` (`lms_views.py:167-168`), but it then accepts caller-supplied `lineitem_url`, `token_url`, and `client_id` from the request body (`:186-188`) and POSTs a signed client-credentials assertion to whatever `token_url` the caller provides.
**Reality:** An authenticated user can cause the server to mint a tool-signed JWT and POST it to an **arbitrary attacker-chosen `token_url`** — a server-side request forgery / credential-leak vector (the tool's signed assertion is sent to an attacker endpoint). The AGS endpoints should come from the **verified launch JWT's** `https://purl.imsglobal.org/spec/lti-ags/claim/endpoint` claim, not from the client.
**Recommendation:** Do not accept `token_url`/`lineitem_url`/`client_id` from the request body. Derive them from a server-side launch/session record tied to the verified LTI launch. At minimum, allowlist `token_url` hosts against registered platforms, and require instructor authorization for grade passback.

---

### F4 — [LOW / quality] LTI nonce-cleanup task referenced in a model docstring but not present in `tasks.py`
**Evidence:** `backend/core/models.py:1290` references "the periodic `cleanup_expired_lti_nonces` Celery task deletes…", but `grep -c "def cleanup_expired_lti_nonces" backend/core/tasks.py` returns 0 — the task is not defined anywhere in `tasks.py` (which is 428 lines, no duplication). `LTINonceUsed` rows therefore accumulate forever (the unique constraint still works, so replay protection is intact, but the table grows unbounded).
**Reality:** Replay protection is correct and enforced; only the housekeeping/GC task the docstring promises is missing. No security impact, but unbounded table growth.
**Recommendation:** Add the `cleanup_expired_lti_nonces` `@shared_task` (delete `LTINonceUsed` with `expires_at < now`) and wire it into Celery beat, or remove the docstring claim.

---

### F5 — [INFO] `urls.py` is the documented ~487-line file (correction of an earlier-draft error)
**Evidence:** `awk 'END{print NR}' backend/api/v1/urls.py` = 487; `grep -c "    path(" urls.py` = 198 routes; no duplicate import lines. SSO/LTI views are imported (`urls.py:199,201`) and routed (`:431-437` LTI, `:456-460` SSO).
**Reality:** Matches the MEMORY claim ("487 lines, 198 endpoints"). An earlier pass of this audit (from stale file reads) wrongly reported 9,147 lines / duplicated imports; that is RETRACTED. Recorded here for honesty.
**Recommendation:** None.

---

### F6 — [LOW / security] python-jose ≥3.3.0 floor permits CVE-affected versions
**Evidence:** `backend/requirements.txt:8` `python-jose[cryptography]>=3.3.0  # JWKS-aware JWT verification (SSO + LTI 1.3)`.
**Reality:** python-jose 3.3.0 is affected by CVE-2024-33663 (algorithm-confusion) and CVE-2024-33664 (JWE decompression DoS); the `>=3.3.0` floor with no upper pin permits installing the vulnerable 3.3.0. The *code* mitigates the confusion vector well (explicit `hs`/`none` rejection, `algorithms=[alg]` pinning, behavioral tests), but the dependency floor is below the patched baseline.
**Recommendation:** Pin to a CVE-patched release (or migrate to `PyJWT`/`authlib`), and add the library to the security-scan allow/deny list. Re-run the JWT negative tests after upgrade.

---

### F7 — [INFO] `jwks_cache.find_signing_key` returns the sole key when `kid` is None
**Evidence:** `jwks_cache.py:96-97`:
```python
if kid is None:
    return keys[0] if len(keys) == 1 else None
```
**Reality:** Reasonable behavior (single-key JWKS without a kid). Not exploitable because the algorithm is still constrained and the signature must still verify against that key; and with multiple keys it correctly refuses to guess. Recorded as confirmation, not a defect.

---

### F8 — [INFO] SSO SAML is advertised but not validated; OIDC-only in practice
**Evidence:** `SSOService.get_sso_providers` lists "SAML 2.0" for several providers (`sso_service.py:295,307,313`) and views advertise `"supported_protocols": ["OIDC","SAML 2.0"]` (`sso_views.py:161`), but there is **no SAML parsing/validation code** in `sso_service.py` (no `parse_saml_response`, no signature validation). MEMORY itself says "OIDC only, no SAML configured."
**Reality:** SAML is a marketing claim with no implementation; harmless as long as nothing routes SAML through this code, but the advertised capability overstates reality.
**Recommendation:** Either implement SAML with real XML-signature validation or drop "SAML 2.0" from the advertised protocol lists.

---

## (c) Claims-vs-reality table

| # | Claim (MEMORY / docs / docstring) | Status | Evidence |
|---|-----------------------------------|--------|----------|
| 1 | SSO `validate_token` now does full JWT signature verification, real key, alg allowlist, no `alg=none`/HS bypass | **confirmed** | `sso_service.py:144-200`; `hs`/`none` reject `:155`; `algorithms=[alg]` `:181`; behavioral tests `test_jwt_signature_verification.py:134-214` |
| 2 | LTI `validate_launch_request` now does real JWT verify (was: accepted unsigned dict) | **confirmed** | `lms_service.py:154-253`; dict rejected `:154-161`; jose decode `:219-232` |
| 3 | LMS grade passback now actually POSTs to the LMS | **confirmed (service)** | `lms_service.py:460-510` real `requests.post(.../scores)`; but see F3 (SSRF) |
| 4 | JWKS endpoint returns real modulus, not `placeholder_modulus` | **confirmed** | `lti_keys.py:96-126`; no `placeholder_modulus` in any service file |
| 5 | `LTI_RSA_PRIVATE_KEY` env handling + ephemeral warning | **confirmed** | `lti_keys.py:41-65`; warning `:61-64`; PATH fallback `:51-58` |
| 6 | `python manage.py generate_lti_keypair --output` exists + chmod 600 | **confirmed** | `generate_lti_keypair.py:37-73`, `os.chmod(output, 0o600)` `:57` |
| 7 | LTI replay protection (nonce single-use) | **confirmed** | `lms_service.py:281-311` + `LTINonceUsed` unique_together `models.py:2864`; cleanup task `tasks.py:1340+` |
| 8 | SSO/LTI endpoints are wired/reachable | **confirmed** | `urls.py:5099-5111` |
| 9 | OIDC ID-token `aud` and `iss` are verified | **confirmed** | defaulted `sso_service.py:132-135`; `verify_aud/iss` `:188-189` (my first-pass "aud disabled" suspicion was REFUTED) |
| 10 | "alg=none / HS256 rejected" is actually tested, not just string-asserted | **confirmed** | `test_jwt_signature_verification.py:146-181` craft real tokens |
| 11 | LTI launch *endpoint* works end-to-end against a real platform | **refuted** | `lms_views.py:79` passes `{}` → `lms_service.py:184` returns None (F1) |
| 12 | SSO callback completes the OIDC code-for-token exchange + creates a session | **refuted** | `sso_views.py:95-102` stub message, no exchange, no `state` check (F2) |
| 13 | Grade-passback AGS endpoints come from the verified launch (not client) | **refuted** | `lms_views.py:186-188` taken from request body (F3) |
| 14 | SAML 2.0 supported | **refuted** | advertised `sso_views.py:161,295,307,313` but no SAML code in `sso_service.py` (F8) |
| 15 | `urls.py` is the documented ~487-line / 198-endpoint file | **confirmed** | 487 lines, 198 `path(`, SSO/LTI imported+routed `:199,201,431-437,456-460` (F5) |
| 16 | `cleanup_expired_lti_nonces` task exists (per models.py:1290 docstring) | **refuted** | not defined in `tasks.py` (F4) |

---

## (d) Prioritized recommendations toward "world-class"

1. **Finish the launch view (F1):** resolve `platform_config` (jwks_url/client_id/issuer/deployment) from the verified issuer before calling `validate_launch_request`; add an end-to-end route test with a signed token. Without this the otherwise-correct verifier is unreachable.
2. **Finish or honestly scope the SSO callback (F2):** implement code exchange + `state`/`nonce` server-side binding + `provision_user`, or document a public-client/PKCE frontend exchange and remove the "in production…" stub message.
3. **Close the grade-passback SSRF/credential-leak (F3):** never trust client-supplied `token_url`/`lineitem_url`/`client_id`; bind them to the verified launch session and allowlist platform hosts; require instructor role.
4. **Pin `python-jose` (F6)** to a CVE-patched version (or move to PyJWT/authlib) and re-run the negative-token tests.
5. **Add the missing `cleanup_expired_lti_nonces` Celery task (F4)** (or remove the models.py:1290 docstring promise) so the nonce table doesn't grow unbounded.
6. **Drop or implement SAML (F8)** so advertised protocols match reality.
7. **Keep doing what's already right:** the JWKS HTTPS-only fetch, alg allowlist, behavioral signature tests, DB-enforced nonce single-use, and real JWKS modulus are all good practice — preserve them and add the missing audience/deployment_id assertion on the LTI side once F1 wires real config.
