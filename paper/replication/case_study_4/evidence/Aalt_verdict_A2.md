# Aalt_A2 Verdict — PubMed record verified (Phase A-bis alternative)

**Chosen dataset:** GSE271517

**Claim being verified:** PubMed record 39257029 is the published article
corresponding to GSE271517: Chen et al. 2024, *Advanced Science* 11(41):
e2404510, DOI 10.1002/advs.202404510, PMC11892499.

---

## Verified facts (each line points at the XML field)

| Claim | Field in `evidence/Aalt_candidate_GSE271517_pubmed.xml` |
|---|---|
| PMID = 39257029 | `./PubmedArticle/MedlineCitation/PMID` text |
| Article title = "Molecular Profiling Defines Three Subtypes of Synovial Sarcoma." | `./PubmedArticle/MedlineCitation/Article/ArticleTitle` |
| Journal = "Advanced science (Weinheim, Baden-Wurttemberg, Germany)" | `./PubmedArticle/MedlineCitation/Article/Journal/Title` |
| ISO Abbrev = "Adv Sci (Weinh)" | `./PubmedArticle/MedlineCitation/Article/Journal/ISOAbbreviation` |
| Year = 2024 | `./PubmedArticle/MedlineCitation/Article/Journal/JournalIssue/PubDate/Year` |
| Month = November | `./PubmedArticle/MedlineCitation/Article/Journal/JournalIssue/PubDate/Month` |
| Volume = 11 | `./PubmedArticle/MedlineCitation/Article/Journal/JournalIssue/Volume` |
| Issue = 41 | `./PubmedArticle/MedlineCitation/Article/Journal/JournalIssue/Issue` |
| Start page (eLocator) = e2404510 | `./PubmedArticle/MedlineCitation/Article/Pagination/StartPage` |
| DOI = 10.1002/advs.202404510 | `./PubmedArticle/PubmedData/ArticleIdList/ArticleId[@IdType='doi']` (correct XPath, restricted to article's own metadata block) |
| PMCID = PMC11892499 | `./PubmedArticle/PubmedData/ArticleIdList/ArticleId[@IdType='pmc']` (correct XPath) |
| Author count = 21 | `./PubmedArticle/MedlineCitation/Article/AuthorList/Author` count |

## Author list (parsed verbatim from XML, in order)

1. Chen, Yi
2. Su, Yanhong
3. Cao, Xiaofang
4. Siavelis, Ioannis
5. Leo, Isabelle Rose
6. Zeng, Jianming
7. Tsagkozis, Panagiotis
8. Hesla, Asle C
9. Papakonstantinou, Andri
10. Liu, Xiao
11. Huang, Wen-Kuan
12. Zhao, Binbin
13. Haglund, Cecilia
14. Ehnman, Monika
15. Johansson, Henrik
16. Lin, Yingbo
17. Lehtiö, Janne
18. Zhang, Yifan
19. Larsson, Olle
20. Li, Xuexin
21. de Flon, Felix Haglund

## Formatted bibliography entry

> Chen Y, Su Y, Cao X, Siavelis I, Leo IR, Zeng J, Tsagkozis P, Hesla AC,
> Papakonstantinou A, Liu X, Huang W-K, Zhao B, Haglund C, Ehnman M,
> Johansson H, Lin Y, Lehtiö J, Zhang Y, Larsson O, Li X, de Flon FH.
> Molecular Profiling Defines Three Subtypes of Synovial Sarcoma.
> *Advanced Science* (Weinh) 2024 Nov; 11(41):e2404510.
> doi:10.1002/advs.202404510. PMID 39257029. PMCID PMC11892499.

## Verdict

**PASS** — PubMed record fields match the article's body content as
fetched in A3 (PMC11892499). DOI and PMCID extracted with the correct
XPath that restricts to the article's own `PubmedData/ArticleIdList`
block (not its bibliography references).

## Notes

- Used the same correct XPath that the first scout used (after
  retracting the buggy `article.findall('.//ArticleId')` pattern).
  The scout's parser bug was caught and corrected before chosen-dataset
  metadata was published.

- 21 authors, multinational (Sweden, China, Spain, Greece, Belgium etc.).
  Karolinska Institutet group; corresponding author Felix Haglund de Flon.

- Journal: Advanced Science is a Wiley journal, fully open-access, JIF
  ~17. The 2024 publication makes this a recent, high-quality, open
  source for our case study.

## Evidence file

- `evidence/Aalt_candidate_GSE271517_pubmed.xml` — full PubMed XML record fetched via efetch
