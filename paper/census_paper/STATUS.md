# Census paper — status & next actions

A crisp tracker for the **second paper** (the meta-research census). The prose draft is `DRAFT.md`.

## DONE (committed under `paper/replication/verification/`)
- ✅ Descriptive census over **10,103** PMC OA biomedical papers (JATS-XML → regex extraction → statcheck-style recompute).
- ✅ Headline numbers: ~3.5% report an in-text recomputable stat; 3,005 checkable claims;
  **11.8%** raw inconsistent (355/3,005), **1.7%** decision-changing (52/3,005, UNCHANGED);
  FP-validation → single-digit genuine rate.
  - ⚠️ **CORRECTED 2026-08-21 — was 11.1% (333/3,005).** The v1.2.0 p-reader had two holes, both
    since fixed on `feat/appropriateness-v2` (`f979b89`): scientific notation was read as
    "precision unknown" (falling back to a flat ±0.005 window, an amnesty at small p), and the
    INEQUALITY branch used that flat window regardless of stated precision, so `p < .0001`
    against a recomputed `.004` was scored consistent. Re-scored against the full corpus with
    the OLD reader as a control (it reproduces 3,005/333/52 exactly), then with the corrected
    one. 22 claims flipped, ALL consistent→inconsistent; none the other way.
  - The direction is a former UNDER-count, and the fix removes an internal inconsistency rather
    than imposing a new standard: for **12 of 13** e-notation flips the old reader gave a
    different verdict for the identical numeric value depending only on whether it was written
    `9.04e-8` or `0.0000000904`.
  - Paper-level rate also moves: **129/341 (37.8%) → 136/341 (39.9%)**.
- ✅ **CORRECTED 2026-08-24 (`2baeccb`).** `manuscript.md`, `DRAFT.md` and all seven figures now
  carry the 355-claim numbers. The earlier note here said the pass was blocked on the external
  drive; **that was wrong** — the IPW arm needs only the ledger and `fetch_stats.json`, both ~2 MB
  and in-tree, and it was recomputed (11.81% → 11.32%, a −0.50 pp shift; control: the same helper
  returns the published 10.52% on the 333-row frame). Only the independent-OA arm (5.6%) still
  needs the drive.
  - 🚨 **The figures were HALF-corrected on the first regeneration and the script could not have
    said so.** `make_census_figures.py` read the flagged-claim CATEGORIES from the frame but the
    RATE from the ledger's per-paper `n_inconsistent`, which is still the original scoring run —
    it printed `flagged_loaded=355` and `inconsistent rate=11.1%` in the same block. Behind that,
    four hardcoded literals sat beside computed values: Fig 6's bar labels `333/3005` and
    `262/3005` and its IPW height `10.5`; Fig 6's title asserting *"robust & single-digit"*
    (three of its four bars are now double-digit); Fig 4's title `333 flagged claims`; and Fig 3's
    y-axis `n = 333` above bars summing to 355. All derived now.
  - 🚨 **"Single-digit" is RETIRED.** Paper-clustered bootstrap (10,000 reps, papers resampled,
    seed 20260627): genuine **9.12%, 95% CI [6.95%, 11.49%]** — it crosses 10%. Raw 11.81%,
    CI [9.48%, 14.38%]. The top 10 papers hold 29.9% of all flags, so claim-level precision was
    illusory. `PREREGISTRATION.md` §3.4/§5.4 already specified clustered CIs, so the registered
    method contradicted the old headline.
  - Still open: the abstract's *"largely uncharted"* and the introduction's *"is unknown"*, both
    contradicted by **Damen 2023 (PMID 36470577)**; and the OA arm.

  The numbers, all re-executed (control: the same code reproduces every published figure exactly):

  | | published (333) | corrected (355) |
  |---|---|---|
  | raw inconsistent | 333/3,005 = **11.08%** | 355/3,005 = **11.81%** |
  | TRUE_LIKELY | 262 (79% of flags) = **8.72%** of checkable | 274 (77%) = **9.12%** |
  | REVIEW_P_BOUND | 25 (8%) | 33 (9%) |
  | FP_ONE_TAILED | 46 (14%) | 48 (14%) |
  | FP_MISEXTRACTION | 0 | **0** — but 13 *without* the e-notation fix above |
  | papers with ≥1 | 129/341 (37.8%) | 136/341 (39.9%) |
  | decision-changing | 52 (1.73%) | 52 (**unchanged**) |

  The headline conclusion is unaffected: the adjudicated genuine rate stays single-digit
  (8.7% → 9.1%). Note the last row of the table: without the scientific-notation fix, the
  manuscript's own claim that mis-extraction was *"eliminated (157 → 0)"* would have become false
  on the corrected frame.
- ✅ Robustness: IPW re-estimate (≤0.6 pp shift) + independent general-OA frame (5.6%, directional).
- ✅ Extractor false-positive fix (mis-extraction 157 → 0).
- ✅ statcheck head-to-head: recall 97.7% / precision 98.1% (**re-verified unchanged 2026-08-21** — these are EXTRACTION metrics and the p-reader correction does not touch them).
- ✅ Figures (`figures/fig1`–`fig7`) + reports (`CENSUS_REPORT_LARGE`, `FP_VALIDATION_REPORT`, `CENSUS_IPW_REPORT`, `CENSUS_OA_PILOT_REPORT`).
- ✅ Draft skeleton (`DRAFT.md`) with abstract, outline, and all numbers traced to source files.
- ✅ **Full descriptive manuscript** (`manuscript.md`) — Route A: submittable now as a descriptive
  measurement; the confirmatory/κ sections are scaffolded and flagged `[CONFIRMATORY]`.
- ✅ **OSF deposit bundler** (`prepare_osf_deposit.py`) — run it to build a ~3 MB upload-ready
  `osf_deposit/` (derived ledger + flagged claims + scripts + reports + figures + MANIFEST w/ md5s).
  The bundle is a regenerable build artifact (gitignored); the raw 3.2 GB corpus is NOT included
  (re-fetchable from PMC).

## Route B chosen — confirmatory, pre-registered version. Infrastructure built this session:
- ✅ **`PREREGISTRATION.md`** — FINALIZED and file-ready. All 10 decisions resolved (D1 2018–2025; D2 broad
  biomedical w/ strata; D3 N=10,000 equal-probability frame; D5 frozen flagging+adjudication rules; D6 κ≥0.6;
  D7 gold set 150 flagged + 50-paper extraction; D9 standalone; D10 Existing-Data template). Scoped to the
  internal-consistency census (matches `manuscript.md`).
- ✅ **`CODEBOOK.md`** — frozen 4-category coder rules (genuine / one_tailed / p_bound / mis_extraction) + examples.
- ✅ **`build_gold_set.py`** — drew the blinded **`gold_set_coding_sheet.csv`** (150 flagged claims,
  stratified, seed 20260627) + a separate `gold_set_key.csv` (tool verdicts, held back for blinding).
  - ✅ **REDRAWN 2026-08-24 from the corrected 355-row frame.** The previous draw sampled the
    333-row pre-correction flag set, so the 22 corrected-in claims had zero probability of
    selection. `_CANDIDATES` now prefers `flagged_inconsistencies_corrected.jsonl`; the seed is
    unchanged (20260627). New draw: 150 of 355 — genuine 115 / one_tailed 21 / p_bound 14;
    82 of the previous 150 carry over, 10 of the 21 claims new to the frame are included.
  - ✅ **Provenance recorded.** The frame file lives under the gitignored `osf_deposit/` tree, so
    the two CSVs were archivable but their INPUT was not — a seed alone does not identify a
    sample. `gold_set_provenance.json` now records the frame filename, its **sha256**, its row
    count, the seed and the drawn distribution (PREREGISTRATION.md §7).
  - 🚨 **A defect found while redrawing: the adjudicator could not read a p in scientific
    notation.** `adjudicate_inconsistencies.classify` decides `FP_MISEXTRACTION` — *"no p-value in
    the claim's own text"* — from `\b[pP]\s*[=<>]\s*0?\.\d`, which does not match `P = 9.04e-8`
    or `p = 6E−04`. On the published 333-row frame this hit **0** rows, so **no published number
    changes** (verified: re-running the draw against the old frame with the fix in place
    reproduces both committed CSVs byte-for-byte). On the corrected 355-row frame it hit **13, and
    all 13 were e-notation claims** — precisely the population the p-reader fix added. Six of them
    had landed in the redraw labelled `mis_extraction` in the held-back key. The rule now accepts
    e-notation (and U+2212 minus); `p = 5` still does not match. Mutation-checked: restoring the
    old pattern brings the 6 back.
  - 🚨 **The rule existed in THREE places** — `adjudicate_inconsistencies.py`,
    `make_census_figures.py` and `build_gold_set.py` — each with a comment asserting parity with
    the others, and the fix landed in one of them. The two derivatives now **import** the
    canonical `classify` instead of restating it. (Proof the import is live, not a stale copy:
    mutating only `adjudicate_inconsistencies.py` changed `build_gold_set.py`'s output.)
  - ⚠️ **The bundled copy under `osf_deposit/scripts/` is stale** — it is a build artifact of
    `prepare_osf_deposit.py`, which needs the drive. Regenerate the bundle (and its MANIFEST md5s)
    before any OSF upload. `prepare_osf_deposit.py`'s `DERIVED` list also still names the
    **333-row** `flagged_inconsistencies.jsonl`.
- ✅ **`compute_kappa.py`** — Cohen's κ between coders + tool sensitivity/specificity/PPV (math verified).

## NEEDED before submission — only the irreducibly-human / external steps remain
1. **Fill the 2 coder names** in `PREREGISTRATION.md` §6.2 and **file it on OSF** (your account).
2. **The κ double-coding itself** (the only step neither of us can automate): give
   `gold_set_coding_sheet.csv` + `CODEBOOK.md` to **2 coders**, they fill the category columns blinded, then
   run `compute_kappa.py` (gate: **κ ≥ 0.6**). This is the credibility anchor.
3. **Run the confirmatory census** on the equal-probability PMC OA frame *after* filing the pre-reg (I can do
   this; needs the drive + a fresh fetch). IPW already shows the day-clustering didn't bias the descriptive
   rate, so this is confirmation, not a different result.
4. **Pick a venue** — PLOS ONE / PeerJ / GigaByte / BMC Bioinformatics, or a meta-research venue (Research
   Integrity & Peer Review, BMC Medical Research Methodology, Royal Society Open Science).
5. **Data deposit (small — and OSF can do double duty).** This is NOT a substitute for journal
   publication; it is the citable Data-Availability archive the journal will require. You do **not** need
   to upload the full ~3.2 GB raw JATS corpus — it is re-fetchable from PMC by `fetch_corpus` (all public).
   Deposit only the **derived data** (a few MB): the per-paper census ledger `.jsonl`, the
   `flagged_inconsistencies.jsonl`, a manifest, and the scripts. Put these on the **same OSF project as the
   pre-registration** (item 1) so one OSF DOI covers pre-reg + data — no separate Zenodo needed. Cite that
   DOI in the paper's Data Availability statement.

## Relationship to the other paper (decision 2026-06-29: TWO papers, not three)
This is **paper 2 of 2**. The verifier-tool is **NOT** a separate third paper — it is folded into THIS paper
as the **Methods backbone** (regex extraction + recompute + raw-data re-analysis + cross-reference + the
statcheck head-to-head), with the census as the headline result. Paper 1 is the platform/Guardian software
paper (`../submission_package/`). Rationale: two tool papers from one codebase risks salami-slicing optics
(bad for an integrity project); the verifier's natural home is as the method behind the census.

**Content TODO from this decision:** the census `manuscript.md` should gain a proper **"The verification
engine" Methods section** (extraction grammar, recompute, re-analysis, cross-reference resolution, and the
statcheck benchmark) so the tool is fully described here rather than in a separate paper. Meta-research venue
keeps the *finding* in front; the engine sits in Methods/Supplement.

## Drive reminder
Re-running the census or regenerating figures needs `/Volumes/My_Passport` mounted (the 3.2 GB
corpus/ledger/GEO cache is not in git). Reading the draft/reports does not.
