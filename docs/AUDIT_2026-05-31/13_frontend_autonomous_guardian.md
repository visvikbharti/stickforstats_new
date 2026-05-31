# Audit 13 — Frontend: Autonomous + Guardian UX

Date: 2026-05-31
Auditor: senior auditor (skeptical, code-first)
Scope: `frontend/src/components/autonomous/*`, `frontend/src/components/Guardian/*`, `frontend/src/pages/SmartAnalysisPage.jsx`, plus the service layer they call and the backend response shapes they consume.

---

## (a) Ground truth — what this subsystem really is and does

There are **two largely independent UI surfaces** that both touch "Guardian":

1. **Autonomous Intelligence Layer** (`pages/SmartAnalysisPage.jsx` + `components/autonomous/*`).
   - `SmartUpload` (744 LOC) drag-and-drops a CSV/Excel file and calls `profileData()` from `services/AutonomousService` → backend `POST /api/v1/autonomous/profile/` (`SmartProfileView`, `autonomous_views.py:76`). Renders a Data Health card, variable table, inferred questions, preview. **Real API call, not mock.**
   - `NaturalLanguageBar` (446 LOC) calls `queryAnalysis()` → backend `POST /api/v1/autonomous/query/` (`AutonomousQueryView`). **Real API call.**
   - `PlainEnglishResults` (811 LOC) renders the `query` response: significance banner, 3-tab output (Plain English / Researcher / APA), effect-size gauge, cascade-path Stepper, a self-contained `GuardianConfidenceScore` circular gauge, warnings, next-steps, "Why this test?" accordion.
   - `GuidedWizard` (789 LOC) is a 6-step wizard whose **"Run Analysis" is wired to a no-op** in the page.
   - This surface **does NOT import any `components/Guardian/*` component.** It has its own inline confidence widget.

2. **Guardian display components** (`components/Guardian/*`): `GuardianWarning` (552 LOC), `GuardianReportDisplay` (366), `GuardianBadge` (115), `ConfidenceGauge` (162), `ViolationCard` (208), plus `TransformationWizard`. These are consumed by the **classic statistics modules** (`modules/TTestRealBackend.jsx`, `ANOVARealBackend.jsx`, `CorrelationRegressionModuleReal.jsx`, `NonParametricTestsReal.jsx`, `HypothesisTestingModuleReal.jsx`, `MixedModelsModule.jsx`, `CausalInferenceModule.jsx`), NOT by the autonomous flow.

Both surfaces consume backend Guardian output. The backend `GuardianReport` dataclass (`guardian_core.py:160-174`) exposes `test_type, violations, can_proceed, alternative_tests, confidence_score (0..1), visual_evidence, ...`. The autonomous `query` endpoint also returns `cascade_result.confidence_score` (0..1, `autonomous_query_handler.py:233`) and an embedded `guardian_report` (`:252`).

Bottom line: the headline data flow is **real** (components call real endpoints and render real backend fields). The defects are (i) a dead Guided-Wizard path, (ii) a unit-scale mismatch hazard in the shared Guardian components, (iii) cosmetic/"golden ratio" theatre, and (iv) the autonomous results screen can render a green "significant" banner without ever surfacing a blocking Guardian violation.

---

## (b) Findings

### F1 — GuidedWizard "Run Analysis" is wired to an empty no-op; the wizard produces fabricated "Analysis Complete" UI (HIGH, stub_vs_claim)
`SmartAnalysisPage.jsx:107-110`:
```js
const handleWizardRunAnalysis = useCallback((query, file) => {
  // This will be handled by NaturalLanguageBar indirectly
  // For now, set state so the query result flows through
}, []);
```
This is passed as `onRunAnalysis` to `GuidedWizard` (`SmartAnalysisPage.jsx:214`). In `GuidedWizard.handleRunAnalysis` (`GuidedWizard.jsx:244-277`) the return value `result = await onRunAnalysis(...)` is `undefined`, yet the code then `setAnalysisResult(result)` and advances to the Results step, which shows an `Alert severity="success"` titled **"Analysis Complete"** (`GuidedWizard.jsx:616-621`) and a summary block — even though **no statistical test was run** and `analysisResult` is `undefined`/falsy. The "Guided Wizard" tab is advertised in the hero/tabs ("Step-by-step wizard for beginners", `SmartAnalysisPage.jsx:9,145`) but cannot actually compute anything.
Recommendation: wire `onRunAnalysis` to the same `queryAnalysis()` pipeline used by `NaturalLanguageBar`, or hide the Guided tab until implemented.

### F2 — GuidedWizard fakes Guardian pre-check progress with a timer (MEDIUM, stub_vs_claim)
`GuidedWizard.jsx:251-260`:
```js
// Simulate Guardian pre-check progress
const progressInterval = setInterval(() => {
  setGuardianProgress((prev) => { if (prev >= 90) {...} return prev + 10; });
}, 300);
```
The progress bar labeled "Running Guardian checks and analysis..." (`:582`) is a cosmetic animation unrelated to any real Guardian computation. Combined with F1, the entire wizard "analysis" is theatre.
Recommendation: drive progress from real pipeline stages, or remove the simulated bar.

### F3 — Unit-scale mismatch hazard between backend confidence (0..1) and shared Guardian components (0..100) (HIGH, bug)
Backend `confidence_score` is a fraction in [0,1] (`guardian_core.py:662`: `confidence = max(0, 1 - total_penalty/(max_possible_penalty*1.2))`; `autonomous_query_handler.py:233` passes it straight through).
- The autonomous widget handles this correctly: `GuardianConfidenceScore` does `percentage = Math.round(score * 100)` (`PlainEnglishResults.jsx:470`) and the page reads `cascadeResult?.confidence_score` (`:746`).
- But the **shared Guardian components assume a 0..100 input**:
  - `GuardianBadge`: `label={\`${confidenceScore.toFixed(0)}%\`}` (`GuardianBadge.jsx:99`), tooltip `Confidence: {confidenceScore.toFixed(0)}%` (`:84`).
  - `ConfidenceGauge`: thresholds `score >= 80 / >= 60` and `value={score}` on a 0..100 `LinearProgress` (`ConfidenceGauge.jsx:24-27,45,86`).
  - `GuardianReportDisplay`: `confidenceScore.toFixed(0)}%`, thresholds `>= 80 / >= 60` (`GuardianReportDisplay.jsx:207-225`).
  If any caller forwards the raw backend `confidence_score` (0..1) to these without `*100`, the gauge renders ~0–1% and the color logic always lands in the "error/red" bucket — i.e., a faithful-looking but wrong confidence. The contract is undocumented (no PropTypes), so this is a live footgun across the 7 classic modules that use them.
Recommendation: normalize at a single boundary (service layer) or add explicit PropTypes/JSDoc stating the expected 0..100 scale, and assert/clamp.

### F4 — Autonomous results screen can show a green "Statistically Significant" banner with no Guardian blocking surfaced (MEDIUM, quality / could mislead)
`PlainEnglishResults` renders `SignificanceBanner` from `translation.is_significant` (`PlainEnglishResults.jsx:104-118, 745, 753`) at the very top, before/independent of the `GuardianConfidenceScore` (`:797`) and `WarningsSection` (`:800`). There is **no `can_proceed` gate** in this component: even if the backend Guardian found critical violations (`can_proceed=false`), the autonomous results screen still prints a filled green "Statistically Significant Result" banner. The backend `guardian_report.can_proceed` and `violations` (available at `cascade_result.guardian_report`) are **not consumed** by `PlainEnglishResults` at all (no reference to `can_proceed`, `violations`, or `guardian_report` in the file). The mitigation is that the cascade engine *substitutes* a passing test, so the displayed test is one that passed — but the UI never tells the user a violation occurred unless `warnings` happens to mention it, and it never blocks.
Recommendation: surface `guardian_report.violations`/`can_proceed` in the autonomous results (reuse `GuardianReportDisplay`), and tone down the banner when assumptions were violated/substituted.

### F5 — "Golden ratio (φ)" confidence decoration is numerology, not statistics (MEDIUM, quality / could mislead)
`GuardianWarning.jsx:29-30, 150-156, 220-242`:
```js
const PHI = 1.618033988749;
const formatConfidence = (score) => {
  const percentage = (score * 100).toFixed(1);
  const phiRatio = (score / (1 / PHI)).toFixed(2);   // = score * 1.618...
  return { percentage, phiRatio };
};
```
A "φ-ratio" chip and φ-keyed gradient thresholds (`> 0.618`, `> 0.382`) are presented next to a scientific confidence score. `score / (1/φ)` is just `score·φ` — a meaningless transform of the confidence with no statistical interpretation, displayed in a tooltip on a research tool. This invites misinterpretation.
Recommendation: remove the φ chip/tooltip; if color bands are wanted, base them on documented confidence thresholds, not φ.

### F6 — APA-format text is assembled client-side and can emit statistically loose/garbled strings (MEDIUM, statistical_correctness)
`PlainEnglishResults.jsx:211-241` builds APA text by hand:
```js
const dfStr = r.df != null ? `(${r.df})` : '';
parts.push(`The result was statistically ${r.p_value < 0.05 ? 'significant' : 'non-significant'}, ${r.test_name} ${dfStr} = ${stat}, p ${pStr}.`);
```
Issues: (i) hard-codes α = 0.05 for the significant/non-significant word regardless of the α the user actually ran with (the backend `translate()` takes `alpha`, but this client text ignores it); (ii) prints `test_name (df) = stat` which is wrong for tests whose statistic symbol is not the test name (e.g. ANOVA should be `F(df1, df2)`, correlation `r`, chi-square `χ²(df)`); the generic string can produce e.g. "One-Way ANOVA (…) = 4.20" instead of "F(2, 57) = 4.20". The backend translator already produces proper APA strings per-test (`plain_language_translator.py` has `apa_format` branches) — the client re-deriving APA from raw numbers is both duplicative and lossy.
Recommendation: render the backend `translation` APA string instead of re-building it on the client; if client assembly stays, thread `alpha` through and use per-test statistic symbols.

### F7 — `formatPValue` leading-zero strip is fragile for p ≥ 1 / NaN (LOW, bug)
`PlainEnglishResults.jsx:701-705`:
```js
function formatPValue(p) {
  if (p == null) return 'N/A';
  if (p < 0.001) return '< .001';
  return `= ${p.toFixed(3).replace(/^0/, '')}`;
}
```
For a (rare but possible) `p = 1` this yields `= 1.000` (fine), but for any value like `0.05` → `= .050` (APA-correct). However `replace(/^0/, '')` would also strip a leading 0 from a hypothetical `0` differently and does nothing for `NaN` (`NaN.toFixed` → "NaN"). Minor robustness gap; APA also generally wants p reported to 2–3 decimals — acceptable, but no clamping/NaN guard.
Recommendation: guard `Number.isFinite(p)`; clamp to [0,1].

### F8 — No PropTypes / TypeScript on any component; the documented 3-callback GuardianWarning contract is unenforced (LOW, quality)
`GuardianWarning` declares `onProceed`, `onSelectAlternative`, `onViewEvidence` as props (`GuardianWarning.jsx:34-36`) and calls them unguarded: `onClick={onProceed}` (`:254`), `onClick={() => onSelectAlternative(test)}` (`:420`), `onClick={onViewEvidence}` (`:297`) and `onViewEvidence(selectedViolation.visual_evidence)` (`:513`). If a caller omits any of these, clicking the button throws `TypeError: onProceed is not a function`. The MEMORY/doc claim "requires 3 callback props" is true as a runtime requirement, but it is **not enforced** (no defaults, no PropTypes). Several callers (e.g. `EffectSizeEstimator.jsx`, calculators) import GuardianWarning; whether each supplies all three is not type-checked.
Recommendation: add PropTypes with `isRequired`, or default the callbacks to no-ops, to make the contract safe.

### F9 — Backend autonomous endpoints are `AllowAny` (MEDIUM, security)
All autonomous views are unauthenticated: `permission_classes = [AllowAny]` at `autonomous_views.py:89, 179, 274, 350, 392` and `@permission_classes([AllowAny])` at `:410-411`. These endpoints accept arbitrary uploaded CSV/Excel and run pandas/scipy server-side. This is an availability/DoS and resource-abuse surface (unbounded file parsing, no auth, no rate limit visible here). Not a frontend bug per se, but the autonomous UX depends on these open endpoints.
Recommendation: confirm gateway-level auth/rate-limiting, or require auth + size caps; out of frontend scope but flagged because the UX advertises "upload your data".

### F10 — Effect-size gauge normalization caps at 1.0 and mislabels bands for non-d effect sizes (LOW/MEDIUM, statistical_correctness)
`PlainEnglishResults.jsx:303-318`: `normalizedValue = Math.min(Math.abs(effectSize), 1.0) * 100;` then bands `<25 negligible / <50 small / <75 medium / else large`. This treats every effect size on a single [0,1] scale with Cohen's-d-style cutoffs, but `effect_size` can be Cohen's d (unbounded, "large" ≈ 0.8), r/ρ/τ (|·|≤1, "large" ≈ 0.5), η²/ε² (0..1, "large" ≈ 0.14), Cramér's V, odds ratios, etc. A d=2.0 and an η²=1.0 both peg the bar at "Large 100%", and an η²=0.30 (very large) shows in the "info/medium" band. The qualitative interpretation text comes from the backend (`effect_size_interpretation`), which is correct per-test; but the **gauge color/position is statistically meaningless across effect-size families**.
Recommendation: scale/threshold the gauge by `effect_size_name`, or drop the numeric bar in favor of the backend's categorical interpretation.

---

## (c) Claims-vs-reality table

| Claim (MEMORY/doc/paper) | Status | Evidence |
|---|---|---|
| "GuardianWarning requires 3 callback props: onProceed, onSelectAlternative, onViewEvidence" | CONFIRMED (runtime), unenforced | `GuardianWarning.jsx:34-36` props; called unguarded at `:254,:297,:420,:513`; no PropTypes (F8) |
| Components call REAL backend autonomous/guardian APIs (not mock) | CONFIRMED for SmartUpload + NaturalLanguageBar | `SmartUpload.jsx:37` `profileData`; `NaturalLanguageBar.jsx:44,157` `queryAnalysis`; routes `autonomous/profile`, `autonomous/query` (`urls.py:362-363`) |
| Guided wizard runs a real guided analysis | REFUTED | `SmartAnalysisPage.jsx:107-110` no-op `onRunAnalysis`; fake "Analysis Complete" (`GuidedWizard.jsx:616-621`); simulated progress (`:251-260`) (F1,F2) |
| Guardian UI faithfully represents backend Guardian output | PARTIAL | Autonomous gauge correct (`PlainEnglishResults.jsx:470,746`); but `can_proceed`/`violations` not surfaced in autonomous results (F4); shared components have 0..1 vs 0..100 hazard (F3) |
| Could the badge be "always green"? | PARTIAL/HAZARD | `GuardianBadge` logic is correct *given 0..100 input* (`GuardianBadge.jsx:42-73`); but if fed raw 0..1 backend score it always renders red, not green — opposite failure (F3) |
| Confidence formula `max(0, 1 - Σw/(max·1.2))` | CONFIRMED (backend) | `guardian_core.py:662` |
| Severity weights critical=3 / warning=2 / minor=1 | CONFIRMED | `guardian_core.py` SEVERITY_WEIGHTS; `:655-658` |
| Client-side statistical statements are correct | PARTIAL | p-value/CI formatting mostly OK (`:701-719`); APA assembly hard-codes α=0.05 and mislabels statistic symbol (F6); effect-size gauge conflates effect-size families (F10) |
| "Golden ratio" used in confidence | CONFIRMED but meaningless | `GuardianWarning.jsx:29-30,150-156` φ-ratio is `score·φ` (F5) |

---

## (d) Prioritized recommendations toward "world-class"

1. **(F1/F2) Make the Guided Wizard real or remove it.** Shipping a "beginner" wizard whose Run button computes nothing and then claims "Analysis Complete" is the most serious user-trust issue here.
2. **(F3) Fix the confidence unit contract.** Normalize at one boundary; add PropTypes/JSDoc declaring 0..100; clamp. This protects all 7 classic modules.
3. **(F4) Surface Guardian violations / `can_proceed` in the autonomous results screen.** Reuse `GuardianReportDisplay`; don't show a green "significant" banner when assumptions were violated/substituted without saying so.
4. **(F6/F10) Stop re-deriving statistics on the client.** Render the backend's per-test APA string and categorical effect-size interpretation; thread `alpha` everywhere; never assume Cohen's-d bands for r/η²/V/OR.
5. **(F5) Remove the φ numerology** from a scientific confidence display.
6. **(F8) Add PropTypes (or migrate to TS)** across the subsystem; default callbacks to no-ops.
7. **(F9) Confirm auth/rate-limits** on the `AllowAny` autonomous endpoints that the UX feeds.
8. Add integration tests that assert: (a) a backend report with `can_proceed=false` produces a blocking/visible warning in the autonomous results; (b) confidence 0.42 renders as 42% (not 0% or 4200%) in every confidence widget.
