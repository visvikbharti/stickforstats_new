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
widespread internal inconsistencies in the psychology literature. In biomedicine the same question has been
approached once at scale, by Damen and colleagues across 163,129 randomized controlled trials, but the
fraction of the literature that is machine-checkable at all was reported there as data attrition rather than
as a finding, and only for trials, only from PDF-derived text, and only through 2017. We assembled a census of 10,103 PubMed Central Open-Access
biomedical articles (2018–2025) matching a classical quantitative-design query, parsed their JATS-XML full
text, extracted every in-text null-hypothesis significance-testing (NHST) statistic with a deterministic,
open-source verification engine (StickForStats; regular-expression extraction, no language-model component),
and recomputed each two-tailed p-value in the statcheck style. Two findings
dominate. First, **machine-verifiability is rare**: only about 3.4% of papers (341 of 10,101 with a readable
body) report even one in-text, recomputable test statistic; the overwhelming majority of reported statistics
live in tables and figures and cannot be recovered from running text. Second, among the 3,005 recomputable
claims, the raw internal-inconsistency rate is **11.8%** (1.7% decision-changing), but transparent
false-positive adjudication shows that about 77% of flags are likely-genuine and about 14% are clear tool
false positives (chiefly one-sided p-values our two-tailed recompute cannot match). Because claims nest
within papers, we report the adjudicated genuine rate with a paper-clustered bootstrap interval:
**9.1%, 95% CI [7.0%, 11.5%]**. The estimate is robust to the sampling design: inverse-probability
weighting shifts it by ≤0.5 percentage points, and a small independent general-Open-Access frame is
directionally consistent (5.6%, from 108 checkable claims in 5 papers). Against statcheck on the
same articles our extractor reaches 97.7% recall and 98.1%
precision, and the verifiability denominator is tool-independent: an independent extractor
(JATSdecoder's `get.stats()`, which reads the same JATS markup) recovers 3.96% [95% CI 3.15, 4.94]
on a stratified sample of the same corpus, a difference from our 3.38% of +0.58 pp [−0.23, +1.57]. The biomedical literature is, for the most part, not written in a form that allows automatic
statistical verification—a transparency gap that is itself a target for reform.

## Author summary

When scientists report a statistical test—for example "t(38) = 2.1, p = 0.04"—the p-value can be recomputed
from the test statistic and its degrees of freedom and checked against what the authors wrote. Tools like
statcheck have used this idea to show that a surprising share of psychology papers contain numbers that do
not add up. We asked a simpler, prior question for biomedicine: *how often is the literature even checkable
this way?* Scanning the full text of 10,103 open-access biomedical papers, we found that only about one in
thirty reports a statistic in a form a computer can re-derive from the text—the rest are buried in tables and
figures. Among the statistics we *could* check, most were internally consistent; after separating
genuine errors from artifacts of automated checking (such as one-sided tests), the genuinely inconsistent
share is around one in eleven, though the uncertainty around that figure spans roughly 7% to 11.5% once we
account for the fact that some papers contribute many claims and others only one. The result is reassuring about arithmetic but sobering about transparency: most
biomedical papers are not written in a way that lets anyone verify their statistics automatically.

## Introduction

A reported statistical test usually carries internal redundancy: a test statistic, its degrees of freedom,
and a p-value are not three independent numbers but a triple in which any one can be recomputed from the
other two. *statcheck* exploited this redundancy to audit the psychology literature at scale, recomputing
reported p-values from the reported statistic and degrees of freedom and finding that roughly half of papers
contained at least one inconsistency and about one in eight an inconsistency that changed a significance
decision [1]. That result reshaped how a field thinks about its own error rate, and it did so without any
access to the underlying data—purely from the redundancy already printed in the text.

Whether the same picture holds in biomedicine has been addressed once at comparable scale. Damen et al.
assembled 163,129 randomized controlled trials published 1996–2017, converted publisher PDFs to text with
GROBID, and applied statcheck together with a confidence-interval-based recomputation [13]. Their reported
outcome is a *statistical discrepancy* rate—an inconsistency large enough to cross α = 0.05—of 1.7% (370 of
21,230 trials). The quantity this paper is about appears in their work too, but as attrition: of the 163,129
included trials, only **21,230 (13.0%, our calculation from their Figure 1; the percentage is not stated in
their paper)** contained "a combination of P value and test statistic" that could be recomputed at all, a
loss they list among their limitations rather than analysing.

Two things follow, and both shape what we report. First, **the verifiability question is not uncharted, but
it has not been treated as a finding**, nor measured outside randomized trials, nor from publisher-native
markup, nor after 2017. Second, **their headline 1.7% is not comparable to a raw inconsistency rate**, and
comparing the two would be a category error. Damen et al. deposited their per-article results under CC BY;
re-running their published inclusion criteria over that dataset reproduces their funnel exactly (183,927
full texts → 163,129 included → 21,230 checkable → 370 discrepancies) and recovers the raw rates their paper
does not report: **20.15% of checkable trials (4,278/21,230) contain at least one statcheck inconsistency,
and 7.30% of individual checked results (7,374/100,970) are inconsistent.** It is the latter figure, not
1.7%, that is the counterpart to the per-claim rate we report below.

A second strand measures the denominator directly but outside biomedicine. Böschen benchmarked JATSdecoder's
`get.stats()` against statcheck over 56,005 psychology documents, including 42,474 in NISO-JATS—our exact
input format—and found at least one checkable in-text result in 39.9% of the native-XML articles [14]. That
is an order of magnitude above what we report for biomedicine, and the gap is the substance of our first
finding rather than a discrepancy to be explained away: psychology reports inline APA-style test triples,
biomedicine reports effect estimates with confidence intervals in tables. Böschen has separately argued that
statcheck-class extraction is too narrow to be relied upon [15]; Nuijten disputes this [16]. We take no side,
and our adjudication step below is a direct response to the precision half of that dispute.

The reason biomedicine is hard to check is itself informative. Biomedical results are frequently reported not
as inline `t(df) = …, p = …` triples but as
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

### The verification engine

The instrument behind this census is a deterministic, open-source verification engine (StickForStats;
MIT-licensed) that operates in three layers, of which the census uses the first two. **(1) Extraction.**
Reported NHST statistics are pulled from text with a fixed library of ~24 APA-style regular expressions
covering t, F, χ², r, and z tests and their associated p-values; each statistic is paired to its p-value
through a scoped, sentence-boundary-respecting proximity window, and every extracted claim carries provenance
(section, source file, and character position). Extraction is purely regular-expression-based and contains no
language-model component, so it is fully deterministic and inspectable — a prerequisite for a reproducible
census. **(2) Internal-consistency checking.** For any claim that carries a statistic, the degrees of freedom
needed to recompute it, and a point p-value, the engine recomputes the two-tailed p with SciPy and compares it
to the reported value in a rounding- and inequality-aware manner, equivalent to statcheck; this is the layer
applied at scale here. **(3) Raw-data re-analysis** (not exercised by the census, but described because it
defines the engine's scope). When the underlying data are supplied, a claim-to-data linker resolves which
uploaded table backs a claim — following the authors' own in-text cross-references (e.g. resolving
"Supplementary Table S3" to the corresponding artifact) and flagging *citation–content conflicts* where the
cited data fail to reproduce the stated result — then re-runs the authors' test, audits its assumptions through
the Guardian subsystem (normality, variance homogeneity, independence; cascading to a nonparametric
alternative when an assumption fails), and assigns one of seven verdicts (VERIFIED, DISCREPANT,
ASSUMPTION_VIOLATED, ASSUMPTION_UNREPORTED, INSUFFICIENT_DATA, UNVERIFIABLE_EXTRACTION, INCONSISTENT_REPORTING).
A multi-file ingestion layer accepts a whole submission (manuscript, supplementary documents, tabular data, and
figure images via OCR). Every report states explicitly what it does and does not certify, and confidence
scores are left uncalibrated pending the human double-coding study described below. The engine is available as
a REST API and a Python package (`pip install stickforstats`). The census was produced entirely by layers
(1)–(2): an in-text statistic can be checked for *internal consistency* without the raw data that layer (3)
requires — data which, as we show, the literature rarely provides in linkable form.

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
reported in tables). From the resulting text we extracted candidate NHST statistics with the engine's
extraction layer described above (the ~24 deterministic APA-style patterns and scoped, sentence-aware
p-attachment). A claim was deemed **checkable (recomputable)** when it carried a statistic, the degrees of
freedom required to
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
157 to 0 and the raw inconsistency rate from 14.5% to 11.1% (and decision-changing from 4.2% to 1.7%) as
scored by the p-value reader in use at the time, and all results below are post-fix.

We subsequently identified and corrected two further defects in the p-value reader itself, and every rate
reported below is re-scored with the corrected reader. First, a p written in scientific notation
(`p = 9.04e-8`) was treated as having unknown precision and compared under a flat ±0.005 window—an amnesty
at small p. Second, the inequality branch applied that same flat window regardless of the precision actually
stated, so `p < .0001` against a recomputed `.004` was scored consistent. Re-scoring the full corpus moves
the raw rate from 11.08% to 11.81%: 22 claims changed verdict, **all of them consistent → inconsistent**,
none the other way, so the published figure was an under-count. The correction removes an internal
contradiction rather than imposing a new standard—for 12 of the 13 scientific-notation flips the old reader
returned a different verdict for the identical numeric value depending only on whether it was written
`9.04e-8` or `0.0000000904`. Re-running the *uncorrected* reader over the same corpus reproduces the
published 3,005 / 333 / 52 exactly, which is the control for this re-score.

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

Among the 3,005 recomputable claims, 355 (**11.8%**) were flagged inconsistent and 52 (**1.7%**) were
decision-changing; 136 of the 341 papers with a checkable claim (39.9%) contained at least one flag (Fig 2).
A raw 11.8% is, however, an over-estimate of *genuine* inconsistency, because automated recompute generates
predictable false positives. Adjudication of the 355 flags (Fig 3) gives: **TRUE_LIKELY 274** (77%),
**REVIEW_P_BOUND 33** (9%), **FP_ONE_TAILED 48** (14%), and **FP_MISEXTRACTION 0**. The clear false-positive
rate is thus 48/355 = 13.5% (all one-sided-p artifacts, after the mis-extraction defect was eliminated), and
the defensible genuine-inconsistency rate is the TRUE_LIKELY fraction, **274/3,005 = 9.1%** of checkable
claims, with a likely-true *decision-changing* count of 31.

That point estimate should not be read as a precise figure, and we do not describe it as single-digit.
Claims are not independent: they nest within papers, and the ten most claim-dense papers alone contribute
29.9% of all flagged claims. Resampling papers (not claims) with replacement, 10,000 replicates, gives a
**95% CI of [7.0%, 11.5%]** for the genuine rate and **[9.5%, 14.4%]** for the raw rate. The genuine-rate
interval crosses 10%, so the data are compatible with a low-double-digit rate and a "single-digit" summary
is not supportable. Clustered inference at the paper level is the analysis pre-specified in our
registration, and we report it here rather than the narrower claim-level interval. A reported-versus-recomputed
scatter (Fig 4) shows the structure directly: most flagged claims cluster near the identity line, the
one-sided artifacts fall on the 2× line, and the genuinely inconsistent claims scatter widely.

### The estimate is robust

Inverse-probability weighting, which corrects the day-clustered sampling design from within the same corpus,
moves the headline by less than a percentage point: the inconsistent-claim rate goes from 11.81% to 11.32%
and the decision-changing rate from 1.73% to 1.46% (a ≤0.5-pp shift; Fig 6), confirming that the
over-representation of low-volume publication days did not bias the result. An entirely independent frame—a
uniform-ish sample of the *general* PMC OA population through a different NCBI endpoint, with no
quantitative-design enrichment—yields an inconsistency rate of 5.6% (6 of 108 checkable claims from only 5
papers; directional at best, and we do not treat it as an estimate), below the raw 11.8%. The two
robustness arms thus bracket the headline from within and without.

### The extractor is accurate against statcheck

Benchmarked against statcheck 1.5.0 on a labelled article set, the extractor achieved **97.7% recall and
98.1% precision** (F1 97.9%), with no regression introduced by the p-attachment fix. The instrument
underlying the census therefore extracts and recomputes inline statistics at parity with the established
tool, while the adjudication layer adds the false-positive accounting that turns a raw flag rate into a
defensible genuine rate.

### The 3.4% denominator is tool-independent

The verifiability denominator is the paper's most attackable number, because a low value could
equally reflect a narrow extractor. We therefore re-measured it with an independent tool that reads
the same input format: JATSdecoder's `get.stats()` [14], which is on CRAN, parses NISO-JATS
natively, and whose author has argued that statcheck-class extraction is too narrow to be relied
upon [15].

A stratified sample of 800 papers (seed 20260824; 200 of the 341 with a checkable claim, 600 of the
9,760 without) was re-fetched from PMC; 760 were retrievable. As a control, re-running our own
pipeline over the re-fetched files reproduced the census ledger's per-paper checkable count for
**760 of 760 papers with zero disagreements**, so what follows compares tools rather than corpora.
Both tools were run on the raw JATS and, separately, on our extracted body text, in order to
separate an extractor difference from a text-scope one. "Checkable" follows Böschen's definition: a
result carrying both a reported and a recomputable p.

Reweighted to the full corpus (paired stratified bootstrap, 10,000 replicates), JATSdecoder
recovers **3.96% [95% CI 3.15, 4.94]** against our **3.38%** — a difference of **+0.58 percentage
points, 95% CI [−0.23, +1.57]**, which is not distinguishable from zero. Two independently written
extractors converge on the same biomedical denominator, and both sit roughly an order of magnitude
below the 39.9% Böschen reports for native-XML psychology articles [14]. **The scarcity of
machine-checkable statistics in biomedicine is therefore a property of the literature, not an
artifact of our patterns**, and the contrast with psychology is disciplinary: inline APA triples
versus effect estimates and intervals in tables.

The disagreements run in both directions and bound our own recall honestly. Paper-level agreement
is 94.5% (718/760). In 37 papers—18.5% of the stratum where we found a claim—our extractor found a
checkable result and JATSdecoder did not. In 7 papers the reverse held; re-running JATSdecoder on
our body-only text shows 1 of those is abstract-only, a deliberate scope difference rather than a
miss, leaving **6 genuine recall gaps (1.1% of the 560 sampled papers we scored as
non-checkable)**. Each is a reporting form our patterns do not cover: a subscripted statistic
(`F age(3,16)=18.47`), the p stated before the statistic (`p=0.0597, t=2.003, df=19`), and fit
indices interposed between the statistic and its p (`chi2(270)=1061.13, p<.001, RMSEA=.05`). Across
the 760 papers JATSdecoder extracted 1,900 checkable claims to our 1,661 (1.14×). We therefore do
not claim exhaustive recall: like Böschen's, and for the same reason—both tools ignore results
reported inside tables—our denominator is a lower bound on what is actually reported.

## Discussion

Two numbers summarise the census. **About 3.4% of biomedical open-access papers report an in-text,
machine-recomputable statistic**, and **of those statistics, an estimated 9.1% are genuinely internally
inconsistent (95% CI [7.0%, 11.5%], papers as clusters)**. The first is a transparency finding; it is not
unprecedented—Damen et al. report the same quantity as attrition for randomized trials [13], and Böschen
measures it directly for psychology [14]—but treating it as the object of study, across biomedicine, from
publisher-native JATS, is what this census contributes. The second is a reassuring—but qualified, and
deliberately interval-valued—reliability finding, and it is best read as a replication.

The transparency finding is the more consequential. The dominant reason a biomedical paper's statistics
cannot be auto-verified is not error but *reporting form*: results are presented in tables of adjusted
estimates and intervals, or annotated on figures, rather than as the inline `statistic(df) = …, p = …` triples
that carry recompute redundancy. This is not a criticism of any individual paper—it reflects entrenched
field conventions—but it does mean that the powerful, data-free auditing that reshaped psychology's view of
its own error rate is, today, simply inapplicable to ~96% of the biomedical literature. Reporting standards
that encouraged inline test statistics (or, better, machine-readable structured results) would convert a
large, currently un-auditable corpus into a checkable one at essentially no cost to authors.

The reliability finding should be read carefully and not over-sold, and we have resisted the temptation to
compress it into a single adjective. An earlier draft of this manuscript called the rate "single-digit". It
is not defensibly single-digit: the paper-clustered interval runs to 11.5%, and the ten most claim-dense
papers contribute 29.9% of all flags, so claim-level precision is illusory. A genuine-inconsistency rate of
roughly 7–11.5% among *checkable* claims is lower than statcheck's headline figures for psychology, but the
populations differ in design, discipline, and—critically—in what is checkable, so the comparison is
qualitative.

Two external anchors are worth stating precisely, because both are easy to misuse. Nuijten et al.'s synthesis
of seven prior studies gives a median inconsistent-*results* rate of 11.1% (range 4.3–14.3%) [1]; our raw
11.8% sits essentially on that median, which is the appropriate comparison for a raw per-claim rate. And the
per-result rate recoverable from Damen et al.'s deposited data—7.30%—falls in the same band, from an entirely
different corpus (randomized trials), a different input format (PDF via GROBID), and a different era
(1996–2017). Their *published* 1.7% must not be read as the counterpart to our 11.8%: it counts only
discrepancies that cross α = 0.05, and it is bounded further by a ≥0.01 absolute-difference gate their
methods apply before flagging anything. The comparable decision-crossing quantity in our data is 1.7% of
checkable claims, which coincides with their figure by arithmetic rather than by construction, and we draw no
inference from that coincidence. We
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

- **Fig 1.** Corpus funnel: 10,200 enumerated → 10,101 with a readable body → 1,939 with a test claim → 341 with a checkable claim → 136 with an inconsistency. (`figures/fig1_corpus_funnel`)
- **Fig 2.** Internal-consistency outcome over 3,005 checkable claims: consistent vs inconsistent (11.8%) vs decision-changing (1.7%). (`figures/fig2_headline_outcome`)
- **Fig 3.** False-positive adjudication of the 355 flags (TRUE_LIKELY / REVIEW_P_BOUND / FP_ONE_TAILED / FP_MISEXTRACTION), with the extractor fix annotated (157 → 0). (`figures/fig3_fp_validation`)
- **Fig 4.** Reported vs recomputed p (log-log) for all 355 flagged claims, coloured by adjudication category; ★ = decision-changing. (`figures/fig4_reported_vs_recomputed_p`)
- **Fig 5.** Flagged inconsistencies by statistic type (t / F / r / z / χ²). (`figures/fig5_by_statistic_type`)
- **Fig 6.** Inconsistency rate across frames: raw 11.8% · IPW 11.3% · likely-true 9.1% · independent OA 5.6%. (`figures/fig6_rate_robustness`)
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
13. Damen JA, Heus P, Lamberink HJ, Tijdink JK, Bouter L, Glasziou P, et al. Indicators of questionable research practices were identified in 163,129 randomized controlled trials. J Clin Epidemiol. 2023;154:23–32. doi:10.1016/j.jclinepi.2022.11.020. Data: https://github.com/wmotte/RCTQuality
14. Böschen I. Evaluation of JATSdecoder as an automated text extraction tool for statistical results in scientific reports. Sci Rep. 2021;11:19525. doi:10.1038/s41598-021-98782-3.
15. Böschen I. statcheck is flawed by design and no valid spell checker for statistical results. arXiv:2408.07948. 2024.
16. Nuijten MB. Statcheck does what it is designed to do: a reply to Böschen (2024). PsyArXiv. 2025. doi:10.31234/osf.io/xyfjz.
