#!/usr/bin/env bash
# Render manuscripts to PDF: Markdown -> HTML (pandoc) -> PDF (Chrome headless)
# Output filenames are *_rendered.pdf so they don't clobber the older PDFs.

set -euo pipefail

REPO_ROOT="/Users/vishalbharti/StickForStats_v1.0_Production"
PAPER_DIR="$REPO_ROOT/paper"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Academic CSS — Charter/Georgia serif, 10.5pt, justified, modest margins,
# tables/figures sized for letter paper.
read -r -d '' STYLE <<'CSS' || true
@page {
  size: letter;
  margin: 0.85in 0.85in 0.95in 0.85in;
}
html { font-size: 10.5pt; }
body {
  font-family: "Charter", "Georgia", "Cambria", "Times New Roman", serif;
  line-height: 1.42;
  color: #111;
  text-align: justify;
  max-width: 100%;
  margin: 0;
}
h1 { font-size: 16pt; margin-top: 0.0em; margin-bottom: 0.4em; }
h2 { font-size: 13pt; margin-top: 1.4em; margin-bottom: 0.3em; border-bottom: 1px solid #888; padding-bottom: 2px; }
h3 { font-size: 11.5pt; margin-top: 1.0em; margin-bottom: 0.25em; }
h4 { font-size: 10.5pt; margin-top: 0.8em; margin-bottom: 0.2em; font-style: italic; }
h1, h2, h3, h4 { font-family: "Helvetica Neue", "Arial", sans-serif; color: #000; }
p { margin: 0.35em 0; }
ul, ol { margin: 0.4em 0 0.4em 1.4em; padding: 0; }
li { margin-bottom: 0.15em; }
blockquote {
  margin: 0.5em 1.5em;
  padding-left: 0.8em;
  border-left: 3px solid #aaa;
  color: #333;
}
code {
  font-family: "Menlo", "Consolas", monospace;
  font-size: 9.2pt;
  background: #f3f3f3;
  padding: 0 3px;
  border-radius: 2px;
}
pre {
  font-family: "Menlo", "Consolas", monospace;
  font-size: 8.8pt;
  background: #f6f6f6;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 3px;
  overflow-x: auto;
  white-space: pre-wrap;
}
table {
  border-collapse: collapse;
  margin: 0.6em auto;
  font-size: 9.5pt;
  max-width: 100%;
}
th, td {
  border: 1px solid #888;
  padding: 3px 6px;
  vertical-align: top;
}
th { background: #eee; font-weight: 600; }
img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0.6em auto;
}
figcaption, .caption { font-size: 9.5pt; color: #444; text-align: center; }
a { color: #1f3a5f; text-decoration: none; }
hr { border: 0; border-top: 1px solid #aaa; margin: 1em 0; }
CSS

render_one() {
  local md_path="$1"
  local resource_dir="$2"
  local out_pdf="$3"
  local title="$4"

  # Write the HTML *into* the resource_dir so that Chrome can resolve
  # relative figure paths (e.g. figures/fig1_architecture.png) from file://
  local html_tmp="$resource_dir/.render_$(date +%s)_$$.html"

  echo "  [1/2] Markdown -> HTML  ($(basename "$md_path"))"
  pandoc \
    --from=markdown+pipe_tables+yaml_metadata_block+raw_html+autolink_bare_uris+strikeout+task_lists \
    --to=html5 \
    --standalone \
    --mathjax \
    --metadata title="$title" \
    --resource-path="$resource_dir" \
    -V lang=en \
    --css=/dev/stdin \
    -o "$html_tmp" \
    "$md_path" <<<"$STYLE"

  echo "  [2/2] HTML -> PDF       ($(basename "$out_pdf"))"
  # --virtual-time-budget gives MathJax a chance to typeset before printing.
  "$CHROME" \
    --headless \
    --disable-gpu \
    --no-pdf-header-footer \
    --print-to-pdf-no-header \
    --virtual-time-budget=8000 \
    --print-to-pdf="$out_pdf" \
    "file://$html_tmp" 2>/dev/null

  rm -f "$html_tmp"

  if [[ -f "$out_pdf" ]]; then
    local size
    size="$(ls -la "$out_pdf" | awk '{print $5}')"
    echo "  OK: $out_pdf ($size bytes)"
  else
    echo "  FAIL: $out_pdf not produced"
    return 1
  fi
}

echo "==> Rendering PLOS Comp Bio manuscript"
render_one \
  "$PAPER_DIR/plos_compbio/manuscript.md" \
  "$PAPER_DIR/plos_compbio" \
  "$PAPER_DIR/plos_compbio/manuscript_rendered.pdf" \
  ""  # title comes from the manuscript's own H1; empty here avoids a duplicate title block

echo ""
echo "==> Rendering JOSS paper"
render_one \
  "$PAPER_DIR/paper.md" \
  "$PAPER_DIR" \
  "$PAPER_DIR/paper_rendered.pdf" \
  "StickForStats (JOSS)"

echo ""
echo "Done. Output:"
echo "  $PAPER_DIR/plos_compbio/manuscript_rendered.pdf"
echo "  $PAPER_DIR/paper_rendered.pdf"
