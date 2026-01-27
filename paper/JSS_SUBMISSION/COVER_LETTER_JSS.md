# Cover Letter for Journal of Statistical Software

---

**To:**
Editorial Office
Journal of Statistical Software

**Date:** January 27, 2026

**Subject:** Submission of Manuscript - "StickForStats: A Statistical Analysis Platform with Automatic Assumption Validation"

---

Dear Editors,

We are pleased to submit our manuscript entitled **"StickForStats: A Statistical Analysis Platform with Automatic Assumption Validation"** for consideration for publication in the *Journal of Statistical Software*.

## Summary

StickForStats is an open-source statistical analysis platform that addresses a fundamental problem in research: statistical assumption violations often go unchecked, leading to unreliable results. Our platform introduces the Guardian system—the first implementation of *mandatory, automatic* assumption validation integrated directly into statistical software.

## Key Contributions

1. **Guardian System**: Automatic assumption validation with eight validators (normality, variance homogeneity, independence, linearity, outliers, sample size, multicollinearity, publication bias) that cannot be bypassed, ensuring researchers always see assumption status before results.

2. **Design Contract**: A novel software architecture principle where "no statistical result may exist without an explicit, traceable assumption context." This is enforced through 93 automated tests (38 backend, 55 frontend).

3. **AI-Powered Advisor**: Natural language guidance for test selection and automatic generation of publication-ready methods sections following APA/JARS guidelines.

4. **Paper Parser**: Manuscript analysis tool that detects statistical reporting errors and assesses reproducibility.

5. **Comprehensive Validation**: All statistical functions validated against SciPy (14+ digit agreement) and cross-validated against R. Case studies use real datasets (Fisher's Iris, UCI Wine Quality) with reproducible results.

## Relevance to JSS

This manuscript is highly relevant to JSS because:

- It presents novel statistical software with a unique approach to assumption checking
- The software is open-source and freely available at https://github.com/visvikbharti/stickforstats_new
- The paper includes comprehensive code examples and a complete replication package
- All numerical results are reproducible using provided scripts

## Replication Materials

The complete replication package is included with the submission:

- `run_all_validations.py` – SciPy validation (all tests pass)
- `validate_against_R.R` – R cross-validation (all tests pass)
- `verify_case_studies_FINAL.py` – Case study verification
- `data/winequality-red.csv` – Downloaded UCI Wine Quality dataset

## Declarations

- This manuscript has not been published elsewhere and is not under consideration by another journal.
- All authors have approved the manuscript and agree with its submission.
- There are no conflicts of interest to declare.
- The software is released under an open-source license.

## Corresponding Authors

Both authors serve as corresponding authors:

- **Vishal Bharti:** vishalvikashbharti@gmail.com
- **Debojyoti Chakraborty:** debojyoti.chakraborty@igib.in

We believe StickForStats represents a significant contribution to statistical software and will be of great interest to the JSS readership. We look forward to your response.

---

Sincerely,

**Vishal Bharti**
CSIR-Institute of Genomics and Integrative Biology
New Delhi 110025, India
vishalvikashbharti@gmail.com

**Debojyoti Chakraborty**
CSIR-Institute of Genomics and Integrative Biology
New Delhi 110025, India
& Academy of Scientific and Innovative Research (AcSIR)
Ghaziabad 201002, India
debojyoti.chakraborty@igib.in
