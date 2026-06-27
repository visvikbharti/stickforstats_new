# Cross-reference resolution — work plan

_Created 2026-06-27. Companion to `XREF_RESOLUTION_DESIGN.md`. Update the **status table**
(§Status) as the canonical "where are we" across sessions._

Principle: **phased, checkpointed, each phase independently shippable and green.** No phase
starts before the prior checkpoint passes. We build a robust module, not patches — so every
phase carries tests, docs updates, and a defined acceptance bar. At each **checkpoint (C#)** we
pause for review before proceeding.

---

## Phase 0 — Foundations & instrumentation (no behaviour change)
**Goal:** put the data model and provenance plumbing in place, dark (unused), so later phases
are additive and the diff at each step is small and reviewable.

Work:
- Add dataclasses: `ReferenceKey`, `ArtifactRef`, `Artifact`, `ResolvedLink` (new
  `reference_types.py`, pure).
- Extend `StatisticalClaim` (`+cited_references`), `ClaimDataSpec`
  (`+source_file,+resolved_reference,+link_confidence`; actually set `linked_dataset_id`),
  `ClaimVerdict` (`+cited_references,+resolved_reference,+source_file,+resolution_confidence`)
  — all default-None/empty, threaded through `to_dict()`.
- Stop discarding `LinkResult.confidence`/`candidates` in `verify_pipeline.py` — carry into the
  spec/verdict (still no behaviour change to verdicts themselves).
- **Switch the bundle to per-file extraction**: tag each claim with `home_file` + section
  instead of extracting from one concatenated blob (design §2.2 / §6.3). This is the one real
  behavioural change in Phase 0 and is covered by tests.

**Checkpoint C0 — acceptance:** full manuscript/verify suite green; new fields present and
default-empty; bundle verdicts now carry `source_file` per claim; `JSON detail` round-trips the
new fields with **no migration**. Reviewer sign-off before Phase 1.

## Phase 1 — JATS gold path (exact resolution)
**Goal:** when the manuscript is JATS XML, resolve references exactly.

Work:
- Extend `jats_parser.py` (additive, per design §6.1): emit `artifacts` id-map + positioned
  `xrefs`; capture `<label>/<caption>/@id/xlink:href` for table-wrap/fig/supplementary-material/
  media/disp-formula.
- `artifact_index.build_index()` for the JATS case; `reference_resolver.resolve()` JATS-exact tier.
- Wire reference-driven dataset selection into the linker path for JATS uploads.

**Checkpoint C1 — acceptance:** on a JATS fixture containing `<xref ref-type="table" rid>`
and a `<supplementary-material>`/`<media href>`, a claim resolves to the exact artifact, the
verdict records `resolved_reference`+`source_file`+`resolution_confidence≈1.0`, and the right
data file is selected. New tests; suite green. Sign-off.

## Phase 2 — Reference grammar + label index (PDF / DOCX / text)
**Goal:** resolve references in non-structured manuscripts.

Work:
- `reference_grammar.py`: `parse_reference`, `normalize_label`, publisher-filename heuristics —
  built and tested against a labeled corpus of real reference strings (design §5).
- `artifact_index.py`: caption/label detection for PDF/DOCX (extend `_detect_figure_references`
  / `_extract_tables_from_section`) producing typed `Artifact`s with normalized keys.
- `reference_resolver`: label-match tier with specificity + uniqueness confidence.

**Checkpoint C2 — acceptance:** reference-grammar gold set normalized at an agreed accuracy
bar (target ≥95% on the curated string set); claims in a DOCX/PDF fixture resolve to the
correctly-labeled tables; ambiguous cases return candidates (not a wrong-confident link).
Sign-off.

## Phase 3 — Data-file mapping + disambiguation
**Goal:** pick the right data file using the author's pointer; resolve multi-table ambiguity.

Work:
- Map references → uploaded data files (filename conventions, sheet labels, manifest/README).
- Reference-driven disambiguation in the multi-table linker: when several tables match by
  columns, the cited reference selects; record `method` + `alternatives`.
- Citation-vs-content agreement scoring; disagreement flag (design §4).
- Human-confirm fallback hooks (API surface for "candidates"; UI deferred to Phase 5).

**Checkpoint C3 — acceptance:** on a multi-file bundle fixture where two tables match a claim
by columns, the author's "Table S3" pointer selects the right one; a deliberate
citation/content conflict is flagged, not overridden; tests. Sign-off.

## Phase 4 — Persistence + API + provenance surfacing
**Goal:** persist and expose the resolution so editors and the census can use it.

Work:
- Migration `0015` (shape per `DECISIONS.md` D2): denormalized columns and/or `ClaimDatasetLink`.
- Persist resolution in `verification_service`; expose per-claim `{cited_reference, source_file,
  columns, method, confidence}` and a bundle-level reference-graph summary in the API response +
  ingestion report.
- Update `INGESTION_ARCHITECTURE.md` + OpenAPI.

**Checkpoint C4 — acceptance:** end-to-end bundle → persisted verdicts carry the full
resolution provenance; report renders the reference graph; token-gated retrieval intact; tests.
Sign-off.

## Phase 5 — Figure-stat extraction (OCR baseline + pluggable vision tier)
**Goal:** capture statistics that live in figures, treating figures as first-class throughout
(decision D7). Reference-target resolution for figures and caption-text extraction land earlier
(Phases 1–2); this phase is specifically the **image-stat extraction** tier.

Work:
- Formalise a `figure_stat_extractor` interface with two implementations:
  (a) **OCR baseline** — already built (`image_ocr.py`); harden it (panel splitting, caption vs
  in-plot text, confidence per region).
  (b) **Vision tier (opt-in / self-hostable)** — a pluggable extractor for stats OCR cannot read
  (tiny/rotated/overlapping text; values encoded as bar heights/error bars). Off by default;
  no external egress unless explicitly enabled; self-hosted model path documented.
- Cross-check figure-extracted stats against the manuscript text/tables (a figure value that
  contradicts the text is a finding, not noise); feed into the same verdict + provenance model.

**Checkpoint C5 — acceptance:** figure-sourced claims carry `source_file` + extraction method
(`ocr` | `vision`) + confidence; the vision tier is off by default and, when enabled with a
self-hosted model, recovers stats OCR misses on a fixture; privacy invariant (no egress by
default) tested. Sign-off.

## Phase 6 — Robustness, evaluation, hardening
**Goal:** measure it, harden it, scale it.

Work:
- Labeled **evaluation set** (real bundles); measure resolution precision/recall + failure-mode
  catalog; tune the grammar/heuristics to the agreed bar.
- Async (Celery) dispatch for large bundles (job id + webhook).
- Ambiguous-link **review UI** (frontend; separate workstream).
- Performance pass (many files / large supplements).

**Checkpoint C6 — acceptance:** evaluation report meets precision/recall thresholds; documented
limitations; async path tested; UI usable. Sign-off → feature complete.

---

## Test strategy (every phase)
- **Pure-unit:** `reference_grammar` (hundreds of string cases), resolver tiers, JATS artifact/xref
  harvest — all Django-free, fast.
- **Integration:** bundle fixtures (JATS+data; DOCX+2 supplements+data; conflict case) →
  end-to-end verdict provenance.
- **API:** `POST /verify/bundle/` returns resolution fields + ingestion graph.
- **Regression:** full manuscript/verify suite green at every checkpoint; flake8 clean.
- **Evaluation (Phase 5):** precision/recall on the labeled gold set; no silent caps.

## Risk register
See design §8. Top three to watch: (1) per-publisher label/filename variance → grammar corpus
+ fallback; (2) author-cited-wrong-table → content cross-check + flag; (3) home-file provenance
loss → per-file extraction in Phase 0.

## Status (update this table every session)
| Phase | Checkpoint | State | Notes / commit |
|---|---|---|---|
| 0 Foundations | C0 | ✅ DONE (2026-06-27) | reference_types + provenance fields + link-confidence threaded + per-file extraction (verify_segments); 7 new tests, 142 suite green, flake8 clean; no migration (JSON-blob round-trip) |
| 1 JATS gold path | C1 | ✅ DONE (2026-06-27) | jats_parser emits artifacts+xrefs; reference_grammar (minimal) + artifact_index + reference_resolver; verify_segments resolves per claim; bundle builds JATS ref-context. Claim→exact artifact, conf 1.0, provenance on verdict. 8 P1 tests, 154 suite green, flake8 clean. NOTE: single /verify/analyze JATS resolution is a follow-up (bundle path done); grammar hardening is Phase 2. |
| 2 Grammar + label index | C2 | ✅ DONE (2026-06-27) | caption-based artifact index for PDF/DOCX (line-anchored, no phantoms); grammar gold-set ≥95% + precision guards; parse_supplement_filename (Elsevier/Springer-Nature/PNAS/PLOS/BMC/generic); non-JATS resolution via label tier (conf 0.85); cross-file ambiguity surfaced not guessed (D4). 14 P2 tests, 147 suite green, flake8 clean. Recheck probed caption-vs-reference + filename edges — clean. |
| 3 Data mapping + disambig | C3 | ✅ DONE (2026-06-27) | reference_linker.make_reference_aware_linker — citation selects the data table (overriding column-match order); conflict A (cited file doesn't match, another does) + conflict B (cited file links but DISCREPANT) surfaced (D4); malformed-table guard; honest tier-b provenance. 6 P3 tests, 166 suite green, flake8 clean. **3-agent adversarial review** → 1 real bug (ReferenceKey.matches ignored `extended`) fixed; malformed-table already guarded; 1 hardening (tier-b provenance) done; cross-publisher collision documented (deferred). |
| 4 Persistence + API | C4 | ✅ DONE (2026-06-27) | D2=(B) join: migration 0015 — ClaimVerdictRecord +section/source_file/cited_references/resolved_reference/resolution_confidence/link_method (+index); new ClaimDatasetLink join (claim↔dataset, cited_reference, method, confidence). Structured link_method (reference-directed/conflict/content) + profile summary (n_references_resolved, n_citation_conflicts) surfaced in the API response. 3 P4 tests (API surfacing + DB columns + join + null-FK/multi-claim edges), 168 suite green, flake8 clean. Recheck probed persistence edges — clean. NOTE: single /verify/analyze (non-bundle) still doesn't populate the join (linked_dataset_id only set by the reference-aware linker). |
| 5 Figure-stat extraction | C5 | ✅ DONE (2026-06-27) | figure_extractor.FigureStatExtractor (OCR baseline + double-gated opt-in vision tier, NO egress by default); claims tagged extraction_method (text/ocr/vision) thru claim→verdict→to_dict; bundle emits 4-tuple segments w/ method; FigureExtraction confidence. 7 P5 tests incl. privacy invariant (vision_fn that raises is never called by default) + vision opt-in recovers OCR miss. 176 suite green, flake8 clean. Recheck: confirmed no production code enables vision (API = OCR-only), fixed cross-module private-access smell. Cross-claim figure-vs-text comparison deferred (follow-on). |
| 6 Eval + hardening | C6 | NOT STARTED | gold set, async, review UI |

## Open decisions gating the plan (see DECISIONS.md)
- **D2** persistence shape (columns vs join) — needed before Phase 4.
- **Q1** publisher conventions in scope for v1 — needed before Phase 2/3.
- **Q2** encourage JATS-XML from publishers — affects how much weight the gold path carries.
- **Q4** figure-only stats (vision leg) — in/out of this plan's scope.
- **Q5** gold-set ownership/size — needed before Phase 5 (and informs Phase 2 bar).
