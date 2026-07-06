# Suggested reviewers — BMC Bioinformatics submission

*BMC Bioinformatics lets you name preferred reviewers (typically up to ~6) with **name + email + affiliation**.
Every candidate below was web-verified as a real, currently-active researcher with a genuine expertise match and
**no conflict of interest** with the authors (checked against CSIR-IGIB / AcSIR and Debojyoti Chakraborty's
collaboration network). Emails were only taken where an official institutional page listed one; for the rest,
**grab the current email from the linked profile page** — do not guess.*

## Primary 6 (balanced across the three pillars; geographically diverse)

| # | Reviewer | Affiliation | Email / profile | Covers |
|---|---|---|---|---|
| 1 | **Charlotte Soneson** | Computational Biology Platform, Friedrich Miescher Institute (FMI) & SIB Swiss Institute of Bioinformatics, Basel, Switzerland | `charlotte.soneson@fmi.ch` · https://csoneson.github.io/ | RNA-seq DE + FDR/Type-I calibration |
| 2 | **Frank E. Harrell Jr.** | Dept. of Biostatistics, Vanderbilt University Medical Center, Nashville, USA | `f.harrell@vumc.org` · https://www.vumc.org/biostatistics/person/frank-e-harrell-jr | Assumption-checking + robust/nonparametric stats |
| 3 | **Michèle B. Nuijten** | Dept. of Methodology & Statistics / Meta-Research Center, Tilburg University, Netherlands | https://mbnuijten.com/ (email on page) | The manuscript-consistency-checker module |
| 4 | **Frank Konietschke** | Institute of Biometry & Clinical Epidemiology, Charité – Universitätsmedizin Berlin, Germany | https://biometrie.charite.de/en/metas/person/person/address_detail/prof_dr_frank_konietschke/ | Nonparametric/rank-based routing + small-sample error control |
| 5 | **Daniel Lüdecke** | Institute of Medical Sociology, University Medical Center Hamburg-Eppendorf (UKE), Germany | https://scholar.google.com/citations?user=wC_6-9MAAAAJ | The Guardian software concept (nearest existing tool) |
| 6 | **Davis J. McCarthy** | St Vincent's Institute of Medical Research & University of Melbourne, Australia | https://scholar.google.com/citations?user=A1F5_UEAAAAJ | Second RNA-seq DE voice (edgeR co-developer) |

### Why each fits
1. **Soneson** — first author of *"A comparison of methods for differential expression analysis of RNA-seq data"* (BMC Bioinformatics, 2013) and author of `tximport`; a leading DE-method benchmarker with deep FDR/Type-I-error expertise and a frequent Bioconductor / BMC Bioinformatics author. Ideal for the GSE271517 case study **and** the calibration benchmark, on the journal's own terms.
2. **Harrell** — author of *Regression Modeling Strategies* and the `rms`/`Hmisc` R packages; one of the most prominent critics of applying t-tests/ANOVA without checking assumptions and an advocate of robust/nonparametric/ordinal alternatives — i.e., the exact thesis of Guardian's assumption gate and auto-cascade.
3. **Nuijten** — co-creator of **statcheck**, the direct antecedent of the manuscript statistical-consistency checker, and author of the canonical study on the prevalence of statistical-reporting errors. The single most relevant reviewer for that module.
4. **Konietschke** — develops the rank-based/nonparametric procedures (`nparcomp`, `rankFD`) Guardian cascades to, and studies when Wilcoxon/Kruskal-Wallis-type methods control error rates in small samples. Can scrutinize the assumption-to-nonparametric routing logic.
5. **Lüdecke** — lead author of the `performance` R package, whose `check_normality()`, `check_homogeneity()`, `check_heteroscedasticity()`, `check_model()` do essentially what Guardian does; best placed to judge the software's contribution against the closest existing tool.
6. **McCarthy** — core co-developer of **edgeR** and lead author of `scater`; brings hands-on authority over count-GLM DE assumptions to the Group-B / count-model discussion, complementing Soneson.

## Alternates (all verified; use if the system caps the count lower, or if a primary declines)
- **Adrian G. Barnett** — Prof. of Biostatistics, Queensland University of Technology, Australia — meta-research and automated detection of statistical errors in the literature. https://scholar.google.com/citations?user=lhc97roAAAAJ
- **Jeffrey T. Leek** — Fred Hutchinson Cancer Center, Seattle, USA — bridges reproducibility/meta-research **and** genome-scale RNA-seq statistics. https://www.fredhutch.org/en/faculty-lab-directory/leek-jeff.html
- **Lieven Clement** — Ghent University (statOmics), Belgium — statistical assumptions & error-rate control of RNA-seq DE (zingeR/stageR). https://statomics.github.io/pages/about
- **David Moher** — Ottawa Hospital Research Institute, Canada — founding architect of the reporting-guideline ecosystem (CONSORT/PRISMA/EQUATOR) checked by the manuscript module. https://www.ohri.ca/profile/dmoher

## ⚠️ Consider carefully — ideal expertise, but a disclosed competing interest
- **Michael I. Love** — UNC Chapel Hill, USA — author of **DESeq2**. Perfect technical fit for the genomics case study, **but the manuscript directly evaluates/benchmarks DESeq2** (an earlier preprint version even framed count-GLM calls as "false positives" before reframing). Reviewing a paper that assesses his own tool is a genuine potential competing interest. Only suggest him if you note this to the editor; otherwise prefer Soneson/McCarthy/Clement for the DE angle.

## Notes
- **No preferred-reviewer is at CSIR-IGIB/AcSIR or a co-author/collaborator of the authors** (verified).
- BMC also lets you list **non-preferred (opposed) reviewers** — optional; leave blank unless you have a specific reason.
- Suggesting reviewers does not obligate the editor to use them, but a strong, conflict-free, on-topic list speeds triage.
