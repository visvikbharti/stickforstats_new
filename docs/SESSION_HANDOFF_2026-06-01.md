# Session Handoff — 2026-06-01

> **Dated snapshot — superseded.** This records what was believed on the date in its title.
> For the current state of the project, start at [`README.md`](README.md) (the undated index),
> then [`STATUS_2026-07-14.md`](STATUS_2026-07-14.md) and [`TODO_2026-07-14.md`](TODO_2026-07-14.md).
> **Do not trust a "Still open" section in a dated document without re-checking it.**

**Theme:** Ship the audit-remediation branch, cut the first beta release, publish the `sfs` CLI to
PyPI, and write the production deploy runbook. **Everything that can be done without a deploy host is
now done.** The single remaining gate to invite beta testers is the **host deploy** + the **§0
beta-shape** product items.

---

## 1. What we accomplished this session

### Release engineering
- **Opened, CI-gated, and merged PR #1** ("Audit P0 remediation + closed-beta hardening") into `main`
  via admin squash-merge → commit `ba0e119`. All 5 required checks green (Backend/Frontend/SDK Lint +
  Backend/Frontend Test). Playwright E2E is `continue-on-error` (non-gating; known deferred flake).
- **Released `v1.0.0-beta.1`** — annotated tag on `ba0e119` + GitHub **prerelease**:
  https://github.com/visvikbharti/stickforstats_new/releases/tag/v1.0.0-beta.1
- **GHCR images published** (on the merge-to-`main` pipeline):
  `ghcr.io/visvikbharti/stickforstats_new/backend:latest` (+`:<sha>`) and `.../frontend:latest`.
  `Deploy to Staging` CI job is a **placeholder echo** — no real deploy happens from CI.
- **Local deploy smoke = 7/7 PASS** earlier (health, t-test, ANOVA, high-precision regression, and the
  manuscript share-token IDOR flow with-token→200 / without-token→404, against a freshly migrated DB).

### `sfs` CLI → PyPI
- Added the **publish pipeline** `.github/workflows/publish-sdk.yml` (OIDC Trusted Publishing — no
  tokens stored; TestPyPI dry-run + PyPI on `sdk-v*` tag; enforces tag == pyproject version).
- Wrote `docs/CLI_QUICKSTART.md` and fixed the SDK's PyPI metadata (was a "world platform" overclaim +
  nonexistent URLs).
- **TestPyPI dry-run caught a real bug**: the SDK requires **Python ≥3.10** (pydantic evaluates
  `X | None` annotations at runtime) but claimed `>=3.8`. Fixed → **bumped to 0.2.1**, dropped false
  3.8/3.9 classifiers.
- **Published `stickforstats` 0.2.1 to real PyPI** via the `sdk-v0.2.1` tag.
  Live: https://pypi.org/project/stickforstats/ — `pip install "stickforstats[cli]"` works (Py ≥3.10).
- **Decision: keep the 3.10+ floor** (not lower to 3.9). 3.8/3.9 are EOL; modern numpy/scipy already
  need 3.10+. Conda users on a 3.9 `base` should `conda create -y -n sfs python=3.11` (documented in
  the quickstart). *(3.9 was technically feasible via `eval_type_backport` — kept as a fallback only.)*

### Documentation
- **`docs/DEPLOYMENT_RUNBOOK.md`** — single-host docker-compose closed-beta runbook, built via a
  multi-agent workflow (parallel ground-truth readers → synthesize → adversarial verify) and
  hand-corrected on 5 verifier catches. Honestly documents the real shipped gotchas with inline fixes
  (see §4 below).

### Housekeeping
- Reconciled `main` (local == `origin/main` = `caafbd6`).
- Deleted the two plaintext PyPI/TestPyPI 2FA recovery-code files from `~/Downloads` (did not read
  them). **Left untouched:** `~/Downloads/github-recovery-codes.txt` (still there — operator decision).

---

## 2. Current state (verified)

| Thing | State |
|---|---|
| `main` | `caafbd6` — local == `origin/main` |
| Platform tag | `v1.0.0-beta.1` (commit `ba0e119`, GitHub prerelease) |
| SDK tag | `sdk-v0.2.1` |
| PyPI | `stickforstats` **0.2.1** live (requires-python ≥3.10) |
| GHCR | `backend` + `frontend` images published (`:latest` + `:<sha>`) |
| Tests (from PR) | backend **831/831**, frontend **654/654**, flake8 0, ESLint 0 |
| Beta checklist | §1–§5 code-side ✅, §6 merge/tag/release ✅ |

---

## 3. What's left — prioritized

### P0 — the one gate to invite beta testers
1. **Host deploy.** Execute `docs/DEPLOYMENT_RUNBOOK.md` on a real Linux host: provision → install
   Docker → pull GHCR images + retag → write `.env` (strong secrets) → TLS certs → `docker compose up
   -d --no-build` → `migrate`/`collectstatic`/`createsuperuser` → `scripts/smoke_test.sh` against the
   live HTTPS URL (expect **7/7**). **Needs from you:** a host, a domain + DNS A record, and (for real
   TLS) Let's Encrypt access. *This is operator work I can guide but can't do — I have no host.*
2. **§0 beta-shape** (`docs/BETA_DEPLOYMENT_CHECKLIST.md` §0; partly code):
   - Invite-only access (login or invite token — extend the per-submission share-token pattern).
   - Persistent "Beta — results may change; please report issues" banner on every page.
   - One monitored feedback channel (email alias / form / GitHub issue template).
   - Data/privacy + erasure notice (GDPR erase is real).

### P1 — quality / hardening (can run during beta)
- **Add `sdk/python/tests/`** — the `sfs` CLI is lint-clean but **untested** (CI "SDK Test" is a no-op
  over an empty dir).
- **`paths-ignore` on `.github/workflows/ci.yml`** — every push to `main` (even docs) re-runs the full
  heavy build. Add path filters.
- **Retire/rewrite `docs/DEPLOYMENT_GUIDE.md`** — flagged as largely aspirational/stale; the runbook
  supersedes it for single-host.
- **Playwright E2E flake (P6.3)** — investigate, then flip `continue-on-error` off so it gates.
- **README metrics** — older badges (e.g. `38/38`) are stale vs current 831/654.

### P2 — strategic (the moat)
- Build the **"reproducibility receipt"** provenance feature (signed, shareable, hash-stamped audit
  artifact from Guardian) — see `docs/STRATEGY_AND_POSITIONING_2026-06-01.md`.
- Reframe the papers around verification + provenance.

### Housekeeping / decisions pending
- GitHub recovery-codes file in `~/Downloads` (delete once stored in a password manager).
- PI review of Case Study 4 + PLOS submission; compliance-docs scope decision (Phase 5).

---

## 4. Gotchas to remember (don't re-trip these)
- **Deploy:** the runbook documents these with fixes — port-80 frontend/nginx collision; missing
  `backend/sql/init.sql` bind mount; empty `nginx/ssl/` (needs `cert.pem`+`key.pem`) + dead
  `sites-enabled/`; compose **builds locally** (doesn't pull GHCR) unless you retag + `--no-build`;
  `migrate`/`collectstatic` are **manual**; internal ports default to `0.0.0.0` (bind `127.0.0.1`).
- **CI:** every `main` push re-runs the full pipeline (no path filters). `publish-sdk.yml` runs only on
  `workflow_dispatch` or `sdk-v*` tags. `cancel-in-progress` concurrency can cancel an in-flight run if
  you push again quickly.
- **PyPI:** future SDK releases = bump `sdk/python/pyproject.toml` version, then
  `git tag sdk-v<ver> && git push origin sdk-v<ver>`. pip caches the index — use `--no-cache-dir` when
  re-testing a fresh upload.
- **Branch protection:** `main` requires 1 review; you're the sole author so merges need an admin
  override (`enforce_admins=false` permits it). Doc pushes to `main` this session used admin push.

---

## 5. Key artifacts (read these to regain context)
- `docs/SESSION_HANDOFF_2026-06-01.md` — this file.
- `docs/NEXT_SESSION_PROMPT.md` — the prompt to paste next session.
- `docs/DEPLOYMENT_RUNBOOK.md` — how to deploy (P0).
- `docs/BETA_DEPLOYMENT_CHECKLIST.md` — go/no-go gate + §0 beta-shape.
- `docs/CLI_QUICKSTART.md` — `sfs` usage.
- `docs/STRATEGY_AND_POSITIONING_2026-06-01.md` — positioning + the provenance-receipt idea.
- `docs/PR_audit_p0_remediation.md` — what shipped in PR #1.
- Memory: `strategy-positioning-2026-06-01.md` (the running session memory).
