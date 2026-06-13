# PLOS Computational Biology submission cheat-sheet — StickForStats

**Portal:** https://www.editorialmanager.com/pcompbiol → "Submit New Manuscript". Log in / register as the corresponding author.
**Article type:** **Research Article**
**(GigaScience is held as option B — see `SUBMISSION_CHEATSHEET_gigascience.md` + `manuscript_gigascience.md`.)**

---

## 1. Files to upload (all in `paper/plos_compbio/`)

| File | Item type in Editorial Manager |
|---|---|
| `manuscript.docx` | Manuscript (main article file — includes title page, abstract, author summary, body, references, figure legends, S1 caption) |
| `cover_letter.txt` | Cover Letter (separate upload; also paste into the cover-letter box) |
| `figures_plos/fig1_architecture.png` | Figure 1 (system architecture) |
| `figures_plos/fig2_guardian_flowchart.png` | Figure 2 (Guardian workflow) |
| `figures_plos/fig3_manuscript_review.png` | Figure 3 (manuscript review) |
| `figures_plos/fig4_case_studies.png` | Figure 4 (CRISPR + IV-magnesium meta-analysis) |
| `figures_plos/fig5_genomics_case_study.png` | Figure 5 (RNA-seq GSE271517) |
| `figures_plos/fig6_validation_comparison.png` | Figure 6 (platform comparison + validation) |
| `figures_plos/fig7_guardian_report.png` | Figure 7 (live web interface) |
| `s1_text_supplementary_information.docx` | Supporting Information (label: **S1 Text**) |

> **Figure numbering:** use the files in `figures_plos/` (already numbered in the manuscript's citation order). The older `figures/` directory holds the GigaScience numbering — do **not** upload from there for PLOS.

Notes: PLOS accepts a single combined manuscript file (DOC/DOCX/PDF) at first submission; figures may be embedded in that file for review, but also upload them as separate files. At the *revision* stage PLOS requires each figure as an individual TIFF/EPS file at 300–600 dpi (use PACE, https://pacev2.apexcovantage.com, to check figure files).

---

## 2. Title (sentence case — PLOS requirement)
StickForStats: automated statistical assumption validation for reproducible computational biology

## 3. Short title (≤70 characters)
Automated assumption validation in computational biology

## 4. Abstract (unstructured — paste as-is / verify against the file; 271 words, under the 300 limit)
Reproducible computational biology depends on statistical decisions that routine workflows often skip: verifying that a differential-expression test's assumptions hold across all genes, that a strategy-comparison ANOVA is robust to non-normality, or that a meta-analysis is not distorted by publication bias. Surveys consistently find that fewer than 20% of published biomedical studies report checking these assumptions, and existing statistical software leaves validation to the analyst as an optional step. We present StickForStats, an open-source web platform that reframes assumption validation as a default precondition for every analysis. Its Guardian system—a middleware pipeline of eight validators (normality, variance homogeneity, independence, outliers, sample size, modality, linearity, homoscedasticity)—checks assumptions before execution and, on critical violations, reroutes to an appropriate nonparametric alternative with a documented decision trail. At genome scale, applying Guardian to a 91-sample synovial-sarcoma RNA-seq study (GSE271517) cascaded 90.6% of 27,221 genes to a rank-based test and flipped the differential-expression verdict for 553 genes—479 rescued from an under-powered t-test and 74 outlier-driven false positives rejected—materially changing the gene list a biologist would act on. The same automatic validation generalizes across domains: a CRISPR editing-strategy comparison (ANOVA F = 1122, with Guardian recommending Kruskal-Wallis H = 36.6), an ordinal correlation (Pearson r = 0.476 corrected to Spearman ρ = 0.479), and a sixteen-trial clinical meta-analysis revealing severe publication bias (Egger's t = -5.78, p < 0.001); a complementary module extends the same validators to published manuscripts, checking claims against CONSORT, STROBE, ICH-E9, and JARS-Quant reporting standards. By making assumption validation automatic and transparent, StickForStats targets a tractable, under-served contributor to irreproducibility. The platform is MIT-licensed, validated against SciPy and R, and freely available at https://github.com/visvikbharti/stickforstats_new.

## 5. Author Summary (paste as-is; 188 words, within the 150–200 limit)
Most scientific conclusions rest on statistical tests, and every test comes with fine print: assumptions about the data that must hold for the result to be trustworthy. In practice, this fine print is often left unchecked. Surveys find that fewer than one in five published studies reports verifying these assumptions, partly because popular software treats the check as an optional extra that busy researchers easily skip. When the assumptions are ignored, a study can report a difference that is not really there. We built StickForStats to make this checking automatic. Before it runs any statistical test, our platform inspects the data, reports whether each assumption is met, and—if a serious problem is found—switches to a more appropriate method and records why. On four real biomedical datasets, including a gene-editing comparison and a large gene-expression study, we show that this safety net changes which findings are flagged as reliable. A companion tool applies the same checks to finished manuscripts, helping catch reporting problems before publication. By turning assumption checking from something you must remember into something that happens by default, we aim to make everyday analyses more reproducible.

## 6. Keywords
statistical assumption validation; reproducibility; computational biology; CRISPR analysis; manuscript review; meta-analysis; open-source software

---

## 7. Authors (enter in this order, with ORCID in each profile)
1. **Vishal Bharti** — *corresponding author*
   - ORCID: **0009-0003-1431-4457**
   - Email: vishalvikashbharti@gmail.com
   - Affiliation: CSIR-Institute of Genomics and Integrative Biology, New Delhi 110025, India
2. **Debojyoti Chakraborty**
   - ORCID: **0000-0003-1460-7594**
   - Email: debojyoti.chakraborty@igib.in
   - Affiliations: (1) CSIR-Institute of Genomics and Integrative Biology, New Delhi 110025, India; (2) Academy of Scientific and Innovative Research (AcSIR), Ghaziabad 201002, India

> PLOS requires the corresponding author's ORCID at submission (entered in the user profile). Confirm with your PI whether he wishes to be listed as a co-corresponding author; if so, mark both.

---

## 8. Submission-form statements (PLOS keeps these OUT of the manuscript file — enter them in the form)

- **Financial Disclosure (Funding):** "The authors received no specific funding for this work."
  (PLOS rule: do NOT put funding anywhere in the manuscript file — only in this field. If your PI later wishes to acknowledge institutional support as funding, add it here, not in the text.)

- **Competing Interests:** "The authors have declared that no competing interests exist."

- **Data Availability Statement:** "All data underlying the findings are fully available and were previously published: Fisher's Iris (via scikit-learn); the UCI Wine Quality dataset (https://archive.ics.uci.edu/dataset/186/wine+quality); the intravenous-magnesium meta-analysis dataset (the metafor R package, dat.egger2001); the synovial-sarcoma RNA-seq dataset (NCBI GEO accession GSE271517); and a 20-article corpus from the PubMed Central open-access subset, rebuilt from a recorded query. All author-generated code is openly available under the MIT license at https://github.com/visvikbharti/stickforstats_new (release v1.0.0); a versioned snapshot will be archived on Zenodo with a citable DOI. A complete replication package is included under paper/replication/ in the repository."

- **Ethics:** Not applicable — secondary analysis of publicly available, previously published, de-identified data and published summary statistics; no new human or animal data were collected.

- **CRediT author contributions (entered in the form):** V.B. — conceptualization, software, validation, formal analysis, writing (original draft). D.C. — conceptualization, supervision, resources, writing (review & editing).

---

## 9. Suggested + opposed reviewers
PLOS lets you suggest reviewers (4–5 recommended) and an Academic Editor, and oppose specific reviewers. Suggested reviewers must have **no conflict** (not co-authors, not same institution, no recent collaboration or personal relationship). PI-supplied list, verified 2026-06-13 (affiliation/email/ORCID confirmed; checked for co-authorship + shared institution with V. Bharti / D. Chakraborty):

| Name | Email | Institution | ORCID | Reason |
|---|---|---|---|---|
| Sunil Laxman | sunil@instem.res.in | Institute for Stem Cell Science and Regenerative Medicine (inStem), Bengaluru, India | 0000-0002-0861-5080 | Systems/quantitative biologist (omics, metabolic regulation) and PLOS Comp Biol Academic Editor; evaluates computational-biology methodology, reproducibility, and genome-scale statistics — fits automated assumption validation + reproducible DE pipelines. |
| Sushmita Roy | sroy8@wisc.edu | University of Wisconsin–Madison, USA | 0000-0002-3694-1705 | Professor of Biostatistics & Medical Informatics; statistical/ML methods + open-source tools for genome-scale and single-cell omics; dual biostatistics-and-genomics fit for assumption checking, per-gene RNA-seq stats, research-software claims. |
| Gaurav Ahuja | gaurav.ahuja@iiitd.ac.in | IIIT-Delhi, India | 0000-0002-2837-9361 | Computational-biology faculty; statistical/ML methods for genomics and single-cell/RNA-seq; methods-and-analysis focus maps onto the paper's biostatistics, RNA-seq DE, and reproducibility themes. |

**COI notes:** all three clean (no co-authorship/shared institution). Roy is PLOS Comp Biol **Section Editor** (Genomics/Epigenomics/Proteomics) and Laxman is a PLOS Academic Editor — suggesting board members is allowed, but PLOS may route Roy as the handling editor instead. **Need a 4th clean name from the PI** to reach 4–5.

**DROPPED — Andreas Deutsch (TU Dresden, ORCID 0000-0002-9005-6897):** likely **personal-relationship COI** — appears to be a bandmate of D. Chakraborty in the Dresden ensemble "Dhun" (he plays saxophone, Chakraborty sitar). **Confirm with Dr. Chakraborty; do not suggest him unless he confirms there is no relationship.** Topical fit was only partial anyway (agent-/PDE-based modeling, not biostatistics).

**Opposed reviewers (optional):** none planned unless the authors have a specific concern.

---

## 10. Confidential "Comments to the Editor" (paste — fill the password locally, do NOT commit it)
> A live demonstration instance of the platform is available for hands-on evaluation by the editor and reviewers at https://stickforstats.com (username: beta; password: <PASTE BETA PASSWORD HERE>). The complete source, all datasets, and a one-command replication package are openly available at https://github.com/visvikbharti/stickforstats_new. Generative AI (Claude) assisted code and manuscript drafting; all content was reviewed and verified by the authors, and every statistical value was independently recomputed. All authors have approved the submission, and the manuscript is not under consideration for publication elsewhere.

---

## 11. Before you click Submit
- [ ] Co-author (D. Chakraborty) has approved this PLOS version.
- [ ] **(Recommended) Mint a Zenodo DOI** for the code: at https://zenodo.org enable the GitHub integration, archive the existing `v1.0.0` release (a few minutes), then replace the future-tense Zenodo sentence in the manuscript (§Availability and reproducibility) and the form Data-Availability statement with the concrete `DOI: 10.5281/zenodo.XXXXXXX`. PLOS strongly recommends an archived code DOI; the public MIT GitHub repo already satisfies the mandatory requirement, so this is a "nice to have," not a blocker.
- [ ] Title is in **sentence case**; short title ≤70 characters entered.
- [ ] Abstract pasted (unstructured, ≤300 words) and **Author Summary** pasted (150–200 words) — both required by PLOS.
- [ ] Figures uploaded **from `figures_plos/`** in order 1→7; S1 Text uploaded and labelled.
- [ ] ORCID entered for the corresponding author (both authors ideally).
- [ ] **Financial Disclosure, Competing Interests, and Data Availability** filled in the FORM (not in the manuscript file).
- [ ] Confirm with the PI: **Competing Interests = "none"** is accurate (no company/paid licensing/patent tied to StickForStats or CRISPRArchitect). If any commercial interest exists, declare it.
- [ ] Confirm the GitHub repo is still **public** on submission day.
- [ ] Beta password filled into the confidential comments only (never in any public field or committed file).
- [ ] **Review the EM-built PDF** — figures render in order 1→7, abstract + author summary present, references intact.

## 12. After submission
- You receive a manuscript number and confirmation email.
- **APC:** PLOS charges a publication fee only on acceptance (PLOS Comp Bio APC is ~US$2,840 as of 2025). PLOS offers **need-based fee assistance** and **country-based waivers** — India qualifies under the Global Participation Initiative (Group/▶ check current tier at https://plos.org/publish/fees/global-participation-initiative/). Apply for the waiver/assistance at submission if applicable; it does not affect editorial decisions.
- If PLOS's technical check flags a figure format/resolution, fix with PACE and resubmit — not a rejection.
- **Scope note:** PLOS Comp Bio can desk-reject software that reads as "general-purpose / not a methodological advance." The Research Article framing + the four biological case studies (esp. the genome-scale RNA-seq result) are the hedge. If desk-rejected on scope, GigaScience (Technical Note) is the prepared option-B fallback.
