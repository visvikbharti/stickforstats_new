#!/bin/bash

###############################################################################
# StickForStats Presentation PDF Generator (DeckTape Method)
# Converts Reveal.js presentation.html to professional PDF
# Uses DeckTape - industry standard for Reveal.js presentations
###############################################################################

echo "=========================================="
echo "StickForStats Presentation PDF Generator"
echo "Using DeckTape for Reveal.js"
echo "=========================================="
echo ""

# Configuration
PRESENTATION_FILE="/Users/vishalbharti/StickForStats_v1.0_Production/presentation.html"
OUTPUT_PDF="/Users/vishalbharti/StickForStats_v1.0_Production/StickForStats_Guardian_Presentation.pdf"
TEMP_SERVER_PORT=8889

# Check if presentation file exists
if [ ! -f "$PRESENTATION_FILE" ]; then
    echo "❌ Error: presentation.html not found at $PRESENTATION_FILE"
    exit 1
fi

echo "✓ Found presentation.html"

# Check if DeckTape is installed
if ! command -v decktape &> /dev/null; then
    echo "❌ DeckTape not found. Installing..."
    echo ""
    npm install -g decktape

    if [ $? -ne 0 ]; then
        echo "❌ Failed to install DeckTape"
        echo ""
        echo "Manual installation:"
        echo "  npm install -g decktape"
        exit 1
    fi
    echo "✓ DeckTape installed successfully"
fi

echo "✓ DeckTape is available"
echo ""

# Start temporary web server in background
echo "Starting temporary web server on port $TEMP_SERVER_PORT..."
cd /Users/vishalbharti/StickForStats_v1.0_Production
python3 -m http.server $TEMP_SERVER_PORT > /dev/null 2>&1 &
SERVER_PID=$!

# Wait for server to start
sleep 2

if ! ps -p $SERVER_PID > /dev/null; then
    echo "❌ Error: Failed to start web server"
    exit 1
fi

echo "✓ Web server started (PID: $SERVER_PID)"
echo ""

# Generate PDF using DeckTape
echo "Generating PDF with DeckTape..."
echo "This may take 30-60 seconds..."
echo ""

decktape reveal \
    http://localhost:$TEMP_SERVER_PORT/presentation.html \
    "$OUTPUT_PDF" \
    --size 1280x720 \
    --chrome-arg=--disable-web-security

PDF_EXIT_CODE=$?

# Kill the temporary server
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

# Check if PDF was created
if [ $PDF_EXIT_CODE -eq 0 ] && [ -f "$OUTPUT_PDF" ]; then
    PDF_SIZE=$(du -h "$OUTPUT_PDF" | cut -f1)
    PDF_PAGES=$(file "$OUTPUT_PDF" | grep -o '[0-9]\+ pages' || echo "17 slides")

    echo ""
    echo "=========================================="
    echo "✅ SUCCESS! PDF Generated"
    echo "=========================================="
    echo ""
    echo "📄 Output file: $OUTPUT_PDF"
    echo "📊 File size: $PDF_SIZE"
    echo "📑 Content: $PDF_PAGES"
    echo ""
    echo "The PDF includes:"
    echo "  • Slide 1: Title & Overview"
    echo "  • Slide 2: The Problem (Reproducibility Crisis)"
    echo "  • Slide 3: Guardian Solution"
    echo "  • Slide 4: Platform Stats"
    echo "  • Slide 5: Six Statistical Validators"
    echo "  • Slide 6: Protected Components (17/22)"
    echo "  • Slide 6.5: Guardian Coverage Journey"
    echo "  • Slide 6.6: Data vs Parameters Philosophy"
    echo "  • Slide 6.7: Selective Validation Strategy"
    echo "  • Slide 7: Real Example - Blocking in Action"
    echo "  • Slide 8: Publication-Ready Reports"
    echo "  • Slide 9: Competitive Advantage"
    echo "  • Slide 10: Live Demo"
    echo "  • Slide 11: Educational Platform (32 Lessons)"
    echo "  • Slide 12: Key Achievements"
    echo "  • Slide 13: Q&A / Contact"
    echo "  • Slide 14: References & Citations"
    echo ""
    echo "To view the PDF:"
    echo "  open \"$OUTPUT_PDF\""
    echo ""
    echo "To regenerate PDF:"
    echo "  ./generate_presentation_pdf.sh"
    echo ""
else
    echo ""
    echo "=========================================="
    echo "❌ PDF Generation Failed"
    echo "=========================================="
    echo ""
    echo "Troubleshooting:"
    echo "1. Ensure DeckTape is installed:"
    echo "   npm install -g decktape"
    echo ""
    echo "2. Check if presentation.html exists:"
    echo "   ls -l \"$PRESENTATION_FILE\""
    echo ""
    echo "3. Verify port $TEMP_SERVER_PORT is not in use:"
    echo "   lsof -i :$TEMP_SERVER_PORT"
    echo ""
    echo "Manual method (if script fails):"
    echo "1. Start web server:"
    echo "   cd /Users/vishalbharti/StickForStats_v1.0_Production"
    echo "   python3 -m http.server 8889"
    echo ""
    echo "2. In another terminal:"
    echo "   decktape reveal http://localhost:8889/presentation.html StickForStats_Guardian_Presentation.pdf --size 1280x720"
    echo ""
    exit 1
fi
