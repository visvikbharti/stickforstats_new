# Release & submission playbook — Paper 1 (StickForStats / Guardian)

**Created:** 2026-07-06. The remaining actions are human-only (portals, deploy, DOI). This is the exact order.
Dependency: **the Zenodo DOI must exist before bioRxiv v2 and the BMC submission**, because both cite it.

```
Phase 0  Redeploy the live site          (independent — do anytime)
Phase 1  Mint the Zenodo DOI             (do first of the paper chain)  ← .zenodo.json is ready
Phase 2  Add the DOI to the manuscript + re-render   (I do this once you give me the DOI)
Phase 3  Post bioRxiv v2                  (uses the updated PDF)
Phase 4  Submit to BMC Bioinformatics     (uses the DOI + updated PDF)
```

Legend: 🧑 = you (portal/creds needed) · 🤖 = I can do it in-repo when you say go.

---

## Phase 0 — Redeploy the live site 🧑  (independent; the code changes are already on `main`, images built from `79800c4`)

SSH in and run the update flow (full detail: `docs/DEPLOYMENT_RUNBOOK.md` §Update). Short version:
```bash
ssh root@91.98.93.98
cd /path/to/stickforstats            # dir with docker-compose.yml + .env  (find it: docker compose ls)
docker compose exec postgres-backup /backup.sh          # 1. backup
SHA=79800c4562194a770b7b1bf6a04ef2a87fd05c9b             # or use :latest
docker pull ghcr.io/visvikbharti/stickforstats_new/backend:$SHA
docker pull ghcr.io/visvikbharti/stickforstats_new/frontend:$SHA
docker tag  ghcr.io/visvikbharti/stickforstats_new/backend:$SHA  stickforstats/backend:1.0.0
docker tag  ghcr.io/visvikbharti/stickforstats_new/frontend:$SHA stickforstats/frontend:1.0.0
docker compose up -d --no-build                         # 2. recreate
docker compose exec backend python manage.py migrate --noinput          # (no new migrations; safe)
docker compose exec backend python manage.py collectstatic --noinput
docker compose restart nginx                            # 3. the known post-recreate gotcha
curl -fsS https://stickforstats.com/api/health && echo OK
```
Verify: homepage reads "guards against Type I errors"; a t-test on cross-sectional data shows independence
"referred to study design" instead of a lag-1 violation.

---

## Phase 1 — Mint the Zenodo DOI 🧑  (`.zenodo.json` is committed and ready)

Zenodo archives a GitHub release and mints a DOI. **A v1.0.0 release already exists (from April), which Zenodo
will NOT retroactively archive — it only archives releases created *after* the webhook is enabled.** So:

1. **Enable the webhook:** go to https://zenodo.org → log in **with GitHub** → top-right ▾ → **GitHub** →
   find `visvikbharti/stickforstats_new` in the list → flip the toggle **ON**. (If the repo isn't listed, click
   "Sync now".)
2. **Cut a NEW release** (a fresh tag Zenodo can catch — I recommend **v1.1.0**, since the code now has the
   calibration benchmark + variance-aware independence gate since v1.0.0). Run locally, or use the GitHub UI:
   ```bash
   # release notes are pre-written at docs/RELEASE_NOTES_v1.1.0.md
   gh release create v1.1.0 --title "StickForStats v1.1.0" --notes-file docs/RELEASE_NOTES_v1.1.0.md --target main
   ```
3. **Wait ~1–2 min.** Zenodo receives the webhook, archives the repo tarball, and mints the DOI. Refresh your
   Zenodo **Uploads** page (or the repo's GitHub row) — you'll see the new record with a DOI badge.
4. **Copy the CONCEPT DOI** (the "Cite all versions" one, e.g. `10.5281/zenodo.XXXXXXX`) — that's the one to
   put in the paper (it always resolves to the latest version). There's also a version-specific DOI; the paper
   uses the concept DOI.
5. Optional but recommended: on the Zenodo record, confirm the auto-filled metadata came from `.zenodo.json`
   (title, both authors + ORCIDs, MIT, keywords). Edit/publish if it landed as a draft.

**→ Send me the concept DOI and I'll do Phase 2 immediately.**

---

## Phase 2 — Put the DOI in the manuscript + re-render 🤖  (I do this when you give me the DOI)

I will, in both manuscript copies:
- update the data-availability statement from *"a versioned snapshot will be archived on Zenodo"* to the actual
  DOI, and bump the described version to match the release tag (v1.0.0 → v1.1.0);
- update `CITATION.cff` (add `doi:`, bump `version`/`date-released`);
- re-render both PDFs (incl. the bioRxiv v2 PDF) so the DOI is baked in;
- commit + push.

---

## Phase 3 — Post bioRxiv v2 🧑  (packet: `paper/submission_package/BIORXIV_V2_UPLOAD.md`)

Preprints can't be deleted — you post a new version. After Phase 2 the v2 PDF already contains the DOI.
1. Log in to bioRxiv with the account that submitted v1 → open the preprint (doi `10.64898/2026.06.15.732278`)
   → **Submit a revision / New version**.
2. Upload the freshly-rendered `paper/submission_package/manuscript_rendered.pdf`.
3. Paste the "Summary of changes" text from `BIORXIV_V2_UPLOAD.md` into the revision-notes box.
4. Confirm authors/affiliations carry over → submit. It posts as **v2**; v1 stays in history.

---

## Phase 4 — Submit to BMC Bioinformatics 🧑  (rationale: `paper/submission_package/VENUE_RECOMMENDATION.md`)

Target: **BMC Bioinformatics**, article type **"Software"** (JCR Q1 in 3 categories, soundness-not-novelty
policy). https://bmcbioinformatics.biomedcentral.com/submission-guidelines
1. Create an account / start a submission; choose the **Software** article type.
2. Frame the cover letter around soundness + the RNA-seq case study; **explicitly request the discretionary
   need-based APC waiver** (India gets no automatic waiver — full APC ≈ $2,890). (I can draft this cover letter.)
3. Data & code availability: cite the **Zenodo concept DOI** + the GitHub repo + the public datasets.
4. Note the bioRxiv v2 preprint DOI in the submission (BMC permits prior preprints).
5. Suggested reviewers / competing interests as required.

Backups if BMC declines: **BMC Medical Research Methodology** → **Frontiers in Bioinformatics** (ESCI — confirm
your PhD framework accepts it) → **Scientific Reports** (Q1 safety net). Do **not** target novelty-gating Q1s
(Briefings, Bioinformatics/OUP, Patterns) or the three that already rejected.

---

## What I can do next on request
- Draft the **BMC Bioinformatics cover letter** (soundness framing + APC-waiver request).
- Do **Phase 2** the moment you have the DOI.
- Update `CITATION.cff` with the DOI.
- Consolidate the OSF pre-registration + κ double-coding materials (for the census Paper 2).
