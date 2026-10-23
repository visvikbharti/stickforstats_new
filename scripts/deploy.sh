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
# THE PASSWORD GATE. Through v1.2.0 the whole site sat behind an nginx Basic-Auth
# realm. The release after v1.2.0 removed it and made the site public. This script
# reads which state the target nginx.conf declares (gated or open), refuses a
# half-gated config, and then verifies THAT state on the live edge: gated means
# every probed path answers 401, open means the site serves without a password.
# Replacing a gated config with an open one publishes the site, so that one
# transition needs CONFIRM_PUBLIC=1.
#
# USAGE
#   ./scripts/deploy.sh                 # deploy origin/main
#   ./scripts/deploy.sh <git-sha>       # deploy a specific commit
#   CONFIRM_PUBLIC=1 ./scripts/deploy.sh <git-sha>
#                                       # same, when the deploy removes the gate
#   ./scripts/deploy.sh --rollback      # go back to the previous deploy's images
#   DRY_RUN=1 ./scripts/deploy.sh       # print what would happen, change nothing
#
# Run it ON the production host, from the repo root.
#
set -euo pipefail
# An SSH hangup must not kill a half-done deploy: bash 5.2 can skip the EXIT trap
# when SIGHUP lands inside a command substitution, which strands the host with new
# config on disk and old containers running. (Run it in tmux anyway; see DEPLOY.md.)
trap '' HUP

APP_DIR="${APP_DIR:-/opt/stickforstats_new}"
REGISTRY="ghcr.io/visvikbharti/stickforstats_new"
EDGE_URL="${EDGE_URL:-https://stickforstats.com}"
DRY_RUN="${DRY_RUN:-0}"
CONFIRM_PUBLIC="${CONFIRM_PUBLIC:-0}"
BACKUP_ROOT="${BACKUP_ROOT:-/root}"   # where deploy-backup-<stamp>/ directories go

RED=$'\033[31m'; GRN=$'\033[32m'; YLW=$'\033[33m'; BLD=$'\033[1m'; RST=$'\033[0m'
step() { printf '\n%s==> %s%s\n' "$BLD" "$1" "$RST"; }
ok()   { printf '    %s✓%s %s\n' "$GRN" "$RST" "$1"; }
warn() { printf '    %s!%s %s\n' "$YLW" "$RST" "$1"; }
die()  { printf '\n%s✗ ABORT:%s %s\n\n' "$RED" "$RST" "$1" >&2; exit 1; }
run()  { if [ "$DRY_RUN" = "1" ]; then printf '    [dry-run] %s\n' "$*"; else "$@"; fi; }

# What an nginx.conf (passed as text) declares about the password gate, read
# statically. Anchored regexes, so a commented-out directive does not count.
#   gated   - an ENABLED realm (a quoted string; `auth_basic off;` has none) and a
#             user file, both at SERVER scope of the 443 server (before its first
#             `location`), and no `auth_basic off` anywhere.
#   open    - no active auth_basic / auth_basic_user_file directive anywhere.
#   partial - anything else: a realm inside a `location` block, `auth_basic off`,
#             a realm without a user file. That narrows the gate without removing
#             it (some paths public, others prompting), and is never deployed.
#   missing - no config text at all (so an absent file never reads as "open").
# A static read cannot be authoritative; the live probes below are.
gate_state() {
  local conf="$1" head realm file off any
  if [ -z "$conf" ]; then echo missing; return 0; fi
  head="$(printf '%s\n' "$conf" | awk '
    /listen[[:space:]]+443/ {inserver=1}
    inserver && /location[[:space:]]/ {exit}
    inserver {print}')"
  # nginx treats the realm "off" (bare or quoted) as disabling the gate.
  local q="'" off_re
  off_re="^[[:space:]]*auth_basic[[:space:]]+(off|\"off\"|${q}off${q})[[:space:]]*;"
  realm="$(printf '%s\n' "$head" | grep -E "^[[:space:]]*auth_basic[[:space:]]+[\"$q]" | grep -cvE "$off_re" || true)"
  file="$(printf '%s\n' "$head"  | grep -cE '^[[:space:]]*auth_basic_user_file[[:space:]]' || true)"
  off="$(printf '%s\n' "$conf"   | grep -cE "$off_re" || true)"
  any="$(printf '%s\n' "$conf"   | grep -cE '^[[:space:]]*auth_basic' || true)"
  if [ "$realm" -ge 1 ] && [ "$file" -ge 1 ] && [ "$off" -eq 0 ]; then
    echo gated
  elif [ "$any" -eq 0 ]; then
    echo open
  else
    echo partial
  fi
}

# Probe the LIVE edge and require Basic Auth on every path that matters. This is
# the real security property — is auth actually enforced? — as opposed to a
# substring count in nginx.conf, which is blind to scope (auth_basic moved into a
# `location` block), to `auth_basic off;`, and to commented-out lines. A 200 on
# ANY of these means that surface is PUBLIC. Used post-reload, whenever the
# config being run declares the gate.
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

# Probe the LIVE edge anonymously and require that the public site actually
# serves: the SPA shell, an app route, the API health endpoint, and the JS bundle
# the shell names. Each must be a 200 without a password. Positive matches only:
# a dead edge yields no 200, so it fails here rather than passing by omission.
assert_edge_open() {
  local bad=0 code bundle
  for p in / /modules/multiplicity /api/v1/health/; do
    code="$(curl -s -o /dev/null -w '%{http_code}' "${EDGE_URL}${p}" || echo 000)"
    if [ "$code" = "200" ]; then
      ok "edge open: ${p} -> 200"
    else
      printf '    %s✗%s edge not serving: %s -> HTTP %s (expected 200 without a password)\n' "$RED" "$RST" "$p" "$code"
      bad=1
    fi
  done
  bundle="$(curl -s "${EDGE_URL}/" 2>/dev/null | grep -oE '/static/js/main\.[0-9a-f]+\.js' | head -1 || true)"
  if [ -z "$bundle" ]; then
    printf '    %s✗%s edge: / names no /static/js/main.*.js bundle\n' "$RED" "$RST"
    bad=1
  else
    code="$(curl -s -o /dev/null -w '%{http_code}' "${EDGE_URL}${bundle}" || echo 000)"
    if [ "$code" = "200" ]; then
      ok "edge open: ${bundle} -> 200"
    else
      printf '    %s✗%s edge not serving: %s -> HTTP %s (expected 200 without a password)\n' "$RED" "$RST" "$bundle" "$code"
      bad=1
    fi
  fi
  return "$bad"
}

# Verify the live edge is in the state an nginx.conf declares ($1 = gated|open).
assert_edge_state() {
  case "$1" in
    gated) assert_edge_gated ;;
    open)  assert_edge_open ;;
    *)     printf '    %s✗%s nginx.conf declares a %s gate — neither gated nor open\n' "$RED" "$RST" "$1"; return 1 ;;
  esac
}

# The same check, after giving recreated containers time to come up. A gated edge
# answers 401 from nginx alone, but an open one needs the app: right after
# `docker compose up -d` the backend can take a while, and probing too early reads a
# healthy release as broken. Retries quietly for up to ~60 s, then reports.
wait_for_edge_state() {
  local _
  for _ in $(seq 1 30); do
    if assert_edge_state "$1" >/dev/null 2>&1; then break; fi
    sleep 2
  done
  assert_edge_state "$1"
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
    # Rollback reverts IMAGES only, not the on-disk nginx.conf, so the edge keeps
    # whatever gate state that file declares. Verify the live surface matches it
    # (waiting for the recreated containers first), and refuse to exit 0 on a
    # half-gated config or an edge that disagrees.
    ON_DISK_CONF="$(cat nginx/nginx.conf)" || die "no nginx/nginx.conf on disk in $APP_DIR"
    ON_DISK_GATE="$(gate_state "$ON_DISK_CONF")"
    step "Verify the edge matches the on-disk nginx.conf (declares: $ON_DISK_GATE)"
    if wait_for_edge_state "$ON_DISK_GATE"; then
      ok "edge is $ON_DISK_GATE after rollback, as nginx.conf declares"
    else
      die "AFTER ROLLBACK THE EDGE DOES NOT MATCH nginx.conf (declares: $ON_DISK_GATE).
    Rollback reverts images, NOT config. Check the stack first (docker compose ps,
    docker compose logs --tail=50 backend nginx). To restore the config of a previous
    deploy instead:
      cp -a $BACKUP_ROOT/deploy-backup-<stamp>/nginx.conf nginx/nginx.conf
      docker compose restart nginx
    (Do NOT 'git checkout -f 900296a' — that commit predates the committed gate
    and its nginx.conf has ZERO auth_basic lines.)"
    fi
  fi
  warn "Images rolled back. This did NOT revert the git checkout or nginx.conf —"
  warn "the site stays $(gate_state "$(cat nginx/nginx.conf)"). If the bad deploy also changed"
  warn "compose/nginx/monitoring config, redeploy the previous commit with this"
  warn "script (its SHA is in $BACKUP_ROOT/deploy-backup-*/git-head.txt), NOT a blind checkout."
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

# 1. The target's password-gate state, and whether this deploy changes it.
#
#    This is a STATIC read of the file — it cannot be authoritative, because a
#    file grep is blind to how nginx actually applies it. It is a fast fail for the
#    obvious cases; the AUTHORITATIVE check is assert_edge_state() against the
#    running site after reload, below. A half-gated target (a realm inside a
#    `location`, `auth_basic off`, a realm without a user file) is refused outright:
#    it leaves some paths public while others still prompt. Removing the gate
#    publishes the site the moment nginx reloads, so that transition must be
#    confirmed explicitly with CONFIRM_PUBLIC=1.
# Read each file into a variable FIRST, so a failed read aborts here (set -e)
# instead of reaching gate_state as an empty string.
TARGET_CONF="$(git show "$SHA:nginx/nginx.conf")" || die "target $SHORT has no nginx/nginx.conf"
LIVE_CONF="$(cat nginx/nginx.conf)" || die "no nginx/nginx.conf on disk in $APP_DIR — cannot tell what is live"
TARGET_GATE="$(gate_state "$TARGET_CONF")"
LIVE_GATE="$(gate_state "$LIVE_CONF")"
case "$TARGET_GATE" in
  gated|open) ;;
  partial) die "target $SHORT HALF-GATES the site: its nginx.conf has auth_basic directives, but not
    an enabled realm and user file at SERVER scope of the 443 server (or it has
    'auth_basic off'). That leaves some paths public while others prompt.
    Gate at server scope, or remove every auth_basic line." ;;
  *) die "target $SHORT nginx/nginx.conf is empty (gate state: $TARGET_GATE)" ;;
esac
if [ "$TARGET_GATE" = "open" ] && [ "$LIVE_GATE" != "open" ] && [ "$CONFIRM_PUBLIC" != "1" ]; then
  die "target $SHORT has NO password gate, and the on-disk nginx.conf does (declares: $LIVE_GATE).
    Deploying it PUBLISHES THE SITE the moment nginx reloads: no password for any page or API.
    If that is the intent, rerun with CONFIRM_PUBLIC=1 (see DEPLOY.md)."
fi
# Both the guard above and the abort trap's restore take nginx.conf ON DISK as the
# truth about what is live. After an interrupted deploy, a hand checkout or a
# different mount, nginx may be running something else. Ask the live edge: a 401
# on / means it is gated, anything else that it is not. If the edge cannot be
# reached at all, the file is the only evidence; say so and go on, so that a
# deploy can still repair a site that is down.
EDGE_CODE="$(curl -s -o /dev/null -w '%{http_code}' "${EDGE_URL}/" || true)"
case "$EDGE_CODE" in
  ''|000*)
    warn "edge unreachable (HTTP ${EDGE_CODE:-none}): cannot confirm nginx runs the on-disk config; trusting the file" ;;
  401)
    [ "$LIVE_GATE" = "gated" ] || die "the live edge asks for a password (HTTP 401 on /), but nginx.conf on disk declares '$LIVE_GATE'.
    nginx is not running the file on disk (an interrupted deploy, a hand checkout or
    another mount). Make them agree first: restore the config nginx is running, e.g.
      cp -a $BACKUP_ROOT/deploy-backup-<stamp>/nginx.conf nginx/nginx.conf
    or restart nginx deliberately with the file on disk; then rerun." ;;
  *)
    [ "$LIVE_GATE" != "gated" ] || die "nginx.conf on disk declares the password gate, but the live edge answers HTTP $EDGE_CODE on / without one.
    The site may already be public. nginx is not running the file on disk; find out
    why (docker inspect stickforstats-nginx, its mounts and its logs) before deploying." ;;
esac
ok "password gate: on disk now $LIVE_GATE, target $TARGET_GATE, live edge / -> ${EDGE_CODE:-none} (verified again after reload)"
if [ "$TARGET_GATE" = "open" ] && [ "$LIVE_GATE" != "open" ]; then
  warn "this deploy REMOVES the password gate (CONFIRM_PUBLIC=1 given)"
fi

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
#
#    Ask git for exactly those paths rather than piping the whole tree listing into
#    `grep -q`: grep stops at its first match, printf then dies of SIGPIPE, and
#    pipefail turned that into "no match" once the listing passed ~70-128 KiB (this
#    repo's is ~130 KB), so a tracked .env sailed through.
COLLISION="$(git ls-tree -r --name-only "$SHA" -- .env secrets nginx/ssl docker-compose.override.yml | tr '\n' ' ')"
[ -z "$COLLISION" ] || die "target $SHORT TRACKS host-only secret path(s): $COLLISION
    'git checkout -f' would OVERWRITE the production copy with the repo's version —
    destroying the TLS key / .htpasswd / .env, which exist nowhere else.
    Remove those paths from git (and add them to .gitignore) before deploying."
ok "no tracked path collides with the host's secrets (.env, nginx/ssl/, secrets/)"

ok "pre-flight passed"

# ---------------------------------------------------------------------------
# Backup. Host-only material must survive: it exists nowhere else.
# ---------------------------------------------------------------------------
step "Backup host-only state"
BK="$BACKUP_ROOT/deploy-backup-$(date +%Y%m%d-%H%M%S)"
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
    # Finish the revert whatever happens to the terminal: a Ctrl-C, SIGTERM or SSH
    # hangup kills a `| tee` too, and the first write to that dead pipe used to kill
    # this trap before it reverted anything (measured: 0 of 8 runs reverted). Ignore
    # those signals here, and keep going past any single failed step.
    trap '' PIPE HUP INT TERM
    set +e
    printf '\n%s✗ deploy aborted mid-flight (exit %s) — reverting to the previous release%s\n' "$RED" "$rc" "$RST" >&2
    git checkout -f "$PREV_SHA" >/dev/null 2>&1 && echo "    tree reverted to ${PREV_SHA:0:7}" >&2 \
      || echo "    ${RED}could not revert tree${RST}" >&2

    # CRITICAL: the reverted tree's nginx.conf is not necessarily what was live.
    # $PREV_SHA can predate the committed gate (the production host's HEAD was once
    # 900296a, whose nginx.conf has ZERO auth_basic lines), so trusting it once
    # PUBLISHED the site mid-revert. Restore the backup instead: it was captured
    # from the on-disk config at the start of this run, so the edge goes back to
    # exactly the gate state it had before (gated or open). This is the fix for the
    # exact incident that first exercised this trap.
    if [ -s "$BK/nginx.conf" ]; then
      cp -a "$BK/nginx.conf" nginx/nginx.conf
      echo "    restored the pre-deploy nginx.conf from backup (declares: $(gate_state "$(cat nginx/nginx.conf)"))" >&2
    else
      echo "    ${RED}backup nginx.conf missing — check nginx/nginx.conf BY HAND now${RST}" >&2
    fi
    # The reverted checkout must not have taken .env with it (a target that tracked
    # .env would have overwritten it, and reverting from such a target deletes it).
    if [ -s "$BK/env" ] && ! cmp -s "$BK/env" .env 2>/dev/null; then
      cp -a "$BK/env" .env && echo "    restored .env from backup" >&2
    fi

    for img in backend frontend; do
      docker image inspect "stickforstats/$img:rollback-prev" >/dev/null 2>&1 \
        && docker tag "stickforstats/$img:rollback-prev" "stickforstats/$img:1.0.0" >/dev/null 2>&1
    done
    # Restart nginx even when `up` fails: that restart is what puts the restored
    # nginx.conf (and so the previous gate state) back on the live edge.
    local stack_ok=1
    docker compose up -d --no-build >/dev/null 2>&1 || stack_ok=0
    docker compose restart nginx >/dev/null 2>&1 || stack_ok=0
    if [ "$stack_ok" = 1 ]; then
      echo "    images reverted and stack restarted on the previous release" >&2
    else
      echo "    ${RED}stack revert failed — run: ./scripts/deploy.sh --rollback${RST}" >&2
    fi

    # Do not exit quietly on an edge that disagrees with the restored config: a
    # gated config that does not gate is a public site, and an open config that
    # does not serve is an outage. Verify (after giving the containers time to come
    # up), and say so loudly if it does not hold.
    RESTORED_GATE="$(gate_state "$(cat nginx/nginx.conf)")"
    if wait_for_edge_state "$RESTORED_GATE" >/dev/null 2>&1; then
      echo "    ${GRN}verified: edge is $RESTORED_GATE after revert, as the restored nginx.conf declares${RST}" >&2
    elif [ "$RESTORED_GATE" = "open" ]; then
      printf '    %s*** THE SITE IS NOT SERVING after revert — check nginx and the stack NOW ***%s\n' "$RED" "$RST" >&2
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
  # The file on disk must declare exactly what the pre-flight read from the target.
  CHECKED_OUT_GATE="$(gate_state "$(cat nginx/nginx.conf 2>/dev/null || true)")"
  [ "$CHECKED_OUT_GATE" = "$TARGET_GATE" ] \
    || restore_and_die "nginx.conf after checkout declares '$CHECKED_OUT_GATE', target declared '$TARGET_GATE' — refusing to continue"
  [ -f .env ]                 || restore_and_die ".env vanished during checkout"
  if [ "$TARGET_GATE" = "gated" ]; then
    [ -f nginx/ssl/.htpasswd ] || restore_and_die "nginx/ssl/.htpasswd vanished — the password gate has no password file"
  fi
  [ -f nginx/ssl/cert.pem ]   || restore_and_die "nginx/ssl/cert.pem vanished — TLS would fail"
  ok "nginx.conf ($TARGET_GATE), .env and TLS material all intact"
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
[ "$DRY_RUN" = "1" ] || ok "docker compose config is valid"
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
  # With the signing KEYRING, JWKS legitimately serves MORE THAN ONE key after a
  # rotation: the active key plus retired, verify-only keys, so a receipt signed
  # under a rotated-out key still verifies (its kid is still published). Multiple
  # STABLE keys is therefore healthy, not a fault. The failure this once guarded
  # against — per-worker EPHEMERAL divergence (4 workers minting 4 throwaway kids)
  # — is caught by the ephemeral check below, which fails on ANY ephemeral kid
  # regardless of count. So the only count that fails here is zero (JWKS down).
  if [ "$N_KIDS" -eq 0 ]; then
    check "receipt JWKS unreachable — cannot confirm the signing key at all" FAIL
  else
    check "receipt JWKS serves $N_KIDS key(s) ($(printf '%s' "$KIDS" | tr '\n' ' '))" PASS
  fi
  # Must have OBSERVED a kid, and it must not be ephemeral.
  case "$KIDS" in
    '')                            check "receipt key is a stable, configured key (no kid observed)" FAIL ;;
    *stickforstats-receipt-ephemeral*) check "receipt key is a stable, configured key (got an EPHEMERAL key)" FAIL ;;
    *)                             check "receipt key is a stable, configured key" PASS ;;
  esac

  # THE EDGE CHECK, and the authoritative one for the gate. Probe the LIVE edge
  # and require the state the deployed nginx.conf declares. Gated: 401 on every
  # path that matters — /, /api/, the health endpoint, the JS bundle, an app
  # route — which catches what a file grep cannot (a gate mis-scoped into a
  # `location` block, `auth_basic off;`). Open: 200 without a password on the
  # shell, an app route, the API health endpoint and the bundle.
  if wait_for_edge_state "$TARGET_GATE"; then :; else FAILED=1; fi

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
  printf '  The edge may not match nginx.conf (gate state: %s) or the wrong code may be live.\n' "$TARGET_GATE"
  printf '  This script now reverts by itself (checkout, nginx.conf from %s, images) and\n' "$BK"
  printf '  checks the edge; read its report below. Only if that report says the revert\n'
  printf '  failed: cd %s && ./scripts/deploy.sh --rollback\n\n' "$APP_DIR"
  # The trap is still armed (DEPLOY_COMMITTED=0), so exiting non-zero here AUTO-
  # reverts tree + images to the previous release. Do not suggest a hand
  # `git checkout -f` here: it would discard the host-edited nginx.conf the trap
  # restores from the backup.
  exit 1
fi

# Success: disarm the mid-flight rollback trap. Everything from here is safe.
DEPLOY_COMMITTED=1
trap - EXIT

if [ "$DRY_RUN" = "1" ]; then
  step "Dry run finished for $SHORT: nothing was changed (pre-flight only; nothing was validated, applied or verified)"
  exit 0
fi
step "Deployed $SHORT"
ok "config and images are both at $SHORT — they can no longer drift apart"
ok "rollback: ./scripts/deploy.sh --rollback   (backup: $BK)"
