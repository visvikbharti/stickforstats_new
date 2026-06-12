#!/usr/bin/env Rscript
# Head-to-head baseline: run the statcheck R package (Nuijten et al. 2016) on the
# SAME 20-article corpus used to evaluate the StickForStats retrospective-
# verification engine, so the manuscript can report agreement against the field
# standard rather than only self-consistency.
#
# Output:
#   manuscript_validation/statcheck_results.csv  (per-statistic statcheck output)
#   stdout summary (totals + per-file counts)
#
# Usage:  Rscript statcheck_baseline.R

suppressMessages(library(statcheck))

corpus_dir <- "manuscript_validation/corpus"
files <- sort(list.files(corpus_dir, pattern = "\\.txt$", full.names = TRUE))
stopifnot(length(files) == 20)

texts <- vapply(files, function(f) paste(readLines(f, warn = FALSE), collapse = "\n"),
                character(1))
names(texts) <- basename(files)

# statcheck extracts APA-style inline stats (t, F, r, chi2, Q, Z), recomputes p,
# and flags Error (recomputed inconsistent with reported) + DecisionError (the
# two fall on opposite sides of alpha).
res <- statcheck(texts, messages = FALSE)

if (is.null(res) || nrow(res) == 0) {
  cat("statcheck extracted 0 statistics from the corpus.\n")
  quit(status = 0)
}

# Normalise the Source column to the file name (statcheck appends an index).
# statcheck 1.5.0 output columns are lowercase snake_case:
#   source | test_type | df1 | df2 | test_comp | test_value | p_comp |
#   reported_p | computed_p | raw | error | decision_error | ...
res$file <- sub("\\.txt.*$", ".txt", res$source)

write.csv(res, "manuscript_validation/statcheck_results.csv", row.names = FALSE)

n_extracted <- nrow(res)
n_error <- sum(res$error, na.rm = TRUE)
n_decision <- sum(res$decision_error, na.rm = TRUE)

cat("=================================================================\n")
cat("statcheck", as.character(packageVersion("statcheck")),
    "on the 20-article StickForStats corpus\n")
cat("=================================================================\n")
cat(sprintf("Statistics extracted by statcheck : %d\n", n_extracted))
cat(sprintf("Inconsistencies (error == TRUE)   : %d\n", n_error))
cat(sprintf("Decision errors (cross alpha)     : %d\n", n_decision))
cat("\nPer-file (file : extracted / errors / decision-errors):\n")
agg <- aggregate(cbind(error, decision_error) ~ file, data = res,
                 FUN = function(x) sum(x, na.rm = TRUE))
cnt <- as.data.frame(table(res$file)); names(cnt) <- c("file", "n")
m <- merge(cnt, agg, by = "file", all = TRUE)
m[is.na(m)] <- 0
for (i in seq_len(nrow(m))) {
  cat(sprintf("  %-16s : %3d / %d / %d\n", m$file[i], m$n[i], m$error[i], m$decision_error[i]))
}
cat("\nStat types extracted:\n")
print(table(res$test_type))
