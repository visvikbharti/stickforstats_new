# SCORE_NOTES -- Evaluation Harness Dev Diary

Author: Evaluation Harness Engineer. Dated 2026-04-17.

## Endpoint decision: in-process import, with HTTP fallback supported

`SQSClient(backend="in_process")` imports `core.sqs_scoring.SQSScorer`
directly from `backend/`. Rationale:

1. The primary endpoint `POST /api/v1/sqs/analyze-text/` exists and is
   functional, but its JSON response does NOT return the per-rule hit
   breakdown that `scores_v1.csv` requires -- it returns only
   per-category aggregates. The in-process path exposes
   `report.all_findings` (list of `Finding` objects with `rule_id` and
   `found`), which is exactly what we need for the per-rule discrimination
   secondary endpoint (PROTOCOL sec. 6.1).
2. In-process is deterministic and does not depend on a running Django
   server, CORS, or network I/O. This matches PROTOCOL sec. 10.1
   acceptance test #1 ("reproducibility check: 100 % exact agreement").
3. HTTP mode is still available via `SQSClient(backend="http")` or the
   `STICKFORSTATS_BACKEND=http` env var, exercising the same code path a
   real journal integration would use. It simply records the rule-hit
   columns as `rules_not_applicable` because the public endpoint does
   not expose them.

## Exact contract invoked (in-process)

```python
from core.sqs_scoring import SQSScorer
scorer = SQSScorer(field="medicine")         # one of 6 field profiles
report = scorer.analyze(text)                 # text: preprocessed str
report.percentage                             # 0-100 SQS
report.category_scores["effect_sizes"].percentage
for f in report.all_findings:                 # 45 Finding objects
    f.rule_id   # "ES001" ... "RP007"
    f.found     # bool -- did the regex match?
    f.is_penalty
```

If HTTP is selected the contract is:

```
POST http://localhost:8000/api/v1/sqs/analyze-text/
Content-Type: application/json
{"text": "<manuscript body>", "field": "medicine"}
  -> 200 OK
  {"percentage": 57.5, "grade": "F",
   "category_scores": {"effect_sizes": {"percentage": 45.0, ...}, ...},
   "findings_summary": {"total": 45, "found": 20, "missing": 25, ...}}
```

## NXML -> plain text

Strategy implemented in `score.py::nxml_to_text`:

* **lxml with `recover=True, huge_tree=True`** so minor malformed JATS
  still parses. Entities are not resolved (defence against malicious
  external DTDs).
* **Kept**: article title, abstract, all `<sec><title>...</title></sec>`
  headings, paragraphs (`<p>`), table cells (`<td>`, `<th>`), table
  labels (`<label>`), captions.
* **Dropped** (recursively removed): `<ref-list>`, `<back>`,
  `<fig>`/`<fig-group>`/`<graphic>`/`<inline-graphic>`,
  `<disp-formula>`/`<tex-math>`/`<math>`,
  `<supplementary-material>`, `<contrib-group>`, `<xref>`, `<aff>`,
  `<named-content>`, `<notes>`, `<table-wrap-foot>`.
* **Section headings** are emitted on their own line with a blank line
  before and after. This is critical because several SQS patterns rely
  on detecting "Methods" and "Results" as section anchors.
* **Tables** are rendered as `\t`-separated rows. Statistical claims
  (means, SDs, Cohen's d, p-values) often live in result tables and SQS
  regex rules fire on them. Dropping tables would undercount by ~15-20
  % per category on our fixture.

## Determinism verification

`--verify` mode scores 10 rows twice and diffs every non-timestamp
field. On the 5-row fixture (first 5 used), `--verify` passes silently
(exit 0). SQS is purely deterministic over `(text, field_profile)`:
no randomness, no threading, no floating-point drift beyond the 4
decimal places we serialise.

## Blinding proof

A manifest row that carries `class`, `case_id`, `retraction_date`,
`retraction_reasons_raw`, and `retraction_is_statistical` is filtered
down to the whitelist `{pub_year, journal, issn, mesh_top5}` in
`_build_metadata()` before any call to the scorer. If a caller were to
bypass that helper and pass a disallowed key directly,
`sqs_client._validate_metadata` raises `BlindingViolation`
(sub-classed `ValueError`) and the driver records the exception name in
the CSV `error` column -- making any breach auditable.

Unit-tested: `_build_metadata` returns exactly
`{"pub_year", "journal", "issn", "mesh_top5"}` on a fully-populated
manifest row with all forbidden keys present.

## Endpoint gaps / surprises

1. **HTTP `/sqs/analyze-text/` does not return per-rule hits.** The
   `findings_summary` only aggregates counts (`found`, `missing`).
   Recommend adding an optional `include_findings=true` query parameter
   to the endpoint if future journal integrations need to reproduce the
   per-rule columns we emit here. For this backtest we use the
   in-process path so the issue is moot.
2. **`ManuscriptGuardian` orchestrator is PDF-centric.** It calls
   `ManuscriptParser(file)` which needs a file-like object; we bypass
   it (NXML has already been parsed and converted) and invoke the SQS
   scorer directly on the text, matching the preregistered separation
   between "parse" and "score" stages.
3. **Penalty rules.** `PR002` ("threshold-only p-values") has negative
   points. I count a fired penalty as a `rules_missed` entry (it is a
   quality problem) and a non-fired penalty as `rules_hit` (the paper
   avoided the bad pattern). This convention is documented in the
   client's `_score_in_process` docstring and preserves the invariant
   `len(rules_hit) + len(rules_missed) == 45`.
4. **Field profile mapping from MeSH.** The SQS `field` profile
   (`psychology`, `medicine`, `biology`, `ecology`, `economics`,
   `general`) is chosen from `mesh_top5` via a fixed lookup table in
   `sqs_client._MESH_TO_FIELD`. The mapping is pre-committed per
   PROTOCOL sec. 10.1 step 3 and will be written to the frozen
   `field_mapping.py` artefact alongside the CSV.

## What blocks running against the real manifest

Nothing code-wise: the driver reads the exact 18-column schema the
Data Engineer will emit and resolves relative `full_text_local_path`
against `paper/retraction_backtest/`. We expect to swap
`--manifest data/manifest_v1.csv` the moment it lands.

The only open decision for the Critical Reviewer is whether the
HTTP backend should be added as a sanity rerun on a subsample (e.g.
50 papers) to confirm identical numbers between in-process and the
public endpoint. That is one flag away: `--backend http` plus a
running Django server.

## Fixture run summary (5 rows, 2 cases / 2 controls / 1 missing-file)

```
SQS mean=46.19 median=76.31 min=16.08 max=76.31
FIX001 (case, high-quality)  -> 76.31 -> rules_hit=28 missed=17
FIX002 (ctrl, same paper)    -> 76.31 (identical, deterministic)
FIX003 (case, low-quality)   -> 16.08 -> rules_hit=4  missed=41
FIX004 (ctrl, same paper)    -> 16.08 (identical, deterministic)
FIX005 (missing file)        -> error: FileNotFoundError
```

High-quality papers score higher than low-quality, as expected. The
driver does not "see" the class column during scoring -- it only reads
it for the post-hoc summary print.
