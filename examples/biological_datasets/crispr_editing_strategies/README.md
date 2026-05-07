# CRISPR Genome Editing Strategy Comparison Dataset

## Source

Based on the CRISPRArchitect v3 scoring framework (Bharti & Chakraborty, 2026), a multi-nuclease, consequence-guided decision support system for genome editing strategy design.

## Description

Multi-criteria TOPSIS scores for **10 disease-associated variants** evaluated across **four genome editing modalities**:

- **Adenine Base Editing (ABE)**: DSB-free, highest safety; limited to A→G (and complement T→C) transitions in the editing window.
- **Prime Editing (PE3)**: Versatile (all 12 base substitutions, small indels), single nick (no DSB), moderate complexity (pegRNA + nicking guide).
- **HDR via single-stranded ODN (HDR_SSODN)**: Requires a Cas9 DSB plus an ssODN donor; lower safety in iPSCs (p53 activation).
- **HDR via cssDNA donor (HDR_CSSDNA)**: Requires a Cas9 DSB plus a chemically-modified single-stranded DNA donor; tolerates larger insertions but the highest off-target/large-deletion risk in this set.

## Files

| File | Rows | Description |
|------|------|-------------|
| `real_scored_strategies.csv` | 40 | 10 variants × 4 modalities, with TOPSIS composite + 6 component scores + per-strategy rank |
| `real_scored_strategies.json` | -- | Same content in JSON form for programmatic loading |
| `generate_dataset.py` | -- | Script that produced the CSV/JSON from the CRISPRArchitect v3 scorer |

## Variants

The 10 variants span common monogenic diseases of varying mutation classes:

| Gene | Disease | Mutation class |
|---|---|---|
| HBB | Sickle cell disease | Point mutation (β-globin Glu6Val) |
| CFTR | Cystic fibrosis | F508del (3-bp deletion) |
| DMD | Duchenne muscular dystrophy | Exon-skipping target |
| TP53 | Li-Fraumeni / cancer predisposition | Missense |
| LMNA | Hutchinson-Gilford progeria | Point activator of cryptic splice |
| COL7A1 | Recessive dystrophic epidermolysis bullosa | Multi-mutation locus |
| NF1 | Neurofibromatosis type 1 | Truncating |
| PCSK9 | Familial hypercholesterolemia | Loss-of-function therapeutic target |
| PAH | Phenylketonuria | Missense |
| SCN1A | Dravet syndrome | Loss-of-function |

## Scoring Dimensions (0--1 scale)

Each row carries the TOPSIS composite plus six dimension scores. See `generate_dataset.py` for the exact scorer used (taken from CRISPRArchitect v3).

| Dimension | Type | Meaning |
|---|---|---|
| `safety_score` | Benefit | DSB-free or single-nick editing preferred (iPSC p53 activation concern) |
| `feasibility_score` | Benefit | PAM availability, editing window position, guide quality |
| `complexity_score` | Cost | Number of components, delivery burden |
| `risk_score` | Cost | Off-target potential, large deletion risk |
| `confidence_score` | Benefit | Evidence tier (measured > derived > assumed) |
| `topsis_score` | Composite | Weighted distance from anti-ideal vs. ideal solution |

## Suggested Analyses with StickForStats

1. **One-way ANOVA / Kruskal-Wallis** on `topsis_score` grouped by `modality`. Guardian will check normality and variance homogeneity. Empirically the HDR groups are non-normal, so Guardian cascades ANOVA → Kruskal-Wallis.
2. **Post-hoc**: Dunn's test with Benjamini-Hochberg correction for pairwise modality comparisons.
3. **Effect size**: Eta-squared H for the Kruskal-Wallis (the sample is small, so use the unbiased form).
4. **Per-modality normality** (Shapiro-Wilk on each modality's `topsis_score`) -- useful for understanding which modality drives the violation.

These four analyses reproduce Case Study 1 in the StickForStats PLOS Comp Bio manuscript (`paper/plos_compbio/manuscript.md`).

## Citation

If using this dataset, please cite:
- StickForStats: Bharti V, Chakraborty D. (2026). StickForStats: A Statistical Analysis Platform with Automatic Assumption Validation.
- CRISPRArchitect: Bharti V, Chakraborty D. (2026). CRISPRArchitect v3: Multi-nuclease, consequence-guided decision support for genome editing strategy design.
