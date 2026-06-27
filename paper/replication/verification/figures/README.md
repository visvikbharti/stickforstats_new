# Census figures

Data-analysis plots for the biomedical PMC OA consistency census (10,103 papers,
post the 2026-06-26 extractor fix). Regenerate with:

```bash
.venv-django/bin/python paper/replication/verification/make_census_figures.py
```

Inputs (external drive `/Volumes/My_Passport` must be mounted):
- `census_census_corpus_v2_2026-06-25.jsonl` — 10,103 per-paper records
- `flagged_inconsistencies.jsonl` — 333 flagged claims (reported_p, recomputed_p, claim_type, severity)

All numbers cross-check against the committed reports (`CENSUS_REPORT_LARGE`,
`FP_VALIDATION_REPORT`, `CENSUS_IPW_REPORT`, `CENSUS_OA_PILOT_REPORT`).

| file | what it shows |
|---|---|
| `fig1_corpus_funnel` | paper-level attrition: 10,200 enumerated → 10,101 body → 1,939 with a test claim → 341 with a checkable claim → 129 with an inconsistency |
| `fig2_headline_outcome` | claim-level outcome over 3,005 checkable claims: consistent vs inconsistent (333, 11.1%) vs decision-changing (52, 1.7%) |
| `fig3_fp_validation` | false-positive validation of the 333 flags: TRUE_LIKELY 262 / REVIEW_P_BOUND 25 / FP_ONE_TAILED 46 / FP_MISEXTRACTION 0 (extractor fix 157→0) |
| `fig4_reported_vs_recomputed_p` | log-log scatter of reported vs recomputed p for all 333 flags, colored by FP category, ★ = decision-changing — the "money plot" |
| `fig5_by_statistic_type` | flagged inconsistencies by statistic type (t / F / r / z / chi²), all vs likely-true |
| `fig6_rate_robustness` | the rate is robust & single-digit across frames: raw 11.1% · IPW 10.5% · likely-true 8.7% · independent OA 5.6% |
| `fig7_article_types` | corpus composition by article type |

Each figure is written as both `.png` (200 dpi) and `.svg` (vector, for the manuscript).
