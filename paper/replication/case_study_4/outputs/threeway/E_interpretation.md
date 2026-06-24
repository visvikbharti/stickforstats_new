# Phase E — count-GLM adjudication of Case Study 4: honest interpretation (v2)

**Date:** 2026-06-24 (v2 = after adversarial verification, run wf_b635311e-338)
**Trigger:** PLOS Comp Biol desk-reject + the manuscript's own concession (L205)
that the field uses count-based GLMs (DESeq2/edgeR). A reviewer would demand to
know whether Guardian's verdict flips agree with the count-GLM standard.
**Analysis:** `code/threeway/phase_e_countglm.R` (R DESeq2 / edgeR / limma-voom on
identical filtered raw counts) + `code/threeway/phase_e_threeway.py` (adjudication)
+ `code/threeway/phase_e_difficulty_matched.py` (difficulty-matched re-test),
independently cross-checked in `code/threeway/phase_e_figure_and_verify.R`.

> **Terminology:** DESeq2 / edgeR / limma-voom are the **field-standard count
> models**, not orthogonal ground truth (no qPCR or independent cohort).
> Everything below is **method concordance** with the established standard, not
> validation against truth. All Fisher p-values are **one-sided
> (over-representation)** unless a two-sided value is given.

---

## What we ran

Same 27,221 genes, same Primary(55)-vs-Metastasis(36) contrast, three count
models added as a reference arm: **DESeq2** (NB-GLM Wald), **edgeR** (QL F-test),
**limma-voom**, on raw counts with Primary as reference. Reference set =
">=2 of 3 count-GLMs significant" (DESeq2-dominated: 1,459/1,584 also DESeq2-sig).

Significant genes (padj/FDR<0.05): naive **1,006**, Guardian **1,411**,
DESeq2 **1,782**, edgeR **2,506**, limma-voom **964**, consensus(>=2/3) **1,584**.
pyDESeq2 (cached) vs canonical R DESeq2: Jaccard 0.97, kappa 0.99 — faithful port.

Verdict-flip categories: hit_by_both **932**, guardian_only "Group A" **479**,
naive_only "Group B" **74**, neither **25,736**.

---

## Finding 1 — Group A (479 "rescues") is concordant with the count models, but the magnitude must be difficulty-matched ✅ (with caveat)

Genes Guardian rescued (sig in Guardian, missed by naive t) are enriched for
genes the count models independently call DE — **but** Group A genes sit just
under the naive threshold (median naive padj 0.07; 80% in [0.05,0.10)), whereas
the naive-discarded pool is mostly deep nulls (median naive padj 0.57). The
enrichment therefore depends heavily on the comparison background:

| Background | Group A confirmed (DESeq2) | bg rate | Enrichment | one-sided p |
|---|---|---|---|---|
| ALL naive-discarded ("neither", n=25,736) | 170/479 = 35.5% | 3.6% | **9.78x** | 2.6e-111 |
| naive padj [0.05,0.57) | 169/478 = 35.4% | 5.8% | 6.11x | 1.1e-78 |
| naive padj [0.05,0.20) | 163/466 = 35.0% | 11.8% | 2.97x | 5.0e-33 |
| **naive padj [0.05,0.10) (holds 80% of Group A)** | 142/383 = 37.1% | 20.4% | **1.81x** | 8.9e-10 |

**Defensible claim:** among genes with *comparably marginal* naive evidence, the
ones Guardian rescues are **~1.8x more likely** to be count-GLM-concordant DEGs
(p<1e-9) — and ~10x more likely than the full pool of genes the naive test
discarded. The cascade is preferentially re-flagging count-concordant signal,
not re-flagging near-threshold genes at random. **Report the difficulty-matched
~1.8x alongside the 9.78x — do not headline the 10x alone** (a methods referee
will collapse it). Honest verb: rescues are "enriched for independently
count-concordant DEGs," not "recover real signal."

## Finding 2 — Group B (74 "false positives rejected") is a refuted overclaim ❌

The manuscript and the live bioRxiv abstract say Guardian "correctly rejected 74
outlier-driven false positives." The count-standard refutes this on two independent axes:

1. **The count models call a majority DE:** DESeq2 **45/74 (60.8%)**, edgeR
   **54/74 (73.0%)**, consensus **42/74 (56.8%)**. Most genes Guardian "rejected"
   are DE by the domain-appropriate model.
2. **They are the LARGEST real effects, not outliers:** Group B's median
   |DESeq2 log2FC| = **0.85** (41.9% with |log2FC|>=1) — the largest of any
   category (hit_by_both 0.62, Group A 0.38, neither 0.24). DESeq2's NB model with
   Cook's-distance outlier replacement (active at n=55/36) sees large, real,
   non-outlier-driven differences. The "outlier-dominated" label (and the Fig 5B
   "median 0.46, outlier-driven" framing on the naive log-CPM scale) is wrong.
3. The residual "not-DE enrichment" of Group B is weak and not robust: 1.2x by
   DESeq2 (one-sided p=0.13, two-sided p=0.25, n.s.), 1.48x by consensus
   (one-sided p=0.0099, two-sided p=0.017) — and it vanishes under
   difficulty-matching. Do not lean on it.

**Conclusion:** "74 outlier-driven false positives correctly rejected" is not
supported and must be removed. Honest replacement: 74 genes the rank cascade
conservatively rejects, but where the count model — the right tool for counts —
still calls a clear majority DE with the largest effect sizes in the dataset. A
candid limitation: a rank test on log-CPM loses real large-effect signal a count
model recovers.

## Finding 3 — Guardian does NOT move the gene list toward the count standard overall

Whole-list agreement (MCC) is essentially tied, marginally favouring naive:

| Reference | naive MCC | Guardian MCC | naive recall | Guardian recall |
|---|---|---|---|---|
| DESeq2 | 0.482 | 0.476 | 0.381 | 0.451 |
| consensus >=2/3 | 0.534 | 0.507 | 0.443 | 0.504 |

Do **not** claim Guardian "beats" or "moves toward" the standard. The honest
framing: the cascade is a **violation detector and distribution-free safety net,
not a DESeq2 substitute**. It buys a genuine **recall gain** for count-concordant
DEGs (0.38->0.45 vs DESeq2; 0.44->0.50 vs consensus) at a precision cost, so
"tied MCC" is not "no value" in a discovery context — but neither simple per-gene
test (naive or Guardian) is a count model (both MCC ~0.5). Effect-size rank
agreement with DESeq2 log2FC is near-identical (Guardian rho=0.87, naive 0.85).

## DESeq2 DE-rate by verdict category

| Category | DESeq2-DE rate | n |
|---|---|---|
| Hit by both | 67.9% | 932 |
| Guardian-only (A) | 35.5% | 479 |
| Naive-only (B) | 60.8% | 74 |
| Neither | 3.6% | 25,736 |

---

## What this means for the manuscript

1. **Headline = the diagnostic, not a head-to-head win.** The 90.55% cascade is
   an automatic, genome-wide red flag that a per-gene t-test on log-CPM is the
   wrong tool for counts — the correct response is a count model. That is the
   assumption-validation thesis, demonstrated at scale, with the count-GLM arm
   *proving* it rather than dodging it (closes L205).
2. **Group A:** keep, but report difficulty-matched ~1.8x (p<1e-9) alongside the
   ~10x-vs-all-discarded; use "count-concordant," not "real/validated."
3. **Group B:** rewrite — drop "false positives rejected"; state the count model
   calls a majority DE (DESeq2 60.8%, edgeR 73%) with the largest effect sizes;
   frame as a candid limitation.
4. **Add the count-GLM arm + the new figure (`fig_threeway.png`) + an explicit
   "complementary, not a replacement" statement:** StickForStats flags the
   violation and offers a distribution-free fallback, but for RNA-seq counts it
   should defer to / recommend DESeq2/edgeR.
5. **Propagate the Group B correction to ALL FIVE sites**, not just the abstract:
   manuscript.md **L16** (main abstract), **L203** (Group B body), **L207**
   (inline Fig 5 caption), **L218** (Table 6 row), **L368** (standalone Fig 5
   caption). Fixing only the abstract leaves the figure/table/body carrying the
   refuted claim.

**Net:** doing the comparison honestly turned L205 from an exposed flank into a
quantified, reviewer-proof point; exposed one overclaim (Group B) a genomics
referee would certainly have caught; right-sized a second (Group A 10x -> ~1.8x
difficulty-matched); and left the core thesis (automatic genome-scale assumption
detection) intact and more credible.
