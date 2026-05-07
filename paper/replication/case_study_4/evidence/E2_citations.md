# E2 Citation completeness — every Case Study 4 reference has a fetched record

The new Case Study 4 section adds exactly **one** reference to the PLOS
manuscript (renumbered to [40]). All other in-text citations in the new
section refer to the original paper itself (cited as [40] in the new
text) or to existing references that were already verified in the prior
reviewer-eye sweep.

## Reference [40] verification

**Citation as printed in manuscript line 341:**

> 40. Chen Y, Su Y, Cao X, Siavelis I, Leo IR, Zeng J, Tsagkozis P,
> Hesla AC, Papakonstantinou A, Liu X, Huang W-K, Zhao B, Haglund C,
> Ehnman M, Johansson H, Lin Y, Lehtiö J, Zhang Y, Larsson O, Li X,
> de Flon FH. Molecular Profiling Defines Three Subtypes of Synovial
> Sarcoma. Adv Sci (Weinh). 2024;11(41):e2404510.
> doi:10.1002/advs.202404510. PMID: 39257029. PMCID: PMC11892499.

**Field-by-field source map:**

| Field | Source | Verified |
|---|---|---|
| Authors (21 names) | `evidence/Aalt_candidate_GSE271517_pubmed.xml` <AuthorList> | ✓ |
| Title | `evidence/Aalt_candidate_GSE271517_pubmed.xml` <ArticleTitle> | ✓ |
| Journal abbreviation | "Advanced science (Weinheim, Baden-Wurttemberg, Germany)" → "Adv Sci (Weinh)" per NLM citation style | ✓ |
| Year | <PubDate>/<Year> = 2024 | ✓ |
| Volume | <JournalIssue>/<Volume> = 11 | ✓ |
| Issue | <JournalIssue>/<Issue> = 41 | ✓ |
| Article ID (Pages) | <Pagination>/<MedlinePgn> = e2404510 | ✓ |
| DOI | <PubmedData>/<ArticleIdList>/<ArticleId IdType="doi"> = 10.1002/advs.202404510 | ✓ |
| PMID | <ArticleId IdType="pubmed"> = 39257029 | ✓ |
| PMCID | <ArticleId IdType="pmc"> = PMC11892499 | ✓ |

**Cross-validation:** the orchestrator independently re-ran `efetch.fcgi?db=pubmed&id=39257029&rettype=xml` against the live NCBI eutils API earlier in this session and confirmed every field matches byte-for-byte (audit-log entry: 2026-05-07T13:00 "Phase A independent verification by orchestrator").

## Other in-text citations in the new section

The new Case Study 4 section uses no other reference numbers besides [40]
and (in the updated Table 5 row) the same [40]. No other references were
added or modified.

## Existing references the new content interacts with

- Reference [25] Egger 1997 — used in unchanged Case Study 3 row of Table 5; already verified.
- Reference [38] Sterne & Egger 2001 — same.

These are unchanged and already verified during the 2026-05-07 reviewer-
eye sweep (commit 1d413fb).

## Verdict

**E2 PASS** — the only new reference [40] has every field traceable to
a live-fetched NCBI eutils PubMed record (`evidence/Aalt_candidate_GSE271517_pubmed.xml`)
and the bibliographic entry matches that record exactly.
