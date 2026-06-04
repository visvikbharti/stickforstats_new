# Table 7 classification provenance — manuscript verification corpus

Per-claim adjudication of the 19 flags in the 20-article retrospective-verification
corpus, each read back against its source article. Source of truth: `results.json`
(aggregate: 295 recomputable, 276 consistent, 14 discrepancy + 5 gross = 19 flagged, 93.6%).
Derived 2026-06-05 for the SoftwareX/GigaScience submission.

**Final taxonomy (sums to 19):** 9 sphericity-corrected RM-ANOVA · 5 tool false-positive · 4 genuine candidate error · 1 sample-size critical value.

> **Reviewer correction applied:** the automated pass classified `F(6,128)=6.8, p=.03` (PMC13223791) as sphericity, but for its 3-level within factor the Greenhouse-Geisser epsilon is bounded >= 0.5, so the correction cannot move p from ~3e-6 to 0.03 (and the reported eta_p^2=0.18 is also inconsistent). Reclassified to **genuine** (matching the original manuscript). Net: sphericity 10->9, genuine 3->4.

## Per-claim classifications

| # | Statistic | Category | Conf. | Source-grounded reason (abridged) |
|---|---|---|---|---|
| 1 | F(1.86, 28.30) = 6.535, p = 0.011 | sphericity_rm_anova | high | The paper explicitly states this is a 'two-way repeated measures ANOVA.' The numerator df is fractional (1.86) and the companion current-int... |
| 2 | F (1, 75) = 1.60, p=.69 | genuine_discrepancy | medium | This is the 'sign type' main effect in a mixed-design (split-plot) ANCOVA. Sign type (Facebook vs. traffic) is the within-subjects/repeated-... |
| 3 | t (96) = -0.197, p = 0.86 | extraction_artifact | high | This is a standard between-groups post-hoc t-test comparing excessive vs. non-excessive users on omission errors to traffic signs. With ~98 ... |
| 4 | F (2, 58) = 3.728, p = 0.061 | sphericity_rm_anova | high | This is a repeated-measures (within-subjects) ANOVA: the same 30 patients were each scanned on all three scanners (Philips, GE, UIH), giving... |
| 5 | F (2, 58) = 2.885, p = 0.098 | sphericity_rm_anova | high | Same repeated-measures ANOVA table (Table 3) for the gray matter region. Reported p=0.098 > recomputed p=0.064, the Greenhouse-Geisser direc... |
| 6 | F (2, 58) = 3.015, p = 0.091 | sphericity_rm_anova | high | Cerebral cortex region from the same within-subjects ANOVA (Table 3). Reported p=0.091 > recomputed p=0.057 -- Greenhouse-Geisser signature ... |
| 7 | F (2, 58) = 2.475, p = 0.123 | sphericity_rm_anova | high | Frontal lobe region from the same repeated-measures ANOVA (Table 3). Reported p=0.123 > recomputed p=0.093 -- the Greenhouse-Geisser directi... |
| 8 | F (2, 58) = 0.491, p = 0.500 | sphericity_rm_anova | medium | Parietal lobe region from the same within-subjects ANOVA table (Table 3) under the paper's stated Greenhouse-Geisser correction policy. Here... |
| 9 | F (2, 58) = 0.9078, p = 0.353 | sphericity_rm_anova | medium | Cerebellum region from the same repeated-measures ANOVA (Table 3). Reported p=0.353 is SMALLER than recomputed p=0.409, the opposite of the ... |
| 10 | F (1,22) = 0.560, p = 0.692 | sphericity_rm_anova | high | This is the 'layer × age' interaction in a repeated-measures (mixed) ANOVA where 'the synaptic layers were treated as a repeated measure' an... |
| 11 | F(3.437,21) = 0.973 | sphericity_rm_anova | high | The reported df are explicitly FRACTIONAL (3.437), which is the direct fingerprint of the Huynh-Feldt sphericity correction the Methods stat... |
| 12 | F(6,128) = 6.8, p = 0.03 | genuine_discrepancy | high (reviewer-reclassified) | The flagged statistic is the group×time interaction from a mixed-design (split-plot) ANOVA with a WITHIN-SUBJECTS factor (3 repeated time po... |
| 13 | F(1,16)=8.66, p=0.20 | genuine_discrepancy | medium | Post-hoc pairwise comparison (siSlc6a6+PBS vs siSlc6a6+L-BAIBA) within a two-way ANOVA on independent cell-culture groups (n=5/group) -- BET... |
| 14 | F(1,16)=0.03, p>0.99 | extraction_artifact | high | Two-way ANOVA post-hoc pairwise comparison (between-subjects, n=5/group, integer df 1,16; NOT repeated-measures, no sphericity). Methods 2.1... |
| 15 | F(1,8)=0.40, p=0.97 | extraction_artifact | high | Two-way ANOVA post-hoc pairwise comparison on independent groups (n=3/group, integer df 1,8; between-subjects, no repeated-measures/spherici... |
| 16 | F(1,8)=0.36, p=0.97 | extraction_artifact | high | Two-way ANOVA post-hoc pairwise comparison, independent groups (n=3/group, integer df 1,8; between-subjects, no RM/sphericity). Per Methods ... |
| 17 | F(1,8)=0.45, p=0.96 | extraction_artifact | high | Two-way ANOVA post-hoc pairwise comparison, independent groups (n=3/group, integer df 1,8; between-subjects, no repeated-measures/sphericity... |
| 18 | t (91) = 2.28, p = 0.050 | genuine_discrepancy | high | The paper explicitly describes this as an INDEPENDENT SAMPLES t-test comparing two groups (males vs females) on years of experience -- a sta... |
| 19 | Z = 1.96 (reported p=0.5 vs recomputed p=0.05) | sample_size_critical_value | high | Z = 1.96 is not a hypothesis-test statistic. It is the standard normal deviate (critical value) at the 95% confidence level used in Cochran'... |

## Borderline classifications needing co-author confirmation
- **PMC13223457 F(2,58)=0.491 (p=.500) and F(2,58)=0.9078 (p=.353):** tagged sphericity but reported p is *smaller* than recomputed — the opposite of the Greenhouse-Geisser direction; could be coarse rounding. Design is unambiguously repeated-measures, so the category is defensible but the direction is atypical.
- **PMC13223338 F(1,75)=1.60 (p=.69) and PMC13223804 F(1,16)=8.66 (p=.20):** classified genuine; internally inconsistent reports where it is unclear which number is the typo. Framed as 'for human review', not confirmed errors.
