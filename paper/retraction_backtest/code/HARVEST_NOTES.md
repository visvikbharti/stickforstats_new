# Harvest Notes — Pilot Run 2026-04-17

Dev-diary counterpart to `PROTOCOL.md` and `DATA_SOURCES.md`. Addresses the
seven `[REQUIRES HUMAN VERIFICATION]` flags in `DATA_SOURCES.md` and
records findings from the live pilot.

**Run.** `python code/harvest.py --pilot 20`, 2026-04-17 UTC 12:48:10 →
12:58:08, 593 s cold / 24.6 s warm-cache. 497 live API calls; zero HTTP
429s; sustained ≈ 0.84 req/s (limiter capped at 3 req/s).
**Output.** 20 cases, 40 controls, 60 rows, all schema-conformant.

## Resolution of the 7 verification flags

### 1. Retraction Watch license — PARTIALLY RESOLVED
The `crossref/retraction-watch-data` GitLab repo has **no LICENSE file**
(confirmed via GitLab API v4 `repository/tree` listing: only `README.md`
and `retraction_watch.csv` exist at the root). The README opens:
*"Retraction Watch made public its entire database … as a resource for
the scholarly community"*, inherited from Crossref's 2023-09-12
"always open" acquisition commitment.
Since we redistribute only DOIs, PMCIDs, case/control labels, and the
verbatim `Reason` string (factual, not creative), the §13 CC0 manifest
clause is safe. Recommendation: keep §13, add attribution to Retraction
Watch / Crossref, and get PI sign-off before journal submission.

### 2. PMC commercial-reuse-license coverage — RESOLVED WITH CAVEAT
Pilot observation (n = 197 stat-retracted cases with successful
DOI → PMCID):

| PMC bucket                                 | Count |  %  |
|-------------------------------------------|------:|----:|
| Not in PMC OA subset (license=None)        |   146 | 74% |
| OA subset, CC-BY-NC / NC-SA / NC-ND        |    25 | 13% |
| **OA subset, group-1 (CC-BY / CC0 / …)**   |  **26** | **13%** |

So the group-1 rate across all PMC-indexed stat-retracted papers is
**13 %** (not the ≥ 70 % `DATA_SOURCES.md` §3 anticipated). Within the
OA-subset-only denominator it is **51 % (26/51)**. Feasibility is
preserved: ~43 000 stat-cause RW rows × 13 % ≈ 5 600 harvestable cases
— still ~28× the N = 200 primary target. No protocol change needed;
disclose as Limitation text in the paper.

### 3. Retraction Watch reason-code vocabulary — RESOLVED
Enumerated directly from the CSV at HEAD: **112 unique reason tokens**
(semicolon-delimited within cells). Top 5 by frequency: Investigation
by Journal/Publisher (30 182); Unreliable Results and/or Conclusions
(20 714); Investigation by Third Party (17 369); Concerns/Issues about
Data (15 618); Concerns/Issues about Referencing/Attributions
(14 544). PROTOCOL.md §9.1's plausible names (e.g. `"+Error in Data"`)
slightly mismatch live phrasings (`"Duplication of/in Image"` vs
`"image duplication"`). `harvest.py` encodes the verified phrasings
in `STAT_REASON_CODES` (15 entries) + `NON_STAT_REASON_CODES`
(30 entries). The §9.1 codebook itself is unchanged.

### 4. Second-coder identity — DEFERRED
Per briefing: single-coder pilot acceptable per PROTOCOL §9.
Second coder + Cohen's κ must land before the N = 200 run.

### 5. `SQSScorer` public API — CROSS-REFERENCE ONLY
Not in scope for Data Acquisition Engineer. Manifest schema is
contract-pinned for the Harness Engineer.

### 6. OSF preregistration deposit — POST-PILOT ACTION ITEM
Not done. Deposit `PROTOCOL.md` + this file to an OSF project and
record the OSF DOI in PROTOCOL §14 before the full run.

### 7. Pre-2010 exclusion cutoff — SENSITIVITY NUMBER REPORTED
`OriginalPaperDate` in [2000, 2009] passing Step 1 filters yields
**3 906 additional candidate cases** (~18 % gain). Per PROTOCOL §7.3,
the 2010 floor stays. Logged as sensitivity info only.

## Observations NOT in `DATA_SOURCES.md` (architect feedback)

1. **Europe PMC `search` returns empty top-level `issn`/`journalTitle`**
   even at `resultType=core`; the ISSN lives at
   `result.journalInfo.journal.{issn,essn}`. Code reads both locations.
2. **PMC `oa.fcgi` emits license *strings* in ~12 spelling variants**
   (`CC BY`, `CC-BY`, `CC BY 4.0`, lowercase `none`, empty). Our
   `_is_group1()` normaliser handles them; any downstream consumer
   must reuse it or re-implement equivalent canonicalisation.
3. **~74 % of PMC-indexed retractions are not in the OA Subset at
   all** (`oa.fcgi` → `<error code="idIsNotOpenAccess">`). The
   `DATA_SOURCES.md` 16 854 "OA retractions" figure masks this: the
   total retracted pool is 31 910, implying ~53 % OA before the
   further license-group filter.
4. **Europe PMC `/{PMCID}/fullTextXML` returns 200 even for
   minimal/error XML** in a minority of cases. Defence:
   `ET.fromstring()` parseability check. 4/70 pilot attempts failed
   parse (~5.7 % attrition).
5. **DOI → PMCID via NCBI esearch is not 1:1 reliable.** 216/398
   pilot-candidate DOIs had no PMCID (54 %) — mostly Elsevier /
   Springer / Wiley subscription titles. No mitigation needed; logged
   as drop reason.

## New `[REQUIRES HUMAN VERIFICATION]` flags introduced

- **NEW-1.** Re-probe the 51 % group-1 rate with ≥ 500 stat-retracted
  PMCIDs before the N = 200 run; update PROTOCOL §8.4 if < 40 %.
- **NEW-2.** ~8 % of scanned rows carry both stat + non-stat codes
  (e.g. `"Concerns/Issues about Data;Image Manipulation;"`).
  Our codebook drops these as `ambiguous`. Spot-check 30 such rows
  before scaling to confirm the substring matching is not
  over-triggering.

## Blockers for scaling 20 → 200

1. **License attrition (13 % group-1 rate)** implies scanning
   ~1 500 CSV rows per 200 cases — ~30 min warm-cache, ~3 h cold.
   Scheduling note, not a blocker.
2. **Europe PMC XML parse failures (~5.7 %)** will lose ~11 cases /
   22 controls. Mitigation: PMC OA FTP bulk tarballs as fall-back
   (not implemented; not needed at pilot scale).
3. **No rate-limit ceiling encountered** (0/497 HTTP 429s). Pipeline
   is well within fair-use envelopes.

## Artefacts written

| Path | Size | Notes |
|------|------|-------|
| `data/manifest_v1.csv` | 16 KB | 60 rows × 18 cols |
| `data/full_text/*.nxml.gz` | 1.4 MB | 60 gzipped NXMLs |
| `data/.cache/*.json.gz` | 3.8 MB | 617 responses (reproducible) |
| `code/harvest_log.txt` | 183 KB | append-only row audit |
| `data/retraction-watch-data/` | 75 MB | live clone (git-ignored) |
