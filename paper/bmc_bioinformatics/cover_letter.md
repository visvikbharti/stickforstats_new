# Cover letter — BMC Bioinformatics (Software article)

*Paste the body into the submission system's cover-letter field.*

---

5 August 2026

To the Editors,
*BMC Bioinformatics*

Dear Editors,

We are pleased to submit our manuscript, **"StickForStats: automated statistical assumption validation for
reproducible computational biology,"** for consideration as a **Software** article in *BMC Bioinformatics*.

**The problem and the software.** Reproducible computational biology depends on statistical decisions that
routine workflows often skip — verifying that a differential-expression test's assumptions hold across all
genes, that a strategy-comparison ANOVA is robust to non-normality, or that a meta-analysis is not distorted by
publication bias. Surveys consistently find that fewer than 20% of published biomedical studies report checking
these assumptions, and most statistical software leaves validation to the analyst as an optional step.
StickForStats is an open-source, MIT-licensed web platform that reframes assumption validation as a *default
precondition* for every analysis. Its Guardian system — a middleware pipeline of eight validators (normality,
variance homogeneity, independence, outliers, sample size, modality, linearity, homoscedasticity) — checks
assumptions before a test runs and, on critical violations, automatically reroutes to an appropriate
nonparametric alternative with a documented decision trail.

**Fit with BMC Bioinformatics and the Software article type.** The tool is a general statistical platform whose
primary demonstration is at genome scale: applying Guardian to a 91-sample synovial-sarcoma RNA-seq study
(NCBI GEO GSE271517) cascaded 90.6% of 27,221 genes to a rank-based test and changed the differential-expression
verdict for 553 genes, materially altering the gene list a biologist would act on. Unlike general statistical
packages (R, SPSS, jamovi, JASP), where assumption checking is an optional, manual step, StickForStats makes
validation an automatic, transparent default and records the reasoning behind every test substitution. The
platform additionally integrates a manuscript statistical-consistency checker (which recomputes reported
p-values against CONSORT/STROBE/ICH-E9/JARS-Quant reporting standards) and a controlled calibration benchmark
characterizing when the assumption-driven cascade improves Type I error and false-discovery control. We are not
aware of an existing tool that combines automatic, cascade-based assumption validation, genome-scale
application, and an integrated reporting-standards checker; the manuscript positions StickForStats relative to
existing software throughout.

**Soundness and reproducibility.** All statistical computations are cross-validated against SciPy and R to
10–16 decimal places, with an optional 50-decimal-precision mode. The manuscript reports four real-data case
studies (RNA-seq differential expression, a CRISPR editing-strategy comparison, an ordinal correlation, and a
sixteen-trial clinical meta-analysis with publication-bias detection), a head-to-head against statcheck on a
20-article corpus, and a calibration benchmark that reports both where the cascade helps and where it does not.
Every reported value is reproducible from the open-source repository (`paper/replication/`). We have prioritized
technical soundness, transparency, and full reproducibility, consistent with the journal's editorial criteria.

**Availability.** StickForStats is MIT-licensed and openly available at
https://github.com/visvikbharti/stickforstats_new; a versioned, citable snapshot is archived on Zenodo
(concept DOI: https://doi.org/10.5281/zenodo.21258381, always resolving to the latest version; this
submission corresponds to v1.2.0, DOI [PENDING-ZENODO-V120-DOI]). A Python client SDK and
command-line interface are on PyPI (`pip install stickforstats`). All datasets analysed are public
and previously published.

**Access for reviewers.** The hosted instance at https://stickforstats.com is a closed beta and is
password-protected. We have created an account solely for peer review of this manuscript:

> username: `bmc-reviewer`
> password: `[REVIEWER-PASSWORD]`

This account is separate from our own and will be revoked once review concludes. Reviewers who
prefer not to use a hosted service can reproduce everything locally instead: the repository ships a
`Dockerfile` and `docker-compose.yml` that provision the full stack, and `paper/replication/`
contains a script for every number reported in the manuscript.

**Declarations.** This manuscript is original, has not been published previously, and is not under consideration
by any other journal. A preprint of an earlier version is posted on bioRxiv
(doi:10.64898/2026.06.15.732278, posted 19 June 2026). That preprint is v1 and predates the corrections
described above; the present submission supersedes it.
Both authors have read and approved the manuscript and its submission. The authors are the developers of
CRISPRArchitect, the genome-editing strategy-design tool used to generate the Case Study 1 dataset; neither
author holds any patent, licensing arrangement, equity, or consulting income related to CRISPRArchitect,
genome-editing technology, or a commercial version of StickForStats, and the authors declare no other
competing interests. The authors received no specific grant for this work; infrastructure and administrative
support were provided by CSIR-IGIB. Data and code availability are as described above.

**Article-processing charge.** The corresponding authors are based at a public research institute in India
(CSIR-Institute of Genomics and Integrative Biology). India does not qualify for the automatic country-based
APC waiver, and we would be grateful for the editorial office's consideration of a discretionary, need-based
waiver or discount for this open-source, non-commercial work. We are of course happy to provide any information
required to assess this request, and it does not affect our wish for the manuscript to be evaluated on its
scientific merits.

We believe StickForStats will be a useful and reproducible resource for the *BMC Bioinformatics* readership,
and we hope you will consider it for peer review. Thank you for your time.

Sincerely,

**Vishal Bharti** and **Debojyoti Chakraborty** (co-corresponding authors)
CSIR-Institute of Genomics and Integrative Biology, New Delhi 110025, India

Vishal Bharti --- vishalvikashbharti@gmail.com · ORCID 0009-0003-1431-4457
Debojyoti Chakraborty --- debojyoti.chakraborty@igib.in · ORCID 0000-0003-1460-7594
(also affiliated with the Academy of Scientific and Innovative Research (AcSIR), Ghaziabad, India)
