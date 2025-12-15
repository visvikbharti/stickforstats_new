#!/bin/bash

# StickForStats Repository Cleanup Script
# ========================================
# This script prepares the repository for public release by:
# 1. Moving internal documentation to an archive
# 2. Cleaning up temporary files
# 3. Ensuring proper structure

set -e

echo "=========================================="
echo " StickForStats Release Preparation Script"
echo "=========================================="

# Get the script's directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

echo ""
echo "Working directory: $ROOT_DIR"
echo ""

# Step 1: Create archive directory for internal docs
echo "Step 1: Creating archive directory..."
mkdir -p _internal_docs

# Step 2: Move internal development documentation
echo "Step 2: Moving internal documentation to _internal_docs/..."

# List of patterns for internal docs (session notes, development logs, etc.)
INTERNAL_PATTERNS=(
    "*_SESSION*.md"
    "*_COMPLETE*.md"
    "*_REPORT*.md"
    "*_ROADMAP*.md"
    "*_CHECKLIST*.md"
    "*_ANALYSIS*.md"
    "*_SUMMARY*.md"
    "*_GUIDE.md"
    "*_PLAN*.md"
    "*_PROGRESS*.md"
    "*_STATUS*.md"
    "*_VICTORY*.md"
    "*_SUCCESS*.md"
    "2025_*.md"
    "NEXT_SESSION*.md"
    "SESSION_*.md"
    "GUARDIAN_*.md"
    "ENDPOINT_TEST_REPORT_*.json"
)

# Count files to move
COUNT=0
for pattern in "${INTERNAL_PATTERNS[@]}"; do
    for file in $pattern; do
        if [ -f "$file" ] && [ "$file" != "DEPLOYMENT_GUIDE.md" ] && [ "$file" != "CONTRIBUTING.md" ]; then
            COUNT=$((COUNT + 1))
        fi
    done 2>/dev/null
done

echo "   Found $COUNT internal documentation files"

# Move files (dry run first)
echo ""
echo "   Files to be moved:"
for pattern in "${INTERNAL_PATTERNS[@]}"; do
    for file in $pattern; do
        if [ -f "$file" ] && [ "$file" != "DEPLOYMENT_GUIDE.md" ] && [ "$file" != "CONTRIBUTING.md" ]; then
            echo "   - $file"
        fi
    done 2>/dev/null
done

echo ""
read -p "Move these files to _internal_docs/? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    for pattern in "${INTERNAL_PATTERNS[@]}"; do
        for file in $pattern; do
            if [ -f "$file" ] && [ "$file" != "DEPLOYMENT_GUIDE.md" ] && [ "$file" != "CONTRIBUTING.md" ]; then
                mv "$file" "_internal_docs/" 2>/dev/null || true
            fi
        done 2>/dev/null
    done
    echo "   Files moved successfully"
else
    echo "   Skipping file move"
fi

# Step 3: Update README
echo ""
echo "Step 3: Updating README.md..."
if [ -f "README_NEW.md" ]; then
    read -p "Replace current README.md with README_NEW.md? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp README.md README_OLD.md 2>/dev/null || true
        mv README_NEW.md README.md
        echo "   README.md updated (old version saved as README_OLD.md)"
    fi
fi

# Step 4: Verify essential files exist
echo ""
echo "Step 4: Verifying essential files..."
ESSENTIAL_FILES=(
    "README.md"
    "LICENSE"
    "CONTRIBUTING.md"
    "DEPLOYMENT_GUIDE.md"
    ".gitignore"
    "backend/requirements.txt"
    "frontend/package.json"
)

MISSING=0
for file in "${ESSENTIAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✓ $file"
    else
        echo "   ✗ $file (MISSING)"
        MISSING=$((MISSING + 1))
    fi
done

# Step 5: Check for sensitive files
echo ""
echo "Step 5: Checking for sensitive files..."
SENSITIVE_PATTERNS=(
    ".env"
    ".env.local"
    ".env.production"
    "*.pem"
    "*.key"
    "*credentials*"
    "*secret*"
)

SENSITIVE_FOUND=0
for pattern in "${SENSITIVE_PATTERNS[@]}"; do
    for file in $pattern; do
        if [ -f "$file" ]; then
            echo "   WARNING: Found sensitive file: $file"
            SENSITIVE_FOUND=$((SENSITIVE_FOUND + 1))
        fi
    done 2>/dev/null
done

if [ $SENSITIVE_FOUND -eq 0 ]; then
    echo "   No sensitive files found in root"
else
    echo ""
    echo "   ⚠️  Found $SENSITIVE_FOUND potentially sensitive files"
    echo "   Please review and remove/gitignore before committing"
fi

# Step 6: Summary
echo ""
echo "=========================================="
echo " Summary"
echo "=========================================="
echo ""
echo "Repository structure:"
echo "  - Internal docs moved: $COUNT files"
echo "  - Missing essential files: $MISSING"
echo "  - Sensitive files found: $SENSITIVE_FOUND"
echo ""

if [ $MISSING -eq 0 ] && [ $SENSITIVE_FOUND -eq 0 ]; then
    echo "✓ Repository is ready for public release!"
else
    echo "⚠️  Please address the issues above before release"
fi

echo ""
echo "Next steps:"
echo "  1. Review _internal_docs/ and delete if not needed"
echo "  2. Update .gitignore to exclude _internal_docs/"
echo "  3. Run: git add -A && git status"
echo "  4. Review changes and commit"
echo ""
