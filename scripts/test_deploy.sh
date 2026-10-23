#!/usr/bin/env bash
#
# Local test harness for scripts/deploy.sh. It never touches a real host.
#
# Real git (a throwaway origin + checkout), stub `docker`, `curl` and `sleep` on
# PATH. The stub edge answers from whichever nginx.conf the stub nginx was last
# restarted with, so every scenario exercises the script's own checkout, backup,
# rollback trap and live verification, end to end:
#
#   gated config  -> every path 401
#   open config   -> /, an app route, /api/v1/health/ and the JS bundle 200
#   FAULT_EDGE    -> injected disagreements between the config and the edge
#
# The gated fixture is nginx/nginx.conf at the v1.2.0 tag (the last gated
# release); the open and half-gated fixtures are derived from it.
#
#   bash scripts/test_deploy.sh            # run every scenario
#   DEPLOY=/path/to/other/deploy.sh bash scripts/test_deploy.sh
#   SKIP_SIGNALS=1 bash scripts/test_deploy.sh   # skip S30-S32 and S36, which run in real time
#
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY="${DEPLOY:-$REPO_ROOT/scripts/deploy.sh}"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/sfs-deploy-harness.XXXXXX")"
trap '[ -n "${KEEP_WORK:-}" ] || rm -rf "$WORK"' EXIT

PASS=0; FAIL=0
pass() { printf '  PASS  %s\n' "$1"; PASS=$((PASS + 1)); }
fail() { printf '  FAIL  %s\n' "$1"; FAIL=$((FAIL + 1)); }

GATED_CONF="$WORK/fixtures/gated.conf"
OPEN_CONF="$WORK/fixtures/open.conf"
PARTIAL_CONF="$WORK/fixtures/partial.conf"
mkdir -p "$WORK/fixtures"
git -C "$REPO_ROOT" show v1.2.0:nginx/nginx.conf > "$GATED_CONF" || { echo "cannot read v1.2.0:nginx/nginx.conf"; exit 2; }
grep -qE '^        auth_basic "' "$GATED_CONF" || { echo "fixture: v1.2.0 nginx.conf is not gated at server scope"; exit 2; }
# Open: the same config with every auth_basic directive removed.
grep -vE '^[[:space:]]*auth_basic' "$GATED_CONF" > "$OPEN_CONF"
# Half-gated: the realm moved from server scope into `location /api/` only.
awk '
  /^[[:space:]]*auth_basic/ {next}
  {print}
  /location \/api\/ \{/ {print "            auth_basic \"StickForStats closed beta\";"; print "            auth_basic_user_file /etc/nginx/ssl/.htpasswd;"}
' "$GATED_CONF" > "$PARTIAL_CONF"
# Half-gated by opting out: the server-scope realm stays, `location /api/` says off.
OFF_CONF="$WORK/fixtures/off.conf"
awk '{print} /location \/api\/ \{/ {print "            auth_basic off;"}' "$GATED_CONF" > "$OFF_CONF"
# The same, with the realm "off" quoted (nginx reads it as off too).
QOFF_CONF="$WORK/fixtures/qoff.conf"
awk '{print} /location \/api\/ \{/ {print "            auth_basic \"off\";"}' "$GATED_CONF" > "$QOFF_CONF"
# Fully gated, with the realm in single quotes.
SQ_CONF="$WORK/fixtures/sq.conf"
sed -E "s/^        auth_basic \"([^\"]*)\";/        auth_basic '\\1';/" "$GATED_CONF" > "$SQ_CONF"
grep -qE "^        auth_basic '" "$SQ_CONF" || { echo "fixture: single-quoted realm not produced"; exit 2; }

# ---------------------------------------------------------------------------
# Stubs
# ---------------------------------------------------------------------------
mkdir -p "$WORK/bin"
cat > "$WORK/bin/sleep" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF

cat > "$WORK/bin/docker" <<'EOF'
#!/usr/bin/env bash
# Stub docker. Image tags are files under $HARNESS_STATE/tags.
S="$HARNESS_STATE"
key() { printf '%s' "$1" | tr '/:' '__'; }
case "$1" in
  image)
    shift; [ "${1:-}" = inspect ] && shift
    if [ "${1:-}" = "-f" ]; then shift 2; fi
    f="$S/tags/$(key "$1")"; [ -f "$f" ] || exit 1; cat "$f"; exit 0 ;;
  tag)
    src="$S/tags/$(key "$2")"; [ -f "$src" ] || exit 1
    cp "$src" "$S/tags/$(key "$3")"; exit 0 ;;
  manifest)
    [ "${FAULT_NO_IMAGE:-0}" = 1 ] && exit 1; exit 0 ;;
  pull)
    [ -n "${SLOW_PULL:-}" ] && /bin/sleep "$SLOW_PULL"
    img="${*: -1}"; printf 'img:%s\n' "$img" > "$S/tags/$(key "$img")"; exit 0 ;;
  compose)
    case "${2:-}" in
      up)
        n=$(( $(cat "$S/up_count" 2>/dev/null || echo 0) + 1 )); echo "$n" > "$S/up_count"
        if [ "${FAULT_UP_SECOND:-0}" = 1 ] && [ "$n" -ge 2 ]; then echo "simulated compose up failure" >&2; exit 1; fi
        # `up` is what starts containers from the current :1.0.0 tags.
        cp "$S/tags/stickforstats_backend_1.0.0" "$S/running_backend" 2>/dev/null
        exit 0 ;;
      restart)
        if [ "${3:-}" = nginx ]; then
          cp "$APP_DIR/nginx/nginx.conf" "$S/live_nginx.conf"
          # Record every config nginx ever ran, so a scenario can assert that a
          # refused config never went live, even briefly.
          if grep -qE '^            auth_basic' "$S/live_nginx.conf"; then echo "applied: half-gated" >> "$S/applied.log"
          else echo "applied: whole" >> "$S/applied.log"; fi
        fi
        exit 0 ;;
      *) exit 0 ;;
    esac ;;
  cp) exit 0 ;;
  exec)
    case "$2" in
      stickforstats-nginx)
        if [ "${3:-}" = nginx ] && [ "${FAULT_NGINX_T:-0}" = 1 ]; then echo "nginx: [emerg] simulated failure" >&2; exit 1; fi
        exit 0 ;;
      stickforstats-backend)
        [ -n "${SLOW_EXEC:-}" ] && /bin/sleep "$SLOW_EXEC"
        case "$*" in
          *api/v1/health/*) echo '{"status": "healthy", "database": "connected"}' ;;
          *receipt/jwks/*)  echo '{"keys": [{"kid": "stickforstats-receipt-2026-07"}]}' ;;
        esac
        exit 0 ;;
    esac
    exit 0 ;;
  ps) printf 'stickforstats-backend Up 3 minutes\nstickforstats-nginx Up 3 minutes\n'; exit 0 ;;
  inspect)
    # The RUNNING container's revision: whatever the last `compose up` started.
    f="$S/running_backend"; [ -f "$f" ] || exit 1
    sed -E 's#.*/backend:##' "$f"; exit 0 ;;
  images) echo "stickforstats/backend:1.0.0 stub"; exit 0 ;;
esac
exit 0
EOF

cat > "$WORK/bin/curl" <<'EOF'
#!/usr/bin/env bash
# Stub edge: answers from the nginx.conf the stub nginx last restarted with.
S="$HARNESS_STATE"
url="${*: -1}"
path="/${url#*://*/}"
want_code=0
for a in "$@"; do [ "$a" = "-w" ] && want_code=1; done
conf="$S/live_nginx.conf"
# 8-space indent = server scope in these fixtures; 12 = inside a location block.
if grep -qE "^        auth_basic [\"']" "$conf"; then mode=gated
elif grep -qE '^            auth_basic "' "$conf" && ! grep -qE '^            auth_basic "off";' "$conf"; then mode=api_gated
else mode=open; fi
BUNDLE=/static/js/main.1a2b3c4d.js
code=404
case "$mode" in
  gated) code=401 ;;
  api_gated) case "$path" in /api/*) code=401 ;; /|/modules/multiplicity|"$BUNDLE") code=200 ;; esac ;;
  open) case "$path" in /|/modules/multiplicity|/api/v1/health/|"$BUNDLE") code=200 ;; esac ;;
esac
# `auth_basic off;` inside a location (12-space indent) opts that location out.
if [ "$mode" = gated ] && grep -qE '^            auth_basic (off|"off");' "$conf"; then
  case "$path" in /api/*) code=200 ;; esac
fi
case "${FAULT_EDGE:-}" in
  down) [ "$want_code" = 1 ] && printf '000'; exit 7 ;;
  prompt_health) [ "$path" = /api/v1/health/ ] && code=401 ;;
  bundle_404) [ "$path" = "$BUNDLE" ] && code=404 ;;
  warmup)  # the app needs a few health probes after a restart before it answers
    if [ "$path" = /api/v1/health/ ] && [ "$code" = 200 ]; then
      n=$(( $(cat "$S/warmup" 2>/dev/null || echo 0) + 1 )); echo "$n" > "$S/warmup"
      [ "$n" -le 3 ] && code=502
    fi ;;
  api_public) [ "$mode" = gated ] && case "$path" in /api/*) code=200 ;; esac ;;
esac
if [ "$want_code" = 1 ]; then printf '%s' "$code"; exit 0; fi
if [ "$code" = 200 ] && [ "$path" = / ]; then
  if [ "${FAULT_EDGE:-}" = no_bundle ]; then echo '<html><body></body></html>'
  else echo "<html><head><script defer=\"defer\" src=\"$BUNDLE\"></script></head></html>"; fi
fi
exit 0
EOF
chmod +x "$WORK/bin/"*

# ---------------------------------------------------------------------------
# A fresh "host" for every scenario: origin repo, checkout, host-only secrets,
# images, and a stub nginx already serving the live config.
# ---------------------------------------------------------------------------
SHA_GATED=""; SHA_OPEN=""; SHA_OPEN2=""; SHA_PARTIAL=""; SHA_NOCONF=""; SHA_OFF=""
new_host() {  # $1 = scenario dir; $2 = gated|open (what is live); $3 = hotpatch (optional)
  local d="$1" live="$2" hotpatch="${3:-}"
  rm -rf "$d"; mkdir -p "$d/state/tags"
  git init -q --bare -b main "$d/origin.git"
  git init -q -b main "$d/seed"
  (
    cd "$d/seed" || exit 1
    git config user.email harness@example.invalid; git config user.name harness
    mkdir -p nginx scripts
    printf 'services: {}\n' > docker-compose.yml
    cp "$GATED_CONF" nginx/nginx.conf; git add -A; git commit -qm gated
    cp "$OPEN_CONF" nginx/nginx.conf;  git add -A; git commit -qm open
    echo "# docs" > README.md;         git add -A; git commit -qm open2
    cp "$PARTIAL_CONF" nginx/nginx.conf; git add -A; git commit -qm partial
    git rm -q nginx/nginx.conf;        git commit -qm noconf
    mkdir -p nginx; cp "$OFF_CONF" nginx/nginx.conf; git add -A; git commit -qm off
    git push -q "$d/origin.git" main
  )
  SHA_GATED="$(git -C "$d/seed" rev-parse HEAD~5)"
  SHA_OPEN="$(git -C "$d/seed" rev-parse HEAD~4)"
  SHA_OPEN2="$(git -C "$d/seed" rev-parse HEAD~3)"
  SHA_PARTIAL="$(git -C "$d/seed" rev-parse HEAD~2)"
  SHA_NOCONF="$(git -C "$d/seed" rev-parse HEAD~1)"
  SHA_OFF="$(git -C "$d/seed" rev-parse HEAD)"
  git clone -q "$d/origin.git" "$d/app"
  git -C "$d/app" config user.email harness@example.invalid; git -C "$d/app" config user.name harness
  local live_sha; if [ "$live" = gated ]; then live_sha="$SHA_GATED"; else live_sha="$SHA_OPEN"; fi
  git -C "$d/app" checkout -q -f -B main "$live_sha"
  mkdir -p "$d/app/nginx/ssl"
  echo "SECRET_KEY=x" > "$d/app/.env"
  echo "cert" > "$d/app/nginx/ssl/cert.pem"
  echo "beta:\$2y\$05\$stub" > "$d/app/nginx/ssl/.htpasswd"
  # A host hot-patch: the live nginx.conf differs from every commit, so a revert
  # that trusts the reverted tree instead of the backup is visible.
  [ -n "$hotpatch" ] && echo "# host-hotpatch-marker" >> "$d/app/nginx/nginx.conf"
  cp "$d/app/nginx/nginx.conf" "$d/state/live_nginx.conf"
  for img in backend frontend; do
    printf 'img:ghcr.io/visvikbharti/stickforstats_new/%s:%s\n' "$img" "$live_sha" > "$d/state/tags/stickforstats_${img}_1.0.0"
  done
  cp "$d/state/tags/stickforstats_backend_1.0.0" "$d/state/running_backend"
  mkdir -p "$d/backups"
}

run_deploy() {  # $1 = scenario dir; rest = deploy.sh args. Output in $d/out, exit in $d/rc.
  local d="$1"; shift
  ( export PATH="$WORK/bin:$PATH" HARNESS_STATE="$d/state" APP_DIR="$d/app" \
           EDGE_URL="https://edge.test" BACKUP_ROOT="$d/backups"
    bash "$DEPLOY" "$@" < /dev/null ) > "$d/out" 2>&1
  echo "$?" > "$d/rc"
}

has()     { grep -qF -- "$2" "$1/out"; }
lacks()   { ! grep -qF -- "$2" "$1/out"; }
never_applied_half_gate() { ! grep -qF "applied: half-gated" "$1/state/applied.log" 2>/dev/null; }
live_is_gated()     { grep -qE '^        auth_basic "' "$1/state/live_nginx.conf"; }
live_is_open()      { ! grep -qE '^[[:space:]]*auth_basic' "$1/state/live_nginx.conf"; }
tag_is()            { grep -qF "/backend:$2" "$1/state/tags/stickforstats_backend_1.0.0"; }
running_is()        { grep -qF "/backend:$2" "$1/state/running_backend"; }
no_restart_logged() { [ ! -e "$1/state/applied.log" ]; }
no_compose_up()     { [ ! -e "$1/state/up_count" ]; }
env_is_original()   { [ "$(cat "$1/app/.env")" = "SECRET_KEY=x" ]; }

# Run deploy.sh in its OWN process group, as a terminal runs a foreground job, wait
# for a marker in its output, then signal the whole group, which is what Ctrl-C or
# an SSH hangup does. $4 = tee (output piped through tee, a pipe that dies with the
# job) or file (output redirected to a file).
sig_run() {
  local d="$1" sig="$2" marker="$3" mode="$4"; shift 4
  : > "$d/out"
  set -m
  # The deploy records its own PID (exec keeps it), because the subshell that wraps it
  # can die of the signal while a deploy that ignores the signal runs on.
  rm -f "$d/deploy.pid"
  if [ "$mode" = tee ]; then
    ( export PATH="$WORK/bin:$PATH" HARNESS_STATE="$d/state" APP_DIR="$d/app" \
             EDGE_URL="https://edge.test" BACKUP_ROOT="$d/backups"
      bash -c 'echo $$ > "$1"; shift; exec bash "$@"' _ "$d/deploy.pid" "$DEPLOY" "$@" < /dev/null 2>&1 \
        | tee "$d/out" > /dev/null ) &
  else
    ( export PATH="$WORK/bin:$PATH" HARNESS_STATE="$d/state" APP_DIR="$d/app" \
             EDGE_URL="https://edge.test" BACKUP_ROOT="$d/backups"
      exec bash -c 'echo $$ > "$1"; shift; exec bash "$@"' _ "$d/deploy.pid" "$DEPLOY" "$@" < /dev/null > "$d/out" 2>&1 ) &
  fi
  local pg=$! i
  set +m
  for i in $(seq 1 150); do grep -qF -- "$marker" "$d/out" 2>/dev/null && break; /bin/sleep 0.1; done
  /bin/sleep 0.3
  kill "-$sig" -- "-$pg" 2>/dev/null
  wait "$pg" 2>/dev/null; echo "$?" > "$d/rc"
  # Wait for the deploy process itself (up to 2 minutes), whatever the signal did to its wrapper.
  local dp; dp="$(cat "$d/deploy.pid" 2>/dev/null || true)"
  if [ -n "$dp" ]; then
    for i in $(seq 1 600); do kill -0 "$dp" 2>/dev/null || break; /bin/sleep 0.2; done
  fi
  /bin/sleep 0.5
}
rc_is()   { [ "$(cat "$1/rc")" = "$2" ]; }
conf_is() {  # $1 dir, $2 gated|open : what the checkout's nginx.conf declares
  if grep -qE '^[[:space:]]*auth_basic[[:space:]]+"' "$1/app/nginx/nginx.conf"; then [ "$2" = gated ]; else [ "$2" = open ]; fi
}
head_is() { [ "$(git -C "$1/app" rev-parse HEAD)" = "$2" ]; }
check() {  # $1 description, rest: a command that must succeed
  local desc="$1"; shift
  if "$@"; then pass "$desc"; else fail "$desc"; fi
}
show_tail() { sed -n '1,400p' "$1/out" | tail -25 | sed 's/^/        | /'; }

echo "deploy script under test: $DEPLOY"

# --- S1: removing the gate without CONFIRM_PUBLIC is refused, nothing changes
d="$WORK/s1"; new_host "$d" gated
run_deploy "$d" "$SHA_OPEN"
check "S1 gated->open without CONFIRM_PUBLIC exits non-zero"   rc_is "$d" 1
check "S1 ...says it would publish the site"                    has "$d" "PUBLISHES THE SITE"
check "S1 ...checkout untouched (still the gated commit)"       head_is "$d" "$SHA_GATED"
check "S1 ...nginx.conf still gated"                            conf_is "$d" gated
check "S1 ...refused before touching the checkout"              lacks "$d" "Sync checkout to"
rc_is "$d" 1 || show_tail "$d"

# --- S2: with CONFIRM_PUBLIC=1 the gate comes off and the open edge is verified
d="$WORK/s2"; new_host "$d" gated
CONFIRM_PUBLIC=1 run_deploy "$d" "$SHA_OPEN"
check "S2 gated->open with CONFIRM_PUBLIC=1 exits 0"            rc_is "$d" 0
check "S2 ...warns that the gate is being removed"              has "$d" "this deploy REMOVES the password gate"
check "S2 ...verifies / without a password"                     has "$d" "edge open: / -> 200"
check "S2 ...verifies the API health endpoint"                  has "$d" "edge open: /api/v1/health/ -> 200"
check "S2 ...verifies the JS bundle"                            has "$d" "edge open: /static/js/main.1a2b3c4d.js -> 200"
check "S2 ...checkout at the open commit"                       head_is "$d" "$SHA_OPEN"
check "S2 ...nginx.conf open"                                   conf_is "$d" open
check "S2 ...the open config is what nginx runs"                 live_is_open "$d"
check "S2 ...containers were started from the new images"       running_is "$d" "$SHA_OPEN"
rc_is "$d" 0 || show_tail "$d"

# --- S3: open -> open needs no confirmation
d="$WORK/s3"; new_host "$d" open
run_deploy "$d" "$SHA_OPEN2"
check "S3 open->open without CONFIRM_PUBLIC exits 0"            rc_is "$d" 0
check "S3 ...checkout at the new commit"                        head_is "$d" "$SHA_OPEN2"
rc_is "$d" 0 || show_tail "$d"

# --- S4: open -> gated (re-closing the site) works and verifies the gate
d="$WORK/s4"; new_host "$d" open
run_deploy "$d" "$SHA_GATED"
check "S4 open->gated exits 0"                                  rc_is "$d" 0
check "S4 ...verifies 401 at the edge"                          has "$d" "edge gated: / -> 401"
check "S4 ...nginx.conf gated"                                  conf_is "$d" gated
rc_is "$d" 0 || show_tail "$d"

# --- S5: a half-gated target is refused even with CONFIRM_PUBLIC=1
d="$WORK/s5"; new_host "$d" gated
CONFIRM_PUBLIC=1 run_deploy "$d" "$SHA_PARTIAL"
check "S5 half-gated target exits non-zero"                     rc_is "$d" 1
check "S5 ...names the half-gate"                               has "$d" "HALF-GATES the site"
check "S5 ...checkout untouched"                                head_is "$d" "$SHA_GATED"
check "S5 ...refused before touching the checkout"              lacks "$d" "Sync checkout to"
check "S5 ...the half-gated config never went live"             never_applied_half_gate "$d"

# --- S6: a target with no nginx.conf is refused (never read as "open")
d="$WORK/s6"; new_host "$d" open
run_deploy "$d" "$SHA_NOCONF"
check "S6 target without nginx.conf exits non-zero"             rc_is "$d" 1
check "S6 ...says so"                                           has "$d" "has no nginx/nginx.conf"
check "S6 ...checkout untouched"                                head_is "$d" "$SHA_OPEN"
check "S6 ...refused before touching the checkout"              lacks "$d" "Sync checkout to"

# --- S7: abort mid-flight on the gate-removing deploy -> trap restores the GATED config
d="$WORK/s7"; new_host "$d" gated hotpatch
CONFIRM_PUBLIC=1 FAULT_NGINX_T=1 run_deploy "$d" "$SHA_OPEN"
check "S7 nginx -t failure exits non-zero"                      rc_is "$d" 1
check "S7 ...trap restored the pre-deploy nginx.conf"           has "$d" "restored the pre-deploy nginx.conf from backup (declares: gated)"
check "S7 ...trap verified the edge is gated again"             has "$d" "verified: edge is gated after revert"
check "S7 ...nginx.conf gated again"                            conf_is "$d" gated
check "S7 ...the restored file is the live one (host edit kept)" grep -qF "host-hotpatch-marker" "$d/app/nginx/nginx.conf"
check "S7 ...checkout back on the gated commit"                 head_is "$d" "$SHA_GATED"
check "S7 ...the live edge is gated again"                       live_is_gated "$d"
check "S7 ...:1.0.0 points back at the previous build"           tag_is "$d" "$SHA_GATED"
check "S7 ...and the previous build is what runs"                running_is "$d" "$SHA_GATED"

# --- S8: abort mid-flight on an open->open deploy -> trap restores the OPEN config
d="$WORK/s8"; new_host "$d" open hotpatch
FAULT_NGINX_T=1 run_deploy "$d" "$SHA_OPEN2"
check "S8 nginx -t failure exits non-zero"                      rc_is "$d" 1
check "S8 ...trap restored the pre-deploy (open) nginx.conf"    has "$d" "restored the pre-deploy nginx.conf from backup (declares: open)"
check "S8 ...trap verified the edge is open again"              has "$d" "verified: edge is open after revert"
check "S8 ...the restored file is the live one (host edit kept)" grep -qF "host-hotpatch-marker" "$d/app/nginx/nginx.conf"
check "S8 ...checkout back on the previous commit"              head_is "$d" "$SHA_OPEN"
check "S8 ...the live edge is open, as before"                   live_is_open "$d"

# --- S9: the open edge still prompting for a password fails verification -> auto-revert
d="$WORK/s9"; new_host "$d" gated
CONFIRM_PUBLIC=1 FAULT_EDGE=prompt_health run_deploy "$d" "$SHA_OPEN"
check "S9 edge still 401 on /api/v1/health/ exits non-zero"     rc_is "$d" 1
check "S9 ...reports the path that is not serving"              has "$d" "edge not serving: /api/v1/health/ -> HTTP 401"
check "S9 ...verification failed banner"                        has "$d" "DEPLOY VERIFICATION FAILED"
check "S9 ...trap reverted to the gated config"                 conf_is "$d" gated
check "S9 ...and put the gate back on the LIVE edge"            live_is_gated "$d"

# --- S10: an open deploy whose bundle 404s fails verification
d="$WORK/s10"; new_host "$d" open
FAULT_EDGE=bundle_404 run_deploy "$d" "$SHA_OPEN2"
check "S10 bundle 404 exits non-zero"                           rc_is "$d" 1
check "S10 ...names the bundle"                                 has "$d" "edge not serving: /static/js/main.1a2b3c4d.js -> HTTP 404"

# --- S11: an open deploy whose shell names no bundle fails verification
d="$WORK/s11"; new_host "$d" open
FAULT_EDGE=no_bundle run_deploy "$d" "$SHA_OPEN2"
check "S11 no bundle in / exits non-zero"                       rc_is "$d" 1
check "S11 ...says / names no bundle"                           has "$d" "names no /static/js/main.*.js bundle"

# --- S12: a dead edge fails an open deploy (never passes by omission)
d="$WORK/s12"; new_host "$d" open
FAULT_EDGE=down run_deploy "$d" "$SHA_OPEN2"
check "S12 dead edge exits non-zero"                            rc_is "$d" 1

# --- S13: gated deploy where /api/ leaks 200 still fails (the original P0)
d="$WORK/s13"; new_host "$d" open
FAULT_EDGE=api_public run_deploy "$d" "$SHA_GATED"
check "S13 gated target with /api/ public exits non-zero"       rc_is "$d" 1
check "S13 ...reports the public path"                          has "$d" "edge NOT gated: /api/ -> HTTP 200"

# --- S14: --rollback after the gate came off keeps the site open and verifies it
d="$WORK/s14"; new_host "$d" gated
CONFIRM_PUBLIC=1 run_deploy "$d" "$SHA_OPEN"
run_deploy "$d" --rollback
check "S14 --rollback exits 0"                                  rc_is "$d" 0
check "S14 ...verifies the edge matches the open nginx.conf"    has "$d" "edge is open after rollback, as nginx.conf declares"
check "S14 ...images point back at the previous build"        grep -qF "/backend:$SHA_GATED" "$d/state/tags/stickforstats_backend_1.0.0"
check "S14 ...says the site stays open"                         has "$d" "the site stays open"
rc_is "$d" 0 || show_tail "$d"

# --- S15: --rollback onto a dead edge fails loudly
d="$WORK/s15"; new_host "$d" gated
CONFIRM_PUBLIC=1 run_deploy "$d" "$SHA_OPEN"
FAULT_EDGE=down run_deploy "$d" --rollback
check "S15 --rollback with a dead edge exits non-zero"          rc_is "$d" 1
check "S15 ...says the edge does not match"                     has "$d" "AFTER ROLLBACK THE EDGE DOES NOT MATCH"

# --- S16: full return to the gated release = redeploy the gated commit
d="$WORK/s16"; new_host "$d" gated
CONFIRM_PUBLIC=1 run_deploy "$d" "$SHA_OPEN"
run_deploy "$d" "$SHA_GATED"
check "S16 redeploying the gated commit exits 0"                rc_is "$d" 0
check "S16 ...edge verified gated"                              has "$d" "edge gated: /api/ -> 401"
check "S16 ...nginx.conf gated"                                 conf_is "$d" gated
check "S16 ...checkout on the gated commit"                     head_is "$d" "$SHA_GATED"
rc_is "$d" 0 || show_tail "$d"

# --- S17: `auth_basic off;` in a location is a half-gate, refused
d="$WORK/s17"; new_host "$d" gated
run_deploy "$d" "$SHA_OFF"
check "S17 target with 'auth_basic off' exits non-zero"         rc_is "$d" 1
check "S17 ...names the half-gate"                              has "$d" "HALF-GATES the site"
check "S17 ...checkout untouched"                               head_is "$d" "$SHA_GATED"
check "S17 ...refused before touching the checkout"             lacks "$d" "Sync checkout to"
check "S17 ...the half-gated config never went live"            never_applied_half_gate "$d"

# --- S18: an aborted open deploy whose edge is then dead says the site is not serving
d="$WORK/s18"; new_host "$d" open
FAULT_NGINX_T=1 FAULT_EDGE=down run_deploy "$d" "$SHA_OPEN2"
check "S18 abort + dead edge exits non-zero"                    rc_is "$d" 1
check "S18 ...trap says the site is not serving"                has "$d" "THE SITE IS NOT SERVING after revert"

# --- S19: an aborted gate-removing deploy whose restored gate leaks /api/ says so
d="$WORK/s19"; new_host "$d" gated
CONFIRM_PUBLIC=1 FAULT_NGINX_T=1 FAULT_EDGE=api_public run_deploy "$d" "$SHA_OPEN"
check "S19 abort + /api/ public exits non-zero"                 rc_is "$d" 1
check "S19 ...trap says the site may be public"                 has "$d" "THE SITE MAY BE PUBLIC"

# --- S20: the dry run DEPLOY.md asks for changes nothing
d="$WORK/s20"; new_host "$d" gated
cp "$d/state/live_nginx.conf" "$d/live_before.conf"
DRY_RUN=1 CONFIRM_PUBLIC=1 run_deploy "$d" "$SHA_OPEN"
check "S20 dry run exits 0"                                     rc_is "$d" 0
check "S20 ...prints the checkout it would do"                  has "$d" "[dry-run] git checkout -f -B main $SHA_OPEN"
check "S20 ...checkout untouched"                               head_is "$d" "$SHA_GATED"
check "S20 ...nginx never restarted"                            cmp -s "$d/live_before.conf" "$d/state/live_nginx.conf"
check "S20 ...no backup directory written"                      [ -z "$(ls -A "$d/backups")" ]
check "S20 ...no nginx restart happened"                         no_restart_logged "$d"
check "S20 ...no containers were started"                       no_compose_up "$d"
check "S20 ...says nothing was changed"                          has "$d" "Dry run finished"
check "S20 ...and does not claim to have deployed"               lacks "$d" "==> Deployed"

# --- S21: --rollback on a gated host verifies the gate (401s), not an open site
d="$WORK/s21"; new_host "$d" gated
run_deploy "$d" "$SHA_GATED"
run_deploy "$d" --rollback
check "S21 --rollback on a gated host exits 0"                  rc_is "$d" 0
check "S21 ...verifies the gated edge"                          has "$d" "edge is gated after rollback, as nginx.conf declares"

# --- S22: a half-gated config on disk still needs CONFIRM_PUBLIC to open the site
d="$WORK/s22"; new_host "$d" gated
cp "$PARTIAL_CONF" "$d/app/nginx/nginx.conf"; cp "$PARTIAL_CONF" "$d/state/live_nginx.conf"
run_deploy "$d" "$SHA_OPEN"
check "S22 half-gated on disk -> open, no CONFIRM_PUBLIC: refused" rc_is "$d" 1
check "S22 ...says it would publish the site"                   has "$d" "PUBLISHES THE SITE"
check "S22 ...refused before touching the checkout"             lacks "$d" "Sync checkout to"

# --- S23: nginx still gates the site, but the file on disk is open: refuse
d="$WORK/s23"; new_host "$d" open
cp "$GATED_CONF" "$d/state/live_nginx.conf"
run_deploy "$d" "$SHA_OPEN2"
check "S23 disk open but live gated: refused"                   rc_is "$d" 1
check "S23 ...names the disagreement"                           has "$d" "the live edge asks for a password"
check "S23 ...refused before touching the checkout"             lacks "$d" "Sync checkout to"

# --- S24: the file on disk gates the site, but the live edge does not: refuse
d="$WORK/s24"; new_host "$d" gated
cp "$OPEN_CONF" "$d/state/live_nginx.conf"
CONFIRM_PUBLIC=1 run_deploy "$d" "$SHA_OPEN"
check "S24 disk gated but live open: refused"                   rc_is "$d" 1
check "S24 ...names the disagreement"                           has "$d" "but the live edge answers HTTP 200"
check "S24 ...refused before touching the checkout"             lacks "$d" "Sync checkout to"

# --- S25: the trap's own `docker compose up` fails: nginx is restarted anyway
d="$WORK/s25"; new_host "$d" gated
CONFIRM_PUBLIC=1 FAULT_EDGE=prompt_health FAULT_UP_SECOND=1 run_deploy "$d" "$SHA_OPEN"
check "S25 verify fails, then the trap's up fails: exits non-zero" rc_is "$d" 1
check "S25 ...the live edge is gated again regardless"          live_is_gated "$d"
check "S25 ...and the trap says the stack revert failed"        has "$d" "stack revert failed"

# --- S26: a gated target on a host whose password file is gone is refused
d="$WORK/s26"; new_host "$d" open
rm -f "$d/app/nginx/ssl/.htpasswd"
run_deploy "$d" "$SHA_GATED"
check "S26 gated target, no .htpasswd: exits non-zero"          rc_is "$d" 1
check "S26 ...says the password file is missing"                has "$d" ".htpasswd vanished"
check "S26 ...and the trap kept the site open, as it was"       live_is_open "$d"

# --- S27: a host without its TLS certificate is refused
d="$WORK/s27"; new_host "$d" open
rm -f "$d/app/nginx/ssl/cert.pem"
run_deploy "$d" "$SHA_OPEN2"
check "S27 no cert.pem: exits non-zero"                         rc_is "$d" 1
check "S27 ...says the certificate is missing"                  has "$d" "cert.pem vanished"

# --- S28: a target whose nginx.conf is empty is refused
d="$WORK/s28"; new_host "$d" open
( cd "$d/seed" && : > nginx/nginx.conf && git add -A && git commit -qm empty && git push -q "$d/origin.git" main )
SHA_EMPTY="$(git -C "$d/seed" rev-parse HEAD)"
run_deploy "$d" "$SHA_EMPTY"
check "S28 empty target nginx.conf: exits non-zero"             rc_is "$d" 1
check "S28 ...says it is empty"                                 has "$d" "nginx/nginx.conf is empty"
check "S28 ...refused before touching the checkout"             lacks "$d" "Sync checkout to"

# --- S29: a target that TRACKS .env is refused, even with a large tree listing
#     (the old printf | grep -q check missed this above ~70-128 KiB of listing)
d="$WORK/s29"; new_host "$d" open
( cd "$d/seed" && cp "$OPEN_CONF" nginx/nginx.conf && mkdir -p bulk && i=0 && while [ "$i" -lt 2500 ]; do
    : > "bulk/padding-file-with-a-deliberately-long-name-$(printf '%05d' "$i").txt"; i=$((i + 1)); done
  echo "SECRET_KEY=from-the-repo" > .env && git add -A && git add -f .env && git commit -qm tracks-env \
  && git push -q "$d/origin.git" main )
SHA_ENV="$(git -C "$d/seed" rev-parse HEAD)"
LISTING_BYTES="$(git -C "$d/seed" ls-tree -r --name-only "$SHA_ENV" | wc -c | tr -d ' ')"
run_deploy "$d" "$SHA_ENV"
check "S29 target tracking .env (listing $LISTING_BYTES bytes): refused" rc_is "$d" 1
check "S29 ...names .env"                                       has "$d" "TRACKS host-only secret path(s): .env"
check "S29 ...the host .env is untouched"                       env_is_original "$d"
check "S29 ...refused before touching the checkout"             lacks "$d" "Sync checkout to"

if [ -z "${SKIP_SIGNALS:-}" ]; then
# --- S30: Ctrl-C during the image pull, output piped through tee: fully reverted
d="$WORK/s30"; new_host "$d" gated
SLOW_PULL=8 CONFIRM_PUBLIC=1 sig_run "$d" INT "Pull images for" tee "$SHA_OPEN"
check "S30 [SIGINT in pull, tee] checkout back on the gated commit" head_is "$d" "$SHA_GATED"
check "S30 ...nginx.conf on disk gated"                         conf_is "$d" gated
check "S30 ...live edge gated"                                  live_is_gated "$d"
check "S30 ...:1.0.0 back on the previous build"                tag_is "$d" "$SHA_GATED"

# --- S31: SSH hangup after the open config went live, output piped through tee
d="$WORK/s31"; new_host "$d" gated
SLOW_EXEC=2 CONFIRM_PUBLIC=1 sig_run "$d" HUP "waiting for backend" tee "$SHA_OPEN"
# SIGHUP is ignored, so the deploy runs on and finishes; what must never happen is a
# half state. Either it completed (open everywhere) or it reverted (gated everywhere).
if live_is_open "$d" && conf_is "$d" open && head_is "$d" "$SHA_OPEN"; then s31=completed
elif live_is_gated "$d" && conf_is "$d" gated && head_is "$d" "$SHA_GATED"; then s31=reverted
else s31=HALF; fi
check "S31 [SIGHUP after nginx restart, tee] completed or reverted, never half ($s31)" [ "$s31" != HALF ]

# --- S32: SIGTERM during the pull, output to a file: fully reverted
d="$WORK/s32"; new_host "$d" gated
SLOW_PULL=8 CONFIRM_PUBLIC=1 sig_run "$d" TERM "Pull images for" file "$SHA_OPEN"
check "S32 [SIGTERM in pull, file] checkout back on the gated commit" head_is "$d" "$SHA_GATED"
check "S32 ...nginx.conf on disk gated"                         conf_is "$d" gated
check "S32 ...live edge gated"                                  live_is_gated "$d"
# --- S36: an SSH hangup does not interrupt the deploy (output to a file): it completes
d="$WORK/s36"; new_host "$d" gated
SLOW_EXEC=2 CONFIRM_PUBLIC=1 sig_run "$d" HUP "waiting for backend" file "$SHA_OPEN"
check "S36 [SIGHUP after nginx restart, file] the deploy ran to completion" has "$d" "==> Deployed"
check "S36 ...checkout on the new commit"                       head_is "$d" "$SHA_OPEN"
check "S36 ...live edge open"                                   live_is_open "$d"
else
  echo "  (S30-S32, S36 skipped: SKIP_SIGNALS is set)"
fi

# --- S33: after --rollback the app needs a few seconds; the check waits for it
d="$WORK/s33"; new_host "$d" gated
CONFIRM_PUBLIC=1 run_deploy "$d" "$SHA_OPEN"
FAULT_EDGE=warmup run_deploy "$d" --rollback
check "S33 --rollback with a slow-starting app exits 0"         rc_is "$d" 0
check "S33 ...and verifies the open edge"                       has "$d" "edge is open after rollback, as nginx.conf declares"

# --- S34: a quoted "off" in a location is a half-gate too
d="$WORK/s34"; new_host "$d" gated
( cd "$d/seed" && cp "$QOFF_CONF" nginx/nginx.conf && git add -A && git commit -qm qoff && git push -q "$d/origin.git" main )
SHA_QOFF="$(git -C "$d/seed" rev-parse HEAD)"
run_deploy "$d" "$SHA_QOFF"
check "S34 target with auth_basic \"off\": refused"              rc_is "$d" 1
check "S34 ...as a half-gate"                                   has "$d" "HALF-GATES the site"

# --- S35: a single-quoted realm is a real gate, deployed and verified as one
d="$WORK/s35"; new_host "$d" open
( cd "$d/seed" && cp "$SQ_CONF" nginx/nginx.conf && git add -A && git commit -qm sq && git push -q "$d/origin.git" main )
SHA_SQ="$(git -C "$d/seed" rev-parse HEAD)"
run_deploy "$d" "$SHA_SQ"
check "S35 single-quoted realm: deploys"                        rc_is "$d" 0
check "S35 ...read as gated and verified with 401s"             has "$d" "edge gated: / -> 401"

# --- S37: a checkout that loses .env, then an abort: the trap puts .env back
d="$WORK/s37"; new_host "$d" gated
cat > "$d/app/.git/hooks/post-checkout" <<HOOK
#!/bin/sh
# simulate a target whose checkout removes the host's .env
[ "\$(git rev-parse HEAD)" = "$SHA_OPEN" ] && rm -f .env
exit 0
HOOK
chmod +x "$d/app/.git/hooks/post-checkout"
CONFIRM_PUBLIC=1 FAULT_NGINX_T=1 run_deploy "$d" "$SHA_OPEN"
check "S37 abort after the checkout lost .env: exits non-zero"  rc_is "$d" 1
check "S37 ...the trap restored .env from the backup"           env_is_original "$d"
check "S37 ...and says so"                                      has "$d" "restored .env from backup"

echo
echo "deploy harness: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
