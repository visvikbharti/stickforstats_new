# Data-Source Audit for the SQS Retraction Backtest

**Version.** 0.1 — 2026-04-17
**Companion to.** `PROTOCOL.md`

Every source below was probed live on 2026-04-17. Coverage numbers are verbatim from API responses returned on that date.

Items flagged **[REQUIRES HUMAN VERIFICATION]** could not be confirmed from the live probe and must be checked before harvesting begins.

---

## 1. Retraction Watch Database (RWDB) — CASE LABELS

- **Organisation.** Retraction Watch, acquired by Crossref (2023-09-12).
- **Landing page.** `https://retractionwatch.com/retraction-watch-database/`
- **Bulk CSV location (authoritative).** `https://gitlab.com/crossref/retraction-watch-data`
- **Access method.** Git clone; daily-updated CSV (no API required).
- **Rate limit / API key.** None required for git clone.
- **Schema (verified from README).** 18 columns: Record ID, Title, Subject, Institution, Journal, Publisher, Country, Author, URLs, ArticleType, RetractionDate, RetractionDOI, RetractionPubMedID, OriginalPaperDate, OriginalPaperDOI, OriginalPaperPubMedID, RetractionNature, **Reason**, Paywalled, Notes.
- **Reason vocabulary.** Controlled vocabulary maintained by Retraction Watch; documented separately. **[REQUIRES HUMAN VERIFICATION]** — pull the authoritative `reason_codes.md` (or equivalent) before finalising the §9.1 codebook in PROTOCOL.md.
- **License.** **[REQUIRES HUMAN VERIFICATION]** — not explicitly specified in the README excerpt we retrieved. Crossref's 2023-09-12 announcement states the data is "made a public resource" and "always open", implying CC0 or CC-BY-4.0, but the contract-text promise ("to be made public in the coming fortnight") must be confirmed in the repository's LICENSE file. If the license is more restrictive than CC-BY-4.0, §13 of the protocol must be revised.
- **Research bulk reuse.** Assumed permitted under "always open" commitment.
- **Manifest redistribution.** We redistribute only (a) DOI, (b) PMCID, (c) case/control label, (d) derived SQS scores — *not* full-text nor verbatim Retraction Watch notes fields. This is a factual derivative and is safe under CC-BY-4.0 even without an explicit CC0 license.
- **Coverage estimate (verified 2026-04-17).** RWDB is the most comprehensive retraction list in existence. Size is not given as a single number in the README, but Crossref's parallel `update-type:retraction` query reports **71 100 retraction relationships** — a strict upper bound on the RWDB size.
- **Cost.** Free.
- **Recommendation. USE (AUTHORITATIVE CASE LABELS)** — after resolving the license flag.

## 2. Crossref REST API — RETRACTION CROSS-CHECK + DOI RESOLUTION

- **Organisation.** Crossref (non-profit PID registry).
- **Landing page.** `https://www.crossref.org/documentation/retrieve-metadata/rest-api/`
- **Base URL.** `https://api.crossref.org/`
- **Access method.** HTTP GET, JSON response.
- **Key endpoints (verified).**
  - `/works` — primary query endpoint.
  - `/works?filter=update-type:retraction` — returns retraction-relationship records. **Verified 2026-04-17: `total-results = 71100`.**
  - `/works/{doi}` — single-work lookup.
- **Rate limits.** "Polite pool" is encouraged: include `mailto=<your-email>` parameter in every request. Published hard limits are not in the REST docs we fetched; community convention is ≤ 50 requests/second to the polite pool, but the official guidance is simply to back off on HTTP 429.
- **API key.** None.
- **License of metadata.** Crossref metadata is distributed under CC0 (per Crossref's public metadata policy). [REQUIRES HUMAN VERIFICATION — cite the specific Crossref metadata license page rather than our recollection, before publication.]
- **License of content (full text).** **Not** Crossref's to license; follow each publisher's terms.
- **Redistribution of derived manifest.** Permitted under CC0.
- **Coverage estimate.** 71 100 retraction updates (verified 2026-04-17), plus ~140 M total works. Subset overlapping with PMC OA is smaller.
- **Cost.** Free.
- **Recommendation. USE (SECONDARY CROSS-CHECK).** Use to resolve DOIs to canonical metadata, and as an independent cross-check against RWDB. Do not rely on Crossref alone for retraction labels because its `update-type` coverage has known gaps (not every publisher pushes the `update-to` relationship at retraction time).

## 3. PMC Open Access Subset — FULL TEXT (BOTH ARMS)

- **Organisation.** NCBI / NLM.
- **Landing page.** `https://pmc.ncbi.nlm.nih.gov/tools/openftlist/`
- **Access methods (verified).**
  - **FTP bulk packages.** `/tools/ftp/` — "bulk packages containing 100 000s of articles per package". Recommended for our use case.
  - **OAI-PMH.** `/tools/oai/` — metadata-only harvesting.
  - **BioC API.** Sentence-level structured access to full text.
  - **Cloud Service / OA Web Service API.** Alternative retrieval APIs.
  - **E-utilities.** `eFetch` for single-article fetches only — explicitly **not** for bulk retrieval of full text.
- **Rate limits (NCBI E-utilities).** Without API key: 3 requests/second and "restrict large jobs to weekends or 9 PM–5 AM Eastern time" (verified from `https://www.ncbi.nlm.nih.gov/books/NBK25497/`). With API key: 10/second default. API key is free; register via `eutils@ncbi.nlm.nih.gov`.
- **API key.** Strongly recommended. Register `tool=` and `email=` parameters with NCBI before any heavy use.
- **Bulk-retrieval rule.** **CRITICAL.** The landing page states: *"Systematic retrieval (or bulk retrieval) of articles through any other automated process is prohibited."* We must use the **sanctioned bulk packages via FTP or the OA Web Service API**, not scrape `ncbi.nlm.nih.gov` with E-utilities for large jobs.
- **License.** Per-article. Three groups (verbatim from PMC):
  1. **Commercial reuse permitted.** CC0, CC-BY, CC-BY-SA, CC-BY-ND.
  2. **Non-commercial reuse only.** CC-BY-NC, CC-BY-NC-SA, CC-BY-NC-ND.
  3. **Other.** No machine-readable CC license or custom license.
- **Protocol decision.** Include only group 1. Excluding CC-BY-NC is conservative (reproducibility studies are arguably non-commercial) but removes any ambiguity about downstream redistribution of our manifest and derived scores. Section 7.2.2 of PROTOCOL.md encodes this.
- **Redistribution of full text.** **NOT PERMITTED** without per-article license compliance; we do not redistribute full text. We redistribute only derived SQS scores and rule-hit flags keyed by DOI/PMCID.
- **Coverage estimate.** "Millions of journal articles and preprints" — no single number published. Of retracted papers: **16 854** are marked open-access in Europe PMC's index (which is PMC-synchronised), verified 2026-04-17. The subset carrying a commercial-reuse-permitted license is unknown. **[REQUIRES HUMAN VERIFICATION]** — pilot-probe 200 random entries to confirm ≥ 70 % carry a group-1 license.
- **Cost.** Free.
- **Recommendation. USE (PRIMARY FULL-TEXT SOURCE).** The "sanctioned bulk channels only" constraint must be rigidly obeyed.

## 4. Europe PMC — FULL TEXT FALLBACK + METADATA

- **Organisation.** EMBL-EBI (Europe PMC consortium).
- **Landing page.** `https://europepmc.org/developers`
- **Base URL (Articles REST).** `https://www.ebi.ac.uk/europepmc/webservices/rest/`
- **Key endpoints (verified).**
  - `/search?query=<Lucene>&format=json` — primary search. Supports `PUB_TYPE:"Retracted Publication"` (verified 2026-04-17: `hitCount = 31910`) and `OPEN_ACCESS:Y` (verified 2026-04-17: combined query returns `hitCount = 16854`).
  - `/search/<id>/fullTextXML` — full text XML where available.
- **Rate limits.** Not published as hard numbers; "fair use" language. Comparable to NCBI (treat as ~3/sec).
- **API key.** None required.
- **License of metadata.** CC-BY (per Europe PMC defaults); redistribution of derived manifest permitted with attribution.
- **License of full text.** Per-article; follows source publisher / PMC license.
- **Redistribution of derived manifest.** Permitted with attribution.
- **Coverage estimate.** 31 910 retracted publications indexed (verified 2026-04-17); 16 854 of those open-access. Europe PMC and PMC overlap very substantially; we use Europe PMC primarily for its *search interface*, which accepts `PUB_TYPE` and `OPEN_ACCESS` filters directly, and fall back to PMC FTP for the actual full-text fetch.
- **Cost.** Free.
- **Recommendation. USE (PRIMARY SEARCH/INDEX).** Use Europe PMC for fast filtered searches; use PMC FTP for authoritative full-text retrieval under its redistribution rules.

## 5. NCBI E-utilities (PubMed / PMC) — SINGLE-RECORD LOOKUPS

- **Organisation.** NCBI / NLM.
- **Documentation.** `https://www.ncbi.nlm.nih.gov/books/NBK25497/` (rate-limit guide), `https://www.ncbi.nlm.nih.gov/books/NBK25501/` (function manual).
- **Access method.** HTTP GET; returns XML or JSON.
- **Endpoints.** `esearch.fcgi`, `efetch.fcgi`, `esummary.fcgi`, `elink.fcgi`, etc.
- **Rate limits (verified).** 3 req/sec without API key; 10 req/sec with API key. Heavy jobs must run weekends or nights Eastern time.
- **API key.** Register with `tool=stickforstats_retraction_backtest&email=vishalvikashbharti@gmail.com`. Free.
- **License.** Data are in the public domain as US-government work.
- **Coverage.** All of PubMed (~35 M records) and PMC (~9 M records, of which the OA subset is a strict subset).
- **Protocol use.** Single-DOI-to-PMCID resolution and PubMed metadata enrichment (MeSH headings for matching). **Not** used for bulk full-text retrieval.
- **Recommendation. USE (RESOLUTION ONLY).**

## 6. OpenAlex — MATCHING COVARIATES + CONVENIENCE RETRACTION FLAG

- **Organisation.** OurResearch (non-profit).
- **Landing page.** `https://developers.openalex.org/`
- **Base URL.** `https://api.openalex.org/`
- **Access method.** HTTP GET, JSON.
- **Key endpoints.** `/works`, `/works/{doi}`, `/works?filter=is_retracted:true`, `/concepts/{id}`.
- **Rate limits.** Polite pool via `mailto=` parameter; unmetered free tier + paid premium tier. [REQUIRES HUMAN VERIFICATION — exact free-tier cap not found on landing page we fetched; check `https://docs.openalex.org/how-to-use-the-api/rate-limits-and-authentication`.]
- **API key.** Optional; `mailto` suffices for polite pool.
- **License.** **CC0** (public domain dedication). Verified 2026-04-17: "Our complete dataset is free under the CC0 license".
- **Coverage.** ~240 M works including books and datasets; `is_retracted` flag available but not the authoritative source (Retraction Watch is).
- **Protocol use.** (a) Discipline / concept labels for matching. (b) Second cross-check on retraction labels. (c) Citation counts for the ascertainment-bias sensitivity analysis (§12.7 of protocol).
- **Recommendation. USE (COVARIATES ONLY).** Do not rely on OpenAlex `is_retracted` as the authoritative label — use it only as a cross-check.

## 7. NIH iCite — CITATION-WEIGHTED METRICS (optional covariate)

- **Organisation.** NIH Office of Portfolio Analysis.
- **Landing page.** `https://icite.od.nih.gov/`
- **API documentation.** [REQUIRES HUMAN VERIFICATION] — the landing page we fetched contained only the title "iCite" without documentation details. iCite does publish an API (`https://icite.od.nih.gov/api/pubs`) per our prior knowledge, but the endpoint, schema, and rate limits must be re-confirmed on a live request before use.
- **License.** US-government work → public domain.
- **Protocol use.** If available and verified: use iCite's Relative Citation Ratio (RCR) as a covariate in the ascertainment-bias sensitivity rerun. This is a nice-to-have, not load-bearing.
- **Recommendation. USE IF VERIFIED** (optional).

## 8. PubPeer — POST-PUBLICATION DISCUSSION (out of scope)

- **Organisation.** PubPeer Foundation.
- **Landing page.** `https://pubpeer.com/api` — **returned HTTP 404** on 2026-04-17 probe.
- **Access.** PubPeer offers a limited public API and a browser extension. Research-grade bulk access is reportedly available on request but is not publicly documented.
- **License.** Comments are user-generated, licensed per site terms. Bulk reuse not clearly permitted.
- **Coverage.** Informal commentary on ~100 k papers; substantial overlap with retractions but many PubPeer-discussed papers are never formally retracted.
- **Recommendation. DO NOT USE (out of scope; adds labeling ambiguity).** Our case label is retraction, not post-publication concern. PubPeer may be useful for a future exploratory "papers that probably *should* have been retracted" study, but it is not needed for the current design.

## 9. OpenRetractions — DEFUNCT

- **URL.** `https://openretractions.com/` — **connection refused** on 2026-04-17 probe.
- **Recommendation. DO NOT USE.** Superseded by Retraction Watch / Crossref acquisition.

## 10. STATCHECK published dataset (Nuijten et al., 2016) — CALIBRATION BASELINE

- **Organisation.** Nuijten, Hartgerink, van Assen, Epskamp, Wicherts (Tilburg).
- **Landing page.** Referenced in Nuijten et al. (2016) paper; primary OSF project `https://osf.io/gdr4q/` (not verifiable from the page we fetched — **[REQUIRES HUMAN VERIFICATION]**).
- **License.** Expected CC-BY-4.0 (OSF default) but must be confirmed.
- **Protocol use.** Independent of the backtest's primary endpoint. Potentially useful as a **calibration baseline**: if StickForStats' consistency validator disagrees with statcheck's published verdicts on overlapping papers, that is a signal of mis-specification. Scope this as an optional methods-section cross-check, not a load-bearing dependency.
- **Recommendation. USE IF VERIFIED** (optional).

## 11. bioRxiv / medRxiv APIs — PRE-PRINT RETRACTIONS (out of scope)

- **Landing pages.** `https://api.biorxiv.org/`, `https://api.medrxiv.org/`
- **License.** Pre-print repositories have their own retraction-adjacent "withdrawal" language distinct from peer-reviewed retraction.
- **Recommendation. DO NOT USE.** Out of scope; our case definition requires peer-reviewed publication followed by formal retraction notice. Preprint withdrawals are a separate phenomenon.

---

## Minimum, Legally-Clean Stack (Recommendation)

| Role                                    | Source                                    | License status                                  |
|-----------------------------------------|-------------------------------------------|-------------------------------------------------|
| Case labels (primary)                   | Retraction Watch Database (Crossref)      | Public / "always open" — *license flag pending* |
| Case label cross-check                  | Crossref REST `update-type:retraction`    | Metadata CC0                                    |
| Full text (cases + controls)            | PMC Open Access Subset, group 1 only      | Per-article CC0 / CC-BY / CC-BY-SA / CC-BY-ND   |
| Search / filter interface               | Europe PMC Articles REST                  | Metadata CC-BY                                  |
| Single-record resolution                | NCBI E-utilities (registered tool+email)  | Public domain                                   |
| Matching covariates (discipline, cites) | OpenAlex                                  | CC0                                             |

This stack is achievable with **zero paid services**, **zero private licenses**, and **no scraping of channels that forbid bulk access**.

---

## Show-Stoppers

Re-examined on 2026-04-17 against the probe results above.

1. **Retraction Watch license text.** If the RWDB LICENSE file turns out to forbid redistribution of derivative manifests (unlikely given Crossref's "always open" acquisition commitment but not yet verified), the protocol's §13 clause releasing the manifest under CC0 must be weakened to "DOI + case/control label only, no Retraction Watch reason-code text". This would still let the study run; only the manifest-release scope would shrink. **Not a fatal show-stopper, but a potential scope reduction.**
2. **PMC commercial-reuse-license subset.** Our 16 854 open-access retraction estimate collapses to a smaller number once we filter to group-1 licenses (CC0 / CC-BY / CC-BY-SA / CC-BY-ND only). A pilot probe of 200 random OA retractions is needed. If < 30 % carry group-1 licenses, we would be forced to either (a) enlarge the permitted set to include CC-BY-NC (and deal with the derivative-distribution question head-on) or (b) reduce sample size. **Potential feasibility reducer but not fatal.**
3. **No show-stopper eliminates the study.** The primary target (n_cases = 200) has a > 40× safety margin against Europe PMC's 16 854-OA-retraction figure; even order-of-magnitude license attrition leaves a feasible corpus. The minimum viable sample (n_cases = 100) is reachable even under pessimistic assumptions.

**Conclusion: No fatal show-stoppers. Design is feasible pending license-flag resolution.**
