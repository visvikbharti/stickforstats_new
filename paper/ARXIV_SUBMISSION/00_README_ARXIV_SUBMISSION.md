# ArXiv Submission Package -- StickForStats

**Last updated:** 2026-02-19 (audit-verified version, all case studies corrected)
**Status:** Ready for submission

---

## Package Contents

This directory contains everything needed for ArXiv LaTeX compilation.

| File | Purpose | Include in upload? |
|------|---------|-------------------|
| `stickforstats_expanded.tex` | Main manuscript source (1586 lines) | **Yes** |
| `stickforstats_expanded.bbl` | Pre-compiled bibliography (29 references) | **Yes** |
| `jss.cls` | JSS document class | **Yes** |
| `jss.bst` | JSS bibliography style | **Yes** |
| `jsslogo.jpg` | JSS logo (referenced by `jss.cls`) | **Yes** |
| `figures/figure1.pdf` | System architecture diagram | **Yes** |
| `figures/figure2.pdf` | Guardian workflow diagram | **Yes** |
| `stickforstats_expanded.pdf` | Pre-compiled PDF (for reference only) | No (ArXiv compiles from source) |
| `stickforstats.bib` | BibTeX source (for reference only) | No (ArXiv uses `.bbl`) |
| `00_README_ARXIV_SUBMISSION.md` | This file | No |

### File integrity checksums (SHA-256)

```
716a91cf6402...  stickforstats_expanded.tex
24e9fe599c2b...  stickforstats_expanded.pdf
```

---

## How to Submit

### 1. Create or log in to your ArXiv account

- https://arxiv.org/user/register (new account)
- https://arxiv.org/login (existing account)
- First-time submitters may need endorsement (1--2 days).

### 2. Start a new submission

Go to https://arxiv.org/submit and click "Start New Submission."

### 3. Choose license

Select: **arXiv.org perpetual, non-exclusive license to distribute**
(You retain copyright; ArXiv can distribute.)

### 4. Select categories

- **Primary:** `stat.CO` (Statistics -- Computation)
- **Cross-list (optional):** `cs.SE` (Software Engineering), `stat.ME` (Methodology)

### 5. Upload the submission zip

Upload `ARXIV_SUBMISSION.zip` (located one level up at `paper/ARXIV_SUBMISSION.zip`).

The zip contains only the files ArXiv needs to compile:

```
stickforstats_expanded.tex
stickforstats_expanded.bbl
jss.cls
jss.bst
jsslogo.jpg
figures/figure1.pdf
figures/figure2.pdf
```

ArXiv will auto-detect `stickforstats_expanded.tex` as the main file and compile it.

### 6. Enter metadata

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
Statistical assumption violations contribute to unreliable results in scientific
research. While assumption testing tools have been available in statistical software
for decades, their optional nature means researchers may skip validation, potentially
leading to invalid conclusions. We present StickForStats, an open-source statistical
analysis platform featuring three integrated systems for improving statistical
practice. First, the Guardian system provides automatic assumption validation that
checks assumptions before every statistical test without requiring user action,
implementing eight validators and recommending alternative tests when violations are
detected. Second, an AI-powered Statistical Advisor offers natural language guidance
for test selection, result interpretation, and automatic generation of
publication-ready methods sections following APA/JARS guidelines. Third, a Paper
Parser analyzes uploaded manuscripts to detect common statistical reporting errors and
assess reproducibility. The platform also includes a Statistical Debugger for
identifying analytical pitfalls, optional extended precision arithmetic using mpmath,
and multi-language support. Validation against SciPy demonstrates agreement to 14+
decimal places for standard statistical tests, with cross-validation against R
confirming case study results. We describe the design rationale, implementation
details, and validation methodology, positioning StickForStats as a comprehensive tool
for improving statistical practice in research.
```

**Comments:**
```
41 pages, 2 figures, 7 tables. Submitted to Journal of Statistical Software.
Source code: https://github.com/visvikbharti/stickforstats_new
```

**MSC-class (optional):** `62-04`
**ACM-class (optional):** `G.3`

### 7. Preview and submit

1. Click "Preview" -- ArXiv will compile the paper (1--2 minutes).
2. Review the generated PDF.
3. If it looks correct, click "Submit."
4. Note the submission ID (e.g., `submit/1234567`).

### 8. After submission

- ArXiv processes submissions on a daily schedule (afternoon US Eastern time).
- You will receive an email with an arXiv identifier (e.g., `arXiv:2602.XXXXX`).
- Update the JSS submission and GitHub repository with the arXiv link.

---

## Compilation Notes

The `.tex` file contains a `\bibliography{stickforstats}` command. ArXiv's build
system handles this correctly when a `.bbl` file is present: it uses the pre-compiled
`.bbl` for references rather than running BibTeX. The `.bib` file is excluded from the
zip because it is not needed.

All LaTeX packages used (`amsmath`, `amssymb`, `booktabs`, `algorithm`,
`algpseudocode`, `tikz`, `graphicx`, `listings`, `xcolor`) are part of standard TeX
Live distributions and are available on ArXiv's build system.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| ArXiv cannot compile | Verify the `.bbl` file is included in the upload |
| Figures not found | Ensure the `figures/` directory structure is preserved in the zip |
| Missing fonts | The `jss.cls` uses standard LaTeX fonts; no special fonts needed |
| Endorsement required | First-time submitters to `stat.CO` need endorsement from an existing author |

---

## Version History

- **2026-02-19:** Updated README for audit-verified manuscript (all case studies
  corrected, 7 manuscript-codebase discrepancies fixed, figure/table counts verified).
- **2026-01-27:** Initial ArXiv submission package created.

---

*Contact: vishalvikashbharti@gmail.com*
