# GigaScience submission cheat-sheet — StickForStats

**Portal:** gigasciencejournal.com → "Submit a manuscript" (Editorial Manager). Log in as corresponding author.
**Article type:** **Technical Note**

---

## 1. Files to upload (all in `paper/plos_compbio/`)

| File | Item type in EM |
|---|---|
| `manuscript.docx` | Manuscript / Main Document |
| `figures/fig1_architecture.png` | Figure 1 |
| `figures/fig2_guardian_flowchart.png` | Figure 2 |
| `figures/fig3_case_studies.png` | Figure 3 |
| `figures/fig4_manuscript_review.png` | Figure 4 |
| `figures/fig5_validation_comparison.png` | Figure 5 |
| `figures/fig6_genomics_case_study.png` | Figure 6 |
| `figures/fig7_guardian_report.png` | Figure 7 |
| `additional_file_1_supplementary_information.docx` | Additional File |
| `cover_letter.txt` | Cover Letter (or paste into the cover-letter box) |

---

## 2. Title
StickForStats: Automated Statistical Assumption Validation for Reproducible Computational Biology

## 3. Abstract (structured — paste as-is)
**Background:** Reproducible computational biology depends on statistical decisions that routine workflows often skip: verifying that a differential-expression test's assumptions hold across all genes, that a strategy-comparison ANOVA is robust to non-normality, or that a meta-analysis is not distorted by publication bias. Surveys consistently find that fewer than 20% of published biomedical studies report checking these assumptions, and existing statistical software leaves validation to the analyst as an optional step.

**Findings:** We present StickForStats, an open-source web platform that reframes assumption validation as a default precondition for every analysis. Its Guardian system—a middleware pipeline of eight validators (normality, variance homogeneity, independence, outliers, sample size, modality, linearity, homoscedasticity)—checks assumptions before execution and, on critical violations, reroutes to an appropriate nonparametric alternative with a documented decision trail. We demonstrate Guardian on four real datasets: a CRISPR editing-strategy comparison (ANOVA F = 1122, p ≈ 1.3 × 10^-35, cascaded to Kruskal-Wallis H = 36.6, p < 10^-7); a UCI Wine Quality correlation (Pearson r = 0.476 switched to Spearman ρ = 0.479 on ordinal data); a sixteen-trial meta-analysis of intravenous magnesium for acute myocardial infarction (Egger's t = -5.78, p < 0.001, indicating severe publication bias); and a genome-scale RNA-seq differential-expression analysis (GSE271517). A complementary module extends the same validators to published manuscripts, checking claims against CONSORT, STROBE, ICH-E9, and JARS-Quant standards.

**Conclusions:** By making assumption validation automatic and transparent, StickForStats targets a tractable, under-served contributor to irreproducibility. The platform is MIT-licensed, validated against SciPy and R, and freely available at https://github.com/visvikbharti/stickforstats_new.

## 4. Keywords
statistical assumption validation; reproducibility; computational biology; CRISPR analysis; manuscript review; meta-analysis; open-source software

---

## 5. Authors (enter in this order)
1. **Vishal Bharti** — *corresponding*
   - ORCID: **0009-0003-1431-4457**
   - Email: vishalvikashbharti@gmail.com
   - Affiliation: CSIR-Institute of Genomics and Integrative Biology, New Delhi 110025, India
2. **Debojyoti Chakraborty** — *corresponding*
   - ORCID: **0000-0003-1460-7594**
   - Email: debojyoti.chakraborty@igib.in
   - Affiliations: (1) CSIR-Institute of Genomics and Integrative Biology, New Delhi 110025, India; (2) Academy of Scientific and Innovative Research (AcSIR), Ghaziabad 201002, India

---

## 6. Declarations / questionnaire answers
- **Competing interests:** The authors declare that they have no competing interests.
- **Funding:** No specific funding was received for this work.
- **Ethics approval / consent:** Not applicable — secondary analysis of publicly available, previously published, de-identified data; no new human/animal data.
- **Consent for publication:** Not applicable.
- **Availability of data and materials:** All datasets are public/previously published; all code is MIT-licensed and openly available at https://github.com/visvikbharti/stickforstats_new (v1.0.0). A snapshot of code + curated data will be deposited in GigaDB on acceptance.
- **AI-assisted technologies:** Declare it — generative AI (Claude, Anthropic) assisted software development and manuscript drafting; all code and text were reviewed and verified by the authors, every statistical value was independently recomputed, and no AI tool is listed as an author. (Matches the manuscript's "Use of AI-assisted technologies" section.)
- **Authors' contributions:** V.B. — conceptualization, software, validation, formal analysis, writing (original draft). D.C. — conceptualization, supervision, resources, writing (review & editing). Both approved the final manuscript.

---

## 7. Suggested reviewers (optional — pick 3–4 yourself)
Independent researchers in **reproducibility / biostatistics / research software / computational biology**, with NO conflict (not co-authors, not CSIR-IGIB, no recent collaboration). For each: name, affiliation, email, one-line reason. (Don't suggest anyone you've published with.)

---

## 8. Confidential "Comments to the Editor" (paste — fill the password)
> A live demonstration instance of the platform is available for hands-on evaluation by the editor and reviewers at https://stickforstats.com (username: beta; password: <PASTE BETA PASSWORD HERE>). Generative AI (Claude) assisted code and manuscript drafting; all content was reviewed and verified by the authors. All authors have approved the submission, and the manuscript is not under consideration for publication elsewhere.

---

## 9. Before you click Submit
- [ ] Co-author (D. Chakraborty) has approved this version.
- [ ] All 10 files uploaded with correct item types; figures in order 1→7.
- [ ] ORCIDs entered for both authors.
- [ ] Beta password filled into the confidential comments (not anywhere public).
- [ ] **Review the EM-built PDF** — figures render in order, abstract is structured, references intact.

## 10. After submission
- You'll get a manuscript ID + confirmation email.
- **APC:** nothing to pay now — charged only on acceptance; your CSIR-IGIB (India) address auto-applies the OUP LMIC waiver/discount. (Confirm exact figure later via `oup_apc_query_email.txt` if you wish.)
- If EM's technical check flags a figure format/resolution, fix + resubmit — not a rejection.
