#!/usr/bin/env Rscript
# Head-to-head baseline: run the statcheck R package (Nuijten et al. 2016) on the
# SAME 20-article corpus used to evaluate the StickForStats retrospective-
# verification engine, so the manuscript can report agreement against the field
# standard rather than only self-consistency.
#
# Output:
#   manuscript_validation/statcheck_results.csv  (per-statistic statcheck output)
#   stdout summary (versions, totals, per-file counts, and every flagged row)
#
# Usage:
#   Rscript statcheck_baseline.R                      # from paper/replication/
#   Rscript statcheck_baseline.R --out /tmp/sc.csv    # write elsewhere (leaves the
#                                                     # shipped artifact untouched)
#   Rscript statcheck_baseline.R --corpus DIR         # point at another corpus
#
# Reproducibility: statcheck is fully deterministic (no RNG). The versions below
# are printed on every run so a reader can confirm they match ours; a re-run on
# 2026-08-04 with R 4.4.1 / statcheck 1.5.0 produced a CSV byte-identical to the
# shipped one.

suppressMessages(library(statcheck))

args <- commandArgs(trailingOnly = TRUE)
arg_of <- function(flag, default) {
  i <- match(flag, args)
  if (is.na(i) || i == length(args)) default else args[i + 1L]
}
corpus_dir <- arg_of("--corpus", "manuscript_validation/corpus")
out_csv    <- arg_of("--out",    "manuscript_validation/statcheck_results.csv")

cat("=================================================================\n")
cat(R.version.string, "\n")
cat("statcheck", as.character(packageVersion("statcheck")), "\n")
cat("corpus :", normalizePath(corpus_dir, mustWork = FALSE), "\n")
cat("output :", out_csv, "\n")
cat("=================================================================\n\n")

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

write.csv(res, out_csv, row.names = FALSE)

n_extracted <- nrow(res)
n_error <- sum(res$error, na.rm = TRUE)
n_decision <- sum(res$decision_error, na.rm = TRUE)
n_files_covered <- length(unique(res$file))

cat(sprintf("Statistics extracted by statcheck : %d\n", n_extracted))
cat(sprintf("Inconsistencies (error == TRUE)   : %d  (%.2f%% of extracted)\n",
            n_error, 100 * n_error / n_extracted))
cat(sprintf("Decision errors (cross alpha)     : %d\n", n_decision))
cat(sprintf("Articles yielding >=1 statistic   : %d of %d\n", n_files_covered, length(files)))

zero <- setdiff(basename(files), unique(res$file))
if (length(zero)) {
  cat("Articles statcheck extracted NOTHING from (coverage gap, not agreement):\n")
  for (z in zero) cat("  ", z, "\n")
}

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

# Print every flagged row, so the 47 are auditable from stdout alone rather than
# only from the CSV. Each of these is adjudicated in
# manuscript_validation/STATCHECK_COMPARISON.md, section 8d.
cat(sprintf("\nAll %d flagged rows (file | raw | reported p | recomputed p | decision error):\n", n_error))
flag <- res[which(res$error), ]
flag <- flag[order(flag$file), ]
for (i in seq_len(nrow(flag))) {
  cat(sprintf("  %-18s %-46s rep=%-9s comp=%-11.5g dec=%s\n",
              flag$file[i], substr(flag$raw[i], 1, 46), format(flag$reported_p[i]),
              flag$computed_p[i], flag$decision_error[i]))
}
