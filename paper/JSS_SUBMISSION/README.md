# JSS Submission Package: StickForStats

## Paper Title
**StickForStats: A Statistical Analysis Platform with Automatic Assumption Validation**

## Authors
- Vishal Bharti (CSIR-IGIB)
- Debojyoti Chakraborty (CSIR-IGIB and AcSIR) - Corresponding Author

## Directory Structure

```
JSS_SUBMISSION/
├── README.md                    # This file
├── cover_letter.pdf             # Cover letter for editors
├── cover_letter.tex             # Cover letter source
│
├── manuscript/
│   └── stickforstats_expanded.pdf    # Main manuscript (33 pages)
│
├── source/
│   ├── stickforstats_expanded.tex    # LaTeX source
│   ├── stickforstats.bib             # Bibliography (29 references)
│   ├── jss.cls                       # JSS document class
│   ├── jss.bst                       # JSS bibliography style
│   └── figures/
│       ├── figure1.pdf               # System architecture
│       └── figure2.pdf               # Guardian workflow
│
└── replication/
    ├── README.md                     # Replication instructions
    ├── replicate_all.py              # Main replication script
    ├── run_all_validations.py        # SciPy validation
    ├── verify_real_data_analysis.py  # Real data case studies
    └── additional_real_data_analysis.py  # Additional datasets
```

## Submission Attachments for JSS

JSS requires three attachments:

1. **PDF Manuscript**: `manuscript/stickforstats_expanded.pdf`
2. **Source Code**: Available at https://github.com/visvikbharti/stickforstats_new
3. **Replication Materials**: `replication/replicate_all.py`

## Quick Verification

To verify all paper results:

```bash
cd replication
python replicate_all.py
```

## Contact

- Vishal Bharti: vishalvikashbharti@gmail.com
- Debojyoti Chakraborty: debojyoti.chakraborty@igib.in (Corresponding Author)
