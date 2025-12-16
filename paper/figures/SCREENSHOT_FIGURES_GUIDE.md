# Adding UI Screenshots to the JSS Paper

This guide explains how to add UI screenshots to the StickForStats JSS paper.

## Current Figures

The paper currently has 2 figures:
- **Figure 1**: System Architecture (TikZ diagram)
- **Figure 2**: Guardian Workflow (TikZ diagram)

## Recommended Additional Figures (Optional)

JSS papers commonly include UI screenshots. Consider adding:

### Figure 3: Guardian Validation Interface

**What to capture:**
- The Guardian results panel after running a t-test
- Show assumption validation results with green checkmarks
- Include the confidence score display

**How to capture:**
1. Navigate to http://localhost:3000
2. Run a t-test with sample data
3. Capture the Guardian results panel
4. Save as `figure3_guardian_ui.png` (300 DPI)

### Figure 4: SQS Score Display

**What to capture:**
- The SQS score breakdown after analyzing a paper
- Show the circular score gauge and category bars
- Include recommendations panel

**How to capture:**
1. Go to Paper Parser
2. Upload stickforstats_expanded.pdf
3. Click "Calculate SQS Score"
4. Capture the results
5. Save as `figure4_sqs_ui.png` (300 DPI)

---

## LaTeX Code to Add Screenshots

Add the following code to `stickforstats_expanded.tex` after the Guardian section (around line 618):

```latex
% Optional: Add after existing figures, before AI Statistical Advisor section

\begin{figure}[htbp]
\centering
\includegraphics[width=0.9\textwidth]{figures/figure3_guardian_ui.png}
\caption{The Guardian validation interface showing assumption test results for an
independent samples t-test. The panel displays normality (Shapiro-Wilk), variance
homogeneity (Levene's test), and outlier detection results with green indicators
showing all assumptions passed. The confidence score of 1.0 indicates high reliability
of the statistical test results.}
\label{fig:guardian-ui}
\end{figure}
```

For SQS (add in Future Work section if desired):

```latex
\begin{figure}[htbp]
\centering
\includegraphics[width=0.85\textwidth]{figures/figure4_sqs_ui.png}
\caption{Statistical Quality Score (SQS) display showing the analysis results for a
psychology manuscript. The score of 85/100 (Grade B) reflects strong statistical
reporting quality, with 100\% on Assumption Transparency and Reproducibility categories.}
\label{fig:sqs-ui}
\end{figure}
```

---

## Image Specifications for JSS

| Requirement | Value |
|-------------|-------|
| Format | PNG or PDF |
| Resolution | 300 DPI minimum |
| Width | Max 6.5 inches (for single column) |
| Color | RGB (JSS publishes in color) |
| File size | Keep under 2MB |

## Screenshot Dimensions

For consistent appearance:
- **Width**: 1200-1400 pixels
- **Browser window**: Clean, no bookmarks bar
- **Theme**: Light mode preferred
- **Crop**: Remove browser chrome, keep only content area

---

## Quick Capture Workflow

1. **Prepare environment:**
   ```bash
   # Ensure servers are running
   cd backend && python manage.py runserver &
   cd frontend && npm start &
   ```

2. **Capture with DevTools:**
   - Open Chrome DevTools (Cmd+Option+I)
   - Click device toolbar (Cmd+Shift+M)
   - Set dimensions: 1280x800
   - Cmd+Shift+P → "Capture full size screenshot"

3. **Process image:**
   ```bash
   # Convert to 300 DPI PDF (for LaTeX)
   convert figure3_guardian_ui.png -density 300 figure3_guardian_ui.pdf
   ```

4. **Move to figures directory:**
   ```bash
   mv figure3_guardian_ui.* paper/figures/
   ```

5. **Compile paper to verify:**
   ```bash
   cd paper
   pdflatex stickforstats_expanded.tex
   ```

---

## Decision: Should You Add Screenshots?

**Arguments FOR adding screenshots:**
- JSS is a software journal, visual demonstration helps
- Shows the actual user experience
- Differentiates from purely technical papers

**Arguments AGAINST:**
- Paper is already 37 pages (within JSS limits)
- Technical diagrams may be sufficient
- Screenshots can become outdated

**Recommendation:** The current paper with 2 technical diagrams is academically solid. Adding screenshots is optional enhancement, not required. If you do add them, focus on Figure 3 (Guardian UI) as the most distinctive feature.

---

*Guide created: December 16, 2025*
