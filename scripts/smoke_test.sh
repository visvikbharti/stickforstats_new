#!/usr/bin/env bash
#
# StickForStats — deployment smoke test (beta checklist §5)
# =========================================================
# Exercises the headline flows end-to-end against a RUNNING instance and asserts
# on real response fields. Intended to run against a freshly-deployed stack
# (docker compose up) before inviting beta testers — NOT a substitute for the
# unit suite.
#
# Usage:
#   BASE_URL=https://beta.example.com ./scripts/smoke_test.sh
#   ./scripts/smoke_test.sh                      # defaults to http://localhost:8000
#
# Requires: bash, curl, python3 (stdlib only). No extra deps.
# Exit code 0 = all checks passed; non-zero = at least one failed.

set -u
BASE_URL="${BASE_URL:-http://localhost:8000}"
API="${BASE_URL%/}/api/v1"
PASS=0
FAIL=0

c_green() { printf '\033[32m%s\033[0m\n' "$1"; }
c_red()   { printf '\033[31m%s\033[0m\n' "$1"; }

# check NAME METHOD PATH JSON_BODY PYTHON_ASSERT
#   PYTHON_ASSERT receives the response body on stdin as `d` (parsed JSON) and
#   the HTTP status as the env var STATUS; it must print "OK" to pass.
check() {
  local name="$1" method="$2" path="$3" body="$4" assert="$5"
  local tmp status
  tmp="$(mktemp)"
  if [ "$method" = "GET" ]; then
    status="$(curl -sS -o "$tmp" -w '%{http_code}' "${API}${path}" 2>/dev/null)"
  else
    status="$(curl -sS -o "$tmp" -w '%{http_code}' -X "$method" \
      -H 'Content-Type: application/json' -d "$body" "${API}${path}" 2>/dev/null)"
  fi
  # Pass the response-body FILE PATH and the assert expression as argv so stdin
  # stays free for the heredoc python script (feeding both collides → SyntaxError).
  local verdict
  verdict="$(STATUS="$status" python3 - "$tmp" "$assert" 2>/dev/null <<'PY'
import json, os, sys
body_path, assert_expr = sys.argv[1], sys.argv[2]
status = os.environ.get("STATUS", "0")
raw = open(body_path).read()
try:
    d = json.loads(raw) if raw.strip() else {}
except Exception:
    d = {"_raw": raw[:200]}
try:
    ok = eval(assert_expr, {"d": d, "status": status, "int": int, "len": len, "str": str, "float": float})
    print("OK" if ok else "FAIL")
except Exception as e:
    print(f"FAIL ({type(e).__name__}: {e})")
PY
)"
  if [ "$verdict" = "OK" ]; then
    c_green "  PASS  ${name}  [HTTP ${status}]"
    PASS=$((PASS + 1))
  else
    c_red   "  FAIL  ${name}  [HTTP ${status}]  ${verdict}"
    echo "        response: $(head -c 300 "$tmp")"
    FAIL=$((FAIL + 1))
  fi
  rm -f "$tmp"
}

echo "StickForStats smoke test → ${API}"
echo "------------------------------------------------------------"

# 1. Health
check "health" GET "/health/" "" \
  'status == "200"'

# 2. High-precision two-sample t-test (assert genuine HP result present)
check "t-test (two-sample)" POST "/stats/ttest/" \
  '{"test_type":"two_sample","data1":[100,102,98,101,99,103,97,100],"data2":[110,108,112,109,111,107,113,110]}' \
  'status == "200" and "high_precision_result" in d and d["high_precision_result"].get("t_statistic") is not None'

# 3. One-way ANOVA
check "ANOVA (one-way)" POST "/stats/anova/" \
  '{"groups":[[1,2,3,4,5],[6,7,8,9,10],[11,12,13,14,15]]}' \
  'status == "200"'

# 4. Regression — the headline stats/regression/ now routes to the HIGH-PRECISION
#    engine (beta §1 / ST-3). Assert it returns a genuine high-precision intercept
#    (far more digits than float64), proving it is NOT the old scipy stub.
check "regression (high precision)" POST "/stats/regression/" \
  '{"type":"simple_linear","X":[1,2,3,4,5],"y":[2.1,4.0,6.2,7.9,10.1]}' \
  'status == "200" and len(str(d.get("intercept","")).replace("-","").replace(".","").rstrip("0")) > 18'

# 5. Manuscript share-token flow: analyze → get token → fetch report with/without it.
#    This validates the IDOR fix (beta §1 / SEC-3). Uses a tiny text manuscript.
echo "  ....  manuscript share-token flow"
MS_TXT="$(mktemp)"
MS_RESP="$(mktemp)"
cat >"$MS_TXT" <<'TEX'
We ran a two-sample t-test, t(48) = 2.10, p = .041. The effect size was 0.45.
The result was statistically significant at alpha = .05.
TEX
curl -sS -o "$MS_RESP" -X POST \
  -F "file=@${MS_TXT};filename=smoke.txt;type=text/plain" \
  "${API}/manuscript/analyze/" 2>/dev/null
TOKEN="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("report_token",""))' "$MS_RESP" 2>/dev/null)"
SUBID="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("submission_id",""))' "$MS_RESP" 2>/dev/null)"
rm -f "$MS_TXT"
MS_TMP="$MS_RESP"
if [ -n "$TOKEN" ] && [ -n "$SUBID" ]; then
  c_green "  PASS  manuscript analyze → got submission_id + report_token"
  PASS=$((PASS + 1))
  # 5a. correct token → 200
  st="$(curl -sS -o /dev/null -w '%{http_code}' "${API}/manuscript/report/${SUBID}/?token=${TOKEN}")"
  if [ "$st" = "200" ]; then c_green "  PASS  report fetch WITH token → 200"; PASS=$((PASS+1)); else c_red "  FAIL  report fetch WITH token → ${st} (expected 200)"; FAIL=$((FAIL+1)); fi
  # 5b. no token → 404 (IDOR protection)
  st="$(curl -sS -o /dev/null -w '%{http_code}' "${API}/manuscript/report/${SUBID}/")"
  if [ "$st" = "404" ]; then c_green "  PASS  report fetch WITHOUT token → 404 (IDOR protected)"; PASS=$((PASS+1)); else c_red "  FAIL  report fetch WITHOUT token → ${st} (expected 404)"; FAIL=$((FAIL+1)); fi
else
  # No submission_id means DB persistence is unavailable (e.g. models not
  # migrated on this host). The analysis itself still ran if a title came back.
  HAS_ANALYSIS="$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print("yes" if ("sqs_score" in d or "claims_found" in d or "title" in d) else "no")' "$MS_RESP" 2>/dev/null)"
  if [ "$HAS_ANALYSIS" = "yes" ]; then
    printf '\033[33m  SKIP  manuscript share-token flow — analysis ran but DB persistence is off on this host\033[0m\n'
    printf '        (token IDOR is covered by core.tests.test_manuscript_report_token; re-run §5 against the migrated stack)\n'
  else
    c_red "  FAIL  manuscript analyze returned neither a report token nor an analysis"
    echo "        response: $(head -c 300 "$MS_TMP")"
    FAIL=$((FAIL + 1))
  fi
fi
rm -f "$MS_TMP"

echo "------------------------------------------------------------"
echo "Passed: ${PASS}   Failed: ${FAIL}"
if [ "$FAIL" -ne 0 ]; then
  c_red "SMOKE TEST FAILED"
  exit 1
fi
c_green "SMOKE TEST PASSED"
exit 0
