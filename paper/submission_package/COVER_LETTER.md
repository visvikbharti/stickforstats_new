# Cover Letter

**To:** [EDITOR NAME], Editor, [JOURNAL NAME]
**From:** Vishal Bharti and Debojyoti Chakraborty, CSIR-Institute of Genomics and Integrative Biology, New Delhi
**Date:** [DATE]
**Re:** Submission of "StickForStats: automated statistical assumption validation for reproducible computational biology"

Dear [EDITOR NAME],

We are pleased to submit our manuscript, "StickForStats: automated statistical assumption validation for reproducible computational biology," for consideration at [JOURNAL NAME]. This is a software/tool paper paired with an honest, real-data evaluation. StickForStats is an open-source (MIT-licensed) platform whose Guardian system uses eight validators to automatically check the assumptions underlying common statistical tests and to cascade to appropriate nonparametric alternatives when those assumptions fail. We do not claim a new statistical method; we contribute a validated, reproducible, and useful piece of research software, together with a transparent assessment of where it helps and where it does not.

A preprint of this work is publicly available on bioRxiv (doi:10.64898/2026.06.15.732278, posted 2026-06-19). The present manuscript is a revised and extended version of that preprint. We disclose two integrity-driven revisions made for this submission: (1) in the synovial-sarcoma RNA-seq case study, the "Group B (n=74)" genes are no longer described as "false positives Guardian correctly rejected"; they are reframed as a genuine pipeline disagreement, because count-based GLMs (DESeq2/edgeR, the genomics standard) may legitimately call many of these large-effect genes truly differentially expressed; and (2) the manuscript-verification module's claim extraction is corrected from a "regex + language-model hybrid" description to "regex-based," since the language-model leg is reserved and not yet implemented.

We believe the manuscript is well suited to a venue that evaluates technical soundness rather than perceived novelty, because its contribution is a correct, well-engineered, and reproducible tool with an evaluation that we have deliberately kept honest. We note for full transparency that the paper was previously desk-rejected three times (JSS, JOSS, and PLOS Computational Biology), in every case on grounds of scope/novelty fit and not on quality or correctness; a soundness-oriented review is the appropriate home for this kind of contribution.

Concrete contributions of this work:

- The **Guardian system**: eight automated validators that detect violations of test assumptions (normality, variance homogeneity, independence, and others) and cascade to nonparametric alternatives, lowering the barrier to assumption-aware analysis.
- **Four real-data case studies**: CRISPR strategy comparison by ANOVA; ordinal correlation on the UCI wine-quality dataset; publication-bias assessment in an intravenous-magnesium meta-analysis; and per-gene assumption checking on synovial-sarcoma RNA-seq (GSE271517).
- A **head-to-head comparison with statcheck 1.5.0** on a 20-article corpus, situating the tool against an established reproducibility checker.
- A **manuscript-verification module** that extracts and re-checks reported statistics (regex-based).
- A **fully reproducible release** (v1.0.0) with public datasets and replication scripts, enabling independent verification of every reported value.

**Data and code availability.** All datasets used are public. The software is open-source under the MIT license at https://github.com/visvikbharti/stickforstats_new (v1.0.0), and replication scripts are provided under `paper/replication/`. A Zenodo DOI snapshot of the release is planned to accompany publication.

**AI disclosure.** Claude (Anthropic) assisted with code and manuscript drafting. All reported statistical values were independently recomputed against SciPy and R; no AI system is an author or is credited with intellectual contributions.

We confirm that this work is original, that it is not under consideration at any other journal, and that all authors have read and approved the submission and consent to publication. Aside from the bioRxiv preprint noted above, no part of this manuscript has been published elsewhere.

Thank you for considering our submission. We would be glad to suggest reviewers or provide any additional materials.

Sincerely,
Vishal Bharti and Debojyoti Chakraborty
CSIR-Institute of Genomics and Integrative Biology, New Delhi

*(Any article-processing charge and submission requirements to be VERIFY at submission.)*

---

## Per-venue tailoring notes

**PLOS ONE.** Open the first paragraph by emphasizing rigorous, transparent reporting and reproducibility, since PLOS ONE explicitly judges technical soundness rather than novelty or impact — frame StickForStats as a sound, openly available tool whose claims are all independently recomputable. Lead with the real-data case studies and the honest reframing of the RNA-seq disagreement as evidence of methodological transparency. APC approximately US$2,477, or potentially lower via a transfer route (VERIFY at submission).

**PeerJ.** Angle the first paragraph toward practical utility for working life-science researchers and the breadth of biological case studies (CRISPR, RNA-seq, meta-analysis), matching PeerJ's audience of biologists and its soundness-not-novelty criterion. Foreground that the tool helps non-statisticians avoid assumption violations in everyday analysis. APC approximately US$1,195-1,395 (VERIFY at submission).

**BMC Bioinformatics.** Position the first paragraph around the software-and-algorithms contribution for computational biology — the Guardian validators and the genomics-facing RNA-seq case study (GSE271517) — to align with the journal's focus on bioinformatics methods and tools. Stress reproducibility, open licensing, and the per-gene assumption-checking workflow. APC approximately US$3,090 (VERIFY at submission).
