# Additional file 1 — Supplementary Information

**StickForStats: Automated Statistical Assumption Validation for Reproducible Computational Biology**

This file collects supporting material for the main text. All values are reproducible
from the open-source repository (https://github.com/visvikbharti/stickforstats_new);
the scripts referenced below are under `paper/replication/` and `backend/`.

---

## S1. Guardian validator specifications

The Guardian system registers eight validators (`backend/core/guardian/guardian_core.py`,
`self.validators`). Each test type maps to the subset of assumptions relevant to it
(`self.test_requirements`); the validators run in parallel and a composite confidence
score is computed before the primary test executes.

| # | Validator (registry key) | Assumption checked | Primary method |
|---|---|---|---|
| 1 | `normality` (NormalityValidator) | Normality of the distribution / residuals | Shapiro–Wilk [16], Anderson–Darling [17] |
| 2 | `variance_homogeneity` (VarianceHomogeneityValidator) | Equal variances across groups | Levene [18], Brown–Forsythe [19] |
| 3 | `independence` (IndependenceValidator) | Independence of observations | Lag-1 autocorrelation / Durbin–Watson [20] |
| 4 | `outliers` (OutlierDetector) | Absence of influential outliers | Grubbs [21] / z-score screen |
| 5 | `sample_size` (SampleSizeValidator) | Adequate n for the test | Power-based minimum-n heuristics |
| 6 | `modality` (ModalityDetector) | Unimodality | Kernel-density / dip screen |
| 7 | `linearity` (LinearityValidator) | Linear relationship (correlation/regression) | Runs test about the median / quadratic-term check |
| 8 | `homoscedasticity` (HomoscedasticityValidator) | Constant residual variance (regression) | |residual|–fitted association / Breusch–Pagan [24] |

**Test-type → required validators** (excerpt from `self.test_requirements`):

| Test | Required validators |
|---|---|
| `t_test` | normality, variance_homogeneity, independence, outliers |
| `anova` | normality, variance_homogeneity, independence |
| `pearson` | normality, linearity, outliers |
| `regression` | normality, independence, homoscedasticity, linearity |

Each validator returns a severity (PASS / WARNING / CRITICAL) and reports the actual test
statistic and p-value rather than a bare classification, so the user sees the evidence
behind every decision.

---

## S2. Programmatic access — code examples

The Python SDK (`pip install stickforstats`) is a thin client over the REST API; the CLI
adds the `sfs` command (`pip install stickforstats[cli]`). Full reference: `sdk/python/README.md`.

```python
from stickforstats import StickForStats

client = StickForStats(base_url="http://localhost:8000/api/v1", api_key="your-api-key")

# t-test with Guardian protection
res = client.stats.ttest(
    data={"control": [23, 25, 28, 22, 27], "treatment": [30, 33, 29, 35, 31]}, alpha=0.05
)
print(res.t_statistic, res.p_value)
if res.guardian and not res.guardian.passed:
    print("Guardian violations:", res.guardian.violations)

# One-way ANOVA
client.stats.anova(data={"a": [4.1, 3.9, 4.5], "b": [5.2, 5.5, 5.1], "c": [6.0, 6.3, 5.8]})

# Correlation (Guardian flags ordinal data and recommends Spearman)
client.stats.correlation(x=[1, 2, 3, 4, 5], y=[2, 4, 5, 4, 5], method="pearson")

# Autonomous cascade — auto-fallback to a nonparametric test on assumption violation
cascade = client.autonomous.cascade(data={"control": [1, 1, 2], "treatment": [10, 50, 100]}, test="ttest")
if cascade.fallback_used:
    print("Guardian redirected to:", cascade.executed_test)

# Manuscript review
report = client.manuscript.analyze("paper.pdf", field="psychology", alpha=0.05)
```

Command line:

```bash
sfs config --api-key YOUR_KEY --base-url http://localhost:8000/api/v1
sfs analyze --file data.csv --test ttest --alpha 0.05
sfs manuscript --file paper.pdf --field psychology
```

---

## S3. Additional validation on standard R datasets

To complement the three main case studies, Guardian was run on three classic R datasets
(reproducible via `paper/replication/additional_real_data_analysis.py`; pure SciPy, no
backend required).

**Dataset 1 — `mtcars` (regression, n = 32): `mpg ~ weight`.**
OLS slope = −5.344, intercept = 37.285, R² = 0.7528, p = 1.29 × 10⁻¹⁰.
Guardian: residual normality PASS (Shapiro–Wilk W = 0.945, p = 0.104); homoscedasticity
PASS (|residual|–fitted r = −0.018, p = 0.922); linearity WARNING (11 runs vs 17 expected);
outliers WARNING (3 observations with |z| > 2). The regression is valid but Guardian flags
mild nonlinearity and high-leverage cars for inspection.

**Dataset 2 — `ToothGrowth` (two-sample t-test, n = 30 per group): OJ vs VC.**
Means 20.66 (OJ) vs 16.96 (VC); independent t = 1.915, p = 0.0604; Cohen's d = 0.495 (small).
Guardian: OJ normality WARNING (W = 0.918, p = 0.024), VC PASS (W = 0.966, p = 0.429);
variance homogeneity PASS (Levene F = 1.214, p = 0.275). Guardian surfaces the OJ-group
non-normality that an unchecked t-test would ignore at a borderline p-value.

**Dataset 3 — `PlantGrowth` (one-way ANOVA, n = 10 per group).**
Means: control 5.032, treatment-1 4.661, treatment-2 5.526; F = 4.846, p = 0.0159.
Guardian: all three groups normality PASS (W = 0.957/0.930/0.941, all p > 0.45); variance
homogeneity PASS (Levene F = 1.119, p = 0.341). Assumptions hold, so the parametric ANOVA
is reported with full confidence.

---

## S4. Test-suite coverage (Guardian)

Counts are reproducible by running the suites under `backend/` and `frontend/`
(see the project's CI configuration).

| Suite | File | Tests |
|---|---|---|
| Guardian integration | `backend/core/guardian/tests/test_guardian_integration.py` | 22 |
| Guardian middleware | `backend/core/guardian/tests/test_guardian_middleware.py` | 16 |
| Dedicated validator units | `backend/tests/test_guardian_validators.py` | 46 |
| Guardian math-correctness | `backend/core/tests/test_guardian_math_fixes.py` | 12 |
| Frontend — Guardian components | `frontend/src/components/Guardian/__tests__/GuardianComponents.test.jsx` | 25 |
| Frontend — `useGuardianReport` hook | `frontend/src/hooks/__tests__/useGuardianReport.test.js` | 30 |

The Guardian-specific tests above sit within the platform's full suite (≈860 backend and
≈654 frontend tests) run on every commit via GitHub Actions.

---

## S5. Performance benchmarks

End-to-end API latency with and without the Guardian assumption-validation pipeline,
measured on a local Django development server (Apple M-series, macOS, Python 3.x;
`paper/replication/benchmark_api.py`, raw data in `benchmark_results.csv`). Each cell is
the mean ± SD over 100 successive requests after 10 warm-up requests. *standard* disables
the assumption pipeline (`check_assumptions = false`); *Guardian* enables all eight
validators (`check_assumptions = true`).

| Endpoint | standard (ms) | Guardian (ms) |
|---|---|---|
| t-test (independent) | 3.58 ± 0.93 | 3.59 ± 0.80 |
| ANOVA (one-way) | 4.01 ± 0.56 | 3.91 ± 1.01 |
| Pearson correlation | 4.15 ± 1.03 | 5.16 ± 0.50 |
| Linear regression | 3.99 ± 0.53 | 3.91 ± 1.12 |

The Guardian pipeline adds at most ~1 ms of overhead (and is within run-to-run noise for
most endpoints), confirming that default-on assumption validation is not a performance
barrier for interactive use.
