# Audit 03 — High-Precision Statistics Core

**Auditor:** automated skeptical code audit
**Date:** 2026-05-31
**Repo root:** /Users/vishalbharti/StickForStats_v1.0_Production
**Subsystem:** backend/core high-precision statistics + effect sizes + multiplicity + power + robust + missing-data

> METHOD NOTE: All code below was verified by direct Read of source and quoted
> with real line numbers; every one of the 12 scope files was confirmed to
> AST-parse cleanly (no SyntaxError). Some very large modules (hp_regression
> 2364L, hp_categorical 1201L, hp_power_analysis 1032L) were not read line-by-line
> end to end; their headers, def maps, and the specific methods quoted here were
> verified. Where I am not certain I say so.

---

## (a) Ground truth — what this subsystem really is

A set of statistics modules that carry intermediate computation in Python
`decimal.Decimal` (precision 50) and use `mpmath` for special functions
(`sqrt`, `betainc`, `atanh`, `tanh`). It is genuinely extended-precision for the
statistics it computes by hand, but:

- Every **p-value** drops to double precision (it is computed by `float()`-casting
  the Decimal statistic into a SciPy/mpmath distribution function and re-wrapping
  the float result as Decimal).
- Several "comprehensive" methods are **empty stubs that return `None`** while the
  module advertises them as implemented.
- `effect_sizes.py`, `multiplicity.py`, `power_analysis.py`,
  `robust_estimators.py`, `missing_data_handler.py` are **float-based** (no
  Decimal); they are reasonable implementations, often wrapping SciPy/statsmodels.

The headline calculator (`high_precision_calculator.py`) and the one-way ANOVA,
Pearson/Spearman/Kendall, and Mann-Whitney/Wilcoxon/Kruskal-Wallis paths are
real and formula-correct. The non-headline ANOVA variants are not.

---

## (b) Findings

### F-1 [high] Two-way / repeated-measures / MANOVA are EMPTY STUBS that return `None` — CONFIRMED
`hp_anova_comprehensive.py:312-367`. All three method bodies consist solely of a
docstring plus a comment, with no statements and no `return`:
```python
def two_way_anova(self, data, factor1, factor2, dependent, interaction=True) -> AnovaResult:
    """ ... """
    # Implementation for two-way ANOVA
    # This is complex and would include:
    # - Main effects for both factors ...

def repeated_measures_anova(self, data, subject_factor=None) -> AnovaResult:
    """ ... """
    # Implementation would include:
    # - Mauchly's test for sphericity ...

def manova(self, data, factors, dependents) -> ManovaResult:
    """ ... """
    # Implementation would include:
    # - Wilks' Lambda ...
```
Each is annotated `-> AnovaResult` / `-> ManovaResult` but falls through to
`return None`. The module header (`:8-16`) claims it "implements ALL ANOVA
variants with high precision: One-way / Two-way / Three-way / Repeated Measures /
Mixed / MANOVA / ANCOVA." Three of those advertised variants are non-functional
and will return `None` (callers then crash on attribute access, or silently use
`None`). This is a stub-presented-as-real defect on a statistics product.
**Recommendation:** implement them, or raise `NotImplementedError`, and correct
the module docstring. Three-way/Mixed/ANCOVA appear to have no methods at all.

### F-2 [high] Edge-case two-sample t-test fabricates statistics and p-values — CONFIRMED
`high_precision_calculator.py:259-265, 271-277`:
```python
if mean_diff > 0:
    t_stat = Decimal("999.999")   # Capped positive value
else:
    t_stat = Decimal("-999.999")  # Capped negative value
p_value = Decimal("1e-50")
...
if abs(t_stat) > Decimal("1e10"):
    t_stat = Decimal("999999.999")  # / -999999.999
```
When SE < 1e-45 or |t| > 1e10, invented round-number statistics and a canned
`1e-50` p-value are placed in the result fields. A user can receive
`t = 999.999` unrelated to their data magnitude. `extreme_precision=True` is
flagged (partial mitigation), but the numeric field itself is fabricated.
**Recommendation:** return `inf`/`None` + status; never put a made-up number in
`t_statistic`/`p_value`.

### F-3 [medium] "50 decimal place accuracy for all calculations" overstated — p-values are double precision — CONFIRMED
p-values cast through `float()` before the distribution function:
- one-sample t `high_precision_calculator.py:171-173`
- two-sample t `:281-286`
- ANOVA F `:370-390` and `hp_anova_comprehensive.py:685-707` (`_calculate_f_p_value`)
- Pearson r `:464-469`
- correlation comprehensive `hp_correlation_comprehensive.py:390, 451, 503`
- Mann-Whitney normal-approx `hp_nonparametric_comprehensive.py:302-306`
The class docstring itself even says "ensure 15+ decimal places accuracy"
(`high_precision_calculator.py:9, 31`), directly contradicting the 50-digit
marketing in MEMORY. The statistic carries Decimal precision; the p-value does
not.

### F-4 [medium] `_calculate_power` for ANOVA returns a made-up heuristic, not real power — CONFIRMED
`hp_anova_comprehensive.py:728-737`:
```python
def _calculate_power(self, f_stat, df1, df2, alpha=Decimal("0.05")) -> Decimal:
    # This requires non-central F-distribution
    # Simplified approximation for now
    if f_stat > self._get_f_critical(alpha, df1, df2):
        effect_size = Decimal(str(mpmath.sqrt(float(f_stat * df1 / (df1 + df2)))))
        power = Decimal("0.8") + effect_size * Decimal("0.1")   # <-- invented
        return min(power, Decimal("0.99"))
    return Decimal("0.5")                                       # <-- invented
```
`observed_power` is attached to every one-way `AnovaResult` (`:308`) but is a
fabricated number (`0.8 + 0.1·effect_size`, or a flat `0.5`), NOT a noncentral-F
power computation. This is a wrong statistic shipped in a result object.
**Recommendation:** compute true power via `scipy.stats.ncf`, or drop the field.

### F-5 [low] Duplicate, weaker BH/Holm correctors inside ANOVA module — CONFIRMED
`hp_anova_comprehensive.py:619-645` (`_benjamini_hochberg`, `_holm_bonferroni`)
adjust p-values but do NOT enforce monotonicity (unlike the correct
`multiplicity.py` versions at `:473-477` / `:297-301`). Without the reverse-cumulative
min, BH "adjusted p-values" here can be non-monotone (a smaller raw p can get a
larger adjusted p than a larger raw p). They are used by post-hoc correction
(`_apply_correction` `:603-617`). **Recommendation:** delegate to
`MultiplicityCorrector` rather than maintaining a second, weaker copy.

### F-6 [info] KS-test ddof is exactly as MEMORY claims — CONFIRMED (positive)
`hp_correlation_comprehensive.py:161`:
```python
stat, p_value = stats.kstest(data, "norm", args=(np.mean(data), np.std(data)))
```
`np.std(data)` uses ddof=0 (population SD), matching MEMORY's known-intentional
note. Caveat (not the ddof): KS against parameters estimated from the same data
is anticonservative; Lilliefors is the rigorous correction — minor.

### F-7 [info] high_precision_calculator + one-way ANOVA formulas correct — CONFIRMED (positive)
- ANOVA SSB/SSW/df/F `high_precision_calculator.py:341-367`,
  `hp_anova_comprehensive.py:224-247` — correct.
- Pearson r deviation-score, clamped [-1,1] `:432-454` — correct.
- one-sample t two-tailed p `I_x(df/2,1/2), x=df/(df+t²)` `:170-173` — correct
  (an earlier draft wrongly called this one-tailed; that was my error).
- Welch-Satterthwaite df `:240-242`; pooled var `:222` — correct.
- Mann-Whitney U with tie correction `hp_nonparametric_comprehensive.py:270-309`,
  rank-biserial effect size `:1026` — correct.

### F-8 [info] effect_sizes.py formulas standard and correct — CONFIRMED (positive)
Cohen d (`:214-225`), Hedges factor `1-3/(4·df-1)` (`:230`), eta²/partial
(`:357,360`), omega² regular (`:431-432`) & partial (`:418-426`), epsilon²
(`:468`), Cramér V w/ bias correction (`:604-610`), phi (`:647`), Cohen w
(`:674`), Cohen f² (`:710`), Pearson SE + Fisher-z CI (`:515,518`), Cohen-1988
benchmarks (`:124-149`) — all match standard definitions. CIs use noncentral
t/F (`:736,780`). One small wrinkle: the noncentral-F CI helper (`:780-793`) is a
normal-approximation to the F noncentrality, labeled "simplified version here" —
acceptable but not exact.

### F-9 [info] multiplicity.py corrections correct — CONFIRMED (positive)
Bonferroni (`:264`), Holm step-down + monotonicity (`:297-301`), Hochberg
step-up (`:344-348`), Šidák (`:387`), Holm-Šidák (`:424`), BH + reverse
monotonicity + threshold search (`:473-485`), BY = BH with α/Σ(1/i) (`:533-536`),
two-stage BKY (`:558-571`), Storey q-value (`:597-679`) — all verified by direct
read. Docstring claims R `p.adjust()`/statsmodels validation; formulas match
(verification artifact itself not located).

### F-10 [info] MEMORY misattributes precision mechanism to mpmath — CONFIRMED
Carrier is `decimal.Decimal` (`getcontext().prec = 50`, `high_precision_calculator.py:22`),
not mpmath `mpf` (`mpf(`=0 in the file). mpmath is special-functions only.

### F-11 [low] robust_estimators / missing_data have incomplete paths but are mostly real — CONFIRMED
Huber M-estimator (`robust_estimators.py:271-319`) is a real IRLS implementation
with asymptotic SE; trimmed/winsorized variance use ddof=1 (`:150,168,221`);
median SE `1.253·s/√n` (`:475`) correct. EM imputation validation harness
(`missing_data_handler.py:350-393`) is real. Earlier-noted "placeholder"/"TODO"
comments should be verified in their enclosing functions but the surrounding code
is substantive, not stubbed.

---

## (c) Claims-vs-reality table

| claim | status | evidence |
|---|---|---|
| mpmath, 50 digits | partial | carrier is decimal.Decimal prec=50 (hpc.py:22); mpf=0 |
| "50 dp accuracy for ALL calculations" | refuted | p-values via float() at hpc.py:171,281-286,370; anova.py:687; corr.py:390 |
| class itself claims 15+ dp | confirmed | hpc.py:9,31 contradicts the 50-dp marketing |
| implements ALL ANOVA variants (2-way/RM/MANOVA) | refuted | anova.py:312-367 are docstring-only stubs returning None |
| one-way ANOVA df/SS/F correct | confirmed | hpc.py:341-390; anova.py:224-247 |
| observed power on ANOVA result is real | refuted | anova.py:728-737 returns 0.8+0.1·es or flat 0.5 |
| Pearson/Welch/Mann-Whitney correct | confirmed | hpc.py:432-454,240-242; nonparam.py:270-309 |
| KS np.std() ddof=0 (MLE pop SD) "correct" | confirmed | corr.py:161 np.std(data) no ddof |
| effect sizes match standard defs | confirmed | effect_sizes.py:214-710 |
| Bonferroni/Holm/BH/BY/Hochberg/Šidák correct | confirmed | multiplicity.py:254-679 |
| ANOVA-module BH/Holm correctors correct | partial | anova.py:619-645 lack monotonicity enforcement |
| edge-case t-stats are real | refuted | hpc.py:259-277 hardcoded 999.999/1e-50 |
| all 12 modules import/compile | confirmed | ast.parse OK for all 12 (no SyntaxError) |

---

## (d) Prioritized recommendations toward world-class

1. **(F-1)** Implement or `raise NotImplementedError` for two_way_anova /
   repeated_measures_anova / manova (and add three-way / mixed / ANCOVA), then
   fix the "implements ALL ANOVA variants" header. Returning `None` from a
   typed-`AnovaResult` method on a statistics product is the worst issue here.
2. **(F-2)** Remove fabricated edge-case statistics (999.999 / 999999.999 / 1e-50);
   return inf/None + status flag.
3. **(F-4)** Replace the made-up ANOVA `observed_power` with a real
   noncentral-F computation (scipy.stats.ncf) or remove the field.
4. **(F-3, F-10)** Fix docs/MEMORY: precision carrier is decimal.Decimal;
   p-values are double precision; reconcile the "15+ dp" docstring with the
   "50 dp" marketing. For true 50-digit p-values, feed mpmath mpf args to betainc.
5. **(F-5)** Delete the duplicate BH/Holm in the ANOVA module; delegate to
   MultiplicityCorrector (monotonicity-correct).
6. **(F-6)** Consider Lilliefors correction for KS-against-estimated-normal.
7. **Follow-up audit** still owed for full line-by-line of hp_regression (2364 L),
   hp_categorical (1201 L), hp_power_analysis (1032 L), and the remaining bodies
   of power_analysis / robust_estimators / missing_data_handler.
