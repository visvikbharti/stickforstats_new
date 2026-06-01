# Audit 15 — Frontend: theme, contexts, i18n, stats components, API service layer

**Date:** 2026-05-31
**Subsystem:** `frontend/src/{theme.js, context/, i18n/, components/<stats>, services/}`

All evidence below comes from full-source reads and grep/python aggregations that
actually returned during this session. Files read in full: `theme.js`,
`context/AppThemeContext.jsx`, `context/DarkModeContext.jsx`,
`context/SettingsContext.js`, `i18n/index.js`, `i18n/config.js`,
`services/api.js`, `services/HighPrecisionStatisticalService.js`,
`components/MultiplicityCorrectionPanel/AlphaSpendingCalculator.jsx` (581 lines),
and `components/probability_distributions/ProbabilityCalculator.jsx` (1837 lines,
key calc functions). Aggregations: per-locale key counts, auth-header grep across
`services/`, gradient grep across `components/`.

> **Correction notice:** An earlier draft of this report asserted that
> `AlphaSpendingCalculator.jsx` applied a cap `Math.min(cumulativeAlpha, alpha*t*1.5)`
> to the O'Brien-Fleming spending function. **That was wrong — no such line exists
> in the file.** The OBF implementation is the standard Lan-DeMets form and is
> correct. That false finding has been removed; this version reflects the actual
> source.

---

## (a) Ground truth

### Theme core — canonical & flat (CONFIRMED); "no gradients on functional UI" is OVERSTATED
- `frontend/src/theme.js` (757 lines) is the single canonical MUI theme: flat,
  solid, gradient-free; every surface override sets `backgroundImage:'none'`
  (MuiPaper:237, MuiCard:254, MuiAppBar:285, MuiDrawer:301, MuiMenu:432,
  MuiPopover:462, MuiAutocomplete:475, MuiDialog:495, MuiAccordion:652).
- `frontend/src/context/AppThemeContext.jsx` (128 lines) delegates to `getTheme()`
  (:5,:100). Legacy `gradients`/`glassMorphism`/`neumorphism` are no-ops (solid
  colors / flat paper / `boxShadow:'none'`) at :45-84. Matches MEMORY.
- BUT 43 source files inject inline CSS gradients that bypass the theme. Some use
  theme tokens (acceptable), others hardcode hex pairs. Notably
  `components/statistical/core/ResultDisplay.jsx:175-176`
  (`'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'` / `#f093fb→#f5576c`) and
  `components/visualizations/HighPrecisionVisualization.jsx:246,433`
  (`PRECISION_COLORS.gradient`) are hardcoded decorative gradients on functional
  surfaces. `components/Guardian/GuardianWarning.jsx:221-272` uses
  theme-token gradients (`linear-gradient(90deg, ${theme.palette.error.main}, ...)`),
  still a visual gradient on the headline safety component. So the redesign claim
  "No gradients on functional UI" is component-incomplete (theme is clean; many
  components are not).

### DarkMode / Expert Mode (CONFIRMED, clean)
- `DarkModeContext.jsx` (88 lines): standard localStorage + media-query dark-mode
  provider consumed by AppThemeContext.
- `SettingsContext.js` (189 lines): Expert Mode is a proceed-gate only.
  `shouldBlockTest` (:148-155): `if (settings.expertMode) return false;` else
  `return hasViolations && hasCriticalViolations;`. Guardian still runs
  (`autoRunGuardian` default `true`, :32) and warnings still render (docstrings
  :21-22, :84-85). CONFIRMED — Expert Mode does not silently disable Guardian.

### i18n — claim CONFIRMED numerically; second module is DEAD CODE
- Active module: `i18n/index.js` (16 langs × 4 namespaces). Entry chain:
  `App.jsx:13 import './i18n'` → `i18n/index.js`; only other importer is
  `components/common/LanguageSelector.js:28` (also `'../../i18n'` = index).
  `i18n/config.js` (421 lines, second `i18n.init()` at :328, only en/es/fr/de
  inline, single `translation` namespace) has **zero importers** → dead code.
- Per-locale leaf-key counts (sum of common/statistics/navigation/education):
  **315** → ar, en, es, hi, ja, ko, zh (7); **302** → de, fr, pt (3);
  **73** → id, pl, ru, th, tr, vi (6). So **10 substantive locales + 6 stubs (73
  keys each)** — confirms MEMORY's "10 full + 6 stub"; the "~73 vs ~333" figure is
  close (actual full = 302–315).
- Orphan files `i18n/locales/en.json` (580 B), `i18n/locales/es.json` (627 B) are
  unreferenced by `index.js`.

### API service layer — TWO inconsistent auth schemes + presentational "50-digit"
- Auth-header grep across `services/`:
  - `Bearer ${token}`: `api.js:45,96`, `VisualizationService.js:16,611`.
  - `Token ${token}`: `CategoricalAnalysisService.js:55`, `CausalInferenceService.js:41`,
    `MissingDataService.js:54`, `MixedModelsService.js:41`,
    `HighPrecisionStatisticalService.js:39`, `PowerAnalysisService.js:38`,
    `RegressionAnalysisService.js:50`, `NonParametricTestsService.js:50`.
  All read the same `localStorage 'authToken'`. `api.js.stats.ttest` and
  `HighPrecisionStatisticalService.performTTest` both POST `/v1/stats/ttest/` but
  send different header formats (`Bearer` vs `Token`). At most one matches the
  backend auth class; the other 401s. This is a real bug / scheme drift.
- `api.js:11` advertises "50 decimal precision support" and `:21`
  `Decimal.set({ precision: 50 })`, but the client does NOT compute at 50 digits —
  `processHighPrecisionResponse` (:199-226) only wraps backend strings in Decimal,
  and display is `toFixed(6)` (:231). Same in HighPrecisionStatisticalService
  (`formatPrecisionNumber` :482 → `toFixed(decimals)`). Precision is entirely
  backend-sourced; the client framing is presentational. Not a correctness bug,
  but the docstring overstates the client's role.

### Client-side statistical math (VERIFIED CORRECT for the components read)
- `AlphaSpendingCalculator.jsx` computes group-sequential boundaries client-side.
  All spending functions are standard and correct:
  - O'Brien-Fleming (:32-36): `z_alpha = normalQuantile(1-alpha/2)`,
    `2*(1 - normalCDF(z_alpha/√t))` — Lan-DeMets OBF α*(t)=2−2Φ(z_{α/2}/√t). Correct.
  - Pocock (:48-51): `alpha*log(1+(e−1)·t)` — correct Lan-DeMets Pocock.
  - Hwang-Shih-DeCani (:93-98): `alpha*(1−e^{−γt})/(1−e^{−γ})`, γ=−4. Correct.
  - Kim-DeMets power (:111-113): `alpha*t^ρ`, ρ=1. Correct.
  - `normalCDF` (:118-138): Abramowitz-Stegun 7.1.26 erf approximation
    (max abs error ≈1.5e-7). Accurate.
  - `normalQuantile` (:140-174): Beasley-Springer/Moro inverse-normal. Standard.
  - Incremental α (:213) and Z-boundary `normalQuantile(1 − cumAlpha/2)` (:218),
    nominal p `2*(1 − normalCDF(|z|))` (:222): correct.
  - One real concern (medium): `futilityBoundary: -zBoundaries[i] * 0.5` (:237),
    labeled "Symmetric futility boundary at 50%". This is an arbitrary heuristic
    (futility = −½·efficacy), NOT derived from any β-spending function; it is
    presented in the table/plot as a "Futility" boundary, which is misleading.
- `ProbabilityCalculator.jsx` computes probabilities client-side (`calculateProbability`
  :319) and the formulas are correct, confirming MEMORY's "1-exp() patterns
  mathematically correct":
  - Exponential CDF `1 - Math.exp(-rate*x)` (:400), survival `exp(-rate*x)` (:402),
    interval `exp(-rate*lower) − exp(-rate*upper)` (:406). Correct.
  - Weibull CDF `1 - Math.exp(-Math.pow(x/scale, shape))` (:501). Correct.
  - Normal via `0.5*(1+erf(z))` (:474) with A-S erf (:610-624). Correct.
  - Gamma via regularized incomplete gamma P (`gammaRegularizedP` :731, series;
    `gammaRegularizedQ` :751, continued fraction). Standard Numerical-Recipes.
  - Binomial/Poisson via log-space PMF to avoid overflow (:629-697). Correct.
  - lognormal `0.5*(1+erf((ln x − μ)/(√2·σ)))` (:486-487). Correct.

---

## (b) Findings

### F1 — Inconsistent Authorization scheme across API clients (Bearer vs Token)
- **Severity:** high · **Category:** bug
- **Evidence:** `services/api.js:45` `Authorization = \`Bearer ${token}\``;
  `services/HighPrecisionStatisticalService.js:39`, `CategoricalAnalysisService.js:55`,
  `CausalInferenceService.js:41`, `MissingDataService.js:54`, `MixedModelsService.js:41`,
  `PowerAnalysisService.js:38`, `RegressionAnalysisService.js:50`,
  `NonParametricTestsService.js:50` use `\`Token ${token}\``; `VisualizationService.js:16`
  uses `Bearer`. All read `localStorage 'authToken'`; api.js and
  HighPrecisionStatisticalService both hit `/v1/stats/ttest/`.
- **Reality:** Two header conventions for one token. DRF TokenAuth expects
  `Token <key>`; SimpleJWT expects `Bearer <key>`. Only one matches the backend;
  the other family 401s. The `Token` services hard-redirect to `/login` on 401
  (HighPrecisionStatisticalService.js:50-53), so a Bearer backend would log users
  out from those screens.
- **Recommendation:** Standardize on the scheme matching the backend auth class;
  centralize a single shared axios client/interceptor instead of ~10 copies.

### F2 — "No gradients on functional UI" redesign claim is component-incomplete
- **Severity:** medium · **Category:** doc_mismatch
- **Evidence:** `components/statistical/core/ResultDisplay.jsx:175-176`
  hardcoded `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` / `#f093fb→#f5576c`;
  `components/visualizations/HighPrecisionVisualization.jsx:246,433`
  hardcoded `PRECISION_COLORS.gradient`; `components/Guardian/GuardianWarning.jsx:221-272`
  theme-token gradients on the safety warning; 43 `.js/.jsx` files total contain
  `linear/radial-gradient` (excluding node_modules).
- **Doc claim:** theme.js docstring / MEMORY: "No gradients on functional UI".
- **Reality:** Theme layer is gradient-free, but many functional components inject
  inline gradients bypassing the theme.
- **Recommendation:** Strip inline gradients from functional components (start with
  ResultDisplay and HighPrecisionVisualization, which use hardcoded hex pairs), or
  correct the documentation.

### F3 — AlphaSpendingCalculator "Futility boundary" is an arbitrary heuristic, not a β-spending result
- **Severity:** medium · **Category:** statistical_correctness
- **Evidence:** `components/MultiplicityCorrectionPanel/AlphaSpendingCalculator.jsx:237`
  `futilityBoundary: -zBoundaries[i] * 0.5 // Symmetric futility boundary at 50%`.
  Rendered as a "Futility" column/line (:550-553, :355-363, :418-419).
- **Reality:** A real futility boundary comes from a β-spending function (e.g.
  Hwang-Shih-DeCani on β) or conditional power, not from negating half the efficacy
  Z. Presenting `−0.5·z_efficacy` as "Futility" could mislead a trial designer.
  (The efficacy/α-spending math itself is correct — see ground truth.)
- **Recommendation:** Either implement a proper β-spending futility boundary or
  relabel this as an illustrative placeholder and exclude it from exports.

### F4 — Misleading "50 decimal precision" framing in client API services
- **Severity:** low · **Category:** doc_mismatch
- **Evidence:** `services/api.js:11` "50 decimal precision support", `:21`
  `Decimal.set({ precision: 50 })`; but `:199-226` only wraps backend strings and
  `:231` displays `toFixed(6)`. `HighPrecisionStatisticalService.js:482` likewise
  formats with `toFixed`.
- **Reality:** Client performs no 50-digit computation; precision is backend-sourced.
- **Recommendation:** Reword the docstring to "renders backend high-precision values".

### F5 — Dead duplicate i18n init module + orphan locale JSONs
- **Severity:** low · **Category:** quality (dead code)
- **Evidence:** `i18n/config.js` has zero importers (entry `App.jsx:13` → `index.js`);
  orphans `i18n/locales/en.json`, `i18n/locales/es.json` unreferenced by
  `index.js:18-96`.
- **Recommendation:** Delete `config.js`, `locales/en.json`, `locales/es.json`.

---

## (c) Claims-vs-reality

| Claim | Status | Evidence |
|---|---|---|
| theme.js canonical | confirmed | theme.js:748; AppThemeContext.jsx:5,100 |
| AppThemeContext delegates | confirmed | AppThemeContext.jsx:100 |
| legacy gradients/glassMorphism/neumorphism no-ops | confirmed | AppThemeContext.jsx:45-84 |
| no gradients on functional UI | refuted | ResultDisplay.jsx:175-176; HighPrecisionVisualization.jsx:246,433; GuardianWarning.jsx:221-272 (43 files total) |
| Expert Mode does not silently disable Guardian | confirmed | SettingsContext.js:148-155, :32 |
| 16 locale dirs | confirmed | `ls i18n/locales` = 16 |
| 10 full + 6 stub (~73 vs ~333 keys) | confirmed | 7×315, 3×302, 6×73 |
| i18n single source (index.js) | partial | index.js active; config.js dead duplicate |
| API client auth correct/consistent | refuted | api.js:45 Bearer vs 8 services Token |
| client "50 decimal precision" | partial/misleading | api.js:11,21 vs :231 toFixed(6) |
| AlphaSpending OBF/Pocock/HSD/KD correct | confirmed | :32-113; normalCDF :118-138 (A-S 7.1.26); normalQuantile :140-174 |
| AlphaSpending futility boundary correct | refuted | :237 −0.5·z_efficacy, arbitrary |
| ProbabilityCalculator 1-exp() / CDFs correct | confirmed | exp :400, Weibull :501, normal/erf :474/:610, gamma :731/:751 |

---

## (d) Prioritized recommendations toward "world-class"
1. **Fix auth-scheme drift (F1, high):** one shared axios client, one Authorization
   scheme matching the backend auth class.
2. **Fix/relabel the AlphaSpending futility boundary (F3):** implement β-spending or
   mark it illustrative; the efficacy α-spending math is already correct.
3. **Reconcile the "no gradients" claim (F2):** strip hardcoded gradients from
   ResultDisplay/HighPrecisionVisualization or correct the docs.
4. **Delete dead i18n duplicate + orphans (F5).**
5. **Reword "50 decimal precision" client docstring (F4).**

The theme core, dark-mode, Expert-Mode/Guardian-gate, the i18n completeness claim,
and the client-side probability/alpha-spending *efficacy* math are all clean and
match their docs. The actionable issues are the two-scheme auth bug, the
component-level gradient leakage vs the redesign claim, and the misleading futility
boundary.
