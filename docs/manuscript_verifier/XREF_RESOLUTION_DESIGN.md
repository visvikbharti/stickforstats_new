# Cross-reference resolution — design & analysis

_Created 2026-06-27. Status: DESIGN (pre-implementation). Owner: Vishal Bharti._
_Companion: `XREF_RESOLUTION_WORKPLAN.md` (phases/checkpoints), `DECISIONS.md` (ADRs)._

---

## 1. Problem statement & why it matters

When an editor/publisher uploads a submission **bundle** (main manuscript + supplementary
documents + raw-data files + figure images), a statistical claim in the main text rarely
carries its evidence inline. The author *points* to it:

> "Baseline characteristics are shown in **Table 1**; the full model is in **Supplementary
> Table S3**, and source data are provided in **Additional File 2**."

To cross-check that claim **correctly and defensibly**, the tool must first answer: *what is
the author telling us about this number — which table reports it, which dataset backs it,
which figure shows it?* Only then can it pull the right table/data and re-check.

Today (post the 2026-06-27 bundle work) the tool does **content-based** linking: it
concatenates all text and tries each claim against *every* uploaded table by column-name
match. That is a guess, not a reading of the author's intent. The consequences:

- **Wrong-table risk:** two supplements with a `group`/`score` column → the claim may bind to
  the wrong one, because nothing uses the author's "Table S3" pointer to disambiguate.
- **Missed pointers:** "full results in Supplementary Table S3" — the tool never opens S3 to
  fetch those numbers.
- **No provenance / audit trail:** an editor cannot see *why* a claim was matched to a file.

The cross-reference layer makes the pipeline **"select by citation, verify by content"**:
use the author's reference to choose the artifact, then use content (columns, recomputation)
to confirm — and when citation and content disagree, surface it rather than silently overriding.

This is the difference between a research demo and a tool an editor can trust on a real desk.

## 2. Grounded current-state analysis (what exists, with code refs)

### 2.1 JATS / NLM XML — a machine-readable link graph we currently discard
`backend/core/manuscript/jats_parser.py` flattens the article to plain-text buckets via
`_text()` → `el.itertext()` (`:60-61`), which **strips every attribute and element boundary**.
Findings:
- `<xref ref-type="table" rid="T3">Table 3</xref>` survives only as the bare substring
  `"Table 3"` in `body_text`; **`ref-type` and `rid` are never read** (the only attributes
  read in the whole file are `article-type` `:94` and `pub-id-type=pmcid` `:99`).
- `<table-wrap id="T3">` is iterated (`:123`) but only `_text(tw)` is taken — the `id`,
  `<label>`, and `<caption>` are fused into one `tables_text` blob; the `id` is dropped.
- `<fig>` is in the float-skip set (`:57`) but **never collected** → figure labels/captions
  are dropped entirely.
- `<supplementary-material>`, `<media xlink:href>`, `<ext-link xlink:href>` (the actual
  supplementary **filename / accession**) are never read.

**Implication:** the gold-path link graph is *present in the XML* and recoverable with an
**additive, dependency-free** change to this one file (emit an `artifacts` id-map + a
positioned `xrefs` list). See §6.1.

### 2.2 The claim → verdict provenance chain (what carries what)
- `StatisticalClaim` (`claim_extractor.py:283-321`): has `location` (section label, `:307`),
  `position` (char offset, `:308`) and `raw_text` (`:306`). **No** field for a cited
  reference, page, or source file. In the bundle path, `verify_manuscript` calls
  `extract(text, section="Results")` (`verify_pipeline.py:99`) — so **every claim's section is
  the literal "Results"** and `position` is relative to the (concatenated) text, i.e. the
  claim's **true home file and section are already lost** once we concatenate.
- `ClaimDataSpec` (`verdicts.py:75-122`): has `linked_dataset_id` (`:108`), `variable_names`
  (`:101`), `auto_linked` (`:109`). The linker **never sets `linked_dataset_id`**.
- `LinkResult` (`claim_data_linker.py:29-36`): has `status` (linked/ambiguous/unlinkable),
  `confidence`, `candidates` — but `verify_pipeline.py:119-120` keeps only `data_spec` and
  **discards the confidence and candidates**.
- `ClaimVerdict` (`verdicts.py:137-241`): provenance is `section`/`page`/`position` (`page`
  never populated) + `linked_dataset_id`. No cited-reference / source-file / resolution-
  confidence fields.
- Persistence: `ClaimVerdictRecord`/`LinkedDataset` (`models.py`, migration `0014`):
  `LinkedDataset` is **run-level** (`file_name`, `accession`, `link_status`) with **no
  per-claim FK**; `ClaimVerdictRecord` persists `position` + a `detail` JSON blob, with an
  explicit comment that page/structured provenance is deferred (`models.py:1612-1614`).

**Implication:** the three facts we need — *cited reference token, per-claim source file,
resolution confidence* — exist **nowhere** and must be added on `StatisticalClaim`,
`ClaimDataSpec`, `ClaimVerdict`, and persisted via a **new migration**. Also: the bundle must
**extract per file (tagged with home file + section)**, not from one concatenated blob, or
home-file provenance is unrecoverable.

### 2.3 Non-JATS label detection that exists today
`parser.py` already has `_detect_figure_references` (matches `Figure|Fig.|Table|Appendix N`)
and `_extract_tables_from_section` (finds `Table N.` captions). These are starting points for
the label index, but they are coarse (no supplementary forms, no normalization, not tied to
claims).

## 3. Conceptual model — the bundle reference graph

We model a bundle as a graph assembled at ingestion time:

```
 Files ──contains──▶ Artifacts ◀──resolves──┐
   │                  (table/fig/             │
   │                   dataset/eqn)        References  ◀──cites── Claims
   └─ role: manuscript/data/image            (in-text tokens)
```

- **File**: an uploaded file — role (manuscript|data|image), name, parsed content.
- **Artifact**: an addressable thing the text can point to — a table, figure, supplementary
  item, dataset, or equation. Carries: `artifact_id`, `kind`, `label` ("Table S3"),
  `caption`, `normalized_key`, `home_file`, and for data: `sheet`/`columns`; for JATS: `jats_id`.
- **Reference** (`ArtifactRef`): an in-text pointer detected in a claim's sentence — raw text,
  normalized key, char span, and the citing claim.
- **ResolvedLink**: claim → artifact, with `method` (jats_xref | label | filename | content_fallback),
  `confidence`, and `alternatives` (for the ambiguous case).

The graph turns linking from "try all tables" into "follow the citation, then verify".

## 4. Resolution strategy — tiered by source fidelity

The resolver tries strategies in descending confidence and records which fired:

1. **JATS-exact (gold, confidence ≈ 1.0).** When the manuscript is JATS XML, resolve
   `<xref rid>` → `<table-wrap id>`/`<fig id>`/`<supplementary-material id>` directly. Follow
   `<media xlink:href>`/`<ext-link>` to the supplementary filename/accession and map to the
   uploaded data file by name. Machine-verified; no guessing.
2. **Label-match (PDF/DOCX/text).** Detect in-text reference tokens in the claim sentence and
   artifact labels in captions; normalize both to a canonical key; match across files.
   Confidence from specificity (supplementary vs main, number, subpanel) and **uniqueness**
   (one candidate vs many).
3. **Filename / accession mapping (data files).** Map "Supplementary Data 1" / "Additional
   File 2" / "Table S3" to an uploaded data file via publisher filename conventions
   (Elsevier `mmc#`, Springer-Nature `MOESM#`, PNAS `sd##`, generic `supp*`, `additional_file_#`),
   sheet labels, and a bundle manifest/README if present. Lower confidence → human-confirm.
4. **Content fallback.** If no reference is found/resolved, fall back to today's content-based
   multi-table linker, but tag `method=content_fallback` and a reduced confidence (so the
   provenance is honest about *how* the link was made).

**Cross-check & disagreement.** When both a reference link and a content match exist:
agreement → high confidence; disagreement (author cites Table S3 but the numbers reproduce
from Table S4, or the cited table's columns don't recompute) → **flag, never silently
override**; the verdict carries both so an editor adjudicates.

## 5. Reference grammar (the hard, messy core)

Non-JATS resolution lives or dies on normalizing wildly inconsistent label strings to a
canonical key. The grammar (`reference_grammar.py`, pure + exhaustively unit-tested) maps:

| Surface forms | Canonical key |
|---|---|
| Table 3 · Table III · Tab. 3 · Table 3a | `(table, 3, sub="a", supp=False)` |
| Supplementary Table S3 · Suppl. Table 3 · Table S3 · Supp Table 3 · S-Table 3 | `(table, 3, supp=True)` |
| Figure 2B · Fig. 2b · Fig 2 panel B · Extended Data Fig 2 | `(figure, 2, sub="B", supp=?)` |
| Supplementary Data 1 · Data S1 · Dataset S1 · Source Data Fig 2 | `(data, 1, supp=True)` |
| Additional file 2 · Additional File 2: Table S3 | `(additional_file, 2)` (+ nested ref) |
| mmc3.xlsx · *MOESM3_ESM.xlsx · *.sd01.xlsx (filenames) | publisher → `(supp, 3)` |

Key normalization rules: Roman→Arabic numerals; `S`/`Supp`/`Supplementary`/`Additional`
→ `supp=True`; trailing letter → subpanel; "Extended Data"/"Source Data" as their own kinds;
compound "Additional file 2: Table S3" → outer (file 2) + inner (supp-table 3). Deterministic,
**no LLM** (privacy + reproducibility; see `DECISIONS.md` D5).

## 6. Data model & component design

### 6.1 JATS extension (additive; from the §2.1 audit)
Add to `jats_parser.py`: `_XLINK` constant; `Artifact` and `XRef` dataclasses; an `artifacts:
dict[str,Artifact]` harvest over `art.iter("table-wrap"|"fig"|"supplementary-material"|"media"
|"disp-formula")` reading `@id`, `<label>`, `<caption>`, `xlink:href`; and an `xrefs:
list[XRef]` capture in the existing `<p>` loop reading `@ref-type`,`@rid` (split multi-id),
with a `para_index` anchor. The flat-text contract is unchanged (purely additive fields).

### 6.2 New pure modules
- `reference_grammar.py` — `parse_reference(str) -> ReferenceKey | None`; `normalize_label`;
  publisher-filename heuristics. No Django, no I/O.
- `artifact_index.py` — `build_index(parsed_file) -> list[Artifact]` per file:
  JATS (structured), PDF/DOCX (caption detection via the grammar), data files (sheets/columns +
  filename → key). Produces the per-file artifact list.
- `reference_resolver.py` — `resolve(claim_refs, artifact_index, data_index) -> list[ResolvedLink]`
  implementing the §4 tiers + §4 disagreement handling.

### 6.3 Extensions to existing types (all default-None / additive)
- `StatisticalClaim`: `+ cited_references: List[ArtifactRef]`.
- `ClaimDataSpec`: set `linked_dataset_id`; `+ source_file`, `+ resolved_reference`, `+ link_confidence`.
- `ClaimVerdict`: `+ cited_references`, `+ resolved_reference`, `+ source_file`,
  `+ resolution_confidence` (distinct from re-analysis confidence).
- `bundle_ingest`: extract **per file** (tag claims with `home_file` + section); build the
  artifact index per file; assemble the reference graph; hand the resolver's links to
  `verify_manuscript` so dataset selection follows the citation.

### 6.4 Persistence (migration `0015`)
Two options (decided in `DECISIONS.md` D2):
- (A) denormalized columns on `ClaimVerdictRecord`: `section`, `source_file`,
  `cited_references` (JSON), `resolved_reference`, `linked_dataset` (FK→LinkedDataset, null),
  `resolution_confidence`.
- (B) a normalized `ClaimDatasetLink` join (FK→ClaimVerdictRecord, FK→LinkedDataset,
  `cited_reference`, `resolved_columns` JSON, `confidence`, `method`, `auto_linked`).
Interim: round-trip via the existing `detail` JSON blob (no migration) during Phases 0-3, then
add the migration in Phase 4 once the shape is stable.

## 7. Honesty & privacy invariants (carried from the module's design)
- **Never silently override.** A reference link and a content recomputation that disagree are
  both surfaced; the verdict is not asserted as VERIFIED on a guessed link.
- **Confidence is explicit and uncalibrated** until the human κ study; resolution confidence is
  a separate axis from re-analysis confidence.
- **Deterministic, no external egress.** Reference parsing is rule-based; any future
  LLM/vision assist for messy captions is opt-in/self-hostable (manuscripts are confidential).
- **Coverage gate.** Low extraction/label confidence lowers the verdict's standing
  (→ `INSUFFICIENT_DATA`/`UNVERIFIABLE_EXTRACTION`), never inflates it.

## 8. Risks & mitigations
| Risk | Mitigation |
|---|---|
| Label conventions vary wildly per publisher | grammar built against a labeled corpus; unknown forms → `content_fallback` + flagged, never a wrong-confident link |
| Author cites the wrong table (human error) | content cross-check; disagreement surfaced, not overridden |
| Supplement filenames are arbitrary | publisher heuristics + manifest/README + human-confirm fallback |
| OCR/caption noise on scanned PDFs | label confidence gates resolution; low confidence → review |
| Concatenation loses home-file provenance | switch bundle to **per-file extraction** with tagging (Phase 0) |
| Scope creep | strictly phased with checkpoints; each phase independently shippable |
| Census-scale query needs | denormalized columns/join + migration (Phase 4), JSON-blob interim |
| Cross-publisher supplement-number collision (HARDEN-LATER) | `additional_file_N`/`mmcN`/`sdN` all normalize to `(SUPPLEMENTARY/DATASET, N, supp)`, so a claim citing "Additional File 1" could target an unrelated `mmc1.xlsx` and emit a spurious conflict. Low probability (one publisher per paper). Mitigation: carry the convention/publisher origin on the key so cross-publisher numbers don't collide. Surfaced by the Phase-3 adversarial review (2026-06-27). |

## 9. Open questions ([PI / product decisions], tracked in DECISIONS.md)
- Q1 Which publisher supplement conventions are in scope for v1 (Elsevier/Springer/Nature/PLOS/…)?
- Q2 Do we require/encourage JATS-XML from publishers (exact resolution) as the preferred input?
- Q3 Persistence shape: denormalized columns vs `ClaimDatasetLink` join (D2)?
- Q4 → RESOLVED as decision **D7**: figures are first-class throughout (reference targets +
  captions + OCR now); the vision leg for OCR-unreadable stats is a pluggable tier scheduled as
  WORKPLAN Phase 5, opt-in / self-hostable.
- Q5 Gold-set construction for evaluating resolution precision/recall (size, who labels).
- Q6 Disagreement policy in the editor report: how prominently to surface citation-vs-content conflicts.

## 10. Success criteria
A bundle of (main manuscript + N supplements + M data files + figures) yields, per claim:
its cited reference(s), the resolved artifact and its home file, the data columns used, a
resolution method + confidence, and — where citation and content disagree — an explicit flag.
JATS uploads resolve exactly; PDF/DOCX resolve at a measured precision/recall on the gold set;
nothing is asserted VERIFIED on an unverified guess.
