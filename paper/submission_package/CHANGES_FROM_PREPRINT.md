# Changes from the bioRxiv Preprint

This document records the revisions made to *"StickForStats: automated statistical assumption validation for reproducible computational biology"* (Vishal Bharti, Debojyoti Chakraborty; CSIR-Institute of Genomics and Integrative Biology, New Delhi) between the live bioRxiv v1 preprint (doi 10.64898/2026.06.15.732278, posted 2026-06-19) and the present resubmission. It is provided for the transparency of editors and reviewers, and to accompany a planned bioRxiv v2.

For context: the preprint was desk-rejected three times (Journal of Statistical Software, JOSS, and PLOS Computational Biology) — in every case on **scope/novelty fit, not on quality or correctness**. The resubmission targets a soundness-not-novelty venue (one that judges technical soundness rather than perceived novelty), and frames the work as what it is: a sound, reproducible, well-engineered, and useful open-source tool accompanied by an honest evaluation. The revisions below fall into three groups: scientific-integrity corrections, venue-fit reframing, and an explicit note of what is unchanged.

## Corrections (scientific integrity)

These corrections tighten claims to match what the evidence supports. They were initiated by the authors, not requested by any reviewer.

1. **RNA-seq Case Study 4, "Group B" (n=74) genes reframed — no longer labelled false positives.**
   In the preprint, the 74 genes in Group B were described as *"outlier-driven false positives that Guardian correctly rejected."* This characterization is withdrawn. These genes represent a genuine **pipeline disagreement**, not a confirmed error: count-based generalized linear models (DESeq2 and edgeR — the standard tools for differential expression in genomics) may legitimately call many of these large-effect genes truly differentially expressed. We therefore no longer claim Guardian "correctly rejected" them; we describe Group B as a difference in modelling assumptions between a Gaussian/rank framework and a count-GLM framework, and we make no claim that one verdict is the ground truth.
   - **Affected manuscript locations:** the abstract, the Case Study 4 text, Table 6, and the Figure 5 legend.

2. **Manuscript-verification module: claim extraction corrected from "regex + language-model hybrid" to "regex-based."**
   The preprint described the claim-extraction step of the manuscript-verification module as a "regex + language-model hybrid." This overstated the implemented system. Claim extraction is **regex-based**. The language-model leg is reserved/planned but not implemented in the released version, and the manuscript now says so plainly.

## Reframing (venue fit)

No results changed in this group; only the framing of contribution and language did.

- **Softened novelty-claiming language toward a soundness/tool framing.** Wording that positioned the work primarily as methodological novelty has been revised to present StickForStats as a sound, reproducible, and useful software tool with an honest, reproducible evaluation. This aligns the manuscript with soundness-not-novelty venues under consideration.
- **Candidate venues considered for resubmission:** PLOS ONE, PeerJ, BMC Bioinformatics, GigaScience/GigaByte, F1000Research, SoftwareX, Journal of Open Research Software (JORS), Bioinformatics Advances, and BMC Medical Research Methodology. Indicative article-processing charges, from memory and to be **VERIFIED at submission**: PLOS ONE ~US$2,477 (or via a transfer route); PeerJ ~US$1,195–1,395; GigaByte ~US$535 (indexed in ESCI only); BMC Bioinformatics ~US$3,090. Note that SoftwareX requires a code-with-the-paper model. Any venue-specific formatting, data-availability, and fee requirements will be confirmed against the chosen journal's author guidelines at submission time (**VERIFY at submission**).

## Unchanged

The core of the paper is unchanged. Specifically:

- The **Guardian system** — 8 validators that automatically check statistical-test assumptions and cascade to nonparametric alternatives — is unchanged.
- All **four real-data case studies** stand as before, with the single Group B *interpretation* correction noted above:
  1. CRISPR strategy comparison (ANOVA),
  2. UCI wine ordinal correlation,
  3. IV-magnesium meta-analysis publication bias, and
  4. synovial-sarcoma RNA-seq per-gene assumption checking (GSE271517).
- The **statcheck 1.5.0 head-to-head** on the 20-article corpus is unchanged.
- The **manuscript-verification module** itself is unchanged; only its *description* was corrected (see Corrections #2).
- **Data and code availability is unchanged:** all datasets are public, replication scripts remain under `paper/replication/`, the tool is MIT-licensed and open source (https://github.com/visvikbharti/stickforstats_new, v1.0.0), and a Zenodo DOI snapshot is planned.
- **AI disclosure is unchanged:** Claude (Anthropic) assisted with code and drafting; all reported values were recomputed against SciPy/R; no AI system is an author.
