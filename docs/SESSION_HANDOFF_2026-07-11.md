# Session Handoff — 2026-07-11 (Integrity marathon + Guardian design-aware)

> **Resume entry for the next session.** Read this top-to-bottom, then use the
> "Next-session prompt" at the bottom. Companion auto-memory:
> `memory/session-2026-07-11-integrity-audit-guardian-spine.md` and the
> `MEMORY.md` index line marked ⭐⭐⭐⭐⭐.

---

## 0. TL;DR

Under the standing mandate *"fix whatever mistakes I made early…you have all
authority"* — with the **Guardian flow as the top priority** (check ALL
assumptions → recommend the correct test → block/warn per the toggle → route the
user to the right test → generate report/graphs/methods) — I ran two adversarial
multi-agent audits and fixed **every confirmed finding**: 27 per-test correctness
findings + 13 Guardian-spine findings (7 blockers + 6 majors).

**Status: DONE, pushed, DEPLOYED to production, and verified live.**
- `main` = `747b848` (origin synced).
- Live images: **backend `sha256:d4aa340d`**, **frontend `sha256:82c5b61e`**
  (GHCR SHA tag `747b848195ffb37e6d4a6d507e4750bd2d422379`).
- Rollback images preserved: **backend `sha256:b357747a`, frontend `sha256:84f5287a`**
  (tagged `stickforstats/{backend,frontend}:rollback-prev` on the VPS).
- No DB migrations (pure-logic changes).
- All CI green; backend 186+38 tests, frontend eslint clean + 44 jest tests.
- Verified live through the public Basic-Auth edge (see §5).

**Two open to-dos (next session):** (1) the **visual browser click-through** is
still pending — it was blocked because the Claude-in-Chrome extension was not
connected; (2) **rotate the beta Basic-Auth password** (currently the weak
`qwerty121`, plaintext on the VPS).

---

## 1. Deploy facts (for rollback / verification)

| Thing | Value |
|---|---|
| Repo | `github.com/visvikbharti/stickforstats_new`, branch `main` @ `747b848` |
| VPS | Hetzner `root@91.98.93.98` (key `~/.ssh/id_ed25519`), deploy dir `/opt/stickforstats_new` |
| GHCR images | `ghcr.io/visvikbharti/stickforstats_new/{backend,frontend}:latest` and `:<full-sha>` (CI builds+pushes on merge to main; **CI does NOT deploy** — deploy is the manual VPS step below) |
| Live backend image | `sha256:d4aa340d…` (local tag `stickforstats/backend:1.0.0`) |
| Live frontend image | `sha256:82c5b61e…` (local tag `stickforstats/frontend:1.0.0`), bundle `main.eb14b2f5.js` |
| rollback-prev | backend `sha256:b357747a…`, frontend `sha256:84f5287a…` |
| Beta gate | nginx HTTP Basic-Auth at the edge. **user `beta`, password in `/root/stickforstats-beta-access.txt`** (currently `qwerty121`). Django admin `/admin/`, creds in `/root/stickforstats-admin.txt`. |

### Deploy procedure used (repeat for future deploys)
```bash
# On the VPS, in /opt/stickforstats_new, with SHA = the merged commit's full sha:
docker tag stickforstats/backend:1.0.0  stickforstats/backend:rollback-prev
docker tag stickforstats/frontend:1.0.0 stickforstats/frontend:rollback-prev
docker pull ghcr.io/visvikbharti/stickforstats_new/backend:$SHA
docker pull ghcr.io/visvikbharti/stickforstats_new/frontend:$SHA
docker tag  ghcr.io/visvikbharti/stickforstats_new/backend:$SHA  stickforstats/backend:1.0.0
docker tag  ghcr.io/visvikbharti/stickforstats_new/frontend:$SHA stickforstats/frontend:1.0.0
docker compose up -d --no-build
docker compose exec -T backend python manage.py migrate --noinput   # no-op if no model changes
docker compose restart nginx
```
### To ROLL BACK
```bash
docker tag stickforstats/backend:rollback-prev  stickforstats/backend:1.0.0
docker tag stickforstats/frontend:rollback-prev stickforstats/frontend:1.0.0
docker compose up -d --no-build && docker compose restart nginx
```

---

## 2. The 10 commits (all on `main`, oldest→newest)

| Commit | What |
|---|---|
| `6bc6df0` | client-side t-tests used population SD/variance (÷n); switched to sample SD/var (÷n−1). |
| `d7dad15` | backend Mann-Whitney (bad exact CDF, missing n1·n2 tie factor) + Friedman (Iman-Davenport p mismatch, no tie correction, p=1 on concordant data) → delegate to scipy. |
| `9527334` | McNemar exact test `binom_test`→`binomtest` (scipy 1.12+ removed the old name). |
| `9872d3b` | non-functional modules: wrong response keys (`results.*` envelope), doubled `/api` prefix, one-sample `mu` in `parameters`, ICC envelope, correlation/regression key mismatches. |
| `55788fe` | **power education module (frontend) was fabricated-broken.** `regularizedIncompleteBeta` returned 0/1/NaN (bad continued fraction) → every t/F CDF wrong; `nonCentralTCDF` used a made-up Poisson-mix-of-inflated-df formula → t/paired power ≈ alpha; `powerChiSquare` used central-χ² shifted by ncp (reported ~1.0). Rewrote with NR betacf/betai + **Algorithm AS 243**; chi-square power via real non-central χ² (Poisson mixture); chiSquareQuantile via bisection. |
| `37e092f` | **backend power "50 decimal places" was a lie.** t-test power used a shifted-central-t approximation (0.80138 vs true 0.80146) and `_t_cdf/_t_ppf` cast to scipy float64. Added genuine mpmath `_nct_cdf` (AS 243), `_ncf_cdf`/`_ncx2_cdf` (Poisson mixtures), high-precision `_t_cdf/_t_ppf/_f_ppf/_chi2_ppf`. Fixed the **sample-size solver** (returned under-powered n: 63 not 64 for d=0.5,pwr=0.8) with a monotone smallest-n search. Frontend `PowerAnalysisReal.jsx` #19 unwrap (`response.data.results`), endpoint slug gating, key fixes, % display. |
| `6e5effd` | **categorical χ² reported p=0 on every 2×2/2×3 table** (local `chiSquareCDF` summed full Poisson mass for df≤2 → 1−1=0; and used the CDF not the upper tail). Replaced with correct upper-tail `Q(df/2,x/2)` (Lanczos + series/Lentz), verified vs `scipy.chi2.sf` ~1e-9. |
| `100b68a` | **Guardian backend made design-aware** (the spine's core fix) — see §3. |
| `b94bdd2` | **Guardian frontend** — block-never-fires (8 calculators), design routing, dead-ends — see §3. |
| `747b848` | display polish: tiny p-values no longer render as exact `0.0000` (use `formatPValue`); precision chip stopped concatenating into "50 decimal places-decimal precision". |

---

## 3. The Guardian spine — 13 findings, all fixed

Root cause of most: the Guardian was **design-blind** — the app collapses
one-sample/paired/independent t-tests into `t_test` and between/repeated ANOVA
into `anova`, so every downstream stage was wrong. The fix threads a `design`
parameter end to end.

**New backend contract:**
`GuardianCore.check(data, test_type, alpha, observation_order=None, design=None)`.
`design ∈ {one_sample, paired, independent}` (t_test) / `{between, repeated}` (anova),
normalized from aliases, inferred from data shape when absent. `views.py` (check
+ PDF + JSON export) forward `design` and `observation_order`. Frontend
`GuardianService.checkAssumptions(data, type, alpha, {design, observationOrder})`.

| # | Sev | Finding | Fix |
|---|---|---|---|
| 1 | blocker | Paired-t normality checked on raw columns, not the differences → silently passed a violated assumption | Paired → normality/outliers on the **differences**; drop variance-homogeneity; `ParametricTests` now sends BOTH columns + `design:'paired'` |
| 2 | blocker | ANOVA recommended Friedman (repeated-measures) for between-subjects | Design-aware `_get_alternatives`: between→kruskal/permutation (**friedman removed from default**), repeated→friedman |
| 3 | blocker | Report methods wrote "A Mann-Whitney U test was used" for a one-sample t-test | Design-correct alternatives (one-sample→wilcoxon_signed_rank/sign_test) + accurate report templates |
| 4 | blocker | **Block never fired in normal mode** — 8 calculators read non-existent `result.criticalViolations`/`hasViolations` | Derive from real snake_case (`violations[].severity==='critical'` / `can_proceed===false`) at all 8 sites |
| 5 | blocker | Report certified untested assumptions (independence, equal-variance) as "✅ Satisfied / PASSED" | Drive the assumption table + count from the audit trail; render "Not tested / Not applicable" |
| 6 | blocker | Diagnostic Q-Q/hist/box computed on POOLED multi-group data (bimodal → "non-normal" even when each group is normal) | Faceted per-group plots |
| 7 | blocker | Pearson/regression Q-Q concatenated X and Y into one array | Faceted per-variable (X/Y) plots; also fixed matplotlib-3.11 `labels=`→`tick_labels=` latent crash |
| 8 | major | ANOVA omitted the outliers check that t_test has | Added `outliers` to the ANOVA requirement set |
| 9 | major | Multi-group normality severity used `all()` across all groups → one catastrophic group demoted to a warning | Key severity off the **violating** groups (`any(... in violations)`) |
| 10 | major | Design-blind recommendations corrected only in the hub; all other consumers raw | Moved correction into the backend (design-aware `_get_alternatives`) so every consumer inherits it |
| 11 | major | NormalityTests "Select alternative" dead-ended in `window.alert` | Suppress the two-sample alternatives on the distributional screen |
| 12 | major | CorrelationTests Kendall/distance-correlation dead-ended | Offer only Spearman (the one this screen can run) |
| 13 | major | RegressionCalculator sent unknown `'linear_regression'` (0 checks, 0 alts) | Send `'regression'`; route robust/quantile→robust, gam→polynomial |

**Killed by adversarial refuters (NOT real / dead code, left as-is):** paired
wrong-assumption-set (superseded by #1), one-sample "variance pass" cosmetic,
Pearson requirement omissions, CLT-downgrade-unconditional, NonParametric/
Categorical `onSelectAlternative` alert (unreachable), one-sample effect-size
drop, Spearman-reuses-Pearson-SE. See §6 for the ones worth revisiting.

---

## 4. Key file map (this session's changes)

**Backend**
- `backend/core/guardian/guardian_core.py` — `check(design=)`, `_normalize_design`, paired-difference analysis arrays, requirement adjust, design-aware `_get_alternatives`, severity fix, ANOVA outliers.
- `backend/core/guardian/views.py` — forward `design`/`observation_order` (check + both exports).
- `backend/core/guardian/report_generator.py` — audit-trail-driven assumption table + count; design-correct report templates.
- `backend/core/guardian/visualization_generator.py` — faceted per-group/per-variable plots; `tick_labels=` fix.
- `backend/core/hp_power_analysis_comprehensive.py` — genuine high-precision non-central CDFs + solvers.
- `backend/core/hp_nonparametric_comprehensive.py`, `backend/core/hp_categorical_comprehensive.py` — earlier per-test fixes.
- Tests: `backend/tests/test_guardian_spine.py` (9), `test_hp_power_analysis_validation.py` (7), `test_nonparametric_validation.py` (10), `test_categorical_validation.py` (3).

**Frontend**
- `src/components/statistical-analysis/statistical-tests/{ParametricTests,NormalityTests,CorrelationTests,CategoricalTests}.jsx` + `guardianFallback.js`.
- `src/components/statistical/{TTest,ANOVA,Correlation,Regression}Calculator.jsx`, `src/components/statistics/AdvancedStatisticalTests.jsx`, `src/components/PowerAnalysis/EffectSizeEstimator.jsx`, `src/components/confidence_intervals/calculators/{Bootstrap,SampleBased}Calculator.jsx` — block-logic fix.
- `src/modules/PowerAnalysisReal.jsx` — response unwrap, endpoint gating, precision chip.
- `src/components/power-analysis/education/utils/{distributionFunctions,powerCalculations}.js` — rewritten math.
- `src/services/GuardianService.js` — `{design, observationOrder}` option.
- Tests: `distributionFunctions.validation.test.js`, `powerCalculations.chisquare.test.js`, `guardianFallback.test.js`, `statisticalUtils.test.js`.

---

## 5. Verification done (what "verified" means here)

- **CI:** all jobs green incl. Docker build + Push to GHCR (run 29117626324).
- **Backend:** `manage.py test tests` = 186 OK; `core.guardian.tests` = 38 OK.
- **Frontend:** `eslint src/ --max-warnings 0` exit 0; touched jest suites 44 pass.
- **Live (in-process on VPS):** paired Guardian check → `['wilcoxon_signed_rank','permutation_test','bootstrap']`, normality on differences, variance dropped, 0.37s; power d=0.5 n=64 = `0.80145955792225408053`.
- **Live (public edge, Basic-Auth):** `GET /` → 200 (bundle `main.eb14b2f5.js`); `/statistical-analysis`, `/modules/power-analysis-real`, `/modules/nonparametric-real` → 200; `/api/guardian/check/` paired → design-correct; `/api/v1/power/t-test/` → correct 50-digit value.
- **NOT done:** rendered **visual** click-through (Chrome extension not connected).

---

## 6. Open TODOs / plan for next session (prioritized)

1. **Visual browser click-through** (the user's explicit ask; blocked this session).
   - Prereq: connect the Claude-in-Chrome extension (install `claude.ai/chrome`,
     log Chrome into claude.ai with the same account as Claude Code, restart
     Chrome). Confirm with `tabs_context_mcp`.
   - Walkthrough to record (GIF + screenshots), using
     `https://beta:qwerty121@stickforstats.com/` to pass Basic-Auth **without**
     triggering the blocking auth modal:
     a. Home loads.
     b. Guardian **block actually fires**: go to a t-test, paste clearly
        non-normal data with a critical violation in **normal mode**, confirm the
        run button is disabled + the correct design-aware alternative is offered
        + clicking it routes (paired→Wilcoxon at `/modules/nonparametric-real`).
     c. Toggle Expert Mode → same data now only **warns**, run is allowed.
     d. Power module (`/modules/power-analysis-real`): real numbers render (not
        N/A), precision chip reads cleanly, unsupported test/mode combos show the
        gated notice instead of a 404.
     e. Categorical 2×2: p-value is sensible (not `0.0000` / not always "Significant").
2. **Rotate the beta Basic-Auth password** — currently weak `qwerty121`, plaintext
   at `/root/stickforstats-beta-access.txt`. (Deferred to-do from
   `docs/NEXT_STEPS_2026-06-29.md`.) Regenerate `.htpasswd`, update the file,
   `docker compose restart nginx`.
3. **Optional deeper correctness (revisit the killed/known-gap items):**
   - Non-parametric module has **no one-sample rank test** (sign test /
     one-sample Wilcoxon) — so a one-sample Guardian violation offers no runnable
     rank alternative. Building it would close that gap and let
     `NP_FALLBACK_BY_DESIGN` include `one-sample`.
   - **Spearman** correlation reuses the Pearson Fisher-z SE / "variance
     explained" framing (should use the Spearman-specific SE).
   - **One-sample t-test effect size** is silently dropped (no Cohen's d shown).
4. **Publication track (separate, ongoing — NOT touched this session):** BMC
   Bioinformatics (Software type) submission is READY per prior handoffs — upload
   `paper/submission_package/manuscript_rendered.pdf` + `BMC_COVER_LETTER.md` +
   reviewers (NOT Michael Love — COI). bioRxiv v2 blocked on openRxiv enabling
   the revision. See `MEMORY.md` "Session handoff — RESUME HERE" line + the
   publication-history memory.

---

## 7. Guardrails / gotchas to remember

- **Each production deploy needs the user's explicit authorization each time** —
  the "all authority" mandate does NOT extend to auto-deploy.
- CI's `eslint src/ --max-warnings 0` **only lints `.js`, never `.jsx`** — jsx
  bugs won't be caught by CI; verify jsx by hand / build.
- `black --check` in CI is `|| true` (never fails). `.flake8` ignores
  E501/E203/E402/W503/E303/E712/E722/E731/E741/W293/W391/E127.
- Bump `CACHE_SCHEMA_VERSION` (backend `api/v1/cache_utils.py`) whenever a cached
  endpoint's result changes for an unchanged request body, or Redis re-serves the
  stale answer for an hour.
- Use the absolute venv: `/Users/vishalbharti/StickForStats_v1.0_Production/.venv-django/bin/python`.
- Django tests run via `manage.py test` (pytest isn't configured for settings).
- Guardian check() ALWAYS runs matplotlib viz; an in-process check is ~0.37s (a
  one-off `docker exec … urllib` self-request can appear to hang — not a real
  perf issue).
