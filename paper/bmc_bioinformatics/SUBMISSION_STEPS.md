# BMC Bioinformatics submission — the actual steps

**This file supersedes `paper/submission_package/SUBMISSION_GUIDE.md`**, which was written for a PDF upload and a PLOS-structured
manuscript and is now wrong in several load-bearing places. Verification evidence for everything below is
in `docs/BMC_SUBMISSION_VERIFICATION_2026-08-04.md`.

---

## What you upload

| Slot | File | Notes |
|---|---|---|
| **Manuscript** | `paper/bmc_bioinformatics/manuscript.docx` | **Not a PDF.** BMC requires an editable file. Rebuild with `bash paper/build_bmc_docx.sh`, which also asserts the figure/table counts, double spacing and continuous line numbering |
| **Additional file 1** | `paper/bmc_bioinformatics/additional_file_1.md` → export to PDF | S1.1–S1.5. Every number is emitted by `paper/replication/additional_file_1_evidence.py` |
| **Additional file 2** | a source archive of the release | BMC "strongly recommends" shipping the software itself, because weblinks rot. Use the Zenodo zip for the tag you cite |
| Figures | embedded in the .docx | Separate upload is **optional at initial submission**; required only on acceptance. Vector PDFs exist for Figs 4, 6 and 7 |
| Cover letter | `paper/bmc_bioinformatics/cover_letter.md` | Paste the body. **Needs the three edits in step 3 first** |
| Suggested reviewers | `paper/bmc_bioinformatics/suggested_reviewers.md` | **Three of six emails are still blank** — fill them from institutional pages first |

**Upload only `manuscript.docx`, never a PDF.** BMC requires an editable file. The old
PLOS-structured PDF render that used to sit in `paper/submission_package/` carried the
pre-correction numbers and has been deleted rather than archived, so there is no longer a stale
file to upload by mistake. If you want a reading copy, build one:
`ALLOW_PLACEHOLDERS=1 bash paper/render_pdfs.sh`.

---

## Step 1 — Cut and archive the version the paper describes  ✅ DONE

Merged to `main`, tagged `v1.2.0`, released, **archived by Zenodo, and deployed to production**.

| | |
|---|---|
| `main` / tag `v1.2.0` | `41d4a27` |
| GitHub release | <https://github.com/visvikbharti/stickforstats_new/releases/tag/v1.2.0> |
| Zenodo concept DOI | [10.5281/zenodo.21258381](https://doi.org/10.5281/zenodo.21258381) — verified 2026-08-05 to resolve to **v1.2.0** |
| Zenodo version DOI | 10.5281/zenodo.21797621 |
| Additional file 2 | the 62 MB source zip on that Zenodo record |
| Production | running this build; four behavioural checks pass |

**Nothing needs filling in.** The manuscript cites the concept DOI and names the snapshot as v1.2.0 /
git tag `v1.2.0`, which sidestepped the circularity of citing a DOI that only exists once the tag
containing the manuscript has been archived. `CITATION.cff` now also carries the version DOI, added
after the release as planned.

*Optional:* now that the version DOI exists, it could be named in the manuscript too
(`…concept DOI 10.5281/zenodo.21258381; this snapshot, v1.2.0, is 10.5281/zenodo.21797621`). Not
required — the current wording is complete and unambiguous — but it is now free of the placeholder
problem that made us avoid it.

---

## Step 2 — Make the software testable by a reviewer, anonymously

`https://stickforstats.com` returns **HTTP 401** behind Basic realm "StickForStats closed beta". BMC's
Software-article criteria require the tool to be *"available for testing by reviewers in a way that
preserves their anonymity"*. A password obtainable only by emailing you defeats that by construction.

Pick one:

- **(a) Open a credential-free public demo** for the review period. Cleanest, and makes the
  "restrictions: none" declaration true.
- **(b) Print a single shared reviewer credential in the cover letter.** This *does* preserve anonymity —
  no reviewer has to contact anyone — and is common practice. Then reword the availability statement so it
  no longer claims unrestricted access.
- **(c) Drop the URL** and rely on Docker + the Zenodo archive.

Whichever you choose, the `Any restrictions to use by non-academics: None` line must be made accurate.

Also decide about **CRISPRArchitect**: `github.com/visvikbharti/CRISPRArchitect` returns **404**, it is a
numbered reference, and it is the sole provenance of Case Study 1's data. Either publish it (a tagged,
Zenodo-archived snapshot is enough) or restate the provenance honestly as an internal tool output deposited
with this paper.

---

## Step 3 — Three cover-letter edits

1. **Re-date it** (currently 8 July 2026).
2. **Fix "cross-validated against SciPy and R to 10–16 decimal places."** Table 4 is now measured in ULP
   and the meta-analysis row is 13 decimal places. Say what the table says.
3. **Fix the APC paragraph.** BMC Bioinformatics is in Springer Nature's country-tiered pricing pilot and
   **India's tier is 25%**, so the baseline is roughly **£572 / $772 / €648**, not the ~£2,290 list price.
   The discretionary need-based waiver is real and must be requested **at submission** — it cannot be
   considered later. Check for a CSIR-IGIB institutional OA agreement first.
4. Remove or soften *"an updated version corresponding to this submission is being posted"* on bioRxiv —
   the v2 route is blocked, so that may be false on the day you submit.

---

## Step 4 — Submit

Portal: **`submission.springernature.com/new-submission/12859`** (BMC journals have moved to Springer
Nature Link; the old `bmcbioinformatics.biomedcentral.com` guideline URLs 301-redirect).

1. Article type: **Software**.
2. Upload `manuscript_bmc.docx`.
3. Add Additional files 1 and 2.
4. Paste the cover letter.
5. Add the six suggested reviewers — **not Michael Love** (the paper benchmarks DESeq2; that is a real
   competing interest). BMC warns that unverifiable reviewer details cause rejection, so every email must
   be real and institutional.
6. **Request the APC waiver in the letter *and* the fee field.**
7. Confirm the bioRxiv preprint under the duplicate-publication question (preprints are permitted; it must
   be disclosed).
8. Note the submission ID.

Be aware: BMC Bioinformatics runs **transparent peer review** — if the paper is published, the reviewer
reports and your responses are published with it.

---

## Before you press submit — the verification gate

Run these and expect all green:

```bash
# 1. the manuscript's own consistency (section order, figure order, citations, no stale numbers)
#    — the checks are recorded in docs/BMC_SUBMISSION_VERIFICATION_2026-08-04.md
# 2. the artifact
bash paper/build_bmc_docx.sh          # asserts 7 figures, 8 tables, line numbers, double spacing
# 3. the evidence scripts behind the paper's numbers
.venv-django/bin/python paper/replication/guardian_validator_evidence.py
.venv-django/bin/python paper/replication/reference_agreement.py
.venv-django/bin/python paper/replication/case_study_4_genomics.py
.venv-django/bin/python paper/replication/manuscript_validation/fetch_corpus.py --verify-only
cd backend && DJANGO_SETTINGS_MODULE=stickforstats.settings ../.venv-django/bin/python manage.py validate_corpus ../paper/replication/manuscript_validation/corpus
# 4. the suites
cd backend && DJANGO_SETTINGS_MODULE=stickforstats.settings ../.venv-django/bin/python manage.py test
cd frontend && CI=true npx react-scripts test --watchAll=false
```

Expected, as of 2026-08-04: backend **1,358 tests OK**; corpus **20/20 match**, aggregate
**1104 / 459 / 353 → 320 consistent, 29 discrepancy, 4 gross**; Case Study 4 **13/13 checks**.

---

## Still open, and they are judgement calls

- **Fig. 3 needs re-shooting** from the current build. Its two worst defects are already fixed in code (the variance verdict now reads "Met" at p = 0.7907, and the 50-digit statistic is now correct to all 50 digits) and the four "N/A" fields are now populated server-side. It needs `npm install` in `e2e/` plus a run against a local server, or a manual screenshot.
- **Case Study 4's Group A/B framing.** The corrected fold changes make the two groups comparable in magnitude (0.54 vs 0.61), so "much larger apparent effects" is gone. The mechanism claims that survived testing are outlier-dependence and distributional overlap. Whether to re-anchor on those, cut the contrast, or run the pre-registered DESeq2/edgeR follow-up first is your call.
- **Table 2** and the **confidence-score prose** — being re-derived from the code as of this writing.
- **Guardian's NaN-as-pass behaviour**: `scipy.stats.levene` returns NaN rather than raising for zero-variance input, and the violation test is `p < alpha`, so 50 identical values currently receive `confidence_score = 1.0` and `can_proceed = True`. The manuscript now discloses this. Fixing it is better than disclosing it.
