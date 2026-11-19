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

### A Mann-Whitney test of a few values against a very large group can outlast the server

- **Where:** a question that is answered with a Mann-Whitney test, and
  `POST /api/v1/autonomous/cascade/` with the test `mann_whitney_u`, when one group has at most
  eight values, the other has many, and no value occurs twice.
- **What happens:** the choice of the method is left to SciPy, and for such data SciPy counts the
  exact distribution whatever the size of the larger group. Measured with SciPy 1.17.1: 1.3
  seconds for 20,000 values in the larger group and 33 seconds for 100,000. With SciPy 1.11.3: 15
  seconds for 1,000 values and 76 seconds for 2,000. The reverse proxy (`nginx/nginx.conf`) stops
  waiting for an answer after 60 seconds, and the server goes on computing until it has one.
- **Until it is fixed:** send such data to `POST /api/v1/nonparametric/mann-whitney/`, which uses
  the normal approximation as soon as one group has 20 values or more.

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

### The result of every rank test is labelled "Normal approximation"

- **Where:** the Non-Parametric Tests tab: the label under the name of the test, and the row
  "p-value (normal approximation)" of the results.
- **What happens:** both read the same for every result, because the page looks for a field that
  the server never sends. The server reads the p-value of a Mann-Whitney test from the exact
  distribution when both groups have fewer than 20 values and no value occurs twice, and the
  p-value of a signed-rank test from the exact distribution of untied ranks when fewer than 25
  pairs differ. The Kruskal-Wallis and the Friedman test use a chi-square approximation.
- **Until it is fixed:** disregard the label. The sizes above say which method the server used.

### A signed-rank result changes with the unit in which the data are typed

- **Where:** the Wilcoxon signed-rank test of the Non-Parametric Tests tab, and
  `POST /api/v1/nonparametric/wilcoxon/`.
- **What happens:** differences that are equal on paper are not always equal in the machine: 5.4
  minus 5.1 and 6.3 minus 6.0 differ in their last binary digit, and they then get different
  ranks. For seven pairs in which five values rise by 0.3 and two fall by 0.3 the route returns
  p = 0.156 for the data as typed and p = 0.375 for the same data in tenths. When differences are
  tied, the p-value is still read from the distribution of untied ranks: the exact value for
  these seven tied differences is 58/128 = 0.453.
- **Until it is fixed:** enter the data as whole numbers (in tenths for one decimal), so that the
  result does not depend on the unit, and read the p-value of tied differences as approximate.

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

## The API

### The signed-rank route with `zero_method` "pratt" or "zsplit"

- **Where:** `POST /api/v1/nonparametric/wilcoxon/`, when the request names one of these two
  methods for the pairs that do not differ. No page sends them.
- **What happens:** the p-value is taken from the distribution for as many ranks as there are
  pairs, the pairs that do not differ included. For nine pairs that do not differ and five that
  rise the route returns 0.000122 with "pratt" and 0.0419 with "zsplit"; the five pairs that
  differ cannot give less than 0.0625.
- **Until it is fixed:** send no `zero_method`. The test is then computed on the pairs that
  differ, and the route returns 0.0625 for these data.

## Closing an account

### The e-mail address, the saved projects and the receipts are kept

- **Where:** "Close my account" on `/privacy-settings`.
- **What happens:** the account is closed and its data are deleted or anonymised as the dialog
  lists. Two things are kept, and the dialog and the Privacy & data page say so: the e-mail
  address stays in the database, because it is also the username, and saved projects and receipts
  are not deleted and stay linked to the deactivated account.
- **Until it is fixed:** the software has no tool that removes the address, the projects or the
  receipts. One is planned for after version 1.3.0.
