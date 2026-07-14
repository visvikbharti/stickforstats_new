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

# Probe the LIVE edge and require Basic Auth on every path that matters. This is
# the real security property — is auth actually enforced? — as opposed to a
# substring count in nginx.conf, which is blind to scope (auth_basic moved into a
# `location` block), to `auth_basic off;`, and to commented-out lines. A 200 on
# ANY of these means that surface is PUBLIC. Used post-reload on both the forward
# deploy and the rollback path.
assert_edge_gated() {
  local bad=0 code
  for p in / /api/ /api/v1/health/ /static/js/ /modules/multiplicity; do
    code="$(curl -s -o /dev/null -w '%{http_code}' "${EDGE_URL}${p}" || echo 000)"
    if [ "$code" = "401" ]; then
      ok "edge gated: ${p} -> 401"
    else
      printf '    %s✗%s edge NOT gated: %s -> HTTP %s (expected 401 — THIS PATH IS PUBLIC)\n' "$RED" "$RST" "$p" "$code"
      bad=1
    fi
  done
  return "$bad"
}

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
  if [ "$DRY_RUN" != "1" ]; then
    sleep 5
    # Rollback reverts IMAGES only, not the on-disk nginx.conf. If a bad forward
    # deploy left an ungated config on disk, restarting nginx here would keep the
    # site public. Verify the live surface and refuse to exit 0 on an open site.
    step "Verify rollback did not leave the site public"
    if assert_edge_gated; then
      ok "edge still gated after rollback"
    else
      die "ROLLBACK LEFT THE SITE PUBLIC. The on-disk nginx.conf is not gating.
    Rollback reverts images, NOT config. Restore a gated nginx.conf now:
      git checkout -f <a-sha-whose-nginx.conf-has-the-gate> -- nginx/nginx.conf
      docker compose restart nginx
    (Do NOT 'git checkout -f 900296a' — that commit predates the committed gate
    and its nginx.conf has ZERO auth_basic lines.)"
    fi
  fi
  warn "Images rolled back. This did NOT revert the git checkout — if the bad"
  warn "deploy also changed compose/nginx/monitoring config, revert the checkout"
  warn "to a KNOWN-GATED commit (check /root/deploy-backup-*/git-head.txt), NOT"
  warn "blindly to the host's previous HEAD."
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
#    would publish the site the moment nginx reloads.
#
#    This is a STATIC pre-check on the file — it cannot be authoritative, because
#    a file grep is blind to nginx scope (auth_basic inside a `location` block
#    leaves other locations open). It is a fast fail to catch the obvious cases;
#    the AUTHORITATIVE check is assert_edge_gated() against the running site after
#    reload, below. Here we require the two directives to be ACTIVE (anchored, so
#    a commented-out gate does not count), an ENABLED realm (a quoted string —
#    `auth_basic off;` has no quote), and present at server scope, i.e. BEFORE the
#    first `location` block. Same active-directive regex as CI's beta-gate job.
GATE_CONF="$(git show "$SHA:nginx/nginx.conf")"
# Everything from the 443 server's opening brace up to its first `location`:
SERVER_HEAD="$(printf '%s\n' "$GATE_CONF" | awk '
  /listen[[:space:]]+443/ {inserver=1}
  inserver && /location[[:space:]]/ {exit}
  inserver {print}')"
GATE_REALM="$(printf '%s\n' "$SERVER_HEAD" | grep -cE '^[[:space:]]*auth_basic[[:space:]]+"' || true)"
GATE_FILE="$(printf '%s\n' "$SERVER_HEAD"  | grep -cE '^[[:space:]]*auth_basic_user_file[[:space:]]' || true)"
GATE_OFF="$(printf '%s\n' "$GATE_CONF"     | grep -cE '^[[:space:]]*auth_basic[[:space:]]+off' || true)"
{ [ "$GATE_REALM" -ge 1 ] && [ "$GATE_FILE" -ge 1 ] && [ "$GATE_OFF" -eq 0 ]; } || \
  die "target $SHORT does not gate at SERVER scope with an ENABLED Basic Auth realm
    (server-scope enabled realm: $GATE_REALM, user_file: $GATE_FILE, 'auth_basic off': $GATE_OFF).
    Deploying it could REMOVE OR NARROW THE CLOSED-BETA GATE and expose the site.
    If opening the beta is intentional, do it deliberately — not via this script.
    NOTE: this is a static check; the live edge is verified after reload regardless."
ok "closed-beta gate present at server scope in target tree (live edge verified after reload)"

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
  # This backup is the ONLY safety net in front of `git checkout -f` against a
  # host that holds the TLS private key, the beta password file and the receipt
  # RSA key. So it is verified, not best-effort: a failed capture must ABORT the
  # deploy, because "backup failed" is not "backup succeeded" (the exact vacuous-
  # success trap this script preaches against elsewhere).
  need() { [ -e "$1" ] || return 0; cp -a "$1" "$2" || die "backup of $1 failed — refusing to proceed"; }
  need .env "$BK/env"
  need docker-compose.override.yml "$BK/docker-compose.override.yml"
  need nginx/nginx.conf "$BK/nginx.conf"
  [ -e nginx/ssl ] && { tar czf "$BK/nginx-ssl.tgz" nginx/ssl || die "backup of nginx/ssl failed"; }
  [ -e secrets ]   && { tar czf "$BK/secrets.tgz" secrets     || die "backup of secrets failed"; }
  # Capture the CONTENT of every modified tracked file, not a fixed by-name list —
  # a host hot-patch to any tracked file (compose, prometheus.yml, ...) is inside
  # this diff and thus recoverable. `git diff HEAD` covers all tracked mods.
  git diff HEAD > "$BK/tracked-host-edits.patch" || die "could not capture tracked host edits"
  git rev-parse HEAD > "$BK/git-head.txt"
  git status --porcelain > "$BK/git-status.txt"
  docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' | grep stickforstats > "$BK/images.txt" || true

  # Positively verify the critical items landed — a backup you did not confirm is
  # not a backup.
  [ -s "$BK/git-head.txt" ] || die "backup verification failed: git-head.txt empty"
  [ -f .env ] && { [ -s "$BK/env" ] || die "backup verification failed: .env not captured"; }
  if [ -f nginx/ssl/.htpasswd ]; then
    tar tzf "$BK/nginx-ssl.tgz" 2>/dev/null | grep -q '\.htpasswd$' \
      || die "backup verification failed: .htpasswd not in nginx-ssl.tgz"
  fi
  ok "backed up to $BK (verified: git-head, .env, nginx/ssl, tracked-edits patch)"
else
  ok "[dry-run] would back up to $BK"
fi

# The rollback SHA the trap and failure banner point at: the host's HEAD BEFORE
# this deploy. Captured now so a mid-deploy abort knows where to return.
PREV_SHA="$(git rev-parse HEAD)"

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
#
# Everything from here until the stack is successfully up is "in flight". A
# failure in this window (a 429 on an image pull, a bad nginx.conf, the box
# rebooting) would otherwise strand the host with NEW config on disk but OLD
# containers running — silent, and exactly the split-brain state this whole
# script exists to prevent. The trap below reverts the tree AND the image tags on
# any non-zero exit, until DEPLOY_COMMITTED is set once the stack is verified up.
# ---------------------------------------------------------------------------
DEPLOY_COMMITTED=0
if [ "$DRY_RUN" != "1" ]; then
  rollback_on_abort() {
    local rc=$?
    [ "$DEPLOY_COMMITTED" = "1" ] && exit "$rc"
    printf '\n%s✗ deploy aborted mid-flight (exit %s) — reverting to the previous release%s\n' "$RED" "$rc" "$RST" >&2
    git checkout -f "$PREV_SHA" >/dev/null 2>&1 && echo "    tree reverted to ${PREV_SHA:0:7}" >&2 \
      || echo "    ${RED}could not revert tree${RST}" >&2

    # CRITICAL: $PREV_SHA may be a commit that PREDATES the committed auth gate
    # (the production host's HEAD was 900296a, whose nginx.conf has ZERO
    # auth_basic lines). Reverting the tree to it and restarting nginx would
    # PUBLISH the site. So always restore the gated nginx.conf from the backup —
    # which was captured from the live, gated config at the start of this run,
    # and is guaranteed to carry the gate — rather than trusting the reverted
    # tree. This is the fix for the exact incident that first exercised this trap.
    if [ -f "$BK/nginx.conf" ] && grep -qE '^[[:space:]]*auth_basic[[:space:]]+"' "$BK/nginx.conf"; then
      cp -a "$BK/nginx.conf" nginx/nginx.conf
      echo "    restored the GATED nginx.conf from backup" >&2
    else
      echo "    ${RED}backup nginx.conf missing or ungated — check the gate BY HAND now${RST}" >&2
    fi

    for img in backend frontend; do
      docker image inspect "stickforstats/$img:rollback-prev" >/dev/null 2>&1 \
        && docker tag "stickforstats/$img:rollback-prev" "stickforstats/$img:1.0.0" >/dev/null 2>&1
    done
    docker compose up -d --no-build >/dev/null 2>&1 && docker compose restart nginx >/dev/null 2>&1 \
      && echo "    images reverted and stack restarted on the previous release" >&2 \
      || echo "    ${RED}stack revert failed — run: ./scripts/deploy.sh --rollback${RST}" >&2

    # Do not exit on a public site. Verify the gate held; if not, say so loudly.
    sleep 3
    if assert_edge_gated >/dev/null 2>&1; then
      echo "    ${GRN}verified: edge still requires Basic Auth after revert${RST}" >&2
    else
      printf '    %s*** THE SITE MAY BE PUBLIC — restore a gated nginx.conf and reload nginx NOW ***%s\n' "$RED" "$RST" >&2
    fi
    exit "$rc"
  }
  trap rollback_on_abort EXIT
fi

step "Sync checkout to $SHORT (config + images move together)"
# -f discards tracked modifications (backed up above). Untracked files — .env,
# nginx/ssl/, secrets/, docker-compose.override.yml — are NOT touched by checkout
# (proven in a throwaway repo), UNLESS the target commit tracks that exact path,
# which pre-flight #5 already refused.
run git checkout -f -B main "$SHA"
if [ "$DRY_RUN" != "1" ]; then
  ok "checkout now at $(git rev-parse --short HEAD) on $(git rev-parse --abbrev-ref HEAD)"

  # Post-checkout assertions. The trap handles reverting; these just fail loudly.
  restore_and_die() { die "$1"; }
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
  # Validate nginx.conf inside the RUNNING nginx container, which is on the
  # compose network. A throwaway `docker run nginx:alpine` is NOT on that network,
  # so it cannot resolve `upstream backend:8000` and fails `nginx -t` with
  # "host not found in upstream" on a perfectly valid config — a false negative
  # that (before this fix) aborted a good deploy and triggered a revert. The
  # running container resolves the upstreams exactly as production does.
  if docker cp nginx/nginx.conf stickforstats-nginx:/tmp/nginx.new.conf >/dev/null 2>&1 \
     && docker exec stickforstats-nginx nginx -t -c /tmp/nginx.new.conf >/dev/null 2>&1; then
    docker exec stickforstats-nginx rm -f /tmp/nginx.new.conf >/dev/null 2>&1 || true
    ok "nginx -t passes against the new nginx.conf (validated in the running nginx container)"
  else
    docker exec stickforstats-nginx rm -f /tmp/nginx.new.conf >/dev/null 2>&1 || true
    # Show the real reason before aborting (the trap will revert).
    docker cp nginx/nginx.conf stickforstats-nginx:/tmp/nginx.new.conf >/dev/null 2>&1 || true
    docker exec stickforstats-nginx nginx -t -c /tmp/nginx.new.conf 2>&1 | tail -2 >&2 || true
    docker exec stickforstats-nginx rm -f /tmp/nginx.new.conf >/dev/null 2>&1 || true
    die "nginx -t FAILED on the new config — not applying it (see error above)"
  fi
fi

# ---------------------------------------------------------------------------
# Apply.
# ---------------------------------------------------------------------------
step "Apply"
run docker compose up -d --no-build
# A bind-mounted config file changing on disk does NOT recreate its container, so
# every service whose mounted config the checkout may have changed is restarted
# explicitly. nginx (nginx.conf), prometheus (prometheus.yml), grafana
# (dashboards + datasources) all mount from ./ — see docker-compose.yml volumes.
run docker compose restart nginx
# prometheus/grafana may not exist in every environment; a missing optional
# service must not abort the deploy (the trap would then revert a good release).
run docker compose restart prometheus 2>/dev/null || warn "prometheus not restarted (service absent?)"
run docker compose restart grafana 2>/dev/null || warn "grafana not restarted (service absent?)"
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
  # Collect ALL kids from EVERY response (grep -oE, not a greedy sed that would
  # capture only the LAST kid on a multi-key line and hide an ephemeral one). The
  # `|| true` on the pipeline is load-bearing: without it, under `set -e` a
  # non-listening backend makes this command substitution abort the whole script,
  # skipping the edge security check below.
  KIDS="$( { for _ in 1 2 3 4 5 6 7 8; do
              docker exec stickforstats-backend curl -s -H 'X-Forwarded-Proto: https' \
                http://localhost:8000/api/v1/receipt/jwks/ 2>/dev/null \
              | grep -oE '"kid"[[:space:]]*:[[:space:]]*"[^"]*"' \
              | sed -E 's/.*"([^"]*)"$/\1/'
            done; } 2>/dev/null | sort -u || true)"
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

  # THE SECURITY CHECK, and the authoritative one for the gate. Probe the LIVE
  # edge on every path that matters — /, /api/, the health endpoint, the JS
  # bundle, an app route. A 200 on ANY means that surface is PUBLIC. This catches
  # what a file grep cannot: a gate mis-scoped into a `location` block, or
  # `auth_basic off;`, because it tests the running server, not the text.
  if assert_edge_gated; then :; else FAILED=1; fi

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

  # Which commit is ACTUALLY RUNNING. Inspect the running CONTAINER, not the
  # :1.0.0 tag — an override pinning a different image, or a hand-retag, would make
  # the tag lie. The label was added 2026-07-14; images built before it have none,
  # so a fresh deploy of an old commit legitimately has no label. Rather than skip
  # (which lets "wrong image" never fire), fall back to a positive image-ID match:
  # the running backend container's image ID must equal the ID GHCR published for
  # this SHA.
  REV="$(docker inspect -f '{{index .Config.Labels "org.opencontainers.image.revision"}}' \
          stickforstats-backend 2>/dev/null || true)"
  if [ -n "$REV" ]; then
    if [ "$REV" = "$SHA" ]; then check "running backend self-reports revision $SHORT" PASS
    else check "running backend reports revision ${REV:0:7}, expected $SHORT — WRONG IMAGE IS LIVE" FAIL; fi
  else
    RUN_ID="$(docker inspect -f '{{.Image}}' stickforstats-backend 2>/dev/null || true)"
    WANT_ID="$(docker image inspect -f '{{.Id}}' "$REGISTRY/backend:$SHA" 2>/dev/null || true)"
    if [ -n "$RUN_ID" ] && [ -n "$WANT_ID" ] && [ "$RUN_ID" = "$WANT_ID" ]; then
      check "running backend image == GHCR image for $SHORT (no revision label yet)" PASS
    else
      check "cannot confirm running backend is $SHORT (no label, and image-ID match failed)" FAIL
    fi
  fi
fi

if [ "$FAILED" -ne 0 ]; then
  printf '\n%s✗ DEPLOY VERIFICATION FAILED.%s The stack is up but WRONG.\n' "$RED" "$RST"
  printf '  The site may be public or the wrong code may be live. Roll back NOW:\n'
  printf '    cd %s && ./scripts/deploy.sh --rollback\n' "$APP_DIR"
  printf '  and if config changed, revert the checkout to the previous release:\n'
  printf '    git checkout -f %s\n\n' "${PREV_SHA:0:12}"
  # The trap is still armed (DEPLOY_COMMITTED=0), so exiting non-zero here AUTO-
  # reverts tree + images to the previous release. The banner above is guidance
  # for the operator in case the auto-revert itself hits trouble.
  exit 1
fi

# Success: disarm the mid-flight rollback trap. Everything from here is safe.
DEPLOY_COMMITTED=1
trap - EXIT

step "Deployed $SHORT"
ok "config and images are both at $SHORT — they can no longer drift apart"
ok "rollback: ./scripts/deploy.sh --rollback   (backup: $BK)"
