#!/usr/bin/env bash
# Build the BMC Bioinformatics submission manuscript as an editable .docx.
#
# BMC will NOT accept a PDF as the main manuscript document. Its submission portal states:
#   "Upload your manuscript in an editable format for peer review ... either: a Word document
#    with figures and tables placed in the body of the text where they are referenced;
#    LaTeX documents with figures and tables compressed into a .zip format."
# It also requires double line spacing and continuous line numbering, neither of which the
# previous Chrome-printed PDF had.
#
# pandoc does not emit line numbering or double spacing for docx, so this script post-patches
# the OOXML: it adds <w:lnNumType> to the section properties and sets double line spacing on
# the default paragraph style.
#
# Usage:  bash paper/build_bmc_docx.sh
# Output: paper/bmc_bioinformatics/manuscript.docx

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PKG="$REPO_ROOT/paper/bmc_bioinformatics"
SRC="$PKG/manuscript.md"
OUT="$PKG/manuscript.docx"

command -v pandoc >/dev/null || { echo "ERROR: pandoc not found on PATH" >&2; exit 1; }
[ -f "$SRC" ] || { echo "ERROR: $SRC not found" >&2; exit 1; }

# A submission document must not carry an unresolved placeholder. The Zenodo
# *version* DOI for a release does not exist until the GitHub release is created
# and Zenodo archives the tag, so the manuscript necessarily holds a marker until
# then. Guessing a plausible successor to the previous version DOI would be
# fabricating an identifier, so the marker stays and this refuses to build past
# it. Pass ALLOW_PLACEHOLDERS=1 to produce a reading copy before the DOI exists.
if grep -q 'PENDING-[A-Z0-9-]*' "$SRC"; then
  if [ "${ALLOW_PLACEHOLDERS:-0}" = "1" ]; then
    echo "WARNING: manuscript still contains placeholders; building anyway because" >&2
    echo "         ALLOW_PLACEHOLDERS=1. This build is NOT submittable:" >&2
    grep -n 'PENDING-[A-Z0-9-]*' "$SRC" | sed 's/^/           /' >&2
  else
    echo "ERROR: $SRC still contains unresolved placeholder(s):" >&2
    grep -n 'PENDING-[A-Z0-9-]*' "$SRC" | sed 's/^/         /' >&2
    echo "" >&2
    echo "  Create the GitHub release for the tag, let Zenodo archive it, then" >&2
    echo "  replace the marker with the version DOI Zenodo returns." >&2
    echo "  To build a reading copy meanwhile: ALLOW_PLACEHOLDERS=1 bash $0" >&2
    exit 1
  fi
fi

echo "[1/4] pandoc: markdown -> docx"
pandoc "$SRC" \
  --from=markdown+pipe_tables+yaml_metadata_block+raw_html+autolink_bare_uris+strikeout+tex_math_dollars \
  --to=docx \
  --resource-path="$PKG:$PKG/figures" \
  --output="$OUT"

echo "[2/4] patching OOXML for double spacing + continuous line numbers"
python3 - "$OUT" <<'PY'
import re, shutil, sys, zipfile, os, tempfile
path = sys.argv[1]
tmpd = tempfile.mkdtemp()
with zipfile.ZipFile(path) as z:
    names = z.namelist()
    z.extractall(tmpd)

doc = os.path.join(tmpd, "word", "document.xml")
s = open(doc, encoding="utf-8").read()
# Continuous line numbering, restarting nowhere, counting every line.
if "<w:lnNumType" not in s:
    s, n = re.subn(r'(<w:sectPr\b[^>]*>)', r'\1<w:lnNumType w:countBy="1" w:restart="continuous"/>', s, count=1)
    assert n == 1, "no <w:sectPr> found — cannot add line numbering"
open(doc, "w", encoding="utf-8").write(s)

sty = os.path.join(tmpd, "word", "styles.xml")
s = open(sty, encoding="utf-8").read()
# Double line spacing on the document default (240 twentieths of a point = single; 480 = double).
if 'w:docDefaults' in s and 'w:line="480"' not in s:
    s, n = re.subn(r'(<w:pPrDefault>\s*<w:pPr>)',
                   r'\1<w:spacing w:line="480" w:lineRule="auto" w:after="0"/>', s, count=1)
    if n == 0:  # some pandoc versions emit an empty <w:pPrDefault/>
        s, n = re.subn(r'<w:pPrDefault\s*/>',
                       r'<w:pPrDefault><w:pPr><w:spacing w:line="480" w:lineRule="auto" w:after="0"/></w:pPr></w:pPrDefault>',
                       s, count=1)
    assert n == 1, "could not set double spacing in styles.xml"
open(sty, "w", encoding="utf-8").write(s)

# Repack, preserving the original entry order (Word is tolerant, but keep it tidy).
with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
    for name in names:
        z.write(os.path.join(tmpd, name), name)
shutil.rmtree(tmpd)
print("      patched word/document.xml and word/styles.xml")
PY

echo "[3/4] verifying the artifact"
python3 - "$OUT" "$SRC" <<'PY'
import sys, zipfile, re
out, src = sys.argv[1], sys.argv[2]
md = open(src, encoding="utf-8").read()
# Derived from the manuscript, not hardcoded: the figure and table counts change as the paper
# does (Fig. 8 was dropped as a duplicate of Tables 3 and 4), and a hardcoded expectation would
# either fail spuriously or, worse, keep passing after a figure silently stopped being embedded.
want_figs = len(re.findall(r'!\[\*\*Fig\.', md))
want_tables = len(re.findall(r'^\|[^\n]*\|\s*$\n\|[\s\-:|]+\|\s*$', md, re.M))
with zipfile.ZipFile(out) as z:
    doc = z.read("word/document.xml").decode()
    sty = z.read("word/styles.xml").decode()
    media = [n for n in z.namelist() if n.startswith("word/media/")]
checks = {
    f"{want_figs} figures embedded (from manuscript)": len(media) == want_figs,
    f"{want_tables} tables present (from manuscript)": doc.count("<w:tbl>") == want_tables,
    "continuous line numbering": 'w:lnNumType' in doc and 'w:restart="continuous"' in doc,
    "double line spacing":       'w:line="480"' in sty,
    "superscripts converted":    'w:vertAlign w:val="superscript"' in doc,
}
for k, v in checks.items():
    print(f"      [{'PASS' if v else 'FAIL'}] {k}")
if not all(checks.values()):
    print(f"      (docx has {len(media)} images, {doc.count('<w:tbl>')} tables)")
    sys.exit(1)
PY

echo "[4/4] done -> $OUT"
ls -la "$OUT"
