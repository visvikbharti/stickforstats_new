# Prompt for Next Claude Code Session

Copy the text between the START/END markers as your first message next session.

---

## START PROMPT ##

Good morning. We're resuming StickForStats. Before anything else, read:
- `docs/SESSION_HANDOFF_2026-06-01.md` (what we did + current state + prioritized next steps)
- `docs/DEPLOYMENT_RUNBOOK.md` (the deploy procedure)
- and your memory file `strategy-positioning-2026-06-01.md`.

**Current state (verify against git/origin before trusting):** `main` = `caafbd6` (local == origin);
released `v1.0.0-beta.1`; `sfs` CLI live on PyPI 0.2.1 (Python ≥3.10); GHCR backend+frontend images
published. The audit-remediation work is merged; tests green (831 backend / 654 frontend). Do NOT
redo completed work — confirm with `git log origin/main` / `gh release list` / `pip index` first.

**The one gate left to invite beta testers is the host deploy.** Today I want to:

<pick ONE and delete the rest>
- (A) **Deploy for beta.** Walk me through executing `docs/DEPLOYMENT_RUNBOOK.md` step by step. I have:
  a host = ____, a domain/DNS = ____, TLS via Let's Encrypt = yes/no. Go one step at a time and wait
  for my confirmation after each.
- (B) **Beta-shape the app** (`BETA_DEPLOYMENT_CHECKLIST.md` §0): add invite-only gating, a persistent
  beta banner, a feedback channel, and a data/privacy notice — before we expose it.
- (C) **Quality pass before beta:** add `sdk/python/tests/`, add `paths-ignore` to ci.yml, retire the
  stale `docs/DEPLOYMENT_GUIDE.md`, investigate the Playwright E2E flake.
- (D) **Start the moat:** design the "reproducibility receipt" provenance feature (see
  `docs/STRATEGY_AND_POSITIONING_2026-06-01.md`).

Work in the same disciplined way as before: ground-truth over docs, one edit→verify→commit at a time,
honest about what's done vs not, admin-push docs to `main` is fine, no Co-Authored-By trailer, never
write the word that rhymes with "turn-it-in" (use "statistical-verification tool"). When you finish,
update the handoff doc + memory.

## END PROMPT ##

---

*This file is regenerated each session to hold the latest resume prompt. Previous dated prompts (e.g.
`NEXT_SESSION_PROMPT_2026-02-20.md`) are kept for history.*
