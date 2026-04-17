# Email template — inviting a second coder

Use this as a starting point. Everything in `[square brackets]` is a
placeholder you should fill in. The template assumes the recipient is a
colleague / postdoc / PhD student at a peer institution who is **not** a
co-author on the StickForStats papers.

If the recipient is a very close collaborator, you can cut most of §2
("why me") and most of §3 ("what StickForStats is"); keep the task
specifics.

---

## Subject line (pick one)

- `Quick reproducibility check — 2h labeling task for a pre-registered study`
- `Would you be willing to be a second coder for a 150-row label audit?`
- `Second coder needed for retraction-backtest study (pre-registered, ~2–3h)`

---

## Body

> Hi [Name],
>
> **Short version:** I'm running a pre-registered study and its protocol
> requires an independent second coder for a label-reliability check.
> 150 rows, ~2–3 hours, all remote, no statistical expertise needed —
> just careful reading. Would you be willing?
>
> **Why I'm asking you.** [One sentence: you know the domain / you're
> careful with taxonomies / we've collaborated before / your lab mate
> suggested you / we met at conference X.]
>
> **What the study is.** My co-author [PI name] and I are evaluating
> whether an automated statistical-quality score, StickForStats SQS,
> flags biomedical papers that were later retracted for statistical
> reasons. The study is a matched case-control backtest on ~200
> retracted papers vs ~400 matched controls from PMC Open Access.
> The protocol is public, the analysis code is public, and we have
> pre-committed to publish regardless of result direction (negative
> result still gets a preprint + peer-reviewed journal submission).
>
> The full protocol is at:
> `https://github.com/visvikbharti/stickforstats_new/blob/main/paper/retraction_backtest/PROTOCOL.md`
> and the OSF pre-registration is at: [OSF URL once filed].
>
> **What I'd need from you.** Our protocol §9.2 requires two independent
> coders to apply our retraction-reason codebook to the same set of
> retraction notices, so we can compute Cohen's κ as a reliability
> check before the primary analysis runs. I've generated a stratified
> random sample of 150 retraction notices from the Retraction Watch
> Database. For each notice, you'd read the `reason` text and label it
> as one of three categories — `stat`, `nonstat`, `ambiguous` — using
> a three-page codebook I'll send.
>
> This is pattern-matching, not statistical judgment. No stats
> background required — the codebook is regex-level specific.
>
> **Time.** 2–3 hours if you do it in one sitting, ~4 hours split across
> two sittings. People tend to fatigue after ~60 rows so splitting is
> better.
>
> **Independence constraints** (pre-registered, not negotiable):
> - I can't share the primary coder's labels with you during labeling —
>   that would void the blinding.
> - You shouldn't discuss rows with other coders or with me until you're
>   done. Once you return the sheet, anything is fair game.
> - You'll have the SQS score *of nothing*, at any point — the scorer is
>   blinded to your labels and vice versa. This is structural.
>
> **What you get.**
> - **Acknowledgment** in the paper (paragraph in the Acknowledgements
>   section naming you and your affiliation).
> - An honest co-authorship offer **if** the κ check goes poorly and you
>   end up adjudicating disagreements with a third coder — that crosses
>   into substantial intellectual contribution. (Unlikely — we expect
>   the codebook to be reliable — but I want to name the floor honestly.)
> - [Optional: small honorarium / Amazon gift card / institutional-form
>   compensation — fill in if your institution allows.]
> - A pre-print co-citation credit.
>
> **Attached / linked.** If you say yes, I'll send:
> 1. `README.md` — 2-page instructions.
> 2. `codebook.md` — the 3-page labeling rubric with 7 worked examples.
> 3. `labeling_sheet.csv` — 150 rows × 7 columns, one of which is the
>    `your_label` column you fill in.
>
> These files also live at
> `https://github.com/visvikbharti/stickforstats_new/tree/main/paper/retraction_backtest/second_coder/`.
>
> **Turnaround.** I'd ideally receive your filled-in sheet within
> [2 weeks / 1 month]. That lets us run κ and then begin the primary
> N=200 harvest without the timeline slipping.
>
> If you're in, just reply and I'll send the three files. If not,
> completely understand — happy to hear suggestions for anyone else who
> might have bandwidth.
>
> Thanks for reading this far. Genuinely appreciate the ask; this is
> the kind of unglamorous rigour step that almost never gets done.
>
> Best,
> [Your name]
> [Affiliation + role line]
> [OSF / ORCID / GitHub profile links]

---

## What to attach when they say yes

Send three files — and **do NOT** send `primary_labels.csv` or
`compute_kappa.py`. The coder must stay blinded until they return the
sheet.

| File                           | Why                                          |
|--------------------------------|----------------------------------------------|
| `second_coder/README.md`       | Task instructions, do/don't list, time budget|
| `second_coder/codebook.md`     | The sole labeling rubric                    |
| `second_coder/labeling_sheet.csv` | The sheet they fill in                    |

The easiest channel is a zip attachment, or a personal Google Drive /
Dropbox link. A GitHub checkout also works if they're comfortable with
git, but copy-paste-able files are friendlier.

---

## Follow-ups

- **Day 3:** Short "did the files arrive OK?" nudge.
- **Week 1:** "How's it going? Any rows you're unsure about — you can
  put notes in the `notes` column." (Don't answer specific-row questions
  by email — it biases their labels. If they're truly stuck, tell them
  to label `ambiguous` with a note and you'll reconcile later.)
- **Week 2:** If they haven't returned it, a gentle check-in with an
  explicit "no problem to bow out" offer. Forced coders give noisy
  labels.

---

## When they return the sheet

1. Place their file at `paper/retraction_backtest/second_coder/labeling_sheet.csv`
   (overwrites the blank template from your end; the row order and
   record_ids must match, which `compute_kappa.py` will enforce).
2. Run: `cd paper/retraction_backtest/second_coder && python compute_kappa.py`
3. Inspect `kappa_report.md` and `kappa_report.json`.
4. Commit **all three** files — their returned sheet, the report, and
   the JSON — in a single commit like:
   `paper(retraction-backtest): Second-coder labels + κ = 0.XX report`
5. Depending on κ tier (ACCEPT / ADJUDICATE / HALT), follow PROTOCOL §9.2.

If κ lands in the ADJUDICATE window (0.60 ≤ κ < 0.80), you'll need a
**third coder** to resolve the disagreements (list is already in
`kappa_report.md`). That's a ~30-minute task on a handful of rows.
