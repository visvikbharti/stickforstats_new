# Archived: Pedagogical seed-search scripts

**Status:** Archived 2026-05-06.
**Why this directory exists:** Transparency.

## Background

During an earlier draft of the PLOS Comp Bio manuscript (commits prior to 2026-05-06), Case Study 3 used a 12-row simulated meta-analysis dataset whose seed was selected by sweeping random seeds and keeping the one whose Egger's-test p-value landed in a "pedagogically interesting" range (p ≈ 0.024). This was found to be a methodologically inappropriate way to construct an example for a publication-bias detection demonstration — a reviewer reading the replication directory could reasonably interpret it as cherry-picking.

The two scripts in this directory implement that seed search:

- `find_optimal_meta_data.py` — sweeps 1,000 seeds keeping the one closest to a target Egger p-value
- `create_correct_meta_analysis_data.py` — sweeps 100 seeds filtered by I² and direction constraints

## What replaced them

Case Study 3 in the current PLOS Comp Bio submission uses a real published meta-analysis dataset:

- **Dataset:** 16 RCTs of intravenous magnesium for prevention of mortality after acute myocardial infarction
- **Source:** Egger et al. 1997 BMJ; Sterne & Egger 2001 J Clin Epi
- **R package:** `metafor::dat.egger2001` (Viechtbauer 2010)
- **Cross-validated** against R `metafor` 4.8.0 and Python (scipy + custom DerSimonian-Laird implementation) to 4+ decimal places

See:
- `paper/replication/data/iv_magnesium_meta_analysis.csv` — published dataset
- `paper/replication/verify_meta_analysis_real.py` — Python verification script (no R dependency)
- `paper/plos_compbio/figures/generate_figures.py` — figure generation reads the CSV directly

## Why we keep these scripts in the repo

We could have deleted them. We chose to archive them with this explanatory README instead because:

1. The git history would still record their existence; suppressing them would be deception, not honesty.
2. Other authors learning to construct pedagogical statistical examples should be able to see the failure mode and the correction.
3. The audit document (`docs/CRITICAL_REVIEW_2026-05-06.md`) references them by name; the URLs need to keep working.

## Do NOT cite or use these scripts in any submission

These scripts are NOT part of the published replication package. The Case Study 3 numbers in the manuscript come from `paper/replication/verify_meta_analysis_real.py` operating on the real published `iv_magnesium_meta_analysis.csv`.
