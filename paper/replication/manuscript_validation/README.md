# Manuscript verification — accuracy / validation study

Reproducible validation of StickForStats' statistical-claim extraction and
statcheck-style p-value consistency checking on real open-access papers.

Everything below was executed at git `8fbada2` (`git describe`:
`v1.1.0-104-g8fbada2`) with Python 3.11.11, numpy 2.4.6, scipy 1.17.1, and
R 4.4.1 / statcheck 1.5.0. Do not trust a number in this directory that you
have not re-run.

## Reproduce

```bash
# 1a. Rebuild the corpus from the manifest's PINNED PMCID list (20 efetch calls,
#     ~90 s). No search is issued: re-running returns exactly these 20 articles.
python paper/replication/manuscript_validation/fetch_corpus.py

# 1b. Or, if you already have corpus/, just check it against the manifest:
python paper/replication/manuscript_validation/fetch_corpus.py --verify-only

# 2. Run extraction + consistency over the corpus
cd backend && DJANGO_SETTINGS_MODULE=stickforstats.settings python manage.py validate_corpus \
    ../paper/replication/manuscript_validation/corpus \
    --json ../paper/replication/manuscript_validation/results.json

# 3. statcheck baseline on the same corpus
cd paper/replication && Rscript statcheck_baseline.R
#    -> manuscript_validation/statcheck_results.csv
```

The raw paper texts (`corpus/`) are git-ignored — they carry their own licences.
`fetch_corpus.py` rebuilds them from the PMCIDs pinned in `manifest.json`;
`manifest.json` is read-only provenance and the script never writes it.

### How reproducible the corpus actually is

Re-fetched on **2026-08-04** and compared against the shipped texts:

| | count |
|---|---:|
| byte-identical to the shipped text | 0 / 20 |
| differ **only** inside the leading journal metadata, statistic counts identical | **20 / 20** |
| differ in the article body | **0 / 20** |
| fetch failures | 0 / 20 |

PMC has since added an NLM catalogue journal-ID token to the front matter of all
20 articles (and a PubMed ID plus one date digit to PMC13223338), which shifts
each file by 8–19 characters within its first ~1000 characters. **No reported
statistic changed**, and `validate_corpus` on the re-fetched corpus reproduces
the shipped `results.json` exactly — all 20 per-article records and the
aggregate are identical. `fetch_corpus.py` reports these three tiers separately
and exits non-zero only if a **body** difference or a fetch failure occurs; a
mutation test (altering one reported F deep in one article's body, and deleting
one `t(df)` token from another) confirms both `--verify-only` and the default
rebuild exit 1 and name the affected articles.

`--rediscover` re-runs the original E-utilities discovery query recorded in
`manifest.json`, for provenance only. It writes nothing, and it **cannot**
reproduce this corpus: the PMC Open Access subset grows daily and `esearch`
ordering is unstable.

## Snapshot result (20-paper corpus, current engine)

```
AGGREGATE over 20 papers: 1104 claims, 459 with a statistic, 353 recomputable
  -> 320 consistent, 29 discrepancy, 4 gross error(s).
```

**1104 claim spans extracted; 459 carried a test statistic; 353 recomputable**
(statistic + df + p of a supported type) → **320 consistent (90.65%)**, with
**33 flagged (9.35%)** for manual review: 29 discrepancy-level + 4
decision-level.

> **These numbers replaced an earlier set.** Drafts written before 2026-08-04
> printed 980 / 468 / 295 → 276 consistent (93.6%) with 19 flags and 5 decision
> errors. Those came from commit `d41ee20` (3 Jun 2026) and reproduce exactly at
> that commit — but the extractor has since been fixed for p-value mis-pairing
> and precision, which recovers 353 recomputable claims instead of 295 (it now
> reads three articles the old extractor recovered almost nothing from) and
> changes every aggregate. The old figures must not be cited against the
> released engine.

## Flag classification

The recompute itself is scipy-exact, so a flag is a
recompute-versus-reported discrepancy, not a confirmed author error. All 33 are
read back against their source article in **`TABLE7_CLASSIFICATION.md`**, which
records the recomputed p and the source evidence for every one. Summary:

| Mechanism | n |
|---|---:|
| Sphericity-corrected RM-ANOVA (Greenhouse-Geisser / Huynh-Feldt) | 11 |
| Multiplicity-adjusted post-hoc p (Tukey / Dunnett) | 7 |
| Mixed-effects (REML) model p | 2 |
| Bound-style p reporting (`p = .001`, `p > .99`) | 2 |
| Reported-precision near-miss (<= 2 last-digit units) | 4 |
| Genuine candidate reporting inconsistency | 7 |
| **Total** | **33** |

26 of the 33 have an identified non-author mechanism; 7 are genuine candidates.
**None of the 4 decision-level flags is a confirmed conclusion-altering error** —
see `TABLE7_CLASSIFICATION.md` for the per-flag recomputation that establishes
this.

The `Z = 1.96` sample-size-formula false positive that appeared in the old
19-item taxonomy is **gone**: the extractor no longer pairs that critical value
with the `p = 0.5` assumed proportion on the following line.

## Known extractor limitations

- **Thousands separators**: `F(2,6) = 3,950.2` is read as `3` (capture stops at
  the comma). Fixing this needs care to avoid corrupting df tuples like
  `F(2,600)`.
- **Inequality thresholds at or below 0.005 are unflaggable.** The
  `greater_than` branch of `consistency_core.classify` tests
  `p_hi >= p_value - 0.005`, which is satisfied by every possible recomputed p
  when the threshold is <= 0.005. Consequence measured on this corpus: our
  engine misses all **16** `p > 0.001` typos in PMC13224698 that statcheck
  catches. This is a false-negative hole, not a precision feature — see
  `STATCHECK_COMPARISON.md` for the probe output.
- Scientific notation `x 10ⁿ` is handled (`normalize_scientific_notation`);
  statcheck 1.5.0 is not (it raises 3 false positives on this corpus).
- Impossible p-values (`p > 1`, usually an extraction artifact) are treated as
  not-checkable rather than flagged against the author.
- Duplicate reporting inflates counts: two of the 33 flags are the same
  underlying error printed twice (PMC12704721's `F(1,7) = 22.4108, P = 0.0004`).

## Engine notes

Both consistency surfaces (the report's "Consistency" tab and the "Issues"
findings) share one implementation: `core/manuscript/consistency_core.py`
(rounding- and inequality-aware, the method statcheck uses), so they cannot
disagree. The exact-match branch compares **only** rounding intervals: the flat
additive +/-0.005 tolerance was removed there in the 2026-06-04 audit (finding
F-06) because it masked genuine small-p errors. It survives in the inequality
branch, with the cost documented above.

## Files

| File | What it is |
|---|---|
| `manifest.json` | pinned PMCID list + the original discovery query + per-article statistic counts. **Read-only provenance.** |
| `fetch_corpus.py` | rebuilds `corpus/` from the pinned PMCIDs; `--verify-only`, `--rediscover` |
| `results.json` | full `validate_corpus` output at git `8fbada2`, with a `_provenance` block (command, commit, library versions, per-article corpus SHA-256) |
| `TABLE7_CLASSIFICATION.md` | per-flag adjudication of all 33 flags against their source articles |
| `statcheck_results.csv` | per-statistic statcheck 1.5.0 output (`../statcheck_baseline.R`) |
| `STATCHECK_COMPARISON.md` | head-to-head, with statcheck's 47 flags adjudicated the same way as ours |
