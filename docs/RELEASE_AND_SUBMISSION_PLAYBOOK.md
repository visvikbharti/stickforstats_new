> **SUPERSEDED for the BMC step (2026-08-04).** Phase 4 of this playbook predates the BMC
> restructure: it points at `paper/submission_package/` and a PDF upload, neither of which is
> current. Follow **`paper/bmc_bioinformatics/SUBMISSION_STEPS.md`** instead. Phases 0–3
> (deploy, Zenodo, bioRxiv) are unaffected. Kept as a record of the plan as of 2026-07-06.

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

> **✅ STATUS 2026-07-08 — Phase 1 (DONE) & Phase 2 (DONE).** Webhook enabled, `v1.1.0` released, **concept
> DOI `10.5281/zenodo.21258381`** minted; DOI wired into both manuscripts + cover letter + `CITATION.cff`,
> PDFs re-rendered, pushed (`main` = `1495d5b`). **Next: Phase 3 (bioRxiv v2) → Phase 4 (BMC submission).**
> Phase 0 (redeploy) still optional/independent.

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
```

> `curl -fsS https://stickforstats.com/api/health` used to be the last line here. It does not work:
> that route **404s** (verified 2026-08-05), and the site is behind basic auth so an unauthenticated
> curl gets 401 before it ever reaches a route. Use the behavioural checks below instead.

### Two traps the 2026-08-05 v1.2.0 deploy hit

**1. `collectstatic` fails, and `set -e` then skips the nginx restart.**
`/app/static` is the named volume `backend-static`, not image content, so it still holds root-owned
files from an earlier run and the non-root container cannot overwrite them:

    PermissionError: [Errno 13] Permission denied: '/app/static/admin/css/dashboard.css'

Cosmetic in itself — the image already carries its statics, and nginx has **no `location /static/`
block**, so Django admin assets are not served in production either way (the SPA's own bundles come
from the frontend container and are unaffected). But under `set -euo pipefail` the failure aborts the
script *before* `docker compose restart nginx`, the one step this runbook calls essential. Either
tolerate it explicitly, or drop the step since the image is built with statics already collected:

```bash
docker compose exec -T backend python manage.py collectstatic --noinput || \
  echo "collectstatic failed (root-owned backend-static volume); non-fatal, continuing"
docker compose restart nginx
```

**2. Do not pipe the deploy script into `ssh 'bash -s'`.**
`docker compose exec -T` reads stdin, and when the script itself arrives on stdin the exec swallows
the remainder of it. The first attempt stopped silently after the database backup — no error, no
indication anything was missing. Copy it over and run it as a file with stdin closed:

```bash
scp deploy.sh root@HOST:/root/ && ssh root@HOST 'bash /root/deploy.sh < /dev/null'
```

### Verify by BEHAVIOUR, not by a version string

`git rev-parse HEAD` on the host lies, and so can an API field: before this deploy the live site
listed `similar_shapes` in `assumptions_checked` precisely **because** nothing evaluated it. The
label was evidence of the bug, not of the fix. Assert what the software *does* (all four passed on
2026-08-05):

- a 100x spread difference **raises** a shape violation — confidence 0.444, not 1.000
- the t-test returns `ci_lower`, `ci_upper`, `effect_size`, `mean_difference`
- an unknown `test_type` is refused with **400**, not certified
- anonymous access is still **401** — a deploy must never open the closed beta

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
