# Decision log — manuscript verifier (cross-reference resolution)

ADR-style. Each decision has an id (`D#`), status, the choice, alternatives, and rationale.
Open product/PI questions are tracked at the bottom (`Q#`). Reference decisions by id from the
design/workplan rather than re-explaining.

---

### D1 — A first-class bundle reference graph (not inline per-claim guessing)
**Status:** ACCEPTED (design). **Choice:** assemble an explicit graph (Files → Artifacts ←
References ← Claims) in `bundle_ingest`, resolved by a dedicated `reference_resolver`.
**Alternatives:** keep per-claim brute-force content matching (today). **Rationale:** the graph
is what lets us "select by citation, verify by content," carry provenance, and disambiguate;
inline guessing cannot express *why* a link was made.

### D2 — Persistence shape for resolution provenance — **OPEN [PI/eng decision]**
**Options:** (A) denormalized columns on `ClaimVerdictRecord` (`section`, `source_file`,
`cited_references` JSON, `resolved_reference`, `linked_dataset` FK, `resolution_confidence`);
(B) a normalized `ClaimDatasetLink` join table (FK→record, FK→dataset, `cited_reference`,
`resolved_columns`, `confidence`, `method`). **Interim (no decision needed yet):** round-trip
through the existing `ClaimVerdictRecord.detail` JSON blob in Phases 0-3.
**Recommendation:** (B) join table — normalized, supports many-data-per-claim, and serves the
census-scale indexed queries the denormalized columns exist for. **Decide before Phase 4.**

### D3 — Confidence model: heuristic first, calibrate later
**Status:** ACCEPTED. **Choice:** resolution confidence is a transparent heuristic
(method tier × specificity × uniqueness × citation/content agreement). **Rationale:** matches
the module's existing "uncalibrated until the human κ study" stance; a learned model needs the
gold set (Phase 5) and the same calibration discipline as `calibrated_confidence`.

### D4 — Disagreement policy: surface, never silently override
**Status:** ACCEPTED. **Choice:** when the author's citation and the content recomputation
point to different artifacts (or the cited table doesn't recompute), record both and flag;
never assert VERIFIED on the basis of a guessed/conflicting link. **Rationale:** an editor tool
must be auditable; a confident-but-wrong verdict is worse than an honest "needs review."

### D5 — Reference parsing is deterministic (no LLM); vision/LLM assist is opt-in only
**Status:** ACCEPTED. **Choice:** `reference_grammar` is pure rules. Any future LLM/vision help
for messy captions or figure-embedded stats is opt-in and self-hostable. **Rationale:**
reproducibility + manuscript confidentiality (no external egress by default), consistent with
`INGESTION_ARCHITECTURE.md` §7 and the extractor's no-LLM guarantee.

### D6 — Resolve home-file provenance by extracting per file (not concatenated)
**Status:** ACCEPTED (Phase 0). **Choice:** the bundle extracts claims per source file (tagging
`home_file` + section), replacing the current concatenate-then-extract-once approach.
**Rationale:** concatenation makes a claim's true home file unrecoverable (design §2.2); we
cannot resolve "which file does this claim live in / point from" without it.

---

## Open product / PI questions (mirror of design §9)
- **Q1** Which publisher supplement conventions are in scope for v1 (Elsevier `mmc#`,
  Springer-Nature `MOESM#`, PLOS `S# File/Table`, PNAS `sd##`, generic `Additional file #`)?
- **Q2** Do we require/encourage **JATS-XML** from publishers as the preferred input (it makes
  resolution exact)?
- **Q3** = D2 (persistence shape).
- **Q4** Are **figure-only statistics** (needing the vision leg) in scope for this plan or a
  later one?
- **Q5** Gold-set for evaluation — size, and who labels it (ties to the κ double-coding study)?
- **Q6** How prominently should the editor report surface **citation-vs-content conflicts**?
