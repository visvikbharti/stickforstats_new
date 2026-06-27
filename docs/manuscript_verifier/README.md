# Manuscript-verifier — living documentation

This directory is the **single source of truth** for the manuscript-verification
module's ongoing design, decisions, and work plans. It exists so the work stays
coherent across sessions and contributors — read these before changing the module,
and update them as part of any change (not after).

## Read in this order

1. **`../INGESTION_ARCHITECTURE.md`** — how a bundle of files is ingested today
   (the implemented Phase-1 + bundle endpoint). Start here for current state.
2. **`XREF_RESOLUTION_DESIGN.md`** — the design + grounded analysis for the
   **cross-reference resolution layer**: how we map an author's in-text references
   ("Supplementary Table S3", "Fig. 2", "Additional File 1") to the actual artifact
   across files, so a claim is checked against the data the author actually points to.
3. **`XREF_RESOLUTION_WORKPLAN.md`** — the phased plan: phases, checkpoints,
   acceptance criteria, test strategy, risk register, and a live status table.
4. **`DECISIONS.md`** — the decision log (ADR-style): every significant design
   decision, the alternatives, the rationale, and any [PI DECISION] items still open.

## How to keep this consistent across sessions

- Every code change to the module updates the relevant doc **in the same commit**.
- The **status table** in `XREF_RESOLUTION_WORKPLAN.md` is the canonical "where are we"
  — update the phase/checkpoint state there, not in scattered notes.
- New decisions get an entry in `DECISIONS.md` (with a `D<n>` id) and are referenced
  by id from the design/workplan rather than re-explained.
- The memory index (`MEMORY.md`) points here; it should carry a one-line pointer, not
  the detail.

## Module map (where the code lives)

| Concern | File |
|---|---|
| File ingestion / classification / bundle | `backend/core/manuscript/bundle_ingest.py`, `api/v1/_upload_utils.py`, `api/v1/verify_views.py` |
| Manuscript text + tables (PDF/DOCX/LaTeX) | `backend/core/manuscript/parser.py` |
| JATS / NLM XML (the structured gold path) | `backend/core/manuscript/jats_parser.py` |
| Figure / scanned OCR | `backend/core/manuscript/image_ocr.py` |
| Tabular data loading | `backend/core/manuscript/data_loader.py` |
| Claim extraction | `backend/core/manuscript/claim_extractor.py` |
| Claim → data linking | `backend/core/manuscript/claim_data_linker.py`, `genomics_linker.py` |
| Verdict model / orchestration | `backend/core/manuscript/verdicts.py`, `verify_pipeline.py`, `reanalysis_engine.py`, `verification_service.py` |
| Persistence | `backend/core/models.py` (VerificationRun / ClaimVerdictRecord / LinkedDataset) |

## New components introduced by the cross-reference layer (planned)

| Component | File (planned) | Role |
|---|---|---|
| Reference grammar | `backend/core/manuscript/reference_grammar.py` | normalize "Supplementary Table S3" → canonical key |
| Artifact index | `backend/core/manuscript/artifact_index.py` | per-file index of tables/figures/datasets + labels |
| Reference resolver | `backend/core/manuscript/reference_resolver.py` | claim refs × artifact index → resolved links + confidence |
| Bundle reference graph | (in `bundle_ingest.py`) | assemble claims ↔ references ↔ artifacts ↔ files |
