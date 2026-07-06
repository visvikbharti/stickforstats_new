#!/usr/bin/env Rscript
# Part B helper: run edgeR (QL F-test) and DESeq2 on one simulated count matrix.
# Usage: Rscript calibration_partB_rmethods.R counts.csv groups.csv out.csv
# counts.csv: genes x samples, first column = gene id (header row = sample ids)
# groups.csv: one column `group` (A/B), one row per sample, sample order == counts columns
# out.csv:    gene, edger_padj, deseq_padj  (same gene order as counts.csv)

suppressMessages({library(edgeR); library(DESeq2)})

args <- commandArgs(trailingOnly = TRUE)
counts_file <- args[1]; groups_file <- args[2]; out_file <- args[3]

counts <- as.matrix(read.csv(counts_file, row.names = 1, check.names = FALSE))
storage.mode(counts) <- "integer"
grp <- factor(read.csv(groups_file, stringsAsFactors = FALSE)$group)
genes <- rownames(counts)

# ---- edgeR: QL pipeline ----
edger_padj <- rep(1, nrow(counts))
tryCatch({
  y <- DGEList(counts = counts, group = grp)
  y <- calcNormFactors(y)
  design <- model.matrix(~grp)
  y <- estimateDisp(y, design)
  fit <- glmQLFit(y, design)
  qlf <- glmQLFTest(fit, coef = 2)
  edger_padj <- p.adjust(qlf$table$PValue, method = "BH")
}, error = function(e) message("edgeR error: ", conditionMessage(e)))

# ---- DESeq2 ----
deseq_padj <- rep(1, nrow(counts))
tryCatch({
  coldata <- data.frame(grp = grp)
  dds <- DESeqDataSetFromMatrix(countData = counts, colData = coldata, design = ~grp)
  dds <- DESeq(dds, quiet = TRUE)
  res <- results(dds)
  padj <- res$padj
  padj[is.na(padj)] <- 1          # NA (independent filtering / outlier) -> not significant
  deseq_padj <- padj
}, error = function(e) message("DESeq2 error: ", conditionMessage(e)))

out <- data.frame(gene = genes, edger_padj = edger_padj, deseq_padj = deseq_padj,
                  stringsAsFactors = FALSE)
write.csv(out, out_file, row.names = FALSE)
