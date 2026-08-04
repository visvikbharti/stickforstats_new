#!/usr/bin/env python3
"""
Render the calibration-benchmark figure from Part A + Part B result JSONs.
Output: calibration_benchmark.png (and .pdf).
Run after both benchmarks:
    .venv-django/bin/python paper/replication/verification/calibration_figure.py

This is a PRESENTATION layer only: every plotted number is read straight out of
calibration_partA_results.json / calibration_partB_results.json and is printed
to stdout as it is drawn, so the figure can be diffed against the JSONs.

Presentation fixes made 2026-08-04 for the BMC submission (no plotted value
changed; the printed table below is the audit trail, and the assertions at the
bottom fail the render if any of the four defects comes back):
  (a) Panel A's legend used to sit inside the axes and covered the top of the
      S2 naive bar -- the section's headline number (Type I = 0.1000). The
      legend is now a separate key panel in the empty sixth grid slot, and
      panel A's ylim is raised so no bar reaches the top spine.
  (b) The 130-word prose note that was baked in as a sixth panel is deleted.
      BMC forbids text blocks inside figures, and the note duplicated both the
      legend and the figure caption. The slot now holds the key.
  (c) The old canvas was 12 x 7.2 in saved at dpi=170, which embedded at
      ~293 ppi -- under BMC's 300 dpi floor. The canvas is now sized close to
      the printed width and saved at dpi=450; the script asserts the result
      clears 300 dpi at 170 mm. The vector PDF is still written alongside.
  (d) Base font sizes are set for the final print width instead of for a
      12-inch canvas (text used to print at roughly 4-5 pt at 170 mm).
"""
from __future__ import annotations
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Patch

HERE = Path(__file__).parent
_A_RAW = json.loads((HERE / "calibration_partA_results.json").read_text())
_B_RAW = json.loads((HERE / "calibration_partB_results.json").read_text())
A = _A_RAW["results"]
B = _B_RAW["results"]

print(f"matplotlib {matplotlib.__version__}  numpy {np.__version__}")
print(f"Part A meta: {_A_RAW['meta']}")
print(f"Part B meta: {_B_RAW['meta']}")

# focus Part A on the unbalanced, GSE271517-like size
SZ = "n55v36"
SCEN = list(A.keys())
# The x axis carries the short scenario codes only -- spelled-out labels would
# collide between adjacent ticks at this panel width. The codes are defined in
# the in-graphic key (axK below) as well as in the figure caption.
SLAB = {
    "S1_normal_equalvar":   "S1",
    "S2_normal_unequalvar": "S2",
    "S3_heavy_tailed_t3":   "S3",
    "S4_lognormal_skewed":  "S4",
    "S5_outlier_contam":    "S5",
    "S6_unequalvar_heavy":  "S6",
}
SDEF = {
    "S1_normal_equalvar":   "S1  normal, equal var.",
    "S2_normal_unequalvar": "S2  normal, unequal var.",
    "S3_heavy_tailed_t3":   "S3  heavy-tailed (t, df 3)",
    "S4_lognormal_skewed":  "S4  lognormal (skewed)",
    "S5_outlier_contam":    "S5  outlier-contaminated",
    "S6_unequalvar_heavy":  "S6  unequal var. + heavy",
}
NAVY, TEAL = "#1f3a5f", "#2a9d8f"
GREY, ORANGE = "#8d99ae", "#e76f51"
DEEP = "#264653"

# ---- typography: sized for BMC's 170 mm print width ------------------------
FS_TITLE, FS_TICK, FS_AXLAB, FS_KEY, FS_SUP = 8.6, 7.6, 8.0, 7.4, 9.4
plt.rcParams.update({
    "font.size": FS_TICK,
    "axes.linewidth": 0.7,
    "xtick.major.width": 0.7,
    "ytick.major.width": 0.7,
})

FIG_W, FIG_H = 6.6, 5.8
fig = plt.figure(figsize=(FIG_W, FIG_H))
gs = fig.add_gridspec(2, 3, height_ratios=[1, 1], hspace=0.36, wspace=0.30,
                      width_ratios=[1, 1, 1.24],
                      left=0.072, right=0.988, top=0.895, bottom=0.095)

# Every value drawn, printed for audit.
DRAWN: list[tuple] = []


def grouped(ax, metric, title, ref=None, ylim=None):
    x = np.arange(len(SCEN))
    w = 0.27
    naive = [A[s][SZ]["naive_student"][metric] for s in SCEN]
    guard = [A[s][SZ]["guardian"][metric] for s in SCEN]
    welch = [A[s][SZ]["welch"][metric] for s in SCEN]
    for s, n, g, wl in zip(SCEN, naive, guard, welch):
        DRAWN.append((title[0], metric, s, "naive_student", n))
        DRAWN.append((title[0], metric, s, "guardian", g))
        DRAWN.append((title[0], metric, s, "welch", wl))
    ax.bar(x - w, naive, w, color=GREY, edgecolor="black", linewidth=0.3)
    ax.bar(x,     guard, w, color=NAVY, edgecolor="black", linewidth=0.3)
    ax.bar(x + w, welch, w, color=TEAL, edgecolor="black", linewidth=0.3)
    if ref is not None:
        ax.axhline(ref, color=ORANGE, lw=1.0, ls="--", zorder=0)
    ax.set_title(title, fontsize=FS_TITLE, fontweight="bold")
    ax.set_xticks(x)
    ax.set_xticklabels([SLAB[s] for s in SCEN], fontsize=FS_TICK)
    ax.tick_params(axis="y", labelsize=FS_TICK)
    if ylim:
        ax.set_ylim(*ylim)
    ax.grid(axis="y", alpha=0.25, linewidth=0.5)
    ax.set_axisbelow(True)
    return max(max(naive), max(guard), max(welch))


# ylim headroom chosen so no bar top touches the spine and nothing occludes it.
axA = fig.add_subplot(gs[0, 0])
maxA = grouped(axA, "type_I", "A. Type I error (raw p < 0.05)", ref=0.05, ylim=(0, 0.13))
axB = fig.add_subplot(gs[0, 1])
maxB = grouped(axB, "fdr", "B. FDR (BH q < 0.05)", ref=0.05, ylim=(0, 0.21))
axC = fig.add_subplot(gs[0, 2])
maxC = grouped(axC, "power", "C. Power", ylim=(0, 1.12))
axA.set_ylabel("continuous data\n(n = 55 vs 36)", fontsize=FS_AXLAB)

# Part B: count data, 4 methods, 2 sizes — FDR and Power
methods = ["naive_student", "guardian", "edgeR", "DESeq2"]
# One line, rotated: at this panel width stacked two-line labels collided
# ("(log-CPM)(log-CPM)"). The tick-label overlap assertion below enforces it.
mlab = ["naïve t (log-CPM)", "Guardian (log-CPM)",
        "edgeR (counts)", "DESeq2 (counts)"]
mcol = [GREY, NAVY, TEAL, DEEP]
sizes = list(B.keys())


def partB(ax, metric, title, ref=None):
    x = np.arange(len(methods))
    w = 0.38
    top = 0.0
    for i, sz in enumerate(sizes):
        vals = [B[sz][m][metric] for m in methods]
        for m, v in zip(methods, vals):
            DRAWN.append((title[0], metric, sz, m, v))
        top = max(top, max(vals))
        ax.bar(x + (i - 0.5) * w, vals, w,
               color=[mcol[j] for j in range(len(methods))],
               alpha=1.0 if i == 0 else 0.55,
               edgecolor="black", linewidth=0.35)
    if ref is not None:
        ax.axhline(ref, color=ORANGE, lw=1.0, ls="--", zorder=0)
    ax.set_title(title, fontsize=FS_TITLE, fontweight="bold")
    ax.set_xticks(x)
    ax.set_xticklabels(mlab, fontsize=FS_TICK * 0.95, rotation=24, ha='right',
                       rotation_mode='anchor')
    ax.tick_params(axis="y", labelsize=FS_TICK)
    ax.grid(axis="y", alpha=0.25, linewidth=0.5)
    ax.set_axisbelow(True)
    return top


axD = fig.add_subplot(gs[1, 0])
maxD = partB(axD, "fdr", "D. Count data — FDR", ref=0.05)
axD.set_ylim(0, 0.085)
axE = fig.add_subplot(gs[1, 1])
maxE = partB(axE, "power", "E. Count data — power")
axE.set_ylim(0, 1.0)
axD.set_ylabel("count data\n(NB, 1.5× FC)", fontsize=FS_AXLAB)

# ---- sixth slot: the KEY (replaces the deleted prose note) -----------------
axK = fig.add_subplot(gs[1, 2])
axK.axis("off")
handles_A = [
    Patch(facecolor=GREY, edgecolor="black", linewidth=0.3,
          label="naïve Student t (gate off)"),
    Patch(facecolor=NAVY, edgecolor="black", linewidth=0.3,
          label="Guardian cascade"),
    Patch(facecolor=TEAL, edgecolor="black", linewidth=0.3,
          label="always-Welch (reference)"),
    plt.Line2D([0], [0], color=ORANGE, lw=1.0, ls="--", label="nominal α = 0.05"),
]
handles_S = [
    plt.Line2D([0], [0], linestyle="none", marker="", label=SDEF[s])
    for s in SCEN
]
handles_A += [
    Patch(facecolor=DEEP, edgecolor="black", linewidth=0.35, alpha=1.00,
          label=f"D–E solid: {sizes[0][1:].replace('v', ' vs ')} samples"),
    Patch(facecolor=DEEP, edgecolor="black", linewidth=0.35, alpha=0.55,
          label=f"D–E faded: {sizes[1][1:].replace('v', ' vs ')} samples"),
]


def _key(handles, title, y, handlelength=1.5):
    lg = axK.legend(handles=handles, title=title,
                    loc="upper left", bbox_to_anchor=(0.0, y),
                    fontsize=FS_KEY, title_fontsize=FS_KEY,
                    frameon=True, borderpad=0.4, labelspacing=0.32,
                    handlelength=handlelength, handleheight=0.85,
                    handletextpad=0.5, borderaxespad=0.0)
    lg.get_frame().set_edgecolor("#cccccc")
    lg.get_frame().set_linewidth(0.6)
    lg._legend_box.align = "left"
    axK.add_artist(lg)
    return lg


# Legend 1 sets the colour/shading encoding. Legend 2 is anchored directly
# beneath whatever height legend 1 turned out to need, so the two can never
# overlap regardless of font metrics (they did when the y was hardcoded).
leg1 = _key(handles_A, "Bar colour / shading", 1.03)
fig.canvas.draw()
_b1 = leg1.get_window_extent(renderer=fig.canvas.get_renderer())
_b1_ax = axK.transAxes.inverted().transform([[_b1.x0, _b1.y0], [_b1.x1, _b1.y1]])
leg2 = _key(handles_S, "A–C  scenario codes", _b1_ax[0][1] - 0.05,
            handlelength=0.0)

fig.suptitle("Guardian cascade calibration: Type I error, FDR and power under known ground truth",
             fontsize=FS_SUP, fontweight="bold", y=0.975)

# ---- audit trail: print every plotted value --------------------------------
print()
print(f"{'panel':<6}{'metric':<8}{'group':<24}{'method':<15}{'value':>9}")
for panel, metric, grp, meth, val in DRAWN:
    print(f"{panel:<6}{metric:<8}{grp:<24}{meth:<15}{val:>9.4f}")
print(f"\ntotal bars drawn: {len(DRAWN)}")

# ---- occlusion / clipping checks ------------------------------------------
fig.canvas.draw()
rend = fig.canvas.get_renderer()
for name, ax, top in (("A", axA, maxA), ("B", axB, maxB), ("C", axC, maxC),
                      ("D", axD, maxD), ("E", axE, maxE)):
    lo, hi = ax.get_ylim()
    head = (hi - top) / (hi - lo)
    assert top < hi, f"panel {name}: tallest bar {top} exceeds ylim {hi}"
    print(f"panel {name}: tallest bar = {top:.4f}, ylim top = {hi:.4f}, "
          f"headroom = {100 * head:.1f}% of the axis")
    # nothing may sit inside these axes that could cover a bar
    assert ax.get_legend() is None, f"panel {name} still has an in-axes legend"

# no Text artist inside the data area of panels A-E (the old note panel and the
# in-axes legend are both gone; only ticks, titles and axis labels remain)
for name, ax in (("A", axA), ("B", axB), ("C", axC), ("D", axD), ("E", axE)):
    stray = [t.get_text() for t in ax.texts if t.get_text().strip()]
    assert not stray, f"panel {name} contains in-axes text: {stray}"
print("in-axes text artists in panels A-E: 0 (prose note panel removed)")

# No two x tick labels may collide in any panel. For horizontal labels that is
# the horizontal gap between their boxes; for rotated labels the axis-aligned
# boxes always intersect, so the meaningful quantity is the separation of the
# two baselines measured perpendicular to the text direction, compared with the
# line height.
_rend0 = fig.canvas.get_renderer()
for name, ax in (("A", axA), ("B", axB), ("C", axC), ("D", axD), ("E", axE)):
    labs = ax.get_xticklabels()
    worst = None
    for i in range(len(labs) - 1):
        t1, t2 = labs[i], labs[i + 1]
        theta = np.deg2rad(t1.get_rotation())
        if abs(t1.get_rotation()) < 1e-9:
            b1 = t1.get_window_extent(renderer=_rend0)
            b2 = t2.get_window_extent(renderer=_rend0)
            sep = b2.x0 - b1.x1
            need = 0.0
        else:
            p1 = np.array(t1.get_transform().transform(t1.get_position()))
            p2 = np.array(t2.get_transform().transform(t2.get_position()))
            n = np.array([-np.sin(theta), np.cos(theta)])
            sep = abs(float(np.dot(p2 - p1, n)))
            # one line of text, in px, at this figure's dpi
            need = t1.get_fontsize() / 72.0 * fig.dpi * 1.05
        worst = (sep - need) if worst is None else min(worst, sep - need)
        assert sep > need, (
            f"panel {name}: x tick labels {t1.get_text()!r} and "
            f"{t2.get_text()!r} collide (separation {sep:.1f} px, "
            f"need > {need:.1f} px)"
        )
    print(f"panel {name}: min x-tick-label clearance = {worst:.1f} px (must be > 0)")

# the two key boxes must not overlap each other, any data panel, or the canvas
fig.canvas.draw()
rend = fig.canvas.get_renderer()
kb = [leg1.get_window_extent(renderer=rend), leg2.get_window_extent(renderer=rend)]
gap = kb[0].y0 - kb[1].y1
assert gap > 0, f"the two key boxes overlap: gap = {gap:.1f} px"
print(f"key boxes: vertical gap = {gap:.1f} px (must be > 0)")
for name, ax in (("A", axA), ("B", axB), ("C", axC), ("D", axD), ("E", axE)):
    ab = ax.get_window_extent(renderer=rend)
    for i, b in enumerate(kb):
        overlap = (b.x0 < ab.x1 and b.x1 > ab.x0 and b.y0 < ab.y1 and b.y1 > ab.y0)
        assert not overlap, f"key box {i} overlaps panel {name}"
print("key boxes overlap 0 of the 5 data panels")
fw, fh = fig.canvas.get_width_height()
for i, b in enumerate(kb):
    assert b.x1 <= fw + 1 and b.y0 >= -1, (
        f"key box {i} runs off the canvas: x1={b.x1:.0f} (w={fw}), y0={b.y0:.0f}"
    )
print(f"key boxes fit inside the {fw}x{fh} px canvas")

out_png = HERE / "calibration_benchmark.png"
out_pdf = HERE / "calibration_benchmark.pdf"
fig.savefig(out_png, dpi=450, bbox_inches="tight")
fig.savefig(out_pdf, bbox_inches="tight")

# ---- resolution check ------------------------------------------------------
from PIL import Image  # noqa: E402

with Image.open(out_png) as im:
    px_w, px_h = im.size
dpi_170 = px_w / (170 / 25.4)
print(f"\nwrote {out_png.name} {px_w}x{px_h} px  ->  {dpi_170:.1f} dpi at 170 mm")
assert dpi_170 >= 300, f"under BMC's 300 dpi floor at 170 mm: {dpi_170:.1f}"

# effective printed point sizes: the saved canvas is scaled to the print width
saved_mm = px_w / 450 * 25.4
print(f"saved canvas = {saved_mm:.1f} mm wide; printed height at 170 mm = "
      f"{170 * px_h / px_w:.1f} mm (BMC cap 225 mm)")
for target_mm, what in ((170.0, "width=100%"), (161.5, "width=95%")):
    sc = target_mm / saved_mm
    print(f"  at {target_mm:.1f} mm ({what}, scale {sc:.3f}): "
          f"ticks {FS_TICK * sc:.1f} pt, key {FS_KEY * sc:.1f} pt, "
          f"panel titles {FS_TITLE * sc:.1f} pt, suptitle {FS_SUP * sc:.1f} pt")
assert 170 * px_h / px_w <= 225, "exceeds BMC's 225 mm height cap at full width"
print(f"wrote {out_pdf.name} (vector)")
