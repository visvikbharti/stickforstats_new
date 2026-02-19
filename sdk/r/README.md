# stickforstats: R Client for StickForStats

R client package for the [StickForStats](https://stickforstats.com) statistical analysis platform.
Provides access to 40+ statistical tests with Guardian assumption validation,
autonomous analysis, manuscript review, and 50-digit precision calculations.

## Installation

```r
# Install from source (development)
install.packages("sdk/r", repos = NULL, type = "source")

# Or using devtools
devtools::install_local("sdk/r")

# Or using remotes from GitHub
# remotes::install_github("stickforstats/stickforstats-r")
```

### Dependencies

- [httr2](https://httr2.r-lib.org/) -- modern HTTP client for R
- [jsonlite](https://jeroen.r-universe.dev/jsonlite) -- JSON parsing
- [R6](https://r6.r-lib.org/) -- encapsulated OOP classes

## Quick Start

### Configure once

```r
library(stickforstats)

# Save configuration (persisted to ~/.stickforstats/config.json)
sfs_configure(
  base_url = "https://api.stickforstats.com/api/v1",
  api_key  = "tok_your_api_key"
)
```

### Option 1: Use standalone functions (simple)

```r
library(stickforstats)

# t-test
result <- sfs_ttest(
  data = list(control = c(5.1, 4.8, 5.3, 5.0), treatment = c(7.2, 6.9, 7.5, 7.1))
)
print(result)

# Correlation
result <- sfs_correlation(
  x = c(1, 2, 3, 4, 5),
  y = c(2, 4, 5, 4, 5),
  method = "pearson"
)

# ANOVA with post-hoc
result <- sfs_anova(
  data = list(A = c(1,2,3), B = c(4,5,6), C = c(7,8,9)),
  post_hoc = "tukey"
)

# Descriptive statistics
result <- sfs_descriptive(c(10, 20, 30, 40, 50))
```

### Option 2: Use the R6 client (full control)

```r
library(stickforstats)

client <- StickForStats$new(
  base_url = "http://localhost:8000/api/v1",
  api_key  = "tok_abc123"
)

# Check API health
client$health()

# Run a paired t-test
result <- client$ttest(
  data = list(before = c(5, 6, 7, 8), after = c(7, 8, 9, 10)),
  paired = TRUE,
  alpha = 0.01
)

# Regression
result <- client$regression(
  data = data.frame(x = 1:10, y = 2 * (1:10) + rnorm(10)),
  dependent = "y",
  predictors = "x",
  type = "linear"
)
```

## Using data.frames

The SDK automatically converts `data.frame` objects to the column-oriented
format expected by the API. You can also use the conversion helpers directly:

```r
df <- data.frame(
  score    = c(85, 90, 78, 92, 88),
  hours    = c(3, 5, 2, 6, 4),
  group    = c("A", "B", "A", "B", "A")
)

# Automatic conversion when passed to any method
result <- sfs_regression(df, dependent = "score", predictors = "hours")

# Manual conversion
columns <- df_to_columns(df)   # list(score = c(...), hours = c(...), group = c(...))
records <- df_to_records(df)   # list(list(score=85, hours=3, group="A"), ...)
```

## Autonomous Intelligence Layer

Ask questions in plain English and let StickForStats choose the right analysis:

```r
# Smart profiling
profile <- sfs_profile(df)

# Natural-language query
answer <- sfs_query(
  "Is there a significant relationship between hours and score?",
  data = df
)

# Guardian cascade -- automatic fallback to nonparametric tests
result <- sfs_cascade(
  data = list(A = c(1,2,3,4), B = c(10,20,30,40)),
  test = "ttest"
)

# Translate results to plain language
explanation <- sfs_translate(result, audience = "general")
```

## Manuscript Review

Analyze academic papers for statistical accuracy:

```r
# Full manuscript analysis
report <- sfs_manuscript_analyze(
  "~/papers/draft.pdf",
  field = "psychology"
)

# Parse manuscript structure
parsed <- sfs_manuscript_parse("~/papers/draft.pdf")

# Extract statistical claims
claims <- sfs_manuscript_claims("~/papers/draft.pdf")

# Check internal consistency
consistency <- sfs_manuscript_consistency("~/papers/draft.pdf")
```

## API Endpoints Covered

| Function | Endpoint | Description |
|---|---|---|
| `$ttest()` / `sfs_ttest()` | `POST /stats/ttest/` | Independent/paired t-test |
| `$anova()` / `sfs_anova()` | `POST /stats/anova/` | One-way/repeated/MANOVA |
| `$correlation()` / `sfs_correlation()` | `POST /stats/correlation/` | Pearson/Spearman/Kendall |
| `$regression()` / `sfs_regression()` | `POST /stats/regression/` | Linear/logistic/ridge/lasso |
| `$descriptive()` / `sfs_descriptive()` | `POST /stats/descriptive/` | Summary statistics |
| `$profile()` / `sfs_profile()` | `POST /autonomous/profile/` | Smart data profiling |
| `$query()` / `sfs_query()` | `POST /autonomous/query/` | NL data query |
| `$cascade()` / `sfs_cascade()` | `POST /autonomous/cascade/` | Guardian cascade |
| `$translate()` / `sfs_translate()` | `POST /autonomous/translate/` | Plain-language results |
| `$manuscript_analyze()` / `sfs_manuscript_analyze()` | `POST /manuscript/analyze/` | Full manuscript review |
| `$manuscript_parse()` / `sfs_manuscript_parse()` | `POST /manuscript/parse/` | Structure extraction |
| `$manuscript_claims()` / `sfs_manuscript_claims()` | `POST /manuscript/claims/` | Claim extraction |
| `$manuscript_consistency()` / `sfs_manuscript_consistency()` | `POST /manuscript/consistency/` | Consistency check |
| `$health()` | `GET /health/` | API health check |
| `$usage()` | `GET /platform/usage/` | Usage dashboard |

## Authentication

Two authentication modes are supported:

```r
# User token (default) -- sent as Authorization: Token <key>
client <- StickForStats$new(api_key = "tok_abc123")

# Platform API key -- sent as X-API-Key: <key>
client <- StickForStats$new(api_key = "pk_abc123", platform_key = TRUE)
```

## Testing

```r
# Run unit tests (no server required)
devtools::test()

# Run live integration tests (requires running StickForStats server)
Sys.setenv(SFS_TEST_LIVE = "1")
devtools::test()
```

## License

MIT
