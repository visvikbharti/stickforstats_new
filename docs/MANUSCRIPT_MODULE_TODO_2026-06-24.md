# Manuscript Verification Module — Phase A TODO (sequenced, audit-grounded)

**Date:** 2026-06-24 IST · **From:** A0 audit (workflow, 5 read-only slices + synthesis)
**Plan:** `docs/MANUSCRIPT_MODULE_PLAN_2026-06-24.md` · **Handoff:** `docs/SESSION_HANDOFF_2026-06-24.md`

> Goal of Phase A: turn the existing text-only consistency checker into a **raw-data
> verification engine** that re-runs each claim through Guardian and emits a per-claim
> verdict (`VERIFIED / DISCREPANT / ASSUMPTION_VIOLATED / ASSUMPTION_UNREPORTED /
> INSUFFICIENT_DATA / UNVERIFIABLE_EXTRACTION` + secondary `INCONSISTENT_REPORTING`).

---

## What the audit found (TL;DR)

**Good news — a lot is reusable (high value):**
- **`cascade_engine.execute_with_cascade` (`backend/core/services/cascade_engine.py`) IS the A4 engine.** With `max_cascades=0` it runs the **authors' stated test** (14 test types: t/Welch/paired/1-sample, Mann-Whitney, Wilcoxon, ANOVA, Kruskal, Pearson/Spearman/Kendall, chi², Fisher, linear regression) and returns stat/p/effect/CI **+** the Guardian assumption report. The hardest part is largely built.
- **`guardian_core.check`** — 8 assumption validators (the "do assumptions hold" half of A5(ii)).
- **`consistency_core`** — pure, tested statcheck recompute → the no-raw-data **fallback** (`INCONSISTENT_REPORTING`).
- **`claim_extractor`** — ~30 APA regexes → `StatisticalClaim` (the regex leg of the hybrid).
- **`data_import_service`** — file → pandas DataFrame + column profiles (A2 importer).
- **`effect_size_calculator`**, **`advanced_validators`** assumption/data-availability regex seeds, **`discipline_profiles`** checklist scaffold.

**Correction (overclaim cleanup):** my plan §A0 + MEMORY.md said `statistical_claim_extractor.py` (LLM) and a GROBID-backed parser exist — **they do not.** Real code is **regex-only** `claim_extractor.py` + **pdfplumber/PyPDF2** `parser.py`; **no LLM client anywhere** in `core/`. (Fixed in the plan + memory; see T01.)

**The real greenfield (blockers):** raw-data ingestion + fetch, claim→data→variable linking, the verdict taxonomy/decision layer, the coverage metric, and replacing the single collapsed pass/minor/major/critical grade with a per-claim verification profile.

---

## Top risks (carry into every decision)
1. **Raw-data availability is the whole product's bottleneck** → `INSUFFICIENT_DATA` will dominate. **Run a ~50-paper pilot fetch-success measurement EARLY** (T09+T11) before committing to the XL build; "% unverifiable" is itself the headline finding.
2. **Claim→data→variable linking (T21) is hard and partly manual, and A4 is hard-blocked on it.** Needs a human-in-the-loop UI + a measured auto-link rate; never fabricate a link.
3. **Mis-driving the Guardian/cascade engine silently corrupts verdicts** → must use `max_cascades=0` (don't auto-substitute the test) and **design-gate** `IndependenceValidator` (lag-1 autocorr, false-flags cross-sectional data).
4. **LLM/vision extraction collides with the no-egress constraint** and there's no LLM client to reuse → prototype the local-model tier before relying on it.
5. **Calibration + tolerance thresholds don't exist yet** → Guardian/cascade confidence is uncalibrated; do NOT surface it as verification confidence; **fix DISCREPANT tolerances in the B1 OSF pre-registration.**
6. **Phase-B corpus is JATS/XML, which the parser can't read** → add a JATS leg + real table parser, gated behind the dev-set + coverage work.

---

## Recommended execution order (waves by dependency)

### ▶ Wave 0 — start immediately (no/low deps, de-risks everything)
- [x] **T01-A0FIX (S)** — Correct the plan/MEMORY overclaim (no LLM extractor / no GROBID). *Doc only.* — **DONE 2026-06-24.**
- [x] **T02-SPINE (M)** — New `backend/core/manuscript/verdicts.py`: `Verdict` enum + `ClaimVerdict` + `ClaimVerificationRequest` + `ClaimDataSpec`. The contract everything plugs into. Modelled on genomics `GeneResult`. — **DONE 2026-06-24** (pure stdlib; imports clean; `calibrated_confidence` reserved for B3).
- [x] **T05-A4POC (S)** [dep T02] — Prove `verify_one_claim` over `execute_with_cascade(max_cascades=0)`. — **DONE 2026-06-24, 4/4 PASS** (`paper/replication/verification/poc_a4_cascade.py`): Iris recomputed F=119.2645 vs claimed 119.26 → VERIFIED, perturbed 60 → DISCREPANT; Wine recomputed r=0.4762 vs claimed 0.476 → VERIFIED, perturbed 0.20 → DISCREPANT; `max_cascades=0` keeps the authors' test (no substitution) and returns assumptions separately. **Central reuse hypothesis confirmed.**
- [ ] **T03-DEVSET (L)** — Curate 30–50 hand-labelled papers (data-available/absent; PDF/JATS/DOCX) + a recall/precision/coverage harness. The A1 acceptance instrument. Parallelizable.
- [ ] **T09-ACCESSION (L)** — New `data_availability_extractor.py`: text → structured accessions (GEO GSE/GSM, SRA SRR/PRJNA, Dryad/Zenodo/figshare DOI, OSF, ArrayExpress). Upgrade existing presence-only regexes to capture-groups.
- [ ] **T07-PROVENANCE (M)** — Parser PDF path: char-offset→page map; thread `page`/`global_position` into `StatisticalClaim` (backward-compatible). Enables verdicts to cite a page.

### ▶ Wave 1 — build on the spine
- [x] **T04-CONSADAPT (M)** [dep T02] — Wrap pure `consistency_core.classify` into the `INCONSISTENT_REPORTING` adapter (the always-available fallback). Don't edit the pure fn. — **DONE 2026-06-24** (`consistency_adapter.py`: `evaluate_consistency` → `ConsistencySignal` + `as_verdict`; `consistency_core` untouched).
- [x] **T06-COVERAGE (M)** [dep T02,T03] — Add a real coverage denominator to `ExtractionSummary` (can NEVER silently report 100%); split `confidence` into completeness vs extraction-confidence; gate `UNVERIFIABLE_EXTRACTION`. *Closes the false-negative trap the lab cares most about.* — **DONE 2026-06-24** (`claim_extractor.py` coverage + `extraction_confidence` reserved field; `extraction_quality.py` gate). *(T03 dev-set tuning deferred; threshold default 0.6.)*
- [ ] **T08-CONSDEMOTE (M)** [dep T04] — Demote `overall_consistency_rate` to a labelled fallback signal; route `could_not_check` into Coverage (≠ INSUFFICIENT_DATA); add the "does NOT certify correctness" note.
- [ ] **T10-SCHEMA (L)** [dep T02] — Django `LinkedDataset` model + persisted per-claim verdict (today `models.py` has only free-form JSON). Mirror the `report_token_hash` IDOR pattern.
- [ ] **T12-RESOLVER (M)** [dep T02] — Map extractor `claim_type` (+ design hints: paired/independent/1-sample; pearson/spearman; chi²/fisher) → cascade `intended_test`; ambiguous → INSUFFICIENT_DATA, never guess. Flag unverifiable families (multiple/logistic regression, mixed models).
- [ ] **T17-A5IDETECT (L)** [dep T02] — `test→required-assumptions` table + per-claim `ASSUMPTION_UNREPORTED` detector localized to `claim.position`. Drop the current bad gating (only fires on stated-non-normality / N<20 / doc-level boolean). Use `claim.test_name` so Mann-Whitney isn't flagged for normality.

### ▶ Wave 2 — ingestion + engine
- [ ] **T11-FETCH (XL)** [dep T09] — New `data_fetcher.py`: download (GEO FTP/HTTPS, Zenodo/Dryad/figshare/OSF REST, raw URLs) + size cap + MD5 + decompress (.gz/.zip/.tar) → `DataImportService`. Extend `SUPPORTED_FORMATS` with .tsv/.txt-delimited + compressed wrappers (genomics `*_Counts.csv.gz`). **No-egress mode.**
- [ ] **T13-ENGINE (L)** [dep T02,T12] — New `verification/reanalysis_engine.py`: `verify_one_claim` over `execute_with_cascade(max_cascades=0)` + `guardian.check`; map None/failure → INSUFFICIENT_DATA, never silent pass. Port genomics `test_failed` discipline.
- [ ] **T18-DISCIPLINE (M)** [dep T17] — Add the assumption-reporting checklist item to all 8 discipline profiles (only psychology has it today), claim-localized.

### ▶ Wave 3 — comparison logic
- [ ] **T14-GATE (S)** [dep T13] — Design-gate order-dependent checks (suppress `IndependenceValidator` unless rows are sequential/time-ordered/repeated-measures); record suppression in provenance. Don't demand homoscedasticity if authors reported Welch.
- [ ] **T15-TOLERANCE (M)** [dep T13] — Rounding-aware comparator (recomputed vs claimed) reusing `consistency_core` ±0.5-last-digit interval-overlap + significance-decision agreement on p. DISCREPANT thresholds = configurable constants (fix in B1 pre-reg).
- [ ] **T16-EFFECT (M)** [dep T15] — Effect-size normalization (Cohen d vs Hedges g; η² vs partial-η²; r vs r²) → "effect-not-comparable" when scales mismatch; never compare across incompatible scales.

### ▶ Wave 4 — verdicts + linking
- [ ] **T19-DECISION (M)** [dep T15,T16,T14,T17,T04] — Pure table-driven verdict-assignment function with the §2 precedence (ASSUMPTION_VIOLATED independent of p-match; INSUFFICIENT_DATA dominates; UNVERIFIABLE_EXTRACTION on low coverage). Guardian score only as `uncalibrated_engine_confidence`.
- [ ] **T21-A3LINK (XL)** [dep T10,T11] — `claim_data_linker.py`: map claim variables/groups/design → dataset columns (header/label matching on column profiles) + human-in-the-loop review UI; **measure & report auto-link rate**; INSUFFICIENT_DATA when no confident link.

### ▶ Wave 5 — assemble + surface
- [ ] **T20-CONTROLS (L)** [dep T19] — Positive/negative control suite (`test_verification_engine.py`): correct→VERIFIED, perturbed→DISCREPANT, parametric-on-nonnormal→ASSUMPTION_VIOLATED, no-data→INSUFFICIENT_DATA, garbled→UNVERIFIABLE_EXTRACTION. **Phase-A exit instrument (with T03).**
- [ ] **T22-ORCHESTRATE (XL)** [dep T19,T21] — Wire a net-new Guardian re-analysis stage into `manuscript_guardian.py`; replace `_generate_findings`/`_determine_assessment` so the single grade no longer hides unverifiable claims.
- [ ] **T23-SCORING (M)** [dep T19] — Render the §5 verification profile (verifiability rate, %VERIFIED/%DISCREPANT/%ASSUMPTION_VIOLATED among verifiable, assumption-reporting completeness, coverage) + calibration slot + mandatory certify/not-certify box. Never a single "pass."
- [ ] **T24-SURFACE (L)** [dep T10,T22] — `POST /api/v1/verify/analyze/` (manuscript + optional data/accessions → per-claim verdicts + verifiability_rate + coverage); keep `/manuscript/analyze` as the no-data fallback. Frontend `ManuscriptAnalyzer`/`ReviewerReport` reframe + CLI `--no-egress`. (B2 Celery batch for the 5–10k census = follow-on, not Phase A.)

---

## Phase-A exit criterion
End-to-end run on the **T03 dev set** + the **T20 control suite**: correct per-claim verdicts across all six types, with calibrated-confidence slot reserved for B3. Then → Phase B (corpus study) per the plan.

## Immediate next 3 (what we do first)
1. ~~**T02-SPINE** — the verdict contract.~~ ✅ DONE 2026-06-24
2. ~~**T05-A4POC** — prove the cascade engine verifies Iris/Wine.~~ ✅ DONE 2026-06-24 (4/4 PASS)
3. ~~**T04-CONSADAPT + T06-COVERAGE** — the fallback signal + the coverage honesty gate.~~ ✅ DONE 2026-06-24 (12/12)
4. **T09-ACCESSION + ~50-paper data-availability pilot** — sizes the verifiable fraction. ← **next**
(In parallel, non-code: **T03-DEVSET** curation and the **~50-paper data-availability pilot** that sizes the whole product.)

---

## Dev environment (cross-session — read before running engine code)

The local anaconda Python 3.9 has a **numpy-2 vs scipy/sklearn/matplotlib ABI break**, so any
verification code that imports the engine (scipy) **cannot run there**. Use the dedicated venv:

```bash
python3.11 -m venv .venv-verify           # gitignored
.venv-verify/bin/pip install numpy scipy pandas scikit-learn statsmodels matplotlib seaborn
.venv-verify/bin/python paper/replication/verification/poc_a4_cascade.py
```

**Engine-import gotcha:** `backend/core/services/__init__.py` imports Django (via
`dataset_service`), and `guardian_core` pulls `matplotlib`+`seaborn` (via
`visualization_generator`). The PoC sidesteps Django by registering lightweight **namespace
packages** for `core` / `core.services` / `core.guardian` / `core.manuscript` so the pure
numpy/scipy leaf modules import Django-free (see `poc_a4_cascade.py` top). Future verification
code (T13 engine, T20 controls) should reuse that pattern, or run under a full Django setup.

## Progress log
- **2026-06-24 16:13 IST** — **T01 + T02-SPINE + T05-A4POC DONE.**
  - T02: `backend/core/manuscript/verdicts.py` — `Verdict` enum (6 + secondary
    INCONSISTENT_REPORTING), `ClaimVerdict`, `ClaimVerificationRequest`, `ClaimDataSpec`.
    Pure stdlib; `calibrated_confidence` reserved (None) pending B3.
  - T05: `paper/replication/verification/poc_a4_cascade.py` — **4/4 PASS** against the
    project's own replication anchors (Iris F=119.26, Wine r=0.476). Confirmed
    `execute_with_cascade(max_cascades=0)` re-runs the authors' test without substitution and
    returns the Guardian assumption report separately. **The A4 engine is reuse, not a rebuild.**
  - Set up the `.venv-verify` dev environment (above) to work around the broken local scipy.
  - **Next:** T04-CONSADAPT (consistency→INCONSISTENT_REPORTING adapter) + T06-COVERAGE
    (coverage gate). Then T09-ACCESSION + the ~50-paper data-availability pilot.
- **2026-06-24 16:26 IST** — **T04-CONSADAPT + T06-COVERAGE DONE** (12/12 check PASS via
  `paper/replication/verification/check_t04_t06.py`).
  - T04: `backend/core/manuscript/consistency_adapter.py` — `evaluate_consistency()` →
    `ConsistencySignal` (exposes `checkable` for T08 coverage routing) → `as_verdict()` emits
    `INCONSISTENT_REPORTING` only for real inconsistencies (major vs gross_error). Verified on
    t(38)=2.10: p=.042 consistent (no verdict), p=.001 → major, p=.60 → gross, stat-only → not-checkable.
    `consistency_core` left untouched (single source of truth).
  - T06: `claim_extractor.py` — `ExtractionSummary` gains `coverage`/`candidate_statistical_mentions`/
    `low_coverage`; `summarize(claims, full_text=)` computes coverage = claims_with_p / p-mentions
    (warns + flags below 0.6); `StatisticalClaim.extraction_confidence` reserved (None) split from
    completeness `confidence`. `extraction_quality.py` — per-claim `UNVERIFIABLE_EXTRACTION` gate.
    Live extractor smoke: F/t/r claims, coverage 1.0. Backward-compatible (additive defaults).
  - **Next:** T08-CONSDEMOTE + T12-RESOLVER, or the higher-leverage **T09-ACCESSION + ~50-paper
    data-availability pilot** (sizes the verifiable fraction before the XL ingestion/linking build).
