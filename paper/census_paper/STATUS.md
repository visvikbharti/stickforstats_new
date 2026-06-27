# Census paper — status & next actions

A crisp tracker for the **second paper** (the meta-research census). The prose draft is `DRAFT.md`.

## DONE (committed under `paper/replication/verification/`)
- ✅ Descriptive census over **10,103** PMC OA biomedical papers (JATS-XML → regex extraction → statcheck-style recompute).
- ✅ Headline numbers: ~3.5% report an in-text recomputable stat; 3,005 checkable claims; **11.1%** raw inconsistent, **1.7%** decision-changing; FP-validation → single-digit genuine rate.
- ✅ Robustness: IPW re-estimate (≤0.6 pp shift) + independent general-OA frame (5.6%, directional).
- ✅ Extractor false-positive fix (mis-extraction 157 → 0).
- ✅ statcheck head-to-head: recall 97.7% / precision 98.1%.
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
- ✅ **`build_gold_set.py`** — already drew the blinded **`gold_set_coding_sheet.csv`** (150 flagged claims,
  stratified, seed 20260627) + a separate `gold_set_key.csv` (tool verdicts, held back for blinding).
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

## Relationship to the other papers
This is one of **three** from the same program: the platform paper (`../submission_package/`), the
verifier-tool software paper, and this census. Sequence so each preprint can cite the others.

## Drive reminder
Re-running the census or regenerating figures needs `/Volumes/My_Passport` mounted (the 3.2 GB
corpus/ledger/GEO cache is not in git). Reading the draft/reports does not.
