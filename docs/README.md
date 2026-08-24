# StickForStats — documentation index

**This file is never dated and is always current. It points at the newest timestamped documents.**
Everything else in `docs/` is a dated snapshot: true when written, and *not* maintained afterwards.
If a dated document disagrees with this index, the index wins — and the dated one should be left
alone as a record of what was believed at the time.

> A stale "still open" bullet in an old handoff caused a false claim to be repeated for two days
> running. **Date every document, trust the newest, verify before repeating anything.**

---

## Read these first — current as of **2026-08-24**

> 🔧 **[`STATUS_2026-08-24.md`](STATUS_2026-08-24.md) is the newest document.** It answers the
> cherry-pick question (**do not ship** — the pair fails on `main`, and there is no small honest
> unit), records that `5c87d00`'s own guard silenced genuine violations on offset data and how it
> was fixed, and lists three numbers from the day before that did not reproduce.
>
> [`STATUS_2026-08-21.md`](STATUS_2026-08-21.md) is the previous one. It covers the
> verifier/Guardian arc on `feat/appropriateness-v2` (10 commits, **nothing deployed**, `main`
> untouched at `51f58d7`), including two false clean bills that are live in the released v1.2.0,
> the corrected census figure (11.1% → 11.8%), and the single architectural cause behind six
> sessions of defects. The submission facts below are unchanged and still current.

## Submission state — current as of **2026-08-05**

> ✅ **SUBMITTED to BMC Bioinformatics on 2026-08-05** — submission
> `64da7fba-9eef-454c-bf56-30e2d1afd762`, at technical check. Read
> [`STATUS_2026-08-05.md`](STATUS_2026-08-05.md) first; it supersedes the 2026-07-14 set and every
> earlier "still blocking" list.
>
> Submitted against **v1.2.0** (tag `41d4a27`, Zenodo `10.5281/zenodo.21797621`). Production runs that
> build. **Two things to remember:** revoke the `bmc-reviewer` account when review closes, and do not
> roll production below v1.2.0 while reviewers may be looking.
>
> The earlier warning here said *"Do not submit against Zenodo v1.1.0"* — that is now resolved; v1.2.0
> is cut, archived and deployed.

| order | document | what you get |
|---|---|---|
| — | [`STATUS_2026-08-24.md`](STATUS_2026-08-24.md) | **newest.** The cherry-pick verdict, the shift-invariance defect in the fix itself, the CSV/float32 scope limit, and what did not reproduce |
| — | [`STATUS_2026-08-21.md`](STATUS_2026-08-21.md) | superseded. The verifier/Guardian arc: what is on the unmerged branch, what is live-broken in v1.2.0, the corrected corpus numbers, and the architectural cause |
| 0 | [`STATUS_2026-08-05.md`](STATUS_2026-08-05.md) | **submission state.** Submission state, what was fixed to get there, the two post-submission obligations, and what is genuinely still open |
| 1 | [`BMC_SUBMISSION_VERIFICATION_2026-08-04.md`](BMC_SUBMISSION_VERIFICATION_2026-08-04.md) | the full audit ledger — every manuscript number re-executed, four rounds, each finding adversarially re-checked. **Also records the mistakes I made and corrected** |
| 2 | [`STATUS_2026-07-14.md`](STATUS_2026-07-14.md) | superseded, but still the best description of the codebase itself |
| 3 | [`TODO_2026-07-14.md`](TODO_2026-07-14.md) | the work queue, ordered by risk to a user's scientific conclusion |
| 4 | [`DEFECTS_AND_PATTERNS_2026-07-14.md`](DEFECTS_AND_PATTERNS_2026-07-14.md) | **the most useful document here.** The four bug classes that keep recurring, why they recur, and what actually stops them |
| 5 | [`ROADMAP_2026-07-14.md`](ROADMAP_2026-07-14.md) | where the product goes, and in what order |

Living documents (not dated — keep them current):

- [`DEPLOYMENT_RUNBOOK.md`](DEPLOYMENT_RUNBOOK.md) — deploy and rollback procedure.

## The four rules

They are the real deliverable of the last month, and they belong on the front page:

1. **One rule, one place.** A value re-derived at five call sites was wrong five times.
2. **Mutation-check every test.** Put the bug back; if the test still passes, it tests nothing.
   *(And confirm the mutation actually applied — a substitution that silently fails to match gives you
   a green run and a lie.)*
3. **Execute the artifact, don't read it.** Reading the exported R/Python scripts found nothing for
   three rounds. *Running* them found a 34-point contradiction immediately.
4. **Never type a number you have not run — especially in prose.** All six fabrications in the recent
   arc were in comments, docstrings and commit messages, where no test can reach. Every one passed CI.
5. **A label can lie — assert BEHAVIOUR.** The live site listed `similar_shapes` in
   `assumptions_checked` precisely *because* nothing evaluated it. Verify what the software *does*.
6. **A plausible-looking test proves nothing.** An escaping test used a string reportlab happens to
   tolerate, so the mutation survived. Mutation-check with data that reproduces the *actual* failure.
7. **Artifacts lie too — extract and grep them.** A 45 KB PDF with a valid header was a rendered
   "file not found" page; the cover letter in the portal still said "eight validators" an hour before
   submission. Neither was visible by reading.

## Naming convention

New status/handoff/plan documents are named `NAME_YYYY-MM-DD.md`. **Add a row to the table above when
you write one** and move the previous one into History. That is the whole protocol; it exists so the
next person can find the current truth in one step instead of reading four contradictory handoffs.

---

## Corrections to what this file used to say

The previous version of this README was a project overview from an earlier era. Two of its claims were
false by the time anyone read them, and both are the kind of thing that gets repeated:

- ~~"Confidence Intervals — Fully validated against SciPy"~~ — **not true.** On 2026-07-14 the
  t-critical value was found to return the *normal* quantile for `df > 30`, so a nominal 95% interval
  covered **94.3%** (measured over 20,000 simulations). Fixed in `cfe14c1`. It is validated *now*.
- ~~"Power analysis: Not implemented"~~ — it is now the **most heavily verified module in the
  codebase**: backend exact non-central distributions, cross-checked against statsmodels across 22
  designs, worst disagreement 2.4e-8.

Both claims sat in the README for months. That is why this file is now an index and not a status
report: **an index can only be out of date about where to look, not about what is true.**

## Technology

- Backend: Django 4.2 + DRF · NumPy, SciPy, pandas, statsmodels, mpmath (50-digit engine)
- Frontend: React 18 + Material-UI
- Deploy: Docker Compose on Hetzner; images from GHCR (see `STATUS_2026-07-14.md` §3)

```bash
# Backend  (use .venv-django; bare pytest fails — settings unconfigured)
cd backend && DJANGO_SETTINGS_MODULE=stickforstats.settings python manage.py test

# Frontend (bare `npx jest` fails — no babel)
cd frontend && CI=true npx react-scripts test --watchAll=false
```

## History — dated snapshots, superseded but kept

Newest first. Records of what was believed at the time; **do not trust their "still open" sections**
without checking.

- `SESSION_HANDOFF_2026-07-13-POWER.md` — the 8-round power-analysis arc in detail. (Its "Still open"
  section is **wrong** about the beta password — see `STATUS_2026-07-14.md` §5.)
- `SESSION_HANDOFF_2026-07-13.md` — click-through P0s, password rotation, deploy.
- `SESSION_HANDOFF_2026-07-11.md` — integrity marathon; Guardian made design-aware.
- `IA_CONSOLIDATION_PLAN_2026-07-10.md` — information-architecture consolidation.
- `MANUSCRIPT_MODULE_TODO_2026-06-24.md` — manuscript-verification work items (9 still open).
- `PROJECT_ONBOARDING_2026-06-27.md` — cross-reference engine; bundle ingestion.
- `CRITICAL_REVIEW_2026-05-06.md` — the 9-agent audit.
- `TRANSFORMATION_PLAN_v2.md` — the v2.0 seven-phase plan.
