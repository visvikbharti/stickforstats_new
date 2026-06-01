# Audit P0 remediation + closed-beta hardening

**Branch:** `fix/audit-p0-scientific-integrity` → `main`
**Scope:** Remediate the P0 findings of the 2026-05-31 ground-truth audit (scientific integrity,
security, statistical correctness), harden for a closed/invite-only beta, and make the front end
honest. 28 commits.

> Every change was ground-truthed against the actual code before editing; ~7 audit findings were
> **refuted** on verification and deliberately NOT "fixed". Each fix has tests. No commit carries a
> Co-Authored-By trailer (project convention). The word "Turnitin" was removed per maintainer
> instruction.

## Test / lint status (all green, run locally on this branch)
- **Backend:** `python manage.py test` → **831 passed, 0 failures**
- **Frontend:** `react-scripts test --watchAll=false` → **654 passed, 30/30 suites**
- **flake8:** 0 issues · **ESLint** `src/ --max-warnings 0`: 0 problems
- New deployment smoke test: `scripts/smoke_test.sh` (validated against a running build)

---

## What changed, by theme

### Scientific integrity (the publication gate)
- **CRISPR Case Study 1 made reproducible** (`ff1a4d4`) — added `paper/replication/case_study_1_crispr.py`
  + committed data; wired into `MASTER_VERIFICATION.py`. (The audit's "no replication script"
  finding was scoped only to `paper/replication/`; the data existed under `examples/` and reproduces
  the manuscript numbers exactly — F=1122.0979, H=36.5888.)
- **Removed a fabricated "real-time validation metrics" endpoint + a fake CI-coverage simulation**
  (`3a0922b`); **corrected `validation_framework`'s scipy-vs-itself "validation" and 50-digit
  overclaim** (`ac5eff0`); **superseded the stale "Paper Ready" integrity certificate** (`00b3122`).

### Security (closed-beta blockers)
- **SSRF guard** on the LMS grade-passback outbound URLs (`ddc52b6`).
- **Manuscript-report IDOR closed** with per-submission share tokens (`3bf438d`, completed in
  `f54bee8`; batch-token regression fixed in `6489862`).
- **GDPR erasure** now actually deletes the user's analysis sessions and drops the phantom
  "datasets" category it couldn't honor (`0705cc4`).
- **Config/secrets hardening** (`831197f`): SECRET_KEY fails closed when serving in prod;
  docker-compose secrets fail-closed; `testserver` dropped from prod ALLOWED_HOSTS; python-jose
  pinned past CVE-2024-33663/33664.
- **Upload size caps** on the public file endpoints (`be8819e`).

### Statistical correctness (no wrong / fabricated numbers to users)
- **Two-sample t-test** reports undefined edge cases honestly instead of fabricating
  `t=999.999`/`p=1e-50` (`d21cddb`).
- **hp_anova** two-way/RM/MANOVA now `raise NotImplementedError` instead of silently returning
  `None` (`ec7068e`).
- **Cascade chi-square/Fisher** handle string categories and label r×c fallbacks honestly (was
  chi-square mislabeled "Odds Ratio") (`7433558`).
- **`stats/regression/`** routed to the real high-precision engine instead of a float64 stub that
  falsely advertised "50 decimals" (`28ac6e5`).

### Test integrity
- **Rate limiting disabled under the test runner** (`f8cee5c`) — fixed a 76-failure "429" storm that
  prevented the API suite from gating CI (and which had masked a real batch-submit regression).
- **Per-test unique LTI nonce** (`e8c88d0`) — fixed a pre-existing full-suite isolation failure
  exposed once the suite could run end to end.

### Frontend honesty pass (the credibility / "laugh-risk" fixes)
- Welcome modal now **dismisses permanently** and drops the "world's most comprehensive platform"
  overclaim (`b49ae80`); dashboard **fabricated gamification removed** (hardcoded Level/XP/streak +
  fake Achievements tab) in favor of an honest capability summary (`b49ae80`, `8ab439e`); t-test
  precision copy corrected. Verified against a fresh production build via screenshots.
- Removed the "Turnitin" brand name (`3e46532`); inline-Acklam → existing jStat dependency
  (`8b6b320`).

### Docs (committed in-branch)
- `docs/AUDIT_2026-05-31/` (23 subsystem reports + master) — the audit this PR acts on.
- `docs/BETA_DEPLOYMENT_CHECKLIST.md` — closed-beta go/no-go (§1-§5 code-side done; §5 deploy + §6
  merge/tag remain as operator actions).
- `docs/STRATEGY_AND_POSITIONING_2026-06-01.md` — honest capabilities assessment, UX review, and the
  focused positioning (product = manuscript verification; moat = verifiable provenance).

---

## Deliberately NOT changed (audit findings refuted on ground-truthing)
- ST-4 multivariate "ImportError" — false; `__init__` guards its imports and nothing references the
  nonexistent `PowerAnalysisService`.
- "Dead nav links" (/statistical-tests, /test-selection) — a testing artifact; nothing links there
  and the app has a graceful `*`→404.
- The PLOS confidence-formula "degenerate dead code" finding — refuted; the paper matches the
  production formula.
- (Plus billing-is-a-stub, CRISPR-unbacked, no-Dataset-model GDPR scope — all corrected vs the audit.)

## Known deferred (non-blocking, documented)
- Per-module dashboard cards still show hardcoded "Completed/100%/In Progress" curriculum status
  (lower severity than the XP/Achievements removed here).
- §5 deploy + smoke-test and §6 tag are operator/deploy actions (need Docker + a host + the `.env`).
- The PLOS manuscript's full claims-register should be re-checked before submission.

## Reviewer notes
- Suggested merge: squash-or-rebase is fine; commits are individually green and message-documented.
- After merge: run `scripts/smoke_test.sh` against the deployed staging URL (it expects the
  manuscript token flow to PASS there, vs the local SKIP when DB persistence is off).
