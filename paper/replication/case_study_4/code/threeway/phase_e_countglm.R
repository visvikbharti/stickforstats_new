#!/usr/bin/env Rscript
# Phase E -- count-GLM reference arm for the three-way DE comparison.
#
# Runs the field-standard count-based models (DESeq2, edgeR QL F-test,
# limma-voom) on the IDENTICAL filtered raw-count matrix (27,221 genes x
# 91 samples) used by the naive-t-test and Guardian arms, with the same
# Primary_tumor-vs-Metastasis contrast.
#
# Reference level = Primary_tumor, so positive log2FC = UP in metastasis,
# matching the naive/Guardian convention (log2fc = mean_meta - mean_primary).
#
# Inputs  (exported from Python, identical filter as the other two arms):
#   outputs/threeway/filtered_raw_counts.csv   genes x samples, integer
#   outputs/threeway/sample_meta.csv           sample_title, tumor_type, ...
# Outputs:
#   outputs/threeway/deseq2_results.csv        ensembl_gene_id, baseMean, log2FoldChange, pvalue, padj
#   outputs/threeway/edger_results.csv         ensembl_gene_id, logFC, logCPM, PValue, FDR
#   outputs/threeway/limmavoom_results.csv     ensembl_gene_id, logFC, AveExpr, P.Value, adj.P.Val

suppressMessages({
  library(DESeq2)
  library(edgeR)
  library(limma)
})

OUT <- "outputs/threeway"

cat("Loading filtered raw counts + metadata ...\n")
counts <- read.csv(file.path(OUT, "filtered_raw_counts.csv"), row.names = 1, check.names = FALSE)
meta   <- read.csv(file.path(OUT, "sample_meta.csv"), row.names = 1, check.names = FALSE)
counts <- as.matrix(counts)
storage.mode(counts) <- "integer"

# Align metadata rows to count columns
meta <- meta[colnames(counts), , drop = FALSE]
stopifnot(all(rownames(meta) == colnames(counts)))
grp <- factor(meta$tumor_type, levels = c("Primary_tumor", "Metastasis"))  # ref = Primary
cat(sprintf("  %d genes x %d samples | groups: %s\n", nrow(counts), ncol(counts),
            paste(names(table(grp)), table(grp), sep = "=", collapse = ", ")))

## ---------------- DESeq2 (negative-binomial GLM, Wald) ----------------
cat("\n=== DESeq2 ===\n")
coldata <- data.frame(tumor_type = grp, row.names = colnames(counts))
dds <- DESeqDataSetFromMatrix(countData = counts, colData = coldata, design = ~ tumor_type)
dds <- DESeq(dds, quiet = TRUE)
res <- results(dds, contrast = c("tumor_type", "Metastasis", "Primary_tumor"))
deseq_df <- data.frame(
  ensembl_gene_id = rownames(res),
  baseMean        = res$baseMean,
  log2FoldChange  = res$log2FoldChange,
  pvalue          = res$pvalue,
  padj            = res$padj,
  stringsAsFactors = FALSE
)
write.csv(deseq_df, file.path(OUT, "deseq2_results.csv"), row.names = FALSE)
cat(sprintf("  DESeq2 significant (padj<0.05): %d ; NA-padj (filtered): %d\n",
            sum(deseq_df$padj < 0.05, na.rm = TRUE), sum(is.na(deseq_df$padj))))

## ---------------- edgeR (QL F-test) ----------------
cat("\n=== edgeR (glmQLFTest) ===\n")
y <- DGEList(counts = counts, group = grp)
y <- calcNormFactors(y)                       # TMM normalization
design <- model.matrix(~ grp)                 # coef 2 = Metastasis vs Primary
y <- estimateDisp(y, design)
fit <- glmQLFit(y, design)
qlf <- glmQLFTest(fit, coef = 2)
edger_tt <- topTags(qlf, n = Inf, sort.by = "none")$table
edger_df <- data.frame(
  ensembl_gene_id = rownames(edger_tt),
  logFC  = edger_tt$logFC,
  logCPM = edger_tt$logCPM,
  PValue = edger_tt$PValue,
  FDR    = edger_tt$FDR,
  stringsAsFactors = FALSE
)
write.csv(edger_df, file.path(OUT, "edger_results.csv"), row.names = FALSE)
cat(sprintf("  edgeR significant (FDR<0.05): %d\n", sum(edger_df$FDR < 0.05, na.rm = TRUE)))

## ---------------- limma-voom ----------------
cat("\n=== limma-voom ===\n")
v <- voom(y, design)                          # reuse TMM-normalized DGEList
vfit <- lmFit(v, design)
vfit <- eBayes(vfit)
voom_tt <- topTable(vfit, coef = 2, number = Inf, sort.by = "none")
voom_df <- data.frame(
  ensembl_gene_id = rownames(voom_tt),
  logFC     = voom_tt$logFC,
  AveExpr   = voom_tt$AveExpr,
  P.Value   = voom_tt$P.Value,
  adj.P.Val = voom_tt$adj.P.Val,
  stringsAsFactors = FALSE
)
write.csv(voom_df, file.path(OUT, "limmavoom_results.csv"), row.names = FALSE)
cat(sprintf("  limma-voom significant (adj.P.Val<0.05): %d\n", sum(voom_df$adj.P.Val < 0.05, na.rm = TRUE)))

cat("\nDone. Wrote deseq2_results.csv, edger_results.csv, limmavoom_results.csv\n")
