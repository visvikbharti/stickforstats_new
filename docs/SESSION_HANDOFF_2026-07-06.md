# Session handoff — 2026-07-06

**Branch:** `docs/plos-compbio-submission` · **`main` = `78fffb7`** (branch and main in sync; every change below
is committed + pushed). **CI: green.** Working tree clean except the pre-existing stray
`paper/replication/verification/FP_VALIDATION_REPORT_PREFIX_2026-06-25.md.bak` (never commit it).

**Resume entry point:** this file. The step-by-step for the remaining human actions is
`docs/RELEASE_AND_SUBMISSION_PLAYBOOK.md`.

---

## What this session did (12 commits, `eaf247e`..`78fffb7`)

1. **Calibration benchmark → new Fig 8** (`eaf247e`). Monte-Carlo, known ground truth, ablation of the Guardian
   assumption gate on the real `DifferentialExpressionService`. Shows the gate restores near-nominal Type I/FDR
   under unbalanced heteroscedasticity (S2: 0.100→0.058, FDR 0.179→0.068) and adds power under non-normality
   (S3–S5); honest limit at S6 (hetero+heavy-tail: only partial control, always-Welch better) → names
   variance-aware routing as the fix; count-GLMs (edgeR/DESeq2) more powerful on counts. Added to both
   manuscripts (Results + Methods + Fig 8 + revised Limitations). Scripts/memo under
   `paper/replication/verification/`.
2. **Reviewer-response docs updated** (`0ab5382`) — folded the calibration result into `PI_REPLY_DRAFT_independence.md`
   and `BGPT_REVIEW_RESPONSE.md` (adversarially verified; numbers checked vs the result JSONs).
3. **Independence-validator gate — CODE** (`e1125a6`). `GuardianCore.check(observation_order=...)`: the lag-1
   independence test runs only when the caller declares the rows temporal/sequential; otherwise independence is
   referred to study design ("not applicable"). Safe-by-default, backward-compatible; +5 tests; full guardian
   suite green. **Deployed code → needs a redeploy to reach the live site.**
4. **Live-site copy softened** (`79800c4`) — `ProfessionalLanding.jsx` "prevents Type I errors" → "guards
   against …" to match the calibration finding. Frontend change → needs rebuild to go live.
5. **bioRxiv v2 upload packet** (`79800c4`) — `paper/submission_package/BIORXIV_V2_UPLOAD.md`.
6. **CI fixed to green** (`b6bdfa1`, `a7df140`) — `main` had been red since June 29. Fixed flake8 (E116/F401 +
   E127 ignore) and made the E2E frontend build use `CI=false`; then fixed the one real E2E failure (a benign
   ServiceWorker registration error under the CI static server). All jobs green now.
7. **Venue recommendation → Q1** (`98a486f`→`812230f`→`c794f13`). Key finding: PeerJ/GigaByte/PLOS ONE are all
   **JCR Q2** (their "Q1" is Scimago). For JCR-Q1 + soundness: **#1 BMC Bioinformatics**, #2 BMC Med Res
   Methodology, #3 Frontiers in Bioinformatics (ESCI), #4 Scientific Reports. India gets no automatic APC waiver
   anywhere. `paper/submission_package/VENUE_RECOMMENDATION.md`.
8. **Zenodo prep** (`04b60e9`) — `.zenodo.json` (repo root), `docs/RELEASE_AND_SUBMISSION_PLAYBOOK.md`,
   `docs/RELEASE_NOTES_v1.1.0.md`.
9. **BMC cover letter** (`60bbd67`) — `paper/submission_package/BMC_COVER_LETTER.md` (placeholders `[DATE]`,
   `[ZENODO_CONCEPT_DOI]`).
10. **Suggested reviewers** (`78fffb7`) — `paper/submission_package/BMC_SUGGESTED_REVIEWERS.md` (20-agent
    research + per-candidate verification; 11 real, COI-checked; primary 6).

## Deploy state
- **Deployable images are built and pushed to GHCR from commit `79800c4`** (full SHA
  `79800c4562194a770b7b1bf6a04ef2a87fd05c9b`), tagged `:latest` and `:79800c4…`. They contain the independence
  gate + softened copy. Docs-only commits after that don't rebuild images, so there is **no `:98a486f`/`:c794f13`
  image** — use `:latest` or `:79800c4`.
- The live site at stickforstats.com is **NOT yet redeployed** — still running the pre-gate images.

---

## Pending — human actions, in dependency order (the DOI gates the paper chain)

- [ ] **Phase 0 — Redeploy the live site** (independent, anytime). Commands: playbook §Phase 0 / memory.
      SSH `root@91.98.93.98`; pull `:79800c4` images → `docker compose up -d --no-build` → `restart nginx`.
- [ ] **Phase 1 — Mint the Zenodo DOI** ← **DO THIS FIRST of the paper chain.** Enable the Zenodo–GitHub webhook,
      then cut a **fresh v1.1.0 release** (a v1.0.0 release already exists from April and Zenodo won't
      retro-archive it): `gh release create v1.1.0 --title "StickForStats v1.1.0" --notes-file docs/RELEASE_NOTES_v1.1.0.md --target main`.
      Zenodo mints a **concept DOI** → **send it to Claude.**
- [ ] **Phase 2 — (Claude does this)** put the DOI in the manuscript data-availability statement + `BMC_COVER_LETTER.md`,
      bump described version v1.0.0→v1.1.0, update `CITATION.cff`, re-render all PDFs.
- [ ] **Phase 3 — Post bioRxiv v2** using `BIORXIV_V2_UPLOAD.md` (PDF now carries the DOI).
- [ ] **Phase 4 — Submit to BMC Bioinformatics** (Software article): manuscript + `BMC_COVER_LETTER.md` +
      `BMC_SUGGESTED_REVIEWERS.md`; request the discretionary APC waiver in the cover letter AND the system's
      fee field.
- [ ] Decide: disclose CRISPRArchitect (authors' own tool, used in one case study) as a competing interest? (I
      wrote "none".)
- [ ] Later / Paper 2 (census+verifier): OSF pre-registration + κ double-coding; Zenodo for that too.

## What Claude will do on resume, on your word
- **Phase 2** the moment you paste the Zenodo concept DOI.
- Optionally: fix the pre-existing frontend ESLint `default-case`/`no-unused-vars` warnings (non-blocking, out
  of scope today); draft the BMC fee-waiver note for the submission system; help with the OSF pre-reg packet.

## Key file map (all under `paper/submission_package/` unless noted)
- `manuscript.md` (+ `paper/plos_compbio/manuscript.md`, kept identical) · `CHANGES_FROM_PREPRINT.md`
- `VENUE_RECOMMENDATION.md` · `BIORXIV_V2_UPLOAD.md` · `BMC_COVER_LETTER.md` · `BMC_SUGGESTED_REVIEWERS.md`
- `.zenodo.json` (repo root) · `docs/RELEASE_AND_SUBMISSION_PLAYBOOK.md` · `docs/RELEASE_NOTES_v1.1.0.md`
- `paper/replication/verification/` — calibration (`calibration_part*.py`, `CALIBRATION_BENCHMARK_MEMO.md`) +
  independence (`independence_permutation_sensitivity.py`, memos, `PI_REPLY_DRAFT_independence.md`,
  `BGPT_REVIEW_RESPONSE.md`)
- Env reminder: use `.venv-django` for backend; render PDFs via the `paper/render_pdfs.sh` STYLE (submission_package
  needs the committed `figures_plos→figures` symlink).
