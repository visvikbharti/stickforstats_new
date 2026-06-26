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
- [~] **T03-DEVSET (L)** — **Objective recall/precision harness DONE 2026-06-24** (`eval_vs_statcheck.py`: benchmark vs statcheck on the 20-paper corpus — **recall 97.7%, precision 93.2%, F1 95.4%**, +84 statcheck-missed). The Phase-A exit instrument. **Follow-on:** a hand-labelled gold set for absolute recall + data-available papers.
- [x] **T09-ACCESSION (L)** — New `data_availability_extractor.py`: text → structured accessions (GEO/SRA/BioProject/BioSample/ArrayExpress/dbGaP/PRIDE/MetaboLights/MassIVE/Dryad/Zenodo/figshare/OSF/Dataverse/GitHub) + availability classification. — **DONE 2026-06-24** (11/11 check `check_t09_accession.py`).
- [ ] **T07-PROVENANCE (M)** — Parser PDF path: char-offset→page map; thread `page`/`global_position` into `StatisticalClaim` (backward-compatible). Enables verdicts to cite a page.

### ▶ Wave 1 — build on the spine
- [x] **T04-CONSADAPT (M)** [dep T02] — Wrap pure `consistency_core.classify` into the `INCONSISTENT_REPORTING` adapter (the always-available fallback). Don't edit the pure fn. — **DONE 2026-06-24** (`consistency_adapter.py`: `evaluate_consistency` → `ConsistencySignal` + `as_verdict`; `consistency_core` untouched).
- [x] **T06-COVERAGE (M)** [dep T02,T03] — Add a real coverage denominator to `ExtractionSummary` (can NEVER silently report 100%); split `confidence` into completeness vs extraction-confidence; gate `UNVERIFIABLE_EXTRACTION`. *Closes the false-negative trap the lab cares most about.* — **DONE 2026-06-24** (`claim_extractor.py` coverage + `extraction_confidence` reserved field; `extraction_quality.py` gate). *(T03 dev-set tuning deferred; threshold default 0.6.)*
- [ ] **T08-CONSDEMOTE (M)** [dep T04] — Demote `overall_consistency_rate` to a labelled fallback signal; route `could_not_check` into Coverage (≠ INSUFFICIENT_DATA); add the "does NOT certify correctness" note.
- [x] **T10-SCHEMA (L)** [dep T02] — Django `LinkedDataset` model + persisted per-claim verdict (today `models.py` has only free-form JSON). Mirror the `report_token_hash` IDOR pattern. — **DONE 2026-06-25** (`models.py`: `VerificationRun` + `ClaimVerdictRecord` + `LinkedDataset`; IDOR token methods copied from `ManuscriptSubmission`; migration `0014_*`; registered in `__all__`).
- [x] **T12-RESOLVER (M)** [dep T02] — Map extractor `claim_type` (+ design hints) → cascade `intended_test`; unverifiable families (beta/odds/hazard/z/Shapiro) → None → INSUFFICIENT_DATA. — **DONE 2026-06-24** (`test_resolver.py`; control suite caught + fixed a `'dependent'⊂'independent'` substring bug).
- [ ] **T17-A5IDETECT (L)** [dep T02] — `test→required-assumptions` table + per-claim `ASSUMPTION_UNREPORTED` detector localized to `claim.position`. Drop the current bad gating (only fires on stated-non-normality / N<20 / doc-level boolean). Use `claim.test_name` so Mann-Whitney isn't flagged for normality.

### ▶ Wave 2 — ingestion + engine
- [~] **T11-FETCH (XL)** [dep T09] — **GEO path DONE 2026-06-24** (`data_fetcher.py`: resolve GSE → list suppl → pick count/matrix table → size-capped download → decompress `.gz`/`.zip` → ingest; `DataImportService` extended with `.tsv`/`.txt`/`.tab` delimited importer). Verified on GSE271517 (63677×92) + GEO funnel run (`funnel_geo.py`: 2/12 accessions yield a directly-ingestible matrix — **17%**, a lower bound). **Follow-ons:** `_RAW.tar`/GSM-level extraction; Zenodo/Dryad/figshare/OSF fetchers; MD5; no-egress hardening. **SERIES-MATRIX metadata extraction DONE 2026-06-25** (`geo_metadata.py` — fetch + parse the GEO series matrix into a sample-metadata frame; handles GEO's RAGGED `!Sample_characteristics_ch1` by keying each cell on its own `label: value`; multi-platform concat. Verified on GSE271517 → 91 samples, recovers `tumor type` = {Primary_tumor:55, Metastasis:36}, all 91 expr columns aligned → the FULLY-AUTOMATIC loop accession→matrix→grouping→link→verdict works).
- [x] **T13-ENGINE (L)** [dep T02,T12] — `reanalysis_engine.verify_claim()` over `execute_with_cascade(max_cascades=0)`; maps None/error → INSUFFICIENT_DATA. — **DONE 2026-06-24** (includes **T14** independence-gate + **T15** rounding-aware tolerance + **T19** decision; 7/7 control suite `check_t12_t13_t19.py`).
- [ ] **T18-DISCIPLINE (M)** [dep T17] — Add the assumption-reporting checklist item to all 8 discipline profiles (only psychology has it today), claim-localized.

### ▶ Wave 3 — comparison logic
- [ ] **T14-GATE (S)** [dep T13] — Design-gate order-dependent checks (suppress `IndependenceValidator` unless rows are sequential/time-ordered/repeated-measures); record suppression in provenance. Don't demand homoscedasticity if authors reported Welch.
- [ ] **T15-TOLERANCE (M)** [dep T13] — Rounding-aware comparator (recomputed vs claimed) reusing `consistency_core` ±0.5-last-digit interval-overlap + significance-decision agreement on p. DISCREPANT thresholds = configurable constants (fix in B1 pre-reg).
- [ ] **T16-EFFECT (M)** [dep T15] — Effect-size normalization (Cohen d vs Hedges g; η² vs partial-η²; r vs r²) → "effect-not-comparable" when scales mismatch; never compare across incompatible scales.

### ▶ Wave 4 — verdicts + linking
- [ ] **T19-DECISION (M)** [dep T15,T16,T14,T17,T04] — Pure table-driven verdict-assignment function with the §2 precedence (ASSUMPTION_VIOLATED independent of p-match; INSUFFICIENT_DATA dominates; UNVERIFIABLE_EXTRACTION on low coverage). Guardian score only as `uncalibrated_engine_confidence`.
- [~] **T21-A3LINK (XL)** [dep T10,T11] — **Tabular linker DONE 2026-06-24** (`claim_data_linker.py`: match claim context-text → value/group columns → `ClaimDataSpec`; two-group/correlation/k-group; returns `linked`/`ambiguous`/`unlinkable` + candidates for review; never fabricates). Proven in `demo_tabular_end_to_end.py` (text→VERDICT, VERIFIED + DISCREPANT). **GENOMICS LEG DONE 2026-06-25** (`genomics_linker.py` — `GenomicsLinker`: auto-resolves the gene (Ensembl id / transcript id / symbol; auto-detects index type; optional `symbol_map`) AND the two groups (claim group-words → a sample-metadata variable's two levels via normalized synonym stemming, with scoring-based disambiguation when several variables match, + a column-name-prefix fallback); callable as the `linker=` arg; never fabricates → ambiguous/unlinkable. Control suite `check_genomics_linker.py` **5/5 on real GSE271517** — Ensembl + symbol claims auto-link + VERIFIED, inflated → DISCREPANT, no-groups → ambiguous, no-gene → unlinkable.) **MEASURED AUTO-LINK RATE DONE 2026-06-25** (`geo_autolink_rate.py`, funnel over the 8 cached GEO
datasets → `GEO_AUTOLINK_REPORT_2026-06-25.md`): after the sample-id alignment heuristic (below),
**3/8 end-to-end auto-link (38%); 3/3 (100%) of those with a usable matrix.** Drop-offs (the finding):
4/8 deposit only `filelist.txt` (raw, no processed matrix), 1/8 corrupt xlsx — i.e. every remaining
failure is upstream data-deposition, not the tool. GSE271517 (series-matrix grouping), GSE303993
(nGD/WT column prefixes), GSE287628 (numeric-suffix alignment + title-derived grouping) all auto-link
100%. **Remaining follow-ons:** human-in-the-loop review UI for ambiguous links; Zenodo/Dryad fetchers.

### ▶ Wave 5 — assemble + surface
- [ ] **T20-CONTROLS (L)** [dep T19] — Positive/negative control suite (`test_verification_engine.py`): correct→VERIFIED, perturbed→DISCREPANT, parametric-on-nonnormal→ASSUMPTION_VIOLATED, no-data→INSUFFICIENT_DATA, garbled→UNVERIFIABLE_EXTRACTION. **Phase-A exit instrument (with T03).**
- [x] **T22-ORCHESTRATE (XL)** [dep T19,T21] — **Standalone version DONE 2026-06-24** (`verify_pipeline.verify_manuscript()` — the Django-free `verification-core` entry point: extract→coverage→consistency-fallback→link→verify→profile; sentence-scoped context so claims link only to their own sentence's variables; check `check_verify_pipeline.py` PASS). **Django leg DONE 2026-06-25** (`backend/core/manuscript/verification_service.py` — `run_verification()` calls the core then persists VerificationRun + ClaimVerdictRecord + LinkedDataset in one transaction; JSON-safe payload — inf/nan→None + numpy-unwrap; best-effort persistence (still returns the verdict if the DB write fails)). **Reconciliation:** the old "replace `_generate_findings`/`_determine_assessment`" framing is SUPERSEDED by the lab's "shared engine, separate surface" decision — `ManuscriptGuardian` stays the no-data consistency fallback; the verdict pipeline is a NEW surface (T24), not a rewrite of the old one.
- [~] **T23-SCORING (M)** [dep T19] — **`VerificationProfile` DONE 2026-06-24** in `verify_pipeline.py` (verifiability rate, verdict distribution, coverage, n_inconsistent, **certify/not-certify note**; never a single grade). **Follow-on:** %-among-verifiable + assumption-reporting completeness + the B3 calibration slot.
- [~] **T24-SURFACE (L)** [dep T10,T22] — `POST /api/v1/verify/analyze/` (manuscript + optional data/accessions → per-claim verdicts + verifiability_rate + coverage); keep `/manuscript/analyze` as the no-data fallback. Frontend `ManuscriptAnalyzer`/`ReviewerReport` reframe + CLI `--no-egress`. (B2 Celery batch for the 5–10k census = follow-on, not Phase A.) — **REST endpoints DONE 2026-06-25** (`backend/api/v1/verify_views.py`: `VerifyAnalyzeView` POST `/verify/analyze/` accepts manuscript file/`text` + optional data table; `VerifyReportView` GET `/verify/report/<uuid>/` token-gated IDOR-protected; URLs wired; **no-egress by default** — uploaded data only, accession auto-fetch deliberately deferred as opt-in). 4 API tests + 16 neighbor Django tests + the full verification-core suite all GREEN under the new `.venv-django`. **Follow-ons:** frontend reframe; CLI `--no-egress` flag; accession auto-fetch; B2 Celery batch census.

---

## Phase-A exit criterion
End-to-end run on the **T03 dev set** + the **T20 control suite**: correct per-claim verdicts across all six types, with calibrated-confidence slot reserved for B3. Then → Phase B (corpus study) per the plan.

## Immediate next 3 (what we do first)
1. ~~**T02-SPINE** — the verdict contract.~~ ✅ DONE 2026-06-24
2. ~~**T05-A4POC** — prove the cascade engine verifies Iris/Wine.~~ ✅ DONE 2026-06-24 (4/4 PASS)
3. ~~**T04-CONSADAPT + T06-COVERAGE** — the fallback signal + the coverage honesty gate.~~ ✅ DONE 2026-06-24 (12/12)
4. ~~**T09-ACCESSION + ~50-paper data-availability pilot** — sizes the verifiable fraction.~~ ✅ DONE 2026-06-24 (80-paper biomed pilot: 32% have a data accession; report in `pilot_out/`)
5. ~~**T11-FETCH** (GEO-first)~~ ✅ GEO path DONE 2026-06-24 (funnel: 17% of GEO accessions directly ingestible).
6. ~~**T12-RESOLVER** + **T13-ENGINE** (+T14/T15/T19)~~ ✅ DONE 2026-06-24 (7/7 — full verdict pipeline works on real data).
7. ~~**T21-A3LINK** (tabular) + tabular end-to-end demo~~ ✅ DONE 2026-06-24 (text→extract→import→link→verify→VERDICT).
8. ~~**Genomics end-to-end demo** (GSE271517 + gene claim)~~ ✅ DONE 2026-06-24 (MKI67/TOP2A VERIFIED; CFTR ASSUMPTION_VIOLATED — the engine works on real RNA-seq).
9. **T08-CONSDEMOTE** + **T10-SCHEMA** (persist) + **T22-ORCHESTRATE** (wire into manuscript_guardian). ← **next**
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
- **2026-06-24 16:47 IST** — **T09-ACCESSION DONE + data-availability pilot RUN.**
  - T09: `backend/core/manuscript/data_availability_extractor.py` — capture-group accessions for 15
    repositories + availability classification (open_accession / in_paper_supp / on_request /
    statement_only / none). 11/11 check (`check_t09_accession.py`).
  - **Pilot (`pilot_data_availability.py`, report in `pilot_out/PILOT_REPORT_2026-06-24.md`):**
    80-paper biomedical/genomics PMC-OA sample (XML on `/Volumes/My_Passport`, 19 MB) →
    **32% have a real data-repository accession, 44% verifiable candidates**; GEO is #1 (32 papers);
    19% "on request"; 21% no statement. Psychology baseline (existing 20): 10% / 35%.
    **Honest headline confirmed: even in genomics ~⅔ of papers are unverifiable from public data →
    INSUFFICIENT_DATA dominates; "% unverifiable" is the meta-research finding.**
  - **Implication for T11:** build the **GEO fetch path first**. Next funnel stages to measure on
    this same 80-paper corpus: resolves? (T11) ingestible? (T11) linkable to the claim? (T21).
  - **Next:** T11-FETCH (GEO-first) / T10-SCHEMA / T12-RESOLVER / T08-CONSDEMOTE.
- **2026-06-24 17:09 IST** — **T11-FETCH GEO path DONE + resolve→ingest funnel run.**
  - `backend/core/manuscript/data_fetcher.py` (GEO: `_geo_suppl_url` nnn-dir, list suppl, skip
    `_RAW.tar`/`filelist.txt`/tracks/images, pick count/matrix table, size-cap download, decompress
    `.gz`/`.zip`, ingest). `data_import_service.py` extended: `.tsv`/`.txt`/`.tab` → `_import_delimited`
    (sniffs separator). End-to-end on GSE271517 → 63677×92 ingested.
  - **Funnel (`funnel_geo.py`, report addendum):** 12 GEO accessions → **2 ingested (17%)**, 5 no
    suppl dir, 4 only `_RAW.tar`+filelist (no processed table), 1 corrupt xlsx (flagged, not silently
    passed). **Caught + fixed a real bug:** initial picker chose `filelist.txt` (metadata) as data.
    17% is a LOWER bound (no `_RAW.tar`/GSM/series-matrix extraction yet). Honest compound finding:
    directly-verifiable raw data is the exception even for the #1 repository.
  - **Next:** T10-SCHEMA + T12-RESOLVER → then T13 wires fetch→link→re-analyze→verdict end-to-end.
- **2026-06-24 17:20 IST** — **T12 + T13 + T19 DONE (+ T14, T15 folded in) — the verdict pipeline is real.**
  - `test_resolver.py` (T12): claim_type(+test_name hints) → cascade test; unverifiable families → None.
  - `verdict_decision.py` (T15 rounding-aware `statistic_matches` + T19 `assign_verdict` §2 precedence).
  - `reanalysis_engine.py` (T13): `verify_claim(request)` → extraction-gate → resolve → re-run authors'
    test (max_cascades=0) → T14 independence-gate → compare → ClaimVerdict. cascade imported lazily.
  - **Control suite `check_t12_t13_t19.py`: 7/7** — all six verdicts on real data, incl. the §2 precedence
    (Pearson on non-normal wine: value reproduces r=0.4762 BUT normality fails → ASSUMPTION_VIOLATED).
    Caught + fixed a real resolver bug (`'dependent'` matched inside `'independent'` → ran paired t).
  - Phase A: **10/24** (T01,T02,T04,T05,T06,T09,T11-GEO,T12,T13,T19 + T14/T15).
  - **Next:** T21-A3LINK (auto claim→data linking — the XL blocker for *automatic* end-to-end) + T10-SCHEMA
    (persist) → a live-paper demo. The engine works; what's left is feeding it linked data automatically.
- **2026-06-24 17:37 IST** — **T21 tabular linker + BOTH end-to-end demos DONE. The engine is real, end to end.**
  - `claim_data_linker.py` (T21 tabular): claim context → value/group columns → ClaimDataSpec; +T15 sign fix.
  - `demo_tabular_end_to_end.py`: text → extract → import → link → verify. Faithful t(78)=2.9 → VERIFIED;
    inflated 8.10 → DISCREPANT.
  - `demo_genomics_end_to_end.py`: DAS text → GSE271517 → fetch 63677×92 → gene link → verify.
    MKI67/TOP2A → VERIFIED; CFTR (ENSG00000001626) → ASSUMPTION_VIOLATED (t reproduces but 15.1% outliers).
  - Status doc for the PI: `docs/MANUSCRIPT_VERIFY_STATUS_2026-06-24.md`.
  - Phase A: **11/24**. **Next:** T08-CONSDEMOTE / T10-SCHEMA / T22-ORCHESTRATE (wire into the surface).
- **2026-06-24 17:47 IST** — **verify-core entry point + CLI surface + FIRST real-paper run.**
  - `verify_pipeline.verify_manuscript()` (T22+T23 standalone) + `verify_cli.py` (T24-lite:
    `verify PAPER.txt [--data DATA.csv]`). Synthetic paper+data → VERIFIED 100%; check PASS.
  - **First real-paper run (PMC13225248, no data):** 51 claims → 14 UNVERIFIABLE_EXTRACTION +
    37 INSUFFICIENT_DATA; **the extractor captured 37 statistics but 0 of 79 p-value mentions →
    coverage flagged 0% (LOW).** This is the T06 false-negative gate working as designed — AND it
    pinpoints the real next priority: **the regex extractor's p-attachment fails on real-paper
    formatting** (the p-merge proximity / single-line stripped text). → multi-leg / better p-merge
    is the highest-leverage extraction fix before the census.
  - Phase A: **14/24** (incl. T22/T23 standalone + T24-lite CLI). **Next:** fix extractor p-merge on
    real papers; then T08/T10/T22-Django-wiring.
- **2026-06-24 17:55 IST** — **capital-P extraction fix + corpus consistency census.**
  - **Fix:** F/χ²/correlation/z/beta/standalone-p regexes only matched lowercase `p` → `[Pp]`
    (`claim_extractor.py`). Real-paper impact (PMC13225248): claims-with-p **0→79**, coverage **0%→100%**.
    No regression (7/7, 12/12, verify-pipeline PASS). **⚠ Table 8 (statcheck head-to-head) in the
    current manuscript used the buggy extractor → its recall is understated** (note for the verifier paper).
  - **Census (`census_consistency.py`, no-data tier over 20 papers):** 1,105 claims, **100% coverage
    every paper**, **35 statcheck inconsistencies across 12/20 papers (60%)** — matches the literature
    (~50%, Nuijten 2016). The no-raw-data tier works at scale on real papers; previews Phase B.
  - **Next priority:** extractor PRECISION (15 fragmentary UNVERIFIABLE_EXTRACTION on the sample paper)
    → multi-leg / better claim boundaries; then T08/T10/Django wiring; then Phase-B pre-registration.
- **2026-06-25 ~06:20 IST** — **Thread B: full Django venv + T10 + T22-Django + T24 DONE.** (PI decisions
  this session: venue still undecided; Group B correction/bioRxiv v2 still PI-gated → manuscript.md
  untouched, as agreed; chose Thread B + Phase B OSF draft.)
  - **Full Django venv** `.venv-django` (python3.11; scipy 1.17 + numpy 2.4 + Django 4.2.30 + DRF +
    the heavy URLconf deps lifelines/factor-analyzer/pmdarima/pyreadstat/anthropic/stripe/etc.).
    Kept separate from `.venv-verify` (which stays pure-Django-free for verification-core). Both
    gitignored. `manage.py check` → 0 issues; full URLconf imports cleanly.
  - **T10-SCHEMA** — `backend/core/models.py`: `VerificationRun` (paper-level profile + IDOR
    `report_token_hash` + hash/set/verify token methods, copied from `ManuscriptSubmission`),
    `ClaimVerdictRecord` (per-claim; hot fields denormalized + indexed for the Phase-B census, full
    `ClaimVerdict.to_dict()` in `detail`), `LinkedDataset` (data provenance). Migration
    `0014_verificationrun_linkeddataset_claimverdictrecord.py`. Registered in `__all__`.
  - **T22-ORCHESTRATE (Django leg)** — `verification_service.py`: `run_verification()` →
    `verify_manuscript()` then persists in a transaction; JSON-safe (`_json_safe` inf/nan→None +
    numpy-unwrap, `_safe_float`); best-effort persistence. Separate-surface reconciliation noted above.
  - **T24-SURFACE** — `api/v1/verify_views.py`: `VerifyAnalyzeView` POST `/verify/analyze/`
    (manuscript `file`|`text` + optional `data` table + `alpha`) and `VerifyReportView` GET
    `/verify/report/<uuid>/` (token-gated, 404-on-miss). URLs wired. **No-egress by default** —
    uploaded data only; accession auto-fetch deliberately deferred (opt-in follow-on).
  - **Additive core change:** `ClaimVerdict.claim_text` field + one populate line in `verify_pipeline`
    (so the persisted record carries the claim's raw text). Backward-compatible.
  - **Tests:** `core/tests/test_verify_api.py` (4) — VERIFIED-from-data + persistence + IDOR token
    gating (404 no/wrong token, 200 correct) + no-data→INSUFFICIENT_DATA + empty→400. All pass.
    Regression: 16 neighbor Django tests (manuscript-token + receipt) green; the full
    verification-core suite (`run_all.py`) ALL CHECKS PASS (claim_text addition didn't regress).
  - **Phase A: 17/24** (added T10, T22-Django, T24-core). Remaining Phase A: T07, T08, T16, T17, T18,
    T20 (formal control suite as a Django test), + T24 follow-ons (frontend, CLI flag, accession fetch).
  - **Phase B:** OSF pre-registration **DRAFT** written — `docs/MANUSCRIPT_VERIFY_OSF_PREREG_DRAFT_2026-06-25.md`
    (grounded in the measured pilots; 10 collated **[PI DECISION]** items in §11; converts directly to
    OSF form fields once the PI resolves them). NOT filed.
  - **Adversarial review** of the new surface (3-dimension workflow — security/correctness/consistency
    — with per-finding adversarial refutation; 16 agents, 6 false positives correctly dismissed).
    **7 confirmed findings, ALL FIXED + re-verified:**
    1. 🔴 MAJOR (security) — XLSX **decompression-bomb / unbounded pandas read** DoS on the new data
       path (size cap was on *compressed* bytes). Fixed: `_load_dataframe` now bounds the XLSX
       uncompressed total (zip infolist, 200 MB cap), caps rows (`nrows=1e6`) on both csv/xlsx, and
       caps columns (10k); malformed workbook → 400. New regression test `test_malformed_xlsx_data_is_rejected`.
    2. 🟡 MINOR (security) — raw exception text echoed to AllowAny clients. Fixed: genericized the 500
       + parse/data-read 400 messages (detail stays in `logger.exception`); added the missing logger
       on the data-read path.
    3. 🟡 MINOR (correctness) — report endpoint **failed open** when `report_token_hash` empty. Fixed:
       `VerifyReportView` now fails CLOSED (empty/missing hash → 404; no legacy rows to grandfather).
    4. 🟡 NIT (correctness) — `ClaimVerdictRecord.page` always NULL (parser gives no per-claim page).
       Fixed: dropped the dead column (kept `position`, which IS populated); page provenance deferred
       to T07. Migration `0014` regenerated.
    5. 🟢 MAJOR (consistency) — unused `io` import (flake8 F401, CI gate). Fixed (removed).
    6. 🟢 quality — upload helpers + manuscript ext-table **duplicated** from `manuscript_views`.
       Fixed: extracted `backend/api/v1/_upload_utils.py` (`max_upload_bytes` / `file_too_large_error`
       / `manuscript_file_type`), now imported by BOTH `verify_views` and `manuscript_views` (removed
       the duplicates + the now-unused `settings` import).
    - Dismissed FPs (correctly): third `_json_safe` copy, `except Exception` vs `ImportError`,
      UNVERIFIABLE_EXTRACTION dropping `**base` (no actual harm), "one-time" token docstring,
      token-in-URL (header alt exists), INCONSISTENT_REPORTING choice not persisted (by design).
    - **Post-fix verification:** flake8 CLEAN; `manage.py check` 0 issues; **5 verify-API tests + 16
      neighbor Django tests** GREEN.
- **2026-06-25 ~07:00 IST — REAL DATA through the NEW service+DB layer** (`paper/replication/verification/real_data_through_surface.py`).
  The unit test uses synthetic data by design (hermetic); this proves the SAME new layer on real data:
  - **Raw-data tier — real GEO GSE271517 (63,677 genes × 91 samples)** via `run_verification(persist=True)`
    with a genomics linker: **14 VERIFIED + 1 DISCREPANT** (the deliberately inflated t=99.90 caught),
    plus **ASSUMPTION_VIOLATED on ENSG00000001626/CFTR** (t reproduces but 15.1% outliers → "number's
    right, test is wrong" = the Case Study 4 thesis as a persisted verdict). Verdicts read back OUT of the
    DB (real persistence, not test-only). NOTE: data is 100% real; the in-text claims are constructed
    faithfully from that data (no independent paper states per-gene t numbers for this set in-text).
  - **No-data tier — 20 REAL published papers** via `verify_manuscript`: **473 real test claims →
    all INSUFFICIENT_DATA** (honest: no data linked) + **35 real INCONSISTENT_REPORTING** flags,
    incl. a real decision-changing error (PMC12704721 F(1,3)=9.6001, P=0.0269 → recomputed p=0.0534).
  - **5 of 6 verdict types now demonstrated on REAL data through the new persisting surface**
    (UNVERIFIABLE_EXTRACTION is the extraction-quality gate, not a data verdict). Dev sqlite migrated +
    3 runs persisted. flake8 CLEAN. **Takeaway/Phase-B signal:** the raw-data tier's remaining hard part
    is AUTOMATIC paper-claim↔deposited-data linking (T21 genomics linker is still demo-grade); the
    473→INSUFFICIENT_DATA result IS the headline ("most published claims aren't verifiable from linked data").
- **2026-06-25 ~08:00 IST — GENOMICS AUTO-LINKER + automatic GEO loop + genome-scale proof.**
  (Answering "can we run it on REAL data, automatically, at scale" — yes.)
  - **`genomics_linker.py` (`GenomicsLinker`)** — auto-resolves gene (Ensembl/transcript/symbol; index-type
    auto-detect; optional `symbol_map`) + the two groups (claim group-words → a sample-metadata variable's
    two levels via synonym/plural stemming; **scoring-based disambiguation** picks the cleanest binary split
    when several variables overlap — e.g. "tumor type" over "tissue"/"site"; column-prefix fallback). Never
    fabricates → ambiguous/unlinkable. Drop-in `linker=`. **Control suite `check_genomics_linker.py` 5/5**
    on real GSE271517.
  - **`geo_metadata.py`** — fetch + parse the GEO **series matrix** → sample-metadata frame so grouping is
    AUTOMATIC (no hand-made sample sheet). Caught + fixed a real GEO bug: characteristics are RAGGED across
    samples → key each cell by its own `label: value` (positional binding misaligned T3/T5). On GSE271517:
    91 samples, recovers `tumor type={Primary_tumor:55, Metastasis:36}`, all 91 expr cols aligned →
    **fully-automatic loop accession→series matrix→grouping→link→verdict works.**
  - **Scale proof `scale_genomics_verify.py` (N=2000 RANDOM expressed genes, real GSE271517, fully
    auto-linked; grouping auto-fetched from the GEO series matrix — final review-hardened run):**
    **100% auto-link**; verdicts `{VERIFIED:1437, DISCREPANT:285, ASSUMPTION_VIOLATED:278}`;
    **error detection 100% at every seeded magnitude** (×1.1/1.3/2/10, **0 wrongly VERIFIED**);
    **link-fidelity 100%** (1666/1666 faithful not false-flagged; VERIFIED-only among faithful 86.3%);
    **assumption-violation prevalence 13.9% [95% bootstrap CI 12.3–15.4%]** (the random sample corrects
    the earlier first-N 7.7%, which was index-order biased). Report:
    `paper/replication/verification/SCALE_REPORT_2026-06-25.md`. (Methodology hardened per the
    adversarial review — see the review entry below; "link-fidelity" is a round-trip self-consistency
    check, NOT an independent arithmetic audit.)
  - **HONESTY caveat (in the report):** claims are built FROM the data then re-checked against the SAME data,
    so VERIFIED/specificity confirm the recompute+compare path is faithful (not an independent arithmetic
    audit — that's the no-data tier / real-paper runs). The independent results are error-detection (seeded
    perturbations) + assumption-violation prevalence. Sample = first N expressed genes (descriptive, not a
    population CI). flake8 CLEAN on all new modules/scripts.
  - **Adversarial review (3 dims — correctness/robustness/scientific-validity; 29 agents): 23 confirmed,
    3 FPs; 22 FIXED + 1 left as defensible-by-design.** Code fixes (`genomics_linker.py`/`geo_metadata.py`):
    (1) duplicate-gene-symbol crash → guard `expr.loc[[row]]`, return ambiguous on collision; (2) group
    matching used raw SUBSTRING containment (could FABRICATE a grouping, e.g. "Responder" inside
    "Non-responder", or single-char prefixes inside any word) → whole-WORD token-set match + subset
    absorption; (3) column-prefix fallback collided with real metadata → kept separate, consulted only
    when no metadata var resolves + ≥2-char prefixes; (4) `_index_is_symbol` now GATES the bare-symbol
    loop (no English-word gene hijack on id-indexed matrices) + expanded stop-words; (5) `geo_metadata`
    gzip-bomb → bounded decompress; (6) GSE accession validated before URL/path use; (7) multi-platform
    concat dedups the index; (8) colon-less GEO characteristics skipped (no ragged misalignment);
    (9) `link()` never raises (always a LinkResult); (10) `candidates` now a dict per the contract.
    **Scale-measurement honesty fixes** (`scale_genomics_verify.py`): wired `fetch_geo_metadata` so the
    scale run's grouping comes from the AUTO-FETCHED series matrix (loop genuinely closed); RANDOM gene
    sample (was first-N) + **bootstrap CI** (disclosed as independence-assuming/optimistic); relabeled
    "specificity"→**link-fidelity / round-trip self-consistency** with an explicit "NOT an independent
    arithmetic audit" disclosure + a separate VERIFIED-only rate; **graded error detection** (×1.1/1.3/2/10)
    replacing the single gross perturbation; softened the "Case Study 4 thesis/often/use a rank-or-count
    test" overclaim to "~X% (a minority) … check robustness / assumption-appropriate test"; noted the
    synthetic-prose + statistic-centric scope. Left by design: genomics linker uses `independent_t`
    (correct for two-group gene comparisons). **Regression tests added** (`check_genomics_linker.py` now
    **8/8**: + duplicate-symbol→ambiguous, one-group-named→not-fabricated, single-char-prefix→not-fabricated).
    flake8 CLEAN. 3 FPs dismissed.
- **2026-06-25 ~09:00 IST — MEASURED AUTO-LINK RATE across the cached GEO datasets** (Phase-B automation
  funnel; `paper/replication/verification/geo_autolink_rate.py` → `GEO_AUTOLINK_REPORT_2026-06-25.md`).
  Walks a per-dataset funnel (A loadable matrix → B series-matrix metadata → C grouping aligned to the
  matrix sample columns → D gene claims auto-link) over the 8 cached GEO accessions:
  - **End-to-end auto-link: 2/8 = 25%** of all cached; **2/3 = 67%** of those with a usable matrix.
  - Funnel: matrix 3/8, metadata 3/8, aligned grouping 2/8, auto-link 2/8.
  - **GSE271517** (ENSG index, series-matrix grouping aligned 100%) and **GSE303993** (transcript+Gene_ID
    index via symbol_map, grouping from nGD/WT column-name prefixes) → **100% auto-link**.
  - **GSE287628** has a matrix + fetchable metadata but the processed-matrix sample names (S41…) don't
    align to the series-matrix sample ids → C-FAIL (the real alignment gap). 4/8 deposit only
    `filelist.txt` (raw, no processed matrix); GSE283043's supplementary xlsx is corrupt (0 worksheets).
  - **Finding:** the drop-offs ARE the result — turn-key auto-linkability is the exception, which is
    precisely why INSUFFICIENT_DATA dominates the literature-scale picture and why the Phase-B headline
    is a *measurement* of verifiability. (Honest scope: link rate at D uses uniform synthetic phrasing
    in each dataset's own group vocabulary; the sample-id alignment heuristic is the next lever.)
  - Caught + fixed a real artifact: macOS AppleDouble `._*` sidecar files on the external drive were
    being mistaken for data tables → now skipped (dotfiles). flake8 CLEAN.
- **2026-06-25 ~10:00 IST — SAMPLE-ID ALIGNMENT HEURISTIC + title-derived grouping (closes GSE287628).**
  Built against the real GSE287628 failure: matrix cols `S41..S48`, but series-matrix titles are
  `"IL-2 41".."Ctrl 48"` and GSMs `GSM8749130..` — shared key = the numeric suffix; grouping is in the
  TITLE (IL-2 vs Ctrl).
  - `geo_metadata.align_samples(frame, sample_cols)` — maps metadata onto the matrix's sample columns,
    best-coverage-wins + INJECTIVE only: (1) exact, (2) normalized-alnum, (3) **discriminating-number**
    (a sample-distinguishing integer unique to one sample, e.g. `S41`↔`"IL-2 41"` via `41`), over both
    title and GSM. Positional/count-match alignment deliberately NOT attempted (a wrong order would
    silently mis-group → wrong verdicts).
  - `geo_metadata.parse_series_matrix` now also emits a **`_title_group`** column (strip a trailing
    sample number from the title → group label), capturing the common "group encoded in the title" case.
  - `genomics_linker._resolve_groups`: when several grouping variables tie, **collapse those that induce
    the SAME sample partition** (e.g. a title-derived group duplicating a characteristic) → not ambiguous
    (this was making GSE287628 link at 0% after alignment).
  - **Result: funnel 2/8 → 3/8 (38%); of datasets with a usable matrix 2/3 → 3/3 = 100%.** Every
    remaining cached failure is upstream (no processed matrix / corrupt file), not the linker.
  - `check_genomics_linker.py` now **9/9** (+ no-network `align_samples` numeric-suffix unit test);
    funnel re-run green; flake8 CLEAN.
- **2026-06-25 ~11:00 IST — PHASE-B AT-SCALE CORPUS PIPELINE BUILT (the path to thousands).** PI has
  agreed to the study (his idea) → proceeding with the large descriptive census now; the confirmatory
  H1–H4 + human double-coding for κ stay OSF-pre-reg-gated (descriptive census ≠ confirmatory).
  - **`jats_parser.py`** — PMC JATS / `pmc-articleset` XML → text (title/abstract/body/results/tables),
    scoping title to `<front>` + body to `<body>` (refs excluded; `<article-title>` also lives in every
    `<ref>`). **Closes the known "parser can't read JATS" gap.** Validated on all **80 cached pilot XMLs
    (80/80 parsed)**.
  - **`pmc_fetcher.py`** — polite NCBI E-utilities client. **Sampling gotcha found + fixed:** efetch
    from a history WebEnv rejects large `retstart` (HTTP 400), so a uniform offset into the 3.3M corpus
    is impossible → switched to **random publication-day sampling** (esearch each random day, well under
    the cap; efetch each by ID). Retries on 5xx only; caches by PMCID (resumable); no-egress.
  - **`census_jats.py` (`run_census`) + `large_census.py`** — orchestrator: esearch → fetch random
    sample → JATS parse → no-data consistency tier → aggregate (funnel + statcheck-comparable headline);
    per-paper JSONL to the drive, summary to the repo.
  - **Honest corpus finding:** in-text recomputable claims are SPARSE in a broad/genomics biomedical
    sample — 80-pilot: 9/80 papers have an in-text claim; 12-paper validation: 3/12 — because stats live
    in tables/figures or are genomics-style. So the "% of papers with an in-text checkable claim" is a
    reported funnel stage; the large run uses a quantitative-design query to ensure enough claim-bearing
    papers. Chain validated end-to-end (fetch→parse→census). flake8 CLEAN.
  - **PAPER COUNT now:** still pilots (~80 + 20) at this checkpoint; **the first true thousands-scale run
    (TARGET=2000 random OA papers) is IN FLIGHT** → `CENSUS_REPORT_LARGE_2026-06-25.md`. Scales to 5–10k
    by re-running with more days / higher target (cache makes it resumable).
- **2026-06-25 ~12:30 IST — FIRST REAL CENSUS (575 papers) + 17-finding review + methodology CORRECTION.**
  - **Operational gotcha:** a single background fetch run is killed at the ~10-min task limit (exit 144);
    the TARGET=2000 run cached **575 papers** before the kill (cache is resumable → not wasted). Fix:
    fetch in time-bounded chunks.
  - **Corpus-pipeline adversarial review (2 dims, 19 agents): 17 confirmed, 0 dismissed — ALL FIXED.**
    The verifiers also CALIBRATED impact (the inconsistency COUNTS were already correct; the bugs were
    in denominators + claim double-counting + sampling). Code fixes:
    (1) `jats_parser` table text was DOUBLE-COUNTED (body.iter('p') overlapped table-wrap text) → exclude
    float `<p>` from the body walk; (2) census denominator used ALL extracted claims but was labeled
    "statcheck-comparable" → added `n_checkable`/`n_decision_changing` to `VerificationProfile` and the
    census now reports rates over the **CHECKABLE (recomputable)** set (structured fields, no more
    substring scanning); (3) abstract folded into census text → double-counted restated results → census
    now extracts from `census_text` (body+tables, NOT abstract); (4) sampler within-day truncation
    (retmax=120 = "120 most-recently-indexed") → fetch the FULL day pool (retmax 9999) then random-pick;
    (5) days drawn 1–28 only → `calendar.monthrange` (1–31); (6) renamed `fetch_random_sample`→
    `fetch_corpus_sample` (it's day-clustered, NOT uniform-over-papers) + record day-volume per paper for
    inverse-probability weighting; (7) `fetch_stats.json` attrition funnel surfaced in the report;
    (8) multi-article/dotfile/dup-line nits. Mandatory **disclosures** added to the report (conditional
    population; day-cluster sampling; inline+flattened-table scope; two-tailed-only recompute; descriptive
    ≠ confirmatory).
  - **CORRECTED 575-census (preliminary; old sampler):** 575 parsed → **only 24/575 (≈4%) have an
    in-text RECOMPUTABLE NHST claim** (biomedical ≠ psychology — stats are in tables/figures); among the
    220 checkable claims: **20.0% inconsistent (44/220), 66.7% of those 24 papers (16/24) with ≥1
    inconsistency, 5 decision-changing.** The earlier buggy denominator gave 5.0%/14.3% — the correction
    matters. **Caveats:** small N (24 checkable-claim papers; wide CI); the 20% needs validation vs
    statcheck on a labelled set (one-tailed/rounding false positives); conditional population. The **~4%
    recomputable-in-text rate is itself a headline meta-research finding.**
  - **Now:** fixed-sampler fetch into a fresh corpus (`census_corpus_v2_2026-06-25`, 1000, chunked) IN
    FLIGHT → grow to 5–10k over several chunks (≈4% checkable-paper rate ⇒ need ~5k papers for ~200
    checkable-claim papers). flake8 CLEAN; verification-core regression green (check_verify_pipeline +
    7/7 control suite). For the FORMAL estimate, the OSF pre-reg should use the PMC OA file-list frame
    (equal-probability) — noted.
  - **CLEAN-SAMPLER v2 census — growing (985 → 1,982 → …; fixed sampler; supersedes the 575).**
    `CENSUS_REPORT_LARGE_2026-06-25.md`. The **census is now INCREMENTAL** (JSONL ledger keyed by PMCID;
    each chunk-census processes only NEW papers, validated "0 new, 0s" on a re-run) so it scales to
    5–10k under the per-run time limit.
    - **@985 papers:** 37 checkable-claim papers, 331 checkable claims → 10.6% inconsistent, 35.1% papers, 2.1% decision-changing.
    - **@1,982 papers:** 408 with ≥1 extracted claim → **70/1982 (3.5%) with a recomputable in-text NHST
      claim**; of **654 checkable claims, 16.1% inconsistent (105/654)**; **41.4% of the 70 checkable-claim
      papers (29/70)**; **42 decision-changing (6.4%)**.
    - **ROBUST:** the **~3.5–4% recomputable-in-text rate replicates** across 575/985/1982. **NOISIER:**
      the inconsistency rate (10.6%→16.1% claims; 2.1%→6.4% decision-changing) is still settling with N
      and the decision-changing figure is most exposed to false positives (one-tailed/rounding) → needs
      (a) more N and (b) **statcheck-FP validation on a labelled set** (pre-reg κ work). Accumulating
      chunks toward ~5k (chunk 3 seed=2 in flight; ~4% checkable rate ⇒ ~5k papers → ~200 checkable papers).
- **2026-06-25 ~14:00 IST — ✅ 5k META-RESEARCH CENSUS COMPLETE (5,053 papers; descriptive numbers frozen).**
  Built the full at-scale pipeline (`jats_parser` + `pmc_fetcher` + incremental `census_jats`) and ran
  it to target in time-bounded chunks (seeds 0-4; each ~1k papers ≤10-min task limit; incremental census
  only processes new papers). **FINAL @5,053 OA biomedical papers:**
  - **3.6% (180/5053) report an in-text RECOMPUTABLE NHST statistic** (~95% CI 3.1–4.1%) — the headline
    meta-research finding (most biomedical stats are in tables/figures, ≠ psychology). REPLICATED across
    every N from 575 onward.
  - Of **1,428 checkable claims: 15.3% internally inconsistent** (~13.5–17.2% naive binomial; paper-
    clustered wider), **41.1% of the 180 checkable-claim papers (74/180)**, **5.2% decision-changing
    (74)**. CONVERGED across 1982/2976/3959/5053.
  - Report `paper/replication/verification/CENSUS_REPORT_LARGE_2026-06-25.md`; per-paper JSONL ledger +
    corpus on the external drive. **Full recovery/handoff: `docs/SESSION_HANDOFF_2026-06-25.md`.**
  - **Mandatory open validation (disclosed in the report, pre-reg-gated):** (1) statcheck false-positive
    validation of the ~15% on a hand-labelled subset (one-tailed/rounding); (2) equal-probability OA
    file-list sampling frame for the FORMAL estimate (current = day-clustered); (3) confirmatory
    hypotheses + κ double-coding. These are the next paper's Phase-B work.
- **2026-06-25 ~16:00 IST — ✅ 10k CENSUS COMPLETE + FP-VALIDATION DONE.** Extended the corpus to
  **10,103 papers** (seeds 0-9, time-bounded chunks; incremental census ~30-40s/chunk). **FINAL @10,103:**
  **3.5% (352/10103)** report an in-text recomputable NHST stat (~95% CI 3.1-3.9%); of **3,110 checkable
  claims 14.5% inconsistent (raw)**, **42.0% (148/352) papers**, **4.2% decision-changing**. Converged
  N≈2k→10k. Report `CENSUS_REPORT_LARGE_2026-06-25.md`.
  - **FP-VALIDATION (`inspect_inconsistencies.py` + `adjudicate_inconsistencies.py` + 30-agent LLM
    cross-check workflow):** the raw ~15% is **inflated ~2-2.5×**. Of 219 flagged @5k: 47% TRUE / 37%
    FP_MISEXTRACTION (claim text has no p → p mis-paired) / 13% FP_ONE_TAILED / 4% p-bound. LLM agreed
    22/30, confirmed both dominant FP cats 13/13, refined (rounding in ~25% of TRUE; ~67% of p-bound
    genuine). **Validated true inconsistency rate ≈ 6-7% of checkable claims.** Report
    `FP_VALIDATION_REPORT_2026-06-25.md`.
  - **TWO ROBUST META-RESEARCH HEADLINES for the parallel paper:** (1) only **~3.5% of biomedical OA
    papers** report an in-text recomputable statistic (most stats are in tables/figures) — a novel
    measurement; (2) of those, **~6-7% are genuinely internally inconsistent** (validated; ~4% decision-
    changing raw).
  - **TOP ENGINEERING FIX (before any FORMAL/pre-reg census):** extractor p-mis-pairing in
    `claim_extractor.py` (dominant FP source; also inflates the verifier paper's recall). Then: OSF
    pre-reg + κ double-coding + equal-probability OA-file-list frame; then PI-gated manuscript items.
  - **ENV:** `.venv-verify` removed (local disk hit 99%/250MB → freed to 1.2GB); everything runs under
    `.venv-django`; background fetches use ABSOLUTE paths. Full recovery: `docs/SESSION_HANDOFF_2026-06-25.md`.
- **2026-06-26 — ✅ EXTRACTOR P-MIS-PAIRING FIX DONE (the TOP ENGINEERING FIX above).** Traced the 80
  `FP_MISEXTRACTION` flags to their source XMLs — it was **5 mechanisms**, not one: (1) mis-paired far p;
  (2) `t(1,644)` 2-df (recompute used df[0]=1; 32 of 80); (3) `;`/effect-size-interposed/fractional-df
  GENUINE inconsistencies mislabeled FP because strict patterns missed the p; (4) Cohen's `d z` / `Z(Y)`
  function notation; (5) `p=1`→0.1 parse. Fixes in `claim_extractor.py` (scoped p-attachment
  window=40 + provenance raw_text; generic guards; p-parse dot-capture; `;`/fractional-df strict) +
  `consistency_core.py` (t/chi df-arity guard; `decimals_from_token`). **Apples-to-apples on the same
  10,103-paper corpus (pre-fix via `git stash`): `FP_MISEXTRACTION` 157→0; census inconsistent
  14.5%→11.1%; decision-changing 4.2%→1.7%; papers 42.0%→37.8%; adjudicated clear-FP 45%→14%;
  TRUE_LIKELY 51%→79%.** No statcheck regression (recall 97.7% / prec 98.1%). +22 regression tests
  (`test_claim_extractor_pmispairing.py`); flake8 clean; ledger rebuilt (census_jats now kill-safe).
  Reports regenerated. **Validated true rate still ≈6-8%, but the RAW headline (11.1%) is now much closer
  to truth.** Full record: `docs/SESSION_HANDOFF_2026-06-26.md`. **Nothing committed.** Next: OSF pre-reg.
