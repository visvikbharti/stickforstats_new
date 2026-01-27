# arXiv Submission Information for StickForStats Paper

**Document Created:** 2026-01-27
**Last Updated:** 2026-01-27

---

## Submission Details

### Title
**StickForStats: A Statistical Analysis Platform with Automatic Assumption Validation**

### Authors
1. **Vishal Bharti** (Corresponding Author)
   - Affiliation: CSIR-Institute of Genomics and Integrative Biology, New Delhi, 110025, India
   - Email: vishalvikashbharti@gmail.com
   - ORCID: 0009-0003-1431-4457

2. **Debojyoti Chakraborty** (Corresponding Author)
   - Affiliation 1: CSIR-Institute of Genomics and Integrative Biology, New Delhi, 110025, India
   - Affiliation 2: Academy of Scientific and Innovative Research (AcSIR), Ghaziabad, 201002, India
   - Email: debojyoti.chakraborty@igib.in
   - ORCID: 0000-0003-1460-7594

### Recommended Categories
- **Primary:** stat.CO (Computation)
- **Secondary:** cs.SE (Software Engineering), stat.ME (Methodology)

### Abstract (for arXiv submission form)
Statistical assumption violations contribute to unreliable results in scientific research. While assumption testing tools have been available in statistical software for decades, their optional nature means researchers may skip validation, potentially leading to invalid conclusions. We present StickForStats, an open-source statistical analysis platform featuring three integrated systems for improving statistical practice. First, the Guardian system provides automatic assumption validation that checks assumptions before every statistical test without requiring user action, implementing eight validators and recommending alternative tests when violations are detected. Second, an AI-powered Statistical Advisor offers natural language guidance for test selection, result interpretation, and automatic generation of publication-ready methods sections following APA/JARS guidelines. Third, a Paper Parser analyzes uploaded manuscripts to detect common statistical reporting errors and assess reproducibility. The platform also includes a Statistical Debugger for identifying analytical pitfalls, optional extended precision arithmetic using mpmath, and multi-language support. Validation against SciPy demonstrates agreement to 14+ decimal places for standard statistical tests, with cross-validation against R confirming case study results. We describe the design rationale, implementation details, and validation methodology, positioning StickForStats as a comprehensive tool for improving statistical practice in research.

### Comments (for arXiv submission form)
41 pages, 5 figures, 9 tables. Submitted to Journal of Statistical Software. Complete source code available at https://github.com/visvikbharti/stickforstats_new. Replication package included with downloadable datasets and verification scripts.

### MSC-class (optional)
62-04 (Software, source code, etc. for problems pertaining to statistics)

### ACM-class (optional)
G.3 (Probability and Statistics - Statistical software)

---

## Files to Submit

### Required Files
1. `stickforstats_expanded.tex` - Main manuscript source
2. `stickforstats.bib` - Bibliography file
3. `jss.cls` - JSS document class
4. `jss.bst` - JSS bibliography style
5. `jsslogo.jpg` - JSS logo (if required)

### Figures (in figures/ directory)
- `figure1_system_architecture.pdf` (or equivalent)
- Other figures as referenced in the paper

### Optional but Recommended
- `replication/` directory with verification scripts
- `README.md` for the submission

---

## Pre-submission Checklist

- [x] All authors listed with correct affiliations
- [x] ORCID IDs included for all authors
- [x] Abstract within arXiv character limit
- [x] Categories selected appropriately
- [x] All figures in acceptable format (PDF, PNG, JPG)
- [x] Bibliography file complete
- [x] Paper compiles without errors
- [x] All claims verified and reproducible
- [x] Code repository URL included
- [ ] Final PDF compiled and reviewed

---

## arXiv License Recommendation

**Recommended License:** arXiv.org perpetual, non-exclusive license to distribute (standard)

This allows:
- arXiv to distribute the article
- Others to access and read
- Authors retain copyright
- Compatible with subsequent journal publication

---

## Notes for Submission

1. **Cross-list to cs.SE** recommended since the paper describes software engineering principles (Design Contract pattern)

2. **Mention JSS submission** in the Comments field to indicate concurrent submission

3. **Include GitHub URL** in abstract/comments for immediate reproducibility

4. **Use stat.CO as primary** since the main contribution is statistical computing software

---

## Post-submission Actions

After arXiv acceptance:
1. Note the arXiv ID (e.g., arXiv:2601.XXXXX)
2. Update JSS submission with arXiv preprint link
3. Update GitHub repository README with arXiv link
4. Share on academic social media if appropriate

---

*Document prepared for arXiv submission of StickForStats manuscript*
*Date: 2026-01-27*
