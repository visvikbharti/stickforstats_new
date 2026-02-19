#' Autonomous Intelligence Wrapper Functions
#'
#' AI-powered smart analysis functions that leverage the StickForStats
#' Autonomous Intelligence Layer. These provide data profiling, natural-language
#' queries, Guardian cascade execution, and plain-language translation.
#'
#' @name autonomous-wrappers
NULL

#' Smart data profiling via StickForStats API
#'
#' Automatically detect variable types, distributions, outliers, and
#' recommended analyses for a dataset.
#'
#' @param data A data.frame or named list of vectors.
#' @param ... Additional parameters passed to the API.
#' @param client A `StickForStats` R6 object. If NULL, uses [sfs_default_client()].
#'
#' @return A list with class `"sfs_result"` containing profile results with
#'   variable type detection, distribution analysis, and suggested tests.
#'
#' @examples
#' \dontrun{
#' df <- data.frame(
#'   age = c(25, 30, 35, 40, 45),
#'   score = c(80, 85, 90, 78, 92),
#'   group = c("A", "B", "A", "B", "A")
#' )
#' profile <- sfs_profile(df)
#' }
#'
#' @export
sfs_profile <- function(data, ..., client = NULL) {
  client <- client %||% sfs_default_client()
  client$profile(data = data, ...)
}


#' Natural-language data query via StickForStats API
#'
#' Ask a plain-English research question about your data and receive an
#' automated analysis with narrative interpretation. The Autonomous Intelligence
#' Layer selects appropriate tests, runs them with Guardian validation, and
#' explains the findings.
#'
#' @param question Character. Plain-English research question (e.g.
#'   `"Is there a significant difference between treatment groups?"`).
#' @param data A data.frame or named list.
#' @param alpha Numeric. Significance level for any tests that are run.
#' @param ... Additional parameters passed to the API.
#' @param client A `StickForStats` R6 object. If NULL, uses [sfs_default_client()].
#'
#' @return A list with class `"sfs_result"` containing the query results
#'   with selected test, results, and narrative interpretation.
#'
#' @examples
#' \dontrun{
#' df <- data.frame(
#'   treatment = c(5.1, 6.2, 5.8, 6.5, 7.1),
#'   control   = c(3.2, 3.8, 4.1, 3.5, 3.9)
#' )
#' answer <- sfs_query(
#'   "Is the treatment significantly better than control?",
#'   data = df
#' )
#' }
#'
#' @export
sfs_query <- function(question, data, alpha = 0.05, ..., client = NULL) {
  client <- client %||% sfs_default_client()
  client$query(question = question, data = data, alpha = alpha, ...)
}


#' Guardian cascade execution via StickForStats API
#'
#' Run assumption checks for a requested test and automatically fall back
#' to a nonparametric alternative when violations are detected.
#'
#' @param data A data.frame or named list.
#' @param test Character. Requested test name (e.g. `"ttest"`, `"anova"`).
#'   The Guardian will verify assumptions and may substitute a different test.
#' @param alpha Numeric. Significance level.
#' @param ... Additional parameters passed to the API.
#' @param client A `StickForStats` R6 object. If NULL, uses [sfs_default_client()].
#'
#' @return A list with class `"sfs_result"` containing cascade results with
#'   assumption checks, selected test, and results.
#'
#' @examples
#' \dontrun{
#' # Guardian will check normality/homogeneity and may switch to Mann-Whitney
#' result <- sfs_cascade(
#'   data = list(A = c(1,2,3,4), B = c(10,20,30,40)),
#'   test = "ttest"
#' )
#' }
#'
#' @export
sfs_cascade <- function(data, test, alpha = 0.05, ..., client = NULL) {
  client <- client %||% sfs_default_client()
  client$cascade(data = data, test = test, alpha = alpha, ...)
}


#' Translate statistical results to plain language
#'
#' Convert raw statistical output into clear, jargon-free explanations
#' suitable for different audiences.
#'
#' @param results List. Raw statistical results as returned by any test endpoint.
#' @param audience Character. Target audience: `"general"` (no jargon),
#'   `"academic"` (appropriate terminology), or `"technical"` (full detail).
#' @param ... Additional parameters passed to the API.
#' @param client A `StickForStats` R6 object. If NULL, uses [sfs_default_client()].
#'
#' @return A list with class `"sfs_result"` containing the translated explanation.
#'
#' @examples
#' \dontrun{
#' # First run a test
#' result <- sfs_ttest(list(a = c(1,2,3), b = c(4,5,6)))
#' # Then translate for a general audience
#' explanation <- sfs_translate(result, audience = "general")
#' }
#'
#' @export
sfs_translate <- function(results, audience = "general", ..., client = NULL) {
  client <- client %||% sfs_default_client()
  client$translate(results = results, audience = audience, ...)
}
