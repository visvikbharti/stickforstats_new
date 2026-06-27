# Submission package — StickForStats platform paper

A **self-contained package** for resubmitting the StickForStats software paper to a new journal.
Everything you need to upload is in this folder.

**Paper:** *StickForStats: automated statistical assumption validation for reproducible computational biology*
**Authors:** Vishal Bharti, Debojyoti Chakraborty (CSIR-IGIB)
**Live preprint:** bioRxiv doi 10.64898/2026.06.15.732278 (this version supersedes it)

## What's in here

| File | What it is |
|---|---|
| `manuscript.md` | The full manuscript — **already corrected** (Group B reframed; extraction described as regex-based). This is the version to submit. |
| `figures/` | The 7 manuscript figures (`fig1`–`fig7`, PNG). Re-export to the chosen journal's DPI/format before submitting. |
| `COVER_LETTER.md` | A ready cover letter with `[JOURNAL]`/`[EDITOR]`/`[DATE]` placeholders + per-venue tailoring notes. |
| `SUBMISSION_GUIDE.md` | **Start here.** Step-by-step submission, a ranked journal list (with fit/APC/watch-outs), and a pre-submission checklist. |
| `CHANGES_FROM_PREPRINT.md` | A transparent changelog vs the bioRxiv v1 — the two integrity corrections + the reframing. Useful for the cover letter and a bioRxiv v2. |

## How to use it (short version)

1. Read **`SUBMISSION_GUIDE.md`** → pick a venue (default recommendation: **PLOS ONE**; cheaper: **PeerJ** or **GigaByte**).
2. Reformat `manuscript.md` to that venue's house style; re-export `figures/` to its spec.
3. Fill in `COVER_LETTER.md` (`[JOURNAL]`/`[EDITOR]`/`[DATE]`) and the per-venue first paragraph.
4. Mint a **Zenodo DOI** from the v1.0.0 GitHub release; add it to the Data/Code Availability statement.
5. Work through the **pre-submission checklist** in the guide, then submit.

> Every fee/format detail in the guide is marked **"VERIFY at submission"** — confirm on the journal's site the day you submit; do not rely on the numbers here for cost decisions.

## Important notes

- **The integrity fixes are already applied** in `manuscript.md` (you do not need to redo them) — but if you also post a **bioRxiv v2**, apply the same two corrections to that abstract/text (see `CHANGES_FROM_PREPRINT.md`).
- Figure sources also live at `../plos_compbio/figures_plos/` (originals).
- This is the **first of three** papers from this program. The **meta-research census paper** (the second) is being drafted under `../census_paper/` — keep them as separate submissions.
- Replication scripts for every reported value are under `../replication/`.
