# What to do next — the single action plan (2026-06-29)

**This is your one place.** Everything that's *done* and everything that's *left*, in order, with who does
each step. Legend: **[YOU]** = needs your account/judgment · **[ASSISTANT]** = Claude can do it on request ·
✅ = done.

---

## 0. Snapshot — what is already done

- ✅ **Manuscript Verifier (web)** built, reviewed, and **LIVE** at `https://stickforstats.com/manuscript-verifier` (behind the beta login). Documented in the live `/api-docs`.
- ✅ **Verify API** hardened (per-IP + per-user rate limits; `VERIFY_REQUIRE_AUTH` toggle) and deployed.
- ✅ **Python SDK 0.4.0** published to PyPI — `pip install -U stickforstats` gives `client.verify` and `sfs verify`.
- ✅ **Branches cleaned**: only `main` (now current) and `docs/plos-compbio-submission` remain. An orphaned prod fix (Redis ping timeout) was rescued first.
- ✅ **Two-paper plan** adopted and propagated to all planning docs.
- ✅ **Both manuscripts rendered to PDF** (see file map below). The platform paper's two integrity fixes are already applied; the census paper now has the "verification engine" Methods section.

**The active working branch is `docs/plos-compbio-submission`; `main` is in sync. Use either — they're identical.**

---

## 1. PAPER 1 — Platform / Guardian software paper  *(closest to submission)*

Folder: `paper/submission_package/`. Manuscript content is ready; remaining work is packaging + your accounts.
**Do these in order:**

### Step 1.1 — Mint the Zenodo DOI  **[YOU]**
1. **zenodo.org** → Log in → **"Log in with GitHub"** → authorize.
2. **zenodo.org/account/settings/github/** → find **`visvikbharti/stickforstats_new`** → toggle **ON**.
   - ⚠️ Zenodo only archives releases published **after** the toggle. Your existing `v1.0.0` won't be caught.
3. On GitHub → repo → *Releases* → *Draft a new release* → tag **`v1.0.1`** → target `main` → **Publish**.
4. Back on Zenodo → *Uploads* → open the new record → **Edit** metadata: authors **Vishal Bharti + Debojyoti Chakraborty (+ ORCIDs)**, affiliation CSIR-IGIB, license **MIT**, keywords → **Publish**.
5. Copy the **concept DOI** (the "all versions" one).

### Step 1.2 — Put the DOI in the manuscript  **[ASSISTANT]**
Give me the concept DOI and I'll add it to the Data/Code Availability statement + references, then **re-render the PDF**.

### Step 1.3 — Post bioRxiv v2  **[YOU]**
Your v1 is doi **10.64898/2026.06.15.732278**. The upload file is **`paper/submission_package/manuscript_rendered.pdf`** (figures embedded). The change summary is **`paper/submission_package/CHANGES_FROM_PREPRINT.md`**.
1. **biorxiv.org** → log in (the v1 account) → your paper → **"Submit a revised version."**
2. Upload `manuscript_rendered.pdf` (+ the 7 figures from `paper/submission_package/figures/` if asked separately).
3. Paste `CHANGES_FROM_PREPRINT.md` into the **summary of changes** box.
4. Submit → bioRxiv screens it (~1–2 days) → posts as **v2** under the same DOI.

### Step 1.4 — Pick a venue  **[YOU]**
Default **PLOS ONE** (soundness-not-novelty — answers the 3 prior scope rejections). Cheaper: **PeerJ** or **GigaByte**. Full ranked list + APCs in `paper/submission_package/SUBMISSION_GUIDE.md`.

### Step 1.5 — Package & submit  **[YOU + ASSISTANT]**
Work the **pre-submission checklist in `SUBMISSION_GUIDE.md`**: reformat to the venue template, re-export figures to its DPI, fill `COVER_LETTER.md`, verify both ORCIDs, list 3–5 suggested reviewers, complete declarations, disclose the preprint + AI use. I can help with the reformat/cover letter; you submit through the portal.

> **Sequence:** 1.1 → 1.2 → 1.3 → 1.4 → 1.5. (Mint the DOI *before* bioRxiv v2 and the journal submission so both cite it.)

---

## 2. PAPER 2 — Verifier + Census  *(meta-research; gated on human steps)*

Folder: `paper/census_paper/`. The verifier is the **Methods backbone**; the 10k census is the **result**.
The descriptive draft is ready; the pre-registered/confirmatory version needs the human steps below.

### Step 2.1 — File the OSF pre-registration  **[YOU]**
1. Open `paper/census_paper/PREREGISTRATION.md` → fill the **two coder names in §6.2**.
2. **osf.io** → new Registration → "Existing-Data / OSF Preregistration" template → paste the content → **register** (this timestamps it). Keep the OSF project; it doubles as your data archive (Step 2.5).

### Step 2.2 — Run the κ double-coding  **[YOU + 2 coders]**  ← *the credibility anchor*
1. Hand each coder: **`CODER_INSTRUCTIONS.md`** + **`CODEBOOK.md`** + their own copy of **`gold_set_coding_sheet.csv`** (151 rows).
2. They code **independently and blinded** (must NOT open `gold_set_key.csv`).
3. When both return their copies → **[ASSISTANT]** I merge the columns and run `compute_kappa.py` → `KAPPA_REPORT.md` (gate: **κ ≥ 0.6**).

### Step 2.3 — Run the confirmatory census  **[ASSISTANT]**
After the pre-reg is filed, I run the equal-probability census (needs the external drive mounted). IPW already shows the result won't move — this is confirmation, not a new finding.

### Step 2.4 — Finish the manuscript  **[ASSISTANT]**
The "verification engine" Methods section is drafted. I can expand it / fold in the κ + confirmatory results when ready.

### Step 2.5 — Data deposit + venue + submit  **[YOU + ASSISTANT]**
Deposit the small **derived** data (census ledger + flagged claims + scripts) on the **same OSF project** as the pre-reg (run `prepare_osf_deposit.py`); no separate Zenodo needed. Venue options: PLOS ONE / PeerJ, or a meta-research venue (Research Integrity & Peer Review, BMC Med Res Methodology, Royal Society Open Science).

---

## 3. Deployment / ops  *(all live; optional housekeeping)*

- ✅ Prod is live and current (frontend + backend redeployed from this branch; migration 0015 applied).
- **[YOU/ASSISTANT, optional]** Repoint prod to track `main` (now that `main` is current), then we can retire `docs/plos-compbio-submission` → a single-branch repo.
- **[YOU, deferred]** Rotate the beta Basic-Auth password (you chose to skip for now).
- **[YOU, before public launch]** Set `VERIFY_REQUIRE_AUTH=True` in the server `.env` to require login on the verify endpoints; install `tesseract`+`poppler` for figure OCR.

---

## 4. File map — where everything is

| What | Path |
|---|---|
| Platform paper (manuscript / PDF / guide / cover / changelog) | `paper/submission_package/` (`manuscript.md`, `manuscript_rendered.pdf`, `SUBMISSION_GUIDE.md`, `COVER_LETTER.md`, `CHANGES_FROM_PREPRINT.md`) |
| Census paper | `paper/census_paper/` (`manuscript.md`, `manuscript_rendered.pdf`, `PREREGISTRATION.md`, `CODER_INSTRUCTIONS.md`, `CODEBOOK.md`, `gold_set_coding_sheet.csv`, `compute_kappa.py`, `prepare_osf_deposit.py`) |
| Replication scripts + census figures/reports | `paper/replication/` and `paper/replication/verification/` |
| Verifier backend | `backend/core/manuscript/` + `backend/api/v1/verify_views.py` |
| Verifier frontend | `frontend/src/components/manuscript/BundleVerifier.jsx`, `VerificationReport.jsx` |
| Python SDK | `sdk/python/` (published as `stickforstats` 0.4.0) |
| Project onboarding (read-first for a newcomer) | `docs/PROJECT_ONBOARDING_2026-06-27.md` |

*(Rendered `*_rendered.pdf` files are local build artifacts — gitignored. Re-render any manuscript with the
pandoc→Chrome pipeline; ask the assistant.)*

---

## 5. The 3 things blocking publication right now

1. **[YOU] Mint the Zenodo DOI** (Step 1.1) — unblocks bioRxiv v2 + platform submission.
2. **[YOU] File the OSF pre-reg + start the κ coding** (Steps 2.1–2.2) — the only human-irreducible steps for paper 2.
3. **[YOU] Pick the two venues** (1.4, 2.5).

Everything else, I can do on request.
