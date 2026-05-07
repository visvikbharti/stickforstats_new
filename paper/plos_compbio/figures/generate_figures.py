#!/usr/bin/env python3
"""
Generate publication-quality figures for PLOS Comp Bio manuscript.

Figures 1 & 2 are reused from the JSS paper (architecture + Guardian flowchart).
This script generates Figures 3 and 5 from real data.

Usage:
    cd paper/plos_compbio/figures
    python generate_figures.py
"""

import json
import os
import sys
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
from scipy import stats

plt.rcParams.update({
    'font.size': 10,
    'font.family': 'sans-serif',
    'figure.dpi': 300,
    'savefig.dpi': 300,
    'savefig.bbox': 'tight',
    'axes.linewidth': 0.8,
})

BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(BASE, '..', '..', '..', 'examples', 'biological_datasets')


# ═══════════════════════════════════════════════════════════════════
# Figure 3: Case Study Results — CRISPR + Meta-analysis
# ═══════════════════════════════════════════════════════════════════

def fig3_case_studies():
    """Case study results: CRISPR strategy comparison + meta-analysis."""
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))

    # Panel A: CRISPR TOPSIS scores by modality
    ax = axes[0]
    with open(os.path.join(DATA, 'crispr_editing_strategies', 'real_scored_strategies.json')) as f:
        crispr = json.load(f)

    modalities = ['ABE', 'PE', 'HDR_SSODN', 'HDR_CSSDNA']
    mod_labels = ['ABE\n(Base Edit)', 'PE\n(Prime Edit)', 'HDR\n(ssODN)', 'HDR\n(cssDNA)']
    colors = ['#2ecc71', '#3498db', '#e67e22', '#e74c3c']

    data_by_mod = {m: [r['topsis_score'] for r in crispr if r['modality'] == m] for m in modalities}
    bp = ax.boxplot([data_by_mod[m] for m in modalities], labels=mod_labels,
                     patch_artist=True, widths=0.6)
    for patch, color in zip(bp['boxes'], colors):
        patch.set_facecolor(color)
        patch.set_alpha(0.7)
    for median in bp['medians']:
        median.set_color('black')
        median.set_linewidth(1.5)

    # Add individual points
    for i, m in enumerate(modalities):
        x = np.random.normal(i + 1, 0.04, len(data_by_mod[m]))
        ax.scatter(x, data_by_mod[m], alpha=0.5, s=20, c=colors[i], edgecolors='gray', linewidths=0.5)

    # Guardian annotation
    ax.annotate('Guardian: Normality WARNING\n→ Kruskal-Wallis (p < 0.001)',
                xy=(1, 0.62), xytext=(2.5, 0.62),
                fontsize=8, ha='center',
                bbox=dict(boxstyle='round,pad=0.3', facecolor='#fff3cd', edgecolor='#ffc107'),
                arrowprops=dict(arrowstyle='->', color='#ffc107'))

    ax.set_ylabel('TOPSIS Composite Score', fontsize=11)
    ax.set_title('A. CRISPR Editing Strategy Comparison', fontsize=12, fontweight='bold')
    ax.set_ylim(0, 0.75)

    # Panel B: Meta-analysis forest plot — REAL published data
    # Source: Egger 1997 BMJ; Sterne & Egger 2001 J Clin Epi
    # Dataset: 16 RCTs of intravenous magnesium for acute MI
    # (metafor::dat.egger2001). Cross-validated against R metafor 4.8.0.
    ax = axes[1]

    import csv as _csv
    meta_csv = os.path.join(BASE, '..', '..', 'replication', 'data',
                            'iv_magnesium_meta_analysis.csv')
    rows = list(_csv.DictReader(open(meta_csv)))
    effect_sizes = np.array([float(r['log_or']) for r in rows])
    variances = np.array([float(r['variance']) for r in rows])
    standard_errors = np.sqrt(variances)
    study_names = [f"{r['author']} {r['year']}" for r in rows]

    # Random-effects pooled (DerSimonian-Laird)
    w = 1.0 / variances
    pooled_fe = np.sum(w * effect_sizes) / np.sum(w)
    Q = np.sum(w * (effect_sizes - pooled_fe)**2)
    df = len(effect_sizes) - 1
    tau_sq = max(0.0, (Q - df) / (np.sum(w) - np.sum(w**2) / np.sum(w)))
    w_re = 1.0 / (variances + tau_sq)
    pooled_re = np.sum(w_re * effect_sizes) / np.sum(w_re)
    se_re = np.sqrt(1.0 / np.sum(w_re))

    # Plot — log OR scale
    y_positions = list(range(len(effect_sizes), 0, -1))
    for i, (es, se, y, name) in enumerate(zip(effect_sizes, standard_errors, y_positions, study_names)):
        ci_lo = es - 1.96 * se
        ci_hi = es + 1.96 * se
        weight = w_re[i] / np.sum(w_re)
        ax.plot([ci_lo, ci_hi], [y, y], color='#333', linewidth=1)
        ax.scatter(es, y, s=max(weight * 800, 8), color='#2196F3', zorder=5,
                   edgecolors='#1565C0', linewidths=0.5)
        ax.text(-3.4, y, name, ha='left', va='center', fontsize=7)

    # Pooled diamond
    y_pooled = 0
    ci_lo_re = pooled_re - 1.96 * se_re
    ci_hi_re = pooled_re + 1.96 * se_re
    diamond_x = [ci_lo_re, pooled_re, ci_hi_re, pooled_re]
    diamond_y = [y_pooled, y_pooled + 0.3, y_pooled, y_pooled - 0.3]
    ax.fill(diamond_x, diamond_y, color='#d32f2f', alpha=0.7)
    ax.text(-3.4, y_pooled, 'Pooled (RE)', ha='left', va='center', fontsize=8, fontweight='bold')

    ax.axvline(x=0, color='gray', linestyle='--', linewidth=0.8)
    ax.set_xlabel('log Odds Ratio (mortality)', fontsize=11)
    ax.set_xlim(-3.5, 1.5)
    ax.set_ylim(-1, len(effect_sizes) + 1)
    ax.set_yticks([])
    ax.set_title('B. IV Magnesium for AMI: Meta-Analysis Forest Plot', fontsize=11, fontweight='bold')

    # Guardian annotation — Egger's test result from real data
    ax.annotate('Guardian: Publication bias\nEgger t = -5.78, p < 0.001',
                xy=(pooled_re, 8), xytext=(0.4, 12),
                fontsize=8, ha='center',
                bbox=dict(boxstyle='round,pad=0.3', facecolor='#fff3cd', edgecolor='#ffc107'),
                arrowprops=dict(arrowstyle='->', color='#ffc107'))

    plt.tight_layout()
    plt.savefig(os.path.join(BASE, 'fig3_case_studies.png'))
    plt.savefig(os.path.join(BASE, 'fig3_case_studies.pdf'))
    print("Saved fig3_case_studies.png/pdf")
    plt.close()


# ═══════════════════════════════════════════════════════════════════
# Figure 5: Validation & Platform Comparison
# ═══════════════════════════════════════════════════════════════════

def fig5_validation():
    """Validation results and platform comparison."""
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))

    # Panel A: Numerical agreement with reference implementations
    ax = axes[0]
    tests = ['t-test', 'ANOVA', 'Pearson r', 'Spearman ρ', 'Chi-square',
             'Mann-Whitney', 'Shapiro-Wilk', 'Regression', 'Meta-analysis', 'Power']
    agreements = [16, 14, 16, 16, 14, 16, 10, 12, 10, 99]  # decimal places (99 = "within 1%")
    refs = ['SciPy', 'SciPy', 'SciPy', 'SciPy', 'SciPy',
            'SciPy', 'SciPy', 'statsmodels', 'R metafor', 'G*Power']

    colors_val = ['#4CAF50' if a >= 14 else '#FF9800' if a >= 10 else '#2196F3' for a in agreements]
    bars = ax.barh(range(len(tests)), [min(a, 16) for a in agreements], color=colors_val, height=0.6)

    for i, (bar, a, ref) in enumerate(zip(bars, agreements, refs)):
        label = f'{a} digits' if a <= 16 else '≤1%'
        ax.text(bar.get_width() + 0.3, i, f'{label} ({ref})', va='center', fontsize=8)

    ax.set_yticks(range(len(tests)))
    ax.set_yticklabels(tests, fontsize=9)
    ax.set_xlabel('Decimal Places of Agreement', fontsize=11)
    ax.set_xlim(0, 20)
    ax.set_title('A. Numerical Validation', fontsize=12, fontweight='bold')
    ax.invert_yaxis()

    # Panel B: Feature comparison heatmap
    ax = axes[1]
    features = ['Auto assumption\nchecks', 'Integrated\ninto results', 'Confidence\nscoring',
                'Alternative\nrecommendation', 'Manuscript\nreview', 'Web-based\ninterface',
                'Open source', 'High precision\noption', 'Multiple testing\ncorrection',
                'Survival\nanalysis']
    platforms = ['StickForStats', 'R', 'SPSS', 'jamovi', 'JASP']

    # 1 = yes, 0.5 = partial, 0 = no
    matrix = np.array([
        [1, 0, 0, 0, 0.5],  # Auto assumption
        [1, 0, 0, 0, 0],    # Integrated
        [1, 0, 0, 0, 0],    # Confidence
        [1, 0, 0, 0, 0],    # Alternative
        [1, 0, 0, 0, 0],    # Manuscript review
        [1, 0, 0, 0, 0],    # Web-based
        [1, 1, 0, 1, 1],    # Open source
        [1, 0.5, 0, 0, 0],  # High precision
        [1, 1, 1, 1, 1],    # Multiple testing
        [1, 1, 1, 0, 0],    # Survival
    ])

    cmap = plt.cm.RdYlGn
    im = ax.imshow(matrix, cmap=cmap, aspect='auto', vmin=0, vmax=1)

    ax.set_xticks(range(len(platforms)))
    ax.set_xticklabels(platforms, fontsize=9, rotation=45, ha='right')
    ax.set_yticks(range(len(features)))
    ax.set_yticklabels(features, fontsize=8)

    # Add text annotations
    for i in range(len(features)):
        for j in range(len(platforms)):
            val = matrix[i, j]
            text = '●' if val == 1 else '◐' if val == 0.5 else '○'
            color = 'white' if val == 1 else 'black'
            ax.text(j, i, text, ha='center', va='center', fontsize=12, color=color)

    ax.set_title('B. Platform Feature Comparison', fontsize=12, fontweight='bold')

    plt.tight_layout()
    plt.savefig(os.path.join(BASE, 'fig5_validation_comparison.png'))
    plt.savefig(os.path.join(BASE, 'fig5_validation_comparison.pdf'))
    print("Saved fig5_validation_comparison.png/pdf")
    plt.close()


# ═══════════════════════════════════════════════════════════════════
# Figure 2: Guardian Decision Flowchart (programmatic)
# ═══════════════════════════════════════════════════════════════════

def fig2_guardian_flowchart():
    """Guardian validation workflow flowchart."""
    fig, ax = plt.subplots(figsize=(8, 10))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 14)
    ax.axis('off')

    def draw_box(x, y, w, h, text, color='#E3F2FD', edge='#1565C0', fontsize=9):
        box = FancyBboxPatch((x - w/2, y - h/2), w, h, boxstyle="round,pad=0.15",
                             facecolor=color, edgecolor=edge, linewidth=1.5)
        ax.add_patch(box)
        ax.text(x, y, text, ha='center', va='center', fontsize=fontsize, fontweight='bold')

    def draw_diamond(x, y, text, color='#FFF9C4', edge='#F9A825'):
        diamond = plt.Polygon([(x, y+0.6), (x+1.2, y), (x, y-0.6), (x-1.2, y)],
                              facecolor=color, edgecolor=edge, linewidth=1.5)
        ax.add_patch(diamond)
        ax.text(x, y, text, ha='center', va='center', fontsize=8, fontweight='bold')

    def arrow(x1, y1, x2, y2, text='', color='#333'):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle='->', color=color, lw=1.5))
        if text:
            mx, my = (x1+x2)/2, (y1+y2)/2
            ax.text(mx + 0.15, my, text, fontsize=8, color=color)

    # Boxes
    draw_box(5, 13, 3.5, 0.8, 'User Request\n(Data + Test Type)', '#BBDEFB')
    draw_box(5, 11.5, 3.5, 0.8, '1. Identify Test\nRequirements', '#E3F2FD')
    draw_box(5, 10, 3.5, 0.8, '2. Run Validators\n(Parallel)', '#E3F2FD')
    draw_box(5, 8.5, 3.5, 0.8, '3. Calculate\nConfidence Score', '#E3F2FD')
    draw_diamond(5, 7, 'Score ≥ 0.7?')
    draw_box(2.5, 5.5, 2.8, 0.8, 'Execute Test\n+ Guardian Report', '#C8E6C9', '#388E3C')
    draw_box(7.5, 5.5, 2.8, 0.8, 'Recommend\nAlternative', '#FFECB3', '#FF8F00')
    draw_box(5, 4, 3.5, 0.8, 'Return Results\nto User', '#BBDEFB')

    # Arrows
    arrow(5, 12.6, 5, 11.9)
    arrow(5, 11.1, 5, 10.4)
    arrow(5, 9.6, 5, 8.9)
    arrow(5, 8.1, 5, 7.6)
    arrow(3.8, 7, 2.5, 5.9, 'Yes')
    arrow(6.2, 7, 7.5, 5.9, 'No')
    arrow(2.5, 5.1, 5, 4.4)
    arrow(7.5, 5.1, 5, 4.4)

    # Validator labels on side
    validators = ['Normality', 'Variance', 'Independence', 'Outliers',
                  'Sample Size', 'Modality', 'Linearity', 'Homoscedasticity']
    for i, v in enumerate(validators):
        y_v = 10.3 - (i * 0.22)
        ax.text(8.8, y_v, f'• {v}', fontsize=7, color='#555')

    ax.text(8.8, 10.55, '8 Validators:', fontsize=8, fontweight='bold', color='#1565C0')

    ax.set_title('Guardian Validation Workflow', fontsize=14, fontweight='bold', pad=10)

    plt.savefig(os.path.join(BASE, 'fig2_guardian_flowchart.png'))
    plt.savefig(os.path.join(BASE, 'fig2_guardian_flowchart.pdf'))
    print("Saved fig2_guardian_flowchart.png/pdf")
    plt.close()


# ═══════════════════════════════════════════════════════════════════
# Figure 1: Architecture Diagram (programmatic)
# ═══════════════════════════════════════════════════════════════════

def fig1_architecture():
    """System architecture diagram."""
    fig, ax = plt.subplots(figsize=(10, 7))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 10)
    ax.axis('off')

    def draw_layer(y, h, label, color, components):
        rect = FancyBboxPatch((0.5, y), 11, h, boxstyle="round,pad=0.2",
                              facecolor=color, edgecolor='#333', linewidth=1.2, alpha=0.3)
        ax.add_patch(rect)
        ax.text(0.8, y + h - 0.3, label, fontsize=11, fontweight='bold', color='#333')
        w = 10 / len(components)
        for i, comp in enumerate(components):
            cx = 1 + i * w + w/2
            box = FancyBboxPatch((cx - w/2 + 0.1, y + 0.3), w - 0.2, h - 0.8,
                                 boxstyle="round,pad=0.1", facecolor='white',
                                 edgecolor='#666', linewidth=0.8)
            ax.add_patch(box)
            ax.text(cx, y + h/2 + 0.05, comp, ha='center', va='center', fontsize=8)

    # Layers
    draw_layer(7.5, 2, 'User Interface (React 18)', '#BBDEFB',
               ['Statistical\nAnalysis', 'Genomics\nWorkflow', 'AI\nAdvisor', 'Manuscript\nReview', 'Report\nManager'])
    draw_layer(4.5, 2.5, 'Application Layer (Django REST)', '#C8E6C9',
               ['Guardian\n(8 validators)', 'Statistical\nEngine', 'Genomics\nDE Service', 'Manuscript\nParser'])
    draw_layer(2, 2, 'Data Layer', '#F8BBD0',
               ['PostgreSQL', 'Redis', 'Celery\nWorkers', 'File\nStorage'])

    # Arrows between layers
    for x in [3, 6, 9]:
        ax.annotate('', xy=(x, 7.5), xytext=(x, 6.8),
                    arrowprops=dict(arrowstyle='->', color='#666', lw=1))
        ax.annotate('', xy=(x, 4.5), xytext=(x, 3.8),
                    arrowprops=dict(arrowstyle='->', color='#666', lw=1))

    ax.set_title('StickForStats System Architecture', fontsize=14, fontweight='bold', pad=15)

    plt.savefig(os.path.join(BASE, 'fig1_architecture.png'))
    plt.savefig(os.path.join(BASE, 'fig1_architecture.pdf'))
    print("Saved fig1_architecture.png/pdf")
    plt.close()


# ═══════════════════════════════════════════════════════════════════
# Figure 4: Manuscript Review Pipeline (programmatic)
# ═══════════════════════════════════════════════════════════════════


def fig4_manuscript_review():
    """Manuscript review pipeline flowchart (Pillar 2)."""
    fig, ax = plt.subplots(figsize=(10, 10))
    ax.set_xlim(0, 13)
    ax.set_ylim(0, 14)
    ax.axis('off')

    def draw_box(x, y, w, h, text, color='#E3F2FD', edge='#1565C0', fontsize=9):
        box = FancyBboxPatch((x - w/2, y - h/2), w, h,
                             boxstyle="round,pad=0.15",
                             facecolor=color, edgecolor=edge, linewidth=1.5)
        ax.add_patch(box)
        ax.text(x, y, text, ha='center', va='center',
                fontsize=fontsize, fontweight='bold')

    def arrow(x1, y1, x2, y2):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle='->', color='#333', lw=1.5))

    # Main pipeline, centered column at x=5
    draw_box(5, 13, 3.8, 0.9, 'Manuscript\n(PDF / LaTeX / DOCX)', '#BBDEFB')
    draw_box(5, 11.3, 3.8, 0.9, '1. Parse\n(GROBID / pandoc / python-docx)', '#E3F2FD')
    draw_box(5, 9.6, 3.8, 0.9, '2. Extract Claims\n(regex + LLM hybrid)', '#E3F2FD')
    draw_box(5, 7.9, 3.8, 0.9, '3. Select Discipline Profile\n(CONSORT / STROBE / ICH-E9 / JARS)',
             '#E3F2FD')
    draw_box(5, 6.2, 3.8, 0.9, '4. Validate\n(8 validators in parallel)', '#E3F2FD')
    draw_box(5, 4.5, 3.8, 0.9, '5. Apply Discipline Weights\n(escalate category-relevant findings)',
             '#E3F2FD')
    draw_box(5, 2.8, 3.8, 0.9, '6. Classify Findings\n(blocking / major / moderate / minor)',
             '#E3F2FD')
    draw_box(5, 1.1, 3.8, 0.9, 'Statistical Quality Report',
             '#C8E6C9', '#388E3C')

    # Arrows between consecutive boxes
    for y1, y2 in [(12.55, 11.75), (10.85, 10.05), (9.15, 8.35),
                   (7.45, 6.65), (5.75, 4.95), (4.05, 3.25),
                   (2.35, 1.55)]:
        arrow(5, y1, 5, y2)

    # Left-side annotation: supported input formats
    ax.text(0.3, 13.4, 'Input formats:', fontsize=8,
            fontweight='bold', color='#1565C0')
    for i, f in enumerate(['PDF (GROBID)', 'LaTeX', 'DOCX']):
        ax.text(0.3, 13.0 - i * 0.24, f'• {f}', fontsize=7, color='#555')

    # Right-side annotation: 4 discipline profiles (next to stage 3)
    ax.text(9.1, 8.4, 'Discipline profiles:', fontsize=8,
            fontweight='bold', color='#1565C0')
    for i, p in enumerate(['CONSORT (RCTs)',
                           'STROBE (observational)',
                           'ICH-E9 (clinical trials)',
                           'JARS-Quant (psychology)']):
        ax.text(9.1, 8.05 - i * 0.24, f'• {p}', fontsize=7, color='#555')

    # Right-side annotation: 8 validators (next to stage 4)
    ax.text(9.1, 6.7, '8 validators:', fontsize=8,
            fontweight='bold', color='#1565C0')
    validators = [
        'Consistency (p-value recompute)',
        'Statistical consistency',
        'Multiple testing correction',
        'Effect size completeness',
        'Power reporting',
        'Reproducibility',
        'Methodological appropriateness',
        'Reporting completeness',
    ]
    for i, v in enumerate(validators):
        ax.text(9.1, 6.35 - i * 0.24, f'• {v}', fontsize=7, color='#555')

    ax.set_title('Manuscript Review Workflow',
                 fontsize=14, fontweight='bold', pad=10)

    plt.savefig(os.path.join(BASE, 'fig4_manuscript_review.png'))
    plt.savefig(os.path.join(BASE, 'fig4_manuscript_review.pdf'))
    print("Saved fig4_manuscript_review.png/pdf")
    plt.close()


# ═══════════════════════════════════════════════════════════════════
# Figure 6: Case Study 4 — Guardian vs naive on synovial-sarcoma RNA-seq
# ═══════════════════════════════════════════════════════════════════

def fig6_genomics_case_study():
    """Volcano plot + |log2FC| distribution showing Guardian's two
    protective behaviors on real RNA-seq data (GSE271517).

    Panel A: Volcano plot, all 27,221 genes colored by hit-list category.
    Panel B: |log2FC| histograms for Group A (Guardian rescued) and
             Group B (Guardian rejected) showing the two-pattern result.
    """
    import pandas as pd  # noqa: PLC0415

    csv_path = os.path.join(
        BASE, '..', '..', 'replication', 'case_study_4',
        'outputs', 'D_guardian_vs_naive.csv',
    )
    df = pd.read_csv(csv_path, index_col=0)

    # -log10 padj for the volcano y-axis. Cap at 1e-50 to keep axis scale
    # sane (some hits go to padj=0; the cap is a presentation choice).
    g_padj = df['adjusted_p_value'].clip(lower=1e-50)
    df = df.assign(neg_log10_padj=-np.log10(g_padj.values))

    fig, axes = plt.subplots(1, 2, figsize=(11.5, 4.8))

    # ---------------- Panel A: Volcano plot ----------------
    ax = axes[0]

    cat_color = {
        'neither':       ('#cccccc', 0.30, 4),   # gray, faint
        'hit_by_both':   ('#555555', 0.70, 8),   # dark gray
        'guardian_only': ('#1565c0', 0.85, 14),  # blue (project palette)
        'naive_only':    ('#e74c3c', 0.85, 14),  # red, stands out
    }
    # Plot in size order so important categories sit on top
    order = ['neither', 'hit_by_both', 'guardian_only', 'naive_only']
    for cat in order:
        sub = df[df['category'] == cat]
        color, alpha, size = cat_color[cat]
        ax.scatter(
            sub['log2_fold_change'], sub['neg_log10_padj'],
            c=color, alpha=alpha, s=size, edgecolors='none',
            label=f"{cat.replace('_', ' ')}: {len(sub):,}",
        )

    # Threshold lines
    ax.axhline(-np.log10(0.05), color='#777', linestyle='--', linewidth=0.6, alpha=0.5)
    ax.axvline(0, color='#777', linestyle='-', linewidth=0.4, alpha=0.5)

    ax.set_xlabel('log2 fold change (Metastasis vs Primary)', fontsize=10)
    ax.set_ylabel('-log10 (Guardian adjusted p)', fontsize=10)
    ax.set_xlim(-7, 7)

    leg = ax.legend(loc='upper right', fontsize=8, framealpha=0.95,
                    title='Hit-list category', title_fontsize=8.5)
    leg.get_frame().set_edgecolor('#ddd')

    ax.set_title('A  Volcano plot with Guardian-vs-naive categories',
                 loc='left', fontsize=11, fontweight='bold', pad=6)
    ax.grid(True, alpha=0.2, linewidth=0.4)

    # ---------------- Panel B: |log2FC| distribution ----------------
    ax = axes[1]

    g_only = df[df['category'] == 'guardian_only']['log2_fold_change'].abs()
    n_only = df[df['category'] == 'naive_only']['log2_fold_change'].abs()

    bins = np.linspace(0, 4, 25)
    ax.hist(
        g_only, bins=bins, color='#1565c0', alpha=0.65,
        edgecolor='#0d47a1', linewidth=0.5,
        label=f'Group A: Guardian rescued (n = {len(g_only)})\nmedian |log2FC| = {g_only.median():.2f}',
        density=True,
    )
    ax.hist(
        n_only, bins=bins, color='#e74c3c', alpha=0.65,
        edgecolor='#b71c1c', linewidth=0.5,
        label=f'Group B: Guardian rejected (n = {len(n_only)})\nmedian |log2FC| = {n_only.median():.2f}',
        density=True,
    )

    ax.axvline(1.0, color='#444', linestyle=':', linewidth=0.7, alpha=0.7)
    ax.text(1.05, ax.get_ylim()[1] * 0.92,
            f'|log2FC| ≥ 1\nGroup A: {(g_only >= 1).sum()} ({100*(g_only >= 1).mean():.0f}%)\nGroup B: {(n_only >= 1).sum()} ({100*(n_only >= 1).mean():.0f}%)',
            fontsize=7.5, va='top', color='#333')

    ax.set_xlabel('|log2 fold change|', fontsize=10)
    ax.set_ylabel('Density', fontsize=10)
    ax.set_xlim(0, 4)
    ax.legend(loc='upper right', fontsize=8, framealpha=0.95)
    ax.set_title('B  Effect-size distribution of verdict-flipped genes',
                 loc='left', fontsize=11, fontweight='bold', pad=6)
    ax.grid(True, alpha=0.2, linewidth=0.4)

    plt.tight_layout()
    plt.savefig(os.path.join(BASE, 'fig6_genomics_case_study.png'))
    plt.savefig(os.path.join(BASE, 'fig6_genomics_case_study.pdf'))
    print("Saved fig6_genomics_case_study.png/pdf")
    plt.close()


if __name__ == '__main__':
    print("Generating PLOS Comp Bio figures...\n")
    fig1_architecture()
    fig2_guardian_flowchart()
    fig3_case_studies()
    fig4_manuscript_review()
    fig5_validation()
    fig6_genomics_case_study()
    print("\nAll figures generated successfully!")
