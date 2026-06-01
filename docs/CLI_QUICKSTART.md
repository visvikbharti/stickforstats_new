# `sfs` — StickForStats Command-Line Interface

**Created:** 2026-06-01 · **Audience:** beta testers and power users who prefer the terminal.

`sfs` is the official command-line client for StickForStats. It wraps the same backend API the
web app uses, so every result comes from the identical statistical engine (Guardian assumption
checks, high-precision point estimates, manuscript verification).

> **Important — it is a *client*, not a standalone calculator.** `sfs` does **not** compute
> statistics locally; every command calls a running StickForStats API over HTTPS. You need a
> reachable API URL and (for anything beyond local dev) an API key. If you're running the beta
> stack yourself, point it at your deployment; otherwise ask whoever runs the instance for the
> base URL + key.

---

## 1. Install

The CLI ships inside the Python SDK, behind the `cli` extra (it pulls in `click` + `rich`):

```bash
pip install "stickforstats[cli]"      # once published to PyPI
```

Until the PyPI release lands, install from source (Python ≥ 3.8):

```bash
git clone https://github.com/visvikbharti/stickforstats_new.git
pip install -e "stickforstats_new/sdk/python[cli]"
```

Verify:

```bash
sfs --version
sfs --help
```

If you installed the SDK **without** the `cli` extra, `sfs` will tell you exactly what to do:
`CLI dependencies are not installed. Install them with: pip install stickforstats[cli]`.

---

## 2. Configure the connection (once)

```bash
sfs config --base-url https://your-instance.example.com/api/v1 --api-key YOUR_TOKEN
sfs config --show     # prints current settings; the API key is masked (abcd...wxyz)
```

Settings are saved to `~/.stickforstats/config.json`. The default base URL is
`http://localhost:8000/api/v1` (handy when running the backend locally), so for local dev you can
skip `--base-url` entirely. You can also override per-invocation defaults via `--timeout`.

---

## 3. Commands

All commands read tabular data from a **CSV**, **TSV**, or **JSON** file:
- CSV/TSV: first row = column headers; values are parsed as floats (non-numeric → `NaN`).
- JSON: a column-oriented object, e.g. `{"group_a": [1,2,3], "group_b": [4,5,6]}`.

Results print as a syntax-highlighted JSON panel (or a table for `config`/`usage`).

### `sfs analyze` — run a statistical test
```bash
# two-sample t-test across two named group columns
sfs analyze -f data.csv -t ttest --groups control,treatment --alpha 0.05

# one-way ANOVA over all numeric columns
sfs analyze -f data.csv -t anova

# correlation between the first two columns (pearson|spearman|…)
sfs analyze -f data.csv -t correlation --method pearson

# multiple regression
sfs analyze -f data.csv -t regression --dependent score --predictors age,dose,bmi

# descriptive summary
sfs analyze -f data.csv -t descriptive
```
`--test` accepts: `ttest`, `anova`, `correlation`, `regression`, `descriptive`. For `regression`,
`--dependent` is required; if `--predictors` is omitted, every other column is used as a predictor.

> Tests run through the platform's **Guardian** layer, so assumption violations (normality,
> variance homogeneity, independence, …) surface in the result rather than being silently ignored.

### `sfs profile` — smart-profile a dataset
```bash
sfs profile -f data.csv
```
Runs the Autonomous Intelligence Layer's profiler (data shape, types, distribution flags, and
suggested next analyses).

### `sfs query` — ask a question in plain language
```bash
sfs query "Is the treatment group different from control?" -f data.csv --alpha 0.05
```
The autonomous pipeline picks an appropriate test, runs it under Guardian, and returns a
plain-language answer alongside the numbers.

### `sfs manuscript` — verify a paper's statistics
```bash
# full statistical-correctness analysis of a manuscript
sfs manuscript -f paper.pdf --field psychology --mode analyze --alpha 0.05

# other modes:
sfs manuscript -f paper.pdf --mode parse          # extract structure only
sfs manuscript -f paper.pdf --mode claims         # pull out statistical claims
sfs manuscript -f paper.pdf --mode consistency    # check reported stats for internal consistency
```
Accepts PDF/DOCX/TeX. `--field` tunes the discipline reporting standard (e.g. `psychology`,
`medicine`, `general`). **This is the command to watch** — it's the natural fit for a
pre-submission check or a journal's CI step (verify a manuscript's reported tests/p-values before
review).

### `sfs usage` — your API usage
```bash
sfs usage
```
Shows tier, total/today request counts, and remaining quota.

---

## 4. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `CLI dependencies are not installed` | Install the extra: `pip install "stickforstats[cli]"`. |
| `Connection refused` / timeouts | Wrong/unreachable `--base-url`, or the API isn't running. Check `sfs config --show`. |
| `401 / 403` | Missing or invalid API key. Re-run `sfs config --api-key …`. |
| `Unsupported file format` | Use `.csv`, `.tsv`, or `.json`. |
| Results look like assumption warnings | That's Guardian doing its job — read the violations before trusting the test. |

---

## 5. Status (beta)

- The CLI is **lint-clean** but **not yet unit-tested** (no `tests/` in `sdk/python` as of this
  writing) — treat it as beta.
- **Not on PyPI yet** — source install only until the publish pipeline
  (`.github/workflows/publish-sdk.yml`) is run against a configured PyPI project. See that workflow's
  header for the one-time PyPI setup.
