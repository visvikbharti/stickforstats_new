#!/usr/bin/env Rscript
# Phase E -- independent R cross-check of the Python three-way metrics +
# figure generation (matplotlib is unusable in the local numpy-2 env).
# Reads the gene-level merged table and recomputes set sizes, category
# DE-rates, Group A/B Fisher enrichment, and naive-vs-Guardian MCC, using
# R's native fisher.test as an adversarial check on the Python stats.

OUT <- "outputs/threeway"
df <- read.csv(file.path(OUT, "E_gene_level_merged.csv"), stringsAsFactors = FALSE)

tb <- function(x) x %in% c("True", "TRUE", "T", TRUE)
naive <- tb(df$naive_sig); guard <- tb(df$guard_sig)
deseq <- tb(df$deseq_sig); edger <- tb(df$edger_sig); voom <- tb(df$voom_sig)
cons2 <- tb(df$consensus2)
cat_ <- df$category

cat("=== R cross-check: significant-set sizes ===\n")
for (nm in c("naive","guardian","DESeq2","edgeR","limma_voom","consensus>=2of3"))
  cat(sprintf("  %-16s %6d\n", nm,
      sum(switch(nm, naive=naive, guardian=guard, DESeq2=deseq, edgeR=edger,
                 limma_voom=voom, `consensus>=2of3`=cons2))))

mcc <- function(p, r) {
  tp<-sum(p&r); fp<-sum(p&!r); fn<-sum(!p&r); tn<-sum(!p&!r)
  den<-sqrt(as.double(tp+fp)*(tp+fn)*(tn+fp)*(tn+fn)); if (den==0) return(0)
  (as.double(tp)*tn - as.double(fp)*fn)/den
}
cat("\n=== R cross-check: MCC vs count-GLM reference (naive vs Guardian) ===\n")
for (rf in c("DESeq2","consensus>=2of3")) {
  ref <- if (rf=="DESeq2") deseq else cons2
  cat(sprintf("  vs %-16s naive MCC=%.3f  guardian MCC=%.3f  -> closer: %s\n",
      rf, mcc(naive,ref), mcc(guard,ref),
      ifelse(mcc(guard,ref)>mcc(naive,ref),"GUARDIAN","naive")))
}

cat("\n=== R cross-check: DESeq2 DE-rate by verdict category ===\n")
catrate <- sapply(c("hit_by_both","guardian_only","naive_only","neither"),
                  function(k) mean(deseq[cat_==k]))
for (k in names(catrate)) cat(sprintf("  %-14s %.1f%% (n=%d)\n", k, 100*catrate[k], sum(cat_==k)))

fish <- function(grp, hit, bg) {  # one-sided greater enrichment
  a<-sum(grp&hit); b<-sum(grp&!hit); c<-sum(bg&hit); d<-sum(bg&!hit)
  ft<-fisher.test(matrix(c(a,b,c,d),nrow=2,byrow=TRUE), alternative="greater")
  list(rate=a/(a+b), bg=c/(c+d), enr=(a/(a+b))/(c/(c+d)), p=ft$p.value, a=a, n=a+b)
}
gA <- cat_=="guardian_only"; gB <- cat_=="naive_only"
cat("\n=== R cross-check: Group A rescues confirmed DE (vs naive-NS background) ===\n")
for (rf in c("DESeq2","edgeR","consensus>=2of3")) {
  ref <- if(rf=="DESeq2") deseq else if(rf=="edgeR") edger else cons2
  r <- fish(gA, ref, (!naive) & !gA)
  cat(sprintf("  %-16s %d/%d = %.1f%% (bg %.1f%%, %.1fx, p=%.2e)\n",
      rf, r$a, r$n, 100*r$rate, 100*r$bg, r$enr, r$p))
}
cat("=== R cross-check: Group B rejects agreed NOT-DE (vs naive-sig background) ===\n")
for (rf in c("DESeq2","edgeR","consensus>=2of3")) {
  ref <- if(rf=="DESeq2") deseq else if(rf=="edgeR") edger else cons2
  r <- fish(gB, !ref, naive & !gB)
  cat(sprintf("  %-16s %d/%d = %.1f%% (bg %.1f%%, %.1fx, p=%.2e)\n",
      rf, r$a, r$n, 100*r$rate, 100*r$bg, r$enr, r$p))
}

## ---------------- figure ----------------
png(file.path(OUT, "fig_threeway.png"), width = 1500, height = 470, res = 130)
par(mfrow = c(1, 3), mar = c(4.5, 4.5, 3, 1))

# Panel A: DESeq2 DE-rate by verdict category
catN <- c(sum(cat_=="hit_by_both"), sum(gA), sum(gB), sum(cat_=="neither"))
ra <- 100*c(catrate["hit_by_both"], catrate["guardian_only"], catrate["naive_only"], catrate["neither"])
cols <- c("#444444","#1565c0","#c62828","#bdbdbd")
bp <- barplot(ra, col=cols, ylim=c(0,105), ylab="% confirmed DE by DESeq2",
              names.arg=c(sprintf("Both\n(%d)",catN[1]), sprintf("Guardian\nonly A (%d)",catN[2]),
                          sprintf("Naive\nonly B (%d)",catN[3]), sprintf("Neither\n(%d)",catN[4])),
              cex.names=0.8, main="A  Count-GLM corroboration\nby verdict category")
text(bp, ra+4, sprintf("%.1f%%", ra), cex=0.9)

# Panel B: Group A / Group B adjudicated by count-GLM consensus vs background
A <- fish(gA, cons2, (!naive)&!gA); B <- fish(gB, !cons2, naive&!gB)
m <- rbind(c(100*A$rate, 100*B$rate), c(100*A$bg, 100*B$bg))
bp2 <- barplot(m, beside=TRUE, col=c("#2e7d32","#bdbdbd"), ylim=c(0,105),
               names.arg=c("Group A rescues\nconfirmed DE","Group B rejects\nagreed NOT-DE"),
               cex.names=0.8, ylab="% agreeing with count-GLM consensus",
               main="B  Verdict flips adjudicated\nby the standard")
legend("topright", c("verdict-flip group","background"), fill=c("#2e7d32","#bdbdbd"), bty="n", cex=0.8)
text(as.vector(bp2), as.vector(m)+4, sprintf("%.0f%%", as.vector(m)), cex=0.8)

# Panel C: MCC vs reference, naive vs Guardian
refs <- list(DESeq2=deseq, edgeR=edger, `>=2/3`=cons2)
mn <- sapply(refs, function(r) mcc(naive,r)); mg <- sapply(refs, function(r) mcc(guard,r))
bp3 <- barplot(rbind(mn,mg), beside=TRUE, col=c("#c62828","#1565c0"), ylim=c(0,0.65),
               names.arg=names(refs), ylab="MCC vs count-GLM reference",
               main="C  Agreement with standard:\nnaive vs Guardian")
legend("topright", c("naive","Guardian"), fill=c("#c62828","#1565c0"), bty="n", cex=0.8)

invisible(dev.off())
cat(sprintf("\nWrote %s/fig_threeway.png\n", OUT))
