# Session handoff — 2026-07-13 (power analysis)

> **Dated snapshot — superseded.** This records what was believed on the date in its title.
> For the current state of the project, start at [`README.md`](README.md) (the undated index),
> then [`STATUS_2026-07-14.md`](STATUS_2026-07-14.md) and [`TODO_2026-07-14.md`](TODO_2026-07-14.md).
> **Do not trust a "Still open" section in a dated document without re-checking it.**

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
- **FIVE consecutive fix commits each shipped at least one new defect. Four adversarial passes were
  needed to converge.** This is the single most important thing to carry forward, and the pattern
  never varied: *the new defect was always the same bug class as the one being fixed, reintroduced
  one function or one call site to the left of where it was fixed.*

  | fixed | reintroduced |
  |---|---|
  | `test_type`'s bare `else` | the identical bare `else` on `alternative` |
  | `_t_power_float`'s missing `less` branch | `_correlation_power_float` left unsigned — a left-tailed correlation curve read **92%** under a headline reading **0.0%** |
  | `/power/curve/`'s pinned t-variant | — (this one was the *first* fix's own bug: a paired curve returned the independent one, 0.869 vs 0.598) |
  | "exported total N is wrong" | still wrong for Mann-Whitney, **same numeral (90)** |
  | stale `sampleSize2` in two consumers | missed the third — the R/Python **code generator** |
  | a commit message condemning fabrication | **interpolated a number into the table inside it** (`uniform → 65`; the engine says **64**) |

  That last one is worth sitting with. It did not feel like inventing data. It felt like filling in
  an obvious gap — four rows had been executed, ARE = 1.0 sits between 0.955 and 1.097, so the n
  "obviously" sits between 68 and 59. **That is what this failure mode looks like from the inside.**

  **So: review every fix adversarially — with a subagent that must EXECUTE, not read. Mutation-check
  every regression test (put the bug back; if the test still passes, it tests nothing — the total-N
  test passed with the bug live, because it only exercised the input that does not trigger it). And
  never type a number you have not run.**
- **Three parameters in the power API dispatch on a bare `else`** (`test_type`, `t_test_type`,
  `alternative`). All three are now canonicalized and reject unknown values with a 400
  (`canonical_test_type` / `canonical_t_test_type` / `canonical_alternative` in `power_views.py`).
  Before that, `POST /power/mde/ {"test_type": "chi-square"}` returned the **t-test** answer, stamped
  `"test_type": "chi-square"`. If you add a fourth dispatching parameter, canonicalize it too.
- Deleted `frontend/src/components/PowerAnalysis/` — 13 files, **9,669 lines**, zero importers.
- **`BundleVerifier` and `PerformanceTests` jest suites fail under machine load** (they are the two
  slowest, 53 s and 22 s, and time out when a build runs concurrently). They pass in isolation and in
  a quiet full run. Don't chase them.
- **No `CACHE_SCHEMA_VERSION` bump needed** for the power work: no power endpoint uses the versioned
  cache, and `cache_page` does not cache POSTs. Live is at 2 and `main` is at 4, so the *earlier*
  batch's keys do rotate on this deploy anyway.

## Still dead, deliberately left alone

`frontend/src/components/power-analysis/education/` contains **13 unreachable files** — the whole of
`simulations/` and `visualizations/`, plus the two barrel `index.js` files and `bayesianCalculations.js`.
The education hub imports **only the 11 lessons**, never these. They are the last consumers of the
wrong browser-side power math in `utils/powerCalculations.js` (whose *effect-size* algebra — `cohensD`,
`interpretEffectSize`, … — is fine and genuinely live; only the power/sample-size functions below
line 254 are wrong, and `powerChiSquare` was already fixed against scipy in an earlier session).

No live code path reaches any of it — verified by transitive reachability from `src/index.js` and
`src/App.jsx`, not by grep. It is dead, not lying to anyone. It is left for a follow-up because
deleting it is pure cleanup with no user-visible benefit, and the live site needed the fixes more
than it needed a tidy tree. **If you wire any of it back up, you are re-arming wrong math** — route
to `hubTestService` instead.

## Green

- Backend: **1295 tests OK**, flake8 clean.
- Frontend: **921/921 jest**, 55 suites, `eslint src/ --max-warnings 0` passes, production build compiles.
  (Build needs `NODE_OPTIONS="--max-old-space-size=4096"` locally, as CI already sets — the default
  heap OOMs.)
- Two suites are load-sensitive and fail only under parallel-worker contention, never in isolation
  or in a quiet full run: `BundleVerifier` / `PerformanceTests` (timing thresholds) and
  `simulationUtils` (a Monte-Carlo coverage assertion). Not regressions — don't chase them.

## Deploy — NOT DONE. Blocked on the user, deliberately.

25 commits ship over live `7a8dced`. Everything is staged on the VPS and the deploy is one command:

    ssh -i ~/.ssh/id_ed25519 root@91.98.93.98
    cd /opt/stickforstats_new && docker compose up -d --no-build && docker compose restart nginx

**The compose project lives at `/opt/stickforstats_new`, NOT `/opt/stickforstats`.**

Images for `b252163` are already pulled and the `stickforstats/{backend,frontend}:1.0.0` tags
ALREADY POINT AT THEM. Running containers hold their image by ID, so live is unaffected — but the
host is *armed*: the next `docker compose up -d` for any reason picks up the new build. (Re-pull and
re-tag for whatever the final SHA is before deploying.)

Rollback point, tagged on the host as `stickforstats/{backend,frontend}:rollback-prev`:

    backend  sha256:d4ad5640ffdccbf16aad008d5dbfb73c19549a960ed4db7ee06f3313f3fdf45c
    frontend sha256:d34a01ea5bcdda6f40a6ed313e9d4e671bcc9accbb7b39d4c337652041eef29b

## Still open

> ⚠ **CORRECTED 2026-07-14 — this section was WRONG, and the error was repeated for two days.**
> This document is a dated snapshot. **The current truth is in
> [`STATUS_2026-07-14.md`](STATUS_2026-07-14.md) and [`TODO_2026-07-14.md`](TODO_2026-07-14.md)**;
> start from [`README.md`](README.md), which is the undated index.

- ~~**Beta Basic-Auth password has NOT been rotated** off the old one.~~
  **FALSE.** It *was* rotated on 2026-07-13 (off the weak `qwerty121`). Verified 2026-07-14 by
  `htpasswd -vb` against the live `nginx/ssl/.htpasswd` **and** a 200 through the edge. The secret
  lives only in `/root/stickforstats-beta-access.txt` on the host.
  This one wrong line got repeated for two days, because nothing said which document to trust — it is
  the reason `docs/README.md` is now an index. **Method note:** a `401` for the old password proves
  *nothing* (the edge 401s any credential, including one that never existed). Only `htpasswd -v`, or a
  successful 200, settles it. *A plausible inference is not a verification.*
- The 13 dead education files still hold wrong browser-side power math. **Partly re-scoped**: the
  education hub *is* routed, but the broken power math in `powerCalculations.js` is reached only by 4
  simulation/visualization components. Its `interpretEffectSize` **is** live — and was mislabelling
  every ANOVA effect size as "negligible" until `cfe14c1`. See `TODO_2026-07-14.md`.

---

## Round 7 (2026-07-14) — the sixth reviewer's findings, and the one it did not find

The sixth adversarial pass found **no new P0/P1** — the first commit in the arc that did not ship a
fresh screen-facing defect. It found two P2s and two P3s. All four are fixed. Chasing one of them
turned up a fifth defect, in the engine, that no reviewer had looked at.

**1. The rank-test exports ignored the calculation mode entirely (P2, live, pre-existing).**
`generateRCodeNonParametric` / `generatePythonCodeNonParametric` took a `mode` and never read it —
every other generator branches on it. So sample-size mode, where the sample-size box **is not
rendered** and `sampleSize` therefore sits at its untouched default of 30, exported a script headed
`# Calculation Mode: sampleSize` that computed the *power* of a 30-subject study and signed off with
the achieved power of the 68-subject study the screen had recommended:

    n <- 30                                    <- an n the user never saw or typed
    effective_n <- n * ARE
    result <- pwr.t.test(n = effective_n, ...) <- computes 0.4600 (executed)
    # StickForStats Result: Power = 80.15%     <- claims 0.8015

A 34-point contradiction inside a single artifact — and the artifact is the one that goes into the
supplementary material. Both generators now branch on the mode and *solve* for n.

**The solve has two steps and the ORDER is load-bearing.** The engine ceils the parametric n to a
whole subject FIRST, then inflates by the ARE: `ceil(63.7656) = 64 → ceil(64 / 0.954930) = 68`.
Dividing the *continuous* 63.7656 by the ARE first gives `ceil(66.77) = 67` — one subject short of
the screen, which is this very defect wearing a different hat. The obvious way to write the script
gets it wrong.

The generated scripts are now **executed, not eyeballed** — R against `pwr`, Python against
statsmodels — and land on the engine's own numbers: 64→68, 34→36, 14→15, and 0.4600 in power mode.

**2. `secondArmFor` silently balanced a group-2 value of 1 (P2).** It returned `null` for n2 = 1 —
the same `null` that means "no second arm", i.e. *balanced*. A user who typed 1 was shown the power
of a 30/30 study with nothing on screen to say their input had been discarded. The backend correctly
400s on n2 < 2; the frontend was routing around its own validation. **Absent** (null/undefined/''/0)
still means balanced; anything the user actually **typed** is now sent as typed, and an impossible
design comes back as the error it is.

**3. A group-1 problem was blamed on group 2 (P3).** `n2` defaults to `n`, so the n2 guard fired for
`sample_size=1` with no `sample_size2` at all: *"The second group needs at least n = 2 … got n2 = 1"*
— naming a box the user never touched. Group 1 is now guarded before group 2 is derived from it.

**4. The commit message's self-report was wrong again (P3).** Numbers below are executed.

### The defect the reviewers did not find: the engine threw away the fractional subject

Chasing (1) into the engine: `calculate_power_nonparametric` computed
`base = calculate_power_t_test(sample_size=int(effective_n))`.

`effective_n = n × ARE` is **not a headcount**. It is the fictitious size at which the parametric
test has the same power — a point on a smooth curve. `int()` floored it, and it did damage twice:

- it **understated the power of every rank test** — Mann-Whitney at n = 30 under a normal parent
  was reported as **0.451351** when it is **0.460036**;
- and because the normal ARE is **0.955 < 1**, the floor sometimes did not advance when n did:
  `int(22 × 0.955) == int(23 × 0.955) == 21`. A user who recruited **one more subject per group**
  was shown exactly the same power — told, in effect, that their subject bought them nothing.

Fixed. Power is now **strictly** increasing in n across all five parents (executed, n = 5…59).
`CACHE_SCHEMA_VERSION` bumped **4 → 5**: the rank endpoints return a different (and now correct)
answer for an unchanged request body, so without the bump Redis re-serves the old one for an hour.

### Gate (all executed, this round)

- backend: see the round-8 gate below (the figure first written here was **typed, not executed** —
  removed on sight, per [[feedback-never-type-an-unexecuted-number]]; it is the same reflex that
  produced the five fabrications this arc exists to clean up)
- frontend **999 passed / 56 suites** (was 965), flake8 clean on every touched file
- **eslint 0 warnings** on all three touched files — including the `.jsx`, which **CI never lints**
- `npm run build` (the way Docker builds it) compiles, exit 0. Note `CI=true npx react-scripts build`
  fails, but only on *pre-existing* warnings in unrelated modules (`ManufacturingDefectsD3.jsx` and
  friends); none of the touched files appear in the log. Docker does **not** set `CI`.
- **Mutation-checked**: restoring `int(effective_n)` kills 6 tests; restoring the old `>= 2` rule in
  `secondArmFor` kills 2; removing the group-1 guard kills 1. Tests that survive their own bug test
  nothing, and that has caught me three times in this arc.

---

## Round 8 (2026-07-14) — the seventh defect: the *alternative*, not the second arm

The seventh adversarial pass found a **P1 in my round-7 fix**. It is fixed; the numbers below are
executed.

**`generatePythonCodeNonParametric` hardcoded `alternative="two-sided"` in all four of its
statsmodels calls — and it had been RECEIVING the user's choice all along.** Every other Python
generator maps it (`altPy`). The R twin threaded it correctly. The Alternative dropdown **is**
rendered for Mann-Whitney and Wilcoxon (`PowerAnalysisTool.jsx` excludes only anova / chi-square /
kruskal-wallis) and the engine honours it — so a one-sided design exported **two scripts describing
two different studies**:

    Mann-Whitney, d = 0.5, 80% power, one-sided, normal parent
      screen and exported R:   54 per group
      exported PYTHON:         68 per group        <- 26% more subjects
    Wilcoxon:  screen and R 29 pairs, exported Python 36 pairs
    Power mode (pre-existing): screen 0.5887, exported Python computed 0.4600

Both scripts were then **executed**: R and Python now both return **54 per group** and **29 pairs**.

The trap: statsmodels spells it `larger`/`smaller`, `pwr` spells it `greater`/`less`. Interpolating
the raw value would have produced a script that does not run at all. That is presumably why this
branch was skipped in the first place.

### The suite was blind to it — that is the real finding

The reviewer mutated the **R** generator to hardcode the alternative too, i.e. broke it the same way
Python was broken. **All 62 rank tests still passed.** Not one assertion looked at the alternative.
It did the same to the Python Kruskal `/ k` division (deleting it makes the script demand 44 per
group where the answer is 15, a 3x overstatement): **all 62 still passed**, because the only
assertion on that line was a regex that matched either way.

This is "the test pins a copy, not the rule" in a new costume — the fourth time in this arc. Both
holes are now closed and **mutation-checked**: hardcoding the alternative kills **8** tests
(was 0); deleting the `/ k` kills **1** (was 0).

### Also fixed (P3s)

- **The API response contradicted itself.** The computation stopped truncating the ARE-adjusted size
  but the *report* of it had not: `/power/nonparametric/` returned a power computed at an effective
  n of **28.6479** sitting beside `effective_parametric_n: 28`. The last `int()` standing.
- **`secondArmForScript` and `secondArmFor` had DIVERGED** — I changed one and not the other, so the
  service passed a too-small arm through while the script generator balanced it. Two rules for one
  value is exactly the mechanism that made this value wrong five times. They agree again.
- Grammar: "A independent t-test" -> "An".

### What this says about convergence

It is **not** a regression at a site already fixed, and it is **not** the second arm — that surface
stayed closed, and every consumer still reads `secondArmFor`. It is the **alternative**: a different
value with the same disease, where the new sample-size branch *inherited* the defect from the power
branch beside it rather than inventing a new one. Blast radius is **exported artifact only, on the
one-sided path**; every two-sided screen-facing number was correct throughout.

The pattern that keeps holding: **new code written in this surface reproduces the surface's existing
defect.** The defence is not more care. It is mutation-checking every new test, because a test that
survives its own bug is not a test.

### Round-8 gate (executed)

- frontend **999 passed / 56 suites**, eslint **0 warnings** on all three touched files
- backend: full `pytest tests/` — see commit message for the executed figure
- both exported scripts **executed** (R via `pwr`, Python via statsmodels) and they agree with the
  screen in every mode, two-sided and one-sided
