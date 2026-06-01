# StickForStats — Strategy, Positioning & Honest Capabilities Assessment

**Date:** 2026-06-01
**Author:** Audit/remediation session (grounded in the 2026-05-31 ground-truth audit + a live
frontend UX review on 2026-06-01).
**Status:** Working strategy. Supersedes the "world's most comprehensive platform" framing.
**Companion docs:** `docs/AUDIT_2026-05-31/00_MASTER_REPORT.md` (what's real), `docs/BETA_DEPLOYMENT_CHECKLIST.md` (deploy gates).

---

## 1. The one-sentence truth

**The core science is genuinely good and defensible; the *packaging around it* (over-broad scope,
gamified dashboard, dual marketing voice) is the only thing that would make a serious scientist
"see through it and laugh."** Those are separable. The strategy is to lead with the strong core and
cut/flag everything thin.

This is NOT "is the whole thing worth it." The right question is: **"what is the smallest honest
version that is genuinely excellent?"** — and that version is real and publishable.

---

## 2. What scientists will respect (verified in the audit, not marketing)

- **Guardian assumption-checking** — automatically detects assumption violations, blocks bad
  analyses, and cascades to the correct test. Verified live across 10 seeds: it really blocks.
  Genuinely useful and mildly novel as a packaged automatic layer.
- **Manuscript statistics verification (STATCHECK-style + more)** — recomputes p-values from
  reported statistics; formulas verified correct vs scipy. Goes beyond statcheck (assumptions,
  power, effect-size completeness, discipline profiles: CONSORT/STROBE/JARS/ICH-E9).
- **Meta-analysis engine** — reproduces the published Egger-1997 IV-magnesium numbers EXACTLY
  (OR=0.483, I²=68.1%, Egger t=−5.78).
- **Reproducible case studies** — Iris, Wine (n=1599), IV-magnesium meta, real RNA-seq (GSE271517,
  MD5-verified). After remediation: no fabrication, no cherry-picking.
- **High-precision computation** — real 50-digit Decimal/mpmath for point estimates.
- **JOSS paper** — disciplined: zero hardcoded results, clean 30/30 bib, honest wording.

## 3. Where the "laugh at it" risk actually lives (NOT the statistics)

1. **Over-scoping.** "World platform / 3 pillars / 198 endpoints / mobile + desktop + SDKs +
   enterprise + 16 languages." Much breadth is thin/stubbed (mobile ~1 screen; desktop can't build;
   two-way/RM/MANOVA were unimplemented; some dashboards were mock data; "16 languages" = 10 full +
   6 stubs). A skeptic who pokes the edges finds hollow spots → distrusts the *good* parts too.
   **Breadth-claims are the liability; depth in the core is the asset.**
2. **The "so what vs jamovi/JASP/statcheck/GraphPad" test.** Will NOT win as "a better general stats
   package" (jamovi/JASP are mature, free, polished). CAN win as the focused
   "guard-assumptions + verify-manuscript-statistics, with reproducible provenance" niche.
3. **UX framing** (see §4) — gamification + dual voice signal "course/game," not "instrument."

---

## 4. Live frontend UX assessment (from real screenshots, 2026-06-01)

Method: served the existing production build, drove Chromium/Playwright, captured + visually
reviewed landing, dashboard, smart-analysis, PCA, manuscript-review, journal-analytics.

**Good (genuinely):**
- **Landing page is excellent** — "Publish Research with **Confidence**", the "70% fail to
  reproduce" hook, clean capability cards (Guardian / 50-decimal / 46+ tests), strong typography,
  one tasteful accent gradient. A scientist takes this seriously. No one laughs at it.
- Internal pages have **real structure** — PCA stepper + "Key Concepts"; Manuscript Review clean
  upload dropzone + research-field selector; comprehensive organized nav; flat professional theme.

**Problems (the actual laugh-risk — all fixable in ~a focused day, no redesign):**
1. **Dual voice.** Landing = crisp/honest; internal = "The world's most comprehensive statistical
   analysis platform" (overclaim). The confident-but-honest landing voice must win everywhere.
2. **Onboarding modal is a liability** — fires on EVERY page, large/blocking, "Don't show again"/
   "Skip" don't reliably dismiss, covers the actual feature. Highest-priority UX fix; small.
3. **Gamification miscalibrated** — dashboard leads with "Your Progress / Level 3 / 750/1000 XP /
   Achievements" (and per audit it's hardcoded). Scientists find XP/levels off-putting for a stats
   instrument. Lead with capability, not XP.
4. **Dead nav links** — `/statistical-tests` and `/test-selection` 404. Erodes trust instantly.

**UX verdict:** design language is ship-worthy (better than most academic software). The modal,
gamification, dual voice, and dead links are what undermine it — fix those four → respectable.

---

## 5. Strategic direction — the sharp, focused, publishable story

Name what's genuinely rare: **most tools RUN the test you pick (jamovi/JASP/SPSS); statcheck CHECKS
p-values post hoc. StickForStats refuses to let bad statistics happen — and can PROVE it didn't.**
Build the whole identity around that.

Three ideas, strongest first:

### Idea 1 (the MOAT) — "Reproducibility receipt" / verifiable analysis provenance
Turn Guardian's existing audit trail into a **signed, shareable provenance artifact**: a
hash-stamped record of {data fingerprint, assumptions tested, why this test, result, decision
path}. Researcher attaches it to a submission; editor/reviewer re-verifies in one click. Nobody owns
this niche. Directly serves the journal-verification vision and is publishable as a methods
contribution ("verifiable statistical provenance for reproducible research"). **This is the
groundbreaking one.**

### Idea 2 (the PRODUCT / wedge) — manuscript statistical verification as the headline
"Upload a manuscript → per-claim statistical integrity report (recomputed p-values, assumption
red-flags, effect-size completeness, multiple-comparison check) graded by discipline standard."
Goes beyond statcheck. A real pain for editors → most adoptable. Clear "statement of need" for the
paper.

### Idea 3 (the on-ramp) — Guardian as a teaching instrument
The cascade ("your t-test failed normality → why → the right test") is a strong pedagogical
artifact. A "learn-by-doing assumption tutor" for grad methods courses — honest, doesn't need
enterprise everything.

**RECOMMENDED POSITIONING:** Product = #2 (manuscript verification). Moat = #1 (verifiable
provenance — what makes journals adopt and what you publish). Guardian = the engine underneath.
**Drop "world's most comprehensive platform" entirely.**

---

## 6. Capabilities vs Claims — scoping sheet (what's IN the honest beta vs OUT)

| Capability | Reality | Beta scope |
|---|---|---|
| Guardian assumption validation | Real, verified, blocks bad analyses | **IN (headline)** |
| Manuscript statistical verification | Real (7 validators, 8 discipline profiles, statcheck math correct) | **IN (headline)** |
| Meta-analysis (DL + Egger) | Real, reproduces published numbers | **IN** |
| High-precision stats (t-test/ANOVA/correlation/regression) | Real for point estimates; p-values float64 | **IN** (don't claim 50-digit p-values) |
| Reproducible case studies | Real, script-backed, no fabrication | **IN (proof)** |
| Autonomous analysis (upload → NL question → result) | Real pipeline | **IN** (mark beta) |
| PCA / probability distributions / SQC / DOE | Real modules | IN (secondary) |
| Two-way/RM/MANOVA | Not implemented (now raise NotImplementedError) | **OUT — don't advertise** |
| Mobile app | ~1 working screen | **OUT** |
| Desktop (Tauri) | Cannot build (no icons) | **OUT** |
| SDKs (Python/R), Jupyter | Python real; R no docs; Jupyter name-collision | OUT of beta scope (label experimental) |
| "16 languages" | 10 full + 6 ~22% stubs | Say "10 languages + more in progress" |
| Enterprise (SSO/RBAC/billing/marketplace) | Mixed; some real, some stub | **OUT of beta narrative** |
| Compliance (SOC2/FDA Part 11) | Readiness docs, not audits | Don't claim certified |
| "198 endpoints / world platform" | Marketing inflation | **DROP the framing** |

---

## 7. Plan forward (agreed order: document → frontend honesty pass → §6 merge-prep)

1. **DONE:** this strategy doc + memory update (preserve context across restarts).
2. **NEXT — frontend honesty pass** (the laugh-risk fixes; ~focused day):
   - Fix/replace the onboarding modal so it dismisses and persists (and isn't blocking).
   - Remove/relabel the gamified XP/Level/Achievements dashboard framing (or gate it off by default).
   - Replace the internal "world's most comprehensive platform" copy with the honest landing voice.
   - Fix the dead nav links (`/statistical-tests`, `/test-selection`) or remove them.
3. **THEN — §6 merge-prep:** full backend + frontend suite run; PR description for the 24-commit
   branch; ready to merge + push when the user chooses.
4. **Deploy (operator):** §2/§3/§5 deploy-time actions; run `scripts/smoke_test.sh` vs the live URL.
5. **Later (direction):** build the provenance-receipt feature (Idea 1) as the differentiator;
   reframe the paper(s) around manuscript-verification + provenance.

## 8. Things I (the assistant) genuinely cannot vouch for yet — flag for a human/the PI
- Full visual/UX quality of every page under real data (only key pages reviewed).
- Feature-by-feature standing vs jamovi/JASP (no head-to-head done) — needed for the paper's
  "statement of need."
- Line-level correctness of EVERY statistical endpoint (audit was broad, not exhaustive).
- The PLOS manuscript's full claims-register should be re-checked before submission.

## 9. Environment caveat (2026-06-01)
The dev machine's disk is **100% full (~360 MB free of 228 GB)**. This will start causing real
failures (builds, temp files, DB). Clear space before the deploy work.
