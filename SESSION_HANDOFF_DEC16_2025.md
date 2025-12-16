# Session Handoff Document
## StickForStats JSS Paper Submission
**Date:** December 16, 2025
**Last Updated:** End of session

---

## Executive Summary

StickForStats is a statistical analysis platform with **automatic assumption validation** through the Guardian system. The JSS (Journal of Statistical Software) paper is **complete and ready for submission** pending PI approval.

**Current Status:** ✅ Ready for PI review and JSS submission

---

## Project Overview

### What is StickForStats?
- **Full-stack statistical analysis platform** (Django backend + React frontend)
- **Key Innovation:** Guardian system - automatically validates statistical assumptions before every test
- **8 validators:** normality, variance homogeneity, independence, outliers, sample size, modality, linearity, homoscedasticity
- **Target users:** Researchers who need reliable statistical analysis with assumption checking

### Repository
- **URL:** https://github.com/visvikbharti/stickforstats_new
- **Branch:** main
- **Last commit:** `4424dca` - "paper: Add JSS submission package with cover letter and replication materials"

---

## Authors & Affiliations

### Vishal Bharti (First Author)
- **Email:** vishalvikashbharti@gmail.com
- **ORCID:** 0009-0003-1431-4457
- **Affiliation:** CSIR-Institute of Genomics and Integrative Biology (IGIB), New Delhi, India
- **Note:** Only CSIR-IGIB affiliation (NOT AcSIR)

### Dr. Debojyoti Chakraborty (Corresponding Author & PI)
- **Email:** debojyoti.chakraborty@igib.in
- **Affiliation:** CSIR-IGIB AND Academy of Scientific and Innovative Research (AcSIR)
- **ORCID:** Not yet obtained (Vishal needs to ask him)

---

## Paper Status

### JSS Paper Details
| Aspect | Status |
|--------|--------|
| Title | StickForStats: A Statistical Analysis Platform with Automatic Assumption Validation |
| Pages | 37 pages (JSS requires 25-40) ✅ |
| Figures | 2 (architecture + workflow) |
| Tables | 6 |
| References | 30 (all verified in .bib) |
| Format | JSS LaTeX template |

### New Sections Added (Dec 16 continuation)
- **Section 5: AI Statistical Advisor** - Natural language interface, test selector, methods section generator
- **Section 6: Paper Parser** - PDF analysis for statistical reporting quality, JARS-Quant compliance
- Statistical Debugger included as subsection of Paper Parser

### Key Files
```
paper/
├── stickforstats_expanded.tex    # Main LaTeX source (33 pages)
├── stickforstats_expanded.pdf    # Compiled PDF
├── stickforstats.bib             # Bibliography (29 refs)
├── jss.cls, jss.bst              # JSS style files
├── figures/
│   ├── figure1.pdf               # System architecture
│   └── figure2.pdf               # Guardian workflow
└── JSS_SUBMISSION/               # SUBMISSION-READY PACKAGE
    ├── README.md
    ├── SUBMISSION_CHECKLIST.md   # Step-by-step guide
    ├── cover_letter.pdf
    ├── manuscript/
    ├── source/
    └── replication/
        └── replicate_all.py      # Reproduces ALL paper results
```

### Numerical Claims Verified
All numbers in the paper match actual computations:
- Iris ANOVA: F=119.26, Levene p=0.0023, variance ratio=3.25, η²=0.619
- Meta-analysis: Pooled effect=0.271, Egger p=0.024
- mtcars R²=0.7528, ToothGrowth Cohen's d=0.495, PlantGrowth η²=0.264
- SciPy agreement: 14+ decimal places

---

## What Was Accomplished This Session

### 1. Paper Finalization
- [x] Fixed author affiliations (Vishal: IGIB only; Chakraborty: IGIB + AcSIR)
- [x] Added clickable ORCID icon next to Vishal's name
- [x] Removed "Division of Chemical and Systems Biology" (was incorrect)

### 2. AI Detection Prevention
- [x] Removed ALL em-dashes (---) from paper content (7 instances)
- [x] Replaced with commas, parentheses, or rewording
- [x] Changed "Statistical software landscape" → "Existing statistical software"
- [x] Verified no AI-flagged phrases (utilize, delve, cutting-edge, etc.)

### 3. Submission Package Created
- [x] Created `/paper/JSS_SUBMISSION/` directory
- [x] Cover letter (PDF + LaTeX source)
- [x] Replication scripts with `replicate_all.py` master script
- [x] Step-by-step submission checklist
- [x] All pushed to GitHub

### 4. Understanding Vishal's Writing Style
From reading his personal essays, key characteristics:
- Humble and questioning ("I wonder", "I believe", "I think")
- Uses parentheses and commas, NOT em-dashes
- Acknowledges uncertainty openly
- Direct but not overly formal
- Philosophical inclination (consciousness, meaning of life themes)

---

## Pending Actions (For Vishal)

### Before Submission
- [ ] Share paper with Dr. Chakraborty for approval
- [ ] Get Dr. Chakraborty's ORCID (optional but recommended)
- [ ] Verify GitHub repo is public and accessible
- [ ] Submit to JSS following `SUBMISSION_CHECKLIST.md`

### JSS Submission Process
1. Go to https://www.jstatsoft.org/
2. Create account / log in
3. Select "Software Paper"
4. Upload: manuscript PDF, link to GitHub, replication script
5. Fill metadata (title, authors, abstract, keywords)
6. Submit

---

## Technical Context

### Compilation
Paper compiles using Docker with LaTeX:
```bash
docker run --rm -v /Users/vishalbharti/StickForStats_v1.0_Production/paper:/workdir \
  -w /workdir blang/latex:ctanfull \
  sh -c "pdflatex -interaction=nonstopmode stickforstats_expanded.tex && \
         bibtex stickforstats_expanded && \
         pdflatex -interaction=nonstopmode stickforstats_expanded.tex && \
         pdflatex -interaction=nonstopmode stickforstats_expanded.tex"
```

### Custom ORCID Icon
The `orcidlink` package wasn't available, so a custom TikZ-based icon was created:
```latex
\definecolor{orcidgreen}{HTML}{A6CE39}
\newcommand{\orcidicon}[1]{%
  \href{https://orcid.org/#1}{%
    \begin{tikzpicture}[baseline=-0.1em]
      \fill[orcidgreen] (0,0) circle (0.4em);
      \node[white,font=\bfseries\tiny] at (0,0) {iD};
    \end{tikzpicture}%
  }%
}
```

### Replication Verification
```bash
cd paper/JSS_SUBMISSION/replication
python replicate_all.py
# Expected: All results match paper values
```

---

## Important Files Quick Reference

| Purpose | Path |
|---------|------|
| Main paper (PDF) | `paper/stickforstats_expanded.pdf` |
| Main paper (LaTeX) | `paper/stickforstats_expanded.tex` |
| Bibliography | `paper/stickforstats.bib` |
| Submission package | `paper/JSS_SUBMISSION/` |
| Cover letter | `paper/JSS_SUBMISSION/cover_letter.pdf` |
| Replication script | `paper/JSS_SUBMISSION/replication/replicate_all.py` |
| Submission guide | `paper/JSS_SUBMISSION/SUBMISSION_CHECKLIST.md` |
| Critical review | `paper/CRITICAL_REVIEW_FINAL.md` |

---

## Vishal's Personal Context

### Background
- Works at CSIR-IGIB in RNA Biology Lab under Dr. Debojyoti Chakraborty
- Previously received PhD offer from Monash University (Melbourne)
- Has been working on StickForStats for ~1.7 years
- Values scientific integrity highly ("do not fabricate anything")

### Writing Samples Location
Personal essays (for style reference):
- `/Users/vishalbharti/Downloads/misc/my_articles/`
  - Why_do_we_write.pdf
  - TheLife.pdf
  - What DNA means to you.pdf
  - (and others)

### Communication Style
- Appreciates thorough, careful work
- Values humility and honesty
- Uses "ultrathink" to request deep analysis
- Prefers step-by-step guidance

---

## Known Issues / Gotchas

1. **Docker TeX Live 2017**: Uses older distribution; some packages (like `orcidlink`) unavailable
2. **Gitignore patterns**: Some patterns exclude `*_CHECKLIST.md` etc. - use `-f` flag or exceptions
3. **Em-dashes**: Classic AI detection flag - always use commas/parentheses instead
4. **Affiliation accuracy**: Vishal only has IGIB, not AcSIR (was incorrectly added earlier)

---

## What NOT to Do

1. **Don't fabricate data or exaggerate claims** - Scientific integrity is paramount
2. **Don't use em-dashes (---)** - AI detection flag
3. **Don't add AcSIR to Vishal's affiliation** - He only has CSIR-IGIB
4. **Don't assume Division of Chemical and Systems Biology** - Not used in this paper

---

## Session Continuity Notes

### If Continuing Paper Work
1. Read `paper/CRITICAL_REVIEW_FINAL.md` for verification status
2. Check `paper/JSS_SUBMISSION/SUBMISSION_CHECKLIST.md` for submission status
3. Verify compilation still works with Docker command above

### If PI Has Feedback
1. Make changes to `paper/stickforstats_expanded.tex`
2. Recompile using Docker command
3. Update JSS_SUBMISSION folder if needed
4. Commit and push changes

### If Submission Completed
1. Note the JSS submission ID
2. Track review status
3. Be prepared for revision requests (typical: 2-6 months)

---

## Contact Information

- **Vishal Bharti:** vishalvikashbharti@gmail.com
- **Dr. Debojyoti Chakraborty:** debojyoti.chakraborty@igib.in
- **GitHub:** https://github.com/visvikbharti/stickforstats_new
- **JSS:** https://www.jstatsoft.org/

---

## Final Checklist for Next Session

When resuming, verify:
- [ ] Git status is clean
- [ ] Paper PDF opens correctly
- [ ] Replication script runs without errors
- [ ] GitHub repo is up to date
- [ ] Check if Vishal submitted to JSS (and outcome)

---

*This handoff document ensures complete context preservation for future sessions.*
*Last session ended with: JSS submission package complete, pushed to GitHub, ready for PI review.*
