# Codebook — human adjudication of flagged statistical inconsistencies

**Frozen for the pre-registered gold-set study** (`PREREGISTRATION.md` §6). Two coders use *this document
only* to classify each flagged claim; do not consult the tool's verdict. Read it fully before coding.

## What you are coding

Each row in `gold_set_coding_sheet.csv` is one statistical claim that the automated census flagged as
**internally inconsistent** (the recomputed two-tailed p disagreed with the reported p). Your job is to decide
**why** it was flagged — is it a *genuine* inconsistency in the paper, or an artifact of automated checking?
You assign **exactly one** of four categories.

You are given, per claim: `raw_text` (the verbatim reported result), `statistic`, `df`, `reported_p`,
`p_comparison` (`equals`/`less`/`greater`), and `recomputed_p` (the two-tailed p we computed from the statistic
and df). You are **not** given the tool's own classification (blinding).

## The four categories

Put the category label in your column (`coder1_category` or `coder2_category`). Use these exact labels:
`genuine`, `one_tailed`, `p_bound`, `mis_extraction`.

### 1. `mis_extraction` — the reported p does not belong to this statistic
The claim's own `raw_text` does **not** actually contain a point p-value attached to this statistic; the
`reported_p` was mis-paired from a neighbouring result. **Test:** look at `raw_text` — if there is no
`p = …` (or `P = …`) that clearly belongs to *this* statistic, code `mis_extraction`.
- *Example:* `raw_text = "t(28) = 2.50"` with a `reported_p` that appears nowhere in that text → `mis_extraction`.
- This is a tool false positive (extraction error), not a paper error.

### 2. `one_tailed` — the authors reported a one-sided p
The recomputed **two-tailed** p is approximately **twice** the reported p (within ~25%), i.e. the authors
almost certainly reported a **one-sided** test, which our two-tailed recompute cannot match. **Test:** is
`recomputed_p ≈ 2 × reported_p`? If yes (and a point p is present), code `one_tailed`.
- *Example:* `t(68) = 3.14, p = 0.001` — recomputed two-tailed ≈ 0.0025 ≈ 2×0.001 → `one_tailed`.
- *Example:* `F(1,28) = 10.92; P = 0.001` — recomputed ≈ 0.00261 → `one_tailed`.
- This is a tool false positive (the paper is internally fine for a one-sided test).

### 3. `p_bound` — p is reported as an inequality, comparison is ambiguous
The reported p is a **bound** (`p < x` or `p > x`), not a point value, so "recomputed vs reported" is
ambiguous and should be flagged for review rather than called a hard error. **Test:** is `p_comparison`
`less` or `greater` (i.e. `raw_text` shows `p < …` or `p > …`)? If yes, code `p_bound`.
- *Example:* `F(1,16) = 3.78, p < 0.05` — recomputed ≈ 0.070; the authors' `< 0.05` is wrong but it is a bound →
  `p_bound` (genuine-but-ambiguous; we hold these out of the hard "genuine" count).
- *Example:* `r = 0.18, P < 0.001` — recomputed ≈ 0.67 → `p_bound` (large gap, but still a bound).

### 4. `genuine` — a real internal inconsistency
The claim states **both** a recomputable statistic (with df) **and a point p** (`p = …`) in its own text, the
report is **not** one-sided (recomputed p is *not* ≈ 2× reported), and the recomputed p disagrees with the
reported p beyond rounding. This is a genuine internal inconsistency the study design cannot explain.
- *Example:* `r = 0.378, p = 0.014` — recomputed two-tailed ≈ 0.0096 (not ≈ 2×, not a bound) → `genuine`.
- *Example:* `z = 2.96; p = 0.017` — recomputed ≈ 0.0031 → `genuine`.
- *Example:* `t(67) = 0.449, p = 0.665` — recomputed ≈ 0.655 (small but real disagreement) → `genuine`
  (a rounding-level case; still code `genuine` if it is a point p, two-tailed, outside the rounding interval —
  note "rounding-level" in `notes` if you wish).

## Decision order (apply top-down; first match wins)
1. No point p attached to *this* statistic in `raw_text`? → `mis_extraction`.
2. Else `p_comparison` is `less`/`greater` (a bound)? → `p_bound`.
3. Else recomputed p ≈ 2 × reported p (within ~25%)? → `one_tailed`.
4. Else → `genuine`.

## Notes column
Use `notes` for anything ambiguous (e.g. "rounding-level", "two interpretations", "typo in df?"). If you are
genuinely unsure between two categories, code your best judgment and flag it in `notes`; the adjudicator
resolves disagreements.

## What you are NOT deciding
You are not re-reading the whole paper or judging scientific validity — only **why this flagged number
disagrees**. The separate 50-paper extraction gold set (read whole papers) is a different task with its own
sheet.
