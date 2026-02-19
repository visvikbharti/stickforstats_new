#' Utility Functions for StickForStats R Client
#'
#' Helper functions for configuration management, data conversion, and
#' result formatting.
#'
#' @name utils
NULL


# ---------------------------------------------------------------------------
# Configuration management
# ---------------------------------------------------------------------------

#' Save StickForStats configuration
#'
#' Persist API connection settings to `~/.stickforstats/config.json` so that
#' standalone wrapper functions (e.g. [sfs_ttest()]) can create a client
#' automatically without explicit arguments.
#'
#' @param base_url Character. Base URL of the API (default
#'   `"http://localhost:8000/api/v1"`).
#' @param api_key Character or NULL. Authentication token.
#' @param platform_key Logical. If TRUE, use `X-API-Key` header.
#' @param timeout Numeric. Request timeout in seconds.
#'
#' @return Invisibly returns the path to the config file.
#'
#' @examples
#' \dontrun{
#' sfs_configure(
#'   base_url = "https://api.stickforstats.com/api/v1",
#'   api_key = "tok_abc123"
#' )
#' }
#'
#' @export
sfs_configure <- function(base_url = "http://localhost:8000/api/v1",
                           api_key = NULL,
                           platform_key = FALSE,
                           timeout = 60) {
  config_dir <- file.path(Sys.getenv("HOME"), ".stickforstats")
  if (!dir.exists(config_dir)) {
    dir.create(config_dir, recursive = TRUE, mode = "0700")
  }

  config <- list(
    base_url = base_url,
    api_key = api_key,
    platform_key = platform_key,
    timeout = timeout
  )

  config_path <- file.path(config_dir, "config.json")
  writeLines(
    jsonlite::toJSON(config, auto_unbox = TRUE, pretty = TRUE),
    config_path
  )

  # Restrict permissions on config file (contains API key)
  Sys.chmod(config_path, mode = "0600")

  message("Configuration saved to ", config_path)
  invisible(config_path)
}


#' Load saved StickForStats configuration
#'
#' Read connection settings from `~/.stickforstats/config.json`.
#'
#' @return A named list with `base_url`, `api_key`, `platform_key`, and
#'   `timeout` fields. Returns `NULL` if no config file exists.
#'
#' @examples
#' \dontrun{
#' config <- sfs_load_config()
#' if (!is.null(config)) {
#'   cat("Connected to:", config$base_url, "\n")
#' }
#' }
#'
#' @export
sfs_load_config <- function() {
  config_path <- file.path(Sys.getenv("HOME"), ".stickforstats", "config.json")

  if (!file.exists(config_path)) {
    return(NULL)
  }

  tryCatch(
    jsonlite::fromJSON(config_path, simplifyVector = TRUE),
    error = function(e) {
      warning("Failed to read config file: ", conditionMessage(e),
              call. = FALSE)
      NULL
    }
  )
}


#' Get or create a default StickForStats client
#'
#' Returns a cached client instance, creating one from saved configuration
#' if needed. The client is cached in the package namespace for reuse across
#' calls to standalone wrapper functions.
#'
#' @return A `StickForStats` R6 object.
#'
#' @details
#' The client is created from saved configuration (see [sfs_configure()]).
#' If no configuration exists, a client pointing to `http://localhost:8000/api/v1`
#' with no API key is returned.
#'
#' To reset the cached client (e.g. after changing configuration), call
#' `sfs_default_client(reset = TRUE)`.
#'
#' @param reset Logical. If TRUE, discard the cached client and create a
#'   new one.
#'
#' @export
sfs_default_client <- function(reset = FALSE) {
  env <- sfs_client_env()

  if (reset || is.null(env$client)) {
    config <- sfs_load_config()
    if (is.null(config)) {
      env$client <- StickForStats$new()
    } else {
      env$client <- StickForStats$new(
        base_url = config$base_url %||% "http://localhost:8000/api/v1",
        api_key = config$api_key,
        platform_key = isTRUE(config$platform_key),
        timeout = config$timeout %||% 60
      )
    }
  }

  env$client
}

# Internal environment for caching the default client
sfs_client_env <- function() {
  pkg_env <- environment(sfs_client_env)
  if (is.null(pkg_env$.sfs_cache)) {
    pkg_env$.sfs_cache <- new.env(parent = emptyenv())
    pkg_env$.sfs_cache$client <- NULL
  }
  pkg_env$.sfs_cache
}


# ---------------------------------------------------------------------------
# Data conversion helpers
# ---------------------------------------------------------------------------

#' Convert a data.frame to row-oriented records
#'
#' Transforms a data.frame into a list of named lists (one per row),
#' suitable for APIs that expect row-oriented JSON.
#'
#' @param df A data.frame.
#'
#' @return A list of named lists, where each inner list represents one row.
#'
#' @examples
#' df <- data.frame(x = 1:3, y = c("a", "b", "c"), stringsAsFactors = FALSE)
#' records <- df_to_records(df)
#' # records[[1]]  =>  list(x = 1, y = "a")
#'
#' @export
df_to_records <- function(df) {
  stopifnot(is.data.frame(df))
  lapply(seq_len(nrow(df)), function(i) {
    as.list(df[i, , drop = FALSE])
  })
}


#' Convert a data.frame to column-oriented list
#'
#' Transforms a data.frame into a named list of vectors (one per column),
#' suitable for the StickForStats API's column-oriented format.
#'
#' @param df A data.frame.
#'
#' @return A named list where each element is a vector of column values.
#'
#' @examples
#' df <- data.frame(x = 1:3, y = 4:6)
#' cols <- df_to_columns(df)
#' # cols  =>  list(x = c(1, 2, 3), y = c(4, 5, 6))
#'
#' @export
df_to_columns <- function(df) {
  stopifnot(is.data.frame(df))
  result <- as.list(df)
  # Convert factors to character
  lapply(result, function(col) {
    if (is.factor(col)) as.character(col) else col
  })
}


# ---------------------------------------------------------------------------
# Pretty printer for results
# ---------------------------------------------------------------------------

#' Print method for StickForStats results
#'
#' Provides a formatted console representation of API results, highlighting
#' key statistics and Guardian validation status.
#'
#' @param x An `sfs_result` object returned by any StickForStats function.
#' @param ... Additional arguments (ignored).
#'
#' @return Invisibly returns `x`.
#'
#' @export
print.sfs_result <- function(x, ...) {
  cat("=== StickForStats Result ===\n\n")

  # Detect result type from class
  subclass <- setdiff(class(x), c("sfs_result", "list"))
  if (length(subclass) > 0) {
    type_label <- sub("^sfs_", "", subclass[1])
    cat("Test type:", type_label, "\n\n")
  }

  # Print key statistics if present
  key_fields <- c("test_statistic", "t_statistic", "f_statistic",
                   "statistic", "p_value", "p_value_formatted",
                   "r", "coefficient", "correlation",
                   "effect_size", "cohens_d",
                   "confidence_interval", "ci_lower", "ci_upper",
                   "r_squared", "adj_r_squared",
                   "mean", "median", "sd", "n")

  printed_any <- FALSE
  for (field in key_fields) {
    if (!is.null(x[[field]])) {
      val <- x[[field]]
      if (is.list(val)) {
        val <- paste(names(val), "=", unlist(val), collapse = ", ")
      }
      cat(sprintf("  %-22s %s\n", paste0(field, ":"), paste(val, collapse = ", ")))
      printed_any <- TRUE
    }
  }

  if (printed_any) cat("\n")

  # Guardian report
  guardian <- x$guardian %||% x$guardian_report %||% x$guardian_validation
  if (!is.null(guardian)) {
    cat("--- Guardian Validation ---\n")
    confidence <- guardian$confidence %||% guardian$confidence_score
    if (!is.null(confidence)) {
      cat(sprintf("  Confidence: %.1f%%\n", confidence * 100))
    }
    violations <- guardian$violations
    if (is.list(violations) && length(violations) > 0) {
      cat(sprintf("  Violations: %d\n", length(violations)))
      for (v in violations) {
        severity <- v$severity %||% "unknown"
        msg <- v$message %||% v$description %||% ""
        cat(sprintf("    [%s] %s\n", toupper(severity), msg))
      }
    } else {
      cat("  No violations detected.\n")
    }
    cat("\n")
  }

  # If nothing was printed, fall back to str()
  if (!printed_any && is.null(guardian)) {
    cat("  (Full result structure)\n")
    utils::str(x, max.level = 2, give.attr = FALSE)
  }

  # Show available fields
  top_names <- names(x)
  if (length(top_names) > 0) {
    cat("Available fields:", paste(top_names, collapse = ", "), "\n")
  }

  invisible(x)
}
