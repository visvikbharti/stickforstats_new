# Venue recommendation — Paper 1 (StickForStats / Guardian platform)

**Date:** 2026-07-06. Researched against current (2026) author guidelines across nine candidate venues.
**Verify every APC and waiver rule live at submission** — several publisher price pages are JavaScript-gated;
figures below are from DOAJ / official fee pages / archived snapshots.
**Context:** MIT-licensed statistical-assumption-validation tool + manuscript consistency checker + calibration
benchmark, RNA-seq case study; single corresponding author + PI at **CSIR-IGIB, India**; bioRxiv preprint live;
desk-rejected 3× (JSS, JOSS, PLOS Comp Biol) on **scope/novelty**, not quality → needs a **soundness-not-novelty**
venue.

## Decisive finding: India gets NO automatic APC waiver at ANY candidate
India is lower-middle-income but is excluded from every publisher's waiver list because its total GNI/GDP
exceeds Research4Life / World-Bank thresholds ("GNI > US$1 trillion excludes India, China, Brazil regardless of
other factors"). Triangulated across Research4Life eligibility, Springer Nature/BMC, OUP, PeerJ, and
F1000Research policies. **The only route anywhere is a discretionary, case-by-case hardship waiver requested in
the cover letter at submission (not guaranteed).** So treat APC as full sticker price everywhere, and let cost
weigh in the ranking.

## Comparison at a glance

| Venue | Soundness-not-novelty? | APC (full price) | India waiver | Indexing | 1st decision | Verdict |
|---|---|---|---|---|---|---|
| **PeerJ** | Yes — verbatim founding principle | **$1,995** | No | MEDLINE + Scopus + **WoS SCIE**, JIF ~2.6 | ~30–35 d | **Top pick** |
| **GigaByte** | Yes — Technical Release, soundness-only | **$535** | No (low base; can ask) | PubMed + Scopus + **WoS ESCI** (no JIF) | n/a | **Backup 1 (best value)** |
| **PLOS ONE** | Yes — "not perceived significance" | $2,477 | No | MEDLINE + Scopus + **WoS SCIE**, JIF 2.6 | median 40 d | **Backup 2** |
| BMC Bioinformatics | Yes (editorial policy) | $3,090 | No | MEDLINE + SCIE + Scopus, IF ~4 | ~5 d screen | Strong fit, pricey |
| Bioinformatics Advances | Yes — "usefulness", App Note | $2,620 ($2,096 ISCB) | No | PubMed + Scopus + ESCI, IF ~2.6 | ~27 d | Good, ESCI-only |
| F1000Research | Yes — post-pub review | $1,268 (Software Tool) | No | PubMed/Scopus **only after review passes**; WoS unconfirmed | pub ~14 d | Viable, indexing risk |
| GigaScience | Yes, but "big-data/complex" | ~$2,512 | No | MEDLINE + Scopus + SCIE, IF ~9.2 | n/a | Likely redirects to GigaByte |
| JORS | Yes — reusability | £824–891 (~$1,050) | Discretionary | Scopus + DOAJ; **no WoS, no PubMed** | pub ~21 wk | Weak visibility |
| SoftwareX | Soundness, but **code = primary object** | $1,560 | Probably no | Scopus + SCIE, **not PubMed** | ~9 wk to pub | **Structural misfit** |

## Ranked recommendation

### 1. PeerJ (Life & Environment) — best target ★
Closest structural cure for this paper's exact problem. Its **founding, stated** criterion is "an objective
determination of scientific and methodological soundness, **not** … 'impact', 'novelty' or 'interest'"
(https://peerj.com/about/aims-and-scope/) — directly neutralising the reason for all three prior desk-rejections.
Lists **"Bioinformatics Software Tools"** and **"Method Articles"** as first-class types, so the cross-domain
shape (general-stats tool + RNA-seq case study + manuscript checker) is in scope. APC **$1,995** (cheaper than
PLOS ONE), plus an alternative individual-membership model (verify live). Requires all code + raw data public
with a Zenodo DOI under an open license — **already satisfied** (MIT, GitHub, Zenodo planned). Accepts bioRxiv.
**Full indexing: MEDLINE/PubMed/PMC + Scopus + WoS SCIE, JIF ~2.6** — strongest visibility among the
soundness-only venues. ~30–35 d to first decision. Net: fixes the rejection cause, well-indexed with a JIF,
accepts the paper's exact form, costs less than PLOS ONE.

### 2. GigaByte (GigaScience Press) — best value / pick first if budget-bound
"Technical Release" type is purpose-built for "an open-source software tool or a computational method," reviewed
"solely on whether the information would be usable … scientifically sound," explicitly not on impact
(https://gigabytejournal.com/technical-release-description). APC **$535** (cheapest by far), discretionary
hardship waivers on request. The **article** is the reviewed object (no code-archive restructuring). bioRxiv-native.
PubMed + PMC + Scopus + **WoS ESCI** — the one drawback is ESCI-only (no JIF), slightly lower discoverability
than PeerJ. Trade $535-and-PubMed against the lack of a JIF.

### 3. PLOS ONE — backup 2
The other large "judged on validity, not perceived significance" megajournal; covers "methods, software,
databases, or other tools" (https://journals.plos.org/plosone/s/journal-information). APC **$2,477** (priciest of
the three strong-indexed picks). Open code + public data — satisfied. bioRxiv fine. MEDLINE + Scopus + WoS SCIE,
JIF 2.6, median 40 d. Choose over PeerJ only if you specifically want the PLOS brand; otherwise PeerJ dominates
it on cost at equal indexing.

## Watch-outs
- **Verify every APC live** (PeerJ/PLOS/OUP price pages are JS-gated); PeerJ membership dollar prices unverified.
- **Request the discretionary hardship waiver at submission**, in the cover letter — the only fee relief for
  India-based authors, and it must be asked for *before* review.
- **F1000Research:** you pay $1,268 on acceptance of *pre-publication checks* regardless of review outcome, and
  PubMed/Scopus indexing applies **only after** the article passes open review (WoS unconfirmed) — conditional
  visibility.
- **Scope-edge:** at a life-sciences venue (PeerJ) the statcheck-style manuscript-checker is the least
  "biological" component — frame the primary object as reproducible computational-biology statistics (Guardian +
  RNA-seq case study), manuscript checker as a companion module.
- **Format effort:** manuscript is in PLOS format (`figures_plos/`, PLOS refs, Author Summary). PeerJ and GigaByte
  accept flexible formatting at initial submission (reformat only on acceptance) — low effort. PLOS ONE needs none.
- **PLOS software nuance:** PLOS prefers "well-established" projects; submit as a research/methods article with
  validation + case studies (which is what this is), not a pure software paper.

## Do-not-submit flags for this specific paper
- **SoftwareX** — structurally disqualified: its model requires the **code archive as the primary object**, the
  manuscript demoted to a note; this paper's primary object is a scientific evaluation → wrong shape, high
  desk-reject risk; also not in PubMed.
- **BMC Medical Research Methodology** — scope explicitly redirects general method/tool descriptions to subject
  journals; only viable if re-centred on the calibration/Type-I methodology in a health-research framing.
- **JORS** — no Web of Science, no PubMed (Scopus + DOAJ only) — poor discoverability for a biomedical audience.
- **GigaScience (vs GigaByte)** — ~$2,512, no India waiver, prefers "big-data/complex" resources; a single-tool
  paper would likely be redirected to GigaByte anyway.
- **BMC Bioinformatics** — genuinely strong scope match (Software type, ~5-day screen, IF ~4, MEDLINE+SCIE) but
  **$3,090 with zero India relief**; pursue only if the genomics framing is central and budget allows.
  Bioinformatics Advances ($2,620 / $2,096 ISCB, ~27 d, bioRxiv B2J) is the cheaper OUP alternative, ESCI-only.

## Suggested path
Submit to **PeerJ** first (fixes the rejection cause, SCIE-indexed with a JIF, accepts the exact form, mid-price),
requesting the hardship waiver in the cover letter. If cost is the binding constraint, go **GigaByte** ($535).
Keep **PLOS ONE** as the branded backup. Whichever you pick, post **bioRxiv v2** first (see
`BIORXIV_V2_UPLOAD.md`) so the public record matches what an editor will find, and mint the **Zenodo DOI** before
submission (PeerJ requires a code/data DOI).

*(Synthesis from a 2026-07 web-research pass; re-verify APCs and waiver rules on each journal's own pages before
submitting.)*
