# Case Study 4 — Real RNA-seq with Guardian

This directory contains all artifacts for Case Study 4 of the StickForStats
PLOS Comp Bio manuscript: a real-data demonstration of the genomics
differential-expression module with the Guardian assumption-checking pipeline,
running on a published GEO dataset.

The case study exists to address the most likely PLOS Comp Bio reviewer
objection of the existing manuscript ("is this really *computational
biology*?"). Case Studies 1-3 use a CRISPR scoring tool, a wine dataset, and a
1990s clinical-trial meta-analysis. Case Study 4 fills the gap with a real
high-throughput biology workflow: per-gene differential expression on a public
RNA-seq dataset, where Guardian's per-gene assumption checks lead to the
cascade of some genes from a parametric to a nonparametric test.

## Layout

```
case_study_4/
├── README.md                                          ← this file
├── PLAN_2026-05-07_case-study-4-rnaseq-guardian.md    ← the plan + anti-fabrication charter
├── TODO_2026-05-07_case-study-4-rnaseq-guardian.md    ← checkbox tracker (status of every checkpoint)
├── AUDIT_LOG_2026-05-07_case-study-4-rnaseq-guardian.md  ← append-only checkpoint evidence log
├── evidence/        ← raw API responses (NCBI eutils XML/JSON, CrossRef records, etc.)
├── data/            ← downloaded count matrix, sample sheet, derived intermediate files
├── code/            ← analysis scripts (case_study_4_genomics.py, helpers, plot generators)
└── outputs/         ← final tables (CSV), figures (PNG), summary text the manuscript cites
```

## How to read these files

Start with **PLAN** for the full plan and the anti-fabrication charter. Open
**TODO** to see what's done, what's in progress, and what's blocking. Open
**AUDIT_LOG** for the timestamped evidence trail at each checkpoint.

## How to verify nothing is fabricated

Every external claim (paper title, GEO ID, PMID, sample count, original-paper
test, named gene) must trace to either:

- a file in `evidence/` (raw API response or downloaded paper fragment), OR
- a script run in `code/` whose stdout you can re-run yourself.

If a claim in the manuscript section cannot be traced to one of those, it
should be removed or fixed.

## Scope discipline

This directory is dedicated to Case Study 4. It does **not** contain general
StickForStats files or supersede anything in `paper/replication/` proper. The
final replication script that gets cited from the manuscript will live at
`paper/replication/case_study_4_genomics.py` (one level up) and import data
from this `case_study_4/data/` directory.
