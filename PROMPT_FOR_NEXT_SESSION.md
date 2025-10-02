# PROMPT TO USE FOR NEXT SESSION

## Copy and paste this entire prompt to resume work:

---

**CRITICAL CONTEXT**: Please read the MASTER_SESSION_CONTEXT_SEP23.md file first for complete project understanding.

I'm continuing work on StickForStats v1.0, currently 88% complete. The frontend is running on port 3001 and backend on port 8000.

**PROJECT STATE**:
- Professional landing page ✅ (loved it!)
- UI cleanup complete ✅ (removed 6 redundant components)
- Dark mode added to TestSelectionDashboard ✅
- StatisticalDashboard identified as crown jewel UI
- 46 statistical tests discovered (17 Guardian-protected)
- Guardian System operational with 6 validators

**IMMEDIATE PRIORITIES** (Continue from where we left off):

1. **CREATE DataInput Component** (/src/components/DataInput.jsx)
   - CSV file upload with drag-and-drop
   - Manual data entry grid
   - Data validation and preview
   - Support for multiple data formats
   - Connect to backend data processing

2. **CREATE ResultsDisplay Component** (/src/components/ResultsDisplay.jsx)
   - Display 50-decimal precision results
   - Formatted statistical tables
   - Export to CSV/PDF functionality
   - Visual summaries with charts
   - Guardian warnings integration

3. **CREATE Visual Evidence Components**:
   - Q-Q plots for normality
   - Histograms with distribution overlay
   - Scatter plots for correlations
   - Box plots for outliers
   - Residual plots for regression

4. **WIRE UP all 40+ statistical tests** to frontend
   - Connect to backend endpoints
   - Handle request/response cycle
   - Error handling
   - Loading states

**TECHNICAL DETAILS**:
- Frontend: React 18, Material-UI, running on localhost:3001
- Backend: Django REST, running on localhost:8000
- Guardian API: http://localhost:8000/api/guardian/health/ (operational)
- Design: Professional black/grey (#000000, #0a0a0a), NO cosmic elements
- Precision: 50-decimal using Python's Decimal library

**KEY FILES TO REFERENCE**:
- /src/App.jsx (routing)
- /src/pages/StatisticalDashboard.jsx (crown jewel UI)
- /src/components/TestSelectionDashboard.jsx (has dark mode)
- /src/components/MasterTestRunner.jsx (test workflow)
- /backend/stats/views.py (backend tests)

**DESIGN REQUIREMENTS**:
- Maintain professional black/grey color scheme
- Add dark mode to remaining components
- Keep StatisticalDashboard as centerpiece
- Ensure 50-decimal precision display
- Include Guardian protection indicators

**USER PREFERENCES**:
- Meticulous documentation
- Professional, not childish
- "Make this app a significant deal in this world"
- Love the current professional design

**CURRENT WORKING DIRECTORY**: /Users/vishalbharti/StickForStats_v1.0_Production/frontend

Please continue building the DataInput component first, maintaining our professional design standards and comprehensive documentation approach.

---

## Alternative Shorter Prompt (if needed):

---

Please read MASTER_SESSION_CONTEXT_SEP23.md to understand the project state.

Continue StickForStats development (88% complete, ports 3001/8000):

1. Create DataInput component for data entry/upload
2. Create ResultsDisplay component for 50-decimal precision results
3. Create visual evidence components (Q-Q plots, histograms, etc.)
4. Wire up 40+ statistical tests to frontend

Maintain: Professional black/grey design, meticulous documentation, Guardian system integration.

Start with DataInput component in /src/components/

---