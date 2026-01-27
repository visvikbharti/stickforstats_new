# StickForStats Paper Submission Checklist

**Document Created:** 2026-01-27 13:45 IST
**Paper Status:** Ready for Submission
**Git Commit:** b54a953

---

## Quick Reference

| Item | Status | Notes |
|------|--------|-------|
| Paper PDF | ✅ Ready | 41 pages, 614 KB |
| JSS Cover Letter | ✅ Ready | COVER_LETTER_JSS.pdf |
| arXiv Info | ✅ Ready | ARXIV_SUBMISSION_INFO.md |
| Replication Package | ✅ Complete | All scripts pass |
| Author Info | ✅ Updated | Both corresponding authors |
| All Claims Verified | ✅ Yes | Scientific integrity audit complete |

---

## Paper Files

### Main Manuscript
- **Source:** `source/stickforstats_expanded.tex`
- **PDF:** `source/stickforstats_expanded.pdf` (41 pages)
- **Backup:** `source/stickforstats_expanded_BACKUP_JAN26_2026.tex`

### Bibliography
- **File:** `source/stickforstats.bib`
- **Status:** Complete with all citations

### Style Files
- `source/jss.cls` - JSS document class
- `source/jss.bst` - JSS bibliography style
- `source/jsslogo.jpg` - JSS logo

---

## Author Information

### Author 1: Vishal Bharti (First Author, Corresponding Author)
- **Affiliation:** CSIR-Institute of Genomics and Integrative Biology, New Delhi, 110025, India
- **Email:** vishalvikashbharti@gmail.com
- **ORCID:** [0009-0003-1431-4457](https://orcid.org/0009-0003-1431-4457)

### Author 2: Debojyoti Chakraborty (Corresponding Author)
- **Affiliation 1:** CSIR-Institute of Genomics and Integrative Biology, New Delhi, 110025, India
- **Affiliation 2:** Academy of Scientific and Innovative Research (AcSIR), Ghaziabad, 201002, India
- **Email:** debojyoti.chakraborty@igib.in
- **ORCID:** [0000-0003-1460-7594](https://orcid.org/0000-0003-1460-7594)

---

## Replication Package

### Directory: `../replication/`

| Script | Purpose | Status |
|--------|---------|--------|
| `MASTER_VERIFICATION.py` | Run all verifications | ✅ Pass |
| `run_all_validations.py` | SciPy validation | ✅ Pass |
| `validate_against_R.R` | R cross-validation | ✅ Pass |
| `verify_case_studies_FINAL.py` | Case study verification | ✅ Pass |
| `validate_wine_quality_REAL.py` | Real UCI Wine data | ✅ Pass |
| `additional_real_data_analysis.py` | Additional datasets | ✅ Pass |

### Quick Verification Command
```bash
cd paper/replication
python MASTER_VERIFICATION.py
```

---

## JSS Submission Steps

1. Go to: https://www.jstatsoft.org/
2. Create account (if needed) and log in
3. Start new submission (select "Article")
4. Upload files:
   - Main manuscript: `stickforstats_expanded.pdf`
   - LaTeX source: `stickforstats_expanded.tex`
   - Bibliography: `stickforstats.bib`
   - Style files: `jss.cls`, `jss.bst`
   - Replication code: Zip of `replication/` directory
5. Enter metadata (title, authors, abstract, keywords)
6. Upload or paste cover letter
7. Submit

---

## arXiv Submission Steps

1. Go to: https://arxiv.org/submit
2. Login to arXiv account
3. Select category: stat.CO (primary), cs.SE (cross-list)
4. Upload source files (.tar.gz or .zip)
5. Enter metadata from ARXIV_SUBMISSION_INFO.md
6. Select license: arXiv perpetual, non-exclusive
7. Submit

---

*Ready for submission to arXiv and JSS*
*Checklist prepared: 2026-01-27*
