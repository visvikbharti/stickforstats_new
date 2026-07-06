# Venue recommendation — Paper 1 (StickForStats / Guardian platform)

**Date:** 2026-07-06 (revised to a **Q1-JCR** target set). Researched across ~20 venues.
**Verify APCs and the exact JCR rank live at submission** (aggregator data below is from ooir.org /
wos-journal.info, which reproduce Clarivate JCR; confirm the paywalled Clarivate figure for any load-bearing
cover-letter citation).
**Context:** MIT-licensed statistical-assumption-validation tool + manuscript consistency checker + calibration
benchmark, RNA-seq case study; single corresponding author + PI at **CSIR-IGIB, India**; bioRxiv preprint live;
desk-rejected 3× (JSS, JOSS, PLOS Comp Biol) on **scope/novelty**, not quality.

## Two findings that shape everything

**1. Q1 IS worth pursuing — but only through *soundness-based* Q1 journals, not novelty-gating ones.** All three
prior desk-rejects gate on novelty/impact, so a sound-but-not-novel tool dies at the editor's desk. The fix is
not to abandon Q1; it is to target journals that are **genuinely JCR Q1 in their category AND whose published
policy forbids rejecting on impact/novelty.** That set is narrow but real and has a clear winner.

**2. Correction to the earlier draft of this doc (important): PeerJ, PLOS ONE, GigaByte, GigaScience, and
Bioinformatics Advances are all JCR *Q2*, not Q1.** Their "Q1" badge online is **Scimago (SJR)**, a different
system. GigaScience specifically is **JCR Q2** (Multidisciplinary Sciences, #17/64). Most Indian PhD/UGC/API
frameworks count **JCR** quartiles — so if you require Q1, those venues do **not** qualify. This is why the
recommendation below changed to BMC Bioinformatics.

## Decisive constraint: India gets NO automatic APC waiver anywhere (except JOSS, which already rejected you)
India is excluded from Research4Life (GNI > US$1T cap) and therefore from the income-based waivers of
Springer Nature/BMC, OUP, PLOS, and PeerJ. Only relief is a **discretionary need-based request at submission**
(PLOS PFA, Frontiers fee support) or an institutional Read-&-Publish deal. Budget full sticker (~$2,900–3,100).

## The genuinely Q1 + soundness sweet spot

| Journal | JIF | JCR category → quartile | Editorial bar | Tool article type | Index | APC (India, no waiver) |
|---|---|---|---|---|---|---|
| **BMC Bioinformatics** ⭐ | 4.4 | **Q1** in Biochem Res Methods (#12/73), Biotech & Applied Micro (#30/142), **and** Math & Comp Bio (#6/51) | Soundness — "we do not judge impact/interest" | dedicated **"Software"** | SCIE | ~$2,890 |
| **BMC Medical Research Methodology** | 3.7 | **Q1** Health Care Sciences & Services (#14/101) | Soundness | dedicated **"Software"** | SCIE | ~$3,090 |
| **Frontiers in Bioinformatics** | 3.6 | **Q1** Math & Comp Bio (80.6th pct) | Soundness | **"Technology and Code"** | **ESCI** (not SCIE) | ~CHF 2,695 |
| **Scientific Reports** (Nature) | 4.9 | **Q1** Multidisciplinary Sciences (~85th pct) | Soundness — "technically sound" | Research Article (tools OK) | SCIE | ~$2,890 |

## Ranked recommendation

### 1. BMC Bioinformatics — submit here first ★
The **only** venue that is JCR **Q1 in three categories** *and* carries an explicit "we do not make decisions on
the basis of interest/impact" policy *and* has a purpose-built **"Software"** article type. It breaks your
desk-reject pattern while staying unambiguously Q1. The genomics/RNA-seq case study anchors it squarely in
scope; frame the manuscript-checker as a reproducibility companion module. Mild caveat: an originality/
duplication screen (must not merely re-implement an existing tool) — an assumption-validation + statcheck-style
platform + calibration benchmark clears it. IF 4.4, ~$2,890, ~3–6 mo review, SCIE.
Sources: https://ooir.org/j.php?issn=1471-2105 · https://www.biomedcentral.com/getpublished/editorial-policies ·
https://bmcbioinformatics.biomedcentral.com/submission-guidelines/preparing-your-manuscript/software-article

### 2. BMC Medical Research Methodology — strong #2 with the medical/methodology framing
JCR **Q1 Health Care Sciences & Services**, soundness bar, dedicated "Software" type. Lead with the
assumption-checking + FDR-calibration + RNA-seq-DE angle so it reads as health-research methodology (its scope
otherwise redirects generic tool papers). IF 3.7, ~$3,090, SCIE.
Sources: https://ooir.org/j.php?issn=1471-2288 ·
https://bmcmedresmethodol.biomedcentral.com/submission-guidelines/preparing-your-manuscript/software-article

### 3. Frontiers in Bioinformatics — fastest Q1 route, one asterisk
JCR **Q1 Math & Comp Bio**, soundness bar, dedicated **"Technology and Code"** type, fast collaborative review
(~2–3 mo). **Asterisk: ESCI, not SCIE** — Web-of-Science-indexed and JCR-ranked, but some Indian committees
distinguish ESCI from SCIE; confirm your PhD framework accepts ESCI before choosing it. IF 3.6, ~CHF 2,695.
Sources: https://wos-journal.info/journalid/23899 ·
https://www.frontiersin.org/journals/bioinformatics/for-authors/article-types

### 4. Scientific Reports — Q1 safety net
JCR **Q1 Multidisciplinary Sciences**, soundness-only ("technically sound"), near-zero novelty desk-reject risk.
Trade-off: high volume, lower prestige-per-Q1, no dedicated software type. IF 4.9, ~$2,890, SCIE.
Source: https://wos-journal.info/journalid/13280

## Do NOT resubmit to — Q1 but will desk-reject again (same failure mode as your 3 rejects)
Briefings in Bioinformatics (IF 7.3, hard novelty gate), Bioinformatics/OUP (Application Notes gate on "advance"
+ broad user base), Patterns/Cell Press (explicit novelty + cross-disciplinary-appeal gate), and the three that
already rejected you (PLOS Comp Biol, JSS, JOSS).

## If your framework accepts Scimago (SJR) Q1 instead of JCR
Your pool widens to PeerJ, PeerJ Computer Science, GigaScience, and BioData Mining (all **Scimago Q1** but
**JCR Q2**). Only pursue these if your evaluators count Scimago — otherwise they fail your "no Q2" rule.

## Suggested path
Submit to **BMC Bioinformatics** first (request the discretionary APC waiver in the cover letter). Keep **BMC MRM**
and **Frontiers in Bioinformatics** (ESCI-permitting) as ranked backups, **Scientific Reports** as the Q1 safety
net. Before submitting: post **bioRxiv v2** (see `BIORXIV_V2_UPLOAD.md`) and mint the **Zenodo DOI** for the
code/data-availability statement.

*(Synthesis from two 2026-07 web-research passes; JCR figures reflect the JCR 2025 edition, stable vs 2024 for
all recommended journals. Re-verify APCs and exact ranks at submission.)*
