#!/usr/bin/env bash
#
# StickForStats production deploy.
#
# WHY THIS EXISTS
# ---------------
# Deploys used to pull IMAGES only and never sync the CHECKOUT. The host drifted
# onto a stale branch (docs/plos-compbio-submission @ 900296a) while running
# images built from main. The consequence, discovered on 2026-07-14:
#
#   * Anything living in docker-compose.yml / nginx.conf / monitoring/ SILENTLY
#     DID NOT DEPLOY. It shipped in the commit, CI went green, the deploy
#     "succeeded" — and the change simply was not there. Nothing in any log said so.
#   * `git rev-parse HEAD` on the host LIED about what was running.
#   * The closed-beta auth gate existed ONLY as an uncommitted edit on that host.
#     A clean checkout would have published the site, silently.
#
# So: this script deploys a COMMIT, not just an image. Config and images move
# together, or not at all.
#
# USAGE
#   ./scripts/deploy.sh                 # deploy origin/main
#   ./scripts/deploy.sh <git-sha>       # deploy a specific commit
#   ./scripts/deploy.sh --rollback      # go back to the previous deploy
#   DRY_RUN=1 ./scripts/deploy.sh       # print what would happen, change nothing
#
# Run it ON the production host, from the repo root.
#
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/stickforstats_new}"
REGISTRY="ghcr.io/visvikbharti/stickforstats_new"
EDGE_URL="${EDGE_URL:-https://stickforstats.com}"
DRY_RUN="${DRY_RUN:-0}"

RED=$'\033[31m'; GRN=$'\033[32m'; YLW=$'\033[33m'; BLD=$'\033[1m'; RST=$'\033[0m'
step() { printf '\n%s==> %s%s\n' "$BLD" "$1" "$RST"; }
ok()   { printf '    %s✓%s %s\n' "$GRN" "$RST" "$1"; }
warn() { printf '    %s!%s %s\n' "$YLW" "$RST" "$1"; }
die()  { printf '\n%s✗ ABORT:%s %s\n\n' "$RED" "$RST" "$1" >&2; exit 1; }
run()  { if [ "$DRY_RUN" = "1" ]; then printf '    [dry-run] %s\n' "$*"; else "$@"; fi; }

cd "$APP_DIR" || die "cannot cd to $APP_DIR"
command -v docker >/dev/null || die "docker not found"
[ -f docker-compose.yml ] || die "no docker-compose.yml in $APP_DIR — wrong directory?"
[ -f .env ] || die "no .env in $APP_DIR — the stack cannot start without it"

# ---------------------------------------------------------------------------
# Rollback mode: swap the :1.0.0 tags back to the previous images and restart.
# ---------------------------------------------------------------------------
if [ "${1:-}" = "--rollback" ]; then
  step "ROLLBACK to the previous deploy"
  docker image inspect stickforstats/backend:rollback-prev  >/dev/null 2>&1 || die "no backend:rollback-prev image"
  docker image inspect stickforstats/frontend:rollback-prev >/dev/null 2>&1 || die "no frontend:rollback-prev image"
  run docker tag stickforstats/backend:rollback-prev  stickforstats/backend:1.0.0
  run docker tag stickforstats/frontend:rollback-prev stickforstats/frontend:1.0.0
  run docker compose up -d --no-build
  run docker compose restart nginx
  warn "Images rolled back. NOTE: this does NOT revert the checkout — if the bad"
  warn "deploy changed compose/nginx config, also: git checkout -f <previous-sha>"
  exit 0
fi

# ---------------------------------------------------------------------------
# Resolve the target commit.
# ---------------------------------------------------------------------------
step "Resolve target commit"
git fetch origin --quiet || die "git fetch failed"
TARGET_REF="${1:-origin/main}"
SHA="$(git rev-parse --verify "${TARGET_REF}^{commit}" 2>/dev/null)" || die "unknown ref: $TARGET_REF"
SHORT="${SHA:0:7}"
CURRENT="$(git rev-parse HEAD)"
ok "target : $SHORT  ($(git log -1 --format=%s "$SHA" | cut -c1-60))"
ok "current: ${CURRENT:0:7}"
[ "$SHA" = "$CURRENT" ] && warn "host checkout is already at this commit (images may still differ)"

# ---------------------------------------------------------------------------
# PRE-FLIGHT. Every one of these has a real incident behind it. Abort on any.
# ---------------------------------------------------------------------------
step "Pre-flight"

# 1. The closed-beta gate MUST be in the target tree. If it is not, deploying
#    would publish the site the moment nginx reloads. This is the single most
#    dangerous thing this script can do, so it is checked first.
#
#    The pattern is ANCHORED and requires an ACTIVE directive. A bare
#    `grep -c auth_basic` is fooled by a commented-out gate: given
#       # auth_basic "StickForStats closed beta";
#       # auth_basic_user_file /etc/nginx/ssl/.htpasswd;
#    it counts 2 and cheerfully reports the gate "present" while the site is wide
#    open. Same regex as the `beta-gate` job in .github/workflows/ci.yml — they
#    must agree, or one of them is lying.
GATE_LINES="$(git show "$SHA:nginx/nginx.conf" | grep -cE '^[[:space:]]*auth_basic' || true)"
[ "$GATE_LINES" -eq 2 ] || die "target $SHORT has $GATE_LINES ACTIVE auth_basic directives (expected 2).
    Deploying it would REMOVE THE CLOSED-BETA GATE and publish the site.
    If opening the beta is intentional, do it deliberately — not via this script."
ok "closed-beta auth gate present in target tree"

# 2. Images for this exact commit must already exist. Syncing config to a commit
#    whose images were never built leaves config and code out of step — the very
#    thing this script exists to prevent.
for img in backend frontend; do
  docker manifest inspect "$REGISTRY/$img:$SHA" >/dev/null 2>&1 \
    || die "no $img image published for $SHORT.
    CI builds images only for commits that pass every gate. Either CI has not
    finished, or it failed. Check: gh run list --branch main"
done
ok "backend + frontend images exist in GHCR for $SHORT"

# 3. No accidental backwards deploy.
if ! git merge-base --is-ancestor "$CURRENT" "$SHA"; then
  warn "target $SHORT is NOT a descendant of the current checkout ${CURRENT:0:7}"
  warn "this is a rollback or a divergent branch — continuing, but be sure"
fi

# 4. Refuse to clobber uncommitted work on the host without recording it.
DIRTY="$(git status --porcelain --untracked-files=no | wc -l | tr -d ' ')"
[ "$DIRTY" -eq 0 ] || warn "$DIRTY tracked file(s) modified on the host — they will be backed up, then reset"

# 5. THE COLLISION CHECK. `git checkout -f` PRESERVES untracked files — proven —
#    but it OVERWRITES an untracked file if the target commit TRACKS that path.
#    The host's irreplaceable secrets live at untracked paths (.env, nginx/ssl/,
#    secrets/). Today none of them is tracked in main, so the checkout is safe.
#    But if anyone ever commits a `.env` or a `secrets/` file, this same command
#    would silently OVERWRITE the production secrets with the repo's version.
#    So do not trust that it stays true — check it, every deploy.
TRACKED_IN_TARGET="$(git ls-tree -r "$SHA" --name-only)"
COLLISION=""
for p in .env secrets nginx/ssl docker-compose.override.yml; do
  if printf '%s\n' "$TRACKED_IN_TARGET" | grep -qE "^${p}(/|$)"; then
    COLLISION="$COLLISION $p"
  fi
done
[ -z "$COLLISION" ] || die "target $SHORT TRACKS host-only secret path(s):$COLLISION
    'git checkout -f' would OVERWRITE the production copy with the repo's version —
    destroying the TLS key / .htpasswd / .env, which exist nowhere else.
    Remove those paths from git (and add them to .gitignore) before deploying."
ok "no tracked path collides with the host's secrets (.env, nginx/ssl/, secrets/)"

ok "pre-flight passed"

# ---------------------------------------------------------------------------
# Backup. Host-only material must survive: it exists nowhere else.
# ---------------------------------------------------------------------------
step "Backup host-only state"
BK="/root/deploy-backup-$(date +%Y%m%d-%H%M%S)"
run mkdir -p "$BK"
if [ "$DRY_RUN" != "1" ]; then
  cp -a .env "$BK/env" 2>/dev/null || true
  cp -a docker-compose.override.yml "$BK/" 2>/dev/null || true
  cp -a nginx/nginx.conf "$BK/nginx.conf" 2>/dev/null || true
  tar czf "$BK/nginx-ssl.tgz" nginx/ssl 2>/dev/null || true   # certs + .htpasswd
  tar czf "$BK/secrets.tgz" secrets 2>/dev/null || true
  git rev-parse HEAD > "$BK/git-head.txt"
  git status --porcelain > "$BK/git-status.txt"
  docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' | grep stickforstats > "$BK/images.txt" || true
fi
ok "backed up to $BK"

# ---------------------------------------------------------------------------
# Arm the rollback BEFORE changing anything: whatever is live now becomes
# rollback-prev. (Previously this was done by hand and was easy to forget.)
# ---------------------------------------------------------------------------
step "Arm rollback (current live images -> :rollback-prev)"
for img in backend frontend; do
  if docker image inspect "stickforstats/$img:1.0.0" >/dev/null 2>&1; then
    run docker tag "stickforstats/$img:1.0.0" "stickforstats/$img:rollback-prev"
    ok "$img:rollback-prev -> $(docker image inspect -f '{{.Id}}' stickforstats/$img:1.0.0 2>/dev/null | cut -c8-19)"
  else
    warn "no stickforstats/$img:1.0.0 to arm as rollback"
  fi
done

# ---------------------------------------------------------------------------
# THE FIX: sync the CHECKOUT, not just the images.
# ---------------------------------------------------------------------------
step "Sync checkout to $SHORT (config + images move together)"
# -f discards tracked modifications (backed up above). Untracked files — .env,
# nginx/ssl/, secrets/, docker-compose.override.yml — are NOT touched by checkout.
run git checkout -f -B main "$SHA"
if [ "$DRY_RUN" != "1" ]; then
  ok "checkout now at $(git rev-parse --short HEAD) on $(git rev-parse --abbrev-ref HEAD)"

  # Post-checkout assertions. If any fail we have a broken host: restore and abort.
  restore_and_die() {
    warn "restoring backed-up config from $BK"
    cp -a "$BK/nginx.conf" nginx/nginx.conf 2>/dev/null || true
    cp -a "$BK/env" .env 2>/dev/null || true
    die "$1"
  }
  # Anchored, as in the pre-flight: a commented-out gate must NOT count as present.
  [ "$(grep -cE '^[[:space:]]*auth_basic' nginx/nginx.conf || true)" -eq 2 ] \
    || restore_and_die "auth gate MISSING from nginx.conf after checkout — refusing to continue"
  [ -f .env ]                 || restore_and_die ".env vanished during checkout"
  [ -f nginx/ssl/.htpasswd ]  || restore_and_die "nginx/ssl/.htpasswd vanished — the beta gate has no password file"
  [ -f nginx/ssl/cert.pem ]   || restore_and_die "nginx/ssl/cert.pem vanished — TLS would fail"
  ok "auth gate, .env, .htpasswd and TLS material all intact"
fi

# ---------------------------------------------------------------------------
# Images.
# ---------------------------------------------------------------------------
step "Pull images for $SHORT and point :1.0.0 at them"
for img in backend frontend; do
  run docker pull -q "$REGISTRY/$img:$SHA"
  run docker tag "$REGISTRY/$img:$SHA" "stickforstats/$img:1.0.0"
  ok "$img:1.0.0 -> $SHORT"
done

# ---------------------------------------------------------------------------
# Validate BEFORE applying. A bad nginx.conf takes the site down.
# ---------------------------------------------------------------------------
step "Validate config"
run docker compose config --quiet
ok "docker compose config is valid"
if [ "$DRY_RUN" != "1" ]; then
  docker run --rm \
    -v "$APP_DIR/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" \
    -v "$APP_DIR/nginx/ssl:/etc/nginx/ssl:ro" \
    nginx:alpine nginx -t >/dev/null 2>&1 \
    && ok "nginx -t passes against the new nginx.conf" \
    || die "nginx -t FAILED on the new config — not applying it"
fi

# ---------------------------------------------------------------------------
# Apply.
# ---------------------------------------------------------------------------
step "Apply"
run docker compose up -d --no-build
run docker compose restart nginx      # nginx only re-reads its config on restart
run docker compose restart prometheus # bind-mounted config: content change does not recreate
ok "stack up"

# ---------------------------------------------------------------------------
# Verify. A deploy that is not verified is a deploy that might not have happened.
# ---------------------------------------------------------------------------
step "Verify (live)"
FAILED=0
check() { if [ "$2" = "PASS" ]; then ok "$1"; else printf '    %s✗%s %s\n' "$RED" "$RST" "$1"; FAILED=1; fi; }

# Every check below is written to FAIL CLOSED: it must positively OBSERVE the
# good state. Never `! cmd | grep -q bad` — if cmd dies, grep finds nothing, the
# `!` flips it, and a dead backend reports a cheerful PASS. That is precisely how
# this project's eslint gate (0 of 469 files) and its container healthcheck (a 301
# on a 404 path) both stayed green for months while measuring nothing.
# A check that cannot observe the thing it claims to check is not a check.

if [ "$DRY_RUN" != "1" ]; then
  # Wait for the backend to come up rather than guessing with a fixed sleep — a
  # slow start would otherwise be indistinguishable from a broken deploy.
  printf '    waiting for backend'
  HEALTH=""
  for _ in $(seq 1 30); do
    HEALTH="$(docker exec stickforstats-backend curl -fsS -H 'X-Forwarded-Proto: https' \
                http://localhost:8000/api/v1/health/ 2>/dev/null || true)"
    case "$HEALTH" in *'"status"'*) break ;; esac
    printf '.'; sleep 2
  done
  printf '\n'

  # The app is serving AND can reach the database. Requires a positive match on a
  # response we actually received.
  case "$HEALTH" in
    *'"database":"connected"'*|*'"database": "connected"'*) check "backend healthy, database connected" PASS ;;
    '')  check "backend healthy, database connected (NO RESPONSE from /api/v1/health/)" FAIL ;;
    *)   check "backend healthy, database connected (got: $(printf '%s' "$HEALTH" | cut -c1-60))" FAIL ;;
  esac

  # Receipt signing. gunicorn runs 4 workers with no --preload, so a per-worker
  # ephemeral key shows up as SEVERAL distinct kids across repeated reads.
  # Collect the kids, then assert positively on what we got.
  KIDS="$(for _ in 1 2 3 4 5 6 7 8; do
            docker exec stickforstats-backend curl -s -H 'X-Forwarded-Proto: https' \
              http://localhost:8000/api/v1/receipt/jwks/ 2>/dev/null \
            | sed -n 's/.*"kid":[[:space:]]*"\([^"]*\)".*/\1/p'
          done | sort -u)"
  N_KIDS="$(printf '%s\n' "$KIDS" | grep -c . || true)"
  if [ "$N_KIDS" -eq 1 ]; then
    check "receipt JWKS serves exactly ONE key ($KIDS)" PASS
  elif [ "$N_KIDS" -eq 0 ]; then
    check "receipt JWKS unreachable — cannot confirm the signing key at all" FAIL
  else
    check "receipt JWKS serves $N_KIDS DIFFERENT keys — receipts will not verify" FAIL
  fi
  # Must have OBSERVED a kid, and it must not be ephemeral.
  case "$KIDS" in
    '')                            check "receipt key is a stable, configured key (no kid observed)" FAIL ;;
    *stickforstats-receipt-ephemeral*) check "receipt key is a stable, configured key (got an EPHEMERAL key)" FAIL ;;
    *)                             check "receipt key is a stable, configured key" PASS ;;
  esac

  # THE SECURITY CHECK. The closed beta must still demand a password.
  # A 200 here means the site is PUBLIC. 000 means the edge is unreachable.
  EDGE="$(curl -s -o /dev/null -w '%{http_code}' "$EDGE_URL" || echo 000)"
  if [ "$EDGE" = "401" ]; then
    check "edge still requires Basic Auth (HTTP 401)" PASS
  else
    check "edge returned HTTP $EDGE, expected 401 — THE SITE MAY BE PUBLIC" FAIL
  fi

  # Nothing is crash-looping. Assert positively that we could read the state list.
  PS="$(docker ps --format '{{.Names}} {{.Status}}' 2>/dev/null || true)"
  RESTARTING="$(printf '%s\n' "$PS" | grep -ci 'restarting' || true)"
  if [ -z "$PS" ]; then
    check "container states readable (docker ps returned nothing)" FAIL
  elif [ "$RESTARTING" -eq 0 ]; then
    check "no container is restarting" PASS
  else
    check "$RESTARTING container(s) RESTARTING" FAIL
  fi

  # The image can now say which commit it is (OCI label added 2026-07-14).
  REV="$(docker inspect -f '{{index .Config.Labels "org.opencontainers.image.revision"}}' \
          stickforstats/backend:1.0.0 2>/dev/null || true)"
  if [ -z "$REV" ]; then
    warn "backend image carries no revision label (built before labels were added) — skipping"
  elif [ "$REV" = "$SHA" ]; then
    check "backend image self-reports revision $SHORT" PASS
  else
    check "backend image reports revision ${REV:0:7}, expected $SHORT — WRONG IMAGE IS LIVE" FAIL
  fi
fi

if [ "$FAILED" -ne 0 ]; then
  printf '\n%s✗ DEPLOY VERIFICATION FAILED.%s The stack is up but WRONG.\n' "$RED" "$RST"
  printf '  Roll back now:\n    cd %s && ./scripts/deploy.sh --rollback\n' "$APP_DIR"
  printf '    git checkout -f %s     # and revert the config too\n\n' "$(cut -c1-7 "$BK/git-head.txt" 2>/dev/null || echo '<previous-sha>')"
  exit 1
fi

step "Deployed $SHORT"
ok "config and images are both at $SHORT — they can no longer drift apart"
ok "rollback: ./scripts/deploy.sh --rollback   (backup: $BK)"
