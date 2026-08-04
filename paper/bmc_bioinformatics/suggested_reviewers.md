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
| 3 | **Michèle B. Nuijten** | Dept. of Methodology & Statistics / Meta-Research Center, Tilburg University, Netherlands | `m.b.nuijten@tilburguniversity.edu` · https://mbnuijten.com/ ✅ verified 2026-08-05 from her own site | The manuscript-consistency-checker module |
| 4 | **Frank Konietschke** | Institute of Biometry & Clinical Epidemiology, Charité – Universitätsmedizin Berlin, Germany | ⚠️ **email not confirmed.** The `/en/` URL previously here **404s**; working page is https://biometrie.charite.de/metas/person/person/address_detail/prof_dr_frank_konietschke — but it publishes no address, only a contact form. Search results give `Frank.Konietschke@charite.de` (Charité's standard Firstname.Lastname format); **confirm from a recent paper's corresponding-author line before entering it** | Nonparametric/rank-based routing + small-sample error control |
| 5 | **Daniel Lüdecke** | Institute of Medical Sociology, University Medical Center Hamburg-Eppendorf (UKE), Germany | ⚠️ **institutional email not confirmed.** His UKE team page now returns **410 Gone** and the UKE research portal was unreachable on 2026-08-05. Only a personal-site address surfaced (`mail@danielluedecke.de`, via danielluedecke.de). Prefer an institutional address; check a recent `performance`/`sjPlot` paper | The Guardian software concept (nearest existing tool) |
| 6 | **Davis J. McCarthy** | St Vincent's Institute of Medical Research & University of Melbourne, Australia | ⚠️ **email not found.** Only contact-scraper aggregators returned anything, all redacted; SVI profile https://www.svi.edu.au/researchers/dr-davis-mccarthy/ publishes none. Domain is `svi.edu.au`. Take it from a recent edgeR/scater paper's corresponding-author line | Second RNA-seq DE voice (edgeR co-developer) |

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


---

## Email verification status — checked 2026-08-05

**Do not enter an unverified address.** A suggested reviewer who never receives the invitation is
worse than one fewer suggestion, and BMC does not require six.

| # | Reviewer | Email | Status |
|---|---|---|---|
| 1 | Soneson | `charlotte.soneson@fmi.ch` | carried from the original compilation |
| 2 | Harrell | `f.harrell@vumc.org` | carried from the original compilation |
| 3 | Nuijten | `m.b.nuijten@tilburguniversity.edu` | ✅ **verified** from mbnuijten.com |
| 4 | Konietschke | *(candidate: `Frank.Konietschke@charite.de`)* | ⚠️ unconfirmed — official page publishes no address |
| 5 | Lüdecke | *(personal: `mail@danielluedecke.de`)* | ⚠️ institutional address not found; UKE pages 410/unreachable |
| 6 | McCarthy | — | ⚠️ not found in any authoritative source |

**Recommendation:** submit with **1–3** (all with working addresses, and between them they cover the
three things a reviewer needs to judge here: RNA-seq DE benchmarking, assumption-checking
methodology, and the statcheck lineage of the manuscript checker). Add 4–6 only if you can confirm
their addresses from a recent paper's corresponding-author line — that is the one source that is
both authoritative and current.
