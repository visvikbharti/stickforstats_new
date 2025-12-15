#!/bin/bash

# StickForStats Safe Archive Script
# ==================================
# This script safely archives internal documentation while preserving
# all valuable content. NOTHING IS DELETED - files are only moved.

set -e

echo "=========================================="
echo " StickForStats Safe Archive Script"
echo " Preserving ALL documentation"
echo "=========================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo ""
echo "Working directory: $ROOT_DIR"
echo ""

# Create archive directory structure
echo "Step 1: Creating archive structure..."
mkdir -p docs/archive/guardian
mkdir -p docs/archive/research
mkdir -p docs/archive/embo
mkdir -p docs/archive/technical
mkdir -p docs/archive/session_logs
mkdir -p docs/archive/progress_reports
mkdir -p docs/archive/integration

echo "   Created docs/archive/ with subdirectories"

# Define files that MUST stay in root
KEEP_IN_ROOT=(
    "README.md"
    "README_NEW.md"
    "LICENSE"
    "CONTRIBUTING.md"
    "DEPLOYMENT_GUIDE.md"
    "MASTER_PLAN_WORLDS_BEST_STATS_PLATFORM.md"
    "MASTER_PLAN_WORLDS_BEST_STATS_PLATFORM.pdf"
    "API_DOCUMENTATION_COMPLETE.md"
    "FEATURES_DOCUMENTATION.md"
    "VALIDATION_REPORT_JSS_PAPER.md"
    "GUARDIAN_CASE_STUDY_JSS.md"
    "PUBLICATION_PLAN_JSS.md"
    "DOCUMENTATION_PRESERVATION_PLAN.md"
    "RELEASE_PREPARATION_COMPLETE.md"
    "FInal_EMBO_CCMB_Poster_vishal_bharti_2025.pdf"
)

# Function to check if file should stay in root
should_keep_in_root() {
    local file="$1"
    for keep in "${KEEP_IN_ROOT[@]}"; do
        if [ "$file" == "$keep" ]; then
            return 0
        fi
    done
    return 1
}

# Step 2: Archive Guardian documentation
echo ""
echo "Step 2: Archiving Guardian documentation..."
count=0
for file in GUARDIAN_*.md; do
    if [ -f "$file" ] && ! should_keep_in_root "$file"; then
        mv "$file" docs/archive/guardian/
        count=$((count + 1))
    fi
done 2>/dev/null
echo "   Moved $count Guardian files"

# Step 3: Archive research/paper drafts
echo ""
echo "Step 3: Archiving research/paper drafts..."
count=0
for file in RESEARCH_PAPER_*.md HONEST_*.md DRAFT_*.md PUBLICATION_*.md; do
    if [ -f "$file" ] && ! should_keep_in_root "$file"; then
        mv "$file" docs/archive/research/
        count=$((count + 1))
    fi
done 2>/dev/null
echo "   Moved $count research files"

# Step 4: Archive EMBO materials
echo ""
echo "Step 4: Archiving EMBO materials..."
count=0
for file in EMBO_*.md POSTER_*.md PRESENTATION_*.md INKSCAPE_*.md INKSCAPE_*.txt; do
    if [ -f "$file" ] && ! should_keep_in_root "$file"; then
        mv "$file" docs/archive/embo/
        count=$((count + 1))
    fi
done 2>/dev/null
# Also move HTML poster files
for file in embo_poster_*.html retraction_layout_*.html; do
    if [ -f "$file" ]; then
        mv "$file" docs/archive/embo/
        count=$((count + 1))
    fi
done 2>/dev/null
echo "   Moved $count EMBO files"

# Step 5: Archive session logs
echo ""
echo "Step 5: Archiving session logs..."
count=0
for file in SESSION_*.md NEXT_SESSION*.md CONTEXT_*.md CLAUDE_*.md PROMPT_*.md; do
    if [ -f "$file" ] && ! should_keep_in_root "$file"; then
        mv "$file" docs/archive/session_logs/
        count=$((count + 1))
    fi
done 2>/dev/null
echo "   Moved $count session files"

# Step 6: Archive progress reports
echo ""
echo "Step 6: Archiving progress reports..."
count=0
for file in *_COMPLETE.md *_SUCCESS.md *_VICTORY.md *_PROGRESS*.md PHASE*.md *_STATUS*.md; do
    if [ -f "$file" ] && ! should_keep_in_root "$file"; then
        mv "$file" docs/archive/progress_reports/
        count=$((count + 1))
    fi
done 2>/dev/null
echo "   Moved $count progress files"

# Step 7: Archive integration documentation
echo ""
echo "Step 7: Archiving integration documentation..."
count=0
for file in *_INTEGRATION*.md BACKEND_*.md FRONTEND_*.md; do
    if [ -f "$file" ] && ! should_keep_in_root "$file"; then
        mv "$file" docs/archive/integration/
        count=$((count + 1))
    fi
done 2>/dev/null
echo "   Moved $count integration files"

# Step 8: Archive technical/analysis documentation
echo ""
echo "Step 8: Archiving technical documentation..."
count=0
for file in *_ANALYSIS*.md *_AUDIT*.md *_ASSESSMENT*.md COMPREHENSIVE_*.md STRATEGIC_*.md *_ROADMAP*.md *_PLAN.md *_GUIDE.md *_CHECKLIST.md; do
    if [ -f "$file" ] && ! should_keep_in_root "$file"; then
        mv "$file" docs/archive/technical/
        count=$((count + 1))
    fi
done 2>/dev/null
echo "   Moved $count technical files"

# Step 9: Archive dated files
echo ""
echo "Step 9: Archiving dated files..."
count=0
for file in 2025_*.md *_SEP*.md *_OCT*.md *_NOV*.md *_DEC*.md; do
    if [ -f "$file" ] && ! should_keep_in_root "$file"; then
        mv "$file" docs/archive/progress_reports/
        count=$((count + 1))
    fi
done 2>/dev/null
echo "   Moved $count dated files"

# Step 10: Archive remaining misc files
echo ""
echo "Step 10: Archiving remaining documentation..."
count=0
# Move remaining .md files that aren't in KEEP_IN_ROOT
for file in *.md; do
    if [ -f "$file" ] && ! should_keep_in_root "$file"; then
        # Check if not already in subdirectory
        if [ ! -d "$file" ]; then
            mv "$file" docs/archive/technical/ 2>/dev/null || true
            count=$((count + 1))
        fi
    fi
done
echo "   Moved $count remaining files"

# Step 11: Archive JSON test reports
echo ""
echo "Step 11: Archiving test reports..."
count=0
for file in ENDPOINT_TEST_REPORT_*.json *_test_report_*.json; do
    if [ -f "$file" ]; then
        mkdir -p docs/archive/test_reports
        mv "$file" docs/archive/test_reports/
        count=$((count + 1))
    fi
done 2>/dev/null
echo "   Moved $count test report files"

# Step 12: Archive .txt files
echo ""
echo "Step 12: Archiving text files..."
count=0
for file in *.txt; do
    if [ -f "$file" ] && [ "$file" != "requirements.txt" ]; then
        mkdir -p docs/archive/misc
        mv "$file" docs/archive/misc/
        count=$((count + 1))
    fi
done 2>/dev/null
echo "   Moved $count text files"

# Step 13: Create archive index
echo ""
echo "Step 13: Creating archive index..."
cat > docs/archive/INDEX.md << 'INDEXEOF'
# Documentation Archive Index

This directory contains archived documentation from StickForStats development.
All files are preserved for reference - nothing was deleted.

## Directory Structure

```
archive/
├── guardian/          # Guardian system documentation
├── research/          # Research papers and drafts
├── embo/              # EMBO conference materials
├── technical/         # Technical architecture docs
├── session_logs/      # AI session context files
├── progress_reports/  # Development progress tracking
├── integration/       # Frontend/backend integration docs
├── test_reports/      # Automated test reports
└── misc/              # Miscellaneous files
```

## Finding Information

- **Guardian implementation details**: See `guardian/`
- **Paper drafts**: See `research/`
- **Conference materials**: See `embo/`
- **Development history**: See `session_logs/` and `progress_reports/`

## Note

These files are archived for reference and historical purposes.
The main repository documentation is in the root directory and `docs/`.

---
*Archive created: $(date +%Y-%m-%d)*
INDEXEOF

echo "   Created INDEX.md"

# Step 14: Count remaining files
echo ""
echo "Step 14: Verifying results..."
root_md_count=$(ls *.md 2>/dev/null | wc -l)
root_pdf_count=$(ls *.pdf 2>/dev/null | wc -l)
archive_count=$(find docs/archive -type f | wc -l)

echo ""
echo "=========================================="
echo " Archive Complete"
echo "=========================================="
echo ""
echo "Files remaining in root:"
ls *.md *.pdf 2>/dev/null | while read f; do echo "   ✓ $f"; done
echo ""
echo "Summary:"
echo "   - Root .md files: $root_md_count"
echo "   - Root .pdf files: $root_pdf_count"
echo "   - Archived files: $archive_count"
echo ""
echo "All files preserved in docs/archive/"
echo ""
echo "Next steps:"
echo "   1. Review docs/archive/INDEX.md"
echo "   2. Update README.md (replace with README_NEW.md)"
echo "   3. Add 'docs/archive/session_logs/' to .gitignore (optional)"
echo "   4. Commit changes"
echo ""
