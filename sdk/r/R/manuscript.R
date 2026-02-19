#' Manuscript Review Wrapper Functions
#'
#' File upload functions for manuscript analysis, parsing, claim extraction,
#' and internal consistency checking. These wrap the StickForStats Manuscript
#' Review endpoints.
#'
#' @name manuscript-wrappers
NULL

#' Analyze a manuscript via StickForStats API
#'
#' Comprehensive manuscript analysis: extract, verify, and score statistical
#' claims in an academic paper. Supports PDF, DOCX, TeX, and plain text.
#'
#' @param file_path Character. Path to the manuscript file.
#' @param field Character. Research field for domain-specific checks.
#'   Examples: `"general"`, `"psychology"`, `"medicine"`, `"economics"`,
#'   `"education"`, `"biology"`.
#' @param alpha Numeric. Significance level for claim verification.
#' @param ... Additional parameters passed to the API.
#' @param client A `StickForStats` R6 object. If NULL, uses [sfs_default_client()].
#'
#' @return A list with class `"sfs_result"` containing the manuscript analysis
#'   report including identified claims, verification status, and overall
#'   quality score.
#'
#' @examples
#' \dontrun{
#' report <- sfs_manuscript_analyze(
#'   "~/papers/draft.pdf",
#'   field = "psychology",
#'   alpha = 0.05
#' )
#' print(report)
#' }
#'
#' @export
sfs_manuscript_analyze <- function(file_path, field = "general",
                                    alpha = 0.05, ..., client = NULL) {
  client <- client %||% sfs_default_client()
  client$manuscript_analyze(file_path = file_path, field = field,
                            alpha = alpha, ...)
}


#' Parse a manuscript into structured sections
#'
#' Extract structured content from a manuscript including sections, tables,
#' figures, and statistical statements.
#'
#' @param file_path Character. Path to the manuscript file.
#' @param ... Additional parameters passed to the API.
#' @param client A `StickForStats` R6 object. If NULL, uses [sfs_default_client()].
#'
#' @return A list with class `"sfs_result"` containing parsed manuscript structure.
#'
#' @examples
#' \dontrun{
#' parsed <- sfs_manuscript_parse("~/papers/draft.pdf")
#' names(parsed)
#' }
#'
#' @export
sfs_manuscript_parse <- function(file_path, ..., client = NULL) {
  client <- client %||% sfs_default_client()
  client$manuscript_parse(file_path = file_path, ...)
}


#' Extract statistical claims from a manuscript
#'
#' Identify and extract all statistical claims, p-values, effect sizes,
#' confidence intervals, and test references from a manuscript.
#'
#' @param file_path Character. Path to the manuscript file.
#' @param ... Additional parameters passed to the API.
#' @param client A `StickForStats` R6 object. If NULL, uses [sfs_default_client()].
#'
#' @return A list with class `"sfs_result"` containing extracted claims.
#'
#' @examples
#' \dontrun{
#' claims <- sfs_manuscript_claims("~/papers/draft.pdf")
#' }
#'
#' @export
sfs_manuscript_claims <- function(file_path, ..., client = NULL) {
  client <- client %||% sfs_default_client()
  client$manuscript_claims(file_path = file_path, ...)
}


#' Check manuscript internal consistency
#'
#' Verify that statistical claims within a manuscript are internally
#' consistent (e.g. reported df, test statistics, and p-values agree).
#'
#' @param file_path Character. Path to the manuscript file.
#' @param alpha Numeric. Significance level.
#' @param ... Additional parameters passed to the API.
#' @param client A `StickForStats` R6 object. If NULL, uses [sfs_default_client()].
#'
#' @return A list with class `"sfs_result"` containing consistency report.
#'
#' @examples
#' \dontrun{
#' consistency <- sfs_manuscript_consistency("~/papers/draft.pdf")
#' }
#'
#' @export
sfs_manuscript_consistency <- function(file_path, alpha = 0.05,
                                       ..., client = NULL) {
  client <- client %||% sfs_default_client()
  client$manuscript_consistency(file_path = file_path, alpha = alpha, ...)
}
