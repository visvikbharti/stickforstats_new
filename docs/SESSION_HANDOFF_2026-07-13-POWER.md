# Session handoff — 2026-07-13 (power analysis)

**Branch:** `main` @ `9c046a2` (pushed). Three commits: `04b450b`, `1e5fd75`, `9c046a2`.

## The short version

Every power / sample-size calculator in the application computed its numbers in the browser, and
they were wrong. All of them now run on the backend against exact non-central distributions.

Power analysis is the one calculation whose entire purpose is to run **before the data exist**. If it
returns a sample size that is too small, nothing downstream can catch it: the study runs, it is
underpowered, it misses the effect, and the result is filed as a negative finding. There is no
residual to inspect and no diagnostic that fires. So it has to be right when it is printed.

## What was wrong (all confirmed by executing the code, not by reading it)

`/statistical-analysis-tools` had **four** power calculators on it.

| Where | Bug | Consequence |
|---|---|---|
| Study Design Wizard | Called `powerTwoSampleTTest(n1,n2,d,alpha,alt)` as `(n, effectSize, alpha, tails)` | **power = 1.0 for every t-test design**, df = 62.5; ANOVA gave **dfBetween = −0.5** |
| Study Design Wizard (n mode) | same | asked for **300 subjects** and reported the design's power as **7.2e-9** |
| Effect Size & Power tab | ANOVA n = `ceil(k*((za+zb)/(f*sqrt(k)))^2)` | **504 subjects where 180 suffice** (2.3–3.3× too large) |
| Effect Size & Power tab | ANOVA power = normal approx to non-central F | 0.66 where truth is 0.80; `sqrt(2λ−df1)` → **sqrt(negative) = NaN**, rendered as "Underpowered" |
| everywhere | t-test n = `ceil(2*((za+zb)/d)^2)` | **63 where the answer is 64** (true power at 63 is 0.795, not 0.80) |
| Power Analysis Tool | rank-test n = `ceil(parametric / 0.955)` | 3/π is the ARE for a **normal** parent — absurd for a test chosen *because* normality failed, and it points the **wrong way** |
| `/statistics/advanced-tests` | Student-t critical value fed into a **normal CDF** | displayed as the study's power |
| `/modules/hypothesis-testing` | `setPower(1 - beta)` | the user's own slider echoed back as a result |
| `ReportViewer` | fetched the real report, **discarded it**, rendered a hard-coded one | **every report on the platform** showed `p = 0.032, t = 2.87, df = 28` |
| Lesson 9 (observed power) | `Φ(−|z| − 1.96)` — only the wrong-tail term | **0.004% at p = 0.05** where the truth is **50.0%** — the exact regularity the lesson exists to teach |
| Lessons 3 & 4 | power clamped into `[0.001, 0.999]` | a 99.99%-powered design taught as 99.9%; no slider position could show near-zero power |
| Clinical-trial sim | `criticalZ = 1.96` hardcoded in two copies | moving the α slider never changed the reported power |

## What replaced it

Backend, exact non-central distributions (`hp_power_analysis_comprehensive.py`):

    /api/v1/power/sample-size/anova/           /api/v1/power/sample-size/correlation/
    /api/v1/power/sample-size/chi-square/      /api/v1/power/sample-size/nonparametric/
    /api/v1/power/nonparametric/               /api/v1/power/curve/       /api/v1/power/mde/

- `_smallest_n_meeting_power()` brackets with a cheap float64 guide and then **certifies with the
  50-digit function**: `power(n) >= target > power(n-1)`. (One 50-digit non-central F evaluation
  costs ~1.5 s, so bisecting on it directly would take ~40 s — unusable in a request.)
- `/power/mde/` — minimum detectable effect. **Report this instead of observed power**, which is a
  monotone function of the p-value and so cannot say anything the p-value did not (Hoenig & Heisey
  2001).
- Rank-test responses carry `are`, `parent_distribution` and a `note`. The parent distribution is now
  a user choice, because it changes the answer enormously: for d = 0.5 at 80% power, Mann-Whitney
  needs **68** per group under a normal parent, **43** under Laplace, **22** under exponential.

Frontend: one gateway, `components/statistical-analysis/utils/hubTestService.js` (a `POWER_TESTS` spec
table). `isPowerTestSupported()` means an unsupported design (factorial ANOVA, logistic regression,
Friedman) now **says so** rather than silently returning a t-test answer under its name.

## Things worth knowing

- **The bug was never precision.** scipy's float64 non-central F/t agrees with the 50-digit engine to
  **4.4e-16**. The browser was using a *different distribution* (a normal approximation), which is off
  by up to **0.21** on a 0–1 scale. Curves are served from float64; headline numbers from mpmath.
- **I introduced a bug in this very diff and an adversarial reviewer caught it**: `/power/curve/`
  pinned the t-variant to `"independent"`, so a **paired** curve silently returned the independent
  one (at n = 40, d = 0.5: 0.869 vs 0.598). Always re-review honesty fixes adversarially — the fix is
  as capable of lying as the bug was.
- Deleted `frontend/src/components/PowerAnalysis/` — 13 files, **9,669 lines**, zero importers.
- **`BundleVerifier` and `PerformanceTests` jest suites fail under machine load** (they are the two
  slowest, 53 s and 22 s, and time out when a build runs concurrently). They pass in isolation and in
  a quiet full run. Don't chase them.
- **No `CACHE_SCHEMA_VERSION` bump needed** for the power work: no power endpoint uses the versioned
  cache, and `cache_page` does not cache POSTs. Live is at 2 and `main` is at 4, so the *earlier*
  batch's keys do rotate on this deploy anyway.

## Green

- Backend: **1272 tests OK**, flake8 clean.
- Frontend: **878/878 jest**, 53/53 suites, `eslint src/ --max-warnings 0` passes, production build compiles.

## Deploy

19 commits ship over live `7a8dced`. Rollback point captured before deploying:

    backend  sha256:d4ad5640ffdccbf16aad008d5dbfb73c19549a960ed4db7ee06f3313f3fdf45c
    frontend sha256:d34a01ea5bcdda6f40a6ed313e9d4e671bcc9accbb7b39d4c337652041eef29b
