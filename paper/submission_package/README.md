# submission_package — venue-neutral and superseded material only

> ## The BMC Bioinformatics submission is **not here**.
> It lives in **`paper/bmc_bioinformatics/`**. Start with that directory's `README.md`.

On 2026-08-04 every BMC-specific file was moved out of this directory into
`paper/bmc_bioinformatics/`, so that there is exactly one place to look and no chance of anyone editing a
stale copy of the manuscript. What moved:

| Was here | Is now |
|---|---|
| `manuscript.md` | `paper/bmc_bioinformatics/manuscript.md` |
| `manuscript_bmc.docx` | `paper/bmc_bioinformatics/manuscript.docx` |
| `additional_file_1.md` | `paper/bmc_bioinformatics/additional_file_1.md` |
| `BMC_COVER_LETTER.md` | `paper/bmc_bioinformatics/cover_letter.md` |
| `BMC_SUGGESTED_REVIEWERS.md` | `paper/bmc_bioinformatics/suggested_reviewers.md` |
| *(none — `SUBMISSION_STEPS.md` was written new in `paper/bmc_bioinformatics/`, not moved)* | `paper/bmc_bioinformatics/SUBMISSION_STEPS.md` |
| `figures/` | `paper/bmc_bioinformatics/figures/` |
| `figures_plos` symlink | deleted — the manuscript now references `figures/` directly |

## What remains here, and why

| File | Status |
|---|---|
| `BIORXIV_V2_UPLOAD.md` | bioRxiv v2 packet. **Superseded** — it instructs a PDF upload and uses the pre-renumbering figure names, and the v2 route is blocked upstream |
| `COVER_LETTER.md` | The generic / PLOS-era cover letter, kept for the PLOS backup route. **Not** the BMC letter |
| `VENUE_RECOMMENDATION.md` | The nine-venue comparison that led to choosing BMC Bioinformatics. Historical rationale |
| `CHANGES_FROM_PREPRINT.md` | What changed between the bioRxiv preprint and the submitted paper. Historical, and it predates the 2026-08-04 corrections, so it is no longer a complete changelog |
| `SUBMISSION_GUIDE.md` | **Superseded** by `paper/bmc_bioinformatics/SUBMISSION_STEPS.md`. Kept because older handoff documents cite it by name |
| ~~`STALE_DO_NOT_SUBMIT_manuscript_rendered_2026-07-08.pdf`~~ | **Deleted, not archived.** It was the old PLOS-structured render carrying the pre-correction numbers, kept locally as a tripwire. It is deliberately absent from the v1.2.0 tag: that tag is archived to Zenodo and cited by the manuscript, and a 2.3 MB PDF full of superseded statistics has no business inside a citable artifact where someone unpacking the zip could read it as current. Rebuild a reading copy from `manuscript.md` if you need one |

## Why this directory still exists at all

Several dated documents under `docs/` — session handoffs, the onboarding notes, the release playbook — cite
paths inside `paper/submission_package/`. Those are records of what was believed at the time and are
deliberately left unedited, so this directory is kept as a real location rather than deleted, with this file
at the top of it to stop anyone following an old path into a stale manuscript.

## Corrections to what this file used to say

The previous version of this README described the package as self-contained and ready, and said the
manuscript was "already corrected". Both were true of an earlier round of fixes and both became misleading:

- ~~"Everything you need to upload is in this folder"~~ — the manuscript was a PDF, which BMC does not accept, and there was no Additional file 1 at all.
- ~~"already corrected (Group B reframed; extraction described as regex-based)"~~ — the text said regex-based while Fig. 3 still had "regex + LLM hybrid" drawn into it, and the Group B reframing rested on fold changes that were not fold changes. Both were fixed on 2026-08-04.
- ~~"pick a venue (default recommendation: PLOS ONE)"~~ — the venue decision was settled as BMC Bioinformatics; see `VENUE_RECOMMENDATION.md`.

Full detail: `docs/BMC_SUBMISSION_VERIFICATION_2026-08-04.md`.
