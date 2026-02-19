#' @title StickForStats API Client
#'
#' @description
#' R6 class providing access to the StickForStats REST API. Wraps all
#' endpoints under `/api/v1/` with idiomatic R methods. Supports Guardian
#' assumption validation, autonomous analysis, manuscript review, and
#' 50-digit precision calculations.
#'
#' @details
#' The client uses `httr2` for HTTP communication. Authentication is handled
#' via either a user token (`Authorization: Token <key>`) or a platform API
#' key (`X-API-Key: <key>`).
#'
#' @examples
#' \dontrun{
#' # Create a client
#' client <- StickForStats$new(api_key = "tok_abc123")
#'
#' # Run a t-test
#' result <- client$ttest(
#'   data = list(control = c(1.2, 3.4, 5.1), treatment = c(5.6, 7.8, 9.2))
#' )
#'
#' # Descriptive statistics
#' desc <- client$descriptive(data = c(10, 20, 30, 40, 50))
#'
#' # Check API health
#' client$health()
#' }
#'
#' @importFrom R6 R6Class
#' @importFrom httr2 request req_method req_headers req_body_json
#'   req_body_multipart req_timeout req_user_agent req_perform
#'   resp_status resp_body_json resp_body_string
#' @importFrom jsonlite toJSON fromJSON
#' @export
StickForStats <- R6::R6Class(
  classname = "StickForStats",

  public = list(

    #' @description
    #' Create a new StickForStats API client.
    #'
    #' @param base_url Character. Base URL of the API including the `/api/v1`
    #'   prefix. Defaults to `"http://localhost:8000/api/v1"`.
    #' @param api_key Character or NULL. Authentication token.
    #' @param timeout Numeric. Request timeout in seconds. Default 60.
    #' @param platform_key Logical. If TRUE, send `api_key` via `X-API-Key`
    #'   header instead of `Authorization: Token`.
    #' @return A new `StickForStats` object.
    initialize = function(base_url = "http://localhost:8000/api/v1",
                          api_key = NULL,
                          timeout = 60,
                          platform_key = FALSE) {
      private$base_url <- sub("/$", "", base_url)
      private$api_key <- api_key
      private$timeout_secs <- timeout
      private$platform_key <- platform_key
    },

    #' @description Print the client object.
    #' @param ... Ignored.
    print = function(...) {
      masked <- if (is.null(private$api_key)) {
        "NULL"
      } else {
        key <- private$api_key
        if (nchar(key) > 8) {
          paste0(substr(key, 1, 4), "...", substr(key, nchar(key) - 3, nchar(key)))
        } else {
          "****"
        }
      }
      cat("<StickForStats>\n")
      cat("  Base URL:", private$base_url, "\n")
      cat("  API Key: ", masked, "\n")
      cat("  Timeout: ", private$timeout_secs, "s\n")
      invisible(self)
    },

    # ------------------------------------------------------------------
    # Health check
    # ------------------------------------------------------------------

    #' @description
    #' Check API health status.
    #'
    #' @return A list with health status information.
    health = function() {
      private$.request("GET", "health/")
    },

    # ------------------------------------------------------------------
    # Statistical Tests
    # ------------------------------------------------------------------

    #' @description
    #' Perform an independent or paired-samples t-test.
    #'
    #' @param data Named list of numeric vectors (e.g.
    #'   `list(control = c(1,2,3), treatment = c(4,5,6))`), or a data.frame.
    #' @param groups Character vector. Explicit group names to compare.
    #'   Defaults to the first two keys/columns of `data`.
    #' @param paired Logical. Whether to run a paired-samples t-test.
    #' @param alpha Numeric. Significance level (default 0.05).
    #' @param alternative Character. `"two-sided"`, `"less"`, or `"greater"`.
    #' @param ... Additional parameters passed to the API.
    #' @return A list with class `"sfs_result"` containing t-test results.
    ttest = function(data, groups = NULL, paired = FALSE,
                     alpha = 0.05, alternative = "two-sided", ...) {
      payload <- list(
        data = private$.prepare_data(data),
        paired = paired,
        alpha = alpha,
        alternative = alternative
      )
      if (!is.null(groups)) payload$groups <- groups
      extras <- list(...)
      payload <- c(payload, extras)

      result <- private$.request("POST", "stats/ttest/", body = payload)
      structure(result, class = c("sfs_result", "sfs_ttest", "list"))
    },

    #' @description
    #' Perform a one-way (or repeated-measures / MANOVA) ANOVA.
    #'
    #' @param data Named list of numeric vectors or a data.frame.
    #' @param groups Character vector. Subset of groups to compare.
    #' @param alpha Numeric. Significance level.
    #' @param anova_type Character. `"one-way"`, `"repeated-measures"`, or
    #'   `"manova"`.
    #' @param post_hoc Character. Post-hoc method: `"tukey"`, `"bonferroni"`,
    #'   `"scheffe"`.
    #' @param ... Additional parameters passed to the API.
    #' @return A list with class `"sfs_result"` containing ANOVA results.
    anova = function(data, groups = NULL, alpha = 0.05,
                     anova_type = "one-way", post_hoc = "tukey", ...) {
      payload <- list(
        data = private$.prepare_data(data),
        alpha = alpha,
        anova_type = anova_type,
        post_hoc = post_hoc
      )
      if (!is.null(groups)) payload$groups <- groups
      extras <- list(...)
      payload <- c(payload, extras)

      result <- private$.request("POST", "stats/anova/", body = payload)
      structure(result, class = c("sfs_result", "sfs_anova", "list"))
    },

    #' @description
    #' Compute a correlation coefficient with significance test.
    #'
    #' @param x Numeric vector.
    #' @param y Numeric vector.
    #' @param method Character. `"pearson"`, `"spearman"`, or `"kendall"`.
    #' @param alpha Numeric. Significance level for confidence interval.
    #' @param ... Additional parameters passed to the API.
    #' @return A list with class `"sfs_result"` containing correlation results.
    correlation = function(x, y, method = "pearson", alpha = 0.05, ...) {
      payload <- list(
        x = as.numeric(x),
        y = as.numeric(y),
        method = method,
        alpha = alpha
      )
      extras <- list(...)
      payload <- c(payload, extras)

      result <- private$.request("POST", "stats/correlation/", body = payload)
      structure(result, class = c("sfs_result", "sfs_correlation", "list"))
    },

    #' @description
    #' Fit a regression model.
    #'
    #' @param data A data.frame or named list of numeric vectors (column-oriented).
    #' @param dependent Character. Name of the dependent variable.
    #' @param predictors Character vector. Names of predictor variables.
    #' @param type Character. Regression type: `"linear"`, `"multiple"`,
    #'   `"polynomial"`, `"logistic"`, `"ridge"`, or `"lasso"`.
    #' @param alpha Numeric. Significance level.
    #' @param ... Additional parameters passed to the API.
    #' @return A list with class `"sfs_result"` containing regression results.
    regression = function(data, dependent, predictors,
                          type = "linear", alpha = 0.05, ...) {
      payload <- list(
        data = private$.prepare_data(data),
        dependent = dependent,
        predictors = predictors,
        regression_type = type,
        alpha = alpha
      )
      extras <- list(...)
      payload <- c(payload, extras)

      result <- private$.request("POST", "stats/regression/", body = payload)
      structure(result, class = c("sfs_result", "sfs_regression", "list"))
    },

    #' @description
    #' Compute descriptive statistics (mean, median, SD, etc.).
    #'
    #' @param data Numeric vector, named list, or data.frame.
    #' @param ... Additional parameters passed to the API.
    #' @return A list with class `"sfs_result"` containing descriptive statistics.
    descriptive = function(data, ...) {
      if (is.data.frame(data)) {
        payload_data <- private$.prepare_data(data)
      } else if (is.numeric(data)) {
        payload_data <- as.numeric(data)
      } else {
        payload_data <- data
      }
      payload <- list(data = payload_data)
      extras <- list(...)
      payload <- c(payload, extras)

      result <- private$.request("POST", "stats/descriptive/", body = payload)
      structure(result, class = c("sfs_result", "sfs_descriptive", "list"))
    },

    # ------------------------------------------------------------------
    # Autonomous Intelligence
    # ------------------------------------------------------------------

    #' @description
    #' Smart profiling -- automatically detect variable types, distributions,
    #' and recommended analyses.
    #'
    #' @param data A data.frame or named list of vectors.
    #' @param ... Additional parameters passed to the API.
    #' @return A list with class `"sfs_result"` containing profile results.
    profile = function(data, ...) {
      payload <- list(data = private$.prepare_data(data))
      extras <- list(...)
      payload <- c(payload, extras)

      result <- private$.request("POST", "autonomous/profile/", body = payload)
      structure(result, class = c("sfs_result", "sfs_profile", "list"))
    },

    #' @description
    #' Natural-language query -- ask a question about your data.
    #'
    #' @param question Character. Plain-English research question.
    #' @param data A data.frame or named list.
    #' @param alpha Numeric. Significance level.
    #' @param ... Additional parameters passed to the API.
    #' @return A list with class `"sfs_result"` containing query results.
    query = function(question, data, alpha = 0.05, ...) {
      payload <- list(
        question = question,
        data = private$.prepare_data(data),
        alpha = alpha
      )
      extras <- list(...)
      payload <- c(payload, extras)

      result <- private$.request("POST", "autonomous/query/", body = payload)
      structure(result, class = c("sfs_result", "sfs_query", "list"))
    },

    #' @description
    #' Guardian cascade -- run assumption checks and automatically fall back
    #' to nonparametric alternatives when violations are detected.
    #'
    #' @param data A data.frame or named list.
    #' @param test Character. Requested test (e.g. `"ttest"`).
    #' @param alpha Numeric. Significance level.
    #' @param ... Additional parameters passed to the API.
    #' @return A list with class `"sfs_result"` containing cascade results.
    cascade = function(data, test, alpha = 0.05, ...) {
      payload <- list(
        data = private$.prepare_data(data),
        test = test,
        alpha = alpha
      )
      extras <- list(...)
      payload <- c(payload, extras)

      result <- private$.request("POST", "autonomous/cascade/", body = payload)
      structure(result, class = c("sfs_result", "sfs_cascade", "list"))
    },

    #' @description
    #' Translate statistical results into plain language.
    #'
    #' @param results List. Raw statistical results from any test endpoint.
    #' @param audience Character. Target audience: `"general"`, `"academic"`,
    #'   or `"technical"`.
    #' @param ... Additional parameters passed to the API.
    #' @return A list with class `"sfs_result"` containing translated results.
    translate = function(results, audience = "general", ...) {
      payload <- list(
        results = results,
        audience = audience
      )
      extras <- list(...)
      payload <- c(payload, extras)

      result <- private$.request("POST", "autonomous/translate/", body = payload)
      structure(result, class = c("sfs_result", "sfs_translate", "list"))
    },

    # ------------------------------------------------------------------
    # Manuscript Review
    # ------------------------------------------------------------------

    #' @description
    #' Comprehensive manuscript analysis -- extract, verify, and score
    #' statistical claims in an academic paper.
    #'
    #' @param file_path Character. Path to the manuscript file (PDF, DOCX,
    #'   TeX, etc.).
    #' @param field Character. Research field for domain-specific checks
    #'   (e.g. `"psychology"`, `"medicine"`, `"economics"`).
    #' @param alpha Numeric. Significance level for verification.
    #' @param ... Additional parameters passed to the API.
    #' @return A list with class `"sfs_result"` containing manuscript analysis.
    manuscript_analyze = function(file_path, field = "general",
                                  alpha = 0.05, ...) {
      if (!file.exists(file_path)) {
        stop("File not found: ", file_path, call. = FALSE)
      }
      result <- private$.upload("manuscript/analyze/", file_path,
                                 fields = list(field = field,
                                               alpha = as.character(alpha), ...))
      structure(result, class = c("sfs_result", "sfs_manuscript", "list"))
    },

    #' @description
    #' Parse a manuscript into structured sections, tables, and figures.
    #'
    #' @param file_path Character. Path to the manuscript file.
    #' @param ... Additional parameters passed to the API.
    #' @return A list with class `"sfs_result"` containing parse results.
    manuscript_parse = function(file_path, ...) {
      if (!file.exists(file_path)) {
        stop("File not found: ", file_path, call. = FALSE)
      }
      result <- private$.upload("manuscript/parse/", file_path,
                                 fields = list(...))
      structure(result, class = c("sfs_result", "sfs_manuscript_parse", "list"))
    },

    #' @description
    #' Extract statistical claims from a manuscript.
    #'
    #' @param file_path Character. Path to the manuscript file.
    #' @param ... Additional parameters passed to the API.
    #' @return A list with class `"sfs_result"` containing extracted claims.
    manuscript_claims = function(file_path, ...) {
      if (!file.exists(file_path)) {
        stop("File not found: ", file_path, call. = FALSE)
      }
      result <- private$.upload("manuscript/claims/", file_path,
                                 fields = list(...))
      structure(result, class = c("sfs_result", "sfs_manuscript_claims", "list"))
    },

    #' @description
    #' Check internal consistency of statistical claims in a manuscript.
    #'
    #' @param file_path Character. Path to the manuscript file.
    #' @param alpha Numeric. Significance level.
    #' @param ... Additional parameters passed to the API.
    #' @return A list with class `"sfs_result"` containing consistency report.
    manuscript_consistency = function(file_path, alpha = 0.05, ...) {
      if (!file.exists(file_path)) {
        stop("File not found: ", file_path, call. = FALSE)
      }
      result <- private$.upload("manuscript/consistency/", file_path,
                                 fields = list(alpha = as.character(alpha), ...))
      structure(result, class = c("sfs_result", "sfs_manuscript_consistency", "list"))
    },

    # ------------------------------------------------------------------
    # Usage / Info
    # ------------------------------------------------------------------

    #' @description
    #' Get platform usage dashboard.
    #'
    #' @return A list with usage information.
    usage = function() {
      private$.request("GET", "platform/usage/")
    }
  ),

  private = list(
    base_url = NULL,
    api_key = NULL,
    timeout_secs = NULL,
    platform_key = NULL,

    # Build the base httr2 request with common settings
    .base_request = function(endpoint) {
      url <- paste0(private$base_url, "/", sub("^/", "", endpoint))

      req <- httr2::request(url)
      req <- httr2::req_user_agent(req, "stickforstats-r/0.1.0")
      req <- httr2::req_timeout(req, private$timeout_secs)

      # Authentication headers
      if (!is.null(private$api_key)) {
        if (private$platform_key) {
          req <- httr2::req_headers(req, `X-API-Key` = private$api_key)
        } else {
          req <- httr2::req_headers(req,
            Authorization = paste("Token", private$api_key)
          )
        }
      }

      req <- httr2::req_headers(req, Accept = "application/json")
      req
    },

    # Execute a JSON API request
    .request = function(method, endpoint, body = NULL) {
      req <- private$.base_request(endpoint)
      req <- httr2::req_method(req, method)

      if (!is.null(body)) {
        req <- httr2::req_body_json(req, body)
      }

      resp <- tryCatch(
        httr2::req_perform(req),
        error = function(e) {
          # httr2 throws errors for HTTP failures by default
          # Re-throw with a clearer message
          stop(
            sprintf("StickForStats API request failed [%s %s]: %s",
                    method, endpoint, conditionMessage(e)),
            call. = FALSE
          )
        }
      )

      private$.parse_response(resp)
    },

    # Execute a file upload (multipart/form-data)
    .upload = function(endpoint, file_path, fields = list()) {
      req <- private$.base_request(endpoint)
      req <- httr2::req_method(req, "POST")

      # Build multipart body
      # The file argument uses curl::form_file()
      parts <- c(
        list(file = curl::form_file(file_path)),
        fields
      )
      req <- httr2::req_body_multipart(req, !!!parts)

      resp <- tryCatch(
        httr2::req_perform(req),
        error = function(e) {
          stop(
            sprintf("StickForStats API upload failed [%s]: %s",
                    endpoint, conditionMessage(e)),
            call. = FALSE
          )
        }
      )

      private$.parse_response(resp)
    },

    # Parse an httr2 response into an R list
    .parse_response = function(resp) {
      status <- httr2::resp_status(resp)

      if (status == 204L) {
        return(list())
      }

      body <- tryCatch(
        httr2::resp_body_json(resp),
        error = function(e) {
          list(raw_body = httr2::resp_body_string(resp))
        }
      )

      if (status >= 400L) {
        detail <- body$detail %||% body$error %||%
          paste("API error (HTTP", status, ")")
        stop(
          sprintf("StickForStats API error (HTTP %d): %s", status, detail),
          call. = FALSE
        )
      }

      body
    },

    # Convert data.frame to column-oriented list for the API
    .prepare_data = function(data) {
      if (is.data.frame(data)) {
        return(df_to_columns(data))
      }
      if (is.list(data)) {
        return(data)
      }
      # Scalar/vector -- wrap as-is
      data
    }
  )
)
