# Project onboarding & handoff — StickForStats + the manuscript-verification line

**Written:** 2026-06-27. **Author of this snapshot:** Vishal Bharti (with AI assistance).
**Audience:** a person new to the lab inheriting this project. **Read this file first, top to bottom,
before opening any code.** It tells you what exists, the order to read it in, where every file is, and—
critically—**what not to break.**

---

## 0. ⚠️ READ THIS BEFORE TOUCHING ANYTHING (guardrails)

1. **Active branch is `docs/plos-compbio-submission`, NOT `main`.** All of the recent work (the
   manuscript-verification module, the cross-reference engine, the papers) lives on this branch and is
   **not merged to `main`**. Do not merge to `main` or force-push without the PI/owner's review.
   `git checkout docs/plos-compbio-submission` to see it.
2. **Use the `.venv-django` virtualenv, not system Python.** The system SciPy build is ABI-broken; only
   `.venv-django/bin/python` works for the backend. Django tests run with `DJANGO_DEBUG=True`
   (otherwise `SECURE_SSL_REDIRECT` returns 301 and every API test "fails").
3. **There is a DB migration `0015`** (`backend/core/migrations/0015_…`). It must be applied on any deploy.
   Do **not** hand-edit it or create a conflicting migration.
4. **The 3.2 GB census corpus lives ONLY on the external drive `/Volumes/My_Passport`, not in git.**
   Mount it before running anything in `paper/replication/verification/` or regenerating figures. Reading
   the docs/reports does **not** need it.
5. **The verifier is deterministic and makes no external network calls by default** (no LLM egress). The
   figure-OCR **vision tier is OFF by default and must stay that way** unless the privacy decision is made
   (manuscripts are confidential pre-publication). See `docs/manuscript_verifier/DECISIONS.md` D5/D7.
6. **Run the test suite before and after any change.** There are 170+ tests for the new work alone. The
   project habit (proven to catch real bugs) is: **adversarially re-check every change before committing.**
7. **Do not re-run `paper/census_paper/build_gold_set.py` once the human coders have started filling the
   sheet** — it regenerates a blank sheet and would wipe their work.
8. **Commit style:** Conventional Commits (`feat(scope): …`, `fix(scope): …`, `docs(scope): …`),
   imperative, with a body explaining *why*. Commit/push only when the owner asks. No `Co-Authored-By`
   trailer on this project. Never write the word "Turnitin" in any file (use "statistical-verification tool").

---

## 1. What this project is

**StickForStats** is an open-source statistical platform (React frontend + Django REST backend) whose
headline feature is the **Guardian system**: it checks a statistical test's assumptions *automatically*
before running it and reroutes to an appropriate nonparametric alternative when they fail. Repo:
`github.com/visvikbharti/stickforstats_new`.

On top of the platform sits a newer research line — the **manuscript-verification module** — which extracts
the statistics reported in a paper and checks/re-runs them. That module grew, in this branch, into two things:
- a **multi-file ingestion + cross-reference engine** (the new code; see §3), and
- two **meta-research outputs**: a 10,103-paper consistency census and the platform paper, both being
  prepared for publication (§5).

---

## 2. Where to begin — the reading path (in order)

Read these in sequence; each builds on the last. Paths are from the repo root.

**A. Orientation (≈30 min)**
1. **This file.**
2. `paper/submission_package/manuscript.md` — the platform paper. The fastest way to understand *what the
   whole system does and why* (Guardian, the case studies, the validation).
3. `docs/manuscript_verifier/README.md` — the index/map of the new verification module.

**B. The new engine — design before code (≈1 hr)**
4. `docs/INGESTION_ARCHITECTURE.md` — how the tool ingests a multi-file bundle (Word/PDF/Excel/CSV/JATS/
   images) and the two "jobs" (read the reported stats vs re-run the data).
5. `docs/manuscript_verifier/XREF_RESOLUTION_DESIGN.md` — the cross-reference engine: how an author's
   "Supplementary Table S3" pointer is resolved to the right artifact/data.
6. `docs/manuscript_verifier/XREF_RESOLUTION_WORKPLAN.md` — the 7-phase plan **with the live status table**
   (which phases are done). This is the canonical "where are we".
7. `docs/manuscript_verifier/DECISIONS.md` — every design decision (D1–D7) and the rationale.

**C. The code (≈2 hr, read in dependency order — see §3).**

**D. The papers / publication state (≈30 min)**
8. `paper/submission_package/README.md` + `SUBMISSION_GUIDE.md` — the platform paper, ready to resubmit.
9. `paper/census_paper/STATUS.md` then `manuscript.md` then `PREREGISTRATION.md` — the census paper.

---

## 3. Code map — where everything lives (read in this order)

The new engine is in **`backend/core/manuscript/`** (part of the existing `core` Django app — *not* a
separate service). Read the modules in dependency order:

| Order | File | Role |
|---|---|---|
| 1 | `reference_types.py` | the shared vocabulary: `ReferenceKey`, `ArtifactRef`, `Artifact`, `ResolvedLink` |
| 2 | `reference_grammar.py` | normalize "Supplementary Table S3" → a canonical key; supplement-filename parsing |
| 3 | `jats_parser.py` | parse JATS/NLM XML; emits the machine-readable cross-reference graph (artifacts + xrefs) |
| 4 | `parser.py` | parse PDF/DOCX/LaTeX manuscript text (incl. table cells) |
| 5 | `image_ocr.py` / `figure_extractor.py` | OCR for figure images / scanned PDFs; the opt-in vision tier (OFF by default) |
| 6 | `data_loader.py` | bounded loader for CSV/Excel/SPSS/SAS/Stata/JSON |
| 7 | `artifact_index.py` | build the per-file index of addressable artifacts (JATS + caption-based) |
| 8 | `reference_resolver.py` | resolve a claim's references to artifacts (JATS-exact → label → ambiguous) |
| 9 | `claim_extractor.py` | the regex extractor that pulls statistical claims from text |
| 10 | `claim_data_linker.py` / `reference_linker.py` | link a claim to data columns; **citation-directed** file selection + conflict flags |
| 11 | `verdicts.py` | the per-claim verdict model + provenance fields |
| 12 | `verify_pipeline.py` | the orchestrator: `verify_segments()` (per-file extraction + resolution + verify) |
| 13 | `reanalysis_engine.py` | re-run the authors' test on their data → VERIFIED/DISCREPANT/… |
| 14 | `bundle_ingest.py` | the multi-file bundle: classify → parse/OCR/load → assemble |
| 15 | `verification_service.py` | Django persistence adapter |

**API surface:** `backend/api/v1/verify_views.py` — `POST /api/v1/verify/bundle/` (the editor multi-file
case) and `POST /api/v1/verify/analyze/`. Routed in `backend/api/v1/urls.py`. Classification helper:
`backend/api/v1/_upload_utils.py`.

**Persistence:** `backend/core/models.py` — `VerificationRun`, `ClaimVerdictRecord`, `LinkedDataset`,
`ClaimDatasetLink` (the new join). Migration `backend/core/migrations/0015_…`.

**Tests:** `backend/core/tests/test_xref_phase0..5.py`, `test_ingestion_bundle.py`, `test_verify_api.py`.

**Census/replication scripts + reports + figures:** `paper/replication/verification/`
(`census_jats.py`, `census_ipw.py`, `oa_pilot.py`, `adjudicate_inconsistencies.py`, `make_census_figures.py`,
`REPRODUCTION.md`, the `CENSUS_*`/`FP_VALIDATION_*` reports, and `figures/`).

---

## 4. What has already been done (the arc)

All on branch `docs/plos-compbio-submission`. Most recent at top; today = 2026-06-27.

- **Cross-reference engine — Phases 0–5 DONE** (commits `a4edaf0` → `7f2d075`), each adversarially
  re-checked and committed: P0 provenance foundations + per-file extraction; P1 JATS-exact resolution;
  P2 PDF/DOCX label resolution + grammar; P3 citation-directed data selection + conflict flags; P4
  persistence (migration 0015 + `ClaimDatasetLink`) + API surfacing; P5 figure-stat extraction (OCR +
  opt-in vision). Phase 6 (eval gold-set, async/Celery, frontend review UI) is **not started**.
- **Multi-file bundle ingestion** (`ef32507`) — Word/PDF/Excel/CSV/JATS/images in one upload.
- **Census figures + PI deck** (`6d59e40`) — 7 data figures; `docs/VERIFIER_CENSUS_BRIEFING_2026-06-27.pptx`.
- **Manuscript integrity fixes** (`3c54273`) — Group B reframed (not "false positives"); extraction described
  as regex-only.
- **Submission package** (`0e15e9d`) — `paper/submission_package/` ready to resubmit the platform paper.
- **Census paper** (`f7eba13`, `6a29c12`) — full descriptive `manuscript.md`, finalized `PREREGISTRATION.md`,
  the κ double-coding infrastructure (`CODEBOOK.md`, `build_gold_set.py`, `compute_kappa.py`), and the OSF
  deposit bundler.

Current census numbers (all traceable to `paper/replication/verification/*.md`): 10,103 papers; ~3.4% report
an in-text recomputable statistic; 3,005 checkable claims; 11.1% raw inconsistent → single-digit genuine; IPW
robust; statcheck recall 97.7% / precision 98.1%.

---

## 5. The papers (publication state)

Three papers from one program; the platform paper was desk-rejected 3× on **scope/novelty** (not quality),
so the strategy is **soundness-not-novelty** venues (PLOS ONE / PeerJ / GigaByte / BMC Bioinformatics).

- **Platform paper** — `paper/submission_package/` (ready). Live bioRxiv preprint doi
  10.64898/2026.06.15.732278 (needs a v2 with the two integrity fixes). Next: pick venue, mint a Zenodo DOI,
  submit (see `SUBMISSION_GUIDE.md`).
- **Census paper** — `paper/census_paper/`. Descriptive draft done; the pre-registered confirmatory version
  is built except the human steps: file the OSF pre-reg (fill 2 coder names) and run the κ double-coding.
  See `STATUS.md`.
- **Verifier-tool paper** — a future third paper on the engine itself (not yet drafted).

---

## 6. Environment & how to run/test

```bash
# backend dev server
cd backend && DJANGO_DEBUG=True ../.venv-django/bin/python manage.py runserver 0.0.0.0:8000
# frontend dev server
cd frontend && HOST=0.0.0.0 npm start            # use: npm ci --legacy-peer-deps

# run the new tests (DJANGO_DEBUG=True avoids the SSL-redirect 301)
cd backend && DJANGO_DEBUG=True DJANGO_SETTINGS_MODULE=stickforstats.settings \
  ../.venv-django/bin/python manage.py test core.tests.test_xref_phase0 core.tests.test_xref_phase1 \
  core.tests.test_xref_phase2 core.tests.test_xref_phase3 core.tests.test_xref_phase4 \
  core.tests.test_xref_phase5 core.tests.test_ingestion_bundle core.tests.test_verify_api

# lint the backend
cd backend && ../.venv-django/bin/python -m flake8 <changed files>

# OCR system deps (optional; figure path degrades gracefully without them)
brew install tesseract poppler    # macOS;  apt: tesseract-ocr poppler-utils
```

Reproduce the census / regenerate figures (needs the drive mounted):
`/Volumes/My_Passport` → `.venv-django/bin/python paper/replication/verification/make_census_figures.py`.

---

## 7. What's next (the immediate pending work)

1. **Frontend integration** of the verifier — the backend endpoints exist but **no UI calls them**. Plan:
   `docs/manuscript_verifier/FRONTEND_INTEGRATION_PLAN_2026-06-27.md`. This is the next coding session.
2. **Deploy housekeeping:** apply migration 0015; decide auth (the verify endpoints are currently
   `AllowAny`); document OCR system deps; add the new endpoints to the API docs/OpenAPI.
3. **Census paper:** file the OSF pre-reg + run the κ double-coding (the only human-irreducible steps).
4. **Platform paper:** pick a venue and resubmit; post bioRxiv v2.
5. **Phase 6** of the xref plan: evaluation gold-set, async (Celery) for large bundles, the review UI.

---

## 8. Glossary
- **Guardian** — the assumption-validation middleware (the platform's headline feature).
- **Verifier / manuscript-verification module** — extracts + checks a paper's reported statistics.
- **Bundle** — a multi-file upload (manuscript + supplements + data + figures) handled together.
- **Cross-reference resolution (xref)** — mapping "Supplementary Table S3" → the actual artifact/data file.
- **Census** — the 10,103-paper meta-research measurement of statistical reporting/consistency.
- **κ (kappa) study** — the human double-coding that validates the census's automated verdicts.
- **"shared engine, separate surface"** — design choice (DECISIONS): the verifier is its own API surface
  inside the same app, so it can be productized standalone later without a rewrite.

---

*Single source of truth for "where are we": `docs/manuscript_verifier/XREF_RESOLUTION_WORKPLAN.md` (status
table) and `paper/census_paper/STATUS.md`. When you change the code, update those in the same commit.*
