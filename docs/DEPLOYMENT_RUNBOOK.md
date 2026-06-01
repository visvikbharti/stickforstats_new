# StickForStats — Production Deployment Runbook (Closed Beta)

Created: 2026-06-01

> Scope: deploy StickForStats for a **closed / invite-only beta** on a **single Linux host** using Docker Compose and the pre-built GHCR images. This document is the concrete, current single-host procedure. For enterprise/Kubernetes/compliance reference material see [`docs/DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) (largely aspirational / stale — do not treat as authoritative). For the go/no-go gate and beta-shape decisions see [`docs/BETA_DEPLOYMENT_CHECKLIST.md`](./BETA_DEPLOYMENT_CHECKLIST.md), which this runbook operationalizes.

---

## 1. Architecture overview

### Services in this deploy

A plain `docker compose up` starts these **default** services (the beta set):

| Service | Image | Host port → container | Purpose | Healthcheck |
|---|---|---|---|---|
| `frontend` | `stickforstats/frontend:1.0.0` (local tag) or GHCR | `${FRONTEND_PORT:-80}` → 80 | React SPA served by its own internal nginx; proxies `/api` and `/ws` to `backend:8000` | `curl -f http://localhost/health` → returns plain text `healthy` |
| `backend` | `stickforstats/backend:1.0.0` (local tag) or GHCR | `${BACKEND_PORT:-8000}` → 8000 | Django + gunicorn (WSGI `stickforstats.wsgi:application`, 4 workers × 2 threads) | `curl -f http://localhost:8000/api/health` (compose; Dockerfile uses `/api/health/`, smoke test uses `/api/v1/health/`) |
| `postgres` | `postgres:15-alpine` | `${DB_PORT:-5432}` → 5432 | Primary database | `pg_isready -U $DB_USER` |
| `redis` | `redis:7-alpine` | `${REDIS_PORT:-6379}` → 6379 | Cache, Celery broker + result backend | `redis-cli -a $REDIS_PASSWORD ping` |
| `celery` | same image as backend | none | Async task worker | none |
| `celery-beat` | same image as backend | none | Periodic task scheduler | none |
| `prometheus` | `prom/prometheus` | `${PROMETHEUS_PORT:-9090}` → 9090 | Metrics (scrapes `backend:8000/api/v1/metrics/`) | `wget --spider /-/healthy` |
| `grafana` | `grafana/grafana` | `${GRAFANA_PORT:-3000}` → 3000 | Dashboards | `curl -f /api/health` |
| `nginx` | `nginx` | `80` → 80, `443` → 443 (hardcoded) | Optional TLS edge / reverse proxy | `nginx -t` |
| `postgres-backup` | `postgres:15-alpine` | none | Cron-driven `pg_dump` (default daily 02:00) | none |

> `backend`, `celery`, and `celery-beat` **share the same backend image**. Anything you do to the backend image (GHCR remap, retag) must be applied to all three.

### Out of beta scope (do NOT enable)

- **`keycloak` and `kong`** — behind the `enterprise` compose profile; not started by default and **not part of the beta**. (Also note: per project notes Kong ships with no auth plugin attached and Keycloak is OIDC-only — do not rely on either for the beta.)
- **mobile / desktop / SDK apps** — mark as *experimental / not in beta*.
- **FDA-validated mode, SAML, multi-tenant schema-per-tenant, k8s** — scaffolded/aspirational; the beta does not depend on them.

### Beta application scope (what you are shipping)

Autonomous analysis, the Guardian system, manuscript statistical review, and the core statistical endpoints. Everything else is experimental.

### Port topology decision (read before deploying)

There is a **confirmed host port-80 collision**: the `frontend` service defaults to `${FRONTEND_PORT:-80}:80` AND the `nginx` service hardcodes `80:80`. Both are in the default set, so a plain `docker compose up` with `FRONTEND_PORT` unset **fails to bind port 80 twice**.

**Recommended TLS topology (simplest that works): the standalone `nginx` service is the single TLS terminator.**
- Set `FRONTEND_PORT` so the frontend container does **not** publish host port 80 (we use `127.0.0.1:8090` so it is reachable only from the host, not the public interface).
- `nginx` owns host `80` (HTTP → 301 redirect to HTTPS) and `443` (TLS), and proxies internally to `frontend:80` and `backend:8000` over the `stickforstats-network`.
- This is the topology assumed throughout Section 3.

(Alternative: drop the `nginx` service and expose `frontend` directly — but you lose TLS, the `/api`+`/ws` proxying, HSTS, and rate-limiting defined in `nginx/nginx.conf`. Not recommended for a beta that needs HTTPS.)

---

## 2. Prerequisites

- Fresh **Ubuntu** host (22.04 LTS or newer), root or sudo shell access.
- A **DNS A record** pointing your beta hostname (e.g. `beta.example.com`) at the host's public IP — required for real TLS certs and for `DJANGO_ALLOWED_HOSTS`.
- Inbound firewall open for **80** and **443** (and **22** for SSH). Do **not** expose 5432/6379/9090/3000/8000 publicly — **note these default to `0.0.0.0` host binds in compose**, so either bind them to localhost in `.env` (Section 3.5 shows the `127.0.0.1:PORT` overrides) **or** a host firewall denying inbound on them is mandatory, not optional.
- At least **~10 GB free disk**. Prefer pulling GHCR images over building locally (the build is multi-GB and has caused disk-full on low-disk hosts).
- Outbound network access to `ghcr.io` (and Let's Encrypt if using certbot).

---

## 3. Step-by-step deploy

### 3.1 Provision the host & install Docker

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git gnupg

# Install Docker Engine + Compose plugin (official convenience script)
curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
sudo sh /tmp/get-docker.sh

# Allow your user to run docker without sudo (log out/in afterwards)
sudo usermod -aG docker "$USER"
newgrp docker

# Verify
docker --version
docker compose version
```

### 3.2 Get the code

You need the repo for `docker-compose.yml`, `nginx/`, `monitoring/`, `scripts/`, and `.env.example`. You will pull the app **images** from GHCR rather than building them.

```bash
git clone https://github.com/visvikbharti/stickforstats_new.git
cd stickforstats_new
```

> Released beta state is tag `v1.0.0-beta.1` (a GitHub prerelease) at commit `ba0e119` on `origin/main`. If you cloned fresh you are already on the released `main`. If you are working from an existing checkout whose local `main` has diverged, reconcile with `git fetch && git reset --hard origin/main` (this discards local-only doc commits) or check out the tag: `git checkout v1.0.0-beta.1`.

### 3.3 Use the published GHCR images (do NOT build on the host)

The compose file gives `frontend`/`backend`/`celery`/`celery-beat` **both** a `build:` and an `image:` key. With Compose, when both are present `docker compose up` **builds locally** and only uses the `image:` value as a local tag — it never pulls from a registry. To use the published GHCR images instead, pull them and **retag to the exact local refs Compose expects** (`VERSION` defaults to `1.0.0`), then bring the stack up with `--no-build`.

```bash
# (Only if the GHCR package is private; public packages pull anonymously.)
# docker login ghcr.io     # username = GitHub user, password = PAT with read:packages

docker pull ghcr.io/visvikbharti/stickforstats_new/backend:latest
docker pull ghcr.io/visvikbharti/stickforstats_new/frontend:latest

# Retag so Compose's image: refs resolve to the GHCR images
docker tag ghcr.io/visvikbharti/stickforstats_new/backend:latest  stickforstats/backend:1.0.0
docker tag ghcr.io/visvikbharti/stickforstats_new/frontend:latest stickforstats/frontend:1.0.0
```

> All three of `backend`, `celery`, `celery-beat` reference `stickforstats/backend:1.0.0`, so the single backend retag above covers all three.
>
> (Advanced alternative — a `docker-compose.override.yml` that sets `image:` to the GHCR refs and resets `build`, then `docker compose pull && docker compose up -d`. The retag path above is simpler and is what the rest of this runbook assumes.)

### 3.4 Fix the two shipped infra bugs (do this BEFORE first `up`)

**(a) Missing `backend/sql/init.sql` bind mount.** `docker-compose.yml` (~line 103) bind-mounts `./backend/sql/init.sql` into postgres, but that file and its parent directory **do not exist**. Docker would auto-create an empty *directory* at that path, which postgres ignores (DB schema comes from Django migrations anyway, so the app still works — but it leaves a stray dir and is misleading). Create a harmless placeholder so the mount is a real file:

```bash
mkdir -p backend/sql
printf -- '-- StickForStats DB init (intentionally empty; schema is managed by Django migrations)\n' > backend/sql/init.sql
```

*(Cleaner alternative if you prefer: delete the `./backend/sql/init.sql:...` line from `docker-compose.yml`. The placeholder file is the lower-risk option and is assumed below.)*

**(b) Empty `nginx/ssl/` and the dead `nginx/sites-enabled/`.** TLS certs are handled in 3.6. Note that `nginx/sites-enabled/` is mounted but **never `include`d** by `nginx/nginx.conf` — dropping files there has no effect; ignore it.

### 3.5 Create the real `.env` with strong secrets

Copy the tracked template (`.env.example` is the correct source filename; `.env` is gitignored) and fill in **strong, unique** values. Several secrets are duplicated under two names and **each pair must be identical**.

```bash
cp .env.example .env

# Generate secrets
echo "DJANGO_SECRET_KEY / SECRET_KEY:  $(openssl rand -hex 32)"
echo "JWT_SECRET:                      $(openssl rand -hex 32)"
echo "DB_PASSWORD:                     $(openssl rand -base64 24)"
echo "REDIS_PASSWORD:                  $(openssl rand -base64 24)"
echo "GRAFANA_PASSWORD:                $(openssl rand -base64 24)"
```

Edit `.env` and set at minimum (substitute the generated values and your real hostname):

```dotenv
# --- Core mode ---
ENVIRONMENT=production
DEBUG=false
DJANGO_DEBUG=False            # MUST stay False — DEBUG=False auto-enables HSTS,
                              # secure cookies, SSL redirect, AND rate limiting.

# --- Secrets (set DJANGO_SECRET_KEY and SECRET_KEY to the SAME value) ---
DJANGO_SECRET_KEY=<openssl rand -hex 32 output>
SECRET_KEY=<same value as DJANGO_SECRET_KEY>
JWT_SECRET=<openssl rand -hex 32 output>
DB_PASSWORD=<openssl rand -base64 24 output>
REDIS_PASSWORD=<openssl rand -base64 24 output>
GRAFANA_PASSWORD=<openssl rand -base64 24 output>

# --- Hosts / URLs (replace yourdomain.com EVERYWHERE; keep each pair in sync) ---
DJANGO_ALLOWED_HOSTS=beta.example.com
ALLOWED_HOSTS=beta.example.com
API_URL=https://beta.example.com/api
WS_URL=wss://beta.example.com/ws
CORS_ORIGINS=https://beta.example.com
CORS_ALLOWED_ORIGINS=https://beta.example.com
FRONTEND_URL=https://beta.example.com
GRAFANA_ROOT_URL=http://localhost:3000   # Grafana is NOT behind the nginx TLS edge; reach it via SSH tunnel, not a public https URL

# --- Port topology: keep frontend OFF host port 80 so the nginx edge owns 80/443 ---
FRONTEND_PORT=127.0.0.1:8090
# Bind every internal service to localhost so it is NOT world-reachable (compose
# defaults these to 0.0.0.0). nginx still reaches backend/frontend over the
# internal docker network, so these public binds are not needed externally:
DB_PORT=127.0.0.1:5432
REDIS_PORT=127.0.0.1:6379
PROMETHEUS_PORT=127.0.0.1:9090
GRAFANA_PORT=127.0.0.1:3000
BACKEND_PORT=127.0.0.1:8000

# --- Optional beta tuning ---
MAX_FILE_UPLOAD_MB=25        # app-level upload cap (default 25 MB)
WORKER_CONCURRENCY=4
LOG_LEVEL=INFO
```

Required fail-closed vars (compose **refuses to start** without them, and `settings.py` raises `ImproperlyConfigured` without `DJANGO_SECRET_KEY` when serving prod): `DB_PASSWORD`, `REDIS_PASSWORD`, `SECRET_KEY`, `JWT_SECRET`, `GRAFANA_PASSWORD`. (`KEYCLOAK_ADMIN_PASSWORD` is only needed for the enterprise profile, which the beta does not use.)

Confirm `.env` is gitignored and there are no leftover weak defaults:

```bash
git check-ignore -v .env    # expect: .gitignore:30   .env

# Expect NO matches — these literal weak defaults must be gone:
grep -nE 'change_this|redis_secure_password' docker-compose.yml backend/stickforstats/settings.py || echo "clean — no weak defaults"

# 'testserver' SHOULD still appear once in settings.py, but ONLY on the
# DEBUG/TESTING-gated ALLOWED_HOSTS line — that is correct (it is dropped in prod), not a leak:
grep -n 'testserver' backend/stickforstats/settings.py
```

> Caveat on URL vars: `DATABASE_URL` / `REDIS_URL` / `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` in the template use `${VAR}` interpolation. They expand correctly when loaded by docker-compose (which substitutes `${...}`). Do not hand-load `.env` with plain dotenv expecting expansion.

### 3.6 Provide TLS certificates

`nginx/nginx.conf` hard-requires **exactly** `/etc/nginx/ssl/cert.pem` and `/etc/nginx/ssl/key.pem` (mounted read-only from host `./nginx/ssl/`). The directory ships **empty**, so nginx will not start until you place these two files (with these exact names).

**Production (real domain) — Let's Encrypt / certbot (manual; no certbot container exists):**

```bash
sudo apt-get install -y certbot
# Port 80 must be free on the host (stop nginx service if running) and DNS must point here.
sudo certbot certonly --standalone -d beta.example.com

mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/beta.example.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/beta.example.com/privkey.pem   nginx/ssl/key.pem
sudo chown "$USER":"$USER" nginx/ssl/cert.pem nginx/ssl/key.pem
```

Renewal is manual: re-run certbot, re-copy to `cert.pem`/`key.pem`, then `docker compose restart nginx`.

**Staging only (self-signed; browsers will warn):**

```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem \
  -subj '/CN=beta.example.com' \
  -addext 'subjectAltName=DNS:beta.example.com'
```

### 3.7 Bring up the stack

```bash
docker compose up -d --no-build
```

`--no-build` forces Compose to use the GHCR images you retagged in 3.3 instead of building locally. Watch them come up:

```bash
docker compose ps
docker compose logs -f backend     # Ctrl-C to stop following
```

> `depends_on` in this compose file uses plain start-order (no `service_healthy` conditions), so the backend can start before postgres/redis are actually ready on first boot. If the backend logs DB-connection errors, give postgres a few seconds and `docker compose restart backend celery celery-beat`.

### 3.8 Run migrations, static files, and create the first admin

These are **NOT automated** — the backend image has no entrypoint and runs gunicorn directly.

```bash
# Migrations: REQUIRED after first start and after any deploy that adds migrations
docker compose exec backend python manage.py migrate

# collectstatic runs at BUILD time (wrapped in `|| true`, so build failures are silent).
# Re-run it if static assets are missing:
docker compose exec backend python manage.py collectstatic --noinput

# Create the beta admin user
docker compose exec backend python manage.py createsuperuser
```

### 3.9 Smoke test against the live HTTPS URL

```bash
BASE_URL=https://beta.example.com ./scripts/smoke_test.sh
```

Expect **7/7 PASS**: health, two-sample t-test, one-way ANOVA, high-precision regression (intercept proves the >18-significant-digit engine), and the manuscript share-token IDOR flow (with-token → 200, without-token → 404). The IDOR sub-checks gracefully **SKIP** (not fail) if DB persistence is unavailable — but you ran migrations in 3.8, so they should run. Exit code 0 = all pass.

Quick manual sanity checks:

```bash
curl -fsS https://beta.example.com/api/health/ && echo            # backend health
curl -fsS https://beta.example.com/health && echo                 # frontend health -> "healthy"
```

---

## 4. Beta-shape go-live

Before inviting users, apply the four **§0 beta-shape** items from [`docs/BETA_DEPLOYMENT_CHECKLIST.md`](./BETA_DEPLOYMENT_CHECKLIST.md) (Go/No-Go, lines 159-163). These are product gates, not infra:

1. **Access model = invite-only.** Require login OR gate behind an invite token. The manuscript-report endpoints already use per-submission share tokens — extend that pattern to the rest of the beta surface. Do not leave the app open to the public internet.
2. **Beta banner.** Every page shows a persistent notice: *"Beta — results may change; please report issues."*
3. **Feedback channel.** One monitored route (email alias, form, or a GitHub issue template) that you actually watch.
4. **Data / privacy notice.** State what is stored and the erasure path. GDPR erase is real (commit `0705cc4`), so the notice can truthfully promise deletion on request.

Also set expectations in-product: beta covers autonomous analysis, Guardian, manuscript statistical review, and core statistical endpoints; **mobile/desktop/SDK are experimental and not part of the beta.**

> The PyPI `sfs` CLI (`pip install "stickforstats[cli]"`, Python ≥3.10) is a thin client to this API — invitees who use it just point it at `https://beta.example.com`.

---

## 5. Day-2 operations

### Logs

```bash
docker compose logs -f backend
docker compose logs -f celery celery-beat
docker compose logs --tail=200 nginx
```

### Health & status

```bash
docker compose ps
curl -fsS https://beta.example.com/api/health/ && echo
docker compose exec nginx nginx -t          # validate nginx config / TLS material
```

> No healthcheck is defined for `celery`, `celery-beat`, or `postgres-backup` — check them via `docker compose logs`.

### Backups

The `postgres-backup` service runs `scripts/backup.sh` on a cron (default `BACKUP_SCHEDULE='0 2 * * *'`, daily 02:00), writing `stickforstats_YYYYMMDD_HHMMSS.sql.gz` to the shared `postgres-backup` volume (`/backups`) and pruning files older than `BACKUP_RETENTION_DAYS` (default 30).

```bash
# On-demand backup right now
docker compose exec postgres-backup /backup.sh

# List backups
docker compose exec postgres-backup ls -lh /backups

# Restore a backup (DESTRUCTIVE — overwrites current data)
docker compose exec postgres-backup sh -c \
  'gunzip -c /backups/stickforstats_YYYYMMDD_HHMMSS.sql.gz | \
   PGPASSWORD="$PGPASSWORD" psql -h postgres -U "$PGUSER" -d "$PGDATABASE"'
```

### Restart

```bash
docker compose restart backend celery celery-beat   # after app config changes
docker compose restart nginx                         # after replacing TLS certs
```

### Update / upgrade flow

```bash
# 1. Back up the DB first
docker compose exec postgres-backup /backup.sh

# 2. Pull the new images and retag to the local refs Compose expects
docker pull ghcr.io/visvikbharti/stickforstats_new/backend:latest
docker pull ghcr.io/visvikbharti/stickforstats_new/frontend:latest
docker tag ghcr.io/visvikbharti/stickforstats_new/backend:latest  stickforstats/backend:1.0.0
docker tag ghcr.io/visvikbharti/stickforstats_new/frontend:latest stickforstats/frontend:1.0.0

# 3. Recreate containers with the new images (no build)
docker compose up -d --no-build

# 4. Apply any new migrations + refresh static
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py collectstatic --noinput

# 5. Re-run the smoke test
BASE_URL=https://beta.example.com ./scripts/smoke_test.sh
```

> Pin to immutable `:<sha>` tags instead of `:latest` if you want reproducible upgrades/rollbacks (the GHCR repo publishes both). CI publishes images on merge but does **not** deploy ("Deploy to Staging" is a placeholder echo) — deployment is always this manual operator step.

### Rollback

```bash
# Re-tag the previous known-good image (sha or prior :latest digest) and recreate
docker pull ghcr.io/visvikbharti/stickforstats_new/backend:<previous-sha>
docker pull ghcr.io/visvikbharti/stickforstats_new/frontend:<previous-sha>
docker tag ghcr.io/visvikbharti/stickforstats_new/backend:<previous-sha>  stickforstats/backend:1.0.0
docker tag ghcr.io/visvikbharti/stickforstats_new/frontend:<previous-sha> stickforstats/frontend:1.0.0
docker compose up -d --no-build

# If the new release ran migrations that the old code can't read, restore the
# pre-upgrade DB backup (see Restore above) — migrations are not auto-reversed.
```

---

## 6. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `docker compose up` fails: port 80 already allocated | `frontend` and `nginx` both want host port 80 | Set `FRONTEND_PORT=127.0.0.1:8090` (or any non-80 port) in `.env` so only `nginx` owns 80/443 (Section 3.5). |
| Compose errors: `DB_PASSWORD / REDIS_PASSWORD / SECRET_KEY / JWT_SECRET / GRAFANA_PASSWORD … must be set` | Fail-closed required var missing from `.env` | Set all five in `.env` (Section 3.5). |
| Backend exits / 500s with `ImproperlyConfigured` about secret key | `DJANGO_SECRET_KEY` unset while serving prod | Set `DJANGO_SECRET_KEY` **and** `SECRET_KEY` to the same value. |
| `nginx` container restarts / `nginx -t` fails | `nginx/ssl/cert.pem` or `key.pem` missing/invalid | Provide both files with those exact names (Section 3.6), then `docker compose restart nginx`. |
| Browser TLS warning | Self-signed cert | Use Let's Encrypt for a real domain (Section 3.6). |
| App loads but every API call 400s / CORS blocked | `DJANGO_ALLOWED_HOSTS` / `CORS_*` still `yourdomain.com` | Set all host/CORS pairs to your real hostname (Section 3.5). Note `testserver` is no longer allowed in prod. |
| Backend 502 from frontend `/api` | backend not ready, or service not named `backend` | frontend nginx hardcodes `http://backend:8000`; keep the service name `backend`. `docker compose restart backend`. |
| DB errors on first boot | dependent started before postgres ready (no `service_healthy` gating) | `docker compose restart backend celery celery-beat` after postgres is up. |
| Tables missing / `relation does not exist` | migrations never run | `docker compose exec backend python manage.py migrate`. |
| Static assets / admin CSS missing | build-time `collectstatic` silently skipped (`|| true`) | `docker compose exec backend python manage.py collectstatic --noinput`. |
| Stray empty `init.sql` directory under `backend/sql/` | the missing-file bind mount auto-created a dir | Remove it and create the placeholder file (Section 3.4a). |
| `docker compose up` starts building images instead of pulling | both `build:` and `image:` are set; default behavior builds | Retag GHCR images to `stickforstats/<x>:1.0.0` and use `docker compose up -d --no-build` (Section 3.3). |
| GHCR pull `denied`/`unauthorized` | package is private | `docker login ghcr.io` with a PAT that has `read:packages`. |
| Prometheus has no redis/postgres/frontend metrics | those scrape jobs target raw ports, not exporters (none shipped) | Expected — only `backend:8000/api/v1/metrics/` is wired. Backend metrics + Grafana datasource/dashboards work; alert rules are scaffolded (no alertmanager). Treat monitoring as partially wired. |
| Prometheus logs an error loading `prometheus/alerts.yml` at startup | `monitoring/prometheus.yml` has `rule_files: ["prometheus/alerts.yml"]` but that path is **not mounted** into the container | Harmless for the beta (monitoring is non-critical) — ignore it. To silence: mount the rule file (`./monitoring/prometheus/alerts.yml:/etc/prometheus/prometheus/alerts.yml:ro`) only if it exists, or drop the `rule_files` line. |
| Grafana login fails | `GRAFANA_PASSWORD` not set / wrong | User is `admin`; password is `GRAFANA_PASSWORD` from `.env`. |

---

## 7. Verification checklist (mirrors `docs/BETA_DEPLOYMENT_CHECKLIST.md`)

Infra / deploy gates:

- [ ] Docker + Compose plugin installed; user in `docker` group.
- [ ] Repo cloned at released state (`v1.0.0-beta.1` / `origin/main`).
- [ ] GHCR `backend` + `frontend` images pulled and retagged to `stickforstats/{backend,frontend}:1.0.0`.
- [ ] `backend/sql/init.sql` placeholder created (or compose line removed).
- [ ] `.env` created from `.env.example`; **all five** required secrets set to strong unique values; `DJANGO_SECRET_KEY == SECRET_KEY`; host/CORS pairs in sync with the real domain.
- [ ] `DEBUG=false` / `DJANGO_DEBUG=False` (auto-enables HSTS, secure cookies, SSL redirect, rate limiting).
- [ ] `git check-ignore -v .env` confirms `.env` ignored; `grep` for `change_this|redis_secure_password` is clean (the only `testserver` match is the DEBUG/TESTING-gated line in settings.py — expected).
- [ ] Internal service ports (`DB_PORT`/`REDIS_PORT`/`PROMETHEUS_PORT`/`GRAFANA_PORT`/`BACKEND_PORT`) bound to `127.0.0.1` in `.env` (or firewalled) so they are not world-reachable.
- [ ] `FRONTEND_PORT` set off host 80 so `nginx` owns 80/443.
- [ ] Real `nginx/ssl/cert.pem` + `key.pem` in place; `docker compose exec nginx nginx -t` passes.
- [ ] `docker compose up -d --no-build` → postgres, redis, backend, frontend, celery, celery-beat healthy.
- [ ] `python manage.py migrate` run; `collectstatic` verified; superuser created.
- [ ] `BASE_URL=https://beta.example.com ./scripts/smoke_test.sh` → **7/7 PASS**.
- [ ] First backup confirmed: `docker compose exec postgres-backup /backup.sh` then `ls -lh /backups`.

Beta-shape gates (§0):

- [ ] Access is invite-only (login or invite token); app not open to the public.
- [ ] Persistent "Beta — results may change; please report issues" banner on every page.
- [ ] Monitored feedback channel live.
- [ ] Data/privacy + erasure notice published.
- [ ] In-product scope set: autonomous analysis, Guardian, manuscript statistical review, core stats in beta; mobile/desktop/SDK marked experimental.

Reference current ground-truth status (from the checklist): backend tests **831/831** green, frontend **654/654** green; released tag **v1.0.0-beta.1** (GitHub prerelease). Use these figures, not the older README badges (`38/38`) or stale guide metrics.