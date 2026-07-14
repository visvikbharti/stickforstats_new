# The defect classes that keep coming back — 2026-07-14

This is the most useful document in the repository. Not because of the bugs it lists, but because
**every bug in it is the same four bugs, wearing different clothes.** If you internalise the four,
you will stop writing them. If you only patch the instances, they will come back next week one call
site to the left — which is precisely what happened, eight times in a row, in the power-analysis arc.

---

## The four classes

### CLASS A — The silent default on an unrecognised parameter

The dominant class. **A parameter we do not understand must be an error, never a quiet substitution.**

Every one of these shipped:

```js
benchmarks[type] || benchmarks.cohens_d      // unknown scale -> Cohen's d
ARE_BY_PARENT[parent] ?? ARE_BY_PARENT.normal // unknown parent -> normal
SAMPLE_SIZE_TABLE[test] || SAMPLE_SIZE_TABLE['mann-whitney']
```
```python
else:            # <- "one-sample". Also: "banana".
```

**What it cost.** `interpretEffectSize(0.14, 'eta_squared')` returned **"negligible"** — because
`eta_squared` was never a key, so it fell through to Cohen's d, where 0.14 *is* negligible. On the
eta-squared scale 0.14 is a **LARGE** effect. Eta-squared is almost never above 0.2, so **every ANOVA
effect size on the live Effect Size & Power tab was reported as "negligible"** — telling a researcher
that a real effect was nothing. Not a wrong number: the *conclusion*, stated in words.

The same class made `POST /power/mde/ {"test_type": "chi-square"}` return the **t-test** answer,
stamped `"test_type": "chi-square"`.

**The cure.** Canonicalise the parameter and 400 / return `null` on anything unknown. Never `||`,
never `??`, never a bare `else`, on a value that names a *kind of thing*.

**Still live** (see `TODO_2026-07-14.md`): `powerAnalysisCodeGenerator.js:177` and `:94`;
`hp_power_analysis_comprehensive.py:335,355` (currently unreachable — one new call site from being
live again).

---

### CLASS B — The browser quietly using a different distribution

**The bug was never precision. It was the wrong distribution.**

scipy's float64 non-central F/t agrees with the 50-digit mpmath engine to **4.4e-16**. The browser was
using a *normal approximation*, which is off by up to **0.21 on a 0–1 scale**. That is not a rounding
error; it is a different answer.

Found again today, in a completely different module:

```js
function tCritical(df, alpha) {
  const z = normalQuantile(1 - alpha / 2);
  if (df > 30) return z;        // <- the NORMAL quantile, standing in for Student's t
  ...
}
```

For any sample larger than 31, a "95%" confidence interval was built from **1.959964** where t(40) is
**2.021075** — 3.0% too narrow. **Too narrow is the dangerous direction: it overstates precision.**
Measured over 20,000 simulations through the real code:

| n | df | actual coverage | nominal |
|---|---|---|---|
| 41 | 40 | **0.9426** | 0.95 |
| 61 | 60 | **0.9466** | 0.95 |

A 95% confidence interval that covers 94.3% of the time — feeding the entire `confidence_intervals`
simulation suite, **including `CoverageSimulation`, a lesson that teaches coverage.**

**The cure.** Use the real distribution. The exact inverse-t (`tQuantile`, pinned against scipy to
~1e-9) **already existed in this repo**. It simply was not being used. Before you hand-roll a
statistical function, search the repo — it is probably already here, already verified.

**Still live:** `Lesson09_APrioriVsPostHoc.jsx` carries its *own* hand-rolled `normalCDF` /
`normalQuantile` — a third parallel implementation, independent of both the backend engine and
`powerCalculations.js`.

---

### CLASS C — Fabricated numbers, always in prose

**Six fabrications this arc. Every single one in a comment, a docstring, or a commit message — where
no test can reach.** All of them passed CI, lint, and a fully green suite.

- `uniform → 65 subjects` in a table inside **generated R/Python** (the artifact researchers keep).
  Four of five rows had been executed; the fifth was **interpolated**. The answer is **64**.
- `0.633437` in a regression test — read "0.6334" in a report and **invented the last two digits**.
- `0.6633` as "the power of a 30/60 design", shipped in **three source files**. Truth: **0.599361**.
- A test called `should generate performance report` that hardcoded benchmark results nobody
  measured (`throughput: 1500 ops/sec`), hand-stamped `status: 'PASSED'` on each, asserted that the
  statuses it had just typed said `'PASSED'`, and signed off **"ALL BENCHMARKS PASSED"**.
- In a code comment *in this arc*: "it cannot pass with the old 0.9426 coverage" — **false**, and a
  mutation proved it. The band I had written was `> 0.93`.
- `backend 1322 passed` typed into a handoff doc before the suite had finished. (It later turned out
  to be right. **That is luck, not verification, and it does not count.**)

**Why it happens, which is the part that matters:** it never feels like inventing data. It feels like
**filling in an obvious gap.** Four rows executed, ARE = 1.0 sits between 0.955 and 1.097, so n
"obviously" sits between 68 and 59 → write 65. A report says 0.6334 → write 0.633437 to look precise.
That is the entire mechanism, and it is indistinguishable from ordinary fluent writing.

**The cure.**
1. **Run every number before typing it — including in prose.** If a number appears in a sentence you
   are writing, you must have watched a program print it, in this session.
2. **Never round-trip a number through a summary, a report, or your memory.** Copy it from the output.
3. **Never interpolate. Never "obviously".** Five rows in a table means five executions.
4. Where a comment or a generated artifact states a number, **pin it with a test** against the engine
   (`TheTableInTheExportedScriptIsNotInvented`). It is the only mechanical defence that exists.

---

### CLASS D — The test that cannot see its own bug

**This is why the other three survived so long.** Green tests were never evidence here.

- The total-N regression test **passed with its own bug live**, because it only ever exercised the
  input that does not trigger it.
- The rank-table test pinned the table **exactly where it was correct and nowhere it was wrong** —
  every assertion generated the Mann-Whitney script.
- There was **no test at all** for the two-sample-t code generator. A P1 walked straight through.
- Hardcoding the alternative in the **R** generator (breaking it the same way Python was broken) left
  **all 62 rank tests passing.** Not one looked at the alternative.
- Deleting the Python Kruskal `/ k` — which makes the exported script demand **44 per group where the
  answer is 15** — left **all 62 passing.** The only assertion on that line was a regex that matched
  either way.
- A test asserted `expect(coverage).toBeLessThan(1.0)` over 100 Monte-Carlo runs — i.e. it demanded
  that a random event **must** occur. It failed in CI at random, and **that coin flip blocked the
  production image push.** It also could not have caught the real bug beneath it, because it only ever
  ran n = 30 — on the one side of the `df > 30` cliff where the error happened to be conservative.

**The cure: MUTATION-CHECK EVERY REGRESSION TEST.** Put the bug back. If the test still passes, it
tests nothing — delete it or fix it, but do not trust it.

And **verify that the mutation actually applied** (grep for it). A `perl -0pi` substitution that
silently fails to match gives you a green run and a false sense of safety. That happened in this
session too.

Mutation results from today, for reference:

| mutation | tests that die |
|---|---|
| restore `if (df > 30) return z` | 4 |
| restore `int(effective_n)` | 6 |
| restore the silent `cohens_d` default | 2 |
| drop the `null` guard in `interpretEffectSize` | 1 |
| hardcode the Python rank script's `alternative` | 8 |
| delete the Python Kruskal `/ k` | 1 |
| inject a real O(n²) into `validateDataArray` | 1 (the scalability test) |

---

### CLASS E — The temporal dead zone: a `const` read before it exists

Added 2026-07-14, after CI's eslint was finally pointed at `.jsx` and produced **7 of these at once**.
This class has already caused **real P0 crashes** (chi-square screen, ML train, CI plot, 2026-07-13).

A `const`/`let` binding exists from the top of its block but cannot be *read* until its declaration
runs. A read before that is not `undefined` — it **throws**:

    ReferenceError: Cannot access 'x' before initialization

Three shapes, all found live in this repo:

| shape | why it throws |
|---|---|
| `const wasSig = isSignificant(p, a);`<br>`const isSignificant = adjusted < a;` | the local **shadows the imported helper for the whole block**, so the call on the line above resolves to the local, not the import |
| `useEffect(() => f(), [dep, f]);`<br>`const f = async () => {…}` | a **deps array is an ordinary argument**, evaluated eagerly *during render* — unlike the callback, it is not deferred |
| `const ui = (<Button onClick={h} />);`<br>… 500 lines later …<br>`const h = () => {…}` | a JSX **value** (not a render function) builds its props object immediately, reading `h` |

**Why it survives review:** all three *look* like ordinary React. The second is the nastiest — the
callback body is deferred, so the eye assumes the deps array is too.

**Why nothing caught it:** `no-use-before-define` was **enabled the whole time** and flags all three.
CI just never linted a `.jsx` file. It is now an **error**, with `variables: false` (react-app's own
option) — that catches the dangerous *same-scope* case while ignoring safe outer-scope references;
`variables: true` reports 399 mostly-harmless sites and would have to be suppressed, which is how a
rule dies.

**The lesson is not "be careful with const."** It is: *a lint rule you never run is not a lint rule,
and a gate that is not in `needs:` is not a gate.*

### CLASS F — The guard that fails in a place nobody watches

Also 2026-07-14 — and I nearly shipped it **while fixing** Class A.

Making receipt signing fail-closed, the obvious home for the check was `AppConfig.ready()`: fail at
boot, loudly. But `backend/Dockerfile:70` is

    RUN python manage.py collectstatic --noinput --clear 2>/dev/null || true

which runs at **build** time with `DEBUG=False` and no signing key. A raise in `ready()` would abort
collectstatic, and `2>/dev/null || true` would **swallow it whole** — shipping an image with no
static files, from a green build, caused by a safety check.

**Before adding a fail-closed check, enumerate every process that will execute it** — gunicorn,
celery, `manage.py` at build time, CI, the test runner — and ask what each one does with the
exception. A guard whose exception lands inside a `|| true` is worse than no guard: it converts a
loud failure into a silent one, which is the exact thing it was written to prevent.

The check ended up at **key-load time**: it fires where the damage would occur (signing), and cannot
touch a build step that never signs anything.

---

## The meta-pattern — read this twice

Across eight adversarial rounds, **every fix commit shipped a new defect of the same class**,
reintroduced **one function / one call site / one test branch / one calculation mode to the left** of
where it had just been fixed.

| fixed | reintroduced |
|---|---|
| `test_type`'s bare `else` | the identical bare `else` on `alternative` |
| `_t_power_float`'s missing `less` branch | `_correlation_power_float` left unsigned |
| "exported total N is wrong" | still wrong for Mann-Whitney — **same numeral (90)** |
| stale `sampleSize2` in two consumers | missed the third: the **code generator** |
| the R rank script's calculation mode | the **Python** twin's hardcoded `alternative` |
| a commit message condemning fabrication | **interpolated a number into the table inside it** |

It is not carelessness, and more care does not fix it. The mechanism is that **new code written in a
surface reproduces that surface's existing defect** — you copy the shape of the code next to you,
including its bug. The defences that actually work are structural:

1. **One rule, one place.** The `sampleSize2` value was wrong five times because it was re-derived at
   five call sites and the derivations drifted. It is now `secondArmFor()`, exported, and the tests
   import *the rule* rather than re-implementing it. (Watch for divergence anyway: `secondArmFor` and
   `secondArmForScript` drifted apart *again* within one commit, and had to be re-aligned.)
2. **Mutation-check everything.** See Class D.
3. **Execute the artifact, don't read it.** The exported R and Python scripts are now actually *run*
   (R against `pwr`, Python against statsmodels) and compared to the screen. Reading them found
   nothing for three rounds; running them found a 34-point contradiction immediately.
4. **Adversarial review by someone who must execute, not read.**
