# Response to the BGPT auto-review of StickForStats

**Date:** 2026-07-06
**What this is:** a point-by-point response to the AI-generated "Paper Review: StickForStats" produced by
**BGPT** (bgpt.pro), a commercial scientific-data search engine, and forwarded to the PI. Companion to the
empirical analysis in `INDEPENDENCE_PERMUTATION_SENSITIVITY_MEMO.md`.

---

## Framing (read first)

- **BGPT is a commercial product**, not a journal or a human reviewer. It is an AI paper-search/"review"
  engine (first 50 results free, then ~$0.02/result) that auto-generates a critique of any public paper and
  emails the corresponding author as lead-generation. The "Author Review: …" buttons are engagement hooks.
- **It reviewed our bioRxiv v1** (it states *"Paper date (as provided): June 19, 2026"*). Several of its
  criticisms target text we have **already corrected** in the resubmission.
- **It is a fair review, not a hit piece.** Its own "Most defensible takeaway" is *positive*. Nothing in it is
  an integrity problem or a submission blocker.
- **No data or code was shared with BGPT.** Everything it cites is from our public preprint and open-source
  repository.

**Bottom line:** of its five "critical weaknesses," four are already fixed or acknowledged in our current
manuscript, and the fifth (independence order-sensitivity) we have now answered empirically on the real data.
One genuinely substantive, still-open item remains — a Type I error / FDR *calibration* benchmark — which is
honest future work and does not undermine the paper as framed.

---

## Point-by-point

### 4.1 — Thresholds / severity calibration ("brittle defaults")
> *Severity depends on fixed thresholds; reroutes should be tied to a formally justified decision rule; a
> "default-on" system could itself create reproducibility issues.*

**Valid, partly acknowledged.** The Limitations section already flags *threshold dependence* and notes Guardian
mitigates it by reporting the actual test statistics, not just classifications. The deeper part of this point
— "are the reroutes *better*, not just *different*?" — is the one substantive open item; see **§Calibration**
below.

### 4.2 — Independence / cluster-batch dependence
> *The independence validator is lag-1 Pearson autocorrelation over observation order. Real biological
> dependence is cluster/batch-structured (patients within sites, technical replicates), not "lag-1 ordered,"
> so an order-based validator could miss or mischaracterize it. Falsification: permute sample/gene order and
> check whether independence checks and rerouting decisions are stable.*

**Valid in general; fully answered.** We ran exactly the falsification test BGPT proposes, on the real
GSE271517 data (`independence_permutation_sensitivity.py`):

- **The genome-scale rerouting decisions are stable under permutation.** The Case Study 4 pipeline never uses
  the independence validator — it cascades on normality (Shapiro-Wilk) + variance (Levene), both order-
  invariant — so permuting the 91 sample columns leaves the headline identical (90.55% cascade, same 1,411-gene
  significant set) across every permutation.
- **The independence validator itself *is* order-sensitive**, confirming BGPT's general point: on the same
  genes, the independence-violation flag rate is 0.2% under a random order vs ~30% under a condition-sorted
  order.
- **The cluster/batch blind spot BGPT names is real and we found it independently:** GSE271517 is 91 samples
  from 55 patients (some in both arms), a clustered dependence that *no* validator in the platform detects. We
  are adding this to the Limitations (see `MANUSCRIPT_EDITS_independence.md`) and noting the patient-aware
  follow-up.

*(BGPT also lists the **outlier** validator alongside independence in §6-ii as needing permutation-stability
tests. That one is already fine: the OutlierDetector uses IQR percentiles + Z-scores, both functions of the
value set, not the order — it is order-invariant. Only the independence validator is order-sensitive.)*

### 4.3 — RNA-seq: Mann–Whitney rerouting ≠ modern count-GLM DE
> *Mann–Whitney does not replicate DESeq2/edgeR behavior; it changes the estimand and may ignore mean–variance
> structure; the paper gives no Type I error control comparison for this substitution.*

**Valid; already addressed in the resubmission.** We withdrew the v1 claim that the 74 "Group B" genes were
false positives that Guardian "correctly rejected." The current manuscript reframes Group B as a genuine
*pipeline disagreement* (count-GLMs may legitimately call many of them DE) and states that *"a formal
DESeq2/edgeR benchmark of this set is a planned, pre-registered follow-up."* BGPT is reading the v1 text that
still had the overclaim.

### 4.4 — Retrospective consistency has interpretational limits
> *Recomputing p from the reported statistic + df cannot recover sphericity-corrected (Greenhouse–Geisser/
> Huynh–Feldt) or multiplicity-adjusted (Tukey/Dunnett) p-values, so it measures "recomputable consistency,"
> not "statistical correctness."*

**Valid; already in our Limitations almost verbatim.** The manuscript explicitly states the checker cannot
recover a sphericity-corrected or multiplicity-adjusted p-value, that flagged items are recompute-vs-reported
discrepancies for human review (not confirmed errors), and it reports the full breakdown (15 of 19 flags are
explainable tool limitations). No change needed.

### 4.5 — Manuscript extraction: "regex/LLM-hybrid risk surface"
> *Extraction uses a regex + LLM hybrid; LLM extraction is phrasing-sensitive and could silently misread
> claims; no recall/precision reported.*

**Moot — based on withdrawn v1 text.** Extraction is **regex-based; no language model is used.** The current
manuscript says so explicitly (§Clinical trial manuscript review: *"extracts statistical claims via a
deterministic regex pattern library (no language model is used in extraction)"*), and this was recorded as a
v1→resubmission correction (`CHANGES_FROM_PREPRINT.md` #2). BGPT's "LLM risk surface" does not exist in the
implemented system. Its suggested remedy — evaluate extraction against a gold-standard labelled corpus — is
in fact what the companion census work does (gold set + κ double-coding).

### §6 — "What would change my confidence"
- **(i) External blind benchmark showing better *calibration*** — the one open item; see below.
- **(ii) Permutation-stability for independence *and outlier* validators** — independence: done (4.2); outlier:
  already order-invariant.
- **(iii) Extraction precision/recall** — covered by the census gold-set + κ work.

---

## The one substantive open item: calibration (not just "change")

Stripped of the already-handled points, BGPT's real recurring critique (4.1, 4.3, §6-i) is:

> You demonstrate that Guardian's reroutes **change** decisions; you have not shown they **improve** them — a
> Type I error / FDR calibration benchmark where the cascaded pipeline is measurably better-calibrated than a
> naïve baseline (and vs a count-GLM baseline for the RNA-seq case).

This is a fair "you-could-claim-more" critique, not a flaw in what we claim. The resubmission's framing already
answers it defensively: StickForStats is presented as a **sound, useful, transparent tool with an honest
evaluation**, *not* as a novel method with proven inferential superiority. The honest response is to name the
calibration study as future work (one Limitations sentence — drafted in `MANUSCRIPT_EDITS_independence.md`,
Edit 4). Actually running it — simulate data with known ground truth, compare Type I/FDR of the Guardian
cascade vs naïve t-test vs DESeq2/edgeR under controlled batch/zero-inflation perturbations — is a worthwhile
standalone study but is not required to defend the current paper.

---

## Suggested actions

1. **Reply to the PI** (draft: `PI_REPLY_DRAFT_independence.md`) — the point is fair but mostly already
   handled; the independence part is answered empirically.
2. **Apply the four manuscript edits** (`MANUSCRIPT_EDITS_independence.md`, incl. the new calibration sentence)
   on PI sign-off, then re-render.
3. **Do not engage BGPT's buttons** as if they were a real review; treat this as useful free QA of the public
   preprint.
4. **Optional, larger:** scope the calibration benchmark as a future-work study (or a short simulation appendix)
   if a target reviewer is likely to press on it.
