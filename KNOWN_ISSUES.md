# Known issues

This file lists what StickForStats shows or does today that a user should know about and that is
not repaired yet. Each entry says where it is, what happens, and what to do until it is fixed.

## The question page (`/smart-analysis`)

### Degrees of freedom and the confidence interval read "N/A"

- **Where:** the Researcher View of an answer.
- **What happens:** the cards "Degrees of Freedom" and "Confidence Interval" show "N/A" for every
  answer. The server sends the degrees of freedom as `degrees_of_freedom`; the page looks for them
  under another name. The server sends no confidence interval with these answers.
- **Until it is fixed:** take the degrees of freedom from the answer of
  `POST /api/v1/autonomous/query/` (`cascade_result.result.degrees_of_freedom`).

### A Guardian confidence score although nothing was said about the design

- **Where:** "Guardian Confidence Score" under an answer.
- **What happens:** a score is shown with every answer. The page sends the file and the question
  and nothing else: it does not ask whether the rows are independent subjects or repeated
  measurements of the same ones, and the score is computed without that information.
- **Until it is fixed:** do not read the score as a statement about the design of the study. Judge
  the unit of analysis yourself.

### Two columns of categories get "Test execution failed"

- **Where:** a question about two columns that hold words, such as a treatment and an outcome
  recorded as "improved" or "same".
- **What happens:** no test is run. The answer reads "Test execution failed: could not convert
  string to float", followed by the first word of the column.
- **Until it is fixed:** count the rows of each combination and give the table of counts to the
  chi-square test (`POST /api/v1/categorical/chi-square/independence/`).

## The t-test page (`/modules/t-test-real`)

### Mean difference, confidence interval and effect size read "N/A"

- **Where:** the results of a paired test and of a one-sample test.
- **What happens:** the three fields show "N/A". For these two tests the server answers with the
  statistic, the degrees of freedom, the p-value and the standard error, and with no mean
  difference, no confidence interval and no effect size. For two independent samples all three
  are shown.
- **Until it is fixed:** the answer of `POST /api/v1/stats/ttest/` holds the mean of the differences
  of a paired test as `high_precision_result.mean`, next to its standard error (`se`).

### Normality is checked on the two samples, not on their differences

- **Where:** "Assumptions" under the result of a paired test.
- **What happens:** the page reports a normality check for sample 1 and one for sample 2. A paired
  t-test assumes that the differences are normally distributed; that is not checked here.
- **Until it is fixed:** check the differences yourself, or run the paired test in the analysis
  hub (`/statistical-analysis-tools`), where Guardian checks the differences.

## The analysis hub (`/statistical-analysis-tools`)

### The guidelines tell the reader to choose a test from a normality test

- **Where:** "Guidelines for Statistical Testing" on the Statistical Tests page, before a category
  of tests is chosen.
- **What happens:** the text says "Use normality tests before parametric tests" and "Parametric
  tests for normal data, non-parametric for others". Choosing between a test and its rank
  counterpart from a normality test on the same data changes the error rate of the test that is
  then run.
- **Until it is fixed:** choose the test from the design of the study and the kind of outcome, and
  read the assumption checks as a report on that test.

### The paired t-test shows no mean difference

- **Where:** "Paired Samples t-test Results" on the Parametric Tests tab.
- **What happens:** the row "Mean Difference" shows a dash. The standard error, the t-statistic, the
  degrees of freedom and the p-value are shown. The server sends the mean of the differences under
  one name and the tab looks for it under another.
- **Until it is fixed:** the mean difference is the t-statistic times the standard error, both of
  which the table shows.

### The debugger of a paired t-test says that it has no numeric data

- **Where:** "Debug Analysis" under the result of a paired t-test.
- **What happens:** the panel is marked "CRITICAL", shows "Data Quality POOR" and "n = N/A", and
  lists the issue "No numeric data available for analysis". It is handed the two columns in a form
  it does not read. Its other lines, on the smallest detectable effect and on the assumption
  checks, do not depend on that.
- **Until it is fixed:** disregard the "CRITICAL" mark and the data-quality line of this panel for a
  paired test.

### The Wilcoxon signed-rank test counts the pairs that do not differ

- **Where:** "Wilcoxon Signed-Rank Test (paired samples)" on the Non-Parametric Tests tab, and
  `POST /api/v1/nonparametric/wilcoxon/` when the request names no `zero_method`.
- **What happens:** when some pairs have the same value in both columns, the p-value is too small.
  The server ranks those pairs with the others and takes the p-value from the distribution for as
  many ranks as there are pairs. Nine pairs that do not differ and five that rise get
  p = 0.000122; the five pairs that differ cannot give less than 0.0625. Data in which every pair
  differs are not affected.
- **Until it is fixed:** take the rows in which the two columns are equal out of the file before
  the test, or send `"zero_method": "wilcox"` with the request to the API.

## Statistical quality control (`/sqc-analysis`)

### The "Measurement Column" menu of a control chart is empty

- **Where:** step 2, "Configure Chart Parameters", after a file was uploaded or the example data
  were loaded.
- **What happens:** the menu offers no column, so no control chart can be asked for on this page.
  The upload step records each column as numeric or categorical in one form, and the chart step
  reads another.
- **Until it is fixed:** ask for the chart through the API
  (`POST /api/v1/sqc-analysis/quick-control-chart/`).

## Confidence intervals (`/confidence-intervals/calculators`)

### Every calculator asks for a project, and none can be made

- **Where:** the Calculators tab.
- **What happens:** each calculator shows "Please select or create a project to start
  calculations." The Project menu is disabled, and the page has no way to create a project. The
  "Differences" calculator would send its request to an address that the server does not have.
- **Until it is fixed:** use the API: `POST /api/v1/confidence-intervals/calculate/mean/`,
  `.../calculate/proportion/`, `.../calculate/compare/` or `.../calculate/bootstrap/`.

## The manuscript check (`/manuscript-verifier`)

### The report does not say that rows were left out

- **Where:** the table of claims, for a test that was re-run on a data file with missing values.
- **What happens:** the server re-runs the test on the complete rows and adds a note to the claim,
  such as "2 of 40 rows have a missing value ... and were left out of both columns". The page
  shows a claim's notes only when they report a conflict, so this note is not shown.
- **Until it is fixed:** read the notes of each claim in the answer of the API (`claims[].notes`).

### A reported "p < .001" is printed as "0.0010"

- **Where:** the column "Reported p" of the table of claims.
- **What happens:** the page prints the bound of an inequality as if it were the reported value,
  with four decimals. A p-value of exactly 0 is printed as "0".
- **Until it is fixed:** read the reported p-value in the manuscript itself.

## The Guardian check

### A group that does not vary ends the check in a server error

- **Where:** `POST /api/guardian/check/`, and every page that asks Guardian before a test, when one
  group or one column of the data holds a single value repeated.
- **What happens:** the server answers "Server Error (500)" instead of a report. The analysis hub
  then shows that the check failed and runs the test without it.
- **Until it is fixed:** a result obtained on such data was not checked by Guardian. Look at the
  group that does not vary before reading the result.

## Closing an account

### The e-mail address, the saved projects and the receipts are kept

- **Where:** "Close my account" on `/privacy-settings`.
- **What happens:** the account is closed and its data are deleted or anonymised as the dialog
  lists. Two things are kept, and the dialog and the Privacy & data page say so: the e-mail
  address stays in the database, because it is also the username, and saved projects and receipts
  are not deleted and stay linked to the deactivated account.
- **Until it is fixed:** the software has no tool that removes the address, the projects or the
  receipts. One is planned for after version 1.3.0.
