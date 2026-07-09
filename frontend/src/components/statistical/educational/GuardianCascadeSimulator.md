# Guardian Cascade Simulator — "Why one t-test isn't enough"

`GuardianCascadeSimulator.jsx` is an interactive, in-browser Monte-Carlo lecture demo. It is
**Figure 8 of the StickForStats manuscript (the calibration benchmark), made interactive** — the same
scenarios (S1–S6), the same assumption cascade, the same honestly-disclosed S6 limitation, and the
same fixed seed, so a reader can reproduce the published headline result by pressing **Run**.

There is also an in-app version of this reference: the **"How to read this simulator"** panel that
expands directly under the widget's header.

---

## What it does

The same simulated experiment (Group A `n=55`, Group B `n=36`, unbalanced, `α = 0.05`) is handed to
two analysts, thousands of times:

- a **naïve analyst** who always runs a pooled **Student's t-test**, and
- the **Guardian cascade**, which checks assumptions first (normality → variance) and only then
  chooses the test (**Student's t / Welch / Mann-Whitney**).

The widget counts how often each analyst is wrong (false-positive rate under a true null) or right
(power under a real effect), and shows *where* Guardian routed each test — the mechanism behind the
difference.

### Honest labelling (project integrity brand)

The animated meters are a **fast in-browser JavaScript simulation that *reproduces* the backend
calibration benchmark within Monte-Carlo error**. They are **not** the production engine analysing
your data. To make the equivalence auditable, the **"Run this exact draw through the production
Guardian"** button POSTs the currently-displayed two-sample draw to the real engine at
`POST /api/guardian/check/` and shows that the deployed Guardian makes the **same** routing decision.

---

## Where it's mounted

| Module | Location |
| --- | --- |
| `WhyGuardianPage.jsx` (`/why-guardian`) | dedicated top-level page, linked from the nav (**Learn → Why Guardian?**) |
| `HypothesisTestingModuleReal.jsx` | dedicated **"Why Guardian?"** tab (renders only when the tab is active) |
| `NonParametricTestsRealProfessional.jsx` | a collapsed intro **Accordion** (`unmountOnExit` — mounts only when expanded, so the simulation never runs hidden) |

Exported from `frontend/src/components/statistical/educational/index.js`.

---

## The controls

| Control | What it does |
| --- | --- |
| **Scenario (S1–S6)** | Picks which assumption the data violates. Each pick re-seeds and restarts the run so both analysts see identical data. S6 is amber-flagged (the honest failure case). |
| **Measurement mode** | *False positives* = no real difference (every rejection is an error, target 0.05); *Power* = a real effect added (every rejection is a correct catch, higher is better). |
| **Run / Pause / Run again** | Starts, freezes, or replays the animation. The seed is fixed, so a replay is deterministic. |
| **Reset** | Clears counters and restarts the current scenario from experiment zero. |
| **New draw** | Redraws only the single example dataset in the histogram (not the aggregate meters) — for sampling variability and to feed the Verify button. |
| **Verify against the production Guardian** | POSTs the displayed draw to `/api/guardian/check/`; green = match, amber = different route on a borderline draw, red = endpoint unreachable (sim unaffected). |
| **Fixed setup** | `n = 55 vs 36`, `α = 0.05` — not adjustable; these are the benchmark conditions. |

## The readouts

| Readout | Meaning |
| --- | --- |
| **Naïve number** | False-positive (or power) rate of the always-pooled t-test. Climbs to ~0.10 on S2/S6. |
| **Guardian number** | Same rate for the cascade. Colour-coded in Type-I mode: green ≤ 0.065, amber ≤ 0.09, red above. |
| **Meter + amber tick** | Gauge on 0–0.20; the tick is the 0.05 target. Past the tick = inflated. |
| **Dot matrix** | One cell per recent experiment; filled = rejected the null (red = false alarm, green = correct detection). |
| **Routing bars** | Share of tests Guardian sent to Student's t / Welch / Mann-Whitney. |
| **Verdict card** | Plain-language reading of the scenario; amber on S6. |
| **Published-benchmark strip** | The exact Fig 8 numbers, so you can confirm the live rates converge to them. |
| **Verify result alert** | Third-party corroboration the cascade matches the deployed engine on a concrete draw. |

---

## The six scenarios (mirror manuscript Fig 8, Part A)

| ID | Data | Naïve (reported) | Guardian (reported) | Routing |
| --- | --- | --- | --- | --- |
| S1 · clean | normal, equal variance | 0.049 | 0.051 | 86% Student |
| S2 · unequal variance | smaller group ~3× spread (the RNA-seq case) | 0.100 | 0.058 | 90% Welch |
| S3 · heavy tails | t₃ noise | 0.046 | 0.049 | 84% Mann-Whitney |
| S4 · skewed | log-normal | 0.048 | 0.052 | 100% Mann-Whitney |
| S5 · outliers | 5% contamination | 0.046 | 0.049 | 86% Mann-Whitney |
| S6 · both | hetero + heavy — **the honest limit** | 0.094 | 0.080 | 84% Mann-Whitney |

**S6 is disclosed, not hidden:** because Guardian routes on normality first, it sends most of S6 to
Mann-Whitney (itself variance-sensitive) and only *partly* controls the inflation. A fixed
always-Welch default would do better here — which is exactly why the benchmark names variance-aware
routing as the fix.

---

## Numerics & the one honest caveat

All computed with standard closed forms (`GuardianCascadeSimulator.jsx`, module scope): Box-Muller
normals; two-sample Student & Welch t via the regularized incomplete beta; Mann-Whitney U (normal
approximation); Brown-Forsythe (median-centred Levene); **Jarque-Bera** normality.

> **Caveat:** the in-browser normality test is **Jarque-Bera**; the production engine uses
> **Shapiro-Wilk**. On clearly-clean or clearly-violated data they agree; on a *borderline* draw the
> Verify result may report a different route. That is expected — press **New draw** for another
> example. The aggregate rates are unaffected because they average over thousands of draws.

Fixed seed `20260706` (Monte-Carlo) and `424242` (histogram preview). `TARGET = 4000` experiments,
`POWER_SHIFT = 0.55`.

## Accessibility

Theme-driven (MUI `useTheme()`, no hard-coded hex; works in light and dark). Toggle controls expose
`aria-pressed`; the guide toggle exposes `aria-expanded`. Under `prefers-reduced-motion` the
simulation runs to completion instantly and the meter/route/collapse transitions are disabled.

## Tests

`__tests__/GuardianCascadeSimulator.test.jsx` (jest + React Testing Library): renders, scenario &
mode toggles, the guide toggle, the mocked backend-anchor success path, and graceful degradation when
the endpoint is unreachable.
