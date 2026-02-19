#' Standalone Wrapper Functions for Statistical Tests
#'
#' These functions provide a functional (non-OOP) interface to the StickForStats
#' API. Each function accepts an optional `client` argument; if omitted, a
#' default client is constructed from saved configuration (see
#' [sfs_configure()]).
#'
#' @name stats-wrappers
NULL

#' Perform a t-test via StickForStats API
#'
#' Independent or paired-samples t-test with Guardian assumption validation.
#'
#' @param data Named list of numeric vectors or a data.frame. For two-sample
#'   tests, provide two groups (e.g. `list(control = c(...), treatment = c(...))`).
#' @param groups Character vector. Explicit group names to compare.
#' @param paired Logical. Whether to run a paired-samples test.
#' @param alpha Numeric. Significance level (default 0.05).
#' @param alternative Character. `"two-sided"`, `"less"`, or `"greater"`.
#' @param ... Additional parameters passed to the API.
#' @param client A `StickForStats` R6 object. If NULL, uses [sfs_default_client()].
#'
#' @return A list with class `"sfs_result"` containing t-test results including
#'   test statistic, p-value, confidence interval, effect size, and Guardian
#'   validation report.
#'
#' @examples
#' \dontrun{
#' result <- sfs_ttest(
#'   data = list(control = c(5.1, 4.8, 5.3), treatment = c(7.2, 6.9, 7.5)),
#'   alpha = 0.05
#' )
#' print(result)
#' }
#'
#' @export
sfs_ttest <- function(data, groups = NULL, paired = FALSE,
                      alpha = 0.05, alternative = "two-sided",
                      ..., client = NULL) {
  client <- client %||% sfs_default_client()
  client$ttest(data = data, groups = groups, paired = paired,
               alpha = alpha, alternative = alternative, ...)
}


#' Perform an ANOVA via StickForStats API
#'
#' One-way, repeated-measures, or MANOVA with post-hoc tests and Guardian
#' validation.
#'
#' @param data Named list of numeric vectors or a data.frame.
#' @param groups Character vector. Subset of groups to compare.
#' @param alpha Numeric. Significance level.
#' @param anova_type Character. `"one-way"`, `"repeated-measures"`, or
#'   `"manova"`.
#' @param post_hoc Character. Post-hoc method: `"tukey"`, `"bonferroni"`,
#'   `"scheffe"`.
#' @param ... Additional parameters passed to the API.
#' @param client A `StickForStats` R6 object. If NULL, uses [sfs_default_client()].
#'
#' @return A list with class `"sfs_result"` containing ANOVA results.
#'
#' @examples
#' \dontrun{
#' result <- sfs_anova(
#'   data = list(A = c(1,2,3), B = c(4,5,6), C = c(7,8,9)),
#'   post_hoc = "tukey"
#' )
#' }
#'
#' @export
sfs_anova <- function(data, groups = NULL, alpha = 0.05,
                      anova_type = "one-way", post_hoc = "tukey",
                      ..., client = NULL) {
  client <- client %||% sfs_default_client()
  client$anova(data = data, groups = groups, alpha = alpha,
               anova_type = anova_type, post_hoc = post_hoc, ...)
}


#' Compute a correlation coefficient via StickForStats API
#'
#' Pearson, Spearman, or Kendall correlation with significance test.
#'
#' @param x Numeric vector.
#' @param y Numeric vector.
#' @param method Character. `"pearson"`, `"spearman"`, or `"kendall"`.
#' @param alpha Numeric. Significance level for confidence interval.
#' @param ... Additional parameters passed to the API.
#' @param client A `StickForStats` R6 object. If NULL, uses [sfs_default_client()].
#'
#' @return A list with class `"sfs_result"` containing correlation results.
#'
#' @examples
#' \dontrun{
#' result <- sfs_correlation(
#'   x = c(1, 2, 3, 4, 5),
#'   y = c(2, 4, 5, 4, 5),
#'   method = "pearson"
#' )
#' }
#'
#' @export
sfs_correlation <- function(x, y, method = "pearson", alpha = 0.05,
                            ..., client = NULL) {
  client <- client %||% sfs_default_client()
  client$correlation(x = x, y = y, method = method, alpha = alpha, ...)
}


#' Fit a regression model via StickForStats API
#'
#' Supports linear, multiple, polynomial, logistic, ridge, and lasso
#' regression with 50-digit precision.
#'
#' @param data A data.frame or named list of numeric vectors.
#' @param dependent Character. Name of the dependent variable.
#' @param predictors Character vector. Names of predictor variables.
#' @param type Character. Regression type: `"linear"`, `"multiple"`,
#'   `"polynomial"`, `"logistic"`, `"ridge"`, or `"lasso"`.
#' @param alpha Numeric. Significance level.
#' @param ... Additional parameters passed to the API.
#' @param client A `StickForStats` R6 object. If NULL, uses [sfs_default_client()].
#'
#' @return A list with class `"sfs_result"` containing regression results.
#'
#' @examples
#' \dontrun{
#' df <- data.frame(x = 1:10, y = 2 * (1:10) + rnorm(10))
#' result <- sfs_regression(df, dependent = "y", predictors = "x")
#' }
#'
#' @export
sfs_regression <- function(data, dependent, predictors,
                           type = "linear", alpha = 0.05,
                           ..., client = NULL) {
  client <- client %||% sfs_default_client()
  client$regression(data = data, dependent = dependent,
                    predictors = predictors, type = type,
                    alpha = alpha, ...)
}


#' Compute descriptive statistics via StickForStats API
#'
#' Mean, median, standard deviation, skewness, kurtosis, and more.
#'
#' @param data Numeric vector, named list, or data.frame.
#' @param ... Additional parameters passed to the API.
#' @param client A `StickForStats` R6 object. If NULL, uses [sfs_default_client()].
#'
#' @return A list with class `"sfs_result"` containing descriptive statistics.
#'
#' @examples
#' \dontrun{
#' result <- sfs_descriptive(c(10, 20, 30, 40, 50))
#' }
#'
#' @export
sfs_descriptive <- function(data, ..., client = NULL) {
  client <- client %||% sfs_default_client()
  client$descriptive(data = data, ...)
}
