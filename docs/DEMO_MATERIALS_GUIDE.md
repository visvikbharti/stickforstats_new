# StickForStats Demo Materials Guide

This guide provides instructions for capturing screenshots, GIFs, and videos to showcase StickForStats features for GitHub and presentations.

## Directory Structure

```
docs/
├── screenshots/           # Static PNG screenshots
│   ├── 01_landing_page.png
│   ├── 02_guardian_validation.png
│   ├── 03_ai_advisor.png
│   ├── 04_paper_parser.png
│   ├── 05_sqs_score.png
│   ├── 06_forest_plot.png
│   └── ...
├── gifs/                  # Animated GIFs for README
│   ├── guardian_demo.gif
│   ├── ai_advisor_demo.gif
│   └── sqs_analysis_demo.gif
└── videos/                # Full demo videos (link externally)
    └── README.md          # Links to YouTube/external hosting
```

---

## Required Screenshots

### Priority 1: Essential (for GitHub README)

| # | Screenshot | Description | How to Capture |
|---|------------|-------------|----------------|
| 1 | `01_landing_page.png` | Main landing page with all features visible | Navigate to http://localhost:3000, full page screenshot |
| 2 | `02_guardian_validation.png` | Guardian showing assumption results | Run a t-test, capture the assumption validation panel |
| 3 | `03_guardian_violation.png` | Guardian detecting a violation | Use non-normal data, capture the warning/alternative suggestion |
| 4 | `04_ai_advisor_chat.png` | AI Advisor conversation | Ask "Which test for comparing two groups?" |
| 5 | `05_paper_parser_upload.png` | Paper Parser with uploaded PDF | Upload a sample paper, capture the analysis |
| 6 | `06_sqs_score_display.png` | SQS Score result | Run SQS analysis, capture the score breakdown |

### Priority 2: Feature Highlights (for documentation)

| # | Screenshot | Description |
|---|------------|-------------|
| 7 | `07_ttest_results.png` | Complete t-test results with effect size |
| 8 | `08_anova_results.png` | ANOVA with post-hoc comparisons |
| 9 | `09_correlation_matrix.png` | Correlation analysis with heatmap |
| 10 | `10_power_analysis.png` | Power analysis curves |
| 11 | `11_meta_analysis_forest.png` | Forest plot from meta-analysis |
| 12 | `12_meta_analysis_funnel.png` | Funnel plot showing publication bias |
| 13 | `13_learning_hub.png` | Learning Hub with lessons |
| 14 | `14_report_export.png` | Exported report preview |

### Priority 3: For Paper (JSS submission)

| # | Screenshot | Description | Paper Section |
|---|------------|-------------|---------------|
| 15 | `figure3_guardian_ui.png` | Guardian validation panel | Section 4 |
| 16 | `figure4_ai_advisor_ui.png` | AI Advisor interface | Section 5 |
| 17 | `figure5_sqs_report.png` | SQS Score breakdown | Section 6/Future Work |

---

## How to Capture Screenshots

### macOS

```bash
# Full screen
Cmd + Shift + 3

# Selection
Cmd + Shift + 4

# Window
Cmd + Shift + 4, then Space, then click window

# Recommended tool: CleanShot X or native Screenshot app
```

### Browser DevTools

For consistent dimensions:
1. Open DevTools (Cmd + Option + I)
2. Click Device Toolbar (Cmd + Shift + M)
3. Set dimensions: 1280x800 (standard)
4. Capture with DevTools: Cmd + Shift + P → "Capture screenshot"

### Recommended Settings

- **Resolution**: 1280x800 or 1440x900
- **Format**: PNG (for quality)
- **Browser**: Chrome (consistent rendering)
- **Theme**: Light mode (better for documentation)

---

## GIF Recording Guide

### Tool: Kap (free, macOS)

1. Install: `brew install --cask kap`
2. Open Kap
3. Select recording area
4. Record 10-30 second demo
5. Export as GIF (optimize for web)

### Recommended GIFs

| GIF | Duration | What to Show |
|-----|----------|--------------|
| `guardian_demo.gif` | 15-20s | Run test → See assumption validation → View results |
| `ai_advisor_demo.gif` | 20-30s | Ask question → Get recommendation → Follow suggestion |
| `sqs_analysis_demo.gif` | 15-20s | Upload PDF → Select field → View score breakdown |

### GIF Specifications

- **Width**: 800px max (for GitHub README)
- **Frame rate**: 10-15 fps
- **Duration**: Under 30 seconds
- **File size**: Under 5MB (GitHub limit)

---

## Video Recording Guide

For full demo videos (host on YouTube):

### Content Outline

**Video 1: "StickForStats Quick Start" (3-5 min)**
1. Introduction (30s)
2. Running first analysis (1 min)
3. Understanding Guardian results (1 min)
4. Using AI Advisor (1 min)
5. Conclusion (30s)

**Video 2: "Guardian Deep Dive" (5-7 min)**
1. What is Guardian?
2. Assumption validation in action
3. Handling violations
4. Alternative test suggestions

**Video 3: "SQS System Demo" (3-5 min)**
1. Upload manuscript
2. Select research field
3. Understand score breakdown
4. Act on recommendations

### Recording Tips

- Use OBS Studio (free) or ScreenFlow (paid)
- Record at 1080p
- Add voiceover narration
- Include captions
- Host on YouTube (unlisted or public)

---

## Sample Data for Demos

### For Guardian Violation Demo

```python
# Non-normal data (will trigger Guardian warning)
import numpy as np
np.random.seed(42)
group1 = np.concatenate([np.random.normal(0, 1, 20), [10, 12, 15]])  # Outliers
group2 = np.random.normal(0, 1, 23)
```

### For Perfect Analysis Demo

```python
# Clean normal data (will pass all assumptions)
np.random.seed(42)
group1 = np.random.normal(50, 10, 30)
group2 = np.random.normal(55, 10, 30)
```

### For SQS Demo

Use the StickForStats paper itself (`paper/stickforstats_expanded.pdf`) - it scores 85% (Grade B).

---

## Checklist Before Capturing

- [ ] Both servers running (Django:8000, React:3000)
- [ ] Clear browser cache
- [ ] Close unnecessary tabs/notifications
- [ ] Hide bookmarks bar
- [ ] Use incognito/clean profile
- [ ] Check light mode is enabled
- [ ] Verify sample data is ready

---

## File Naming Convention

```
[number]_[feature]_[action].png

Examples:
01_landing_page.png
02_guardian_ttest_results.png
03_guardian_violation_warning.png
04_ai_advisor_test_recommendation.png
05_sqs_score_psychology.png
```

---

## Quick Capture Commands

After capturing, move to correct directory:

```bash
# Move screenshots
mv ~/Desktop/Screenshot*.png docs/screenshots/

# Rename with convention
cd docs/screenshots
mv Screenshot*.png 01_landing_page.png
```

---

*Guide created: December 16, 2025*
*For StickForStats v1.0*
