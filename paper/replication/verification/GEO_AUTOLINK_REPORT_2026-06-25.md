# Measured auto-link rate across cached GEO datasets

_Generated 2026-06-25 by `geo_autolink_rate.py`._

How far the AUTOMATIC genomics pipeline (gene + group resolution, series-matrix grouping) generalises across heterogeneous real GEO datasets — the honest Phase-B automation funnel.

## Funnel

- Cached accessions: **8**
- A. loadable expression matrix: **3/8** (38%)
- B. series-matrix metadata fetchable: **3/8**
- C. grouping aligned to the matrix's sample columns: **3/8**
- D. gene claims auto-link (>=50%): **3/8**

**End-to-end auto-link rate: 3/8 = 38%** of all cached accessions; **3/3 = 100%** of those with a usable matrix.

## Per-dataset

| GSE | matrix | metadata | grouping | link rate | outcome |
|---|---|---|---|---|---|
| GSE117273 | no | no | no | — | A: no usable matrix |
| GSE26939 | no | no | no | — | A: no usable matrix |
| GSE271517 | yes | yes | metadata var 'fusion gene': SSX1/SSX2 | 100% | D: AUTO-LINKED |
| GSE283043 | no | no | no | — | A: no usable matrix |
| GSE287628 | yes | yes | metadata var 'treatment': Ctrl/IL-2 | 100% | D: AUTO-LINKED |
| GSE303993 | yes | yes | column-name prefixes: ngd/wt | 100% | D: AUTO-LINKED |
| GSE330657 | no | no | no | — | A: no usable matrix |
| GSE67375 | no | no | no | — | A: no usable matrix |

## Interpretation (honest)

The drop-offs are the finding. Most cached accessions are NOT turn-key auto-linkable: many
deposit only a `filelist.txt` (raw archives, no processed matrix), a supplementary file can be
unreadable, the processed matrix's sample-column names need not match the series-matrix sample
ids (alignment gap), and the grouping is sometimes encoded only in column-name conventions
(e.g. `nGD`/`WT`) rather than machine-readable characteristics. Where a matrix + an aligned
(or column-encoded) binary grouping exist, gene-level claims auto-link reliably. This compound
rarity is exactly why INSUFFICIENT_DATA dominates the literature-scale picture — and why the
Phase-B headline is a MEASUREMENT of verifiability, not an assumption of it. (Link rate at D is
measured on uniform synthetic phrasing that uses each dataset's own group vocabulary.)
