# Recommended Prompt for Next Session

Copy and paste this prompt when starting your next session:

---

**Please test all the confidence interval simulations I can test from the UI to verify they work correctly. Start by navigating to the confidence intervals module and systematically test each simulation type:**

1. **Coverage Simulation** (already confirmed working, but verify once more)
2. **Sample Size Simulation**
3. **Bootstrap Simulation**
4. **Transformation Simulation**
5. **Non-Normality Simulation**

**For each simulation:**
- Run it with default parameters
- Check that progress bar updates
- Verify results display correctly
- Check for any console errors
- Test with different parameter combinations if time permits

**After testing, fix any issues found. If all simulations work correctly, optionally fix the "Width histogram data not available" message in CoverageSimulation by either:**
- Option A: Hide the histogram section when data is not available
- Option B: Generate histogram data in the simulation

**Context:** Previous session successfully migrated all simulations from WebSocket to client-side execution. All code updates are complete. Now we need to verify everything works in the browser.

---

## Alternative Shorter Prompt

If you want a more concise version:

---

**Test all 5 confidence interval simulations (Coverage, Sample Size, Bootstrap, Transformation, Non-Normality) to verify they work after the WebSocket-to-client-side migration. Fix any issues found. See SESSION_SUMMARY.md for details.**

---

## If You Encounter Errors

Start with this prompt instead:

---

**I'm getting errors when trying to run confidence interval simulations. Please check the browser console errors and fix any issues with the recently updated simulation components. See SESSION_SUMMARY.md for what was changed in the last session.**

---
