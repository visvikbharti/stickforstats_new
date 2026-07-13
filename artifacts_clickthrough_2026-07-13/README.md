# Live click-through evidence — 2026-07-13

Visual verification of the `747b848` deploy. Driven with Playwright against the real site
(`https://stickforstats.com`, Basic-Auth beta gate) — the Claude-in-Chrome extension still
would not pair, so Playwright was used instead.

## GIFs
| file | what it shows |
|---|---|
| `guardian-walkthrough.gif` | the full Guardian run on production, 2× speed: upload → independent t-test blocked → paired t-test blocked → Expert Mode → back to Protected → route to Wilcoxon |
| `proof-slideshow.gif` | the 13 stills below, ~2s each |

## Stills

**(a) Guardian blocks non-normal data and offers the *design-aware* alternative — LIVE, all green**
| file | claim |
|---|---|
| `01-protected-mode-default.png` | header chip reads **Protected** (normal mode) by default |
| `02-independent-BLOCKED.png` | independent t-test on outlier-laden data → "🚫 Test Execution Blocked", critical violation, confidence 30.6% |
| `03-independent-offers-MannWhitney.png` | alternatives = **Mann Whitney**, Permutation, Bootstrap, Welch — correct for *independent* |
| `04-paired-BLOCKED.png` | same dataset as a **paired** t-test → also blocked |
| `05-paired-offers-Wilcoxon-DESIGN-AWARE.png` | **the money shot.** alternatives = **Wilcoxon**, Permutation, Bootstrap — and **no Mann-Whitney**. Offering Mann-Whitney for paired data was exactly the pre-`100b68a` bug. |
| `08-routed-to-Wilcoxon-autorun.png` | clicking *Wilcoxon* routes to `/modules/nonparametric-real` and auto-runs it (`200 /api/v1/nonparametric/wilcoxon/`) |

**(b) Expert Mode downgrades the block to a warning — LIVE**
| file | claim |
|---|---|
| `06-expert-mode-WARNING-ONLY.png` | chip flips to orange **Expert Mode**; block panel gone; Guardian warning still shown; results render |
| `07-protected-again-block-returns.png` | toggling back to Protected re-blocks — proving the toggle is what does it |

**(c) Power renders real numbers with a clean precision chip — LIVE**
| file | claim |
|---|---|
| `09-power-real-numbers-clean-chip.png` | d=0.5, n=64 → **0.8015** (not N/A); high-precision `0.8014595579222540805370928326…`; chip reads a clean **"50 decimal places"** (not the old mangled "50 decimal places-decimal precision") |
| `10-power-gated-notice.png` | an unsupported test/mode combo shows the gated notice, not a 404 |

**(d) 2×2 chi-square gives a sensible, discriminating p-value — LIVE (after the fix was deployed)**
> These were re-captured on production after deploying the fix. The screen now also shows a green
> Guardian panel ("All assumptions satisfied") — before, the chi-square Guardian check returned
> HTTP 500 and the UI said "Guardian validation unavailable".

| file | claim |
|---|---|
| `11-chisq-p0.5484-NOT-significant.png` | Group × Outcome_A → χ²=0.3601, df=1, **p=0.5484 → "Not Significant"** |
| `12-chisq-p0.0163-significant.png` | Group × Outcome_B → χ²=5.7692, df=1, **p=0.0163 → "Significant"** |

Two 2×2 tables built from the *same* Group column give *different* verdicts. Pre-fix, every 2×2
reported p=0.0000 / "Significant". Both p-values match `scipy.stats.chi2_contingency(correction=False)`.

**The P0 this click-through found**
| file | claim |
|---|---|
| `13-ml-trains-after-TDZ-fix.png` | ML "Train Model" now trains. On **production** the same click throws `ReferenceError: Cannot access 'q' before initialization` and shows the error boundary. |

Three `.jsx` components called a component-scoped `const` helper from code that runs *during* render
while declaring it further down the same body — a temporal-dead-zone crash.

**All fixes are now merged to `main` and DEPLOYED to production** (`7a8dced`). Fixing the chi-square
crash then exposed a second P0 underneath it: the Guardian's chi-square assumption check was
returning HTTP 500 on every categorical test, so the Guardian silently never validated a chi-square
at all. That is fixed too — it now applies Cochran's expected-frequency rule and recommends Fisher's
exact test on sparse tables.

Re-verified on production after deploy: Guardian 17/17, Power 6/6, chi-square 6/6, ML trains.
