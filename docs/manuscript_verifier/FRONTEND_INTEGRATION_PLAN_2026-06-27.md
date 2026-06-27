# Frontend integration plan — the multi-file verifier UI

**Written:** 2026-06-27. **Status:** PLANNED (next coding session). **Owner:** TBD.
**Context:** the verifier backend is fully built and tested; **no React UI calls it yet**. This plan wires a
frontend for `POST /api/v1/verify/bundle/` so an editor can upload a whole submission and see the verdicts,
the resolved references, and the citation-content conflicts. Read alongside `XREF_RESOLUTION_WORKPLAN.md`
(this is Phase 6's UI piece) and `../INGESTION_ARCHITECTURE.md`.

> **Decision recorded:** the verifier stays **in the running webapp** (one backend, one deploy) — see
> `PROJECT_ONBOARDING_2026-06-27.md` §"separate product". The work below is frontend + deploy housekeeping;
> no backend rebuild and no separate service.

---

## 1. Goal & scope

**Goal:** a "Manuscript Verifier" screen where a user drags in a *bundle* (manuscript + supplements + data +
figure images), submits to `/verify/bundle/`, and gets a clear report.

**MVP (session 1):** upload → call the endpoint → render the per-paper summary, the per-claim verdict table,
and — prominently — the **citation-content conflicts** and the **per-file ingestion report**.
**Later:** an editor-facing triage view, async/progress for large bundles, the ambiguous-link review UI.

**Out of scope here:** the figure vision tier (stays off), and any backend change beyond deploy housekeeping.

---

## 2. The API contract (already implemented — do not change the backend)

**Request** — `POST /api/v1/verify/bundle/`, `multipart/form-data`:
- repeated field **`files`** = every uploaded file (manuscript + supplements + data + images).
- optional `alpha` (default 0.05), `title`.

**Response (200)** — JSON. The top level (paper-level summary):
```
verdict_distribution: {VERIFIED, DISCREPANT, ASSUMPTION_VIOLATED, ASSUMPTION_UNREPORTED,
                       INSUFFICIENT_DATA, UNVERIFIABLE_EXTRACTION, INCONSISTENT_REPORTING}  (counts)
verifiability_rate, coverage, low_coverage, n_checkable, n_inconsistent_reporting, n_decision_changing,
n_references_resolved, n_citation_conflicts, certify_note,
run_id, report_token, report_url,
claims: [ … ],          // per-claim
ingestion: { n_files, n_manuscript_files, n_data_files, n_image_files, n_unknown, manuscript_chars,
             ocr_used, files: [{name, kind, ok, role, chars, n_rows, n_cols, ocr_used, warnings, error}],
             warnings: [] }
```
Each **claim** (the part the UI must render well):
```
claim_id, verdict, claim_text,
claimed:{statistic,p_value,effect_size}, recomputed:{test,statistic,p_value,effect_size,…}, match:{…},
assumptions:{checked,satisfied,violations,reported_in_text},
linked_dataset_id,            // the data file used for re-running
provenance:{ section, position, source_file,           // source_file = the file the claim came from
             cited_references:[…],                     // e.g. ["Supplementary Table S3"]
             resolved_reference,                        // the citation that resolved/directed the link
             resolution_confidence, link_method,        // link_method ∈ reference-directed|conflict|content
             extraction_method },                       // extraction_method ∈ text|ocr|vision
notes:[…]                     // human-readable, incl. "data link: …" and "citation-content conflict: …"
```

**Retrieve later:** `GET /api/v1/verify/report/<run_id>/?token=<report_token>` returns the same payload.

---

## 3. What to render (the UX that makes this worth it)

1. **Header summary card:** verdict distribution (a small bar), `verifiability_rate`, `coverage`, and two new
   badges — **References resolved** (`n_references_resolved`) and **Citation–content conflicts**
   (`n_citation_conflicts`, red if > 0). Show the `certify_note` verbatim (the "what this does / does NOT
   certify" box) — required for honest framing.
2. **Ingestion report** (collapsible): the per-file table from `ingestion.files` — name, kind (manuscript/
   data/image/unknown), what it was used for (`role`), and any warnings. This is how the editor sees that
   every uploaded file was handled.
3. **Claims table:** one row per claim — verdict chip (colour by verdict), `claim_text`, claimed vs recomputed
   p, and a **provenance** cell showing: `source_file`, the cited reference(s), `link_method`, and an
   `extraction_method` tag (mark `ocr`/`vision` claims as lower-confidence). Make **conflict** rows stand out.
4. **Conflict panel:** filter to claims whose `notes` contain "citation-content conflict" or whose
   `link_method == "conflict"` — the highest-value output (the author cited data that doesn't match, or that
   doesn't reproduce). Surface these first.

Reuse charts/components from the existing platform UI; do not introduce a new chart library.

---

## 4. Where it plugs in (frontend file map)

- **Pattern to follow:** `frontend/src/components/manuscript/ManuscriptAnalyzer.jsx` (the existing single-file
  manuscript flow) and `ReviewerReport.jsx`. The new screen is the multi-file sibling of these.
- **New components (proposed):**
  - `frontend/src/components/manuscript/BundleVerifier.jsx` — the drag-and-drop multi-file upload + submit.
  - `frontend/src/components/manuscript/VerificationReport.jsx` — renders the response (summary + ingestion
    + claims + conflicts).
- **API call:** add a `verifyBundle(files, {alpha, title})` to the manuscript service/api layer
  (`frontend/src/services/…` — follow how `ManuscriptAnalyzer` calls its endpoint).
- **Routing/nav:** add a "Manuscript Verifier" route + nav entry next to the existing manuscript analyzer.
- **i18n:** add the new strings to `frontend/src/i18n/` (10 languages fully translated; stubs for the rest).

---

## 5. Deploy housekeeping (do these around the frontend work)

1. **Apply migration `0015`** on the target DB (`manage.py migrate`).
2. **Auth decision:** `verify_views` endpoints are currently `permission_classes = [AllowAny]` (public).
   Decide whether the bundle endpoint should require login/an API key in production, and gate it if so.
3. **OCR system deps:** install `tesseract` + `poppler` on the server (the figure path degrades gracefully
   without them; the `ingestion.ocr_used`/warnings tell the UI when OCR was unavailable).
4. **API docs:** add `/verify/bundle/` (and `/verify/analyze/`, `/verify/report/`) to the OpenAPI schema
   (`backend/api/v1/openapi_views.py`) and the `frontend/src/pages/APIDocsPage.jsx` catalogue.
5. **Limits to surface in the UI:** ≤ 50 files/bundle, ≤ 25 MB/file, tables bounded — show friendly errors
   for the 400s the endpoint already returns.

---

## 6. Acceptance criteria (definition of done for the MVP)

- A user can drag in a manuscript + a data file + a figure image, submit, and see: the summary card, the
  ingestion table (3 files classified correctly), the claims table with provenance, and any conflict panel.
- A citation-content conflict (e.g. cited "Additional File 1" that doesn't match) is visibly flagged.
- An OCR-sourced (figure) claim is tagged as such.
- Frontend tests for the new components (follow the existing `__tests__` pattern); `npm test` green.
- Migration applied; endpoints in the API docs; no backend behaviour change.

---

## 7. What NOT to break
- Don't change the backend response shape — the UI consumes the contract in §2 as-is.
- Don't enable the figure **vision tier** (privacy; it stays off — D5/D7).
- Don't bypass the `certify_note` — it must be shown (honest framing is a project invariant).
- Keep the verifier on the same backend/deploy unless the standalone-product decision is taken.
