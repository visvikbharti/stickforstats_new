# Prompt for Next Claude Code Session

Copy and paste the text below (between the START/END markers) as your first message in the next session:

---

## START PROMPT ##

Please read the session handoff document first:

```
/Users/vishalbharti/StickForStats_v1.0_Production/docs/SESSION_HANDOFF_JAN27_2026_SCIENTIFIC_INTEGRITY.md
```

**Context:** We are working on StickForStats, a statistical analysis platform. The JSS (Journal of Statistical Software) paper submission has a CRITICAL SCIENTIFIC INTEGRITY ISSUE that must be resolved.

**Problem discovered on 2026-01-27:**
The paper (`paper/JSS_SUBMISSION/source/stickforstats_expanded.tex`) claims validation against:
1. R 4.3.1 - NO EVIDENCE EXISTS (no R scripts)
2. G*Power 3.1 - NO EVIDENCE EXISTS (no comparison scripts)
3. Wolfram Mathematica - UNVERIFIED (no notebooks/scripts)

**What IS verified and real:**
- SciPy validation: `paper/replication/run_all_validations.py` - PASSES
- Case Studies: `paper/replication/verify_real_data_analysis.py` - ALL 3 VERIFIED
- 93 automated tests (38 backend + 55 frontend) - ALL PASS

**Task for this session:**
I want to [CHOOSE ONE]:

**Option A - Remove unverified claims (recommended for honest submission):**
- Remove R, G*Power, and Mathematica validation claims from the paper
- Keep only SciPy validation (which is real and verified)
- Keep the 93 automated tests claim (verified)
- Recompile the PDF

**Option B - Create the missing validations (if you have time):**
- Create `paper/replication/validate_against_R.R` with real R comparisons
- Create power analysis validation against G*Power reference values
- Update paper only after validations pass

**Option C - Tell me what you recommend**

Please start by reading the handoff document and confirming you understand the issue. This is about scientific integrity - the paper cannot contain fabricated claims.

## END PROMPT ##

---

## Alternative Short Prompt

If you prefer a shorter prompt:

---

Read `/Users/vishalbharti/StickForStats_v1.0_Production/docs/SESSION_HANDOFF_JAN27_2026_SCIENTIFIC_INTEGRITY.md` first.

The JSS paper has unverified validation claims (R, G*Power, Mathematica) that need to be either removed or backed with real evidence. Only SciPy validation is real. Please fix the paper to maintain scientific integrity.

---

## Notes for Next Session

1. The paper backup is at: `paper/JSS_SUBMISSION/source/stickforstats_expanded_BACKUP_JAN26_2026.tex`
2. To compile the paper: Use Docker with `texlive/texlive:latest`
3. The frontend had import errors (Guardian case sensitivity) - these are now fixed
4. 93 automated tests exist and pass (38 backend + 55 frontend)

---

*Created: 2026-01-27 11:35 IST*
