# bioRxiv v2 — upload packet

**Purpose:** replace the public bioRxiv preprint with the corrected, stronger version. bioRxiv preprints
**cannot be deleted** (withdrawal only leaves a tombstone) — the correct mechanism is posting a **new version**,
which becomes the default shown; v1 stays in the version history.

- **Preprint:** *StickForStats: automated statistical assumption validation for reproducible computational
  biology* (Bharti & Chakraborty, CSIR-IGIB).
- **v1 DOI:** 10.64898/2026.06.15.732278 (posted 2026-06-19).
- **File to upload as v2:** `paper/submission_package/manuscript_rendered.pdf` (re-render fresh — see below;
  it is gitignored so not committed). This is the resubmission manuscript and now includes the calibration
  benchmark (Fig 8).

---

## Step-by-step (human action — the portal can't be automated)

1. Re-render a clean PDF so it has the latest text + Fig 8:
   ```bash
   # submission_package refs figures_plos/ but its dir is figures/ — the committed
   # figures_plos -> figures symlink resolves it. Then render:
   cd /Users/vishalbharti/StickForStats_v1.0_Production
   RD=paper/submission_package
   STYLE=$(sed -n '/read -r -d/,/^CSS$/p' paper/render_pdfs.sh | sed '1d;$d')
   pandoc --from=markdown+pipe_tables+yaml_metadata_block+raw_html+autolink_bare_uris+strikeout+task_lists \
     --to=html5 --standalone --mathjax --resource-path="$RD" -V lang=en \
     --css=/dev/stdin -o "$RD/.v2.html" "$RD/manuscript.md" <<<"$STYLE"
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
     --no-pdf-header-footer --print-to-pdf-no-header --virtual-time-budget=8000 \
     --print-to-pdf="$RD/manuscript_rendered.pdf" "file://$PWD/$RD/.v2.html"; rm -f "$RD/.v2.html"
   ```
2. Log in to bioRxiv with the **account that submitted v1** (the corresponding author's).
3. Open the preprint (Author area → your submissions → this paper) and choose **"Submit a revision"** /
   **"New version."**
4. Upload the freshly rendered `manuscript_rendered.pdf` as the manuscript file (replace figures if the portal
   asks for them separately — Fig 8 is `figures/fig8_calibration.png`).
5. Paste the **Summary of changes** below into the revision-notes / "summary of changes" box.
6. Confirm authors/affiliations/competing-interests carry over unchanged, and submit. bioRxiv screens briefly,
   then posts it as **v2**.

---

## Summary of changes (paste into the bioRxiv revision form)

> **Version 2 — summary of changes.** This revision makes three author-initiated scientific-integrity
> corrections, adds one new analysis, and records a citable code archive plus formal declarations; no
> case-study data changed.
>
> 1. **New calibration benchmark (new Fig 8).** We added a controlled Monte-Carlo study, under known ground
>    truth, of whether the Guardian assumption cascade *improves* inference or merely *changes* it. Framed as an
>    ablation of the assumption gate (baseline = the cascade's own equal-variance t-test with the gate off), it
>    shows the gate restores near-nominal Type I error and false-discovery control under unbalanced
>    heteroscedasticity and adds power under non-normality, while we report its limits honestly (under joint
>    heteroscedasticity and heavy tails it only partially controls error, where a fixed Welch default is better;
>    on count data, DESeq2/edgeR remain more powerful). New Results and Methods subsections accompany the figure.
> 2. **RNA-seq "Group B" genes reframed.** The 74 Group-B genes are no longer described as "false positives that
>    Guardian correctly rejected"; they are a genuine pipeline disagreement between a rank/Gaussian framework and
>    a count-GLM framework (DESeq2/edgeR may legitimately call them differentially expressed). We make no claim
>    that one verdict is ground truth.
> 3. **Independence-validator scope clarified.** We state explicitly that the independence check is a lag-1
>    autocorrelation over observation order — informative only for sequentially ordered data and referred to
>    study design otherwise — and is not used in the genome-scale per-gene cascade (which routes only on
>    normality and variance, both invariant to sample order; verified by permutation on the real data). We also
>    now disclose that the RNA-seq dataset comprises repeated samples per patient, a clustered dependence the
>    per-gene tests do not model, and note the planned patient-aware follow-up.
> 4. **Claim-extraction description corrected.** The manuscript-verification module's claim extraction is
>    regex-based; the earlier "regex + language-model hybrid" wording is withdrawn.
> 5. **Citable code archive added.** The software is now archived on Zenodo (concept DOI
>    10.5281/zenodo.21258381, always resolving to the latest version; this article corresponds to v1.1.0,
>    version DOI 10.5281/zenodo.21258382); the data-availability statement and described version were updated
>    accordingly (v1.0.0 -> v1.1.0).
> 6. **Formal declarations added.** Explicit Competing interests and Funding statements were added: the authors
>    disclose that CRISPRArchitect---the tool that generated the Case Study 1 dataset---is their own
>    (open-source, non-commercial) tool, held with no patent, licensing, equity, or consulting interest; and
>    that no specific grant funded this work (infrastructure support from CSIR-IGIB).
>
> Framing was also softened from novelty-claiming toward a soundness/tool presentation. The Guardian system, all
> four real-data case studies, the statistical-consistency evaluation, and data/code availability are otherwise
> unchanged.

---

## Notes
- The full internal change log is `CHANGES_FROM_PREPRINT.md` (this directory) — the summary above is its
  reviewer-facing distillation.
- Consider posting v2 **before** the journal resubmission so the public record matches what a journal reviewer
  would find, and so the withdrawn "false positives" overclaim is no longer the default public version.
- If you want a DOI'd, citable code snapshot referenced from v2's data-availability statement, mint the Zenodo
  archive first and add its DOI to the manuscript before rendering the v2 PDF.
