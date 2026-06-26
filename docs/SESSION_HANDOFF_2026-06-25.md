# Session Handoff — 2026-06-25 (Verifier Django surface + Genomics auto-linker + Meta-research census)

**Timestamp:** 2026-06-25 IST · **Branch:** `docs/plos-compbio-submission`
**Purpose:** complete, self-contained recovery record. If the terminal crashes, a fresh session can
reconstruct ALL of today's work and resume from here. Companion: memory file
`session-2026-06-25-verifier-django-surface.md`; task log `docs/MANUSCRIPT_MODULE_TODO_2026-06-24.md`
(progress entries appended through today); PI status `docs/MANUSCRIPT_VERIFY_STATUS_2026-06-24.md`.

> Nothing is git-committed (per the user's norm). All work is on disk: code in the repo, big data on
> the external drive `/Volumes/My_Passport/stickforstats_corpus/`.

> **⚠ HARD PREREQUISITE: mount the external drive `/Volumes/My_Passport` FIRST.** ~3.2 GB of this
> work lives ONLY there and is NOT in git: the **10,103-paper census corpus**
> (`stickforstats_corpus/census_corpus_v2_2026-06-25/`, 3.0 GB), the per-paper JSONL ledger +
> `flagged_inconsistencies.jsonl` (`census_2026-06-25/`), the GEO cache (`geo_cache/`), and the
> 80-paper pilot XMLs. If the drive is not mounted, every census/fetch/adjudication script fails and
> the corpus would have to be re-fetched (~80 min for 10k). Re-fetching is possible but unnecessary if
> the drive is mounted.
>
> **⏸ SESSION PAUSED 2026-06-26 ~03:20 IST. Everything below is complete + frozen; nothing in flight.**
> **▶ NEXT SESSION START HERE:** the #1 task is the **extractor p-mis-pairing fix** in
> `backend/core/manuscript/claim_extractor.py` (the dominant census false-positive AND it inflates the
> verifier paper's recall — see §J1). Then OSF pre-reg / κ double-coding / OA-file-list frame (§H).
> 10k census + FP-validation are DONE (§F, §J1); verifier surface + genomics auto-linker are DONE.

---

## TL;DR — what happened today (4 threads)

1. **Thread B — Django verifier surface (T10/T22/T24): DONE + reviewed.** Stood up a full Django+scipy
   venv; added DB persistence (3 models + migration 0014), a Django orchestrator, and a REST surface
   (`POST /api/v1/verify/analyze/`, token-gated `GET /api/v1/verify/report/`). 7-finding adversarial
   review → all fixed.
2. **Genomics auto-linker: DONE + reviewed.** `genomics_linker.py` + `geo_metadata.py` auto-link a
   gene-level claim to its GEO data (gene + group resolution; series-matrix grouping; sample-id
   alignment heuristic). Genome-scale proof on real GSE271517. 23-finding review → 22 fixed.
3. **GEO auto-link rate funnel: DONE.** Measured across 8 cached GEO datasets → 3/8 (38%), 3/3 of
   datasets with a usable matrix (after the alignment heuristic).
4. **Meta-research census (the parallel paper, PI-greenlit): IN PROGRESS.** Built the JATS parser +
   PMC bulk fetcher + incremental census; accumulating a fixed-sampler corpus toward **5,000 papers**
   (currently ~3,000; chunk 4 in flight). 17-finding review → all fixed; methodology corrected.

**OSF pre-reg draft** exists (`docs/MANUSCRIPT_VERIFY_OSF_PREREG_DRAFT_2026-06-25.md`).
**PI decision:** PI has GREEN-LIT the census study (his idea) → proceeding with the large descriptive
run now; the confirmatory hypotheses + human double-coding for κ remain OSF-pre-reg-gated.
**Manuscript/bioRxiv (Case Study 4 / Group B):** still PI-gated, NOT touched today.

---

## A. New / changed files (all on disk; uncommitted)

**Backend modules (new):**
- `backend/core/manuscript/verification_service.py` — Django adapter (T22): run core → persist.
- `backend/api/v1/verify_views.py` — REST surface (T24): analyze + token-gated report.
- `backend/api/v1/_upload_utils.py` — shared upload helpers (de-dup of manuscript_views).
- `backend/core/manuscript/genomics_linker.py` — `GenomicsLinker` (auto gene+group linking).
- `backend/core/manuscript/geo_metadata.py` — GEO series-matrix fetch+parse + `align_samples` heuristic.
- `backend/core/manuscript/jats_parser.py` — PMC JATS-XML → text (closes the JATS gap).
- `backend/core/manuscript/pmc_fetcher.py` — NCBI E-utilities bulk fetcher (day-clustered sampling).
- `backend/core/migrations/0014_verificationrun_linkeddataset_claimverdictrecord.py`
- `backend/core/tests/test_verify_api.py` — 5 API tests.

**Backend modules (changed):**
- `backend/core/models.py` — +VerificationRun / ClaimVerdictRecord / LinkedDataset (+ `__all__`).
- `backend/core/manuscript/verdicts.py` — +`ClaimVerdict.claim_text`.
- `backend/core/manuscript/verify_pipeline.py` — +`n_checkable` / `n_decision_changing` structured counts.
- `backend/api/v1/urls.py` — +verify routes. `backend/api/v1/manuscript_views.py` — use shared helpers.
- `.gitignore` — +`.venv-django/`.

**Replication / census scripts (new) — `paper/replication/verification/`:**
- `real_data_through_surface.py` — real data through the new persisting service (5 verdict types).
- `check_genomics_linker.py` — genomics linker control suite (9/9; incl. `align_samples` unit test).
- `scale_genomics_verify.py` — genome-scale proof (→ `SCALE_REPORT_2026-06-25.md`).
- `geo_autolink_rate.py` — GEO auto-link funnel (→ `GEO_AUTOLINK_REPORT_2026-06-25.md`).
- `jats`/census: `census_jats.py` (`run_census`, INCREMENTAL) + `large_census.py` (orchestrator).
- Reports: `CENSUS_REPORT_LARGE_2026-06-25.md` (the growing v2 census), `CENSUS_REPORT_2026-06-25.md`,
  `SCALE_REPORT_2026-06-25.md`, `GEO_AUTOLINK_REPORT_2026-06-25.md`.

**Docs:** `docs/MANUSCRIPT_VERIFY_OSF_PREREG_DRAFT_2026-06-25.md`, this handoff, updated TODO + STATUS.

---

## B. Dev environments (read before running anything)

- **`.venv-django`** (repo root; gitignored; python3.11) — FULL app: Django 4.2.30 + DRF + scipy 1.17 +
  numpy 2.4 + heavy URLconf deps (lifelines/factor-analyzer/pmdarima/pyreadstat/anthropic/…). Run API
  tests, migrations, census, fetch here. Example:
  `cd backend && DJANGO_DEBUG=True ../.venv-django/bin/python manage.py test core.tests.test_verify_api`
- **`.venv-verify`** (repo root; gitignored; python3.11) — Django-FREE; for verification-core checks
  (poc/check_t*/check_verify_pipeline) via the namespace-package trick.
- Local anaconda scipy is numpy-2 ABI-broken — do NOT use it.
- **DISK:** local `/` is ~97–98% full (fluctuates 350–700 MB free; transient swap from scipy/lxml). ALL
  big data is on the external drive `/Volumes/My_Passport/stickforstats_corpus/` (958 GB free). If local
  free hits ~0 mid-run, recreate `.venv-django` on the drive. pip caches already purged.

---

## C. Thread B — verifier surface (DONE)

- **T10:** `VerificationRun` (paper profile + IDOR `report_token_hash`), `ClaimVerdictRecord` (per-claim;
  hot fields indexed), `LinkedDataset`. Migration `0014`. Applied to the dev sqlite.
- **T22:** `verification_service.run_verification()` — calls `verify_pipeline.verify_manuscript()` then
  persists in a transaction; JSON-safe (inf/nan→None, numpy-unwrap); best-effort.
- **T24:** `verify_views.py` — `POST /api/v1/verify/analyze/` (file|text + optional data table) +
  token-gated `GET /api/v1/verify/report/<uuid>/`. **No network egress by default.** URLs wired.
- **Tests:** `test_verify_api.py` 5/5; 16 neighbor Django tests green; verification-core suite green.
- **Review (7 confirmed, all fixed):** XLSX decompression-bomb DoS bound; exception-text leak genericized;
  report endpoint fail-closed; dead `page` column dropped; unused import; duplicated upload helpers →
  `_upload_utils.py`. flake8 clean.
- **Real-data proof:** `real_data_through_surface.py` ran real GSE271517 + 20 real papers through the
  NEW persisting service → VERIFIED/DISCREPANT/ASSUMPTION_VIOLATED/INSUFFICIENT_DATA/INCONSISTENT_REPORTING.

## D. Genomics auto-linker (DONE)

- `GenomicsLinker` (`genomics_linker.py`): resolves gene (Ensembl/transcript/symbol; index auto-detect;
  optional `symbol_map`) + two groups (claim group-words → a sample-metadata variable's two levels,
  whole-word + subset absorption; scoring disambiguation; column-prefix fallback). Never fabricates.
- `geo_metadata.py`: fetch+parse GEO series matrix → sample-metadata frame (ragged-characteristics
  fix); **`align_samples()`** sample-id alignment heuristic (exact / normalized / discriminating-number,
  injective-only; e.g. `S41`↔`"IL-2 41"`); `_title_group` (group from title prefix).
- **Control suite `check_genomics_linker.py`: 9/9** (incl. duplicate-symbol→ambiguous, fabrication
  guards, `align_samples` numeric-suffix unit test).
- **Scale proof (`SCALE_REPORT_2026-06-25.md`, N=2000 random genes, real GSE271517, fully auto-linked):**
  100% auto-link; error detection 100% at every seeded magnitude (×1.1/1.3/2/10, 0 wrongly VERIFIED);
  link-fidelity 100% (round-trip, NOT an independent audit); assumption-violation prevalence 13.9%
  [95% bootstrap CI 12.3–15.4%].
- **Review (23 confirmed, 22 fixed; 1 left by design = independent_t for two-group gene tests).**

## E. GEO auto-link rate (DONE)

`geo_autolink_rate.py` → `GEO_AUTOLINK_REPORT_2026-06-25.md`. Funnel over the 8 cached GEO datasets:
**3/8 (38%) end-to-end auto-link; 3/3 (100%) of datasets that have a usable matrix** (after the
alignment heuristic closed GSE287628). The drop-offs (4/8 filelist-only, 1 corrupt xlsx) are the
finding: turn-key auto-linkability is the exception.

---

## F. Meta-research census (IN PROGRESS — the parallel paper)

**Pipeline:** `jats_parser.py` (JATS→text) + `pmc_fetcher.py` (NCBI esearch/efetch; DAY-CLUSTERED random
sampling — NOT uniform over papers) + `census_jats.py::run_census` (INCREMENTAL: a JSONL ledger keyed by
PMCID; each run processes only NEW papers) + `large_census.py` (orchestrator).

**Corpus:** `/Volumes/My_Passport/stickforstats_corpus/census_corpus_v2_2026-06-25/` (fixed-sampler).
**Ledger/JSONL + reports JSONL:** `/Volumes/My_Passport/stickforstats_corpus/census_2026-06-25/`.
**Term:** `"open access"[filter] AND 2018:2025[pdat] AND (randomized OR cohort OR "case-control" OR
regression OR ANOVA OR correlation OR "t-test")`.

**Review (17 confirmed, 0 dismissed, ALL FIXED):** table-text double-count (exclude float `<p>`);
denominator must be CHECKABLE/recomputable claims (added `n_checkable`/`n_decision_changing`); abstract
double-count (census uses `census_text` = body+tables, no abstract); sampler within-day truncation →
full day pool; days 1–28 → real month lengths; renamed to `fetch_corpus_sample` (day-clustered);
fetch_stats attrition funnel; mandatory disclosures in the report.

**RESULTS (current, on the v2 fixed-sampler corpus — UPDATE as it grows):**
| corpus N | recomputable-paper rate | inconsistent claims | papers w/ inconsistency | decision-changing |
|---|---|---|---|---|
| 575 (old sampler) | 4.2% (24/575) | 20.0% (44/220) | 66.7% (16/24) | 5 |
| 985 | 3.8% (37/985) | 10.6% (35/331) | 35.1% (13/37) | 2.1% |
| 1,982 | 3.5% (70/1982) | 16.1% (105/654) | 41.4% (29/70) | 6.4% |
| 2,976 | 3.5% (104/2976) | 16.1% (140/868) | 45.2% (47/104) | 6.6% (57) |
| 3,959 | 3.7% (145/3959) | 15.7% (187/1191) | 43.4% (63/145) | 5.4% (64) |
| 5,053 | 3.6% (180/5053) | 15.3% (219/1428) | 41.1% (74/180) | 5.2% (74) |
| 6,037 | 3.6% (217/6037) | 13.8% (244/1765) | — | 4.4% (78) |
| 8,015 | 3.6% (291/8015) | 15.4% (394/2556) | — | 4.5% (116) |
| **10,103 (FINAL — 10k done)** | **3.5% (352/10103)** | **14.5% (450/3110)** | **42.0% (148/352)** | **4.2% (131)** |

**FINAL headlines (10,103-paper census):** **3.5%** of biomedical OA papers report an in-text
*recomputable* NHST statistic (~95% CI 3.1–3.9%); of the **3,110 checkable claims, 14.5% internally
inconsistent** (raw; ~13.3–15.7% naive, paper-clustered wider), **42.0% of the 352 checkable-claim
papers**, **4.2% decision-changing**. **FP-validated TRUE inconsistency rate ≈ 6–7%** (the raw ~14.5%
is inflated ~2–2.5× by extractor p-mis-pairing + one-sided p; see §J1). Rates stable from N≈2k → 10k.
Caveats (in the report): conditional population; day-cluster (not equal-probability) sampling;
inline+flattened-table extraction only; two-tailed recompute. Corpus = 10,103 papers across 744 random
days; per-paper JSONL ledger on the drive.

- **ROBUST headline:** ~3.5–4% of biomedical OA papers report an in-text *recomputable* NHST statistic
  (replicates across all runs). Most biomedical stats live in tables/figures (≠ psychology).
- **Converged (after the 985 outlier):** ~16% of checkable claims internally inconsistent; ~6.6%
  decision-changing — on ~104 checkable-claim papers (CIs tightening with N).
- **MANDATORY caveats (in the report):** conditional population; day-cluster (not equal-probability)
  sampling; inline+flattened-table extraction only; two-tailed recompute only → the ~16% NEEDS
  validation against statcheck on a labelled set to bound false positives (one-tailed/rounding); this is
  the DESCRIPTIVE census, the confirmatory layer is pre-reg-gated.

**CURRENT STATE:** ✅ **10,103 papers — 10k COMPLETE; descriptive numbers frozen** (table above).
352 checkable-claim papers / 3,110 checkable claims. Seeds 0-9 used. FP-validation DONE (§J1; validated
true rate ≈6-7%). Accumulation STOPPED at 10k. **ENV: `.venv-verify` removed (disk freed to 1.2GB); run
everything under `.venv-django`; launch background fetches with ABSOLUTE paths.** To extend further:
`fetch_corpus_sample(..., seed=10+)` then incremental `run_census` (§G). **Next: the extractor
p-mis-pairing fix (top FP source, §J1) before any FORMAL/pre-registered census; then OSF pre-reg; then
PI-gated manuscript items.**

---

## G. HOW TO RESUME (if the terminal crashed)

**The census (most likely in-flight):**
1. Check corpus size: `ls /Volumes/My_Passport/stickforstats_corpus/census_corpus_v2_2026-06-25/*.xml | grep -v '/._' | wc -l`
2. Fetch the next chunk (bumps the corpus ~+1000; resumable, caches by PMCID, skips existing):
   ```
   cd backend && DJANGO_DEBUG=True ../.venv-django/bin/python -c "
   import sys; sys.path.insert(0,'.'); from pathlib import Path
   from core.manuscript.pmc_fetcher import fetch_corpus_sample
   TERM='\"open access\"[filter] AND 2018:2025[pdat] AND (randomized OR cohort OR \"case-control\" OR regression OR ANOVA OR correlation OR \"t-test\")'
   fetch_corpus_sample(TERM, 1000, Path('/Volumes/My_Passport/stickforstats_corpus/census_corpus_v2_2026-06-25'), seed=<NEXT_SEED>)"
   ```
   (seeds used so far: 0,1,2,3 → use 4,5,…). Each fetch caps at the ~10-min task limit; that's fine
   (partial caches persist; just re-run with the next seed).
3. Re-census (incremental — fast, only new papers):
   ```
   cd backend && DJANGO_DEBUG=True ../.venv-django/bin/python -c "
   import sys; sys.path.insert(0,'../paper/replication/verification'); from pathlib import Path
   import census_jats
   census_jats.run_census(Path('/Volumes/My_Passport/stickforstats_corpus/census_corpus_v2_2026-06-25'),
       summary_path=Path('$(pwd)/../paper/replication/verification/CENSUS_REPORT_LARGE_2026-06-25.md'))"
   ```
4. Repeat fetch→census until ≥5,000; the report `CENSUS_REPORT_LARGE_2026-06-25.md` always reflects the
   full ledger.

**Verifier surface / genomics:** all committed to files; re-run the control suites:
`.venv-django/bin/python paper/replication/verification/check_genomics_linker.py` (9/9);
`manage.py test core.tests.test_verify_api` (5/5).

---

## H. PENDING / next (priority order) — updated 2026-06-26 03:20

DONE today: ✅ 10k census (was "to 5k"); ✅ FP-validation (was "validate the ~16%"). Remaining:

1. **▶ TOP: extractor p-mis-pairing fix** in `backend/core/manuscript/claim_extractor.py` — attaches a
   p-value from a NEIGHBOURING claim when the statistic's own text has none (the dominant census false
   positive, ~37% of flags; also inflates the verifier paper's recall/coverage). After the fix: re-run
   `inspect_inconsistencies.py` + `adjudicate_inconsistencies.py` to confirm the FP rate drops, and
   re-`run_census` (incremental). Add a regression test.
2. **OSF pre-reg** (`docs/MANUSCRIPT_VERIFY_OSF_PREREG_DRAFT_2026-06-25.md`) §11 PI decisions (year
   window, field scope, target N, the two coders, DISCREPANT tolerance, …) → file before the FORMAL
   confirmatory census.
3. **Formal census rigor:** κ double-coding (2 humans) on a gold subset; switch sampling to the PMC OA
   file-list frame (equal-probability, not day-clustered).
4. **PI-gated (untouched):** Case Study 4 / Group B correction + bioRxiv v2; venue choice (PLOS ONE /
   PeerJ / GigaByte / BMC Bioinf).
5. **Optional:** extend the corpus 10k → 20k (`fetch_corpus_sample` seed=10+; numbers already converged,
   low marginal value).

---

## I. Robust facts to re-load each session
- bioRxiv preprint LIVE: doi 10.64898/2026.06.15.732278 (Group B "74 false positives" is a known
  overclaim, correction PI-gated).
- PLOS Comp Biol desk-rejected 2026-06-24 (3rd scope rejection). Venue = PLOS ONE / PeerJ / GigaByte /
  BMC Bioinf (soundness-not-novelty), undecided.
- Authors: Vishal Bharti, Debojyoti Chakraborty (CSIR-IGIB).

---

## J. Work CONTINUING after the 5k census (in progress — resume notes)

Two strands, started right after freezing the 5k descriptive numbers:

**J1. False-positive validation of the ~15% inconsistency rate (the scientific crux).**
The ~15.3% needs adjudication: how many flagged "inconsistencies" are real vs artifacts of one-tailed
tests, rounding, p-reported-as-inequality, multiple-comparison correction, or wrong test-type mapping.
- Tool: `paper/replication/verification/inspect_inconsistencies.py` — re-runs the consistency check over
  the corpus papers that have inconsistencies (from the JSONL ledger) and dumps EACH flagged claim with
  full context (raw text, claim_type, statistic, df, reported p + comparison, recomputed p, severity) to
  `/Volumes/My_Passport/stickforstats_corpus/census_2026-06-25/flagged_inconsistencies.jsonl`.
- Adjudication tools: `inspect_inconsistencies.py` (dumps the 219 flagged claims w/ context) +
  `adjudicate_inconsistencies.py` (transparent rule-based categories). Report:
  `paper/replication/verification/FP_VALIDATION_REPORT_2026-06-25.md`.
- **RESULT (DONE):** of 219 flagged inconsistencies — rule-based: 47% TRUE_LIKELY, 37% FP_MISEXTRACTION
  (no p in the claim's own text → p mis-paired), 13% FP_ONE_TAILED, 4% p-bound. An independent 30-item
  LLM cross-check (workflow `fp-adjudication-crosscheck`) agreed 22/30, CONFIRMED both dominant FP
  categories 13/13, and refined: ~25% of TRUE_LIKELY are rounding, ~67% of p-bound are genuine. **Net
  validated true inconsistency rate ≈ 6–7% of checkable claims (raw 15.3% inflated ~2–2.5×).**
- **TOP FIX before the formal census:** the extractor mis-pairs a p-value from a neighbouring claim
  (`claim_extractor.py` p-attachment) — the dominant FP source; also inflates the verifier paper's recall.
- RESUME: re-run `inspect_inconsistencies.py` then `adjudicate_inconsistencies.py` (both fast, read the
  ledger). Full double-coding for the precise rate = the pre-registered study.

**J2. Extend the corpus toward 10k** (tightens CIs, esp. the per-paper rate; numbers already converged).
- RESUME: `fetch_corpus_sample(TERM, 1000, <census_corpus_v2 dir>, seed=N)` for seeds 5,6,7,8,9 (one per
  background run, ≤10-min limit), then re-run the incremental `run_census` (see §G). Each chunk ≈ +1000.

Status checkpoints get written to this doc's §F table + the memory file at each census milestone.
