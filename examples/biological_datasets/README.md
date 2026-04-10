# Biological Example Datasets for StickForStats

Five curated datasets for demonstrating StickForStats' Guardian system on biological data.

## Datasets

| # | Dataset | Source | Size | Key Statistical Tests | Guardian Demo |
|---|---------|--------|------|----------------------|---------------|
| 1 | **CRISPR Editing Strategies** | CRISPRArchitect v3 scorer | 10 variants × 4 strategies | ANOVA → Kruskal-Wallis | Normality violation, small samples |
| 2 | **Clinical Trial Survival** | Simulated (realistic parameters) | 200 patients, 2 arms | Kaplan-Meier, Cox PH, log-rank | Independence, sample size adequacy |
| 3 | **Gene Expression** | Simulated (15 true DEGs) | 100 genes × 20 samples | Per-gene t-test, BH-FDR | Normality per gene, multiple testing |
| 4 | **Epidemiological Case-Control** | Simulated (OR~2.5) | 500 subjects | Logistic regression, chi-square | Multicollinearity, outliers |
| 5 | **Dose-Response** | Simulated (4PL model) | 6 doses × 4 replicates | Nonlinear regression, EC50 | Homoscedasticity, linearity |

## Data Provenance

- **Dataset 1 (CRISPR)**: Real scores produced by CRISPRArchitect v3's `StrategyScorer` class using published scoring functions encoding biological knowledge about DSB safety, editing feasibility, and iPSC-specific risk factors.
- **Datasets 2-5**: Simulated with realistic biological parameters. Clearly labeled as simulated. Designed to demonstrate specific Guardian capabilities.

## Usage

```python
# Load CRISPR dataset
import json
with open("crispr_editing_strategies/real_scored_strategies.json") as f:
    data = json.load(f)

# Run the full vignette
python examples/vignettes/01_crispr_strategy_comparison.py
```

## Citation

Bharti V, Chakraborty D. (2026). StickForStats: A Statistical Analysis Platform with Automatic Assumption Validation.
