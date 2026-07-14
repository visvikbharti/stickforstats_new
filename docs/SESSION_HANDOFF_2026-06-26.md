# Session Handoff — 2026-06-26 (Extractor p-mis-pairing fix)

> **Dated snapshot — superseded.** This records what was believed on the date in its title.
> For the current state of the project, start at [`README.md`](README.md) (the undated index),
> then [`STATUS_2026-07-14.md`](STATUS_2026-07-14.md) and [`TODO_2026-07-14.md`](TODO_2026-07-14.md).
> **Do not trust a "Still open" section in a dated document without re-checking it.**

**Timestamp:** 2026-06-26 IST · **Branch:** `docs/plos-compbio-submission`
**Purpose:** self-contained record of today's single focused task — fixing the extractor
"p-mis-pairing" false positive identified as #1 in `docs/SESSION_HANDOFF_2026-06-25.md` (§H/§J1).
Companion memory: `session-2026-06-26-extractor-pmispairing-fix.md`. Prior session:
`docs/SESSION_HANDOFF_2026-06-25.md` (still the reference for the verifier surface / genomics /
census infrastructure). **Nothing git-committed (per the user's norm).**

> ⚠ HARD PREREQUISITE unchanged: mount `/Volumes/My_Passport` first (corpus/ledger/GEO-cache live ONLY
> there). Use ONLY `.venv-django`. Launch background fetches/census with ABSOLUTE paths.

---

## TL;DR
The handoff's "extractor p-mis-pairing bug" turned out to be **5 distinct mechanisms** (traced
empirically to source XMLs, not assumed). All fixed in `claim_extractor.py` + `consistency_core.py`,
with a 22-test regression suite. **Apples-to-apples on the SAME 10,103-paper corpus** (pre-fix obtained
by `git stash` of just the two files): the dominant false-positive category `FP_MISEXTRACTION` went
**157 → 0**, the raw census inconsistency rate **14.5% → 11.1%**, decision-changing **4.2% → 1.7%**,
and the adjudicated clear-false-positive rate **45% → 14%**. No statcheck-benchmark regression
(recall 97.7% / precision 98.1%).

## The 5 mechanisms (each grounded in a real PMCID)
1. **Mis-paired far p** — a generic statistic ("F = 5.48", no p in its own match) borrowed a standalone
   p from ≤300 chars away (the handoff's framing; the minority of cases).
2. **`t (1, 644)` two-df** (PMC6096657 regression table, 32 of 80 `FP_MISEXTRACTION`) — recompute
   silently used df[0]=1 → wrong p. The p was genuinely adjacent, so a proximity tweak does NOT fix it.
3. **`;`-separated / effect-size-interposed / fractional-df results** (PMC11888203 `F(1,31)=5.484; p=0.217`;
   PMC8379065 `F(2,491)=9.60, ηp²=.019, p=.002`; PMC8465154 `F(1.74,227.94)=29.876, p=0.097`) — the p IS
   correctly paired; strict patterns missed it (comma-only separator, integer-only df1), so it dropped
   to the generic+merge path and the adjudicator's "no p in raw_text → FP" rule MISLABELLED these
   GENUINE inconsistencies as false positives.
4. **Effect-size subscript / function notation** (PMC5762637 `d z = 1.1` = Cohen's d_z; `Z(Y) = 0`).
5. **`p = 1` parsed as 0.1** (PMC6111889) — the regex's `\.?` swallowed the dot, so "1" and ".1" were
   indistinguishable.

## Changes (files)
- `backend/core/manuscript/claim_extractor.py`
  - **Scoped p-attachment** in `_merge_claims(text, ...)`: a standalone p attaches ONLY to the closest
    PRECEDING statistic still lacking a p, within **MERGE_WINDOW=40** chars (calibrated — across 400
    corpus papers every legit generic-p merge had gap ≤33, median 1), with no `_RESULT_BREAK`
    (`[.!?]`+space, or newline) between; on merge, `raw_text` is extended through the p (provenance).
    CI/effect-size/sample-size merges keep the looser 300-char rule (not recomputed → benign).
  - **Generic-stat guards** in `_extract_generic_stats`: `_EFFECT_SIZE_PREFIX` skips "d z"/"d_z"/"g z";
    a df-group with no digit ("Z(Y)") is skipped.
  - **p-parse**: the leading "." is captured INSIDE all 8 p-groups (`\.?(` → `(\.?`); `_parse_p_value`
    treats bare "0"/"1" as real point values, other bare digits as stripped fractions.
  - **Strict patterns**: accept `;` as well as `,` before p (`,?`→`[;,]?`); F df1 may be fractional
    (`_extract_f_tests` parses float df1).
- `backend/core/manuscript/consistency_core.py`
  - **df-arity guard**: `_resolve_single_df(..., require_single=True)` for t & chi → a 2-element df is
    not recomputable. F keeps its 2 df.
  - `decimals_from_token(is_p=True)` handles BOTH ".049" and the legacy stripped "049"/"05"/"1" forms.
- `paper/replication/verification/census_jats.py` — kill-safe atomic `_flush()` every 1000 papers;
  dynamic "Generated <date>" stamp.
- `paper/replication/verification/adjudicate_inconsistencies.py` — header + interpretive prose updated
  to the post-fix reality (FP_MISEXTRACTION eliminated; residual FP dominated by one-sided p).
- `backend/core/tests/test_claim_extractor_pmispairing.py` — NEW, 22 regression tests.

## Measured results (10,103-paper corpus)
| metric | PRE-FIX | POST-FIX |
|---|---|---|
| census inconsistent-claim rate | 14.5% (450/3110) | **11.1% (333/3005)** |
| decision-changing | 4.2% (131) | **1.7% (52)** |
| papers w/ inconsistency | 42.0% (148/352) | **37.8% (129/341)** |
| flagged-set `FP_MISEXTRACTION` | 157 (35%) | **0** |
| clear false positives (adjudicate) | 202/450 = 45% | **46/333 = 14%** |
| `TRUE_LIKELY` share | 51% | **79%** |
| statcheck recall / precision | — | **97.7% / 98.1%** (no regression) |

Verification: `eval_vs_statcheck.py`, `run_all.py` (ALL PASS), 55 extractor/consistency tests +
125 manuscript/verify tests pass, flake8 clean.

## Artifacts / backups (on the drive)
- Rebuilt ledger: `census_2026-06-25/census_census_corpus_v2_2026-06-25.jsonl` (10,103, post-fix).
- Pre-fix backups: `census_PREFIX_10k_2026-06-25.jsonl.bak`,
  `flagged_inconsistencies_PREFIX_2026-06-25.jsonl.bak`.
- Reports (repo): `CENSUS_REPORT_LARGE_2026-06-25.md`, `FP_VALIDATION_REPORT_2026-06-25.md` — both
  regenerated post-fix.

## How to reproduce / resume
- Re-measure FP rate: `cd backend && DJANGO_DEBUG=True ../.venv-django/bin/python
  ../paper/replication/verification/inspect_inconsistencies.py` then `adjudicate_inconsistencies.py`.
- Full re-census (forces a rebuild): move the ledger aside, then
  `../.venv-django/bin/python ../paper/replication/verification/census_jats.py
  /Volumes/My_Passport/stickforstats_corpus/census_corpus_v2_2026-06-25` (kill-safe + resumable).
  To write the canonical LARGE report, call `census_jats.run_census(dir, summary_path=.../CENSUS_REPORT_LARGE_2026-06-25.md)`.

## Adversarial review (21-agent workflow)
4 review lenses (false-negatives / recall / over-guards / regex+consistency) → per-finding empirical
verification (agents ran the live extractor + corpus + git-worktree pre/post comparisons) → synthesis.
**Verdict: SAFE TO KEEP — net precision win, ZERO genuine inconsistencies lost across the 10k census.**
16 findings, **4 confirmed real (all minor), all FIXED**; the 12 dismissed include every
"directionality/40-char-window/require_single is too aggressive" claim — confirmed as the deliberate,
corpus-validated precision wins. The 4 fixes (all in this session's working tree, regression-pinned):
- **R1** — `_parse_p_value` crashed (ValueError) on a malformed two-dot token `.03.04` that the
  dot-capturing group can now match → `try/except`→`None` (degrade to not-checkable); the scoped merge
  skips `None`-valued p fragments. Contained at all prod boundaries already, 0 corpus occurrences, but a
  crash, so fixed regardless.
- **R2** — `_RESULT_BREAK` treated a soft PDF line-wrap (`stat\n(p=…)`) as a sentence break and detached
  a line-wrapped parenthetical p. This bites the **product PDF surface** (`parser.py` joins pages with
  `\n`), NOT the census (`jats_parser` space-joins, so census impact ≈ 0). Fix: the merge now
  whitespace-normalizes the gap (`re.sub(r"\s+"," ", between)`) before the break test; `_RESULT_BREAK`
  simplified to `[.!?](?:\s|$)`.
- **R3** — the df-arity guard was too broad for chi-square: `χ²(df, N)` is a 2-tuple but df[0] is
  unambiguous (chi has exactly one df), unlike t's genuinely-ambiguous `(1,644)`. Fix: keep
  `require_single=True` for **t_statistic only**; chi-square uses df[0]. (Recovers ~3 corpus chi claims,
  all consistent.)
- **R4** — bare `p = 0` got 0 decimals → a ±0.5 rounding window that masked a gross inconsistency. Fix:
  `decimals_from_token` special-cases only `"1"` (legit ANCOVA p=1); `"0"` keeps the ±0.05 window.

After R1–R4: 174 extractor/consistency/manuscript/verify tests pass; verification-core green (recall
97.7%); flake8 clean; ledger rebuilt with R3 (census numbers unchanged at the reported precision).
`test_claim_extractor_pmispairing.py` now 26 tests (22 original + 4 review-followup).

## Next (priority order, unchanged from 2026-06-25 §H)
1. OSF pre-reg §11 PI decisions → file before the FORMAL confirmatory census.
2. Formal census rigor: human κ double-coding on a gold subset; switch sampling to the PMC OA
   file-list frame (equal-probability, not day-clustered).
3. PI-gated: Case Study 4 / Group B correction + bioRxiv v2; venue (PLOS ONE / PeerJ / GigaByte / BMC).
4. Optional: extend the corpus 10k → 20k (numbers already converged; low marginal value).
