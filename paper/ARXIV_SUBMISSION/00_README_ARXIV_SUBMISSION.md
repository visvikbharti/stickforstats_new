# arXiv Submission Guide for StickForStats Paper

**Created:** 2026-01-27
**Status:** Ready for submission

---

## Quick Summary

You have TWO options for arXiv submission:

| Option | What to upload | Difficulty |
|--------|---------------|------------|
| **Option A: PDF only** | Just `stickforstats_expanded.pdf` | Easiest |
| **Option B: LaTeX source** | All .tex, .bib, .cls files | Recommended |

**I recommend Option B** (LaTeX source) because:
- arXiv compiles it (looks more professional)
- Easy to make future revisions
- Better for citations

---

## Step-by-Step Instructions

### Step 1: Create arXiv Account (if you don't have one)

1. Go to: https://arxiv.org/user/register
2. Fill in your details
3. Verify your email
4. Wait for endorsement (may take 1-2 days for first submission)

### Step 2: Start New Submission

1. Go to: https://arxiv.org/submit
2. Click "Start New Submission"

### Step 3: Choose License

Select: **arXiv.org perpetual, non-exclusive license to distribute**

This is the standard choice - you keep copyright, arXiv can distribute.

### Step 4: Select Categories

- **Primary category:** `stat.CO` (Statistics - Computation)
- **Cross-list (optional):** 
  - `cs.SE` (Computer Science - Software Engineering)
  - `stat.ME` (Statistics - Methodology)

### Step 5: Upload Files

#### Option A: PDF Only
- Just upload `stickforstats_expanded.pdf`
- Click "Process"

#### Option B: LaTeX Source (Recommended)

Upload these files:
```
stickforstats_expanded.tex   (main file)
stickforstats_expanded.bbl   (bibliography - compiled)
jss.cls                       (style class)
jss.bst                       (bibliography style)
jsslogo.jpg                   (logo image)
figures/                      (folder with figures)
```

**Important:** 
- You can upload files individually OR create a .zip/.tar.gz file
- The main .tex file will be auto-detected

### Step 6: Enter Metadata

**Title:**
```
StickForStats: A Statistical Analysis Platform with Automatic Assumption Validation
```

**Authors:**
```
Vishal Bharti, Debojyoti Chakraborty
```

**Abstract:**
```
Statistical assumption violations contribute to unreliable results in scientific research. While assumption testing tools have been available in statistical software for decades, their optional nature means researchers may skip validation, potentially leading to invalid conclusions. We present StickForStats, an open-source statistical analysis platform featuring three integrated systems for improving statistical practice. First, the Guardian system provides automatic assumption validation that checks assumptions before every statistical test without requiring user action, implementing eight validators and recommending alternative tests when violations are detected. Second, an AI-powered Statistical Advisor offers natural language guidance for test selection, result interpretation, and automatic generation of publication-ready methods sections following APA/JARS guidelines. Third, a Paper Parser analyzes uploaded manuscripts to detect common statistical reporting errors and assess reproducibility. The platform also includes a Statistical Debugger for identifying analytical pitfalls, optional extended precision arithmetic using mpmath, and multi-language support. Validation against SciPy demonstrates agreement to 14+ decimal places for standard statistical tests, with cross-validation against R confirming case study results. We describe the design rationale, implementation details, and validation methodology, positioning StickForStats as a comprehensive tool for improving statistical practice in research.
```

**Comments:**
```
41 pages, 5 figures, 9 tables. Submitted to Journal of Statistical Software. Source code: https://github.com/visvikbharti/stickforstats_new
```

**MSC-class (optional):**
```
62-04
```

**ACM-class (optional):**
```
G.3
```

### Step 7: Preview and Submit

1. Click "Preview"
2. arXiv will compile your paper (takes 1-2 minutes)
3. Review the PDF that arXiv generated
4. If it looks good, click "Submit"
5. You'll get a submission ID (e.g., submit/1234567)

### Step 8: Wait for Processing

- arXiv processes submissions at specific times (usually afternoon US Eastern time)
- You'll receive an email when your paper is assigned an arXiv ID
- Typical format: `arXiv:2601.XXXXX` (year+month.number)

---

## Files in This Directory

| File | Purpose | Required for arXiv |
|------|---------|-------------------|
| `stickforstats_expanded.tex` | Main manuscript | Yes |
| `stickforstats_expanded.bbl` | Compiled bibliography | Yes (for LaTeX submission) |
| `stickforstats_expanded.pdf` | Compiled PDF | Yes (for PDF-only submission) |
| `jss.cls` | JSS document class | Yes |
| `jss.bst` | Bibliography style | No (we use .bbl) |
| `jsslogo.jpg` | JSS logo | Yes |
| `stickforstats.bib` | Bibliography source | No (we use .bbl) |
| `figures/` | Figure files | Yes |

---

## Common Issues and Solutions

### Issue: arXiv can't compile
**Solution:** Submit the .bbl file (already compiled bibliography) instead of .bib

### Issue: Missing fonts
**Solution:** The jss.cls uses standard LaTeX fonts, should work

### Issue: Figures not found
**Solution:** Make sure figures/ directory is included in upload

### Issue: Need endorsement
**Solution:** First-time submitters to a category need endorsement. Ask a colleague who has published in that category, or wait for arXiv to find an endorser.

---

## After Submission

1. **Note your arXiv ID** (e.g., arXiv:2601.12345)
2. **Update your JSS submission** with the arXiv link
3. **Update GitHub README** with arXiv link
4. **Share on social media** if desired

---

## Contact

If you have issues:
- arXiv help: https://arxiv.org/help
- Email Vishal: vishalvikashbharti@gmail.com

---

*Guide created: 2026-01-27*
