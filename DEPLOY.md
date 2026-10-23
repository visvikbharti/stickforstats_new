# Releasing `fix/issue-31` to production

This release removes the closed-beta password gate, so it **publishes the site**. Read the whole page once before starting.

It follows the procedure production uses today:

1. Merge to `main`.
2. CI builds and pushes images for the merge commit to GHCR.
3. On the host, run `scripts/deploy.sh <sha>`. It moves the checkout and the images to that commit together, then checks the live site.

Never hand-roll the deploy, and never `git pull` on the host (see `docs/DEPLOYMENT_RUNBOOK.md` §5).

## What changes on the server

- **Code:** the backend and frontend images built from the merge commit.
- **The password gate:** it lived in two `auth_basic` lines in `nginx/nginx.conf`.
  - The nginx container bind-mounts that file from the host checkout (`./nginx/nginx.conf:/etc/nginx/nginx.conf:ro` in `docker-compose.yml`).
  - So the gate is removed when `deploy.sh` checks out the new commit and restarts nginx. No separate edit on the server is needed.
  - The password file `nginx/ssl/.htpasswd` stays on the host, unused. Keep it until you're sure you won't need rollback B below.
- **Database:** one data migration, `core.0016_purge_imported_tables_from_sessions` (step 2g). It deletes the uploaded tables that earlier versions kept in visitors' sessions, and expired sessions. No table changes.
- **Unchanged:** no `.env` or `docker-compose.yml` changes. The beta banner and the optional login stay.
- **BMC review:** reviewers who open the live site will see this release, not v1.2.0, and won't be asked for a password. The archived v1.2.0 (Zenodo `10.5281/zenodo.21797621`) that the manuscript cites is unchanged.

**Why the script on the host can't be used as is.** The copy of `scripts/deploy.sh` on the host predates this release. It refuses any target without the gate ("If opening the beta is intentional, do it deliberately — not via this script"). The new script reads which gate state the target declares and verifies that state on the live edge. It requires `CONFIRM_PUBLIC=1` for the one deploy that removes the gate. So step 2 runs the script from the release commit itself.

## 1. Merge and wait for the images (your machine)

```bash
git push -u origin fix/issue-31
gh pr create --base main --head fix/issue-31 --title "Release: issue #31 fixes, open the site, truthful privacy page" --body "See DEPLOY.md"
gh pr checks --watch        # the 5 required checks, plus "Host secrets not tracked"
```

Merge only if every check passed:

```bash
gh pr merge --merge --admin # main requires 1 approving review; --admin is the owner override
SHA=$(gh pr view fix/issue-31 --json mergeCommit --jq .mergeCommit.oid); echo "$SHA"
```

The push to `main` starts CI: lint, tests and host-secrets, then **Docker Build**, then **Push to GHCR**.

- Wait for **Push to GHCR** to succeed on that run: `gh run list --branch main --limit 3`, then `gh run watch <run-id>`.
- Don't push anything else to `main` until it finishes. CI cancels an in-progress run for the same ref, and a cancelled run publishes no images.

## 2. Deploy (on the host)

Work inside `tmux` (or `screen`). A dropped SSH connection then cannot kill the deploy halfway: the script ignores hangups and its revert ignores Ctrl-C, but you also want to see the end of it.

```bash
ssh root@91.98.93.98
tmux new -s release        # reattach after a disconnect with: tmux attach -t release
cd /opt/stickforstats_new
SHA=<the merge commit from step 1>
```

Use bash on the host (`echo $0`), as root's shell normally is: the commands below use bash syntax.

**2a. Record what is live now.** Rollback uses this.

```bash
git status --short          # tracked host edits are backed up, then discarded by the deploy:
                            # if nginx/nginx.conf shows as modified, read `git diff nginx/nginx.conf` first
git rev-parse HEAD | tee /root/pre-release-head.txt
docker inspect -f '{{.Name}} {{index .Config.Labels "org.opencontainers.image.revision"}}' \
  stickforstats-backend stickforstats-frontend | tee -a /root/pre-release-head.txt
docker exec stickforstats-nginx grep -n auth_basic /etc/nginx/nginx.conf
docker inspect -f '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{println}}{{end}}' stickforstats-nginx
git fetch origin
git diff --stat HEAD "${SHA}" -- docker-compose.yml nginx/ monitoring/
```

- **`pre-release-head.txt`:** its first line is the host's git HEAD. The next two are the commits the running containers were built from. Rollback B uses the backend one. v1.2.0 may have gone out by the older image-only procedure, so the HEAD can be older than the code that is running. Expect the backend revision to be `b7834e3`, the v1.2.0 code commit.
- The `grep` should show the two gate lines; that's the live config.
- The `git diff --stat` lists every config file the deploy will change on this host. Expect only `nginx/nginx.conf`. If the host is still on `dd138da`, `docker-compose.yml` also gains 5 lines. Read anything else before going on.
- The mounts must include `/opt/stickforstats_new/nginx/nginx.conf -> /etc/nginx/nginx.conf`. If a different file is mounted there (for example by the untracked `docker-compose.override.yml`), the gate lives in that file. Stop: the deploy would not remove it, and its live check would fail and revert.

**2b. Back up the database.**

```bash
docker compose exec -T postgres-backup /backup.sh < /dev/null
docker compose exec -T postgres-backup sh -c 'ls -lt /backups | head -3' < /dev/null
```

**2c. Get this release's deploy script.**

```bash
git show "${SHA}:scripts/deploy.sh" > "/root/deploy-${SHA:0:7}.sh"
```

**2d. Dry run.** Run the script as a file with stdin closed, never piped into `ssh 'bash -s'`.

```bash
DRY_RUN=1 CONFIRM_PUBLIC=1 bash "/root/deploy-${SHA:0:7}.sh" "$SHA" < /dev/null
```

- It should end with `Dry run finished for <sha>: nothing was changed`.
- It runs only the pre-flight checks. That includes asking the live edge whether it is gated: it must answer 401, matching the gated `nginx.conf` on disk.
- If it stops, read why before going on.

**2e. Deploy.** Write the output to a log file and watch it from a second tmux pane (`Ctrl-b "`, then `tail -f /root/deploy-<sha7>.log`).

```bash
CONFIRM_PUBLIC=1 bash "/root/deploy-${SHA:0:7}.sh" "$SHA" < /dev/null > "/root/deploy-${SHA:0:7}.log" 2>&1
echo "deploy exit: $?"; tail -30 "/root/deploy-${SHA:0:7}.log"
```

Don't pipe the deploy through `tee`. A Ctrl-C or hangup kills the `tee` too. Before this release, the script's revert then died on its first write to the dead pipe (measured: 0 of 8 interrupted runs reverted). The revert now ignores signals and broken pipes, but a log file is still the safe way.

What a good run prints:

- `password gate: on disk now gated, target open`, then `! this deploy REMOVES the password gate (CONFIRM_PUBLIC=1 given)`.
- `edge open: / -> 200`, `edge open: /modules/multiplicity -> 200`, `edge open: /api/v1/health/ -> 200` and `edge open: /static/js/main.<hash>.js -> 200`.
- `backend healthy, database connected`.
- `running backend self-reports revision <sha>`.
- `==> Deployed <sha>`, with exit 0.

If anything fails mid-way, or the live checks fail, the script reverts by itself. It restores the checkout, the pre-deploy `nginx.conf` from its backup, `.env` and the images, then waits for the edge and checks it again. Look for `verified: edge is gated after revert`. While reverting it ignores Ctrl-C; if the revert itself hangs, stop it with `kill` from a second pane.

**2f. Confirm every container runs the release.**

```bash
docker inspect -f '{{.Name}} {{index .Config.Labels "org.opencontainers.image.revision"}}' \
  stickforstats-frontend stickforstats-celery stickforstats-celery-beat   # each = $SHA
```

The script checks only the backend's revision. The worker and the scheduler run the backend image too; the scheduler runs the daily clean-up of expired sessions (§5). Skip `collectstatic`: it fails on the root-owned `backend-static` volume and isn't needed.

**2g. Apply the data migration.** It changes no tables, only deletes session rows, so it is safe while the site is live.

```bash
docker compose exec -T backend python manage.py migrate --plan < /dev/null   # Planned operations: core.0016_purge_imported_tables_from_sessions
docker compose exec -T backend python manage.py migrate < /dev/null          # Applying core.0016_purge_imported_tables_from_sessions... OK
docker compose exec -T backend python manage.py migrate --plan < /dev/null   # No planned migration operations.
```

- If the first command lists anything else, stop and read it: before this release production should be at `core.0015`.
- It deletes every session holding a table from the old data import, and every expired session. A visitor signed in through such a session is signed out; the site's own sign-in uses tokens, not sessions.

## 3. Check the live site

These come from any machine, with no credentials. For checks 3–10, each expected value was produced by running the same request against this release locally; checks 1–2 can only be run against the live site.

The backend allows 20 API requests a minute per IP address to anonymous visitors, so run the checks in one go rather than repeatedly.

```bash
B=https://stickforstats.com

# 1. Nothing asks for a password. Expect 200 on every line, then 0.
for p in / /privacy /modules/anova /genomics-analysis /api/v1/health/; do
  printf '%-20s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' "$B$p")"; done
curl -sI "$B/" | grep -ci 'www-authenticate'

# 2. The new frontend is live. Expect 1 (this string is on the new Privacy & data page).
JS=$(curl -s "$B/" | grep -oE '/static/js/main\.[0-9a-f]+\.js' | head -1)
curl -s "$B$JS" | grep -c 'Most tools keep nothing'

# 3. Guardian answers anonymously. Expect: 1.0 True
curl -s -X POST "$B/api/guardian/check/" -H 'Content-Type: application/json' \
  -d '{"data": [[9.8,10.1,10.4,9.6,10.0,10.3,9.9,10.2,9.7,10.5,10.0,9.9],[10.9,11.2,11.0,10.7,11.4,11.1,10.8,11.3,11.0,10.9,11.2,11.1]], "test_type": "t_test"}' \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["confidence_score"], d["can_proceed"])'

# 4. An unknown test type is still refused (v1.2.0 behaviour). Expect 400.
curl -s -o /dev/null -w '%{http_code}\n' -X POST "$B/api/guardian/check/" -H 'Content-Type: application/json' \
  -d '{"data": [[1,2,3],[4,5,6]], "test_type": "no_such_test"}'

# 5. The t-test still reports its CI and effect size (v1.2.0 behaviour). Expect True.
curl -s -X POST "$B/api/v1/stats/ttest/" -H 'Content-Type: application/json' \
  -d '{"data1":[2,2,3,3,3,4,4,5,6,9,14,22,48,95],"data2":[3,3,4,4,4,5,5,6,8,12,19,30,60,110],"test_type":"two_sample"}' \
  | python3 -c 'import json,sys; h=json.load(sys.stdin)["high_precision_result"]; print(all(k in h for k in ("mean_difference","ci_lower","ci_upper","effect_size")))'

# 6. Genomics on log2 input reports the difference of means (#31 item 1).
#    Expect: log2 {'UP4': 2.0, 'FLAT': 0.0}
curl -s -X POST "$B/api/v1/genomics/differential-expression/" -H 'Content-Type: application/json' \
  -d '{"csv_data":"gene,c1,c2,c3,t1,t2,t3\nUP4,5.0,5.2,4.8,7.0,7.2,6.8\nFLAT,3.0,3.1,2.9,3.0,3.1,2.9","sample_groups":["control","control","control","treatment","treatment","treatment"],"input_scale":"log2"}' \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["summary"]["input_scale"], {g["gene_name"]: g["log2_fold_change"] for g in d["gene_results"]})'

# 7. The corrected privacy information, and the rate limiter.
#    Expect: "Not stored by most tools", then "X-RateLimit-Limit: 20".
curl -s "$B/api/v1/privacy/info/" | python3 -c 'import json,sys; print(json.load(sys.stdin)["purposes"][0]["retention"][:24])'
curl -s -D - -o /dev/null "$B/api/v1/privacy/info/" | grep -i '^x-ratelimit-limit'

# 8. Saved reports and DOE designs are no longer routed. Expect 404 on both lines.
for p in /api/v1/reports/ /api/v1/doe-analysis/experiment-designs/; do
  curl -s -o /dev/null -w '%{http_code}\n' "$B$p"; done

# 9. The data import keeps nothing, so it sets no session cookie (v1.2.0's did). Expect 200, then 0.
printf 'a,b\n1,2\n3,4\n' > /tmp/sfs-check.csv
curl -s -D /tmp/sfs-check.hdr -o /dev/null -w '%{http_code}\n' -F file=@/tmp/sfs-check.csv "$B/api/v1/data/import/"
grep -ci '^set-cookie: sessionid' /tmp/sfs-check.hdr

# 10. PCA projects and their records need sign-in (v1.2.0 answered 500). Expect 401.
curl -s -o /dev/null -w '%{http_code}\n' "$B/api/v1/pca-analysis/projects/"
```

In a private browser window (hard-refresh if you see the old app; it has a service worker):

- **Landing page:** `https://stickforstats.com` opens with no password dialog. The beta banner is there, and the page says "9 assumption validators". Its Data Privacy note links to the Privacy & data page.
- **Privacy & data page:** `/privacy` starts "StickForStats is in beta and open to everyone".
- **`/modules/anova`:** on the Analysis tab, enter three groups. The Guardian chip shows a percentage such as 72% or 100%, not 1%.
- **`/pca-analysis`:** an information notice, "Running PCA on your own data isn't available yet", above the introduction, and no upload step. Its button opens the PCA learning hub (`/pca-learn`).
- **Optional login:** if you have an account, sign in and open `/privacy-settings`.

## 4. Roll back to v1.2.0

Pick one.

**A. Code only, site stays public (fastest).**

```bash
cd /opt/stickforstats_new
./scripts/deploy.sh --rollback < /dev/null
```

- This puts back the images that were live before the release (tagged `rollback-prev` when the deploy started). It waits for the app, then confirms the edge still matches the on-disk `nginx.conf`, which is open: the script prints `the site stays open`.
- **Only until the next deploy:** the next deploy re-arms `rollback-prev` with this release's images, and A would then restore nothing older.
- **Caution:** v1.2.0's own pages say "closed beta", "All data processed locally" and "HIPAA compliance". Those claims would then be public. Prefer B unless you're rolling back for minutes.

**B. v1.2.0 exactly as it was: code, config and the password gate.**

```bash
cd /opt/stickforstats_new
PREV=$(awk '$1=="/stickforstats-backend"{print $2}' /root/pre-release-head.txt)   # the code that was running (2a)
echo "$PREV"                                 # expect b7834e3..., the v1.2.0 code commit
docker manifest inspect "ghcr.io/visvikbharti/stickforstats_new/backend:${PREV}" > /dev/null && echo "images exist"
ls -l nginx/ssl/.htpasswd                    # must exist, or the gated site starts but nobody can sign in
./scripts/deploy.sh "$PREV" < /dev/null > "/root/rollback-${PREV:0:7}.log" 2>&1; echo "exit: $?"
```

- **Use the backend revision, not the first line of the file.** The host's git HEAD may be older than v1.2.0, and deploying it would serve pre-v1.2.0 code during the BMC review.
- **What the script does:** it checks out `$PREV` (the gated `nginx.conf`) and pulls `$PREV`'s images from GHCR. It then verifies `edge gated: ... -> 401` on `/`, `/api/`, health, `/static/js/` and an app route. Expect `password gate: on disk now open, target gated`.
- **Why the password file matters:** measured with nginx 1.31.2, a gated config whose password file is missing still starts. Anonymous requests then get 401, and correct credentials get 403.
- **Or do A, then restore the gate by hand:**

  ```bash
  cp -a /root/deploy-backup-<stamp>/nginx.conf nginx/nginx.conf
  docker compose restart nginx
  curl -s -o /dev/null -w '%{http_code}\n' https://stickforstats.com/    # 401
  ```

- After B, the checkout's own `scripts/deploy.sh` is v1.2.0's gate-only script again. To re-release later, repeat step 2c.

**Database.** This release's one migration changes no tables, so nothing needs undoing: v1.2.0's code runs on the migrated database (checked: `migrate --plan` reports no planned operations and `check` finds no issues). The deleted sessions don't come back, but v1.2.0's data import saves uploaded tables in sessions again. Re-releasing doesn't delete those, because the migration counts as applied. So after a later re-release, run it again: `docker compose exec -T backend python manage.py migrate core 0015 < /dev/null` (unapplying it changes nothing), then `... migrate core 0016 < /dev/null`. The pre-release backup from 2b is in the `postgres-backup` volume. Restore steps are in `docs/DEPLOYMENT_RUNBOOK.md` §5 "Backups".

## 5. Afterwards

- **The password file and accounts.** `nginx/ssl/.htpasswd`, its three accounts (`beta`, `bmc-reviewer`, and the shared account) and `/root/stickforstats-beta-access.txt` no longer protect anything. Archive them off the server once rollback B is no longer needed. Revoking `bmc-reviewer` is moot.
- **Abuse limits.** Before this release, a password stood in front of every request. Now only the limits stand:
  - nginx allows 100 requests a second per IP to `/api/`, with a burst of 50.
  - The backend allows 20 API requests a minute per IP to anonymous visitors. It reads the address from the first `X-Forwarded-For` entry, which nginx now sets to the address it saw (`$remote_addr`). Before this release nginx appended to the client's own header, so a forged first entry escaped the limit (executed: 0 of 25 requests limited).
  - Request bodies are capped at 50 MB at the edge. Django rejects JSON and form bodies over 25 MB, and the manuscript tools reject files over 25 MB.
  - For the first days, watch `docker logs --since 1h stickforstats-nginx | grep -cE '" (429|503) '`. The backend's limiter answers 429; nginx's own answers 503.
- **Expired sessions.** `cleanup_expired_sessions` now deletes them every day at 03:00 UTC; before this release nothing did.
  - celery-beat runs the task in its own process: `CELERY_TASK_ALWAYS_EAGER` is unset in its container, and the settings default it to True. Don't change that on its own: the task is routed to the `default` queue, which the worker, started without `-Q`, doesn't consume.
  - The day after the release, check that it ran: `docker logs --since 26h stickforstats-celery-beat 2>&1 | grep 'Session cleanup'` should show `Session cleanup: deleted <n> expired browser sessions; ...`. If nothing shows, check that the scheduler runs: `docker compose ps celery-beat`.
- **Internal ports.** `docker-compose.yml` publishes the backend (8000), Postgres (5432), Redis (6379), Prometheus (9090) and Grafana (3000) on all interfaces unless `.env` binds them to `127.0.0.1` (`docs/DEPLOYMENT_RUNBOOK.md` §3.5). A directly reachable backend port bypasses nginx and its limits. Check from your own machine, before or right after the release; every line should fail or time out:

  ```bash
  for p in 8000 5432 6379 9090 3000; do nc -vz -w 3 stickforstats.com "$p"; done
  ```
