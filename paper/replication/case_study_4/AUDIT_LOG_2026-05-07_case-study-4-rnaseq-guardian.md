# AUDIT LOG — Case Study 4: Real RNA-seq with Guardian

This file is **append-only**. Every checkpoint produces an entry. If a
previous claim is later found to be wrong, add a new entry retracting it —
do not edit historical entries.

| | |
|---|---|
| **Started** | 2026-05-07 |
| **Plan** | `PLAN_2026-05-07_case-study-4-rnaseq-guardian.md` |
| **Tracker** | `TODO_2026-05-07_case-study-4-rnaseq-guardian.md` |

---

## Entry format

```
### YYYY-MM-DDTHH:MM  —  Phase X, Checkpoint Xn
**Claim:** what we are asserting
**Verification method:** how we checked
**Evidence:** file path or URL with the raw artefact
**Verdict:** PASS / FAIL / NEEDS-REVIEW
**Notes:** any caveats, follow-ups, or context a reviewer would need
```

---

## Entries

### 2026-05-07T12:11  —  Bootstrap

**Claim:** Case Study 4 working directory created with planning artefacts.
**Verification method:** `ls paper/replication/case_study_4/` shows directory tree;
plan, TODO, and audit-log documents committed and human-readable.
**Evidence:**
- `paper/replication/case_study_4/PLAN_2026-05-07_case-study-4-rnaseq-guardian.md`
- `paper/replication/case_study_4/TODO_2026-05-07_case-study-4-rnaseq-guardian.md`
- `paper/replication/case_study_4/AUDIT_LOG_2026-05-07_case-study-4-rnaseq-guardian.md` (this file)
- `paper/replication/case_study_4/README.md`
- `paper/replication/case_study_4/{evidence,data,code,outputs}/` (empty subdirs)

**Verdict:** PASS

**Notes:** Phase A has not started. PI approved the plan and the
anti-fabrication charter as written. The next entry will be the
result of the Phase A scouting subagent's run, with full evidence
files in `evidence/`.
