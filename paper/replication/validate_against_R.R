#!/usr/bin/env Rscript
#' ============================================================================
#' R Cross-Validation for StickForStats JSS Paper
#' ============================================================================
#'
#' This script validates StickForStats results against R's statistical functions.
#' All results are compared against the Python/SciPy implementation.
#'
#' Author: Vishal Bharti / Claude Code
#' Date: 2026-01-27
#' R Version: 4.4.1
#'
#' Usage: Rscript validate_against_R.R
#' ============================================================================

cat("======================================================================\n")
cat("R CROSS-VALIDATION FOR STICKFORSTATS\n")
cat("======================================================================\n\n")

cat("R version:", R.version.string, "\n")
cat("Date:", as.character(Sys.Date()), "\n\n")

# Per-test outcome tracker. Populated by each test block below; the summary
# at the end emits the actual PASS/CHECK statuses instead of a hard-coded
# "EXACT agreement" sentence (which had drifted out of sync with reality).
results <- list()

# ============================================================================
# Test 1: Independent t-test
# ============================================================================
cat("----------------------------------------------------------------------\n")
cat("TEST 1: Independent t-test\n")
cat("----------------------------------------------------------------------\n")

group1 <- c(23.5, 25.1, 22.8, 24.3, 26.2, 23.9, 25.5, 24.1, 22.5, 25.8)
group2 <- c(28.3, 30.2, 27.5, 29.8, 31.0, 28.9, 30.5, 29.2, 27.8, 30.1)

result <- t.test(group1, group2, var.equal = TRUE)

cat("Data: group1 (n=10), group2 (n=10)\n")
cat(sprintf("t-statistic: %.15f\n", result$statistic))
cat(sprintf("p-value: %.15e\n", result$p.value))
cat(sprintf("df: %.1f\n", result$parameter))

# Expected from SciPy (re-computed 2026-05-07 against the actual group1/group2
# arrays above; the previous constants -9.681839102936346 and 1.465e-08 came
# from a different dataset and produced false |Δt|=0.6 / |Δp|=2.4e-08 mismatches
# even when R and SciPy actually agreed to 13 digits).
scipy_t <- -9.072158872735196
scipy_p <- 3.909949513199481e-08

cat(sprintf("\nComparison with SciPy:\n"))
cat(sprintf("  t-stat difference: %.2e\n", abs(result$statistic - scipy_t)))
cat(sprintf("  p-value difference: %.2e\n", abs(result$p.value - scipy_p)))

if (abs(result$statistic - scipy_t) < 1e-10 && abs(result$p.value - scipy_p) < 1e-15) {
  cat("  STATUS: PASS - Results match SciPy\n")
  results$ttest <- "PASS (|Δt| < 1e-10, |Δp| < 1e-15)"
} else {
  cat("  STATUS: MINOR DIFFERENCE (numerical precision)\n")
  results$ttest <- sprintf("CHECK (|Δt|=%.2e, |Δp|=%.2e)",
                            abs(result$statistic - scipy_t),
                            abs(result$p.value - scipy_p))
}

# ============================================================================
# Test 2: One-way ANOVA
# ============================================================================
cat("\n----------------------------------------------------------------------\n")
cat("TEST 2: One-way ANOVA\n")
cat("----------------------------------------------------------------------\n")

g1 <- c(4.5, 5.2, 4.8, 5.1, 4.9)
g2 <- c(6.2, 6.8, 6.5, 6.9, 6.4)
g3 <- c(8.1, 8.5, 8.3, 8.7, 8.2)

data <- data.frame(
  value = c(g1, g2, g3),
  group = factor(rep(c("A", "B", "C"), each = 5))
)

result <- aov(value ~ group, data = data)
summary_result <- summary(result)

F_stat <- summary_result[[1]]$`F value`[1]
p_val <- summary_result[[1]]$`Pr(>F)`[1]

cat("Data: 3 groups, n=5 each\n")
cat(sprintf("F-statistic: %.15f\n", F_stat))
cat(sprintf("p-value: %.15e\n", p_val))

# Expected from SciPy (re-computed 2026-05-07 against the g1/g2/g3 arrays above;
# the prior constants 155.40 and 2.64e-09 belonged to a different sample).
scipy_F <- 207.953703703702615
scipy_p_anova <- 4.863944929808180e-10

cat(sprintf("\nComparison with SciPy:\n"))
cat(sprintf("  F-stat difference: %.2e\n", abs(F_stat - scipy_F)))
cat(sprintf("  p-value difference: %.2e\n", abs(p_val - scipy_p_anova)))

if (abs(F_stat - scipy_F) < 1e-8) {
  cat("  STATUS: PASS - Results match SciPy\n")
  results$anova <- "PASS (|ΔF| < 1e-8)"
} else {
  cat("  STATUS: MINOR DIFFERENCE\n")
  results$anova <- sprintf("CHECK (|ΔF|=%.2e)", abs(F_stat - scipy_F))
}

# ============================================================================
# Test 3: Pearson Correlation
# ============================================================================
cat("\n----------------------------------------------------------------------\n")
cat("TEST 3: Pearson Correlation\n")
cat("----------------------------------------------------------------------\n")

x <- c(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
y <- c(2.1, 4.2, 5.8, 8.1, 9.9, 12.2, 14.0, 16.1, 17.9, 20.1)

result <- cor.test(x, y, method = "pearson")

cat("Data: x (1-10), y (linear relationship with noise)\n")
cat(sprintf("Pearson r: %.15f\n", result$estimate))
cat(sprintf("p-value: %.15e\n", result$p.value))

# Expected from SciPy (re-computed 2026-05-07 against the x/y arrays above;
# the prior constant 0.9997207 was from a slightly different y vector).
scipy_r <- 0.999752360038169
scipy_p_corr <- 1.644871238207087e-14

cat(sprintf("\nComparison with SciPy:\n"))
cat(sprintf("  r difference: %.2e\n", abs(result$estimate - scipy_r)))
cat(sprintf("  p-value difference: %.2e\n", abs(result$p.value - scipy_p_corr)))

if (abs(result$estimate - scipy_r) < 1e-14) {
  cat("  STATUS: PASS - Results match SciPy\n")
  results$pearson <- "PASS (|Δr| < 1e-14)"
} else {
  cat("  STATUS: MINOR DIFFERENCE\n")
  results$pearson <- sprintf("CHECK (|Δr|=%.2e)", abs(result$estimate - scipy_r))
}

# ============================================================================
# Test 4: Shapiro-Wilk Normality Test
# ============================================================================
cat("\n----------------------------------------------------------------------\n")
cat("TEST 4: Shapiro-Wilk Normality Test\n")
cat("----------------------------------------------------------------------\n")

# Non-normal data (exponential-like)
set.seed(42)
non_normal <- rexp(50, rate = 1)

result <- shapiro.test(non_normal)

cat("Data: Exponential distribution (n=50)\n")
cat(sprintf("W-statistic: %.15f\n", result$statistic))
cat(sprintf("p-value: %.15f\n", result$p.value))
cat(sprintf("Non-normality detected: %s\n", ifelse(result$p.value < 0.05, "YES", "NO")))
results$shapiro <- if (result$p.value < 0.05) {
  "PASS (rejected normality, as expected for exponential data)"
} else {
  "CHECK (failed to reject normality on exponential data)"
}

# ============================================================================
# Test 5: Levene's Test (using car package if available)
# ============================================================================
cat("\n----------------------------------------------------------------------\n")
cat("TEST 5: Variance Homogeneity (Levene's Test)\n")
cat("----------------------------------------------------------------------\n")

# Two groups with different variances
set.seed(42)
group_a <- rnorm(30, mean = 10, sd = 1)
group_b <- rnorm(30, mean = 10, sd = 2)

# Manual Levene's test using base R
levene_test <- function(y, group) {
  group <- as.factor(group)
  meds <- tapply(y, group, median)
  resp <- abs(y - meds[group])
  result <- anova(lm(resp ~ group))
  return(list(F = result$`F value`[1], p = result$`Pr(>F)`[1]))
}

groups <- factor(rep(c("A", "B"), each = 30))
all_data <- c(group_a, group_b)
lev_result <- levene_test(all_data, groups)

cat("Data: Two groups with variance ratio ~4:1\n")
cat(sprintf("Levene's F: %.6f\n", lev_result$F))
cat(sprintf("Levene's p: %.6f\n", lev_result$p))
cat(sprintf("Heterogeneity detected: %s\n", ifelse(lev_result$p < 0.05, "YES", "NO")))
results$levene <- if (lev_result$p < 0.05) {
  "PASS (rejected variance equality, as expected for 4:1 ratio)"
} else {
  "CHECK (failed to reject variance equality on 4:1 ratio data)"
}

# ============================================================================
# Test 6: Fisher's Iris Dataset (Case Study 1)
# ============================================================================
cat("\n----------------------------------------------------------------------\n")
cat("TEST 6: Fisher's Iris Dataset (Paper Case Study 1)\n")
cat("----------------------------------------------------------------------\n")

data(iris)

# ANOVA on sepal length by species
result <- aov(Sepal.Length ~ Species, data = iris)
summary_result <- summary(result)

F_stat <- summary_result[[1]]$`F value`[1]
p_val <- summary_result[[1]]$`Pr(>F)`[1]

cat("Dataset: Fisher's Iris (n=150)\n")
cat(sprintf("ANOVA F-statistic: %.2f\n", F_stat))
cat(sprintf("ANOVA p-value: %.2e\n", p_val))

# Levene's test
lev_result <- levene_test(iris$Sepal.Length, iris$Species)
cat(sprintf("Levene's F: %.2f\n", lev_result$F))
cat(sprintf("Levene's p: %.4f\n", lev_result$p))

# Paper claims: F=119.26, Levene p=0.002
cat(sprintf("\nPaper claims: F=119.26, Levene p~0.002\n"))
cat(sprintf("R results:   F=%.2f, Levene p=%.4f\n", F_stat, lev_result$p))

if (abs(F_stat - 119.26) < 0.1 && abs(lev_result$p - 0.002) < 0.001) {
  cat("STATUS: PASS - Matches paper claims\n")
  results$iris <- "PASS (F within 0.1 of paper, Levene p within 0.001)"
} else {
  cat("STATUS: CHECK - Minor differences\n")
  results$iris <- sprintf("CHECK (F=%.2f vs 119.26, Levene p=%.4f vs 0.002)",
                          F_stat, lev_result$p)
}

# ============================================================================
# Test 7: Wine Quality Dataset (Case Study 2)
# ============================================================================
cat("\n----------------------------------------------------------------------\n")
cat("TEST 7: Wine Quality - Correlation (Paper Case Study 2)\n")
cat("----------------------------------------------------------------------\n")

# Read wine data if available
wine_file <- "data/winequality-red.csv"
if (file.exists(wine_file)) {
  wine <- read.csv(wine_file, sep = ";")

  # Pearson correlation
  pearson_result <- cor.test(wine$alcohol, wine$quality, method = "pearson")
  spearman_result <- cor.test(wine$alcohol, wine$quality, method = "spearman")

  cat(sprintf("Dataset: UCI Red Wine (n=%d)\n", nrow(wine)))
  cat(sprintf("Pearson r: %.3f (p = %.2e)\n", pearson_result$estimate, pearson_result$p.value))
  cat(sprintf("Spearman rho: %.3f (p = %.2e)\n", spearman_result$estimate, spearman_result$p.value))

  # Paper claims: r=0.476, rho=0.479
  cat(sprintf("\nPaper claims: r=0.476, rho=0.479\n"))
  cat(sprintf("R results:   r=%.3f, rho=%.3f\n", pearson_result$estimate, spearman_result$estimate))

  if (abs(pearson_result$estimate - 0.476) < 0.001 && abs(spearman_result$estimate - 0.479) < 0.001) {
    cat("STATUS: PASS - Matches paper claims\n")
    results$wine <- "PASS (r within 0.001 of paper, ρ within 0.001)"
  } else {
    cat("STATUS: CHECK\n")
    results$wine <- sprintf("CHECK (r=%.3f vs 0.476, ρ=%.3f vs 0.479)",
                            pearson_result$estimate, spearman_result$estimate)
  }
} else {
  cat("Wine data file not found. Run Python validation first to download.\n")
  results$wine <- "SKIPPED (wine CSV not found at data/winequality-red.csv)"
}

# ============================================================================
# Summary
# ============================================================================
cat("\n======================================================================\n")
cat("R CROSS-VALIDATION SUMMARY\n")
cat("======================================================================\n\n")

# Print the actual outcome of each per-test check above. Replaces a
# previously hard-coded summary that always claimed "EXACT agreement",
# which could remain green even when an underlying check had failed.
test_labels <- list(
  ttest    = "1. t-test       ",
  anova    = "2. ANOVA        ",
  pearson  = "3. Pearson r    ",
  shapiro  = "4. Shapiro-Wilk ",
  levene   = "5. Levene's     ",
  iris     = "6. Iris ANOVA   ",
  wine     = "7. Wine Corr    "
)
for (key in names(test_labels)) {
  status <- if (!is.null(results[[key]])) results[[key]] else "MISSING (test block did not record an outcome)"
  cat(sprintf("%s: %s\n", test_labels[[key]], status))
}

# Overall conclusion based on what actually happened. PASS-only ⇒ green;
# any CHECK / SKIPPED / MISSING ⇒ partial.
all_pass <- all(grepl("^PASS", unlist(results)))
cat("\n")
if (all_pass) {
  cat("CONCLUSION: All checks passed --- StickForStats numerical results are\n")
  cat("            consistent with R for the test set above.\n")
} else {
  cat("CONCLUSION: Some checks did not return PASS. Review the per-test status\n")
  cat("            lines above before relying on the cross-validation result.\n")
}

cat("\n======================================================================\n")
cat("VALIDATION COMPLETE\n")
cat("======================================================================\n")
