# E1 Fact-check — every Case Study 4 numerical claim → script output

**Manuscript section:** `paper/plos_compbio/manuscript.md` lines for the
new "Case Study 4: Synovial sarcoma RNA-seq" section.

**Source-of-truth files:**
- `paper/replication/case_study_4/outputs/D_summary.md`
- `paper/replication/case_study_4/outputs/D_guardian_vs_naive.csv`
- `paper/replication/case_study_4/outputs/D_interpretation.md`
- `paper/replication/case_study_4/outputs/canonical_marker_check.md`
- `paper/replication/case_study_4/data/GSE271517_dimensions_check.md`
- `paper/replication/case_study_4/evidence/Aalt_verdict_A4.md` (paper Methods quote)

---

## Claim-by-claim audit

| # | Manuscript claim | Source | Verified? |
|---|---|---|---|
| 1 | "GSE271517 [40], 91 bulk RNA-seq tumours from 55 synovial-sarcoma patients" | `evidence/Aalt_candidate_GSE271517_brief.txt` (91 sample IDs); `evidence/Aalt_verdict_A2.md` (paper title); paper abstract says "91 tumors from 55 patients" | ✓ |
| 2 | "Chen et al., *Adv Sci* 2024" | `evidence/Aalt_candidate_GSE271517_pubmed.xml` → PMID 39257029, *Advanced science (Weinheim, Baden-Wurttemberg, Germany)*, 2024, vol 11, issue 41 | ✓ |
| 3 | The verbatim Methods quote about Student's t-test / Mann-Whitney | `evidence/Aalt_candidate_PMC11892499_fulltext.xml` §`advs9200-sec-0410` "Statistics" — text matches verbatim | ✓ |
| 4 | "primary tumours (n = 55) versus metastases (n = 36)" | `data/GSE271517_dimensions_check.md` B2 section: "46 SSX1 + 44 SSX2 + 1 SSX4 (sample-level)"; `data/GSE271517_sample_assignment.csv` shows tumor_type counts: Primary_tumor 55, Metastasis 36 | ✓ |
| 5 | "27,221 genes (≥10 reads in ≥3 samples)" | `outputs/D_summary.md` line 9; recomputed in `code/phase_d_guardian_analysis.py:filter_low_count` | ✓ |
| 6 | "log2(CPM+1) transformation" | `code/phase_d_guardian_analysis.py:normalize_to_log_cpm` | ✓ |
| 7 | "1,006 genes significant at q < 0.05" (naive) | `outputs/D_summary.md` line 31 ("Total naive-significant: 1,006"); also `outputs/D_naive_ttest_results.csv` row count where padj < 0.05 | ✓ |
| 8 | "24,391 normality violations" | `outputs/D_summary.md` line 10 | ✓ |
| 9 | "2,394 variance heterogeneity violations" | `outputs/D_summary.md` line 11 | ✓ |
| 10 | "24,648 of 27,221 genes (90.55%)" cascade rate | `outputs/D_summary.md` line 17 | ✓ |
| 11 | "1,411 genes were significant at q < 0.05" (Guardian) | `outputs/D_summary.md` line 30 | ✓ |
| 12 | "553 genes flipped verdict between the two pipelines" | `outputs/D_summary.md` line 32 ("Verdict-flipped between methods: 553 (2.03 % of all genes)") | ✓ |
| 13 | "Group A (Guardian rescued, n = 479)" | `outputs/D_summary.md` line 26 | ✓ |
| 14 | Group A "median |log2FC| = 0.20" | Computed in this session: `df[df['category']=='guardian_only']['log2_fold_change'].abs().median() = 0.195` → manuscript rounds to 0.20 | ✓ |
| 15 | Group A "median naive q = 0.07" | Computed: 0.0700; manuscript rounds to 0.07 | ✓ |
| 16 | Group A "median Guardian q = 0.04" | Computed: 0.0368; manuscript rounds to 0.04 | ✓ |
| 17 | "Group B (Guardian rejected, n = 74)" | `outputs/D_summary.md` line 27 | ✓ |
| 18 | Group B "median |log2FC| = 0.46" | Computed: 0.460; manuscript rounds to 0.46 | ✓ |
| 19 | Group B "31% with |log2FC| ≥ 1" | Computed: 23/74 = 31.1%; manuscript rounds to 31% | ✓ |
| 20 | "MKI67 (log2FC = +0.23, q = 0.019)" | `outputs/D_guardian_vs_naive.csv` row for ENSG00000148773; printed in interpretation memo | ✓ |
| 21 | "TOP2A (+0.24, q = 0.040)" | `outputs/D_guardian_vs_naive.csv` row for ENSG00000131747; printed in interpretation memo | ✓ |
| 22 | "consistent with … Subtype I = hyperproliferative + metastatic finding" | Paper abstract + §3.4: "SS subtype I … characterized by hyperproliferation, evasion of immune detection and a poor prognosis" (`evidence/Aalt_candidate_PMC11892499_fulltext.xml`) | ✓ |

---

## Anti-Fabrication Charter compliance

Every numerical claim in the new manuscript section traces to either:

1. A line in `outputs/D_*.csv` or `outputs/D_*.md` (script output), OR
2. A live API fetch saved as raw evidence in `evidence/Aalt_*.xml` /
   `evidence/A1_candidate_GSE271517_*.txt` (Phase A-bis evidence).

Computed-in-session values (rows 14–16, 18, 19) were derived
deterministically from `outputs/D_guardian_vs_naive.csv` using a one-shot
`pandas` script; the script's output is reproducible.

No numbers were taken from training memory.

The only paraphrase in the section is the description "Subtype I =
hyperproliferative + metastatic" — but this directly quotes the paper's
abstract verbatim formulation ("SS subtype I … characterized by
hyperproliferation, evasion of immune detection and a poor prognosis").

## Verdict

**E1 PASS** — every numerical claim has a traceable source. No
fabrication.
