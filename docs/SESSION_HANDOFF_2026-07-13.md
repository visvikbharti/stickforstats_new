# Session Handoff — 2026-07-13 (click-through → 3 TDZ render crashes; beta password rotated)

> Resume entry. Companion memory: `memory/session-2026-07-13-clickthrough-tdz-crashes.md`.
> Previous: `docs/SESSION_HANDOFF_2026-07-11.md`.

---

## 0. TL;DR

Both open to-dos from 2026-07-11 are closed.

1. **Visual click-through — DONE**, but with **Playwright**, not the Claude-in-Chrome extension
   (which still refuses to pair). Guardian and Power verified green on production.
2. **Beta Basic-Auth password — ROTATED** off `qwerty121`, verified through the public edge.

And the click-through **earned its keep**: it found a **P0 that the whole 747b848 audit missed** —
three components crash at render time. **The chi-square screen is broken on production right now.**

- Fix branch: **`fix/jsx-tdz-render-crashes` = `8c286e4`** — **NOT merged, NOT deployed.**
- `main` is unchanged at `747b848`.

---

## 1. The P0: render-time temporal-dead-zone crashes

A component-scoped `const` helper is **called by code that runs during render** but **declared lower
in the same component body**, so the binding is still in its temporal dead zone:
`ReferenceError: Cannot access 'X' before initialization`.

Render-time means: a `useMemo` callback, the render body, or **a `useEffect` dependency array** (the
deps array is an argument, evaluated at the hook call). It does **not** include `useEffect` /
`useCallback` / event-handler bodies — those run after the component body finishes, so they are safe.

| Component | Helper | When it fires |
|---|---|---|
| `CategoricalTests.jsx` | `chiSquareUpperTail` | `chiSquareResult` useMemo — **crashes on production as soon as you pick a variable** |
| `LinearRegressionML.jsx` | `gaussianElimination` | `modelResults` useMemo, guarded by `!modelTrained` → fires when the user clicks **Train Model** |
| `IntervalVisualization.jsx` | `generateDistributionCurve` | named in the **useEffect deps array** → threw on **every** render; the confidence-interval plot was dead |

**Fixes**
- Categorical + ML: the helpers are pure → hoisted to **module scope**.
- IntervalVisualization: do **not** hoist (it closes over sibling helpers `kernelDensityEstimator` /
  `kernelEpanechnikov` / `getParameterLabel`). The effect *calls* it from inside the callback, which
  is safe — so the fix is simply to **drop it from the deps array**.

**The irony:** the chi-square crash was introduced by `6e5effd`, the commit that fixed "p=0 on every
2×2". The math was correct; the new helper was just placed below its caller. The screen went from a
wrong p-value to no screen at all — and every backend and unit test stayed green.

### Why nothing caught it
- CI's `npx eslint src/` lints **only `.js`, never `.jsx`**.
- Worse: **`no-use-before-define` is not even enabled** in the `react-app` config — so linting `.jsx`
  would still have missed it.
- Enabling that rule codebase-wide produces **440 hits, almost all benign** (refs inside
  useEffect/useCallback/handlers, which are safe). It is therefore **not a usable CI gate as-is** and
  was deliberately left alone. Closing this properly needs a narrow custom check (only flag
  render-time references) — worth doing, not done here.
- Pure-math unit tests pass happily while the component never renders.

→ The only thing that catches this class is **rendering the component**. Added render regression
tests for the two screens with pure helpers; both were confirmed to **fail with the exact
ReferenceError** against the pre-fix files and pass against the fix.

---

## 2. What was verified on production (bundle `main.eb14b2f5.js` = `747b848`)

**Guardian — 17/17 green.**
- Header chip reads **Protected** by default; Guardian **blocks** on critical non-normality.
- **Design-aware, both directions:** independent → `Mann Whitney` (no Wilcoxon offered);
  paired → `Wilcoxon` (**no Mann-Whitney** — the pre-`100b68a` bug).
- **Expert Mode** flips the block to warning-only and results render; toggling back re-blocks.
- Clicking *Wilcoxon* routes to `/modules/nonparametric-real` and **auto-runs** it.

**Power — 6/6 green.** d=0.5, n=64 → `0.8015`; high-precision
`0.8014595579222540805370928326…` (matches the value in the 2026-07-11 handoff); precision chip reads
a clean **"50 decimal places"**; unsupported combos show the gated notice.

**Chi-square — 6/6, but on the LOCAL build only** (production still serves the crashing bundle):
Group×Outcome_A → χ²=0.3601, p=**0.5484** "Not Significant"; Group×Outcome_B → χ²=5.7692,
p=**0.0163** "Significant". Two 2×2s from the same Group column, different verdicts. Both match
`scipy.chi2_contingency(correction=False)`.

**Natural experiment for the ML fix** — same clean CSV, click Train Model:
production throws `Cannot access 'q' before initialization` + error boundary; the fixed build trains
and renders results.

Evidence (GIFs + 13 stills): **`artifacts_clickthrough_2026-07-13/`** (see its README).

---

## 3. Beta Basic-Auth password — ROTATED ✅

- Was the weak `qwerty121`. Now a **28-char random alphanumeric**, hashed with **bcrypt `$2y$`**
  (nginx on alpine/musl accepts it — an upgrade from the old `$apr1$` MD5).
- Verified through the public edge: new → **200**, `qwerty121` → **401**, no creds → **401**.
- `/root/stickforstats-beta-access.txt` rewritten (chmod 600). Backup:
  `/opt/stickforstats_new/nginx/ssl/.htpasswd.bak.20260713-091420`.
- nginx reads `/etc/nginx/ssl/.htpasswd` (`nginx.conf:105-106`), bind-mounted from
  `/opt/stickforstats_new/nginx/ssl/`.
- **The password is intentionally not written into the repo or into memory** — read it from the VPS
  file.

---

## 4. Tooling note: use Playwright, not the Chrome extension

The Claude-in-Chrome extension has now blocked two sessions (`tabs_context_mcp` → "not connected",
`list_connected_browsers` → `[]`, `switch_browser` → no browsers). **Don't spend time on it.**
Playwright is strictly better for this app anyway: the hub's only data entry is a **CSV upload**
(no paste box), which needs `setInputFiles`; `httpCredentials` bypasses the Basic-Auth modal; and it
captures console errors (which is how the TDZ crash was spotted) plus video for GIFs.

Harness: session scratchpad `clickthrough/` — `lib.js`, `guardian.js`, `power.js`, `chisquare.js`,
`verify-ml.js`.

**Gotcha that produced a false negative:** MUI placeholder options ("Select group column…") are real
`role=option` entries with `data-value=""` and they substring-match the column name — a non-exact
matcher silently picks the *placeholder*, leaving the select empty, and the screen then looks like
"the Guardian never fired". Match option text **exactly** and assert the value actually landed.

---

## 5. Next steps

1. **Merge + deploy `fix/jsx-tdz-render-crashes` (`8c286e4`).** Production is currently crashing on
   the chi-square screen and on ML "Train Model". Deploy procedure and rollback tags: §1 of
   `docs/SESSION_HANDOFF_2026-07-11.md`. Frontend-only change; no migrations. No
   `CACHE_SCHEMA_VERSION` bump needed (no cached backend response changes).
2. After deploying, re-run the chi-square proof against production to close the one proof that is
   currently local-only: `BASE_URL=https://stickforstats.com BETA_PW=<new> node chisquare.js`.
3. Consider a narrow CI check for render-time use-before-define (the blanket eslint rule is too noisy
   at 440 hits). Also worth finally making CI lint `.jsx` at all.
4. No regression test yet for `LinearRegressionML` (needs TF.js mocks) — covered only by browser E2E.
5. Publication track untouched (BMC Bioinformatics submission still ready — see 2026-07-11 handoff).
