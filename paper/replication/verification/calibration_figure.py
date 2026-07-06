#!/usr/bin/env python3
"""
Render the calibration-benchmark figure from Part A + Part B result JSONs.
Output: calibration_benchmark.png (and .pdf).
Run after both benchmarks: .venv-django/bin/python paper/replication/verification/calibration_figure.py
"""
from __future__ import annotations
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = Path(__file__).parent
A = json.loads((HERE / "calibration_partA_results.json").read_text())["results"]
B = json.loads((HERE / "calibration_partB_results.json").read_text())["results"]

# focus Part A on the unbalanced, GSE271517-like size
SZ = "n55v36"
SCEN = list(A.keys())
SLAB = {
    "S1_normal_equalvar": "S1 normal eq-var",
    "S2_normal_unequalvar": "S2 normal uneq-var",
    "S3_heavy_tailed_t3": "S3 heavy-tail t3",
    "S4_lognormal_skewed": "S4 lognormal",
    "S5_outlier_contam": "S5 outliers",
    "S6_unequalvar_heavy": "S6 uneq-var+heavy",
}
NAVY, TEAL = "#1f3a5f", "#2a9d8f"
GREY, ORANGE = "#8d99ae", "#e76f51"

fig = plt.figure(figsize=(12, 7.2))
gs = fig.add_gridspec(2, 3, height_ratios=[1, 1], hspace=0.55, wspace=0.32)

def grouped(ax, metric, title, ref=None, ylim=None):
    x = np.arange(len(SCEN)); w = 0.27
    naive = [A[s][SZ]["naive_student"][metric] for s in SCEN]
    guard = [A[s][SZ]["guardian"][metric] for s in SCEN]
    welch = [A[s][SZ]["welch"][metric] for s in SCEN]
    ax.bar(x - w, naive, w, label="naïve Student-t (gate off)", color=GREY)
    ax.bar(x,      guard, w, label="Guardian cascade", color=NAVY)
    ax.bar(x + w, welch, w, label="always-Welch (ref)", color=TEAL)
    if ref is not None:
        ax.axhline(ref, color=ORANGE, lw=1.2, ls="--", zorder=0)
        ax.text(len(SCEN)-0.5, ref, f" α={ref}", color=ORANGE, va="bottom", ha="right", fontsize=8)
    ax.set_title(title, fontsize=10, fontweight="bold")
    ax.set_xticks(x)
    ax.set_xticklabels([SLAB[s] for s in SCEN], fontsize=7, rotation=30, ha="right")
    if ylim: ax.set_ylim(*ylim)
    ax.grid(axis="y", alpha=0.25)

axA = fig.add_subplot(gs[0, 0]); grouped(axA, "type_I", "A. Type I error (raw p<0.05)", ref=0.05, ylim=(0, 0.12))
axB = fig.add_subplot(gs[0, 1]); grouped(axB, "fdr", "B. FDR (BH q<0.05)", ref=0.05, ylim=(0, 0.20))
axC = fig.add_subplot(gs[0, 2]); grouped(axC, "power", "C. Power", ylim=(0, 1.05))
axA.legend(fontsize=8, loc="upper left")
axA.set_ylabel("continuous data\n(n=55 vs 36)", fontsize=9)

# Part B: count data, 4 methods, 2 sizes — FDR and Power
methods = ["naive_student", "guardian", "edgeR", "DESeq2"]
mlab = ["naïve-t\n(logCPM)", "Guardian\n(logCPM)", "edgeR", "DESeq2"]
mcol = [GREY, NAVY, TEAL, "#264653"]
sizes = list(B.keys())

def partB(ax, metric, title, ref=None):
    x = np.arange(len(methods)); w = 0.38
    for i, sz in enumerate(sizes):
        vals = [B[sz][m][metric] for m in methods]
        ax.bar(x + (i - 0.5) * w, vals, w, label=sz,
               color=[mcol[j] for j in range(len(methods))],
               alpha=1.0 if i == 0 else 0.55,
               edgecolor="black", linewidth=0.4)
    if ref is not None:
        ax.axhline(ref, color=ORANGE, lw=1.2, ls="--", zorder=0)
        ax.text(len(methods)-0.5, ref, f" α={ref}", color=ORANGE, va="bottom", ha="right", fontsize=8)
    ax.set_title(title, fontsize=10, fontweight="bold")
    ax.set_xticks(x); ax.set_xticklabels(mlab, fontsize=7.5)
    ax.grid(axis="y", alpha=0.25)

axD = fig.add_subplot(gs[1, 0]); partB(axD, "fdr", "D. Count data — FDR", ref=0.05); axD.set_ylim(0, 0.12)
axE = fig.add_subplot(gs[1, 1]); partB(axE, "power", "E. Count data — Power"); axE.set_ylim(0, 1.0)
axD.set_ylabel("count data\n(NB, 1.5× FC)", fontsize=9)

# solid = darker size (first), faded = second; add a small note panel
axF = fig.add_subplot(gs[1, 2]); axF.axis("off")
note = ("Part A (top): continuous data, 6 scenarios,\n"
        "n=55 vs 36. Ablation of the assumption gate:\n"
        "naïve = the cascade's own parametric branch with\n"
        "the gate OFF. The gate restores Type I / FDR\n"
        "control where the naïve t-test inflates (S2) and\n"
        "gains power under non-normality (S3–S5).\n"
        "HONEST CAVEAT: a fixed always-Welch default (teal)\n"
        "controls Type I in ALL scenarios incl. S6, where\n"
        "the cascade only partially controls — its\n"
        "normality-first routing sends most S6 genes to\n"
        "variance-sensitive Mann-Whitney.\n\n"
        "Part B (bottom): NB counts. All control FDR;\n"
        "count-GLMs (edgeR/DESeq2) carry more power than\n"
        f"the rank cascade — solid={sizes[0]}, faded={sizes[1]}.\n\n"
        "Real production service; reproducible (seed fixed).")
axF.text(0, 0.98, note, va="top", ha="left", fontsize=8.2, family="monospace")

fig.suptitle("Guardian cascade calibration: Type I error, FDR, and power under known ground truth",
             fontsize=12.5, fontweight="bold", y=0.98)
out = HERE / "calibration_benchmark.png"
fig.savefig(out, dpi=170, bbox_inches="tight")
fig.savefig(HERE / "calibration_benchmark.pdf", bbox_inches="tight")
print("wrote", out.name, "and .pdf")
