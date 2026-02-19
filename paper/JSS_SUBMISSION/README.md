# JSS Submission Package: StickForStats

## Paper Title

**StickForStats: A Statistical Analysis Platform with Automatic Assumption Validation**

## Authors

- Vishal Bharti (CSIR-IGIB, New Delhi) -- Corresponding Author
- Debojyoti Chakraborty (CSIR-IGIB and AcSIR) -- Corresponding Author

## Directory Structure

```
JSS_SUBMISSION/
|-- README.md                         This file
|-- COVER_LETTER_JSS.pdf              Cover letter for editors (PDF)
|-- COVER_LETTER_JSS.tex              Cover letter (LaTeX source)
|-- COVER_LETTER_JSS.md               Cover letter (Markdown)
|-- SUBMISSION_CHECKLIST.md           Submission checklist and author info
|
|-- manuscript/
|   +-- stickforstats_expanded.pdf    Compiled manuscript (PDF)
|
|-- source/
|   |-- stickforstats_expanded.tex    LaTeX source
|   |-- stickforstats_expanded.bbl    Compiled bibliography
|   |-- stickforstats.bib             BibTeX bibliography
|   |-- jss.cls                       JSS document class
|   |-- jss.bst                       JSS bibliography style
|   |-- jsslogo.jpg                   JSS logo
|   +-- figures/
|       |-- figure1.pdf               System architecture diagram
|       |-- figure1.tex               Figure 1 TikZ source
|       |-- figure2.pdf               Guardian workflow diagram
|       +-- figure2.tex               Figure 2 TikZ source
|
+-- replication/
    |-- README.md                     Replication instructions (detailed)
    |-- requirements.txt              Python dependencies
    |-- MASTER_VERIFICATION.py        Master verification script (run this)
    |-- run_all_validations.py        SciPy validation suite (6 tests)
    |-- verify_case_studies_FINAL.py  Definitive case study verification
    |-- verify_real_data_analysis.py  Real data analysis verification
    |-- validate_wine_quality_REAL.py UCI Wine Quality analysis
    |-- additional_real_data_analysis.py  mtcars, ToothGrowth, PlantGrowth
    |-- validate_meta_analysis_paper_data.py  Meta-analysis verification
    |-- create_correct_meta_analysis_data.py  Meta-analysis data generation
    |-- find_optimal_meta_data.py     Meta-analysis seed search
    |-- validate_against_R.R          R cross-validation script
    +-- data/
        |-- winequality-red.csv       UCI red wine dataset (1,599 samples)
        +-- winequality-white.csv     UCI white wine dataset (4,898 samples)
```

## Submission Components

### 1. Manuscript

The compiled PDF is in `manuscript/stickforstats_expanded.pdf`. The LaTeX
source and all supporting files (bibliography, class file, figures) are in
`source/`.

### 2. Cover Letter

`COVER_LETTER_JSS.pdf` contains the cover letter addressed to the JSS editors.

### 3. Replication Materials

The `replication/` directory contains Python and R scripts that independently
reproduce every numerical result in the paper. See `replication/README.md` for
detailed descriptions of each script.

**Quick verification** (requires Python >= 3.9):

```bash
cd replication
pip install -r requirements.txt
python MASTER_VERIFICATION.py
```

This runs all validation scripts and reports a consolidated pass/fail status.
Expected runtime is under 60 seconds.

### 4. Software

The StickForStats software is available at:
https://github.com/visvikbharti/stickforstats_new

## Contact

- Vishal Bharti: vishalvikashbharti@gmail.com (Corresponding Author)
- Debojyoti Chakraborty: debojyoti.chakraborty@igib.in (Corresponding Author)
