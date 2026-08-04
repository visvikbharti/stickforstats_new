# BMC Bioinformatics submission package

**This directory is the single source of truth for the BMC Bioinformatics submission.** Nothing outside it
needs to be uploaded, and nothing inside it is a duplicate of anything elsewhere. If a file for this
submission is not here, it does not exist.

Created 2026-08-04, when the BMC material was moved out of `paper/submission_package/` — that directory now
holds only venue-neutral and superseded material (bioRxiv packet, generic cover letter, venue research) and
must not be used for this submission.

---

## What to upload, in order

| # | Portal slot | File here | Notes |
|---|---|---|---|
| 1 | Manuscript | **`manuscript.docx`** | The only acceptable format. **Not a PDF** — BMC requires an editable file with figures placed in the body |
| 2 | Additional file 1 | **`additional_file_1.md`** → export to PDF | Supplementary information, sections S1.1–S1.5 |
| 3 | Additional file 2 | a source archive of the released tag | BMC "strongly recommends" shipping the software, because weblinks rot. Use the Zenodo zip for the version the paper cites |
| — | Cover letter | **`cover_letter.md`** | Paste the body into the portal field |
| — | Suggested reviewers | **`suggested_reviewers.md`** | Six named, conflict-checked. Fill any blank emails first |
| — | Figures | already embedded in `manuscript.docx` | Separate upload is optional at initial submission, required on acceptance. `figures/` holds the originals plus vector PDFs for Figs 4, 6 and 7 |

**Follow `SUBMISSION_STEPS.md`** for the ordered procedure, the pre-submission verification gate, and the
items that still need an author decision.

---

## Files

```
manuscript.md            the editable source of truth — edit this, never the .docx
manuscript.docx          built from manuscript.md by ../build_bmc_docx.sh; do not hand-edit
additional_file_1.md     supplementary information (S1.1–S1.5)
cover_letter.md          BMC cover letter
suggested_reviewers.md   preferred reviewers, with conflict notes
SUBMISSION_STEPS.md      the step-by-step procedure and what is still open
figures/                 fig1…fig7 PNGs + vector PDFs where available
README.md                this file
```

## Rebuilding the manuscript

```bash
bash paper/build_bmc_docx.sh
```

That regenerates `manuscript.docx` from `manuscript.md` and **asserts** — failing loudly if any check does
not hold — that the figure and table counts match the manuscript, that continuous line numbering and double
line spacing are present, and that superscripts converted. Run it after every edit to `manuscript.md`.

To produce a human-readable PDF (for reading only, **never for submission**):

```bash
bash paper/render_pdfs.sh     # writes manuscript_reading_copy.pdf here
```

## Verifying the numbers

Every reported value in the manuscript is emitted by a script under `paper/replication/`. The full audit,
including what was wrong before and how each value was re-derived, is in
`docs/BMC_SUBMISSION_VERIFICATION_2026-08-04.md`. The short version:

```bash
.venv-django/bin/python paper/replication/case_study_1_crispr.py
.venv-django/bin/python paper/replication/validate_wine_quality_REAL.py
.venv-django/bin/python paper/replication/verify_meta_analysis_real.py
.venv-django/bin/python paper/replication/case_study_4_genomics.py
.venv-django/bin/python paper/replication/guardian_validator_evidence.py
.venv-django/bin/python paper/replication/reference_agreement.py
.venv-django/bin/python paper/replication/benchmark_api.py
.venv-django/bin/python paper/replication/manuscript_validation/fetch_corpus.py --verify-only
cd backend && DJANGO_SETTINGS_MODULE=stickforstats.settings ../.venv-django/bin/python \
    manage.py validate_corpus ../paper/replication/manuscript_validation/corpus
```

## One rule for this directory

**`manuscript.md` is the source; `manuscript.docx` is a build artifact.** Editing the `.docx` directly will
be silently overwritten the next time anyone runs the build script. If a number changes, change it in
`manuscript.md`, re-run the script that produced it, and rebuild.
