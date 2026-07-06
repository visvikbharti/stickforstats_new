# Venue recommendation — Paper 1 (StickForStats / Guardian platform)

**Date:** 2026-07-06. Researched against current (2026) author guidelines; **verify APCs and policies at
submission** (some publisher price calculators are behind Cloudflare and could not be machine-read).
**Context:** MIT-licensed statistical-assumption-validation tool + manuscript consistency checker + calibration
benchmark, RNA-seq case study; single corresponding author + PI at **CSIR-IGIB, India**; bioRxiv preprint live;
desk-rejected 3× (JSS, JOSS, PLOS Comp Biol) on **scope/novelty**, not quality → needs a **soundness-not-novelty**
venue.

## Decisive finding: India gets NO APC waiver or discount at the mid/high-priced venues
Waivers at Springer Nature/BMC and Oxford UP are pegged to Research4Life / World-Bank income tiers, and India is
excluded (Research4Life excludes any country with total GNI > US$1 trillion "regardless of other factors"; BMC's
50% discount needs 2022 GDP < US$200 bn, India ≈ US$3.5 tn). So at BMC and OUP the APC is **effectively full
price**, with only a *discretionary* need-based waiver you must request at submission (not guaranteed).
Sources: Springer Nature APC-waiver-countries policy; OUP APC-waiver policy; research4life.org eligibility.

This makes **price a real differentiator**, and pushes the recommendation toward venues with a genuine hardship
route or a low list price.

## Ranked recommendation

### 1. GigaByte (GigaScience Press) — best all-round fit ★
- **Why:** cheapest by far (**~US$535**) and it entertains hardship waivers; explicit **soundness-not-novelty
  "Technical Release"** track built for exactly this kind of software/method report; the **manuscript is the
  reviewed object** (the open GitHub tool just needs to be FAIR/open — MIT satisfies it); bioRxiv-native;
  indexed in **PubMed + Scopus + Web of Science (ESCI)**.
- **Watch-outs:** ESCI (not SCIE), so no classic Impact Factor yet; confirm the current Technical Release APC
  and waiver process at submission.

### 2. BMC Bioinformatics — if SCIE indexing / IF matters most
- **Why:** closest **scope** match, dedicated **"Software" article type**, explicit "not judged on impact or
  novelty" editorial standard, **MEDLINE/PubMed + WoS SCIE + Scopus** (IF ≈ 4), ~5-day first-decision screen.
  MIT code satisfies its availability policy.
- **Watch-outs:** **US$3,090, no India relief** (discretionary waiver only). Highest cost here.

### 3. Bioinformatics Advances (OUP + ISCB) — middle option, fastest
- **Why:** soundness/usefulness criteria (not novelty), software/Application-Note + full-article tracks,
  strong open-code requirement your project already meets, bioRxiv **B2J** direct-transfer, **~27-day** median
  first decision; cheapest of the OUP/BMC set at **US$2,620 (≈$2,096 with ISCB membership)**.
- **Watch-outs:** **ESCI** (not SCIE); no automatic India waiver.

### Not recommended
- **SoftwareX** — structural misfit (its model requires the **code archive as the primary submitted object**,
  manuscript demoted to a note; your primary object is the scientific evaluation). Desk-reject risk on shape,
  not novelty.
- **BMC Medical Research Methodology** — scope actively redirects general tool/method descriptions to
  subject journals; only viable if the paper is re-centred on the calibration/assumption-gate methodology in a
  health-research framing.
- **JORS (Journal of Open Research Software)** — viable soundness-focused backup (£824, waiver on request,
  bioRxiv-OK) but weaker indexing (no PubMed, no WoS).

## Suggested path
Submit to **GigaByte** first (lowest cost + right shape + adequate indexing for a first archival home), keeping
**BMC Bioinformatics** as the escalation if you want SCIE/IF and can fund the APC. Whichever you pick, post
**bioRxiv v2** first (see `BIORXIV_V2_UPLOAD.md`) so the public record matches what an editor will find.

*(This synthesis is from a web-research pass; treat APC figures and waiver rules as of 2026-07 and re-verify on
the journal's own author-guidelines/fees pages before submitting.)*
