# CRISPR Genome Editing Strategy Comparison Dataset

## Source

Based on the CRISPRArchitect v3 scoring framework (Bharti & Chakraborty, 2026), a multi-nuclease, consequence-guided decision support system for genome editing strategy design.

## Description

Multi-criteria TOPSIS scores for 30 pathogenic variants across three genome editing modalities:

- **Base Editing (BE)**: DSB-free, highest safety, limited to transition mutations
- **Prime Editing (PE)**: Versatile, moderate complexity (pegRNA + nick guide)
- **Homology-Directed Repair (HDR)**: Requires DSBs + donor template, lowest safety in iPSCs

## Files

| File | Rows | Description |
|------|------|-------------|
| `topsis_scores.csv` | 90 | 30 variants x 3 modalities, 6 scoring dimensions + TOPSIS composite |
| `monte_carlo_ranks.csv` | 30,000 | 30 variants x 1,000 Dirichlet weight permutations |
| `rank_stability.csv` | 30 | Per-variant rank stability (fraction of permutations with same top rank) |

## Scoring Dimensions (0-1 scale)

| Dimension | Weight | Type | Meaning |
|-----------|--------|------|---------|
| Safety | 0.30 | Benefit | DSB-free editing preferred (iPSC p53 selection concern) |
| Feasibility | 0.25 | Benefit | PAM availability, editing window, guide quality |
| Complexity | 0.15 | Cost | Number of components, delivery burden |
| Risk | 0.15 | Cost | Off-target potential, large deletion risk |
| Confidence | 0.10 | Benefit | Evidence tier (measured > derived > assumed) |
| Consequence | 0.05 | Benefit | Functional impact of intended edit |

## Suggested Analyses with StickForStats

1. **One-way ANOVA / Kruskal-Wallis**: Compare TOPSIS composite scores across BE vs PE vs HDR
   - Guardian will check normality and variance homogeneity
   - Expected: HDR scores are non-normal → Guardian cascades to Kruskal-Wallis
2. **Post-hoc tests**: Dunn's test with BH correction for pairwise modality comparisons
3. **Effect sizes**: Eta-squared for ANOVA, Hedges' g for pairwise comparisons
4. **Normality testing**: Shapiro-Wilk on each modality's score distribution
5. **Monte Carlo analysis**: Test whether rank stability distributions differ across variant categories

## Variant Categories

| Category | N | Description |
|----------|---|-------------|
| clean_base_editable | 5 | Transition mutations in optimal BE window |
| pe_preferred | 5 | Complex edits best suited for prime editing |
| hdr_required | 5 | Large insertions/deletions requiring HDR |
| mixed_feasibility | 15 | Multiple modalities potentially viable |

## Citation

If using this dataset, please cite:
- StickForStats: Bharti V, Chakraborty D. (2026). StickForStats: A Statistical Analysis Platform with Automatic Assumption Validation.
- CRISPRArchitect: Bharti V, Chakraborty D. (2026). CRISPRArchitect v3: Multi-nuclease, consequence-guided decision support for genome editing strategy design.
