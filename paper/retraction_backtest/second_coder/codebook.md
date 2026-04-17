# Codebook — Statistical-Cause Retraction Taxonomy

**Source.** `paper/retraction_backtest/PROTOCOL.md` §9.1, frozen at commit `3da1c65`. This file reproduces the codebook in coder-facing form with decision-tree order and worked examples. **In any conflict between this file and PROTOCOL.md, PROTOCOL.md controls.**

## How to use this codebook

You will see a row with a `reason_raw` field containing one or more semicolon-separated Retraction Watch reason codes (e.g. `"+Error in Analyses;+Investigation by Company/Institution;"`). Some rows also have free-text fragments. Your job is to decide whether any element of `reason_raw` triggers a **stat** code (§1), only **nonstat** codes (§2), or a mixture (**ambiguous**, §3).

**Go through §1 first, then §2, then apply §3. Do not re-order.**

Matching is **case-insensitive substring match** on the `reason_raw` field. If you are unsure whether a free-text phrase matches a pattern listed below, write `ambiguous` and note your uncertainty in the `notes` column — but attempt a label first.

---

## §1. STATISTICAL-CAUSE codes (`stat`)

A row is `stat` if **at least one** of the following substrings appears in `reason_raw`:

### 1.1 Retraction Watch controlled-vocabulary codes
- `Error in Data`
- `Error in Analyses`
- `Error in Methods`
- `Error in Results and/or Conclusions`
- `Error in Statistical Analysis`
- `Statistical Error in Analyses`
- `Unreliable Data`
- `Unreliable Results and/or Conclusions`
- `Duplication of Data`
- `Results Not Reproducible`
- `Inappropriate Statistical Methods`
- `Concerns/Issues About Data`
- `Concerns/Issues About Results and/or Conclusions`

### 1.2 Carve-out — Falsification/Fabrication of Data
`Falsification/Fabrication of Data` is **stat only when the falsification concerns numerical values**. If the retraction notice indicates that the falsification was of **images or figures** (without accompanying numerical claim), treat it as non-stat — this will typically appear together with an image-manipulation code and should fall into §3 (ambiguous) rather than §1. If the notice does not disambiguate, label `ambiguous`.

### 1.3 Keyword phrases (case-insensitive, in free text)
- "inappropriate statistical test"
- "incorrect statistical analysis"
- "error in statistical analysis"
- "statistical error"
- "inflated significance"
- "sample size (too small | insufficient | inadequate)"
- "unadjusted multiple comparisons"
- "multiple testing not corrected"
- "incorrect standard error"
- "incorrect p-value" (with or without hyphen)
- "incorrect (test statistic | F statistic | t statistic | chi-square)"
- "data duplication producing (spurious | false | artifactual)"
- "error bars"
- "incorrect normalisation" (or "normalization")
- "assumption (violated | not tested)"
- "non-independent observations"

---

## §2. NON-STATISTICAL codes (`nonstat`)

A row is `nonstat` if it matches **none** of the §1 triggers and **at least one** of the following:

- Plagiarism / self-plagiarism / plagiarism of/in article / plagiarism of text / euphemisms for plagiarism
- Authorship disputes / concerns about authorship or affiliation / false or forged authorship
- IRB / IACUC / ethics violations / informed or patient consent
- Image manipulation / duplication of image / concerns about image / falsification/fabrication of image / error in image
- Journal policy / breach of policy by author
- Copyright
- Duplicate publication / duplication of article / euphemisms for duplication

(See `PROTOCOL.md §9.1` and `harvest.py::NON_STAT_REASON_CODES` for the exact substring list as implemented.)

---

## §3. AMBIGUOUS

A row is `ambiguous` if it matches **both** §1 and §2 triggers — e.g., a notice that cites "Error in Data" **and** "Plagiarism of/in Article" simultaneously. Primary-analysis convention (PROTOCOL §9.1):

> Ambiguous cases are classified as **stat** for the **primary** analysis and as **nonstat** for a **sensitivity** analysis (§10.3 label-boundary sensitivity).

For labeling purposes, write `ambiguous`. The primary coder's taxonomy does the same; this keeps the two coders' label spaces identical.

---

## Worked examples

**Example A — `stat`**
> `reason_raw`: `"+Error in Analyses;+Investigation by Third Party;+Author Unresponsive;"`
→ Contains `Error in Analyses` (§1.1). Label: **`stat`**. The `Investigation by Third Party` and `Author Unresponsive` codes do not belong to §2, so they do not push into ambiguous.

**Example B — `nonstat`**
> `reason_raw`: `"+Plagiarism of Text;+Breach of Policy by Author;"`
→ No §1 triggers. Matches `Plagiarism` and `Breach of Policy` in §2. Label: **`nonstat`**.

**Example C — `ambiguous`**
> `reason_raw`: `"+Falsification/Fabrication of Data;+Manipulation of Images;"`
→ §1.2 carve-out applies: Falsification is ambiguous because we cannot tell from reason codes alone whether it refers to numerical values or images; the simultaneous image code strongly suggests images. Label: **`ambiguous`** (the note-worthy case; jot "image-only falsification likely" in notes).

**Example D — `stat`**
> `reason_raw`: `"+Concerns/Issues About Data;"`
→ §1.1 match. Label: **`stat`**.

**Example E — `nonstat`**
> `reason_raw`: `"+Duplicate Publication;"`
→ §2 match; no §1 triggers. Label: **`nonstat`**.

**Example F — edge, `stat`**
> `reason_raw`: `"+Unreliable Results and/or Conclusions;+Notice - Limited or No Information;"`
→ §1.1 match on `Unreliable Results and/or Conclusions`. The "Notice - Limited or No Information" code is a documentation flag, not a §2 non-stat trigger. Label: **`stat`**.

**Example G — `nonstat` (carve-out applies)**
> `reason_raw`: `"+Falsification/Fabrication of Image;+Research Misconduct - Official Investigation(s);"`
→ No §1 trigger fires (Image-flavoured falsification is §2 only, per Retraction Watch vocabulary). Label: **`nonstat`**.

---

## What to do with rows you cannot classify

If after reading `reason_raw` and consulting the Retraction Watch controlled vocabulary you genuinely cannot decide, label `ambiguous` and leave a sentence in the `notes` column describing what you considered. The primary coder will adjudicate during κ computation.

Do **not** skip rows. Do **not** add new labels beyond the three in §1–§3. Do **not** access the SQS score, the SQS rule hits, the manifest, or the source manuscript — only `reason_raw` (and optionally the retraction-notice DOI via `retraction_doi` if you want to read the full notice).
