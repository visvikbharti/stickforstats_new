# Session handoff — 2026-06-29

**Timestamp:** 2026-06-29 (IST). **Branch:** `docs/plos-compbio-submission` (== `main`, both current).
**Purpose:** a durable record of what this session did, the current state of everything, the decisions made,
and what's left — so work can resume cleanly and the PI can be briefed. The *action checklist* lives in
**`docs/NEXT_STEPS_2026-06-29.md`**; this file is the *narrative + state + pointers*.

---

## 1. TL;DR

The manuscript-verification line is now **shipped end-to-end** (UI live on the beta, backend hardened, Python
SDK published to PyPI), the **GitHub branch clutter is cleaned up** (13 → 2; `main` is current again), and the
**publication program is reorganized into two papers** with both manuscripts drafted and rendered to PDF. What
remains is a small set of **human-only steps** (mint a Zenodo DOI, file an OSF pre-registration + run the κ
double-coding, pick venues) — all captured in the action plan.

---

## 2. What shipped this session (the arc)

1. **Manuscript Verifier — web UI** (`frontend/src/components/manuscript/BundleVerifier.jsx` +
   `VerificationReport.jsx`, route `/manuscript-verifier`). Multi-file bundle upload → `POST /api/v1/verify/bundle/`
   → per-claim verdicts, citation–content conflicts, ingestion report. 57/57 manuscript tests pass; reviewed by a
   3-lens adversarial pass; all findings fixed.
2. **Nav clarity** — disambiguated the three manuscript surfaces (Review vs Verifier vs Reviewer Mode) with
   nav descriptors + reciprocal cross-links.
3. **Backend hardening** — the `/verify/*` endpoints got per-IP + per-user rate limits and a `VERIFY_REQUIRE_AUTH`
   toggle (open behind the beta gate by default; flip to require login before public launch). 9/9 verify tests pass.
4. **API docs** — the verify endpoints added to the in-app `/api-docs`.
5. **Deployed to the live beta** (`https://stickforstats.com`) — frontend + backend rebuilt and redeployed;
   migration `0015` applied; smoke-tested; the closed-beta Basic-Auth gate intact.
6. **Python SDK 0.4.0** — added `client.verify` (`bundle` / `analyze` / `report`) + `sfs verify` CLI;
   **published to PyPI** via trusted publishing (tag `sdk-v0.4.0`). `pip install -U stickforstats` now ships the
   verifier client.
7. **Branch cleanup** — audited all 13 branches; **rescued an orphaned production fix** (Redis startup-ping
   timeout) into the active branch; **merged the active branch into `main`** (clean fast-forward); **deleted the
   11 redundant branches**. Only `main` and `docs/plos-compbio-submission` remain.
8. **Two-paper publication plan** adopted + propagated; the **verifier folded into the census paper** as its
   Methods backbone (new "verification engine" Methods section); **κ coder packet** created; both manuscripts
   **rendered to PDF**; the **`NEXT_STEPS` action plan** written.

---

## 3. Current state

**Live / deployed**
- Web app: `https://stickforstats.com` (closed beta, Basic-Auth). Manuscript Verifier at `/manuscript-verifier`.
- Prod VPS: Hetzner `91.98.93.98`, `/opt/stickforstats_new`, Docker Compose. Currently tracks the feature branch
  (could be repointed to `main` now — optional).
- PyPI: `stickforstats` **0.4.0** (library + `sfs` CLI).
- bioRxiv: platform paper v1 LIVE (doi **10.64898/2026.06.15.732278**) — needs a **v2** with the integrity fixes.

**Repo / git**
- Branches: **`main`** (current) and **`docs/plos-compbio-submission`** (identical). Use either.
- All session work committed + pushed. Rendered `*_rendered.pdf` files are local build artifacts (gitignored).

**Papers**
- **Paper 1 — Platform/Guardian** (`paper/submission_package/`): content-ready (integrity fixes applied);
  PDF rendered with figures. Needs: Zenodo DOI → bioRxiv v2 → venue → submit.
- **Paper 2 — Verifier + Census** (`paper/census_paper/`): descriptive draft + verifier Methods section done;
  PDF rendered. Needs: OSF pre-reg filing → κ double-coding → confirmatory run → venue → submit.
- (Originally three papers; the verifier-tool paper was **merged into paper 2** — see Decisions.)

---

## 4. Decisions made (with rationale)

- **Two papers, not three** (2026-06-29). Platform paper stands alone; the verification engine is folded into the
  census paper as its Methods backbone, with the census as the headline result. *Why:* two tool papers from one
  codebase risks a salami-slicing perception (especially damaging for a research-integrity project); the verifier's
  natural home is as the method behind the census it produced; it's the least additional work; and it leaves the
  ready-to-submit platform paper untouched.
- **Keep all three manuscript UIs** (Review / Verifier / Reviewer Mode) — they're complementary, not duplicates
  (Review = internal-consistency, any paper, no data; Verifier = re-runs tests on attached data; Reviewer Mode =
  editor view of a Review). Fixed the confusion with nav descriptors + cross-links rather than deleting anything.
- **Verifier stays in the running webapp** (one backend, one deploy), per the prior "shared engine, separate
  surface" decision — not a separate service.

---

## 5. What's pending → see `docs/NEXT_STEPS_2026-06-29.md`

The 3 human-only blockers: **(1)** mint the Zenodo DOI; **(2)** file the OSF pre-reg + run the κ coding (2 lab
members); **(3)** pick the two venues. Everything else (add the DOI, re-render, reformat to venue, cover letter,
run `compute_kappa.py`, the confirmatory census, finish the census manuscript) is assistant-doable on request.

---

## 6. Reading order for the PI

1. **`docs/NEXT_STEPS_2026-06-29.md`** — the action plan: what's left, in order, and the decisions needed (venues,
   Zenodo, OSF). *Start here.*
2. **This file** (`docs/SESSION_HANDOFF_2026-06-29.md`) — what was done + current state + the two-paper rationale.
3. **`paper/submission_package/manuscript_rendered.pdf`** — Paper 1 (the platform paper) as it will be submitted.
4. **`paper/submission_package/SUBMISSION_GUIDE.md`** — venue shortlist + APCs + the pre-submission checklist for Paper 1.
5. **`paper/submission_package/CHANGES_FROM_PREPRINT.md`** — the two integrity corrections (for transparency / the PI's awareness).
6. **`paper/census_paper/manuscript_rendered.pdf`** — Paper 2 (verifier + census).
7. **`paper/census_paper/STATUS.md`** + **`PREREGISTRATION.md`** — Paper 2 state + the pre-reg to file (needs 2 coder names).
8. *(Background, optional)* **`docs/PROJECT_ONBOARDING_2026-06-27.md`** — the full system/code map for a newcomer.

---

## 7. Guardrails / gotchas (unchanged, still apply)

- Active branch = `docs/plos-compbio-submission` (== `main`). Don't force-push.
- Backend uses the **`.venv-django`** virtualenv; run Django tests with `DJANGO_DEBUG=True`.
- Migration **`0015`** must be applied on any deploy (already applied on prod).
- The **3.2 GB census corpus lives only on the external drive `/Volumes/My_Passport`** — mount it before any
  census re-run / figure regeneration. Reading docs doesn't need it.
- The figure-OCR **vision tier stays OFF** (privacy) unless a deliberate decision is made.
- Conventions: Conventional Commits; **no `Co-Authored-By` trailer**; never write the word "Turnitin".
- Rendered PDFs are gitignored build artifacts; re-render via the pandoc→Chrome pipeline (use `--self-contained`
  + `--resource-path` to embed figures; platform figures live in `paper/plos_compbio/figures_plos/`).

---

## 8. Key session commits (branch `docs/plos-compbio-submission`, mirrored to `main`)

| Commit | What |
|---|---|
| `5463bc4` | feat(frontend): Manuscript Verifier UI |
| `29c27b5` | feat(frontend): Review vs Verifier nav clarity |
| `900296a` | feat(verify): rate-limit + auth toggle + API docs |
| `7561978` | fix(settings): rescued Redis ping-timeout prod fix |
| `5e39d38` (+ tag `sdk-v0.4.0`) | feat(sdk): verify module + CLI (PyPI 0.4.0) |
| `fe82818`, `f792612` | docs: two-paper structure + κ coder packet + track SUBMISSION_GUIDE |
| `d05ee71` | docs(census): "verification engine" Methods section |
| `e082c2b` | docs: NEXT_STEPS action plan |
| (this) | docs: session handoff |

*End of handoff. Resume from `docs/NEXT_STEPS_2026-06-29.md`.*
