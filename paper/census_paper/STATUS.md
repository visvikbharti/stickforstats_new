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

## NEEDED before submission (decisions are yours; PI delegated them)
1. **File the OSF pre-registration** — resolve the 10 `[PI DECISION]` items in
   `docs/MANUSCRIPT_VERIFY_OSF_PREREG_DRAFT_2026-06-25.md` (year window, field scope, target N, the two
   human coders, DISCREPANT tolerance, κ threshold, gold-set size, etc.).
2. **κ double-coding** — recruit **2 coders** to double-code a ~150-paper gold set (blinded), require
   **Cohen's κ ≥ 0.6**, then estimate the tool's sensitivity/specificity/PPV per verdict. This is the
   credibility anchor ("how do you know it's right?").
3. **Run the confirmatory census** on the equal-probability PMC OA file-list frame (the descriptive one
   used day-clustered sampling; IPW already shows it doesn't bias the rate, but the formal estimate uses
   the file-list frame).
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
