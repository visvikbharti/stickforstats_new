# Draft reply to Dr. Chakraborty — independence validator / sample ordering

*(Draft for Vishal to review and send. Tone: to the PI, not to BGPT. Full analyses:
`INDEPENDENCE_PERMUTATION_SENSITIVITY_MEMO.md` (independence) and `CALIBRATION_BENCHMARK_MEMO.md` (calibration).)*

---

Dear Dr. Chakraborty,

Thank you for forwarding this — it is a fair and technically correct point, and I checked it directly
against our code and re-ran it on the real GSE271517 data. Short version: **the critique is valid in general,
but it does not affect the paper's genome-scale result. And in looking at it I found a deeper, more honest
independence caveat we should add to the manuscript.** Details below; a full reproducible write-up and script
are in the repository.

**1. The point is correct in general.** Our independence validator is a lag-1 autocorrelation over the
observation order, so for data whose row order carries no temporal meaning — an omics matrix — a "violation"
it reports is partly an artifact of how the samples happen to be arranged. On the real data I measured this:
over the top 500 differentially-expressed genes, the independence-violation flag rate is **0.2% under a random
sample order but ~30% under a condition-sorted order** (and 32% under GSE271517's actual deposited order,
which already groups samples by condition). Same data, same genes — the flag is a function of arrangement.
The critique is right.

**2. It does not touch our genome-scale result.** The differential-expression module that produces the
Case Study 4 numbers **never calls the independence validator.** It cascades each gene on normality
(Shapiro-Wilk) and variance homogeneity (Levene) only — both of which depend on the *set* of values in a
group, not their order. I confirmed this empirically: permuting the 91 sample columns leaves the headline
numbers unchanged — same cascade rate (90.55%), the same 1,411-gene significant set, identical across every
permutation (the continuous test outputs move only at the 15th decimal, and no gene's verdict flipped). So the
ordering concern cannot move Case Study 4.

Where it *does* apply is the platform's general interactive path (an ordinary t-test/ANOVA), which runs the
lag-1 validator with only a text caveat, not an automatic gate. That is worth tightening, and I've written up
exactly how (below).

**3. The more important independence issue — which is the opposite of what BGPT flagged.** GSE271517 is
**91 samples from 55 patients** (17 patients gave more than one sample; one gave nine). Our per-gene t-test /
Mann-Whitney treats all 91 as independent, but they are clustered within patients. No validator we ship
catches this — the genomics path skips independence entirely, and a lag-1 autocorrelation could not detect
patient clustering even if it ran. This is a genuine limitation of the illustrative analysis (a *missed* real
dependence, not a spurious one). In our favour: the case study deliberately reproduces the *original* authors'
stated test choice (Chen et al. used unpaired t-test / Mann-Whitney on the same data), so we are replicating,
not introducing, the assumption — but GEO does also provide a patient-collapsed 55-sample matrix, and a
reviewer could fairly ask why we used the 91-sample one. I think the clean move is to state the clustering
plainly in the Limitations and note that the planned DESeq2/edgeR follow-up should use a patient-aware
(mixed-model or collapsed) design. Better we raise it than a reviewer.

**4. I went ahead and ran the calibration benchmark — the one point in the whole review we hadn't yet
answered with data.** Their fair question was whether Guardian's rerouting actually *improves* inference or
merely *changes* which test is used (i.e. does it improve Type I error / false-discovery control, or just swap
one p-value for another?). I built a controlled simulation with a known ground truth — 1,000 genes, 10% truly
differentially expressed, run through the **real** production service — framed as an ablation of the assumption
gate: the baseline is our *own* parametric branch with the gate switched off (an equal-variance t-test on every
gene), so the comparison isolates the value of the gate itself. The result is favourable and clearly
bounded:

- **Where a naive t-test breaks, the gate fixes it.** At the case study's unbalanced 55-vs-36 design with
  unequal variances, the ungated t-test's Type I error doubles to 0.100 and its false-discovery rate blows out
  to 0.179 (≈3.6× the nominal 0.05); Guardian detects the variance heterogeneity with Levene, routes ~90% of
  genes to Welch, and pulls these back to 0.058 and 0.068. It also *gains* power under heavy-tailed, skewed,
  and outlier-contaminated data by switching to Mann-Whitney, with Type I error staying near 0.05.
- **One honest limit, which I report rather than hide.** When the data are *both* heteroscedastic *and*
  heavy-tailed, the cascade routes on normality first and sends most genes to Mann-Whitney — which is itself
  variance-sensitive — so it only *partially* controls the error (Type I 0.080; it reduces the naive 0.094 but
  does not remove it). A fixed "always-Welch" default controls it fully here. That is a real finding, and it
  points at a concrete improvement rather than a weakness to bury: make the cascade *variance-aware* (prefer
  Welch whenever variances differ, even if normality also fails). I've written it into the paper as the
  identified next step.
- **For count data, the count-GLMs still win on power.** DESeq2 and edgeR on raw counts are more powerful than
  our rank cascade on log-CPM (≈0.82 vs 0.74 at 55-vs-36; roughly double at 20-vs-20), all at a near-nominal FDR
  (DESeq2 nudges just above 0.05 — to 0.062 — at the smaller size, a known small-sample effect) — which is
  exactly what our Group B reframing already argues.

So "does it improve, or just change?" is now answered with a figure (new **Fig 8**) instead of a promise. I've
added a short Results subsection, a Methods paragraph, and the figure to both manuscript versions, and upgraded
the Limitations sentence from "not benchmarked" to this demonstrated-but-bounded result. The simulation and its
interpretation were checked independently for errors before I committed it. Full write-up:
`CALIBRATION_BENCHMARK_MEMO.md`.

**On the rest of BGPT's review.** The email is just one slice of a longer auto-generated "paper review" on
their site — and it's reviewing our **bioRxiv v1** (June 19). I went through the whole thing point by point (a
one-page map is in `BGPT_REVIEW_RESPONSE.md`). The short version: it's a fair review, and **four of its five
"critical weaknesses" are already fixed or acknowledged in our resubmission** — the Group B / count-GLM point
(already reframed + DESeq2 follow-up named), the sphericity/multiplicity limit (already in our Limitations
verbatim), the "LLM extraction risk" (moot — our extraction is regex-only, and the current manuscript says so),
and the outlier-validator stability (it's already order-invariant). The independence point is the one I dug
into empirically (points 1–3), and the one item they raised that was still genuinely open — a Type I error /
FDR *calibration* benchmark (does rerouting *improve* results, not just *change* them) — I've now closed with a
simulation and a new figure, as in point 4 above. So after this pass, their points are either fixed or now
openly acknowledged in the manuscript as bounded limitations — the S6 calibration gap and the patient-clustering
dependence being the two we disclose rather than fully resolve.

**What I've already done** (committed to the repository, since these are the integrity-correction pattern we
already established for the resubmission):
- **Manuscript — independence:** clarified in the Guardian description that the lag-1 check applies only to
  sequentially ordered data and is not used in the genome-scale cascade, and added the arrangement-dependence
  and the patient-clustering caveat (point 3) to Limitations.
- **Manuscript — calibration:** added the new Results subsection, Methods paragraph, and **Fig 8** from point 4,
  and turned the "not benchmarked" Limitations sentence into the demonstrated-but-bounded result.
- Both changes are reflected in `CHANGES_FROM_PREPRINT.md`, and both PDF versions re-render cleanly.

**What's still open (your call):**
- **Code:** gate the independence validator so that, unless the caller declares the observation order is
  temporal/sequential, it returns "not applicable — independence is a matter of study design" instead of a
  lag-1 verdict. Backward-compatible and I'd keep the existing tests green — but it's a behaviour change to a
  shipped validator, so I wanted to flag it rather than just push it.

Everything above is reproducible from a clean checkout — the scripts, result files, and memos are committed
under `paper/replication/verification/`: independence (`independence_permutation_sensitivity.py`,
`INDEPENDENCE_PERMUTATION_SENSITIVITY_MEMO.md`) and calibration (`calibration_partA_continuous.py`,
`calibration_partB_countglm.py` + `calibration_partB_rmethods.R`, `calibration_figure.py`,
`CALIBRATION_BENCHMARK_MEMO.md`), both with a fixed random seed. Happy to walk through either.

Best,
Vishal

---

*P.S. (optional, for your awareness only — not for the reply): "BGPT" (bgpt.pro) is a commercial
scientific-data search engine that auto-generates "paper reviews" of public preprints and emails the
corresponding author as lead-generation (marketing buttons, unsubscribe link, "Author Review: …" hooks). It
reviewed our public bioRxiv v1 — nothing private was shared. The technical points are worth taking on their
merits regardless of the sender, which is why I worked through them; but I would not treat the "open paper
review" button as a formal review.*
