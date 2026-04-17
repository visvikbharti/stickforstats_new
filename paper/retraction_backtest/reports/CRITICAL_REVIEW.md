# Critical Review: Retraction Backtest Pilot

## Summary
Total concerns found: 7 (1 critical, 3 major, 2 minor, 1 noted).
Verdict: **FIX-BEFORE-COMMIT** — one critical data-integrity failure (wrong paper harvested for `case_0019`) plus three major analysis-pipeline bugs (hard-coded category names that don't match the scorer, per-rule table quietly drops 1 of 45 rules, attrition flow rows all show −1). Pipeline blinding, reproducibility, control cleanliness, and COI disclosure all verified clean.

---

## CRITICAL concerns

### C1: `case_0019` was harvested as the wrong paper (EFSA sodium document substituted for a retracted Heart paper)
- **Files:**
  - `data/manifest_v1.csv:56` — declares `case_0019, doi=10.1136/heartjnl-2012-302337, pmcid=PMC7009309, journal="Heart (British Cardiac Society)"`.
  - `data/full_text/PMC7009309.nxml.gz` — contains an 86,106-word **EFSA Panel document** "Dietary reference values for sodium", journal=`EFSA Journal`, DOI=`10.2903/j.efsa.2019.5778`, PMID=`32626425`, published 2019.
  - `code/harvest.py:591` — `return f"PMC{idlist[0]}"` blindly takes the first esearch hit.
- **Evidence:**
  - Crossref says `10.1136/heartjnl-2012-302337` is titled just "Retraction" (it's the retraction notice, not the original paper). EuropePMC resolves PMID 22914535 → title "Low sodium versus normal sodium diets in systolic heart failure…", `pmcid=None` (paper is not in PMC OA).
  - NCBI esearch of that DOI returns two PMCIDs: `["7009309", "6483405"]`. Neither is the original Heart paper. `PMC6483405` is also not OA (`idIsNotOpenAccess`). `PMC7009309` happens to be an unrelated 2019 EFSA document that somehow indexes against the same DOI.
  - I confirmed this by reading the gzipped NXML directly (`article-title` = "Dietary reference values for sodium"; `journal-title` = "EFSA Journal"; `<article-id pub-id-type="doi">10.2903/j.efsa.2019.5778</article-id>`).
  - Ran a systematic DOI cross-check of all 60 rows (manifest DOI vs. DOI inside the downloaded NXML): **exactly 1 mismatch**: `case_0019`.
  - Quantified impact: removing `case_0019` changes point AUC from **0.562 → 0.573** (outlier case SQS=56 vs. corpus median ~15). Still NULL outcome, but this silent substitution is a data-integrity failure the pilot did not catch.
- **Why this breaks the study:** Every case row is supposed to be backed by a real retracted paper; one is a regulatory document about dietary sodium. A reviewer who spot-checked the PDF would reject the corpus. At scale this bug could substitute an unknown number of non-retracted papers as "cases".
- **Suggested fix:** In `harvest.py::resolve_pmcid`, reject any esearch result where `count > 1` and fall back to (a) eFetch on PMID to get canonical PMCID, or (b) verify that the retrieved NXML's embedded DOI matches the requested DOI before accepting. Also add a `--post-harvest-verify` mode that reopens every NXML and asserts `<article-id pub-id-type="doi">` matches the manifest DOI; **drop `case_0019` and re-harvest before any commit**.

---

## MAJOR concerns

### M1: `analyze.py` CATEGORIES constant has **zero overlap with the scorer's actual category names** for 4 of 6 categories, silently dropping per-category results
- **File:** `code/analyze.py:52-59`
- **Evidence:**
  ```python
  CATEGORIES = (
      "test_selection", "assumption_reporting", "effect_sizes",
      "confidence_intervals", "multiple_comparisons", "reproducibility",
  )
  ```
  Actual keys in `data/scores_v1.csv` (from `json.loads(category_scores_json)`): `["assumptions", "effect_sizes", "guidelines", "precision", "reproducibility", "sample_power"]`. Only `effect_sizes` and `reproducibility` match. As a result, `reports/per_category_auc.csv` emits only **2 rows out of 6** (confirmed: `reports/PILOT_REPORT.md:44-47` shows only `effect_sizes` and `reproducibility`). `assumptions`, `guidelines`, `precision`, `sample_power` are silently dropped.
- **Why this matters:** PROTOCOL §6.2 pre-commits to six per-category AUCs; the pilot silently reports two. A casual reader would assume the other four "weren't significant" rather than "were never computed".
- **Fix:** Replace the literal tuple with a dynamic extraction: `CATEGORIES = tuple(sorted(json.loads(scores.category_scores_json.iloc[0]).keys()))`, or pull `core.sqs_rules.CATEGORIES` and freeze the mapping in a pre-committed artefact per PROTOCOL §14.

### M2: `per_rule_analysis` emits 44 rules, not the 45 the protocol pre-commits to
- **File:** `code/analyze.py:189-253`, specifically `expand()` (line 195) which builds the rule set only from `rules_missed` strings actually observed.
- **Evidence:** `reports/per_rule_table.csv` has 44 rows; the scorer's 45 rules (verified via `ALL_RULES`) always include `GC002`, which is HIT in every one of the 60 papers (never "missed"), so `rules_missed` is empty for it. Report says "_0 of 44 rules reject H0 at BH-FDR = 0.05._" — should be "of 45".
- **Why this matters:** PROTOCOL §6.1 and §10.4 pre-specify BH-FDR "across the rule family" of 45. A rule that is always-hit at pilot N could flip at N=200 (it's a 2×2 table whose counts depend on the sample), so silently omitting it biases the FDR denominator at scale.
- **Fix:** Pre-load the full 45-rule set (`SQSClient.rule_ids()`) into `per_rule_analysis` and include a zero-variance row for any rule with zero `case_fail`+`ctrl_fail` (p=1.0, BH-FDR reject=False, but present in the output).

### M3: CONSORT attrition flow rows show `-1` for every pre-scoring stage (env vars never set)
- **File:** `code/analyze.py:544-554` reads `os.environ.get("N_RW_TOTAL", -1)`, `N_AFTER_DATE`, `N_AFTER_LANG`, `N_WITH_PMCID`, `N_OA`, `N_PARSER`.
- **Evidence:** `reports/attrition_consort.csv` and `reports/PILOT_REPORT.md:67-77` show `-1` for the first six stages. The numbers *do* exist elsewhere: `code/harvest_log.txt:857` has `retraction-watch rows: total=69709; kept_after_window=20750 … stat=3460 nonstat=7408 ambig=9882`.
- **Why this matters:** CONSORT reporting is pre-committed (PROTOCOL §7.4 + §10.5). `-1` values make the report look like the pilot has no flow documentation; a reviewer will mark this as a transparency failure.
- **Fix:** Two options. (a) Have `harvest.py` emit `data/harvest_attrition.json` with the eight counts, and `analyze.py --attrition-json …` consume it. (b) Ship a wrapper script that sets the env vars from the log tail before invoking `analyze.py`. Option (a) is cleaner and machine-auditable.

---

## MINOR concerns

### m1: Codebook counts changed between harvest runs without a version label in the manifest
- **File:** `code/harvest_log.txt:7, 129, 214, 857`
- **Evidence:** Same source CSV, same filter window, same total=20750. But the `stat/ambig/nonstat` triple shifts from `(5350, 4853, 10547)` in the 12:43 run to `(3460, 9882, 7408)` in the ≥12:47 runs. This reflects the developer iterating on `STAT_REASON_CODES`/`NON_STAT_REASON_CODES` (per HARVEST_NOTES.md §3). No manifest field records which codebook was used.
- **Fix:** Freeze a `codebook_version` string (e.g. a short SHA over `STAT_REASON_CODES + NON_STAT_REASON_CODES`) and stamp it into every manifest row alongside `harvester_version`.

### m2: Data-Sources doc still has unresolved `[REQUIRES HUMAN VERIFICATION]` flags
- **Files:** `DATA_SOURCES.md:20, 21, 40, 66` — reason vocabulary, RW license, Crossref metadata license, group-1 rate.
- **Evidence:** These are partially addressed in `HARVEST_NOTES.md` (e.g. §2 resolves the group-1 rate to 13 %, not ≥ 70 %) but not promoted into the authoritative `DATA_SOURCES.md`. A reviewer reading only that doc would think the flags are still open.
- **Fix:** Mirror every resolution from `HARVEST_NOTES.md` back into `DATA_SOURCES.md` (or add a "Resolved flags" appendix).

---

## NOTED

### N1: Pilot AUC shifts materially (0.562 → 0.573) after the C1 fix, but NULL outcome is preserved. Underpowered caveat in `PILOT_REPORT.md:7-11` is correctly phrased ("no primary-endpoint claim"). The pilot is honest about uncertainty.

---

## Items I verified and found clean

1. **Blinding.** `code/sqs_client.py:45-47` — `ALLOWED_METADATA_KEYS = frozenset({"pub_year", "journal", "issn", "mesh_top5"})` exactly as specified; `_validate_metadata()` (line 120) raises `BlindingViolation` for any other key; `score.py::_build_metadata` only copies the four whitelisted columns and re-checks against `_FORBIDDEN_SCORER_COLUMNS = ("class", "case_id", "retraction_date", "retraction_reasons_raw", "retraction_is_statistical")`. The `class_hints` dict in `score.py:626` is populated only for the post-hoc terminal summary, never fed to the scorer.
2. **Determinism.** Ran `analyze.py` twice on the same inputs; `diff reports_run1/primary_analysis.csv reports_run2/primary_analysis.csv` → zero diff (AUC 0.562, CI 0.416–0.703 identical). Seed `SEED = 20260417` used at `analyze.py:114` (`rng = np.random.default_rng(seed)`).
3. **Control cleanliness.** Cross-checked all 40 control DOIs and 40 control PMIDs against the Retraction Watch CSV at `data/retraction-watch-data/retraction_watch.csv`. Zero hits — no control paper is on the RW retraction list.
4. **Statistical correctness of AUC, bootstrap, BH, decision rule.** `test_analyze.py` 15/15 tests pass (perfect-separation AUC=1.0, anti-separation=0.0, no-info=0.5; matched-cluster bootstrap; BH Table-1 example from the 1995 paper; PARTIAL/POSITIVE/NULL/INCONCLUSIVE classification including the "wide CI" corner case).
5. **Stat-cause labels in manifest.** All 20 cases carry at least one stat-cause Retraction Watch code and none carry a pure-nonstat code (confirmed by re-running the codebook against `retraction_reasons_raw`).
6. **COI disclosure.** `PROTOCOL.md:8` names Vishal Bharti + Debojyoti Chakraborty as SQS developers; §13 lists procedural safeguards; the blinding contract is actually enforced in code (item 1 above).
7. **No TODO/FIXME/placeholder/mocked/fake tokens** across the 9 code and markdown files in `paper/retraction_backtest/` (grep search returned zero hits).
8. **SQS rules do not regex-match retraction vocabulary.** Grepped `backend/core/sqs_rules.py` for `retract|fabricat|falsifi|plagiar|duplicat` — zero hits. Threat #1 in PROTOCOL §12 is real but not realised.
9. **Fixture isolation.** `data/fixture/*` and `data/manifest_fixture.csv` use `FIX001`–`FIX005` record IDs and `PMCFIXTURE*` PMCIDs that are lexically distinct from the real `case_*`/`ctrl_*`/`PMC*` space; they are not referenced from any path under `reports/`.

## Items I did not have time to verify

- The exact numerical agreement of `case_0019`'s scored SQS=56 with what an uninstrumented run of the `SQSScorer` would produce on that EFSA text (confirmed it's a large-document outlier, but did not rerun SQS end-to-end on the raw NXML).
- Whether the same DOI → multi-PMCID collision that bit `case_0019` affects any *control* rows — I spot-checked 2 controls by title/journal and they matched, but did not run the systematic DOI-in-NXML check on the full-corpus idlist history.
- The `SQSScorer` backend itself for any internal non-determinism (the client-side contract in `_score_in_process` is deterministic in `(text, field)`, and the scorer is reported to be regex-only, but I did not run a 50-paper reproducibility check on a second machine as PROTOCOL §10.1 acceptance test #1 requires).
- That `backend/core/sqs_scoring.py`'s `FIELD_WEIGHTS` six-field profile keys (`general/psychology/medicine/biology/ecology/economics`) match the `_MESH_TO_FIELD` targets in `sqs_client.py:52-80` — spot-checked four mappings; did not exhaustively enumerate.

---

## Response (coordinator, 2026-04-17)

All 1 CRITICAL + 3 MAJOR concerns addressed before commit. Summary:

| # | Severity | Fix | Files |
|---|---|---|---|
| C1 | CRITICAL | `resolve_pmcid` refuses to pick when esearch returns >1 hit; `fetch_fulltext_nxml` now takes `expected_doi` and rejects any NXML whose embedded `<article-id pub-id-type="doi">` does not match. case_0019 + its 2 controls removed from the manifest and their NXMLs deleted from `data/full_text/`. Pilot re-scored on the cleaned 57-row manifest; AUC shifted 0.562 → 0.573 exactly as the reviewer predicted. | `code/harvest.py` (resolve_pmcid, fetch_fulltext_nxml, both call sites); `data/manifest_v1.csv`; `data/full_text/` |
| M1 | MAJOR | `analyze.CATEGORIES` replaced with the six real keys (`effect_sizes, assumptions, sample_power, precision, reproducibility, guidelines`) verified against `backend/core/sqs_rules.py:573`. Per-category table now renders all 6 rows. | `code/analyze.py:52-59` |
| M2 | MAJOR | `per_rule_analysis` now builds the rule universe as the union of `rules_hit ∪ rules_missed ∪ rules_not_applicable`. A rule that is hit in 100% of papers still appears in the table (with zero case_fail / ctrl_fail). Report now says "_0 of 45 rules reject H0 at BH-FDR = 0.05._" | `code/analyze.py::per_rule_analysis` |
| M3 | MAJOR | `harvest.py::_terminal_summary` now emits `data/harvest_attrition.json` at run end (schema v1 with 10 keys). `analyze.py` gained `--attrition-json` argument, defaulting to that path, and renders missing stages as "—" instead of "-1". Populated `harvest_attrition.json` for the current pilot from the final SUMMARY line in `harvest_log.txt`. | `code/harvest.py::_terminal_summary`; `code/analyze.py` (arg + consort display); `data/harvest_attrition.json` (newly committed) |

Post-fix pilot numbers (N = 19 cases + 38 controls):

- **AUC = 0.573 (95 % CI 0.405 – 0.717); outcome = NULL** (below primary floor). Per PROTOCOL §8.4, N_cases = 19 is still well below the minimum viable 100, so this is a feasibility signal, not a claim.
- **0 of 45 rules reject H0** at BH-FDR = 0.05.
- Six per-category AUCs, all within 0.485 – 0.536 (i.e., near chance on this tiny N).
- CONSORT flow now shows real numbers end-to-end (69,709 RW rows → 20,750 in-window → 3,460 stat-cause → 3,286 with PMCID → 3,175 OA group-1 → 20 parser-pass → 19 with 2 matched controls → 57 in analysis).

### Minor items acknowledged (not fixed this pass)

- **m1.** Codebook version label — will add once PROTOCOL moves to v0.2 post-second-coder.
- **m2.** Promote HARVEST_NOTES findings into DATA_SOURCES.md — deferred to a pre-full-run housekeeping commit.

### Items the reviewer flagged as "not verified" — status

- **Control DOI-in-NXML check.** Ran it now on the 38 surviving controls: every control's downloaded NXML contains its manifest DOI (`<article-id pub-id-type="doi">` match). No further contamination.
- **SQSScorer reproducibility on a second machine.** Still outstanding; tagged for the pre-full-run checklist.
- **`_MESH_TO_FIELD` vs `FIELD_WEIGHTS` exhaustive enumeration.** Tagged as M-follow-up; not load-bearing for the pilot (all pilot papers resolved to "medicine" or "general" profiles).

**Verdict update:** CRITICAL and MAJOR concerns are resolved. Proceeding to commit.
