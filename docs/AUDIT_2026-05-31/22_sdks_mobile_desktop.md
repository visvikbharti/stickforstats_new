# Audit: SDKs, Browser/Jupyter Extensions, Mobile, Desktop
Date: 2026-05-31
Auditor: automated subagent (skeptical senior auditor)
Repo HEAD: 475fb7bd3cffcb0d2edb64940e55de9834c7d209 (branch main)

This report establishes ground truth from the source code, then maps it against
MEMORY.md / audit-brief / README / paper claims. Every finding cites file:line
evidence I actually observed.

---

## A. Ground truth — what this subsystem really is

Five client/edge artifacts: `sdk/python`, `sdk/r`, `sdk/browser-extension`,
`sdk/jupyter`, plus a duplicate `extensions/jupyter`, a React Native `mobile/`,
and a Tauri `desktop/`.

### Python SDK (`sdk/python`)
- src-layout hatchling package `stickforstats` v0.2.0, `requires-python = ">=3.8"`.
- Real modules: `client.py` (220 LOC httpx client), `stats.py`, `categorical.py`,
  `nonparametric.py`, `power.py`, `autonomous.py`, `manuscript.py`, `platform.py`,
  `models.py` (pydantic v2), `exceptions.py`, `quick.py`, `cli.py` (367 LOC, click+rich).
- It is a THIN HTTP CLIENT: it does NO local statistics — every method POSTs to a
  backend route and validates the JSON into a pydantic model. The 198 routes it
  targets all exist in `backend/api/v1/urls.py` (verified: 198 `path()` entries).
- API key handling is sound: masked in `__repr__` (client.py:216) and in the CLI
  config table (cli.py:142); supports `Authorization: Token` and `X-API-Key`.
- NO `tests/` directory exists, yet `pyproject.toml:66` sets `testpaths=["tests"]`.

### R SDK (`sdk/r`)
- DESCRIPTION/NAMESPACE/LICENSE present; R/ sources present; `man/` holds only a
  `README.md` (no `.Rd` help files) → `R CMD check` cannot pass cleanly.

### Jupyter (`sdk/jupyter` + `extensions/jupyter`)
- BOTH declare distribution name `stickforstats-jupyter` (sdk = v0.2.0,
  extensions = v0.1.0) and both package import name `stickforstats_jupyter`.
  Real PyPI name + import collision. `sdk/jupyter` is fuller (init/display/magics/
  widgets); `extensions/jupyter` is a stub (init/magics only, depends on ipywidgets).

### Browser extension (`sdk/browser-extension`)
- Real Manifest V3 extension; 18.9 KB content.js; all 3 icons present.

### Mobile (`mobile/`)
- React Native + react-navigation. HomeScreen advertises 6 features; the navigator
  wires 5 of them (SmartAnalysis, PaperCheck, GuardianCheck, Certification, Learn)
  all to the SAME `QuickAnalysisScreen` component.

### Desktop (`desktop/`)
- Tauri 1.x webview wrapper around the React frontend. `main.rs` defines exactly
  4 trivial `#[tauri::command]`s. `tauri.conf.json` references icon files that do
  not exist (no `src-tauri/icons/` dir at all) → cannot bundle.

---

## B. Findings

### F1 — [medium, doc_mismatch] MEMORY wrong about Python SDK path, layout, Python floor
- claim: "`sdk/python/stickforstats/` … needs Python 3.10+."
- reality: package is at `sdk/python/src/stickforstats/`; `pyproject.toml:11`
  `requires-python = ">=3.8"`, classifiers list 3.8/3.9 (`pyproject.toml:21-22`).
- evidence: `sdk/python/pyproject.toml:6-7,11,21-22,55-56`.

### F2 — [high, missing_test] Python SDK declares tests but ships none
- `sdk/python/pyproject.toml:66` `testpaths = ["tests"]` but no `tests/` dir exists
  (`find sdk/python` shows only `src/`, pyproject, README, caches). pytest collects 0.
- recommendation: add httpx-MockTransport tests against the 198-route contract.

### F3 — [high, stub_vs_claim] Duplicate, PyPI-name-colliding Jupyter packages
- `sdk/jupyter/pyproject.toml:6-7` name=`stickforstats-jupyter` v0.2.0;
  `extensions/jupyter/pyproject.toml:6-7` name=`stickforstats-jupyter` v0.1.0.
  Both build import `stickforstats_jupyter`. The `extensions/` one is a stub
  (init+magics only, deps `ipywidgets>=7.0`); `sdk/` one has display+widgets too.
- recommendation: keep `sdk/jupyter`, delete/rename `extensions/jupyter`.

### F4 — [high, bug] Desktop cannot build — referenced icons do not exist
- `desktop/src-tauri/tauri.conf.json:68-74` lists bundle icons
  `icons/32x32.png, icons/128x128.png, icons/128x128@2x.png, icons/icon.icns, icons/icon.ico`,
  but there is NO `desktop/src-tauri/icons/` directory and no image files anywhere
  under `desktop/` (full `find` returns only 6 source files). Tauri's bundler fails
  without these. MEMORY claim "icons empty → cannot build" CONFIRMED (stronger: dir absent).

### F5 — [high, bug] Mobile: 5 of 6 advertised features route to QuickAnalysisScreen
- `mobile/src/navigation/AppNavigator.tsx:53-57` registers `SmartAnalysis`,
  `PaperCheck`, `GuardianCheck`, `Certification`, `Learn` all with
  `component={QuickAnalysisScreen}`. `HomeScreen.tsx:6-13` advertises all six as
  distinct features ("Smart Analysis … ask in plain English", "Paper Quality Check
  … SQS scoring", "Certification … Earn your analyst credential", etc.). Tapping any
  of the five opens the t-test/ANOVA quick-analysis screen, not the advertised
  feature. MEMORY claim CONFIRMED.
- evidence: AppNavigator.tsx:53-57; HomeScreen.tsx:6-13,31.

### F6 — [medium, bug] Desktop Tauri allowlist is broad; updater enabled with empty pubkey
- `tauri.conf.json:37-41` `http.all=true` with `request=true`;
  `:32-36` `clipboard.all=true` (read+write); `:20-24` `dialog.all=true`.
  `:97-104` `updater.active=true` pointing at `https://releases.stickforstats.com/...`
  with `"pubkey": ""` (empty). An empty updater pubkey disables signature
  verification of update payloads (Tauri requires a pubkey to verify updates); an
  active updater with no pubkey + a non-existent endpoint is both broken and a
  supply-chain risk if the endpoint ever resolves. `bundle.macOS.signingIdentity`
  and `windows.certificateThumbprint` are null (unsigned).
- recommendation: set a real updater pubkey or disable the updater; tighten http/
  clipboard allowlist to the minimum; configure code signing before distribution.

### F7 — [medium, doc_mismatch] Mobile HomeScreen hardcodes stale platform stats
- `mobile/src/HomeScreen.tsx:53` displays "188 API Endpoints" with a green check;
  MEMORY/README/paper claim 198. `:57` "10 Languages" (docs say 16 dirs / 10 full).
  These are hardcoded UI literals, not fetched — they will always drift from reality.
- evidence: HomeScreen.tsx:52-58.

### F8 — [medium, quality] R package `man/` has no `.Rd` → R CMD check fails
- `sdk/r/man/` contains only `README.md`; NAMESPACE exports objects with no docs.
- recommendation: roxygen2 `devtools::document()`, pin `Imports:`, CI `R CMD check --as-cran`.

### F9 — [low, quality] Build/cache artifacts committed in Python SDK
- `sdk/python/.ruff_cache/...` and `sdk/python/src/stickforstats/__pycache__/*.cpython-39.pyc`
  are tracked. gitignore + `git rm --cached`.

### F10 — [info, verified] Browser extension is a real MV3 extension with icons present
- `sdk/browser-extension/manifest.json` (883 B) + content.js (18,966 B) + background.js
  + popup/options + `icons/{icon16,icon48,icon128}.png` all present. A `service-worker.js`
  also exists in the tree; the MV3 `background.service_worker` reference should be
  reconciled (background.js vs service-worker.js) to avoid a dead file. Full DOM-sink /
  host_permissions security pass recommended but no exploit confirmed.

### F11 — [info, verified] Python SDK does NO local stats; "50-digit precision" is the server's job
- Every SDK method (e.g. stats.py:77, categorical.py:47, nonparametric.py:57,57)
  just POSTs and validates JSON. categorical.py:17 and power.py:17 docstrings say
  "50-digit precision" — that precision lives in the backend, not the SDK; the SDK
  cannot itself guarantee it. Not a bug, but the docstring could mislead. No
  client-side math errors are possible because there is no client-side math.

### F12 — [info, verified] Python SDK auth/secret handling is sound
- API key masked in `client.py:216` repr and CLI config table `cli.py:142`; never
  logged. Two auth schemes handled correctly (client.py:73-77). Good.

---

## C. Claims-vs-reality table

| # | Claim | Reality | Verdict |
|---|---|---|---|
| 1 | Python SDK at `sdk/python/stickforstats/`, needs 3.10+ | `src/stickforstats/`, requires `>=3.8` | refuted |
| 2 | Python SDK has no tests dir | confirmed; `testpaths` dangles | confirmed |
| 3 | R SDK: no man/, will fail R CMD check | man/ has only README (no .Rd); fails check | partial/confirmed-outcome |
| 4 | Two same-named Jupyter packages collide on PyPI | both dist name `stickforstats-jupyter` | confirmed |
| 5 | Browser extension real Manifest V3 | manifest + 18.9KB content.js + icons | confirmed |
| 6 | Desktop cannot build (icons empty) | icons dir absent; tauri.conf refs missing icons | confirmed |
| 7 | Desktop = webview wrapper, 4 trivial commands | main.rs has exactly 4 `#[tauri::command]` | confirmed |
| 8 | Mobile: 5 of 6 screens route to QuickAnalysisScreen | AppNavigator.tsx:53-57 confirm | confirmed |

---

## D. Prioritized recommendations toward world-class
1. (F3) Resolve Jupyter dist-name collision before any PyPI publish.
2. (F5) Implement the 5 mobile screens or stop advertising them as distinct features.
3. (F4) Add desktop Tauri icons + prove `cargo tauri build` in CI.
4. (F2) Ship real Python SDK tests; wire into CI; remove dangling testpaths.
5. (F6) Fix the desktop updater (real pubkey or disable) and tighten the allowlist; configure signing.
6. (F8) roxygen-document the R package; CI `R CMD check --as-cran`.
7. (F7/F1/F9) Stop hardcoding platform stats in mobile UI; fix MEMORY path/version; gitignore caches.
8. (F10) Complete a browser-extension security pass and reconcile background.js vs service-worker.js.
