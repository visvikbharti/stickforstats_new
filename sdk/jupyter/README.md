# StickForStats Jupyter Extension

IPython magic commands and rich display widgets for using
[StickForStats](https://github.com/stickforstats/stickforstats) directly
inside Jupyter notebooks.  Wraps the `stickforstats` Python SDK with
notebook-native HTML output and interactive `ipywidgets`.

## Installation

```bash
pip install stickforstats-jupyter
```

For JupyterLab widget support:

```bash
pip install "stickforstats-jupyter[lab]"
```

## Quick Start

Load the extension in any notebook cell:

```python
%load_ext stickforstats_jupyter
```

Configure your API connection (defaults to `localhost:8000` if omitted):

```python
%sfs_config your_api_key http://localhost:8000/api/v1
```

## Magic Commands

### %sfs_profile -- Data Profiling

Automatically detect variable types, distributions, and get analysis
recommendations for a DataFrame in your notebook.

```python
import pandas as pd

df = pd.read_csv("experiment.csv")
%sfs_profile df
```

Output: a rich HTML card showing detected variable types with colored badges,
distribution summaries, data quality warnings, and recommended analyses.

### %%sfs_analyze -- Run Statistical Tests (Cell Magic)

Run a full statistical analysis.  The first line specifies the test type and
options; the cell body lists the variable names to analyze.

**Independent t-test:**

```python
import numpy as np

group1 = np.random.normal(100, 15, 30).tolist()
group2 = np.random.normal(110, 15, 30).tolist()

%%sfs_analyze ttest --alpha 0.05
group1 group2
```

**Paired t-test:**

```python
%%sfs_analyze ttest --alpha 0.05 --paired
pre_scores post_scores
```

**One-way ANOVA with post-hoc:**

```python
%%sfs_analyze anova --post-hoc tukey
control treatment_a treatment_b
```

**Correlation:**

```python
%%sfs_analyze correlation --method pearson
height weight
```

**Linear regression:**

```python
%%sfs_analyze regression --type linear
outcome predictor1 predictor2
```

**Descriptive statistics:**

```python
%%sfs_analyze descriptive
my_data
```

Output: formatted test results with effect size, confidence intervals,
significance badges, and an optional Guardian assumption report.

### %sfs_guardian -- Assumption Checking

Check Guardian assumptions for a dataset and test type before running
the analysis.

```python
%sfs_guardian df ttest
%sfs_guardian my_data anova --alpha 0.01
```

Output: a Guardian report with a confidence score bar, colored severity
badges (green/orange/red) for each violation, and cascade fallback
recommendations.

### %sfs_query -- Natural Language Queries

Ask a plain-English research question about your data.

```python
%sfs_query "Is there a significant difference between treatment groups?" --data df
%sfs_query "What predicts patient outcome?" --data clinical_data --alpha 0.01
```

Output: the test chosen by the autonomous engine, a narrative interpretation,
and a results table.

### %sfs_manuscript -- Manuscript Review

Analyze an academic manuscript for statistical claim verification.

```python
%sfs_manuscript paper.pdf
%sfs_manuscript /path/to/manuscript.docx --field psychology
```

Output: an overall integrity score, a list of extracted statistical claims
with verified/issue badges, and expandable issue details.

## Interactive Widgets

For richer interactivity beyond magic commands, use the widget classes
directly.

### TestSelectorWidget

Dropdown for test type, slider for alpha, checkboxes for options.

```python
from stickforstats_jupyter.widgets import TestSelectorWidget

def run_analysis(test_type, params):
    print(f"Running {test_type} with {params}")

selector = TestSelectorWidget(on_run=run_analysis)
selector.show()
```

### DataProfileWidget

Displays a data profile with interactive variable type editing.

```python
from stickforstats_jupyter.widgets import DataProfileWidget

profiler = DataProfileWidget(data=df)
profiler.show()

# Update data later:
profiler.set_data(new_df)

# Get user overrides:
overrides = profiler.get_type_overrides()
```

### GuardianDashboardWidget

Real-time assumption checking that updates as you change test type or
alpha level.

```python
from stickforstats_jupyter.widgets import GuardianDashboardWidget

dashboard = GuardianDashboardWidget(data=df)
dashboard.show()

# Auto-checks assumptions when data changes:
dashboard.set_data(filtered_df)
```

## Display Functions

If you prefer to call the SDK directly and only use the display layer,
import the HTML rendering functions:

```python
from stickforstats import StickForStats
from stickforstats_jupyter.display import (
    display_guardian_report,
    display_test_result,
    display_profile,
    display_manuscript_report,
)
from IPython.display import HTML, display

client = StickForStats(api_key="tok_abc123")

# Run a t-test
result = client.stats.ttest(data={"a": [1,2,3,4,5], "b": [2,4,6,8,10]})
display(HTML(display_test_result(result, "ttest")))

# Show the Guardian report
if result.guardian:
    display(HTML(display_guardian_report(result.guardian, "ttest")))
```

## Color Scheme

All output uses inline CSS with the following color semantics:

| Status    | Color   | Hex       |
|-----------|---------|-----------|
| Pass      | Green   | `#4caf50` |
| Warning   | Orange  | `#ff9800` |
| Violation | Red     | `#f44336` |
| Info      | Blue    | `#1565c0` |

## Requirements

- Python >= 3.8
- `stickforstats >= 0.1.0`
- `ipython >= 7.0`
- `ipywidgets >= 7.0`
- Optional: `jupyterlab >= 3.0` (for Lab widget rendering)
