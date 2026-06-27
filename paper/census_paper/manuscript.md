# How verifiable is the biomedical literature? A census of in-text statistical reporting and internal consistency across 10,103 open-access papers

**Vishal Bharti**^1\*, **Debojyoti Chakraborty**^1,2\*

1. CSIR-Institute of Genomics and Integrative Biology, New Delhi 110025, India
2. Academy of Scientific and Innovative Research (AcSIR), Ghaziabad 201002, India

\* Corresponding authors: vishalvikashbharti@gmail.com, debojyoti.chakraborty@igib.in

ORCID: Vishal Bharti https://orcid.org/0009-0003-1431-4457; Debojyoti Chakraborty https://orcid.org/0000-0003-1460-7594

---

> **Draft status (2026-06-27).** This is a complete *descriptive*-census manuscript (Route A: submittable
> as a descriptive measurement). The numbers are final and traceable to committed reports under
> `paper/replication/verification/`. A pre-registered *confirmatory* extension with human double-coding is
> described in §Pre-registered confirmatory study and is the planned follow-up; sections that a confirmatory
> run would update are flagged with `[CONFIRMATORY]`.

---

## Abstract

Independent re-computation of reported statistics—the approach popularised by *statcheck*—has exposed
widespread internal inconsistencies in the psychology literature, but the verifiability of the biomedical
literature at scale is largely uncharted. We assembled a census of 10,103 PubMed Central Open-Access
biomedical articles (2018–2025) matching a classical quantitative-design query, parsed their JATS-XML full
text, extracted every in-text null-hypothesis significance-testing (NHST) statistic with a deterministic
regular-expression pipeline, and recomputed each two-tailed p-value in the statcheck style. Two findings
dominate. First, **machine-verifiability is rare**: only about 3.4% of papers (341 of 10,101 with a readable
body) report even one in-text, recomputable test statistic; the overwhelming majority of reported statistics
live in tables and figures and cannot be recovered from running text. Second, among the 3,005 recomputable
claims, the raw internal-inconsistency rate is **11.1%** (1.7% decision-changing), but transparent
false-positive adjudication shows that about 79% of flags are likely-genuine and about 14% are clear tool
false positives (chiefly one-sided p-values our two-tailed recompute cannot match), leaving a **single-digit
genuinely-inconsistent rate**. The estimate is robust: inverse-probability weighting that corrects the
sampling design shifts it by ≤0.6 percentage points, and an independent general-Open-Access frame yields a
concordant 5.6%. Against statcheck on the same articles our extractor reaches 97.7% recall and 98.1%
precision. The biomedical literature is, for the most part, not written in a form that allows automatic
statistical verification—a transparency gap that is itself a target for reform.

## Author summary

When scientists report a statistical test—for example "t(38) = 2.1, p = 0.04"—the p-value can be recomputed
from the test statistic and its degrees of freedom and checked against what the authors wrote. Tools like
statcheck have used this idea to show that a surprising share of psychology papers contain numbers that do
not add up. We asked a simpler, prior question for biomedicine: *how often is the literature even checkable
this way?* Scanning the full text of 10,103 open-access biomedical papers, we found that only about one in
thirty reports a statistic in a form a computer can re-derive from the text—the rest are buried in tables and
figures. Among the statistics we *could* check, most were internally consistent; after manually separating
genuine errors from artifacts of automated checking (such as one-sided tests), only a single-digit percentage
were truly inconsistent. The result is reassuring about arithmetic but sobering about transparency: most
biomedical papers are not written in a way that lets anyone verify their statistics automatically.

## Introduction

A reported statistical test usually carries internal redundancy: a test statistic, its degrees of freedom,
and a p-value are not three independent numbers but a triple in which any one can be recomputed from the
other two. *statcheck* exploited this redundancy to audit the psychology literature at scale, recomputing
reported p-values from the reported statistic and degrees of freedom and finding that roughly half of papers
contained at least one inconsistency and about one in eight an inconsistency that changed a significance
decision [1]. That result reshaped how a field thinks about its own error rate, and it did so without any
access to the underlying data—purely from the redundancy already printed in the text.

Whether the same picture holds in biomedicine is unknown, and the reason it is unknown is itself
informative. Biomedical results are frequently reported not as inline `t(df) = …, p = …` triples but as
tables of estimates, confidence intervals, and adjusted p-values, or as annotations on figures—forms from
which the recompute redundancy cannot be recovered automatically. Before one can ask "how often are
biomedical statistics internally inconsistent?", one must first ask "how often are they reported in a form
that can be checked at all?". The two questions are entangled: a low checkable rate both limits any
inconsistency estimate and is, by itself, a measurable feature of the literature's transparency.

We address both questions with a single automated census over the PubMed Central (PMC) Open-Access subset.
Using the verification engine developed for the StickForStats platform [2] as the instrument—a deterministic
regular-expression extractor coupled to a statcheck-style recompute core—we measured, across 10,103
biomedical articles, (i) what fraction report an in-text, machine-recomputable NHST statistic, and (ii)
among those statistics, the internal-inconsistency rate, validated against a transparent false-positive
adjudication and benchmarked head-to-head against statcheck. We frame this explicitly as a **descriptive,
conditional measurement** of a defined population, not a literature-wide point estimate, and we pre-specify a
confirmatory extension with human double-coding as the follow-up.

## Methods

### Corpus

We sampled the PMC Open-Access subset via the NCBI E-utilities. The `esearch` query combined an open-access
filter, a 2018–2025 publication-date window, and a disjunction of classical quantitative-design terms
(randomized, cohort, case-control, regression, ANOVA, correlation, t-test). To spread the sample across the
window rather than concentrate it on high-volume days, we drew publication days at random and fetched up to a
fixed per-day quota from each day's full pool (a day-clustered design; the per-paper day volume is recorded
for the inverse-probability-weighting analysis below). For each selected article we fetched the full JATS/NLM
XML with `efetch` (`db=pmc, rettype=xml`). Of 10,200 enumerated identifiers, 10,103 returned a full-text
`<body>` (80 lacked a body), and 10,101 parsed to a readable body. The corpus spans the expected article-type
mix (research-article 8,032; review-article 1,124; case-report 362; brief-report 162; and a long tail of
editorials, letters, systematic reviews, data papers, and methods articles).

### Extraction and recompute

JATS XML was parsed with lxml; the paper title is taken from `<front>` and body text strictly from `<body>`
so that the reference list (in `<back>`) is excluded, with table-cell text included (statistics are often
reported in tables). From the resulting text we extracted candidate NHST statistics with a deterministic
library of ~24 APA-style regular-expression patterns (t, F, χ², r, z, and the associated p-values), pairing
each statistic with its p-value through a scoped proximity window that respects sentence boundaries. A claim
was deemed **checkable (recomputable)** when it carried a statistic, the degrees of freedom required to
recompute it, and a reported p-value. For each checkable claim we recomputed the two-tailed p-value with
SciPy (t → `t.sf(|t|, df)·2`; F → `f.sf`; χ² → `chi2.sf`; z → `norm.sf·2`; r converted to t) and compared it
to the reported value in a rounding- and inequality-aware manner, exactly as statcheck does. A claim was
flagged **inconsistent** when the reported and recomputed p-values were incompatible at the reported
precision, and **decision-changing** when the discrepancy crossed the conventional α = 0.05 threshold.

### False-positive adjudication

Automated recompute generates known false-positive classes. We adjudicated every flagged claim with
transparent, pre-stated rules into four categories: **FP_MISEXTRACTION** (the claim's own text contains no
p-value, so the reported p was mis-paired from a neighbour—an extractor artifact); **FP_ONE_TAILED** (the
recomputed two-tailed p is ≈2× the reported p, i.e. the authors reported a one-sided test our recompute is
two-tailed only); **REVIEW_P_BOUND** (p reported as an inequality, where recompute-versus-bound is
ambiguous); and **TRUE_LIKELY** (a recomputable statistic and a point p stated in the same text, two-tailed,
beyond tolerance—a genuine internal inconsistency). During development we identified and fixed an extractor
p-attachment defect that had produced a large mis-extraction artifact; the fix reduced FP_MISEXTRACTION from
157 to 0 and the raw inconsistency rate from 14.5% to 11.1% (and decision-changing from 4.2% to 1.7%), and
all results below are post-fix.

### Robustness and benchmarking

Two robustness analyses guard the headline. (1) **Inverse-probability weighting (IPW):** because the sample
is day-clustered rather than uniform over papers, we re-estimated every rate weighting each paper by its
recorded day volume, recovering the equal-probability estimand from the same corpus. (2) **Independent
frame:** we ran the identical pipeline over a uniform-ish sample of the *general* PMC OA population (via the
NCBI OA web service), dropping the quantitative-design enrichment entirely, as an external replication of the
inconsistency rate. Finally, to benchmark the extractor against the field standard rather than report
self-consistency alone, we ran statcheck 1.5.0 on a labelled set and computed recall and precision against
it.

## Results

### Machine-verifiability is rare

Of 10,101 articles with a readable body, 1,939 (19.2%) contained at least one extractable test statistic, but
only **341 (≈3.4%) reported at least one *recomputable* claim**—one carrying the statistic, degrees of
freedom, and a point p-value needed to check it (Fig 1). Across the whole corpus we extracted 13,703 test
claims, of which **3,005 were recomputable**. The gap between "mentions a test" and "reports a checkable
statistic" is the first headline: most biomedical statistics are reported in forms—tables, figures, adjusted
or interval estimates—from which the recompute redundancy cannot be recovered automatically. The 3.4% figure
is therefore a *lower bound on statistical reporting* and a direct, if uncomfortable, measure of how little of
the literature is machine-verifiable from its text.

### Most checkable statistics are internally consistent

Among the 3,005 recomputable claims, 333 (**11.1%**) were flagged inconsistent and 52 (**1.7%**) were
decision-changing; 129 of the 341 papers with a checkable claim (37.8%) contained at least one flag (Fig 2).
A raw 11.1% is, however, an over-estimate of *genuine* inconsistency, because automated recompute generates
predictable false positives. Adjudication of the 333 flags (Fig 3) gives: **TRUE_LIKELY 262** (79%),
**REVIEW_P_BOUND 25** (8%), **FP_ONE_TAILED 46** (14%), and **FP_MISEXTRACTION 0**. The clear false-positive
rate is thus 46/333 = 14% (all one-sided-p artifacts, after the mis-extraction defect was eliminated), and
the defensible genuine-inconsistency rate is the TRUE_LIKELY fraction, **262/3,005 ≈ 8.7%** of checkable
claims—a single-digit rate, with a likely-true *decision-changing* count of 31. A reported-versus-recomputed
scatter (Fig 4) shows the structure directly: most flagged claims cluster near the identity line, the
one-sided artifacts fall on the 2× line, and the genuinely inconsistent claims scatter widely.

### The estimate is robust

Inverse-probability weighting, which corrects the day-clustered sampling design from within the same corpus,
moves the headline by less than a percentage point: the inconsistent-claim rate goes from 11.08% to 10.52%
and the decision-changing rate from 1.73% to 1.46% (a ≤0.6-pp shift; Fig 6), confirming that the
over-representation of low-volume publication days did not bias the result. An entirely independent frame—a
uniform-ish sample of the *general* PMC OA population through a different NCBI endpoint, with no
quantitative-design enrichment—yields an inconsistency rate of 5.6% (6 of 108 checkable claims; directional,
given a small effective sample), squarely in the single-digit range and below the raw 11.1%. The two
robustness arms thus bracket the headline from within and without.

### The extractor is accurate against statcheck

Benchmarked against statcheck 1.5.0 on a labelled article set, the extractor achieved **97.7% recall and
98.1% precision** (F1 97.9%), with no regression introduced by the p-attachment fix. The instrument
underlying the census therefore extracts and recomputes inline statistics at parity with the established
tool, while the adjudication layer adds the false-positive accounting that turns a raw flag rate into a
defensible genuine rate.

## Discussion

Two numbers summarise the census. **About 3.4% of biomedical open-access papers report an in-text,
machine-recomputable statistic**, and **of those statistics, a single-digit percentage are genuinely
internally inconsistent**. The first is a transparency finding; the second is a reassuring—but
qualified—reliability finding.

The transparency finding is the more consequential. The dominant reason a biomedical paper's statistics
cannot be auto-verified is not error but *reporting form*: results are presented in tables of adjusted
estimates and intervals, or annotated on figures, rather than as the inline `statistic(df) = …, p = …` triples
that carry recompute redundancy. This is not a criticism of any individual paper—it reflects entrenched
field conventions—but it does mean that the powerful, data-free auditing that reshaped psychology's view of
its own error rate is, today, simply inapplicable to ~96% of the biomedical literature. Reporting standards
that encouraged inline test statistics (or, better, machine-readable structured results) would convert a
large, currently un-auditable corpus into a checkable one at essentially no cost to authors.

The reliability finding should be read carefully and not over-sold. A single-digit genuine-inconsistency rate
among *checkable* claims is lower than statcheck's headline figures for psychology, but the populations
differ in design, discipline, and—critically—in what is checkable, so the comparison is qualitative. We
deliberately report the full adjudication (Fig 3) rather than a single number, because the choice of
denominator and the handling of one-sided tests and p-bounds can move the figure by several points; the
TRUE_LIKELY fraction is our most defensible lower bound, and the precise rate is exactly what the
pre-registered confirmatory study (below) is designed to pin down with human double-coding.

### Limitations

This is a **descriptive, conditional** measurement, not a literature-wide estimate. (1) *Population:* PMC
Open-Access biomedical articles, 2018–2025, matching a quantitative-design query—not all biomedicine. (2)
*Extraction scope:* inline running text plus flattened table-cell text; figures are not read and statistics
split across multiple table cells may be missed, so the recomputable rate is a lower bound. (3) *Recompute
rules:* two-tailed only, so one-sided reporting drives the residual clear false positives; the p = 0.05
boundary and p-as-inequality handling follow fixed conventions. (4) *Sampling:* day-clustered, corrected here
by IPW but formally addressed by the equal-probability frame in the confirmatory study. (5) *Validation:* the
genuine-inconsistency rate rests on transparent adjudication rules, not yet on blinded human coding—the gap
the confirmatory study closes.

### Pre-registered confirmatory study

The descriptive census above is hypothesis-generating. We will pre-register, on the Open Science Framework, a
**confirmatory** census that (a) samples the equal-probability PMC OA file-list frame rather than
day-clusters; (b) freezes the inclusion query, the recompute tolerances, and the inconsistency definitions in
advance; and (c) calibrates the automated verdicts against a **human-double-coded gold standard**: two coders
independently adjudicate a stratified sample of flagged and unflagged claims, blinded to the tool and to each
other, with a third adjudicator for disagreements, requiring Cohen's κ ≥ 0.6 between coders before the gold
set is used to estimate the tool's sensitivity, specificity, and positive predictive value per verdict. The
descriptive estimates here become the priors; the confirmatory study delivers the calibrated, generalisable
rate. The full protocol is pre-specified and file-ready (`PREREGISTRATION.md`), with a frozen coder codebook
(`CODEBOOK.md`) and the gold-set sampling and κ/accuracy scripts (`build_gold_set.py`, `compute_kappa.py`);
only the two coders' adjudication and the OSF filing remain. `[CONFIRMATORY]`

## Data and code availability

The verification engine is open-source under the MIT license at
https://github.com/visvikbharti/stickforstats_new; the census scripts (`census_jats.py`, `census_ipw.py`,
`oa_pilot.py`, `adjudicate_inconsistencies.py`) and all reports and figures are under
`paper/replication/verification/`, with an end-to-end reproduction guide (`REPRODUCTION.md`). The raw JATS
corpus is re-fetchable from PMC with the recorded query and `fetch_corpus` script; the *derived* data needed
to reproduce every number—the per-paper census ledger and the flagged-inconsistencies file—will be deposited
on the Open Science Framework alongside the pre-registration and cited by DOI. All articles analysed are
public. Generative AI (Claude, Anthropic) assisted with code and drafting; all reported values were computed
by the pipeline and independently spot-checked against SciPy, and no AI system is an author.

## Figures

- **Fig 1.** Corpus funnel: 10,200 enumerated → 10,101 with a readable body → 1,939 with a test claim → 341 with a checkable claim → 129 with an inconsistency. (`figures/fig1_corpus_funnel`)
- **Fig 2.** Internal-consistency outcome over 3,005 checkable claims: consistent vs inconsistent (11.1%) vs decision-changing (1.7%). (`figures/fig2_headline_outcome`)
- **Fig 3.** False-positive adjudication of the 333 flags (TRUE_LIKELY / REVIEW_P_BOUND / FP_ONE_TAILED / FP_MISEXTRACTION), with the extractor fix annotated (157 → 0). (`figures/fig3_fp_validation`)
- **Fig 4.** Reported vs recomputed p (log-log) for all 333 flagged claims, coloured by adjudication category; ★ = decision-changing. (`figures/fig4_reported_vs_recomputed_p`)
- **Fig 5.** Flagged inconsistencies by statistic type (t / F / r / z / χ²). (`figures/fig5_by_statistic_type`)
- **Fig 6.** Inconsistency rate across frames: raw 11.1% · IPW 10.5% · likely-true 8.7% · independent OA 5.6%. (`figures/fig6_rate_robustness`)
- **Fig 7.** Corpus composition by article type. (`figures/fig7_article_types`)

## References

1. Nuijten MB, Hartgerink CHJ, van Assen MALM, Epskamp S, Wicherts JM. The prevalence of statistical reporting errors in psychology (1985–2013). Behav Res Methods. 2016;48(4):1205–1226.
2. Bharti V, Chakraborty D. StickForStats: automated statistical assumption validation for reproducible computational biology. bioRxiv. 2026. doi:10.64898/2026.06.15.732278.
3. Epskamp S, Nuijten MB. statcheck: Extract statistics from articles and recompute p-values. R package version 1.5.0. 2018.
4. Baker M. 1,500 scientists lift the lid on reproducibility. Nature. 2016;533(7604):452–454.
5. Ioannidis JPA. Why most published research findings are false. PLoS Med. 2005;2(8):e124.
6. Open Science Collaboration. Estimating the reproducibility of psychological science. Science. 2015;349(6251):aac4716.
7. Nosek BA, Alter G, Banks GC, et al. Promoting an open research culture. Science. 2015;348(6242):1422–1425.
8. Wicherts JM, Borsboom D, Kats J, Molenaar D. The poor availability of psychological research data for reanalysis. Am Psychol. 2006;61(7):726–728.
9. Hardwicke TE, Wallach JD, Kidwell MC, et al. An empirical assessment of transparency and reproducibility-related research practices in the social sciences (2014–2017). R Soc Open Sci. 2020;7(2):190806.
10. Brown NJL, Heathers JAE. The GRIM test: A simple technique detects numerous anomalies in the reporting of results in psychology. Soc Psychol Personal Sci. 2017;8(4):363–369.
11. The NCBI PubMed Central Open Access Subset. National Library of Medicine. https://www.ncbi.nlm.nih.gov/pmc/tools/openftlist/
12. Virtanen P, Gommers R, Oliphant TE, et al. SciPy 1.0: fundamental algorithms for scientific computing in Python. Nat Methods. 2020;17(3):261–272.
