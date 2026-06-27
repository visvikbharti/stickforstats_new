# Manuscript-verification ingestion architecture

_Created 2026-06-27. Owner: Vishal Bharti. Scope: how the verification module ingests
real editor/publisher submissions — Word, PDF, LaTeX, JATS-XML, CSV/Excel/SPSS/SAS/Stata,
and figure images (TIFF/PNG/JPEG) — uploaded **together as a bundle**, and how it routes,
parses, OCRs, and verifies the statistics in them._

This document records both the **design** and **what is implemented today** (Phase 1 +
the multi-file bundle), and the **roadmap** for the rest.

---

## 1. The core mental model: an upload does one of two jobs

A submission file is never "just a file." It plays one of two roles, with very different
maturity and requirements:

| Job | Input formats | What we do | Tier |
|---|---|---|---|
| **A. Read the reported statistics** | manuscript: PDF, DOCX, LaTeX, **JATS-XML**, TXT; figure **images** | extract every reported stat (t/F/r/χ²/p…) and check internal consistency (statcheck-style) | **always available, no data needed** |
| **B. Re-run the analysis** | data: CSV, TSV, **XLSX/XLS**, **SPSS/SAS/Stata**, JSON | link each claim to the right columns and re-compute → VERIFIED / DISCREPANT / ASSUMPTION_VIOLATED | needs the authors' raw data |

CSV/Excel are **data** (Job B), not manuscript text. A figure image is a **picture of a
result** — its numbers feed Job A via OCR, but it is not raw data. The bundle endpoint
accepts everything at once and routes each file to the correct job automatically.

## 2. Two design principles

1. **Fidelity tiers — always prefer the most structured source.**
   `JATS-XML  >  DOCX (structured)  >  born-digital PDF  >  OCR (images / scanned PDF)`.
   The same statistic is more reliably read from XML than from a scanned figure; the
   pipeline records which tier each file used.

2. **Honesty gate — never a confident-but-wrong verdict.**
   Low extraction coverage or OCR-sourced text must *lower* confidence, never inflate it.
   Claims that cannot be reliably extracted resolve to `UNVERIFIABLE_EXTRACTION`; claims
   with no linkable data resolve to `INSUFFICIENT_DATA` (a first-class, honest outcome —
   most papers land here). A calibrated single confidence number stays withheld until the
   human double-coding (κ) study (see `verdicts.py` `calibrated_confidence`).

## 3. Pipeline

```
            ┌─────────────── upload bundle (N files) ───────────────┐
            │   manuscript(s) + supplements + data + figure images   │
            └───────────────────────────┬───────────────────────────┘
                                         ▼
                         classify each file by extension
              (api/v1/_upload_utils.classify_upload → manuscript|data|image|unknown)
                                         ▼
        ┌────────────────────┬───────────────────────┬──────────────────────┐
        ▼ manuscript         ▼ image                  ▼ data                 ▼ unknown
   ManuscriptParser      image_ocr.ocr_image     data_loader.load_dataframe   skipped
   (text layer +         (TIFF/PNG/JPEG →         (CSV/TSV/XLSX via pandas;    (reported,
    DOCX/PDF tables;      tesseract OCR)           SPSS/SAS/Stata/JSON via      not fatal)
    JATS via lxml;                                 DataImportService;
    scanned-PDF → OCR)                             bounded; zip-bomb guard)
        │                    │                        │
        └──── combined manuscript_text ◄─────────────┘   list of DataFrames
                                         ▼
                       verify_manuscript(text, dataframe, linker)
            (extract claims → statcheck consistency + re-run via Guardian/cascade)
              multi-table linker tries the claim against EVERY uploaded table
                                         ▼
                  VerificationProfile (verdict distribution, coverage,
                   n_inconsistent, certify-note) + per-file ingestion report
```

Orchestration code: `core/manuscript/bundle_ingest.py` (Django-free) → `verification_service.run_verification`.
HTTP boundary: `api/v1/verify_views.py: VerifyBundleView` (`POST /api/v1/verify/bundle/`).

## 4. Format support matrix (after the 2026-06-27 change)

| Upload | Role | Handler | Status |
|---|---|---|---|
| `.docx` | manuscript | python-docx — **paragraphs + table cells** | ✅ tables now read (were dropped) |
| `.pdf` (born-digital) | manuscript | pdfplumber→PyPDF2 — text + **reconstructed table cells** | ✅ table cells recovered |
| `.pdf` (scanned/image-only) | manuscript | **OCR fallback** (pdf2image+tesseract) | ✅ if poppler+tesseract present |
| `.tex` / `.latex` / `.txt` | manuscript | LaTeX stripper (math preserved) | ✅ unchanged |
| `.xml` / `.nxml` | manuscript | **JATS via lxml** (highest fidelity, refs excluded) | ✅ now accepted on upload |
| `.csv` `.tsv` `.tab` `.txt` `.dat` | data | pandas (delimiter sniffed) | ✅ |
| `.xlsx` / `.xls` | data | pandas + openpyxl (+ zip-bomb guard) | ✅ |
| `.sav` `.sas7bdat` `.dta` `.json` | data | DataImportService (pyreadstat) | ✅ now reachable from verify |
| `.png .jpg .jpeg .tif .tiff .bmp .gif .webp` | image | **tesseract OCR** | ✅ if tesseract present |
| other | unknown | reported + skipped (never fatal) | ✅ |

## 5. What was implemented in this change

- **Parser table extraction** (`core/manuscript/parser.py`): DOCX `doc.tables` cells; PDF
  `page.extract_tables()` with a dedup guard so cleanly-extracted tables aren't double-counted;
  a shared `_tables_to_text` helper that keeps each row on one line so a stat split across
  columns re-forms for the extractor's scoped p-attachment.
- **JATS-on-upload** (`parser.py` + `_upload_utils.MANUSCRIPT_EXT`): `.xml`/`.nxml` route to
  `jats_parser.parse_jats`; magic-byte auto-detection for XML.
- **OCR module** (`core/manuscript/image_ocr.py`): gracefully-optional tesseract OCR for
  figure images and a scanned-PDF fallback; degrades to a warning (never raises) when the
  binaries are absent; `ocr_capabilities()` for health checks.
- **Shared data loader** (`core/manuscript/data_loader.py`): one bounded loader for all
  tabular formats incl. SPSS/SAS/Stata/JSON; reused by both the single-file and bundle
  endpoints (the old `verify_views._load_dataframe` now delegates to it).
- **Bundle ingestion** (`core/manuscript/bundle_ingest.py` + `VerifyBundleView`): the
  `POST /api/v1/verify/bundle/` endpoint accepts many files, classifies+parses+OCRs+loads
  them, builds a multi-table linker, verifies, and returns an `ingestion` report per file.
- **Pinned-requirements fix**: `pdfplumber`/`PyPDF2` were missing from
  `requirements-pinned.txt` (a pinned deploy silently lost ALL PDF support); added, plus the
  optional OCR libs.
- **Tests**: `core/tests/test_ingestion_bundle.py` (13 tests; DOCX/PDF tables, JATS,
  OCR graceful-degrade + recovery, bundle service, and the end-to-end bundle API). Full
  manuscript/verify suite (125 tests) green; flake8 clean.

## 6. API: `POST /api/v1/verify/bundle/`

`multipart/form-data`:
- send every file under the repeated field name **`files`** (other file field names are
  also collected);
- optional `alpha` (default 0.05), `title`.

Response: the paper-level `VerificationProfile` (verdict distribution, verifiability rate,
coverage, `certify_note`) + per-claim verdicts + `run_id`/`report_token`, **plus** an
`ingestion` block:

```json
"ingestion": {
  "n_files": 3, "n_manuscript_files": 1, "n_data_files": 1, "n_image_files": 1,
  "n_unknown": 0, "manuscript_chars": 217, "ocr_used": true,
  "files": [ {"name": "...", "kind": "manuscript", "ok": true, "role": "manuscript_text", "chars": 184, "warnings": []}, ... ],
  "warnings": []
}
```

Bounds: ≤ 50 files/bundle; per-file ≤ 25 MB (`MAX_FILE_UPLOAD_MB`); tables bounded to
1,000,000 rows × 10,000 cols; `.xlsx` rejected if it decompresses past 200 MB.
Privacy: no external egress — only the uploaded files are read.

## 7. Known limitations & roadmap

> **Cross-reference resolution** (mapping the author's "Supplementary Table S3" / "Fig 2" /
> "Additional File 1" pointers to the right artifact and data file across the bundle) has its
> own design + work plan: see **`docs/manuscript_verifier/`** (`XREF_RESOLUTION_DESIGN.md`,
> `XREF_RESOLUTION_WORKPLAN.md`, `DECISIONS.md`). It supersedes the "heuristic linker" bullet
> below as the planned path to robust claim↔data binding.

**Phase 2 — robustness for messy real uploads**
- **Claim→column linking is heuristic** (`claim_data_linker.py`): matches column names
  mentioned in the claim's sentence; works on tidy, well-named tables, else degrades to
  `INSUFFICIENT_DATA`. Multi-table linking tries every uploaded table but does not yet do
  fuzzy/data-dictionary matching, units, or coded factors (`1=control`).
- **Ambiguous-link review UI** (plan A3): when linking is ambiguous, surface candidate
  columns for an editor to confirm instead of silently dropping to `INSUFFICIENT_DATA`.
- **Two-column / reading-order / de-hyphenation / ligature** PDF cleanup is not yet done
  (born-digital two-column journal PDFs can still scramble running-text stats; tables are
  now handled).
- **Async (Celery)**: bundle ingestion is currently synchronous in the request thread.
  Large/batch submissions should dispatch to a worker and return a job id + webhook.
- **MIME validation**: routing is by file extension; add content-type/magic validation.
- **Multi-sheet Excel**: only the first sheet is read; add sheet selection / "which sheet
  holds Table 2" mapping.
- **Claim de-duplication**: the same stat appearing in both prose and a table can be
  counted twice; add claim-level dedup.

**Phase 3 — figures & the vision leg**
- Stats embedded in figures/scanned tables need a **vision model**; the extractor already
  reserves a "regex + LLM + table/vision" multi-leg design (`claim_extractor.py:311`). The
  right pattern is **cross-checked, not authoritative**: the deterministic regex stays the
  source of truth; a vision leg only *proposes* additional claims that must agree.
- **Privacy caveat (critical for journals):** the tool advertises **no external egress**
  (manuscripts are confidential pre-publication). Any cloud LLM/vision leg must be
  **opt-in** with a **self-hosted/local model** option, or it breaks that guarantee.

## 8. Operations

System binaries for OCR (Python libs alone are insufficient):
- `tesseract` — Debian `apt install tesseract-ocr`; macOS `brew install tesseract`
- `poppler`  — Debian `apt install poppler-utils`; macOS `brew install poppler`
  (only needed for scanned-PDF rasterisation).

If absent, image/scanned-PDF OCR degrades gracefully (a warning in the ingestion report);
born-digital text extraction is unaffected. Check availability via
`core.manuscript.image_ocr.ocr_capabilities()`.

Python deps: `pdfplumber`, `PyPDF2`, `python-docx`, `openpyxl`, `xlrd`, `pandas`, `lxml`,
`pyreadstat`, `Pillow`, `pytesseract`, `pdf2image` (see `backend/requirements.txt` and
`requirements-pinned.txt`).
