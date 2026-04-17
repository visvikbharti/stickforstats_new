# Second-Coder Handoff — Retraction Backtest Label Audit

Pre-registered protocol, §9.2. This directory is everything a second human coder needs to independently re-label a stratified random sample of retraction notices so we can compute Cohen's κ against the primary coder and decide whether the labels are reliable enough to proceed with primary analysis.

## Task summary

**What you are doing.** Reading the verbatim Retraction Watch `Reason` column (and, where needed, the linked retraction-notice DOI) for each row in `labeling_sheet.csv` and classifying it as one of:

| Label       | Meaning                                                                                |
|-------------|----------------------------------------------------------------------------------------|
| `stat`      | Retracted because of a statistical / data-analysis issue (per `codebook.md` §1).       |
| `nonstat`   | Retracted solely for non-statistical reasons (plagiarism, image, ethics, etc.; §2).    |
| `ambiguous` | Reason codes contain both statistical and non-statistical elements (§3).               |

**What you must not do.**
- Do not read the original manuscript's SQS score. You will not have access to it; the primary coder and the SQS scorer are blinded to each other.
- Do not look at the primary coder's labels. `primary_labels.csv` is kept out of this directory in the handoff package given to you and is only brought back for κ computation.
- Do not consult other coders during labeling. Independence is what makes the κ estimate meaningful.
- Do not add new labels. If a row genuinely cannot be classified under the three labels above, write `ambiguous` and leave a note in the `notes` column — but try to classify first.

## Files in this directory

| File                      | Who writes it                   | Purpose                                                               |
|---------------------------|---------------------------------|-----------------------------------------------------------------------|
| `README.md`               | (this file)                     | Instructions.                                                         |
| `codebook.md`             | Primary coder (pre-frozen)      | The §9.1 codebook in standalone form — the sole labeling rubric.     |
| `prepare_sample.py`       | Primary coder (pre-frozen)      | Generates the stratified sample + splits primary labels into a separate CSV. Already run; do not rerun. |
| `labeling_sheet.csv`      | `prepare_sample.py` output      | The rows you will label. Columns: `record_id, reason_raw, journal, retraction_doi, your_label, notes`. |
| `primary_labels.csv`      | `prepare_sample.py` output      | The primary coder's labels for the same rows. **Held separately during your labeling** — brought back only at κ time. |
| `_sample_manifest.json`   | `prepare_sample.py` output      | Seed, date window, stratum sizes, source-commit SHA. Reproducibility artifact. |
| `compute_kappa.py`        | Primary coder (pre-frozen)      | Computes Cohen's κ + 95 % CI + confusion matrix once you return `labeling_sheet.csv`. |
| `test_kappa.py`           | Primary coder (pre-frozen)      | Tests for `compute_kappa.py`. Run with `python -m unittest test_kappa`. |
| `kappa_report.md`         | `compute_kappa.py` output       | The reliability report. Generated post-hoc and committed to the repo. |

## Your workflow

1. **Read `codebook.md` end-to-end.** The decision tree is 3 pages and has worked examples. Time budget: ~20 minutes.
2. **Open `labeling_sheet.csv`** in your editor of choice (LibreOffice, Excel, VS Code — all fine).
3. **For each row, fill in the `your_label` column** with exactly `stat`, `nonstat`, or `ambiguous` (lower case). Optionally add a free-text note in `notes`.
4. **Do not add or delete rows.** Do not reorder rows. Do not change any column other than `your_label` and `notes`.
5. **Save in place** (same filename, UTF-8 CSV).
6. **Hand the file back** to the primary coder as a git attachment or email.
7. The primary coder then runs `python compute_kappa.py`, which writes `kappa_report.md` and commits it alongside `labeling_sheet.csv`.

Expected labeling time: **2–4 hours for 150 rows**, split across 2–3 sessions. Fatigue errors dominate after ~60 rows in a sitting.

## How the sample was constructed

- **Source.** Retraction Watch CSV, full dataset as of the timestamp in `_sample_manifest.json`.
- **Filter.** Identical to `PROTOCOL §7.2`: `RetractionDate YEAR ∈ [2010, 2023]`, `OriginalPaperDate YEAR ∈ [2010, 2023]`, `OriginalPaperDOI present`, `OriginalPaperPubMedID present`.
- **Stratification.** After applying `_label_statistical_reason` (the primary coder's codebook encoded in `harvest.py`), we draw `N = 50` rows from each of the three classes (`stat`, `nonstat`, `ambiguous`) → `N_total = 150`. Equal allocation gives the most power for the κ estimate regardless of base-rate imbalance.
- **Shuffle.** Rows are shuffled with the same PRNG seed (`20260417`) used elsewhere in the study, so the second coder cannot trivially infer strata by reading the file top-to-bottom.
- **Blinding.** The `labeling_sheet.csv` given to the second coder contains **only** the reason text and identifiers. The `primary_labels.csv` is kept in the handoff package but is typically not given to the coder; the primary coder (or an independent third party) runs `compute_kappa.py` after the coder returns their labels.

## κ thresholds (pre-committed per PROTOCOL §9.2)

| Cohen's κ        | Action                                                                                   |
|------------------|------------------------------------------------------------------------------------------|
| **≥ 0.80**       | Accept the labels. Proceed with primary analysis.                                        |
| **0.60 – 0.80**  | Proceed with adjudication: a third coder resolves disagreements; disagreement rate is publicly reported. |
| **< 0.60**       | **Halt the primary analysis.** Rewrite the codebook and disclose the issue in the paper. We will not run the primary analysis on unreliable labels. |

These thresholds were committed in `PROTOCOL.md` before any labels were seen. They are not negotiable post-hoc.

## Questions

Write your question in the `notes` column of the relevant row, label as best you can, and return the sheet. The primary coder will adjudicate after κ is computed. For general questions about the task, email the corresponding author listed in `OSF_PREREGISTRATION.md`.
