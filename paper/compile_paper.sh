#!/bin/bash
# StickForStats JSS Paper Compilation Script
# Run this from the paper/ directory

set -e

echo "============================================"
echo " StickForStats JSS Paper Compilation"
echo "============================================"

# Check for jss.cls
if [ ! -f "jss.cls" ]; then
    echo ""
    echo "ERROR: jss.cls not found!"
    echo ""
    echo "Please download JSS style files from:"
    echo "  https://www.jstatsoft.org/style"
    echo ""
    echo "Required files:"
    echo "  - jss.cls"
    echo "  - jss.bst"
    echo ""
    exit 1
fi

# Create figures if needed
echo ""
echo "Step 1: Compiling figures..."
cd figures

if [ -f "figure1.tex" ]; then
    echo "  Compiling figure1.tex..."
    pdflatex -interaction=nonstopmode figure1.tex > /dev/null 2>&1 || echo "    Warning: figure1 compilation had issues"
fi

if [ -f "figure2.tex" ]; then
    echo "  Compiling figure2.tex..."
    pdflatex -interaction=nonstopmode figure2.tex > /dev/null 2>&1 || echo "    Warning: figure2 compilation had issues"
fi

cd ..

# Compile main document
echo ""
echo "Step 2: Compiling main document..."

echo "  Pass 1: Initial LaTeX compilation..."
pdflatex -interaction=nonstopmode stickforstats.tex > /dev/null 2>&1

echo "  Pass 2: BibTeX compilation..."
bibtex stickforstats > /dev/null 2>&1 || echo "    Warning: BibTeX had issues"

echo "  Pass 3: LaTeX (resolve references)..."
pdflatex -interaction=nonstopmode stickforstats.tex > /dev/null 2>&1

echo "  Pass 4: LaTeX (final)..."
pdflatex -interaction=nonstopmode stickforstats.tex > /dev/null 2>&1

# Check result
if [ -f "stickforstats.pdf" ]; then
    echo ""
    echo "============================================"
    echo " SUCCESS!"
    echo "============================================"
    echo ""
    echo " Output: stickforstats.pdf"
    echo " Size: $(ls -lh stickforstats.pdf | awk '{print $5}')"
    echo ""
    echo " Open with:"
    echo "   open stickforstats.pdf"
    echo ""
else
    echo ""
    echo "ERROR: PDF not generated. Check stickforstats.log for errors."
    exit 1
fi

# Cleanup auxiliary files (optional)
echo "Cleaning up auxiliary files..."
rm -f *.aux *.log *.bbl *.blg *.out *.toc 2>/dev/null
rm -f figures/*.aux figures/*.log 2>/dev/null

echo "Done!"
