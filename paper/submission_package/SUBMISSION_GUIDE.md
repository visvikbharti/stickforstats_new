# SUBMISSION_GUIDE.md — Resubmitting the StickForStats software paper

**Paper:** *StickForStats: automated statistical assumption validation for reproducible computational biology*
**Authors:** Vishal Bharti, Debojyoti Chakraborty (CSIR-Institute of Genomics and Integrative Biology, New Delhi)
**Tool:** Open-source, MIT-licensed — <https://github.com/visvikbharti/stickforstats_new> (v1.0.0)
**Preprint (LIVE):** bioRxiv doi **10.64898/2026.06.15.732278** (posted 2026-06-19)

**History to be transparent about:** the manuscript was desk-rejected **three times** (JSS, JOSS, PLOS Computational Biology), each on **scope / perceived-novelty fit — not on quality, soundness, or correctness.** The resubmission strategy is therefore to target a **"soundness-not-novelty" venue** that judges whether the work is technically sound, reproducible, and useful, rather than whether the method is conceptually new.

> **Read this first.** Every fee, page limit, and formatting rule below is from memory and may have changed. **Treat every item marked "VERIFY at submission" as unconfirmed until you have checked the journal's current author guidelines on its own website on the day you submit.** Do not rely on numbers in this file for go/no-go decisions on cost.

---

## TL;DR — recommended order

Ranked shortlist for *this* paper (a sound, reproducible, useful open-source tool with an honest evaluation, in the computational-biology space):

1. **PLOS ONE** — explicitly judges *technical soundness, not novelty or impact*; that is the exact mismatch that sank the three prior submissions. Strong indexing, large readership, mature data/code-availability policy. The main cost is the APC (VERIFY).
2. **PeerJ** — same soundness-not-novelty philosophy, life-sciences/comp-bio home, lower APC than PLOS ONE (VERIFY), open peer review optional. Excellent fit for a methods/tool + real-data evaluation paper.
3. **GigaScience / GigaByte** — built for reproducible data-and-software papers; reviewers actually run the code. GigaByte is cheaper (VERIFY) but **ESCI-indexed only** (no Web of Science Core / JIF yet) — weigh that against cost. GigaScience proper is the higher-prestige sibling.
4. **BMC Bioinformatics** — strong, well-indexed bioinformatics venue for software/tool articles. Best fit *technically*, but the APC is the highest of the shortlist (VERIFY) and it weighs perceived advance more than PLOS ONE/PeerJ.

If budget is the binding constraint, look at **JORS** and **F1000Research** (see table). If you would rather ship the code-as-the-artifact, **SoftwareX** is purpose-built but demands a runnable code package alongside the paper.

---

## Journal options (ranked)

| Journal | Scope fit for THIS paper | Approx APC (VERIFY at submission) | Format / requirements highlights | Why it fits | Watch-outs |
|---|---|---|---|---|---|
| **PLOS ONE** | High — software + honest evaluation; comp-bio readership | ~US$2,477 (VERIFY); fee-assistance / institutional-transfer routes may apply (VERIFY) | LaTeX or Word; structured-ish but flexible; mandatory Data Availability Statement; figures to PLOS spec (TIFF/EPS, 300–600 DPI, VERIFY); ORCID for corresponding author | Reviews on **technical soundness, not novelty** — directly answers the three scope rejections | APC is substantial; large journal, variable review times |
| **PeerJ** | High — life-sciences/comp-bio tool + real-data study | ~US$1,195–1,395 per-article (VERIFY; membership models change) | Word/LaTeX; structured sections; optional open peer review and named reviewers; strong reproducibility expectations | Soundness-not-novelty ethos; cheaper than PLOS ONE; tool papers welcome | Confirm current pricing model (per-article vs membership) — it has changed before (VERIFY) |
| **BMC Bioinformatics** | High — dedicated **Software** article type | ~US$3,090 (VERIFY) | Springer/BMC format; Software article structure (Background/Implementation/Results/Availability); availability-of-data-and-materials section required | Best technical home for a bioinformatics tool; well indexed (JIF, PubMed) | Highest APC here; weighs perceived advance more than PLOS ONE; may push on benchmarking depth |
| **GigaScience / GigaByte** | High — reproducible data-and-software papers | GigaByte ~US$535 (VERIFY); GigaScience higher (VERIFY) | Code + data deposited and *runnable*; possible reviewer code execution; data in an approved repository (Zenodo OK) | Purpose-built for reproducible tools; reviewers value the replication scripts | **GigaByte is ESCI-only (no JIF / WoS Core yet)** — career/indexing trade-off; GigaScience is more selective |
| **F1000Research** | Medium-High — tool/software articles | APC by article type/length (VERIFY) | **Post-publication open peer review** (published first, then refereed openly); ORCID + open data mandatory | Fast posting; transparent; sound-tool friendly | "Indexed" status is conditional on passing open review; some hiring committees view post-pub review differently |
| **SoftwareX** | Medium-High — software-only, original-software focus | Open access APC (VERIFY) | **Code package submitted with the paper** (metadata, license, runnable); short structured "software" format; ties to a public code repo | If you want the *software itself* as the artifact, this is the canonical venue | Less room for the empirical case-study/evaluation narrative; needs the code packaged to their template |
| **JORS (Journal of Open Research Software)** | Medium — software metapapers | Low / sometimes waived (VERIFY) | "Software metapaper" describing a deposited, archived release + reuse potential; needs an archived snapshot (Zenodo DOI) | Cheapest, open, made for releasing reusable research software | Shorter/metapaper format; less space for the comparative evaluation; lower visibility in clinical/genomics circles |
| **Bioinformatics Advances** | Medium — OA sibling of *Bioinformatics* | OUP OA APC (VERIFY) | Oxford/OUP application-note or software format; tight length limits; strong reproducibility/availability requirements | Reputable bioinformatics indexing; application-note format suits a tool | Length limits are tight; may lean toward methodological advance; confirm article-type fit (VERIFY) |

**Honest fit note:** every venue above will accept a *sound, well-evaluated, useful* tool; none of them require the method to be novel. The real differentiators are **APC**, **indexing** (GigaByte ESCI-only; F1000 post-pub), and **format** (SoftwareX/JORS want the code as the artifact; BMC/PLOS/PeerJ want the paper-with-evaluation).

---

## Step-by-step submission

1. **Pick the venue.** Default to **PLOS ONE** (soundness-not-novelty, well indexed). If APC is the constraint, choose **PeerJ** or **GigaByte** (accepting GigaByte's ESCI-only indexing). Lock the choice before reformatting — each venue's template differs.

2. **Apply the integrity fixes to the manuscript before anything else.** These must be in the submitted version and stated plainly in the cover letter:
   - **RNA-seq "Group B (n=74)" reframe:** remove all language calling these "false positives Guardian correctly rejected." Reframe as a **genuine pipeline disagreement** — count-based GLMs (DESeq2 / edgeR, the genomics standard) may call many of these large-effect genes *truly* differentially expressed. Right-size any "10×" difficulty contrast to the difficulty-matched figure.
   - **Manuscript-module claim extraction:** correct "regex + language-model hybrid" to **"regex-based"** everywhere; state that the LLM leg is *reserved / unimplemented*.
   - Sweep the whole manuscript + the bioRxiv abstract wording for any remaining instances of either overclaim.

3. **Reformat to the venue's house style.** Convert section structure, reference style, and figure callouts to the chosen journal's author guidelines. For BMC/SoftwareX/JORS, populate the required *Software/Availability* sections. Confirm length/word/figure limits (VERIFY).

4. **Prepare figures to spec.** Source figures live in:
   - `paper/plos_compbio/figures_plos/` — `fig1_architecture.png` … `fig7_guardian_report.png` (architecture, Guardian flowchart, manuscript review, case studies, genomics case study, validation comparison, Guardian report).
   - `paper/replication/verification/figures/` — corpus funnel, headline outcome, FP-validation, reported-vs-recomputed p, by-statistic-type (PNG **and** SVG versions available).
   Re-export at the journal's required DPI/format (PLOS: TIFF/EPS 300–600 DPI; others vary — VERIFY). Prefer the **SVG** sources from the verification set when vector output is requested. Check colour-blind-safe palettes and embedded fonts.

5. **Collect ORCIDs.** Corresponding author (Vishal Bharti) ORCID is required by most of these venues; supply Debojyoti Chakraborty's ORCID and the CSIR-IGIB affiliation. Verify both iDs resolve before submission.

6. **Draft the Data Availability Statement.** State that **all datasets are public**: UCI wine quality, the CRISPR strategy data, the IV-magnesium meta-analysis inputs, and synovial-sarcoma RNA-seq **GSE271517** (GEO). Point to replication scripts under `paper/replication/` (e.g. `case_study_1_crispr.py`, `case_study_4_genomics.py`, `additional_real_data_analysis.py`) and to the code repo. Add the **Zenodo DOI** once minted (step 9).

7. **Suggested reviewers.** Provide 3–5 names with no conflict of interest (no co-authors, no recent collaborators, not at CSIR-IGIB). Aim for a mix of: statistical-reproducibility / statcheck-adjacent researchers, RNA-seq/DE-methods people (for the GSE271517 case study), and open-research-software authors. Include one or two opposed/critical names if the venue allows, to signal confidence.

8. **Preprint / bioRxiv disclosure.** Declare the live preprint **bioRxiv doi 10.64898/2026.06.15.732278** in the portal's preprint field and in the cover letter. All four candidate venues permit prior preprinting — confirm the specific policy box at submission (VERIFY). If the manuscript changed materially (the integrity fixes), note that the submitted version supersedes the preprint and update the bioRxiv version if appropriate.

9. **Mint the Zenodo DOI snapshot.** Archive the exact **v1.0.0** release of `stickforstats_new` (GitHub→Zenodo integration) to get a citable, immutable DOI. Reference that DOI in the Data/Code Availability Statement and the references. (JORS/GigaScience/SoftwareX effectively *require* an archived snapshot, not just a GitHub link.)

10. **Write the cover letter.** Keep it honest and short:
    - One sentence on what the tool is and why it is useful (Guardian: 8 validators auto-checking test assumptions and cascading to nonparametric alternatives; manuscript-verification module; statcheck 1.5.0 head-to-head on a 20-article corpus; four real-data case studies).
    - State plainly that the paper is a **sound, reproducible software contribution with an honest evaluation — not a claim of methodological novelty** — and that it therefore suits a soundness-not-novelty venue.
    - Disclose the three prior **scope** desk-rejections (JSS, JOSS, PLOS Comp Biol) as scope/fit decisions, not quality findings.
    - Note the two integrity corrections from step 2 as evidence of good-faith transparency.
    - List the live bioRxiv preprint and the Zenodo DOI.

11. **AI-use disclosure.** Include the standard statement: **Claude (Anthropic) assisted with code and drafting; all reported statistical values were independently recomputed against SciPy/R; no AI system is listed as an author** and the authors take full responsibility for the content. Put this in the manuscript's acknowledgements/methods per the venue's AI-disclosure policy (VERIFY exact placement).

12. **Declarations.** Competing interests: disclose that the authors developed CRISPRArchitect (used in Case Study 1) and hold no patent/licensing/equity/consulting interest in it, genome-editing, or a commercial StickForStats — no other competing interests (this is now in the manuscript + cover letter; enter the same at the portal, NOT "none"). Funding: state that no specific grant funded this work (infrastructure/admin support from CSIR-IGIB); do NOT attach unrelated lab grants. Author-contributions (CRediT), and ethics (state "no human/animal subjects; all data are public secondary datasets").

13. **Run the pre-submission checklist (next section), then submit through the portal.** Create/log into the editorial system (Editorial Manager for PLOS ONE/BMC; PeerJ/GigaScience/F1000/SoftwareX have their own), upload manuscript + figures + supplements + the cover letter, paste the suggested reviewers, fill the preprint and AI-disclosure fields, confirm the APC and any waiver/transfer route (VERIFY), and submit. Save the submission ID.

---

## Pre-submission checklist

- [ ] Integrity fix 1 applied: RNA-seq **Group B (n=74)** reframed as a pipeline **disagreement**, not "false positives Guardian rejected" (manuscript **and** bioRxiv abstract swept).
- [ ] Integrity fix 2 applied: claim extraction described as **"regex-based"** (LLM leg called reserved/unimplemented) everywhere.
- [ ] Manuscript reformatted to the chosen venue's template; word/length/figure limits met (VERIFY).
- [ ] Figures re-exported at the journal's required DPI/format (VERIFY); vector (SVG) used where requested; fonts embedded; palettes colour-blind-safe.
- [ ] References formatted in the venue's style; the **Zenodo DOI** and **bioRxiv DOI** cited.
- [ ] **Data Availability Statement** lists all public datasets (UCI wine, CRISPR, IV-magnesium meta-analysis, GSE271517) + `paper/replication/` scripts + repo + Zenodo DOI.
- [ ] **Zenodo DOI** minted from the v1.0.0 release and referenced.
- [ ] **Competing interests** declared.
- [ ] **Funding** statement complete (VERIFY grant numbers with co-author).
- [ ] **ORCIDs** for both authors verified and entered; corresponding author = Vishal Bharti.
- [ ] **Preprint disclosed** (bioRxiv 10.64898/2026.06.15.732278) in portal + cover letter.
- [ ] **AI-use disclosure** present (Claude assisted; all values recomputed vs SciPy/R; no AI author).
- [ ] **Suggested reviewers** (3–5, conflict-free) listed.
- [ ] **Cover letter** states soundness-not-novelty framing + discloses the three prior scope rejections.
- [ ] Reporting/length and figure-count limits checked against current author guidelines (VERIFY).
- [ ] APC and any waiver/institutional-transfer route confirmed (VERIFY).

---

## After this paper

This software/tool paper is the **first of two papers** from the same program (decision 2026-06-29):

1. **This paper** — the StickForStats platform / Guardian software contribution (here).
2. **The verifier + census paper** — *one* combined meta-research paper in which the manuscript-verification
   engine (regex-based claim extraction + recompute + raw-data re-analysis + cross-reference resolution,
   benchmarked against statcheck) is the **Methods backbone**, and the **10k-paper biomedical-OA census** of
   in-text recomputable NHST statistics (and their consistency / decision-changing rates) is the **headline
   result**. Drafts and infrastructure live under **`paper/census_paper/`**.

We deliberately did **not** spin the verifier out as its own third tool paper: two tool papers from one
codebase risks a salami-slicing perception (especially damaging for a research-integrity project), and the
verifier's most natural home is as the method behind the census it produced. Keep the platform paper's tight
"useful, sound tool" framing intact; let the census paper carry the verifier. Sequence the two so each preprint
can cite the other once live.
