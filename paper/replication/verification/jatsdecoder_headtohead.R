suppressMessages(library(JATSdecoder))
SC  <- "/private/tmp/claude-501/-Users-vishalbharti-StickForStats-v1-0-Production/3157564b-ef0d-499c-884f-5aba2d9e835d/scratchpad"
XML <- file.path(SC, "jd_xml"); TXT <- file.path(SC, "jd_txt")
files <- list.files(XML, pattern="\\.xml$", full.names=FALSE)
cat("papers:", length(files), "\n")

counts <- function(obj) {
  ss <- obj$standardStats
  if (is.null(ss) || NROW(ss) == 0) return(c(std=0, chk=0))
  n <- NROW(ss)
  # `&&` on a VECTOR errors in R >= 4.3 -- the previous version of this line silently turned
  # every multi-result paper into NA via tryCatch, i.e. exactly the papers that matter.
  has_p <- if ("p" %in% colnames(ss)) !is.na(ss$p) else rep(FALSE, n)
  has_r <- if ("recalculatedP" %in% colnames(ss)) !is.na(ss$recalculatedP) else rep(FALSE, n)
  c(std = n, chk = sum(has_p & has_r, na.rm=TRUE))
}

res <- data.frame(pmcid=character(), xml_std=integer(), xml_chk=integer(),
                  txt_std=integer(), txt_chk=integer(), stringsAsFactors=FALSE)
for (i in seq_along(files)) {
  pid <- sub("\\.xml$", "", files[i])
  x <- tryCatch(counts(get.stats(file.path(XML, files[i]))), error=function(e) {cat("   ERR", pid, conditionMessage(e), "\n"); c(std=NA,chk=NA)})
  tf <- file.path(TXT, paste0(pid, ".txt"))
  y <- if (file.exists(tf)) {
         tryCatch(counts(get.stats(readLines(tf, warn=FALSE))), error=function(e) {cat("   ERR", pid, conditionMessage(e), "\n"); c(std=NA,chk=NA)})
       } else c(std=NA, chk=NA)
  res[nrow(res)+1, ] <- list(pid, x[["std"]], x[["chk"]], y[["std"]], y[["chk"]])
  if (i %% 50 == 0) cat("  ", i, "/", length(files), "\n", sep="")
}
write.csv(res, file.path(SC, "jd_results.csv"), row.names=FALSE)
cat("WROTE jd_results.csv  rows:", nrow(res), "\n")
