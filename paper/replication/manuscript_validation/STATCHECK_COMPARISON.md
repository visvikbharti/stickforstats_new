# statcheck 1.5.0 vs the StickForStats retrospective-verification engine

Both tools recompute a p-value from a reported test statistic + degrees of freedom and flag
disagreement, on the **same 20-article corpus**. This file was rewritten on **2026-08-04**;
the previous version compared statcheck against the engine as it stood at commit `d41ee20`
(295 recomputable / 19 flagged / 5 decision errors), which is superseded, and framed the
result as *"statcheck favours literal recall while our engine favours precision"* — a
framing this file **retracts** (see "Why the old framing was wrong").

## Reproduce

```bash
# statcheck side  (R 4.4.1, statcheck 1.5.0)
cd paper/replication && Rscript statcheck_baseline.R
#   -> manuscript_validation/statcheck_results.csv
#   Statistics extracted by statcheck : 266
#   Inconsistencies (error == TRUE)   : 47
#   Decision errors (cross alpha)     : 2

# our side  (git 8fbada2 = v1.1.0-104-g8fbada2; Python 3.11.11, numpy 2.4.6, scipy 1.17.1)
cd backend && DJANGO_SETTINGS_MODULE=stickforstats.settings ../.venv-django/bin/python \
    manage.py validate_corpus ../paper/replication/manuscript_validation/corpus \
    --json ../paper/replication/manuscript_validation/results.json
#   AGGREGATE over 20 papers: 1104 claims, 459 with a statistic, 353 recomputable
#     -> 320 consistent, 29 discrepancy, 4 gross error(s).
```

Re-running `statcheck_baseline.R` on 2026-08-04 produced a `statcheck_results.csv`
**byte-identical** to the shipped file (`diff -q` clean), so the statcheck half of this
comparison reproduces exactly.

## Table 8 — head-to-head, stated descriptively

The two tools do not measure the same quantity, so the table is split into what each tool
*covered*, what each *flagged*, and how the two flag sets *overlap*. No precision or recall
figure is reported: neither is identifiable without a ground-truth adjudication of all
266 + 353 extracted claims, which does not exist for this corpus.

### 8a — coverage

| | statcheck 1.5.0 | StickForStats engine |
|---|---|---|
| Articles yielding >= 1 checkable statistic | **14 / 20** | **20 / 20** |
| Checkable (recomputable) statistics | **266** | **353** |
| Test types present in the output | F 237, t 28, Z 1 | F, t, chi-square, Z, r |

The comparable quantities are statcheck's 266 and our 353: statcheck emits a row only for a
statistic it can recompute, and 353 is our count of fully specified (statistic + df + p)
claims. Our extractor also produces 1104 claim spans of which 459 carry a statistic; those
larger numbers describe a different construct (candidate claim spans, including bare
p-values) and are **not** comparable to 266.

### 8b — flags

| | statcheck 1.5.0 | StickForStats engine |
|---|---|---|
| Flagged inconsistent | **47 of 266 (17.67%)** | **33 of 353 (9.35%)** |
| of which decision-level (opposite sides of alpha = 0.05) | **2** | **4** |

The two rates have **different denominators and different flagging rules**, so their ratio
is not an error rate or a quality ratio. In particular our engine adds a flat +/-0.005
tolerance in the *inequality* branch that statcheck does not have; section "The inequality
tolerance" below quantifies what that costs.

### 8c — overlap of the two flag sets

Matched on (article, test type, df multiset, |test statistic|):

| | count | what they are |
|---|---:|---|
| Flagged by **both** tools | **27** | the same claims, same articles |
| Flagged by **statcheck only** | **20** | 16 `p > 0.001` inequality claims in PMC13224698; 3 scientific-notation p-values in PMC13223457; 1 `p = 0.000` in PMC13224458 |
| Flagged by **us only** | **6** | 5 in PMC12704721 and 1 in PMC13225248 — **both articles statcheck extracts zero statistics from** |

27 + 6 = 33 (ours); 27 + 20 = 47 (statcheck).

### 8d — both flag sets read back against their source articles

Same six mechanism classes as `TABLE7_CLASSIFICATION.md`, applied symmetrically. This is
the row the previous version of this comparison was missing: statcheck's 47 had never been
adjudicated while ours had.

| Mechanism | statcheck | ours |
|---|---:|---:|
| Sphericity-corrected RM-ANOVA (Greenhouse-Geisser / Huynh-Feldt) | 11 | 11 |
| Multiplicity-adjusted post-hoc p (Tukey / Dunnett) | 7 | 7 |
| Mixed-effects (REML) model p | 0 | 2 |
| Bound-style p reporting (`p = .001`, `p = .000`, `p > .99`) | 3 | 2 |
| Reported-precision near-miss (<= 2 last-digit units) | 3 | 4 |
| **Tool formatting artefact** — p written in scientific notation | **3** | 0 |
| **Inequality-form author typo** — `p > .001` where `p < .001` was meant | **16** | **0 (missed)** |
| Genuine candidate reporting inconsistency | 4 | 7 |
| **Total** | **47** | **33** |

Read honestly, that table says:

* **Neither tool is "cleaner".** statcheck carries 3 false positives our engine avoids (a
  formatting artefact). Our engine carries 16 **false negatives** statcheck catches (the
  `p > .001` typos), plus 2 mixed-effects and 1 extra near-miss flag statcheck never sees
  because it does not read those articles at all.
* **The 28-flag gap is not a quality gap.** 16 of it (57%) is one article's systematic
  `>`-for-`<` typo, which statcheck is right about; 3 more is a statcheck formatting bug;
  and our 6 extra flags are all in articles statcheck cannot read.
* **Our extra genuine candidates come from coverage, not from a better rule.** Of our 7
  genuine candidates, **3 are in PMC12704721**, one of the 6 articles statcheck extracts
  nothing from. On the 14 articles both tools read, the "genuine candidate" row is
  **4 for statcheck and 4 for us, and they are the same four claims** — `F(1,75) = 1.60,
  p = .69`, `F(1,22) = 0.560, p = 0.692`, `F(6,128) = 6.8, p = 0.03` and
  `t(91) = 2.28, p = 0.050`. (statcheck's 16 inequality-typo flags are also genuine author
  typos; they are broken out on their own row because they are 16 instances of one
  systematic error in one article, and because our engine misses every one of them.)

### 8e — decision-level flags

statcheck's 2 decision errors are `F(2,58) = 3.728, p = 0.061` (PMC13223457) and
`F(1,16) = 8.66, p = 0.20` (PMC13223804). Our 4 are those two plus
`F(1,3) = 9.6001, P = 0.0269` (PMC12704721) and `t(91) = 2.28, p = 0.050` (PMC13224422).

**None of the four is a confirmed conclusion-altering author error** —
`TABLE7_CLASSIFICATION.md` shows, with the recomputation for each, that they are
respectively a Greenhouse-Geisser-feasible p, a Prism-adjusted pairwise p, a mixed-effects
model p, and a knife-edge `p = 0.050` where our own recompute agrees with the article's
stated conclusion. "More decision errors" is therefore **not** a quality claim in either
direction and must not be presented as one.

## The inequality tolerance: what actually happens to `p > 0.001`

PMC13224698 writes `p > 0.001` **34 times** (and `p < 0.001` 4 times); 16 of the 34 are
attached to an F statistic and are extracted by both tools. statcheck flags all 16. Our
engine flags **0** of them.

The reason is **not** that "the significance decision is unchanged". It is a flat
tolerance. `consistency_core.classify`'s `greater_than` branch is

```python
consistent = p_hi >= p_value - tolerance      # tolerance = 0.005
```

which for any threshold x <= 0.005 is satisfied by every possible recomputed p, since
`p_hi >= 0`. Probed directly (scipy 1.17.1):

```
F(3,40)=287  'p > 0.0001'  recomputed=4.45e-27  consistent=True   decision_consistent=True
F(3,40)=287  'p > 0.001'   recomputed=4.45e-27  consistent=True   decision_consistent=True
F(3,40)=287  'p > 0.004'   recomputed=4.45e-27  consistent=True   decision_consistent=True
F(3,40)=287  'p > 0.005'   recomputed=4.45e-27  consistent=True   decision_consistent=True
F(3,40)=287  'p > 0.0051'  recomputed=4.45e-27  consistent=False  severity=major
F(3,40)=287  'p > 0.006'   recomputed=4.45e-27  consistent=False  severity=major
F(3,40)=287  'p > 0.05'    recomputed=4.45e-27  consistent=False  severity=gross_error
```

The flip is between x = 0.005 and x = 0.0051 — at the tolerance, not at alpha. And the
tolerance overrides the decision outright:

```
F(3,40)=0.01  'p > 0.001'  recomputed=0.9986 (NOT significant, while 'p > 0.001'
              is scored significant)  ->  is_consistent=True, is_decision_consistent=False,
              severity='none'         # passed despite a changed decision
```

So the engine **cannot flag any `p > x` claim with x <= 0.005, regardless of the
significance decision.** That is a false-negative hole, not a precision feature. It is the
one place where the flat additive tolerance survives; the exact-match branch dropped it in
the 2026-06-04 audit (finding F-06) precisely because it was masking small-p errors.

## statcheck's scientific-notation false positives

Three PMC13223457 claims are flagged by statcheck although the reported and recomputed
values agree to five significant figures:

| Claim | reported p | statcheck's computed p | statcheck error |
|---|---|---|---|
| `F(1,29) = 6.159, p = 1.911e-02` | 0.01911 | 0.019114 | TRUE |
| `F(1,29) = 5.269, p = 2.913e-02` | 0.02913 | 0.029131 | TRUE |
| `F(1,29) = 6.356, p = 1.745e-02` | 0.01745 | 0.017451 | TRUE |

Isolated with a two-line probe (`Rscript`, statcheck 1.5.0) — the *same* claim, same
reported and computed p, flagged only when the p is written in scientific notation:

```
  source                              raw reported_p   computed_p error
1    sci F (1, 29) = 6.159, p = 1.911e-02    0.01911 1.911401e-02  TRUE
2    dec   F (1, 29) = 6.159, p = 0.01911    0.01911 1.911401e-02  FALSE
3   dec4    F (1, 29) = 6.159, p = 0.0191    0.01910 1.911401e-02  FALSE
4   zero    F(15, 484) = 3.869, p = 0.000    0.00000 1.449924e-06  TRUE
5     gt   F (3, 40) = 287.606, p > 0.001    0.00100 4.273794e-27  TRUE
```

Row 4 also shows statcheck treating `p = 0.000` as an exact zero. Our extractor normalises
scientific notation and treats `p = 0.000` as `p < 0.0005`, so it avoids both.

## Per-article detail

Ours: recomputable / flagged / decision-level. statcheck: extracted / flagged / decision-level.

| Article | ours | statcheck |
|---|---|---|
| PMC12704721 | 14 / 5 / 1 | 0 / 0 / 0 |
| PMC12704728 | 4 / 0 / 0 | 0 / 0 / 0 |
| PMC13223243 | 45 / 1 / 0 | 45 / 1 / 0 |
| PMC13223308 | 4 / 1 / 0 | 2 / 1 / 0 |
| PMC13223338 | 17 / 4 / 0 | 20 / 4 / 0 |
| PMC13223457 | 9 / 6 / 1 | 9 / 9 / 1 |
| PMC13223527 | 88 / 5 / 0 | 86 / 5 / 0 |
| PMC13223738 | 22 / 0 / 0 | 0 / 0 / 0 |
| PMC13223791 | 4 / 1 / 0 | 4 / 1 / 0 |
| PMC13223804 | 19 / 7 / 1 | 15 / 7 / 1 |
| PMC13224422 | 10 / 1 / 1 | 10 / 1 / 0 |
| PMC13224435 | 7 / 0 / 0 | 7 / 0 / 0 |
| PMC13224458 | 8 / 0 / 0 | 8 / 1 / 0 |
| PMC13224698 | 18 / 0 / 0 | 18 / 16 / 0 |
| PMC13225232 | 6 / 0 / 0 | 0 / 0 / 0 |
| PMC13225248 | 34 / 1 / 0 | 0 / 0 / 0 |
| PMC13225301 | 29 / 1 / 0 | 31 / 1 / 0 |
| PMC13225338 | 4 / 0 / 0 | 4 / 0 / 0 |
| PMC13225384 | 3 / 0 / 0 | 0 / 0 / 0 |
| PMC7619117 | 8 / 0 / 0 | 7 / 0 / 0 |
| **Total** | **353 / 33 / 4** | **266 / 47 / 2** |

On the articles both tools read, extraction agrees closely (45 vs 45, 9 vs 9, 88 vs 86,
18 vs 18, 10 vs 10, 7 vs 7, 8 vs 8). The whole of the 353 - 266 = 87 gap is accounted for
by the 6 articles statcheck extracts nothing from (83 of our recomputable claims) plus
small per-article differences.

## Why the old framing was wrong

The previous version of this file, and the manuscript paragraph built on it, said statcheck
"favours literal recall (more flags, more false positives)" while our engine "favours
precision on decision-changing errors", and cited "5 vs 2 decision errors" as evidence.
Three things are wrong with that:

1. **Precision was never measured.** A lower flag rate under a wider tolerance is
   *leniency*. Once statcheck's 47 are adjudicated the same way ours are (8d), statcheck's
   only false positives are 3 formatting artefacts, and our engine's 16 misses are false
   negatives.
2. **The decision-error comparison is empty.** None of the 4 (previously 5) decision-level
   flags is a confirmed conclusion-altering error.
3. **The `p > 0.001` explanation was the flattering one, not the true one.** The mechanism
   is the flat +/-0.005 tolerance, and it fires regardless of the decision.

**Net, stated as the data supports it:** the two tools agree on 27 of the flags and on
their causes; the residual differences are (a) coverage — our extractor reads 6 articles
statcheck does not, (b) one statcheck formatting bug worth 3 flags, and (c) one
false-negative hole in our inequality handling worth 16. Both share the same substantive
blind spots — neither recovers a sphericity-corrected or multiplicity-adjusted p — and
those two mechanisms account for 18 of our 33 flags and 18 of statcheck's 47.
