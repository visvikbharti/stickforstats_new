# StickForStats Python SDK

Python client for the **StickForStats** statistical analysis platform -- featuring
the Guardian Statistical Protection System, Autonomous Intelligence Layer, and
Manuscript Review Engine.

This is a **thin client**: it talks to a running StickForStats backend over its
REST API; it does not perform the statistics locally.

## Requirements

- **Python 3.10+**
- A reachable **StickForStats backend** — either a local deployment (the project's
  `docker compose up`) or a hosted instance — plus an API key for authenticated endpoints.

## Installation

```bash
pip install stickforstats
```

With CLI support (adds the `sfs` command):

```bash
pip install stickforstats[cli]
```

## Configuration

Point the client at your backend via arguments or environment variables:

```bash
export STICKFORSTATS_BASE_URL="http://localhost:8000/api/v1"
export STICKFORSTATS_API_KEY="your-api-key"
```

The client retries transient failures (connection errors, timeouts, HTTP
429/502/503/504) with exponential backoff, and raises typed exceptions
(`AuthenticationError`, `ValidationError`, `RateLimitError`, `ConnectionError`, ...)
all deriving from `StickForStatsError`.

## Quick Start

```python
from stickforstats import StickForStats

client = StickForStats(
    base_url="http://localhost:8000/api/v1",
    api_key="your-api-key",
)

# Run a t-test with Guardian protection
result = client.stats.ttest(
    data={"control": [23, 25, 28, 22, 27], "treatment": [30, 33, 29, 35, 31]},
    alpha=0.05,
)
print(f"t = {result.t_statistic}, p = {result.p_value}")
if result.guardian and not result.guardian.passed:
    print("Guardian violations:", result.guardian.violations)
```

Use as a context manager to ensure connections are cleaned up:

```python
with StickForStats(api_key="tok_abc123") as sfs:
    desc = sfs.stats.descriptive(data=[10, 20, 30, 40, 50])
    print(f"Mean: {desc.mean}, SD: {desc.std_dev}")
```

## Statistical Tests

### t-Test

```python
result = client.stats.ttest(
    data={"before": [5.1, 4.9, 5.3], "after": [6.2, 5.8, 6.5]},
    paired=True,
    alpha=0.05,
)
```

### ANOVA

```python
result = client.stats.anova(
    data={
        "group_a": [4.1, 3.9, 4.5, 4.2],
        "group_b": [5.2, 5.5, 5.1, 5.3],
        "group_c": [6.0, 6.3, 5.8, 6.1],
    },
    post_hoc="tukey",
)
```

### Correlation

```python
result = client.stats.correlation(
    x=[1, 2, 3, 4, 5],
    y=[2, 4, 5, 4, 5],
    method="pearson",
)
print(f"r = {result.correlation}, p = {result.p_value}")
```

### Regression

```python
result = client.stats.regression(
    data={"x1": [1, 2, 3], "x2": [4, 5, 6], "y": [7, 8, 9]},
    dependent="y",
    predictors=["x1", "x2"],
    regression_type="linear",
)
print(f"R-squared = {result.r_squared}")
```

### Descriptive Statistics

```python
result = client.stats.descriptive(data=[12, 15, 18, 22, 25, 30])
print(f"Mean: {result.mean}, Median: {result.median}, SD: {result.std_dev}")
```

## Power Analysis

```python
# Determine required sample size
result = client.power.ttest(effect_size=0.5, alpha=0.05, power=0.80)
print(f"Required n = {result.sample_size}")

# Comprehensive power report
report = client.power.report(
    data={"group1": [1, 2, 3], "group2": [4, 5, 6]},
    tests=["ttest", "anova"],
)
```

## Nonparametric Tests

```python
# Mann-Whitney U
result = client.nonparametric.mann_whitney(
    group1=[3.1, 2.5, 4.0, 3.8],
    group2=[5.2, 4.9, 6.1, 5.5],
)

# Kruskal-Wallis
result = client.nonparametric.kruskal_wallis(
    data={"a": [1, 2, 3], "b": [4, 5, 6], "c": [7, 8, 9]},
)
```

## Categorical Tests

```python
# Chi-square independence
result = client.categorical.chi_square_independence(
    observed=[[10, 20], [30, 40]],
)

# Fisher's exact test
result = client.categorical.fishers_exact(
    table=[[8, 2], [1, 5]],
)
```

## Autonomous Intelligence

```python
# Smart profiling
profile = client.autonomous.profile(
    data={"age": [25, 30, 35], "score": [80, 85, 90], "group": [1, 2, 1]},
)
print(profile.recommendations)

# Natural-language query
answer = client.autonomous.query(
    question="Is there a significant difference between groups?",
    data={"group1": [1, 2, 3], "group2": [4, 5, 6]},
)
print(answer.narrative)

# Guardian cascade (auto-fallback to nonparametric if assumptions violated)
cascade = client.autonomous.cascade(
    data={"control": [1, 1, 2], "treatment": [10, 50, 100]},
    test="ttest",
)
if cascade.fallback_used:
    print(f"Guardian redirected to: {cascade.executed_test}")
```

## Manuscript Review

```python
# Full manuscript analysis
report = client.manuscript.analyze(
    "paper.pdf",
    field="psychology",
    alpha=0.05,
)
print(f"Score: {report.overall_score}")
for claim in report.claims:
    status = "PASS" if claim.verified else "FAIL"
    print(f"  [{status}] {claim.text}")

# Check consistency
consistency = client.manuscript.check_consistency("paper.pdf")
if not consistency.consistent:
    for issue in consistency.inconsistencies:
        print(f"  Inconsistency: {issue}")
```

## Manuscript Verifier (raw-data re-analysis)

`client.verify` is the *raw-data* surface: it re-runs the authors' reported tests
on their own data and returns per-claim verdicts, citation–content conflicts, and a
per-file ingestion report. (This is distinct from `client.manuscript`, which does an
internal-consistency review of the reported numbers without re-running anything.)
Without attached data, checkable claims resolve to `INSUFFICIENT_DATA` — the honest default.

```python
# Verify a whole submission bundle (manuscript + data tables + figures)
report = client.verify.bundle(
    ["paper.pdf", "data.csv", "figure1.png"],
    alpha=0.05,
)
print(f"{report.n_claims} claims; distribution: {report.verdict_distribution}")
print(f"Verifiability: {report.verifiability_rate}; conflicts: {report.n_citation_conflicts}")

# The highest-value output: claims whose cited data does NOT reproduce the result
for claim in report.conflicts:
    print(f"  CONFLICT {claim.claim_id}: claimed p={claim.claimed.get('p_value')} "
          f"vs recomputed p={claim.recomputed.get('p_value')}")

# Single manuscript, optionally against one data table
report = client.verify.analyze("paper.pdf", data_path="data.csv")
# ...or raw text:
report = client.verify.analyze(text="Results. r = 0.46, p = 0.011.")

# Retrieve a stored run later (token-gated)
if report.run_id:
    again = client.verify.report(report.run_id, report.report_token)
```

`report.certify_note` carries the mandatory "what this does / does NOT certify"
statement — surface it whenever you display results.

## Platform Usage

```python
# Check your quota
usage = client.platform.usage()
print(f"Tier: {usage.tier}, Remaining: {usage.remaining_quota}")

# List available tiers
tiers = client.platform.tiers()
for tier in tiers:
    print(f"{tier.name}: {tier.monthly_requests} requests/month")
```

## CLI Usage

Configure your connection once:

```bash
sfs config --api-key YOUR_API_KEY --base-url http://localhost:8000/api/v1
```

Run analyses from the terminal:

```bash
# Run a t-test
sfs analyze --file data.csv --test ttest --alpha 0.05

# Descriptive statistics
sfs analyze --file data.csv --test descriptive

# Regression
sfs analyze --file data.csv --test regression --dependent y --predictors "x1,x2"

# Smart profiling
sfs profile --file data.csv

# Natural-language query
sfs query "compare groups" --file data.csv

# Manuscript review (internal-consistency, no data needed)
sfs manuscript --file paper.pdf --field psychology

# Manuscript verifier (re-run the reported tests on the raw data)
sfs verify -f paper.pdf -f data.csv -f figure1.png

# Check usage
sfs usage
```

## Authentication

The SDK supports two authentication methods:

**User token** (default):

```python
client = StickForStats(api_key="tok_abc123")
# Sends: Authorization: Token tok_abc123
```

**Platform key** (for server-to-server integration):

```python
client = StickForStats(api_key="pk_live_xyz", platform_key=True)
# Sends: X-API-Key: pk_live_xyz
```

## Error Handling

```python
from stickforstats import StickForStats, AuthenticationError, ValidationError, APIError

client = StickForStats(api_key="bad-key")

try:
    result = client.stats.ttest(data={"a": [1], "b": [2]})
except AuthenticationError:
    print("Invalid API key")
except ValidationError as e:
    print(f"Bad input: {e.field_errors}")
except APIError as e:
    print(f"Server error [{e.status_code}]: {e.message}")
```

## Requirements

- Python 3.8+
- httpx >= 0.24
- pydantic >= 2.0
- click >= 8.0 and rich >= 13.0 (optional, for CLI)

## License

MIT
