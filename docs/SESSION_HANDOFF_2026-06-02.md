# Session Handoff — 2026-06-02

> **Dated snapshot — superseded.** This records what was believed on the date in its title.
> For the current state of the project, start at [`README.md`](README.md) (the undated index),
> then [`STATUS_2026-07-14.md`](STATUS_2026-07-14.md) and [`TODO_2026-07-14.md`](TODO_2026-07-14.md).
> **Do not trust a "Still open" section in a dated document without re-checking it.**

**Theme:** Deployed the closed beta to a real host end-to-end, found + fixed two real image
bugs, hardened the repo so the deploy is reproducible, and added the §0 beta-shape (banner +
privacy notice + feedback channel). **StickForStats is live at https://stickforstats.com.**

---

## 1. The beta is LIVE — https://stickforstats.com

| Thing | State |
|---|---|
| Host | Hetzner Cloud **CPX32** (AMD x86, 4 vCPU / 8 GB / 160 GB), Falkenstein, Ubuntu 26.04. Public IP **91.98.93.98**. |
| Access | `ssh root@91.98.93.98` (Mac `~/.ssh/id_ed25519`, no passphrase). |
| Domain / TLS | `stickforstats.com` on **Cloudflare** (DNS-only/grey, A → 91.98.93.98). Trusted **Let's Encrypt** cert (expires 2026-08-31), **auto-renewal hooks installed + dry-run validated**. |
| Stack | `/opt/stickforstats_new`, docker-compose, GHCR images retagged `:1.0.0`, 10 containers, internals bound to `127.0.0.1`, ufw 22/80/443. |
| Closed-beta gate | nginx HTTP Basic Auth at the edge. **User `beta`, password in `/root/stickforstats-beta-access.txt`** (chmod 600). Django admin: `/admin/`, user `admin`, password in `/root/stickforstats-admin.txt`. |
| Verified | Smoke **7/7**, homepage = real React app, TLS clean, gate 401/200. |

**To log in:** open the site → enter the beta credential (`ssh root@91.98.93.98 cat /root/stickforstats-beta-access.txt`).

Full operational detail is in memory: `deploy-live-2026-06-02.md`.

---

## 2. What we did this session

### Deploy (the whole runbook, driven via SSH from the Mac)
Provisioned the VPS, registered `stickforstats.com` on Cloudflare, installed Docker + ufw, pulled
GHCR images, wrote `.env` (strong secrets, generated on the box), issued the LE cert, brought up
the stack, migrated, created the admin, added the Basic Auth gate, and validated cert auto-renewal.

### Two real image bugs — FOUND + FIXED in repo (PR #2, `629b083`), redeployed clean
1. **Backend 301 loop** — `settings.py` enabled `SECURE_SSL_REDIRECT` with no `SECURE_PROXY_SSL_HEADER`,
   so Django 301-redirected every API call behind the TLS proxy. Added `SECURE_PROXY_SSL_HEADER` +
   env-driven `CSRF_TRUSTED_ORIGINS`.
2. **Frontend SPA-wide 404** — `frontend/default.conf` had a "block attack patterns" regex with a
   bare-dot alternative `(\.|...)` that matched every dotted path → 404'd `index.html` and the whole
   SPA. Dropped the `\.`; now targets real wp-* probes.
   Also: `nginx/nginx.conf` got `client_max_body_size 50m`; committed `backend/sql/init.sql` placeholder.
   → CI rebuilt the images, **redeployed from clean images — no runtime workarounds remain.**

### §0 beta-shape (PR #3, `7d44e34`)
- **Persistent beta banner** on every app page (`BetaBanner.jsx`): "results may change; verify before
  publishing" + links to the GitHub-issues feedback channel and the privacy notice.
- **Privacy notice** at `/privacy` (`PrivacyPolicyPage.jsx`) — the footer already linked it (was 404).
- Feedback channel = GitHub issues (already wired in the footer "Report Issues").

---

## 3. What's left

### Beta-shape / product
- The banner renders on every **app** page; the root marketing/landing splash (`/` before "Enter")
  does not show it yet — add there too if desired.
- The footer still has a dead `mailto:contact@stickforstats.com`; either set up that forwarding on the
  new domain or point it at a real inbox.

### P1 quality (can run during beta)
- **`paths-ignore` on `.github/workflows/ci.yml`** — every push (incl. docs) still triggers a full
  image rebuild. This handoff commit is a good time to add it.
- **`sdk/python/tests/`** — the `sfs` CLI is still untested (CI "SDK Test" is a no-op).
- **Playwright E2E** still red (non-gating `continue-on-error`); investigate before flipping it gating.
- **README badges** stale (`38/38`) vs current 831/654.

### Strategy / papers (correction this session)
- **Both JSS and JOSS REJECTED** (JOSS was the first submission, per the user — earlier memory wrongly
  said "ready to submit"). Re-strategize: reframe for a comp-bio/reproducibility venue (PLOS Comp Bio
  with the genomics-led framing, or GigaScience / PLOS ONE / SoftwareX). Confirm the exact JOSS
  rejection reason with the user first. See `strategy-positioning-2026-06-01.md`.

### Moat (P2)
- Build the "reproducibility receipt" provenance feature (see `docs/STRATEGY_AND_POSITIONING_2026-06-01.md`).

---

## 4. Operational notes / how to update the live site
- **App code update:** merge to `main` → CI rebuilds + publishes GHCR images → on the VPS:
  `cd /opt/stickforstats_new`, `docker pull` both images + retag to `:1.0.0`,
  `docker compose up -d --no-build`, **then `docker compose restart nginx`** — recreated
  backend/frontend containers get new IPs and nginx caches the old ones, returning **502** until it is
  restarted. Only `git fetch && git reset --hard origin/main` when the update also changed
  `docker-compose.yml` / `nginx/nginx.conf` / other tracked deploy files — and then re-add the
  `auth_basic` gate lines to `nginx/nginx.conf` afterwards (`.htpasswd` persists in `nginx/ssl/`).
- **nginx config changes need a recreate, not just reload** (`docker compose up -d --force-recreate nginx`) —
  graceful reload didn't reliably apply the gate.
- **`docker compose exec -T` consumes heredoc stdin** — always add `</dev/null` when running it inside an
  `ssh bash -s <<HEREDOC` block (silently skipped migrate once).
- **`KEYCLOAK_ADMIN_PASSWORD` must be set in `.env`** even though keycloak is profiled-out (compose
  evaluates `${VAR:?}` across the whole file).
- **Cert renewal** stops nginx (frees port 80 for certbot standalone) → renews → copies certs → starts
  nginx; hooks in `/etc/letsencrypt/renewal-hooks/{pre,deploy,post}/`. ~30-60s downtime per ~60-day renewal.

---

## 5. Key artifacts
- Memory (read first): `deploy-live-2026-06-02.md`, `strategy-positioning-2026-06-01.md`.
- `docs/DEPLOYMENT_RUNBOOK.md` — the single-host procedure (now battle-tested).
- `docs/BETA_DEPLOYMENT_CHECKLIST.md` — go/no-go gate.
- Merged this session: PR #2 (image bug fixes), PR #3 (beta-shape).
