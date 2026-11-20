# Known issues

This file lists what StickForStats shows or does today that a user should know about and that is
not repaired yet. Each entry says where it is, what happens, and what to do until it is fixed.

## The question page (`/smart-analysis`)

### The question box answers no question: this version cannot read one

- **Where:** `/smart-analysis` and its route, `POST /api/v1/autonomous/query/`.
- **What happens:** a question is not read and nothing is analysed. The part of the server that
  reads a question has never been loaded: it is imported by a path that does not exist, and the
  failure is caught. Until this version the route went on without it and answered every question
  with the first test that the profile of the file suggested. Four questions about one file with
  a column of two groups and two columns of numbers, among them "Is there a relationship between
  weight and height?" and "banana", were each answered with the same t-test of the two groups,
  and the answer did not say which question it belonged to. The route now reads no file and runs
  no test. It answers every request with status 501 and one sentence: "This version cannot read
  a question, so nothing was analysed. Run the test you want on its own page." The page shows
  that sentence where the answer would be, and says before a file is uploaded that no question
  is answered. The upload and the summary of the variables work as before. While a question is
  typed, the page still shows beside it the kind of question it finds in the words,
  "Relationship" for example; the page finds that itself and does not send it. The README and
  the documentation of the Python and R clients still describe a question in plain English as
  read. Those two clients send the question under the name `question`, which the route never
  read: they were answered 400, 'A "query" field is required.', and get the sentence now.
- **Until it is fixed:** run the test you want on its own page, for example in the analysis hub
  (`/statistical-analysis-tools`), or through the route of that test.

### The Guided Wizard runs no analysis

- **Where:** the tab "Guided Wizard" of `/smart-analysis`.
- **What happens:** the wizard asks for a goal, a file and the variables, names a test
  ("Independent Samples t-test" for a comparison of two groups) and says "The Guardian system
  will validate statistical assumptions before running the analysis." The button "Run Analysis"
  sends nothing to the server and runs nothing. The next step, "Results", then says "No results
  yet. Go back to the Analysis step and click "Run Analysis"."
- **Until it is fixed:** run the test on its own page, for example in the analysis hub
  (`/statistical-analysis-tools`).

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
  of tests is chosen; and the answers of `POST /api/v1/stats/ttest/`, `POST /api/v1/stats/anova/`
  and `POST /api/guardian/validate/normality/`.
- **What happens:** the text says "Use normality tests before parametric tests" and "Parametric
  tests for normal data, non-parametric for others". The three routes give the same advice when
  their own normality check rejects: the field `recommendations` of the first two says "Data may
  not be normally distributed. Consider the Mann-Whitney U test." or "Normality assumption
  violated. Consider the Kruskal-Wallis test.", and `details.recommendation` of the third says
  "Consider transformation (log, sqrt) or use non-parametric tests". Choosing between a test and its rank
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

### The debugger of a paired test says that it has no numeric data

- **Where:** "Debug Analysis" under the result of a paired t-test, of a Wilcoxon signed-rank test
  and of a Friedman test.
- **What happens:** the panel is marked "CRITICAL", shows "Data Quality POOR" and "n = N/A", and
  lists the issue "No numeric data available for analysis". It is handed the columns in a form it
  does not read. The word under "Effect Size" is chosen without regard to the sign: a negative
  effect size reads "Small" whatever its size, so a signed-rank result with r = -1.000, the
  largest there is, reads "Small".
- **Until it is fixed:** disregard the "CRITICAL" mark, the data-quality line and the word under the
  effect size of this panel for these tests.

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

### Of the four rank tests, Guardian is asked about the Mann-Whitney test only

- **Where:** the Non-Parametric Tests tab.
- **What happens:** a Guardian check is requested for the Mann-Whitney test. For the
  Kruskal-Wallis, the Wilcoxon signed-rank and the Friedman test none is requested: no Guardian
  panel appears, and the debugger under the result lists "No assumption checks were performed".
- **Until it is fixed:** for these three tests the absence of a Guardian panel says nothing about
  their assumptions. Check them yourself.

### The regression module ends every run with "performLinearRegression is not a function"

- **Where:** Module 7, "Advanced Regression Analysis".
- **What happens:** "Perform Regression" shows "Error" and a message that ends
  "performLinearRegression is not a function", and nothing is sent to the server. The module calls
  methods that its service does not have, for each of its eight regression types and for a
  prediction; the service has them under other names. The request the service would send is
  refused by the server as well, because it lacks the field `type`. Before that, "Parse Data"
  shows a Guardian panel for the typed rows ("All assumptions satisfied. Safe to proceed with
  analysis." for eight rows of two columns), although no regression follows.
- **Until it is fixed:** ask the server directly. `POST /api/v1/regression/` with
  `{"type": "simple_linear", "X": [...], "y": [...]}` answers with the coefficients.

### A file of 150,000 rows replaces the Data Profiling module with the error screen

- **Where:** Module 1, "Data Profiling", after a file is chosen.
- **What happens:** a file of 100,000 rows is profiled. A file of 150,000 rows or more replaces
  the whole page with "Something went wrong", "Application Error", "RangeError: Maximum call
  stack size exceeded". Tried in Chrome with files of two columns, a group and a number: 100,000
  rows (1.05 MB) were profiled; 150,000 rows (1.27 MB), 200,000 rows (1.7 MB) and 1,000,000 rows
  (8.5 MB) gave the error screen. The note under the button says "Max File Size: 10MB
  (recommended for browser performance)". The reason: for the histogram of a numeric column the
  page takes the smallest and the largest value with `Math.min(...data)` and `Math.max(...data)`,
  which hand every value of the column to one call, and a browser accepts only so many; where
  the limit lies differs from browser to browser.
- **Until it is fixed:** profile a file of at most 100,000 rows, or a sample of the rows. After
  the error screen, open the hub again; the file has to be chosen again.

### A perfect rank correlation gets a p-value of 0, and the engine answers with the other rank correlation

- **Where:** Spearman's correlation on the Correlation tab of the hub, which asks
  `POST /api/v1/stats/correlation/`; and `POST /api/v1/autonomous/cascade/` with the test
  `spearman` or `kendall`.
- **What happens:** when the second column rises with the first in every row, the first route
  answers Spearman's correlation with a coefficient of 1 and a p-value of 0, and the tab prints a
  p-value of 0 as "< 2.2e-16". The exact p-value of five such rows is 0.0167, and of eight
  0.0000496; Kendall's test on the same route gives these two values. The second route does not
  answer with the test it was asked for: for five such rows a request for `spearman` came back
  with Kendall's test (`final_test` "kendall", p = 0.0167), and a request for `kendall` with
  Spearman's (p = 1.4e-24).
- **Until it is fixed:** for a rank correlation of 1, do not report the p-value of Spearman's
  correlation. Take Kendall's from the first route, and read `final_test` in an answer of the
  second.

## Statistical quality control (`/sqc-analysis`)

### The "Measurement Column" menu of a control chart is empty

- **Where:** step 2, "Configure Chart Parameters", after a file was uploaded or the example data
  were loaded.
- **What happens:** the menu offers no column, so no control chart can be asked for on this page.
  The upload step records each column as numeric or categorical in one form, and the chart step
  reads another.
- **Until it is fixed:** ask for the chart through the API
  (`POST /api/v1/sqc-analysis/quick-control-chart/`).

## The quality-control lessons (`/sqc-learn`)

### In three lessons the button that asks the server ends in "is not a function"

- **Where:** lesson 2, "Variables Control Charts", and lesson 3, "Attributes Control Charts", the
  button "Perform Statistical Analysis"; lesson 6, "Acceptance Sampling", the button "Generate
  Optimal Plan with Backend API".
- **What happens:** a red box appears under the button: "Backend Error: ie is not a function" in
  lessons 2 and 3, "H is not a function" in lesson 6. The letters before "is not a function" are
  the short names of one build and can differ in the next. No request is sent. The lesson stays
  on the page, with the chart and the numbers that the browser computes. The reason: the three
  lessons take `quickControlChart` and `quickAcceptanceSampling` from a helper
  (`useSQCAnalysisAPI.js`) that has no function of either name.
- **Until it is fixed:** go on with the lesson without that button.

## Confidence intervals (`/confidence-intervals/calculators`)

### Every calculator asks for a project, and none can be made

- **Where:** the Calculators tab.
- **What happens:** each calculator shows "Please select or create a project to start
  calculations." The Project menu is disabled, and the page has no way to create a project. The
  "Differences" calculator would send its request to an address that the server does not have.
- **Until it is fixed:** use the API: `POST /api/v1/confidence-intervals/calculate/mean/`,
  `.../calculate/proportion/`, `.../calculate/compare/` or `.../calculate/bootstrap/`.

## The genomics analysis (`/genomics-analysis`)

### A gene with the same value in every sample is listed as "NS"

- **Where:** the table and the volcano plot of a result.
- **What happens:** no test can be computed for such a gene. The server sends it under the name
  of a t-test, without a statistic and without a p-value, and does not say that the test failed.
  The page shows a dash for the adjusted p-value and the chip "NS", and draws the gene at the
  bottom of the volcano plot, where p = 1 lies. The summary does not count such genes.
- **Until it is fixed:** read "NS" in a row whose adjusted p-value is a dash as "not tested", or
  remove the genes that do not vary before the upload.

### A file with an empty cell is refused with "could not convert string to float"

- **Where:** "Run Differential Expression", for a file in which one value is missing.
- **What happens:** the analysis stops with the message "could not convert string to float: ''".
  It does not say which gene or which sample has the empty cell, and no gene is analysed.
- **Until it is fixed:** remove the rows that have an empty cell before the upload.

## The causal-inference page (`/modules/causal-inference`)

### Analysing a graph replaces the page with the error screen, and two boxes of a result stay empty

- **Where:** the page has no entry in the navigation; it answers at its address. Tab "DAG
  Builder", and the result of the tab "Diff-in-Diff".
- **What happens:** when a graph is analysed, the whole page is replaced by "Something went
  wrong", with a message that ends "adjustment_sets.map is not a function": the page reads the
  adjustment sets as a list, and the server sends an object. On the tab "Diff-in-Diff" the
  estimate, its interval and its p-value are shown, and the boxes "Std. Error" and "t-statistic"
  stay empty: the page looks for `se` and `t_stat`, and the server sends `std_error` and
  `t_statistic`.
- **Until it is fixed:** ask the server directly: `POST /api/v1/core/causal/dag/analyze/` for a
  graph (the sets are under `results.adjustment_sets.valid_adjustment_sets`), and
  `POST /api/v1/core/causal/did/` for the two missing numbers (`results.std_error`,
  `results.t_statistic`).

## The AI advisor (the button at the lower right of every page)

### The advisor answers from fixed templates, and a key does not turn it on

- **Where:** the panel "StickAI", and the routes under `/api/v1/ai-advisor/`.
- **What happens:** no language model is connected. The server answers a question with status
  503, and the panel then shows a text of its own under the line "AI service unavailable —
  showing offline template responses based on Guardian context." The text is chosen by words of
  the question and is not an answer to it: "How do I compare means between two groups?" got a
  list of what the advisor can assist with. The same line tells the reader to set
  `ANTHROPIC_API_KEY` and to restart the server. That does not turn the advisor on: the request
  the server then makes is refused by the installed SDK before it is sent (`temperature` is not an
  argument of `messages.create` in anthropic 2.3.0), and it names the model
  `claude-sonnet-4-20250514`, which was retired on 15 June 2026. The routes `quick-recommend/`,
  `interpret/`, `methods-section/` and `assumption-guidance/` answer with status 500 and the
  sentence "AI Advisor is not available."; the tab "Methods Writer" then writes its text from a
  template of its own.
- **Until it is fixed:** read a text of the panel as a general note. It was not written for your
  question or for your data.

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

### A figure image or a scanned PDF is not read

- **Where:** a bundle that holds a figure as an image (PNG, JPEG, TIFF and the like), or a
  manuscript that is a scan without a text layer.
- **What happens:** the page asks for "figure images" and names "PNG / JPEG / TIFF". The server
  image holds no program that reads text from a picture, so no picture is read. With a figure
  among the files, the report is made from the other files. The line "Ingestion report" counts
  "0 image", and the table under it, which is closed until it is clicked, lists the figure as
  "skipped", with "no statistic could be extracted from the figure" and "OCR unavailable: the
  tesseract binary / pytesseract is not installed." A statistic that is printed only in a figure
  is therefore not among the claims of the report. A scanned PDF as the only manuscript is
  refused with "No manuscript text could be extracted from the bundle (no readable manuscript or
  OCR'able figure was found)."
- **Until it is fixed:** give the manuscript as a file with a text layer (a PDF with text, DOCX,
  LaTeX or JATS-XML), and check by hand the statistics that stand only in a figure.

### A t-test is recomputed as Student's when its degrees of freedom are printed whole, whatever the sentence says

- **Where:** the report of the manuscript check, for a sentence with a t statistic.
- **What happens:** the check takes the kind of t-test from the degrees of freedom in the brackets
  and not from the words beside them. With a decimal point they are recomputed as Welch's t-test;
  whole, as Student's t-test of two independent groups, also where the sentence says "Welch's
  t-test" or "a paired t-test". For two groups of 8 and 20 values, "Welch's t-test, t(21) =
  -0.65, p = 0.522" was recomputed as Student's t-test, p = 0.679. For 12 pairs, "a paired
  t-test, t(11) = -4.41, p = 0.001" was recomputed as Student's t-test of two groups, p = 0.485,
  from a table with a column of groups, and was not recomputed from a table with one column for
  each occasion ("INSUFFICIENT_DATA"). The verdict on assumptions is about the test that was
  recomputed. It also counts unequal variances against Welch's t-test, which does not assume
  equal variances: the same two groups with "t(21.38)" were recomputed as Welch's t-test and got
  the verdict "ASSUMPTION_VIOLATED" for "Variance homogeneity violated".
- **Until it is fixed:** for a Welch's or a paired t-test, do not read the recomputed p-value or
  the verdict as a check of the reported test. Recompute such a result yourself.

## The API

### A Mann-Whitney test with one very small group is exact up to 1,000 values in the other group, and approximate above

- **Where:** `POST /api/v1/autonomous/cascade/` with the test `mann_whitney_u`, and a gene that
  the genomics analysis sends to the rank test, when one group has at most eight values and no
  value occurs twice.
- **What happens:** for such data SciPy counts the exact distribution whatever the size of the
  other group, and the count took 33 seconds for 100,000 values. The server asks for the normal
  approximation when the larger group has more than 1,000 values and leaves the choice to SciPy
  otherwise; the answer does not say which was used. Eight values against 1,000 got the exact
  p-value, 0.0109, in one example; with one value more in the large group the answer was the
  approximation, 0.0128, where the exact value is 0.0108. Far in the tail the two differ more:
  0.00086 against an exact 0.00036 in another example. The tab of the analysis hub
  (`POST /api/v1/nonparametric/mann-whitney/`) has a rule of its own, the approximation as soon as
  one group has 20 values or more, so the same data can get two p-values on two pages.
  What is left of the waiting: at 1,000 values one test took 0.01 seconds, and a genomics request
  of 8 samples against 1,000 with 1,000 genes took 0.9 seconds, with SciPy 1.17.1, the version in
  the image. With SciPy 1.11.3, the version that `backend/requirements-pinned.txt` names, one test
  of 8 values against 1,000 took 15 seconds.
- **Until it is fixed:** where a p-value near a threshold matters and one group is very small,
  compute the exact one yourself, for example with SciPy's `mannwhitneyu(x, y, method="exact")`.

### The signed-rank route with `zero_method` "pratt" or "zsplit"

- **Where:** `POST /api/v1/nonparametric/wilcoxon/`, when the request names one of these two
  methods for the pairs that do not differ. No page sends them.
- **What happens:** the p-value is taken from the distribution for as many ranks as there are
  pairs, the pairs that do not differ included. For nine pairs that do not differ and five that
  rise the route returns 0.000122 with "pratt" and 0.0419 with "zsplit"; the five pairs that
  differ cannot give less than 0.0625.
- **Until it is fixed:** send no `zero_method`. The test is then computed on the pairs that
  differ, and the route returns 0.0625 for these data.

### The genomics routes report fold changes in the wrong direction when the two groups are not named

- **Where:** `POST /api/v1/genomics/differential-expression/` and
  `POST /api/v1/genomics/volcano-plot/`, called directly. The page of the genomics analysis names
  the two groups in every request and labels the samples "control" and "treatment"; the first
  point does not reach it.
- **What happens:** without `group1_name` and `group2_name` the route takes the labels of the
  samples in alphabetical order and makes the first one the reference. For samples labelled
  "treated" and "untreated" the treated samples become the reference: a gene that is about twice
  as high in the treated samples is reported with a log2 fold change of -1.02, and the summary
  calls the two groups "control" and "treatment". With both groups named the same request gives
  +1.02. Further: a missing value (`null`) in the matrix, one gene sent as a plain list of
  numbers, and a matrix without `sample_groups` are each answered with status 500. `alpha` is not
  checked (5 is accepted), and the summary reports 0.05 whatever was sent. Three groups of samples
  are compared by an analysis of variance and reported under the sizes of two groups. The volcano
  route reports a fold-change threshold of 1.0 and does not apply it (a gene with a log2 fold
  change of 0.09 is marked significant), and it answers one group of samples with status 500
  where the other route answers 400.
- **Until it is fixed:** name both groups in every request (`group1_name` is the reference), send
  complete matrices of two groups, and apply the fold-change threshold to the answer of the
  volcano route yourself.

### The F test of a regression: a p-value of 0, and F = 0 with p = 1 for an exact fit

- **Where:** `POST /api/v1/regression/`, the routes under it and `POST /api/v1/stats/regression/`,
  for ordinary least squares (`"type": "simple_linear"` or `"multiple_linear"`); and the tab
  "Regression" of `/modules/correlation-regression`.
- **What happens:** the answer reports the F test of the whole model under `statistics`. Its
  p-value, `f_p_value`, is computed as one minus the distribution function, in double precision.
  A p-value below about 1e-16 is reported as 0: for x = 1, 2, ..., 12 and y = 2.1, 3.9, 6.2, 7.8,
  10.1, 12.2, 13.8, 16.1, 18.0, 20.2, 22.1, 23.9 the answer gives F = 23212.0 with `f_p_value` 0,
  where the p-value is 3.6e-18. Between about 1e-16 and 1e-10 it loses digits, the more the
  smaller it is: 2.23265900e-10 was reported for 2.23265894e-10 in one example. The p-values of
  the coefficients, under `p_values`, are computed another way and are right; with one predictor
  the p-value of the slope is the p-value of the F test. When the response is an exact function
  of two or more predictors, the answer depends on how the arithmetic rounds. For a = 1, 2, ...,
  6, b = 2, 1, 5, 3, 8, 2 and y = 1 + 2a - b the answer says `f_statistic` 0 and `f_p_value` 1,
  with an R squared of 1; with b = 2, 1, 4, 3, 6, 2 the same request is answered with status 500
  and an empty message. An exact line with one predictor, a response that does not vary and a
  request of two rows are answered with status 500 and an empty message. The page does not show
  the F test. For an exact line it shows "Request failed with status code 500". For an exact fit
  with two predictors it shows the same message in the second example, and standard errors of
  0.00000 and an AIC of -1339.50 in the first. It shows a dash for
  the standard error and the p-value of the intercept, which the server sends.
- **Until it is fixed:** with one predictor, read the p-value of the slope (`p_values.X1`) for the
  test of the whole model. With several, compute the p-value from `f_statistic` and its degrees of
  freedom, the number of predictors and the number of rows less that number less one. Do not read
  a `f_p_value` of 0, or an F of 0 beside an R squared of 1, as a result.

### A chi-square test of a 2 x 2 table gets two p-values on two routes

- **Where:** `POST /api/v1/categorical/chi-square/independence/`, which the Categorical Tests tab
  of the hub asks, and `POST /api/v1/autonomous/cascade/` with the test `chi_square_independence`.
- **What happens:** the first route computes the test without the continuity correction unless
  the request holds `"yates_correction": true`, and its answer says which under
  `yates_correction`. The second applies the correction to every 2 x 2 table, and no word of its
  answer says so. For the table 12, 9 / 7, 15 the first answers p = 0.0946 and the second p =
  0.1724. The tab sends no `yates_correction`, shows the first value, and does not say that it
  is the uncorrected one.
- **Until it is fixed:** for a 2 x 2 table, say which of the two you report. The first route
  computes either one on request; the second computes the corrected one only.

### The Friedman route reads `groups` as one list for each subject

- **Where:** `POST /api/v1/nonparametric/friedman/`, called with the data under `groups`.
- **What happens:** the route reads `measurements`, one row for each subject. It reads `groups`
  the same way, where the Kruskal-Wallis route reads `groups` as one list for each group. A caller
  who sends one list for each condition gets another test: three conditions measured on six
  subjects were answered with p = 0.0121 and `sample_sizes` [3, 6], where the test of the three
  conditions gives p = 0.0025 and `sample_sizes` [6, 3]. The two pages that run the test send
  `measurements` with one row for each subject.
- **Until it is fixed:** send `measurements` with one row for each subject, and read
  `sample_sizes` in the answer: the first number is the number of subjects.

## Closing an account

### The e-mail address, the saved projects and the receipts are kept

- **Where:** "Close my account" on `/privacy-settings`.
- **What happens:** the account is closed and its data are deleted or anonymised as the dialog
  lists. Two things are kept, and the dialog and the Privacy & data page say so: the e-mail
  address stays in the database, because it is also the username, and saved projects and receipts
  are not deleted and stay linked to the deactivated account.
- **Until it is fixed:** the software has no tool that removes the address, the projects or the
  receipts. One is planned for after version 1.3.0.
