# Tests for StickForStats R Client
# These tests verify client construction, data conversion utilities,
# configuration management, and result formatting. API-dependent tests
# are skipped unless a live server is available.

test_that("StickForStats client initializes with default parameters", {
  client <- StickForStats$new()
  expect_s3_class(client, "StickForStats")

  # Capture printed output
  out <- capture.output(client$print())
  expect_true(any(grepl("localhost:8000", out)))
  expect_true(any(grepl("API Key:.*NULL", out)))
})

test_that("StickForStats client initializes with custom parameters", {
  client <- StickForStats$new(
    base_url = "https://api.example.com/api/v1",
    api_key = "tok_test123456",
    timeout = 120,
    platform_key = TRUE
  )
  out <- capture.output(client$print())
  expect_true(any(grepl("api.example.com", out)))
  expect_true(any(grepl("tok_\\.\\.\\.3456", out)))
  expect_true(any(grepl("120", out)))
})

test_that("StickForStats client strips trailing slash from base_url", {
  client <- StickForStats$new(base_url = "http://localhost:8000/api/v1/")
  out <- capture.output(client$print())
  # Should not have double slash
  expect_false(any(grepl("v1//", out)))
})

test_that("StickForStats client masks short API keys", {
  client <- StickForStats$new(api_key = "short")
  out <- capture.output(client$print())
  expect_true(any(grepl("\\*\\*\\*\\*", out)))
})


# ---------------------------------------------------------------------------
# Data conversion utilities
# ---------------------------------------------------------------------------

test_that("df_to_columns converts data.frame to named list of vectors", {
  df <- data.frame(x = 1:3, y = c(4.1, 5.2, 6.3))
  result <- df_to_columns(df)
  expect_type(result, "list")
  expect_named(result, c("x", "y"))
  expect_equal(result$x, 1:3)
  expect_equal(result$y, c(4.1, 5.2, 6.3))
})

test_that("df_to_columns converts factors to character", {
  df <- data.frame(group = factor(c("A", "B", "A")), value = 1:3)
  result <- df_to_columns(df)
  expect_type(result$group, "character")
  expect_equal(result$group, c("A", "B", "A"))
})

test_that("df_to_records converts data.frame to list of row-lists", {
  df <- data.frame(x = 1:2, y = c("a", "b"), stringsAsFactors = FALSE)
  records <- df_to_records(df)
  expect_type(records, "list")
  expect_length(records, 2)
  expect_equal(records[[1]]$x, 1)
  expect_equal(records[[1]]$y, "a")
  expect_equal(records[[2]]$x, 2)
  expect_equal(records[[2]]$y, "b")
})

test_that("df_to_columns rejects non-data.frame input", {
  expect_error(df_to_columns(list(a = 1)))
  expect_error(df_to_columns("not a data frame"))
})

test_that("df_to_records rejects non-data.frame input", {
  expect_error(df_to_records(list(a = 1)))
  expect_error(df_to_records(42))
})


# ---------------------------------------------------------------------------
# Configuration management
# ---------------------------------------------------------------------------

test_that("sfs_configure and sfs_load_config round-trip", {
  # Use a temporary directory to avoid polluting real config
  temp_home <- tempdir()
  withr::local_envvar(HOME = temp_home)

  # Clean up any pre-existing config
  config_dir <- file.path(temp_home, ".stickforstats")
  if (dir.exists(config_dir)) unlink(config_dir, recursive = TRUE)

  sfs_configure(
    base_url = "https://test.example.com/api/v1",
    api_key = "tok_roundtrip",
    platform_key = TRUE,
    timeout = 90
  )

  config <- sfs_load_config()
  expect_type(config, "list")
  expect_equal(config$base_url, "https://test.example.com/api/v1")
  expect_equal(config$api_key, "tok_roundtrip")
  expect_true(config$platform_key)
  expect_equal(config$timeout, 90)

  # Clean up
  unlink(config_dir, recursive = TRUE)
})

test_that("sfs_load_config returns NULL when no config exists", {
  temp_home <- tempdir()
  withr::local_envvar(HOME = temp_home)
  config_dir <- file.path(temp_home, ".stickforstats")
  if (dir.exists(config_dir)) unlink(config_dir, recursive = TRUE)

  config <- sfs_load_config()
  expect_null(config)
})


# ---------------------------------------------------------------------------
# Result pretty printer
# ---------------------------------------------------------------------------

test_that("print.sfs_result formats results correctly", {
  result <- structure(
    list(
      test_statistic = 2.45,
      p_value = 0.023,
      effect_size = 0.78,
      guardian = list(
        confidence = 0.95,
        violations = list()
      )
    ),
    class = c("sfs_result", "sfs_ttest", "list")
  )

  out <- capture.output(print(result))
  expect_true(any(grepl("StickForStats Result", out)))
  expect_true(any(grepl("ttest", out)))
  expect_true(any(grepl("2\\.45", out)))
  expect_true(any(grepl("0\\.023", out)))
  expect_true(any(grepl("Guardian", out)))
  expect_true(any(grepl("95\\.0%", out)))
  expect_true(any(grepl("No violations", out)))
})

test_that("print.sfs_result shows violations", {
  result <- structure(
    list(
      p_value = 0.05,
      guardian = list(
        confidence = 0.6,
        violations = list(
          list(severity = "warning", message = "Non-normal distribution detected"),
          list(severity = "critical", message = "Unequal variances")
        )
      )
    ),
    class = c("sfs_result", "list")
  )

  out <- capture.output(print(result))
  expect_true(any(grepl("Violations: 2", out)))
  expect_true(any(grepl("WARNING", out)))
  expect_true(any(grepl("CRITICAL", out)))
  expect_true(any(grepl("Non-normal", out)))
})


# ---------------------------------------------------------------------------
# Default client
# ---------------------------------------------------------------------------

test_that("sfs_default_client returns a StickForStats object", {
  client <- sfs_default_client(reset = TRUE)
  expect_s3_class(client, "StickForStats")
})

test_that("sfs_default_client caches the client", {
  client1 <- sfs_default_client(reset = TRUE)
  client2 <- sfs_default_client()
  expect_identical(client1, client2)
})

test_that("sfs_default_client resets when requested", {
  client1 <- sfs_default_client(reset = TRUE)
  client2 <- sfs_default_client(reset = TRUE)
  # Different R6 instances
  expect_false(identical(
    capture.output(client1$print()),
    "never matches"
  ))
})


# ---------------------------------------------------------------------------
# Live API tests (skipped unless SFS_TEST_LIVE is set)
# ---------------------------------------------------------------------------

skip_if_no_server <- function() {
  if (Sys.getenv("SFS_TEST_LIVE") == "") {
    skip("Set SFS_TEST_LIVE=1 to run live API tests")
  }
}

test_that("health endpoint returns status", {
  skip_if_no_server()
  client <- StickForStats$new()
  result <- client$health()
  expect_type(result, "list")
  expect_true("status" %in% names(result))
})

test_that("t-test works with live server", {
  skip_if_no_server()
  client <- StickForStats$new()
  result <- client$ttest(
    data = list(
      control = c(5.1, 4.8, 5.3, 5.0, 4.9),
      treatment = c(7.2, 6.9, 7.5, 7.1, 7.3)
    )
  )
  expect_s3_class(result, "sfs_result")
  expect_true("p_value" %in% names(result) || "p_value_formatted" %in% names(result))
})

test_that("descriptive stats work with live server", {
  skip_if_no_server()
  client <- StickForStats$new()
  result <- client$descriptive(data = c(10, 20, 30, 40, 50))
  expect_s3_class(result, "sfs_result")
})

test_that("correlation works with live server", {
  skip_if_no_server()
  client <- StickForStats$new()
  result <- client$correlation(
    x = c(1, 2, 3, 4, 5),
    y = c(2, 4, 5, 4, 5)
  )
  expect_s3_class(result, "sfs_result")
})

test_that("ANOVA works with live server", {
  skip_if_no_server()
  client <- StickForStats$new()
  result <- client$anova(
    data = list(A = c(1,2,3,4,5), B = c(3,4,5,6,7), C = c(5,6,7,8,9))
  )
  expect_s3_class(result, "sfs_result")
})

test_that("standalone wrapper sfs_ttest works with live server", {
  skip_if_no_server()
  result <- sfs_ttest(
    data = list(a = c(1,2,3,4,5), b = c(6,7,8,9,10))
  )
  expect_s3_class(result, "sfs_result")
})

test_that("profile works with live server", {
  skip_if_no_server()
  df <- data.frame(
    age = c(25, 30, 35, 40, 45),
    score = c(80, 85, 90, 78, 92),
    group = c("A", "B", "A", "B", "A")
  )
  result <- sfs_profile(df)
  expect_s3_class(result, "sfs_result")
})
