# StickForStats v1.1.0

Archival release accompanying the StickForStats manuscript (Bharti & Chakraborty, CSIR-IGIB). This is the
citable, DOI-archived snapshot of the platform; it supersedes v1.0.0 (2026-04) with the correctness,
calibration, and robustness work completed since.

## Highlights since v1.0.0

**Guardian & statistics**
- **Variance-aware independence gating.** The Guardian orchestrator now takes an `observation_order` argument;
  the lag-1 autocorrelation independence check runs only when the caller declares the data are
  temporal/sequential, and otherwise refers independence to study design (it is arrangement-dependent and not
  meaningful for cross-sectional / omics matrices). Backward-compatible and safe by default.
- **Calibration benchmark.** A controlled Monte-Carlo study (known ground truth) characterizing when the
  assumption-driven cascade improves Type I error / false-discovery control versus an ungated baseline, and
  where it does not (scripts + memo under `paper/replication/verification/`).
- Correctness fixes across the Bayesian (BF10 Rouder integral, exact correlation BF), p-curve (df-aware flat
  test, loss-function power), and robustness audits; noncentral-distribution safety (ncf/ncx2); real Egger
  meta-analysis; deferred algorithms (two-way/RM ANOVA, MANOVA, observed power, Little's MCAR).

**Manuscript-verification module**
- statcheck-grade consistency core; extractor p-value mis-pairing fix; cross-reference engine; bundle ingestion.

**Tooling & ops**
- Python client SDK + CLI hardened to 0.4.0 (on PyPI: `pip install stickforstats`).
- CI is green (lint + unit + integration + E2E).

## Reproducibility
All analyses in the manuscript are reproducible from `paper/replication/` (master runner
`MASTER_VERIFICATION.py`; statcheck head-to-head `statcheck_baseline.R`). Datasets are public: NCBI GEO
GSE271517, UCI Wine Quality, Fisher's Iris, `metafor::dat.egger2001`, and the PubMed Central open-access subset.

## Install / run
MIT-licensed. Full stack via Docker Compose (`docker-compose.yml`); backend Python ≥ 3.11 + Django 4.2 +
PostgreSQL 15 + Redis 7. See `README` and `docs/DEPLOYMENT_RUNBOOK.md`.
