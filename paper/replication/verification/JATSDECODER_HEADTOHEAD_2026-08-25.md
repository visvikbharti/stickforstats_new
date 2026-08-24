# Independent-extractor check: JATSdecoder `get.stats()` vs. our extractor

_Executed 2026-08-25. Every number below was run; nothing is quoted from either tool's authors._

## Why this exists

The census reports that **3.4% of biomedical PMC OA papers (341 of 10,101) contain at least one
in-text, machine-recomputable NHST statistic**. Böschen measured the same quantity, from the same
input format (publisher-native NISO-JATS), and reported **39.9%** — 16,945 of 42,474 psychology
articles (Sci Rep 2021;11:19525, Table 3, verified at source). That is an order-of-magnitude gap,
and it is the single most attackable number in the paper: a reviewer's first question is whether
our denominator is a property of *the literature* or of *our extractor*.

`JATSdecoder` is on CRAN, reads NISO-JATS natively, and installs in one line. A reviewer can run
it against our corpus. So we did.

## Design

The raw corpus (3.2 GB) lives on an external drive that was not mounted, so the sampled articles
were **re-fetched from PMC efetch**. A stratified sample of the 10,101 scored papers, seed
`20260824`:

| stratum | definition | population | sampled | retrieved |
|---|---|---|---|---|
| A | our extractor found ≥1 checkable claim | 341 | 200 | 200 |
| B | our extractor found none | 9,760 | 600 | 560 |

40 of the 800 were not retrievable from PMC (withdrawn or access-restricted) and are excluded.
Stratum B is deliberately oversampled: that is where a recall gap would hide.

**CONTROL — the re-fetch is equivalent to the original corpus.** Re-running our pipeline over all
760 re-fetched XML files reproduces the census ledger's `n_checkable` for **760 of 760 papers,
zero disagreements**. Any difference below is therefore between *tools*, not between corpora.

Both tools were run two ways, because the two explanations for a gap must be separated:

1. **Raw JATS XML** — the whole pipeline, as a reviewer would run it.
2. **Our extracted body text** — identical input, isolating the extractor from text scope.
   (Our census deliberately excludes the abstract, to avoid double-counting a result restated in
   both the abstract and the Results; JATSdecoder's default reads it.)

"Checkable" follows Böschen's definition exactly: a result carrying **both** a reported p and a
recomputable one — in `standardStats`, rows where `p` and `recalculatedP` are non-NA.

## Result — the two extractors agree

Reweighted to the 10,101-paper population, paired stratified bootstrap, 10,000 replicates:

| | estimate | 95% CI |
|---|---|---|
| **Ours** (census) | **3.38%** | — (a census of the frame, not a sample) |
| **JATSdecoder `get.stats()`**, raw XML | **3.96%** | [3.15, 4.94] |
| JATSdecoder, our body text | 3.80% | [2.96, 4.65] |
| **Difference (JATSdecoder − ours)** | **+0.58 pp** | **[−0.23, +1.57]** |

**The difference is not distinguishable from zero.** Two independently written extractors, one of
them the tool whose author argues statcheck-class extraction is unreliable, land on the same
biomedical denominator — and both land roughly **ten times below** Böschen's 39.9% for psychology.

**The 3.4% is therefore a property of the biomedical literature, not of our regexes.** The gap
against psychology is disciplinary: psychology reports inline APA triples (`t(57) = 3.69, p < .001`),
biomedicine reports effect estimates with confidence intervals, in tables.

## Where the two tools disagree, and it runs both ways

On the 760 papers, paper-level agreement is **94.5%** (718/760).

- **37 papers (18.5% of stratum A): we found a checkable result and JATSdecoder did not.** Our
  extractor is not uniformly the weaker one on biomedical text.
- **7 papers: JATSdecoder found one and we did not.** Classified by re-running it on our body-only
  text: **1 is abstract-only** — a deliberate scope difference, not a miss — and **6 are genuine
  recall gaps.**

Total checkable *claims* across the 760: **ours 1,661, JATSdecoder 1,900 (1.14×)**. JATSdecoder
extracts about 14% more claims, consistent in direction with its author's benchmark, but far from
the multiples reported for PDF-derived psychology text.

### The six genuine gaps, characterised

Inspected individually. Each is a reporting form our patterns do not cover:

| form | example (verbatim from the article) |
|---|---|
| subscripted statistic / df | `F age(3,16)=18.47 p<0.0001` |
| reversed order — p before the statistic | `p=0.0597, t=2.003, df=19` |
| fit indices interposed before p | `chi2(270)=1061.13, p<.001, RMSEA=.05, CFI/TLI=.99/.98` |

These are precisely the deviations from strict APA style that JATSdecoder was built to absorb.
They are a real, bounded limitation of our extractor: about **1.1% of the papers we score as
non-checkable (6 of 560) contain a body result JATSdecoder can check**, which is the honest
statement of our recall gap and is reported as such in the manuscript.

## Reproducing this

```bash
# 1. arm64 Java is required (openNLP -> rJava); the system JVM here is x86_64
export JAVA_HOME=/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home
JAVA_HOME="$JAVA_HOME" R CMD javareconf
Rscript -e 'install.packages("JATSdecoder", repos="https://cloud.r-project.org")'

# 2. run both modes over the sampled XML
Rscript paper/replication/verification/jatsdecoder_headtohead.R
```

Artifacts, both tracked:
`paper/census_paper/data/jatsdecoder_sample_2026-08-25.json` (the stratified draw, with seed) and
`paper/census_paper/data/jatsdecoder_headtohead_2026-08-25.csv` (per-paper counts, both modes;
sha256 `371f81cc…71fa`).

## Version and limits — stated plainly

- **JATSdecoder 1.3.0** (CRAN's current release is 1.3.1; 1.3.0 is what the binary installed here
  and what these numbers were produced with). R 4.4.1.
- The comparison is **in-text only**. Both tools ignore results reported inside tables, so both
  denominators are, in Böschen's own words about his, *negatively biased* estimates of what is
  actually reported.
- The sample gives a ±~0.9 pp interval on JATSdecoder's population rate. It does not resolve
  differences smaller than that, and is not intended to.
- 40 of 800 sampled papers were unretrievable and are excluded; if unretrievable papers differ
  systematically in checkability, that is unmeasured.
- **A defect in the first run of this comparison, recorded because it nearly produced a false
  headline:** the counting helper used `("p" %in% colnames(ss)) && !is.na(ss$p)` — `&&` applied to
  a vector, which errors in R ≥ 4.3 for any paper with more than one result. `tryCatch` converted
  every such paper into `NA`, i.e. exactly the papers that matter, and the run reported
  JATSdecoder finding almost nothing (0.96%). The numbers were implausible, which is the only
  reason it was caught. Fixed to vectorised `&`, errors now surfaced rather than swallowed, and
  the re-run completed with **zero** errors across 760 papers.
