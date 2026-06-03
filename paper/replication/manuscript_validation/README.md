# Manuscript verification — accuracy / validation study

Reproducible validation of StickForStats' statistical-claim extraction and
statcheck-style p-value consistency checking on real open-access papers.

## Reproduce

```bash
# 1. Build the corpus (open-access PMC papers reporting inline APA statistics)
python paper/replication/manuscript_validation/fetch_corpus.py --retmax 300 --min-stats 3

# 2. Run extraction + consistency over the corpus
cd backend && python manage.py validate_corpus \
    ../paper/replication/manuscript_validation/corpus \
    --json ../paper/replication/manuscript_validation/results.json
```

`fetch_corpus.py` records the exact query + per-paper statistic counts in
`manifest.json`. The raw paper texts (`corpus/`) are git-ignored — they are
re-derivable from the manifest's PMCIDs and carry their own licences.

## Snapshot result (20-paper corpus)

980 claims extracted; 468 carried a test statistic; **295 recomputable**
(statistic + df + p of a supported type) → 275 consistent, with the remainder
flagged for manual review.

## Flag classification (manual review — what the validation actually found)

The recompute itself is scipy-exact, so flags are recompute-vs-reported
discrepancies. Manual review of the flagged claims puts them in these classes:

- **Genuine reporting inconsistencies** (statcheck would also flag): e.g.
  `F(6,128)=6.8, p=0.03` (recomputes to ≈3e-6), `F(1,16)=8.66, p=0.20`.
- **Greenhouse–Geisser corrected ANOVAs** — papers report *uncorrected* df with
  the *corrected* p (or fractional corrected df). Recomputing from the reported
  df disagrees. **This is a limitation shared with statcheck** (neither tool
  knows the sphericity correction); not a tool defect.
- **Sample-size / power formulas** — e.g. `Z = 1.96 … p = 0.5` is a sample-size
  formula (critical value + assumed proportion), not a hypothesis test. A
  semantic false positive (hard for any regex-based tool); documented limitation.

## Known extractor limitations (next robust fixes)

- **Thousands separators**: `F(2,6) = 3,950.2` is read as `3` (capture stops at
  the comma). Fix needs care to avoid corrupting df tuples like `F(2,600)`.
- Scientific notation `x 10ⁿ` is handled (`normalize_scientific_notation`).
- Impossible p-values (`p > 1`, usually an extraction artifact) are treated as
  not-checkable rather than flagged against the author.

## Engine notes

Both consistency surfaces (the report's "Consistency" tab and the "Issues"
findings) share one implementation: `core/manuscript/consistency_core.py`
(rounding- and inequality-aware, the method statcheck uses), so they cannot
disagree.
