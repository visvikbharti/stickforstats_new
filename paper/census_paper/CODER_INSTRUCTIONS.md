# Coder instructions — κ double-coding of flagged statistical inconsistencies

**Hand this to each of the two coders.** It tells you *what to do, step by step*. The *rules* for how to
classify each item live in **`CODEBOOK.md`** — read that fully before you start. This file is the workflow;
the codebook is the law.

---

## 1. Why this matters (the 30-second version)

An automated census scanned ~10,000 biomedical papers and flagged some reported statistics as **internally
inconsistent** (the p-value it recomputed from the test statistic + degrees of freedom disagreed with the
p-value the authors printed). Before we publish any claim about how common that is, **two independent humans
must check a sample of those flags** — to prove the tool's verdicts are trustworthy and to separate *real*
inconsistencies from *artifacts of automated checking*.

Your agreement with each other is measured by **Cohen's κ**. The study is **pre-registered to require κ ≥ 0.6**
(substantial agreement). You are the credibility anchor of the whole paper.

---

## 2. The golden rules

1. **Code independently.** The two coders must NOT discuss items, sit together, or compare answers until
   *both* are completely finished. (You may discuss the *codebook* beforehand to align on the rules — but not
   specific rows.)
2. **Do not look at the tool's answer.** There is a file `gold_set_key.csv` that contains the tool's own
   classification. **Do not open it.** Opening it breaks the blinding and invalidates the study.
3. **Use only the codebook.** Classify each row using `CODEBOOK.md` and the information in your sheet — do not
   go and re-read the source papers (that is a different study).
4. **Exactly one category per row**, using these exact lowercase labels:
   `genuine`, `one_tailed`, `p_bound`, `mis_extraction`.

---

## 3. Step by step

1. **Get your own copy of the sheet.** From `gold_set_coding_sheet.csv`, make a personal copy:
   - Coder 1 → `coding_coder1.csv`
   - Coder 2 → `coding_coder2.csv`

   (Working on separate copies guarantees you can't see each other's column. We merge them at the end.)

2. **Open it in a spreadsheet** (Excel / Google Sheets / Numbers). Each row is one flagged claim. You are
   given, per row:
   | column | meaning |
   |---|---|
   | `raw_text` | the **verbatim** reported result from the paper (this is the main thing you judge) |
   | `statistic`, `df` | the test statistic and degrees of freedom |
   | `reported_p` | the p-value the authors printed |
   | `p_comparison` | whether the paper wrote `p = …` (`equals`), `p < …` (`less`), or `p > …` (`greater`) |
   | `recomputed_p` | the two-tailed p **we** computed from the statistic + df |

3. **For each row, apply the codebook's decision order** (top-down, first match wins):
   1. No point p attached to *this* statistic in `raw_text`? → `mis_extraction`
   2. Else `p_comparison` is `less`/`greater` (a bound)? → `p_bound`
   3. Else `recomputed_p ≈ 2 × reported_p` (within ~25%)? → `one_tailed`
   4. Else → `genuine`

4. **Write your label in your own column:**
   - Coder 1 fills the **`coder1_category`** column.
   - Coder 2 fills the **`coder2_category`** column.
   - (Leave the other coder's column blank in your copy.)

5. **Use the `notes` column freely** for anything ambiguous ("rounding-level", "two readings", "df typo?"). If
   you're torn between two categories, pick your best judgment and note it — the adjudicator resolves ties later.

6. **Do all 151 rows.** Don't skip any. Budget roughly **1.5–2.5 hours** (≈30–60 s/row once you're warmed up).

7. **Return your finished copy** (`coding_coder1.csv` / `coding_coder2.csv`) to the study lead. Do not edit it
   after you've seen the other coder's answers.

---

## 4. One worked example

> `raw_text = "r = 0.378, p = 0.014"`, `recomputed_p = 0.0096`, `p_comparison = equals`
>
> Walk the decision order: (1) there *is* a point p (`p = 0.014`) for this `r` → not `mis_extraction`.
> (2) `p_comparison` is `equals`, not a bound → not `p_bound`. (3) is 0.0096 ≈ 2 × 0.014 (=0.028)? No → not
> `one_tailed`. (4) → **`genuine`**.

More examples for each category are in `CODEBOOK.md` §1–§4.

---

## 5. What happens after both of you finish

The study lead will:
1. Merge `coder1_category` and `coder2_category` back into one `gold_set_coding_sheet.csv`.
2. Run `python paper/census_paper/compute_kappa.py`, which writes `KAPPA_REPORT.md` with:
   - **Cohen's κ** between the two of you (must be **≥ 0.6**), and
   - the tool's sensitivity / specificity / PPV against your consensus (after adjudicating disagreements via
     an optional `adjudicator_category` column).
3. If κ ≥ 0.6, the gold-set result goes into the paper. If not, we refine the codebook and re-code.

---

## 6. Quick checklist (per coder)

- [ ] Read `CODEBOOK.md` end to end.
- [ ] Made my own copy of the sheet; never opened `gold_set_key.csv`.
- [ ] Did not discuss specific rows with the other coder.
- [ ] Classified all 151 rows with exactly one of `genuine` / `one_tailed` / `p_bound` / `mis_extraction`.
- [ ] Filled only my column (`coderN_category`); used `notes` for ambiguous cases.
- [ ] Returned my finished copy to the study lead.

*Thank you — this is the single human-judgment step that makes the census defensible.*
