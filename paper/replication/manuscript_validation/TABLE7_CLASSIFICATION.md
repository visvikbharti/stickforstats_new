# Table 7 classification provenance — manuscript verification corpus

Per-claim adjudication of the **33 flags** the current retrospective-verification engine
raises on the 20-article corpus, each read back against its source article.

**This file was rewritten on 2026-08-04.** The previous version adjudicated **19** flags
against `results.json` as it stood at commit `d41ee20` (3 Jun 2026): 980 claims / 468
with-a-statistic / 295 recomputable / 276 consistent (93.6%) / 14 discrepancy + 5 gross.
Those figures are **superseded**. The extractor has since been fixed for p-value
mis-pairing and precision, which recovers 353 recomputable claims instead of 295 (it now
reads three articles the old extractor recovered almost nothing from) and therefore
changes every aggregate.

## Source of truth — everything below was executed, not asserted

```
$ git rev-parse HEAD
8fbada2fed94b24a0888026e5a93af03e4e6b935          # git describe: v1.1.0-104-g8fbada2

$ cd backend && DJANGO_SETTINGS_MODULE=stickforstats.settings \
    ../.venv-django/bin/python manage.py validate_corpus \
    ../paper/replication/manuscript_validation/corpus \
    --json ../paper/replication/manuscript_validation/results.json
AGGREGATE over 20 papers: 1104 claims, 459 with a statistic, 353 recomputable
  -> 320 consistent, 29 discrepancy, 4 gross error(s).

$ python -c "print(320/353*100, 33/353*100)"
90.65155807365439 9.348441926345609
```

Environment: Python 3.11.11, numpy 2.4.6, scipy 1.17.1, Django 4.2.x, R 4.4.1 with
statcheck 1.5.0. Per-article SHA-256 of the corpus texts is recorded in
`results.json` under `_provenance.corpus_sha256`.

Aggregate: **353 recomputable, 320 consistent (90.65%), 29 discrepancy + 4 gross = 33
flagged (9.35%)**.

## How each flag was classified

Every recomputed p in this file comes from `scipy.stats.{f,t,norm}.sf` at scipy 1.17.1
(script: `/private/tmp/.../adjudicate.py`, seed 20260804 printed — no stochastic step is
involved; all values are closed-form distribution tails). Six mechanism classes are used,
and where a class makes a testable prediction, the prediction was run:

| Class | Definition | Test applied |
|---|---|---|
| **S** sphericity-corrected RM-ANOVA | The article states a Mauchly / Greenhouse-Geisser / Huynh-Feldt correction, or prints a fractional numerator df. The reported p belongs to the corrected model; recomputing from the printed df pair cannot reproduce it. | **Feasibility test:** is the reported p inside the interval spanned by scaling both df by epsilon from 1 down to the Greenhouse-Geisser lower bound 1/df1? |
| **M** multiplicity-adjusted post-hoc p | The reported value is a Tukey / Dunnett / Sidak-adjusted pairwise p, necessarily >= the raw-statistic p the engine recomputes. | reported p > raw p, and the adjusted/raw inflation lies inside the range observed across the *same* parenthetical family in that article. |
| **X** mixed-effects (REML) model p | The article states a mixed-effects / REML fit; its p comes from the fitted model, not a central F on the printed df. | design statement quoted from the article. |
| **B** bound-style p reporting | The reported value is a bound used as a point value: `p = 0.001` for p < 0.001, `p = 0.000`, `p > 0.99`. | conclusion unchanged; the printed value is on the correct side. |
| **R** reported-precision near-miss | \|reported − recomputed\| <= **2 units of the reported p's last printed digit**; the flag is an artefact of the engine's rounding window being narrower than the article's actual precision. | arithmetic, shown per row. |
| **G** genuine reporting inconsistency | None of S/M/X/B/R applies, **and** the article's own numbers demonstrate the inconsistency (a duplicate report that recomputes correctly, a neighbouring effect that recomputes exactly, an effect size incompatible with the printed statistic, or a correction range that provably cannot reach the printed p). | shown per row. |

## Table 7 — the 33 flags

| Class | n | Why these are not confirmed author errors (or, for G, why they are candidates) |
|---|---:|---|
| **S** Sphericity-corrected RM-ANOVA (Greenhouse-Geisser / Huynh-Feldt) | **11** | Uncorrected or partially corrected df printed with the corrected p. A limitation shared with statcheck, which flags 11 of the same claims. |
| **M** Multiplicity-adjusted post-hoc p (Tukey / Dunnett) | **7** | The reported p is an adjusted pairwise p; the engine recomputes the raw-statistic p. statcheck flags all 7 too. |
| **X** Mixed-effects (REML) model p | **2** | The article states a mixed-effects ANOVA; the printed F and df do not carry its p. |
| **B** Bound-style p reporting | **2** | `p = 0.001` / `p = 0.01` used as a ceiling for a hugely significant F; conclusion unchanged. |
| **R** Reported-precision near-miss (<= 2 last-digit units) | **4** | Recompute and report agree to the precision the article prints, minus at most one unit in the last place. |
| **G** Genuine candidate reporting inconsistency | **7** | Demonstrable from the article's own numbers; surfaced for human review. |
| **Total** | **33** | 29 discrepancy-level + 4 decision-level |

11 + 7 + 2 + 2 + 4 + 7 = **33**. Explainable-by-mechanism (S+M+X+B+R) = **26**;
genuine candidates (G) = **7**.

### Decision-level ("gross") flags: 4 — and none is a confirmed conclusion-altering error

| Article | Statistic | Class | Why it is not a confirmed decision error |
|---|---|---|---|
| PMC12704721 | `F(1,3) = 9.6001, P = 0.0269` → 0.0533621 | **X** | Reported as a **mixed-effects ANOVA** (n = 4). The engine's p (0.0534) is a central-F tail on the printed df; the model's p is not. |
| PMC13223457 | `F(2,58) = 3.728, p = 0.061` → 0.0299832 | **S** | The article states Mauchly + Greenhouse-Geisser epsilon. GG feasibility: p ranges 0.0299832 (eps = 1) to 0.0633364 (eps = 1/2); **0.061 is inside**. |
| PMC13223804 | `F(1,16) = 8.66, p = 0.20` → 0.0095528 | **M** | Sits inside the same parenthetical pairwise family as flags 25–30; reported/raw inflation 20.9x is inside that family's observed 1.1x–58.3x range (its sibling `F(1,16) = 35.62, p < 0.001` needs 50.8x). **Cannot be distinguished from a Prism-adjusted p** — so it must be classified with its siblings, not against them. |
| PMC13224422 | `t(91) = 2.28, p = 0.050` → 0.024944 | **G** | A genuine discrepancy, but the "decision error" label is the engine's: it scores `p = 0.050` as non-significant. The article calls the result significant, and the recompute (0.0249) **agrees with the article's conclusion**. Nothing about the conclusion changes. |

**Honest consequence:** at the current engine, **no flag in this corpus is a confirmed
conclusion-altering author error.** The manuscript must not claim one.

## Per-claim adjudication (all 33)

Order and numbering follow `results.json`.

### PMC12704721 — 14 recomputable, 5 flags (was 0 recomputable at `d41ee20`)

Methods: one-way / two-way ANOVA, "mixed-effects ANOVA", repeated-measures ANOVA;
GraphPad-style 4-decimal P values. No sphericity/Mauchly/Greenhouse/Huynh string
anywhere in the text (`grep -oi` count 0).

| # | Statistic | Recomputed | Class | Reason |
|---:|---|---|---|---|
| 1 | `F(1,3) = 9.6001, P = 0.0269` | 0.0533621 | **X** | Sentence reads "assessed using a mixed-effects ANOVA for CP [F(1,3) = 9.6001, P = 0.0269], CA1 [F(1,3) = 46.8714, P = 0.0064], and SN [F(1,3) = 39.7524, P = 0.0086]". Decision-level flag; see table above. |
| 2 | `F(1,3) = 39.7524, P = 0.0086` | 0.00806177 | **X** | Same mixed-effects sentence. (The third member, `F(1,3) = 46.8714, P = 0.0064` → 0.00637851, is **consistent** and is not flagged.) |
| 3 | `F(1,8) = 0.2387, P = 0.6396` | 0.638257 | **G** | The Results text reports the *same* result as `F(1,8) = 0.2367, P = 0.6396`, and **0.2367 recomputes to 0.639648 = the printed 0.6396 exactly**. The figure legend's `0.2387` is therefore a transcription typo, demonstrated by the article's own duplicate. Conclusion unchanged (both non-significant). |
| 4 | `F(1,7) = 22.4108, P = 0.0004` | 0.00212263 | **G** | `P = 0.0004` is the correct p for the article's **other** statistic, `F(1,8) = 34.988` (recomputes 0.00035566 ≈ 0.0004). The p has been carried onto a different F/df pair. Conclusion unchanged (both < 0.05). |
| 5 | `F(1,7) = 22.4108, P = 0.0004` | 0.00212263 | **G** | The identical claim, restated in the Results text — one underlying error reported twice, counted twice by the engine. |

Noted but **flagged by neither tool**: the article reports the same effect as
`F(1,9) = 83.8631` in the figure legend and `F(1,9) = 93.8631` in the Results text.
Both are `P < 0.0001` and both recompute to < 0.0001 (7.41e-06 and 4.65e-06), so a
consistency checker cannot see the digit transposition. A useful limit to state.

### PMC13223243 — 45 recomputable, 1 flag

| # | Statistic | Recomputed | Class | Reason |
|---:|---|---|---|---|
| 6 | `F(1.86, 28.30) = 6.535, p = 0.011` | 0.00544051 | **S** | Methods: "two-way repeated measures ANOVA … or a mixed-effects model (REML) … the **Geisser-Greenhouse correction** was applied to account for potential violations of sphericity". Numerator df is fractional. The same sentence prints `F(1.286, 28.30) = 29.08` — **two different numerator df sharing one denominator df (28.30)**, which a genuine epsilon scaling cannot produce, so the printed df pair is not the pair that produced the p. (At `d41ee20` this claim was a *gross* flag because the old extractor mis-paired a stray "p > 0.05"; the fix demoted it to discrepancy-level.) |

### PMC13223308 — 4 recomputable, 1 flag

| # | Statistic | Recomputed | Class | Reason |
|---:|---|---|---|---|
| 7 | `F(4,10) = 2513, p = 0.001` | 5.81259e-15 | **B** | "ANOVA demonstrated that rapid mixing speed had a **highly significant** effect … F(4,10) = 2513, p = 0.001, with a very large effect size (η² = 0.999)". `p = 0.001` is the article's reporting floor for p < 0.001; conclusion unchanged. |

### PMC13223338 — 17 recomputable, 4 flags

| # | Statistic | Recomputed | Class | Reason |
|---:|---|---|---|---|
| 8 | `F(1,78) = 106.5, p=0.01` | 3.07443e-16 | **B** | One-way ANOVA on age between two groups; `p = 0.01` used as a floor. Conclusion unchanged. |
| 9 | `F(1,75) = 4.02, p = .04` | 0.0485727 | **R** | Difference 0.0086 = **0.86 units** of the reported last digit (0.01): 0.0486 prints as .05 under rounding, .04 under truncation. Statistic-rounding interval F ∈ [4.015, 4.025] → p ∈ [0.048437, 0.048709], which misses the reported window [0.035, 0.045], hence the flag. Both values are < 0.05. |
| 10 | `F(1,75) = 1.60, p=.69` | 0.209819 | **G** | **Every** sibling effect in the two ANCOVA sentences recomputes to the printed 2 dp exactly: 1.86→0.1767 (.18), 5.32→0.02385 (.024), 1.32→0.2542 (.25), 1.43→0.2355 (.23). Additionally the printed ηp² = 4.81e-04 is impossible for F = 1.60 with df = (1,75), which implies ηp² = F/(F+df2) = 0.0209. Conclusion unchanged (both > .05). |
| 11 | `t(96) = -0.197, p = 0.86` | 0.844244 | **R** | 1.6 units of the reported last digit. Its companion post-hoc `t(96) = -2.26, p = .026` recomputes to 0.026081 **exactly**, so no adjustment is in play; 0.8442 prints as .84. Conclusion unchanged. |

### PMC13223457 — 9 recomputable, 6 flags (unchanged from `d41ee20`)

Methods: "repeated measurement ANOVA … three MRI scanners … If the assumption of
**Mauchly's Test for Sphericity** (statistic W, p < 0.05) was violated … the results were
adjusted using the **Greenhouse-Geisser epsilon (GGe)**". 30 patients each scanned on all
three scanners.

Greenhouse-Geisser feasibility test — is the reported p inside [p(eps=1), p(eps=1/2)]?

| # | Statistic | p(eps=1) | p(eps=1/2) | Reported | Inside? | Class |
|---:|---|---|---|---|---|---|
| 12 | `F(2,58) = 3.728` | 0.0299832 | 0.0633364 | 0.061 | **yes** | **S** (decision-level) |
| 13 | `F(2,58) = 2.885` | 0.0639051 | 0.100114 | 0.098 | **yes** | **S** |
| 14 | `F(2,58) = 3.015` | 0.0567924 | 0.0931115 | 0.091 | **yes** | **S** |
| 15 | `F(2,58) = 2.475` | 0.0930113 | 0.126517 | 0.123 | **yes** | **S** |
| 16 | `F(2,58) = 0.491` | 0.614535 | 0.489066 | 0.500 | **yes** | **S** |
| 17 | `F(2,58) = 0.9078` | 0.409065 | 0.348573 | 0.353 | **yes** | **S** |

All six reported p-values are reachable by a Greenhouse-Geisser epsilon in [1/2, 1].
This **replaces** the previous file's hand-waving on rows 16 and 17 ("the opposite of the
Greenhouse-Geisser direction; could be coarse rounding"): for F < 1 the corrected p moves
*down*, not up, so 0.500 and 0.353 are exactly what the correction predicts. No
co-author confirmation is outstanding.

### PMC13223527 — 88 recomputable, 5 flags

Methods: analysed in **JASP 0.19.0**; "the **Huynh-Felt** procedure was employed to correct
for violations of sphericity in **all repeated measures**."

| # | Statistic | Recomputed | Class | Reason |
|---:|---|---|---|---|
| 18 | `F(1,22) = 0.560, p = 0.692` | 0.462186 | **G** | Numerator df = 1, so a 2-level within factor: **Huynh-Feldt epsilon is identically 1 and no correction is possible** (feasibility interval collapses to the single value 0.462186). The other three effects in the same sentence recompute exactly — `F(1,22) = 0.009` → 0.925278 (.925), `F(2,21) = 0.098` → 0.907061 (.907), `F(5.293,21) = 0.624` → **0.691400 = the printed .691** — and the flagged value 0.692 is one digit from that adjacent 0.691. A transcription slip. Conclusion unchanged. |
| 19 | `F(3.437,21) = 0.973, p = 0.425` | 0.433323 | **S** | Fractional numerator df with an **integer** denominator df: a real HF correction scales both. Solving for the denominator df that reproduces the printed p gives **35.8**, not 21 (ratio 1.705). |
| 20 | `F(3.844,21) = 0.746, p = 0.561` | 0.566782 | **S** | Denominator df needed: **44.38** (ratio 2.113). |
| 21 | `F(1.437,22) = 1.125, p = 0.320` | 0.324289 | **S** | Denominator df needed: **31.39** (ratio 1.427). |
| 22 | `F(2.809,21) = 0.678, p = 0.563` | 0.566087 | **S** | Denominator df needed: **30.58** (ratio 1.456). |

(The unflagged `F(5.293,21) = 0.624` would need denominator df 38.37 too — it escapes only
because the F tail is flat there. Its agreement is luck, not a difference in kind.)

### PMC13223791 — 4 recomputable, 1 flag

| # | Statistic | Recomputed | Class | Reason |
|---:|---|---|---|---|
| 23 | `F(6,128) = 6.8, p = 0.03, ηp² = 0.18` | 2.81474e-06 | **G** | The word sphericity / Mauchly / Greenhouse / Huynh does **not appear anywhere** in the article (`grep -oi` count 0). And a correction cannot rescue it: even the **maximally conservative Greenhouse-Geisser lower bound** (eps = 1/6, i.e. df → (1, 21.33)) gives p = **0.0163104**, so **no epsilon in [1/6, 1] can produce 0.03**. The printed ηp² = 0.18 implies F = 4.6829 → p = 2.4e-04, also far from 0.03. Conclusion unchanged (both < 0.05); the reported p is the internally inconsistent number. This is the corpus's cleanest genuine candidate. |

### PMC13223804 — 19 recomputable, 7 flags

Methods mention **two-way ANOVA** (5x), **Tukey** (1x) and **Dunnett** (1x). All seven
flags sit inside parenthetical lists of pairwise comparisons of the form
"n = 5 per group, two-way ANOVA, interaction: F(…) = …; siControl+PBS vs.
siControl+L-BAIBA, F(…) = …; …".

Adjusted/raw inflation across that family (flagged and unflagged members together):

| Statistic | raw p | reported p | reported/raw | flagged |
|---|---|---|---:|---|
| `F(1,16) = 35.62, p < 0.001` | 1.967e-05 | 0.001 | 50.8x | no |
| `F(1,16) = 8.66, p = 0.20` | 0.0095528 | 0.20 | 20.9x | **24** |
| `F(1,16) = 0.03, p > 0.99` | 0.864662 | 0.99 | 1.1x | **25** |
| `F(1,8) = 68.41, p = 0.002` | 3.433e-05 | 0.002 | 58.3x | **26** |
| `F(1,8) = 0.40, p = 0.97` | 0.544737 | 0.97 | 1.8x | **27** |
| `F(1,8) = 0.36, p = 0.97` | 0.56511 | 0.97 | 1.7x | **28** |
| `F(1,8) = 58.16, p = 0.003` | 6.152e-05 | 0.003 | 48.8x | **29** |
| `F(1,8) = 0.45, p = 0.96` | 0.521227 | 0.96 | 1.8x | **30** |

Every reported value exceeds its raw p, and every inflation lies inside 1.1x–58.3x. All
seven are therefore class **M**. **This includes #24** (`F(1,16) = 8.66, p = 0.20`), which
earlier drafts singled out as the corpus's one unambiguous conclusion-altering error: its
20.9x inflation is smaller than that of two unflagged siblings in the same list, so
classifying it as an author error while classifying #26–#30 as adjusted-p false positives
is not defensible. It goes with its siblings.

### PMC13224422 — 10 recomputable, 1 flag

| # | Statistic | Recomputed | Class | Reason |
|---:|---|---|---|---|
| 31 | `t(91) = 2.28, p = 0.050` | 0.024944 | **G** | Independent-samples t-test (males vs females, years of experience) — no repeated-measures or multiplicity mechanism available. 0.050 vs 0.0249 is beyond the reported precision. The engine labels it a decision error only because it treats `p = 0.050` as non-significant; the article calls the result significant and **the recompute agrees with the article**. A genuine reporting discrepancy, not a conclusion change. |

### PMC13225248 — 34 recomputable, 1 flag (was 0 recomputable at `d41ee20`)

| # | Statistic | Recomputed | Class | Reason |
|---:|---|---|---|---|
| 32 | `F(1,125) = 1.79, P = 0.185` | 0.183355 | **R** | 1.6 units of the reported last digit. Statistic interval F ∈ [1.785, 1.795] → p ∈ [0.182749, 0.183964], just short of the reported window [0.1845, 0.1855]. Numerator df = 1, so no sphericity correction exists. Conclusion unchanged. |

### PMC13225301 — 29 recomputable, 1 flag

| # | Statistic | Recomputed | Class | Reason |
|---:|---|---|---|---|
| 33 | `t(9) = 4.10, p = 0.0026` | 0.00267671 | **R** | **0.77 units** of the reported last digit (1e-04). Statistic interval t ∈ [4.095, 4.105] → p ∈ [0.00265678, 0.00269679], which just misses the reported window [0.00255, 0.00265] by 2.7e-05. Pure rounding. |

## What the engine fix removed

The `Z = 1.96` sample-size-formula false positive (PMC13224458, Cochran's formula with an
assumed proportion p = 0.5) that was flag #19 in the old 19-item taxonomy **is gone**. The
`z_statistic` claim is still extracted, but the extractor no longer pairs it with the
`p = 0.5` on the following line, so it is no longer recomputable (that article's
recomputable count fell 9 → 8 and its flag count 1 → 0). The "sample-size critical value"
category is therefore **empty** at the current engine and must be dropped from Table 7 and
from the Limitations sentence that cites it.

## Remaining limitations this corpus demonstrates

1. **Sphericity and multiplicity dominate the flag set** (18 of 33). Neither tool recovers
   an epsilon or an adjusted p from a printed statistic. This is a property of the task,
   not of either implementation.
2. **Bound-style p reporting** (`p = 0.001`, `p = 0.000`, `p > 0.99`) is common and is not
   an error, but the two tools treat it differently (see `STATCHECK_COMPARISON.md`).
3. **The rounding window is a two-sided knob.** Four flags (class R) are near-misses at the
   article's own printed precision; widening the window would silence them but would also
   silence real small-p errors, which is exactly why the flat additive tolerance was removed
   from the exact-match branch (audit 2026-06-04, F-06). It survives only in the inequality
   branch, where it has a documented false-negative cost — see `STATCHECK_COMPARISON.md`.
4. **Duplicate reporting inflates counts.** Flags 4 and 5 are one error printed twice.
   Per-claim counts are not per-error counts.
